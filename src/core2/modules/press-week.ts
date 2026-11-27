import endorsing from "../data/press/endorsements.json";
import { announcedIn } from "./elections";
import { candidateStance } from "./campaigns";
import { interviewHeldInTown, outletWeighsRace } from "./campaigns";
import { leanedYes } from "../trait-decisions";
import { electorateSides } from "./voting";
import { type DeskOutlet, runDesk } from "../press-desk";
import { keepsWhy } from "../why-kept";
import type {
  ContestRow,
  CoreAPI,
  CoreState,
  FilingRow,
  InterviewAnswer,
  InterviewRow,
  ModuleCalendarWork,
  ModuleRow,
  OutletRow,
  PersonState,
  Speaker,
  WireItem,
  WireLevel,
} from "./press-base";
import {
  ELECTIONS_MODULE_ID,
  addDays,
  already,
  arrange,
  asSpeaker,
  ballot,
  closeness,
  contestOf,
  decisionLean,
  followersOf,
  grudge,
  invitation,
  isIncumbent,
  lawChain,
  levelAudienceShare,
  makeIsoDate,
  newsworthiness,
  newsworthyBar,
  outletsHere,
  platformOf,
  pressParameter,
  raceAudienceShare,
  record,
  scheduleWeek,
  table,
  votesCast,
  weekCount,
} from "./press-base";
import {
  pressPeopleLive,
  refreshPressStaff,
  reviewOutletRevenue,
} from "./press-staffing";
import { conflictBeat, writeProfile } from "./press-exposure";
import { letters, milestones, policeLog, schoolResults } from "./press-briefs";
import { deskContext } from "./press-desk-reads";
import { interviewsFor, refuse } from "./press-interviews";
import { publish } from "./press-stories";
import { PRESS_MODULE_ID } from "./press-ids";

/** The kinds of outlet that endorse in an editorial (src/core2/data/press/endorsements.json). */
const ENDORSING_KINDS: ReadonlySet<string> = new Set(endorsing.kinds);

/**
 * A candidate's case for accepting an interview, before temperament: a base,
 * the share of the town the outlet reaches, less a sitting official's
 * reluctance, and how they stand with the reporter who asks.
 */
export function acceptCase(reasons: {
  readonly reach: number;
  readonly incumbent: boolean;
  readonly closeness: number;
  readonly grudge: number;
}): number {
  return (
    pressParameter("interviewAcceptBase") +
    pressParameter("interviewReachWeight") * Math.min(1, reasons.reach) -
    (reasons.incumbent ? pressParameter("interviewIncumbentReluctance") : 0) +
    reasons.closeness -
    reasons.grudge
  );
}

/**
 * How a candidate who isn't the player answers: their platform's position,
 * else where their own view and their party's put them (`candidateStance`),
 * else (no view and no party) they decline. A candidate who has voted on the
 * question answers from the vote, or shades the answer toward where the town
 * stands (`shadesAnswer`); a shaded answer names the vote it contradicts,
 * which a reporter may check.
 */
export function candidateAnswers(
  api: CoreAPI,
  questions: readonly string[],
  who: FilingRow | Speaker,
): readonly InterviewAnswer[] {
  const { personId, party } = asSpeaker(who);
  const platform = platformOf(api, who);
  // An officeholder known only by their record weighs it with no lean.
  const person = api.state.people.get(personId) ?? { traits: {} };
  const votes = votesCast(api.state as CoreState, personId);
  const round = (x: number) => Math.round(x * 1000) / 1000;
  return questions.map((question): InterviewAnswer => {
    const stated = platform.find((s) => s.question === question);
    if (stated) return { question, position: stated.position, move: "plain" };
    const vote = votes.filter((v) => v.stance.question === question).at(-1);
    if (!vote) {
      // Their own view blended with their party's; none only with neither.
      const stance = candidateStance(api, personId, party, question);
      return {
        question,
        position: stance === null ? null : round(stance),
        move: "plain",
      };
    }
    const town = townStand(api, question);
    // The candidate weighs the town's stand against how far towns stand at
    // the furthest: a town that far reads as half way to an end.
    const felt = Math.max(
      -0.5,
      Math.min(0.5, (town / pressParameter("townStandReach")) * 0.5),
    );
    return shadesAnswer(api, person, felt, vote.stance.position)
      ? { question, position: round(town), move: "lie", recordId: vote.id }
      : {
          question,
          position: round(vote.stance.position),
          move: "plain",
          recordId: vote.id,
        };
  });
}

/**
 * Whether a candidate shades an answer about their own vote toward where the
 * town stands rather than owning the vote: the further apart the two stand
 * (half the distance, 0 to 1; the town as the candidate weighs it, half way
 * to an end at the furthest a town stands), the more the vote costs with the
 * people listening, and their own lean toward bending the truth over owning
 * it (every trait).
 */
export function shadesAnswer(
  api: CoreAPI,
  person: Pick<PersonState, "traits"> & { id?: string },
  town: number,
  voted: number,
): boolean {
  return leanedYes(
    api.state,
    person,
    "press.shade-answer",
    "shade",
    "own",
    pressParameter("shadeBase") +
      (pressParameter("shadeGapWeight") * Math.abs(town - voted)) / 2,
  );
}

/**
 * Where the town stands on a question, -1 to 1: the mean of its electorate's
 * own stances on it, in both tiers, by the one reader of where the town
 * stands (`electorateSides`, which a candidate's platform weighs too).
 */
export function townStand(api: CoreAPI, question: string): number {
  return electorateSides(api, question).mean;
}

/** Wire items past their freshness go: no reporter can pick them again. */
function forgetOldWire(api: CoreAPI): void {
  const fresh = pressParameter("storyFreshDays");
  // The week that just aged out (the desk runs weekly).
  for (let back = fresh + 1; back <= fresh + 7; back += 1) {
    const date = addDays(makeIsoDate(api.state.date), -back);
    for (const row of table(api, "wire").query("byDate", [date]))
      table(api, "wire").remove(row.id);
  }
}

function freshWire(api: CoreAPI): WireItem[] {
  const out: WireItem[] = [];
  const days = pressParameter("storyFreshDays");
  for (let back = days; back >= 0; back -= 1) {
    const date = addDays(makeIsoDate(api.state.date), -back);
    out.push(
      ...(table(api, "wire").query("byDate", [date]) as unknown as WireItem[]),
    );
  }
  return out;
}

const LEVELS: readonly WireLevel[] = ["town", "county", "state", "nation"];

/**
 * The stories of each level an outlet has room for this week: its week's
 * space (its reporters' stories and its briefs) times the level's share of
 * its audience (`levelAudienceShare`), added to what the level had left, and
 * never more than a week's space. A level that is all of the outlet's
 * audience has its whole space every week; a village at a market's station
 * builds up a story now and then, and the rest of the week goes to the
 * county's, the state's and the nation's records on the wire. No dice.
 */
function levelRoom(api: CoreAPI, outlet: OutletRow): Map<WireLevel, number> {
  const room = new Map<WireLevel, number>();
  if (!outlet.audiencePeople) return room;
  const reporters = outlet.reporterIds.filter(
    (id) => api.state.people.get(id)?.alive,
  ).length;
  const space =
    reporters * pressParameter("storiesPerReporterWeek") +
    pressParameter("briefsPerOutletWeek");
  for (const level of LEVELS)
    room.set(
      level,
      Math.min(
        space,
        (outlet.storyCredit?.[level] ?? 0) +
          levelAudienceShare(api, outlet, level) * space,
      ),
    );
  return room;
}

export function pressWeek(
  api: CoreAPI,
  work: Readonly<ModuleCalendarWork>,
): void {
  if (work.kind !== "press-week") return;
  scheduleWeek(api, api.state.date);
  refreshPressStaff(api);
  // Revenue: each month's yearly rate.
  reviewOutletRevenue(
    api,
    Number(api.state.date.slice(8, 10)) <= api.parameter("daysPerWeek"),
  );
  pressPeopleLive(api);
  conflictBeat(api);
  schoolResults(api);
  policeLog(api);
  milestones(api);
  letters(api);
  // The week's stories: each reporter files from the fresh wire.
  const wire = freshWire(api);
  // A national outlet covers the nation and the town's own state; a town's
  // council is not its beat.
  const wider = wire.filter((i) => i.level === "nation" || i.level === "state");
  const rooms = new Map<string, Map<WireLevel, number>>(
    outletsHere(api).map((outlet) => [outlet.id, levelRoom(api, outlet)]),
  );
  const ctx = {
    ...deskContext(api),
    levelRoom: (o: DeskOutlet) => rooms.get(o.id)!,
  };
  for (const outlet of outletsHere(api)) {
    const beat = outlet.tier === "national" ? wider : wire;
    runDesk(api, ctx, outlet, beat);
    // What each level has left carries to next week.
    if (outlet.audiencePeople)
      table(api, "outlets").put({
        ...(table(api, "outlets").get(outlet.id) as unknown as OutletRow),
        storyCredit: Object.fromEntries(rooms.get(outlet.id)!),
      } as unknown as ModuleRow);
    if (outlet.kind === "magazine") writeProfile(api, ctx, outlet, beat);
  }
  forgetOldWire(api);
  if (!api.state.modules.has(ELECTIONS_MODULE_ID)) return;
  const horizon = addDays(
    makeIsoDate(api.state.date),
    7 * pressParameter("invitationWeeks"),
  );
  const contests = (
    api
      .moduleState(ELECTIONS_MODULE_ID)
      .table("contests")
      .rows() as unknown as ContestRow[]
  ).filter(
    (c) => c.electionDate >= api.state.date && c.electionDate <= horizon,
  );
  const playerId = (api.state as CoreState).playerId;
  // An invitation the player let pass until the race was over is a refusal.
  if (playerId)
    for (const row of interviewsFor(api, playerId))
      if (
        row.status === "invited" &&
        row.contestId &&
        contestOf(api, row.contestId).electionDate < api.state.date
      )
        refuse(api, row);
  if (!contests.length) return;
  const filings = contests
    .flatMap((c) => [...ballot(api, c.id), ...announcedIn(api, c.id)])
    .map((f) => ({ f, worth: newsworthiness(api, f) }));
  // The player's invitations this week, put to them as one.
  const invitedThisWeek = new Map<string, InterviewRow[]>();
  const townAdults =
    api.state.peopleByPlace.get(lawChain(api).townPlaceId)?.size || 1;
  for (const outlet of outletsHere(api)) {
    // The races whose turn at this outlet came this week, by their share of
    // its audience (`raceTurns`).
    const turns = raceTurns(api, outlet, contests);
    // Access: a candidate close to the outlet's reporters is asked first.
    for (const { f, worth } of filings
      .filter((row) => turns.has(row.f.contestId))
      .map((row) => ({
        ...row,
        worth: row.worth * raceAudienceShare(api, outlet, row.f.contestId),
        access: Math.max(
          0,
          ...(outlet.reporterIds ?? []).map((id) =>
            closeness(api, id, row.f.personId),
          ),
        ),
      }))
      .sort(
        (a, b) =>
          b.worth + b.access - (a.worth + a.access) ||
          a.f.id.localeCompare(b.f.id),
      )) {
      if (weekCount(api, outlet.id) >= pressParameter("interviewsPerWeek"))
        break;
      if (already(api, outlet.id, f.id)) continue;
      if (worth < newsworthyBar(outlet)) continue;
      // The town's outlet interviews a district candidate by the town's share
      // of the race (the player's own invitations are never thinned).
      if (f.personId !== playerId && !interviewHeldInTown(api, f.id)) continue;
      // An outlet asks for its own reason: the race is on its beat.
      if (!outletCoversContest(outlet, contestOf(api, f.contestId))) continue;
      const row = arrange(api, f.id, outlet.id, "outlet");
      if (row.status === "invited" && f.personId === playerId)
        invitedThisWeek.set(row.candidateId, [
          ...(invitedThisWeek.get(row.candidateId) ?? []),
          row,
        ]);
      if (row.status !== "invited" || f.personId === playerId) continue;
      const person = api.state.people.get(f.personId);
      const reporter = row.reporterId ?? "";
      // The voters the outlet would put them before (the share of the town
      // that follows it), whether they hold the seat (a sitting official needs
      // the coverage least and risks their record), how they stand with the
      // reporter who asks, and every trait's lean toward accepting.
      const reasons = person && {
        reach: followersOf(api, outlet.id).length / townAdults,
        incumbent: isIncumbent(api, contestOf(api, f.contestId), f.personId),
        closeness: closeness(api, person.id, reporter),
        grudge: grudge(api, person.id, reporter),
      };
      const accepts =
        person && reasons
          ? leanedYes(
              api.state,
              person,
              "press.accept-interview",
              "accept",
              "decline",
              acceptCase(reasons),
            )
          : true;
      const weighed =
        person && reasons && keepsWhy(api.state as CoreState, person.id)
          ? record(api, {
              ...row,
              acceptReasons: {
                ...reasons,
                lean: decisionLean(
                  api.state,
                  person,
                  "press.accept-interview",
                  "accept",
                  "decline",
                ),
              },
            })
          : row;
      if (!accepts) refuse(api, weighed);
      else publish(api, weighed, candidateAnswers(api, row.questions, f));
    }
  }
  // Those still waiting on the player's answer reach them as one call.
  if (playerId) {
    const open = (invitedThisWeek.get(playerId) ?? []).filter(
      (row) =>
        (table(api, "interviews").get(row.id) as unknown as InterviewRow)
          ?.status === "invited",
    );
    if (open.length) invited(api, open);
  }
  // Each outlet weighs the races on its beat once its interviews in a race
  // are settled, or in the last week before the vote however they stand
  // (the final edition before it): an editorial board hears the candidates
  // before it endorses (`outletWeighsRace`).
  const lastWeek = addDays(makeIsoDate(api.state.date), 7);
  for (const outlet of outletsHere(api)) {
    // Papers and magazines endorse; a station or network reports the race.
    if (!ENDORSING_KINDS.has(outlet.kind)) continue;
    const waiting = new Set(
      (
        table(api, "interviews").query("byOutlet", [
          outlet.id,
        ]) as unknown as InterviewRow[]
      ).flatMap((row) =>
        row.status === "invited" && row.contestId ? [row.contestId] : [],
      ),
    );
    for (const contest of contests) {
      if (!outletCoversContest(outlet, contest)) continue;
      if (waiting.has(contest.id) && contest.electionDate >= lastWeek) continue;
      outletWeighsRace(api, contest.id, {
        organizationId: outlet.organizationId,
        headId: outlet.headId,
        followerIds: followersOf(api, outlet.id),
      });
    }
  }
}

/**
 * The races an outlet takes up this week. Each week a race in its horizon
 * adds its share of the outlet's audience (`raceAudienceShare`) to what the
 * outlet owes it, and its turn comes when that reaches one: a race that is
 * the whole of an outlet's audience has a turn every week, and a village's
 * race at a station serving a market of a million about once in a lifetime.
 * No dice. What is owed is kept on the outlet, by seat.
 */
function raceTurns(
  api: CoreAPI,
  outlet: OutletRow,
  contests: readonly ContestRow[],
): ReadonlySet<string> {
  const turns = new Set<string>();
  if (!outlet.audiencePeople) {
    for (const contest of contests) turns.add(contest.id);
    return turns;
  }
  // Kept by seat, so what a small race is owed carries to the seat's next
  // election rather than lapsing with its six weeks.
  const credit: Record<string, number> = { ...outlet.raceCredit };
  for (const contest of contests) {
    const owed =
      (credit[contest.seatId] ?? 0) +
      raceAudienceShare(api, outlet, contest.id);
    if (owed >= 1) turns.add(contest.id);
    credit[contest.seatId] = owed >= 1 ? owed - 1 : owed;
  }
  table(api, "outlets").put({
    ...outlet,
    raceCredit: credit,
  } as unknown as ModuleRow);
  return turns;
}

/**
 * Whether a race is on an outlet's beat. A national outlet covers the nation
 * and the town's own state, as its desk does with the wire; a county or town
 * race is not its beat, so it never asks that race's candidates for a sitting.
 */
export function outletCoversContest(
  outlet: OutletRow,
  contest: ContestRow,
): boolean {
  return (
    outlet.tier !== "national" ||
    contest.level === "federal" ||
    contest.level === "state"
  );
}

/**
 * The outlets' invitations of the week to the player. Each outlet's is its
 * own record and its own call from its own reporter, and the player's answer
 * goes to that outlet alone (`answerInvitation`). They reach the player one a
 * day, the outlet whose reporter knows them best first, so a week of requests
 * is not one day of calls; one whose day would fall on or after the vote is
 * never put (the week's pass refuses it once the race is over).
 */
function invited(api: CoreAPI, rows: readonly InterviewRow[]): void {
  rows
    .map((row) => ({
      row,
      tie: row.reporterId ? closeness(api, row.candidateId, row.reporterId) : 0,
    }))
    .sort((a, b) => b.tie - a.tie || a.row.id.localeCompare(b.row.id))
    .forEach(({ row }, index) => {
      if (index === 0) return invitation(api, row);
      const date = addDays(makeIsoDate(api.state.date), index);
      if (row.contestId && contestOf(api, row.contestId).electionDate <= date)
        return;
      api.moduleCalendar(PRESS_MODULE_ID).schedule({
        key: `press-invite:${row.id}`,
        date,
        kind: "press-invite",
        source: {
          tag: "ESTIMATED",
          citation:
            "An outlet's political reporter calls a candidate on the day the reporter can",
          asOf: api.state.date,
          estimatedFrom: "interviewsPerWeek",
        },
        sourceRecordIds: [row.id],
      });
    });
}
