/**
 * Campaigning the way real races are won, in a played world (pool item
 * campaign-like-real-races, the done-when's second half): in a place drawn
 * from all 56 on a seed nobody chose (GOLDEN_PATH_SEED pins one), the town
 * as the player gets it (buildBenchWorld, two-level, every module), the
 * player turns 18, files for the soonest council race they may file for at
 * the office that takes it, and campaigns every week to election day the way
 * `src/bench/path-check.ts` plays it: three evenings at the doors, an evening
 * of calls, then the week's one evening at a rented venue and, every other
 * week, a donor meeting. A forum and an event rent the same venue for the same
 * price, so the venue evening is a forum until one has been held and in every
 * other week after it, and an event in the weeks between (the money goes to
 * the forum first, never to an event that leaves the forum unaffordable).
 * Then, each by record id, read on the eve of election day (the day before
 * the contest's election date, after the last campaign day), before the
 * count closes the race and its campaign causes fold into `causeSummaries`
 * (`foldClosedRaceCauses`): (a) and (b) read cause rows by id. None of the
 * four needs the count; the incumbent's response (d) is recorded during the
 * campaign. The play then goes on through election day as before.
 *
 * (a) an organization endorsed the player and sent its members as
 *     volunteers, and the volunteers engine walked them to doors (an
 *     `endorsements` row with an organization for the player's filing, one of
 *     its members on the player's campaign's volunteers, and a
 *     `volunteer-door` cause by that member for the player); a member with a
 *     filing of their own in the player's contest is never the evidence;
 * (b) a forum the player hosted (a meetings `townHalls` row with the player
 *     as host, the player's filing and the causes it wrote);
 * (c) money raised by named donors (`gifts` rows and `campaign-gift`
 *     events) and a donor meeting the player held at a host not running in
 *     the player's contest, with a gift given there; no donor meeting held is
 *     missing, and a gift from anyone with a filing in the player's contest
 *     (the rival's money) is never the evidence;
 * (d) the seat's incumbent, running against the player, changing their
 *     schedule after the player gains (the done-when: "the incumbent
 *     changing their schedule after the player gains"): a `steppedUp` row for
 *     the incumbent's own filing naming the player as the rival ahead, the
 *     poll or word of them it read, hours or door hours gained, and its
 *     `campaign-stepped-up` record.
 * Every clause is read before election day (`readOn` before the contest's
 * election date).
 *
 * Only a place with an elected council is drawn (`hasCouncilSeat`, read from
 * the place's local offices before any world is built); a place without one
 * is named as skipped and the next one drawn, never played. A clause the
 * drawn place cannot show (no group backed the player, the player's petition
 * short, an open seat with no incumbent running, or the incumbent never
 * stepped up) is named and the next place drawn, up to six; the last test
 * fails naming every place, seed and reason.
 * REAL_RACE_SMOKE_WEEKS=<n> plays one place for n campaign weeks and only
 * prints what it found (a quick check that the play loop runs).
 */
import { randomBytes } from "node:crypto";
import { expect, it } from "vitest";
import { drawPlace, type DrawnPlace } from "../../scripts/core2-year/place";
import { campaignDay } from "../bench/campaign";
import { chooseAtCounter, openBenchFilingVisit } from "../bench/filing";
import { governmentView } from "../bench/government";
import { BenchPlayer } from "../bench/player";
import { buildBenchWorld } from "../bench/world";
import { setBookkeeping } from "./bookkeeping";
import { campaignDayChoices } from "./campaign-day";
import { candidatePlatform } from "./campaign-stances";
import { contestPositions } from "./contest-positions";
import { gameStartDate } from "./game-start";
import { addDays, makeIsoDate } from "./kernel/dates";
import {
  CAMPAIGNS_MODULE_ID,
  CAMPAIGN_STEPPED_UP_EVENT,
  endorsementsOf,
  organizedGroupsIn,
  signaturesToGather,
  steppedUpOf,
  type CampaignRow,
  type CauseRow,
  type EndorsementRow,
  type GiftRow,
  type PollRow,
  type SteppedUpRow,
} from "./modules/campaigns";
import {
  ELECTIONS_MODULE_ID,
  incumbentOf,
  petitionCirculating,
  petitionOf,
  type ContestRow,
  type FilingRow,
} from "./modules/elections";
import { MEETINGS_MODULE_ID, type TownHallRow } from "./modules/meetings";
import {
  adjourn,
  deskWaiting,
  leaveDeskToCharacter,
  meetingInProgress,
  takeUpItem,
} from "./modules/office-day";
import { OFFICES_MODULE_ID } from "./modules/offices";
import { actOn, waitingEntries } from "./office-day-state";
import { localOfficesForPlace } from "./offices-local";
import { coreAPI } from "./state";
import type { CoreAPI, CoreState, LogRecord } from "./types";

const seed = process.env.GOLDEN_PATH_SEED ?? randomBytes(8).toString("hex");
const SMOKE_WEEKS = Math.max(
  0,
  Math.floor(Number(process.env.REAL_RACE_SMOKE_WEEKS ?? 0) || 0),
);
const DRAWS = SMOKE_WEEKS ? 1 : 6;
/**
 * The most weeks one campaign may be played: a hard guard on the weekly loop.
 * A race files at most a year or so before its election; a loop that reaches
 * this (a day that stopped advancing, an election date that never comes)
 * fails the draw, naming the place, instead of running on.
 */
const MAX_CAMPAIGN_WEEKS = 110;
/** The most places skipped for want of a council before the draw itself fails. */
const MAX_SKIPPED_PLACES = 40;
/** One draw is a played year: building the town, living to 18 and a campaign. */
const DRAW_TIMEOUT = 1_800_000;

/** What a clause found, by record id, or why the drawn place could not show it. */
type Clause = { readonly found: string } | { readonly missing: string };

const queryOf = <T>(
  api: CoreAPI,
  moduleId: string,
  name: string,
  index: string,
  key: string,
): T[] =>
  api.moduleState(moduleId).table(name).query(index, [key]) as unknown as T[];
const getOf = <T>(
  api: CoreAPI,
  moduleId: string,
  name: string,
  id: string,
): T | undefined =>
  api.moduleState(moduleId).table(name).get(id) as unknown as T | undefined;

/** The durable log's records of one kind, through its kind index (no scan). */
function logOfKind(core: CoreState, kind: string): LogRecord[] {
  return [...(core.logByKind.get(kind) ?? [])].flatMap((id) => {
    const row = core.durableLog.get(id);
    return row ? [row] : [];
  });
}

/** Whether a contest's office is a council seat, from its office row's kind (as path-check reads it). */
function isCouncil(api: CoreAPI, officeId: string): boolean {
  const office = getOf<{ kind?: string }>(
    api,
    OFFICES_MODULE_ID,
    "offices",
    officeId,
  );
  return (office?.kind ?? "").startsWith("council");
}

/**
 * Whether a place has an elected council for the player to run for, read from
 * its local offices (the rows the world's offices module seats) before any
 * world is built. A place without one (a county board or a township board
 * only, or no local council at all) has no council race to play, so it is
 * never drawn.
 */
function hasCouncilSeat(placeKey: string): boolean {
  return localOfficesForPlace(placeKey).some(
    (office) => office.elected && office.kind.startsWith("council"),
  );
}

/**
 * The seat's serving term for a contest, read through the elections engine
 * (`incumbentOf`, which points the contest at the seat's serving term), and
 * the person holding it (null for an open seat or a named official not yet
 * filled in, whom no filing can name).
 */
function seatIncumbent(
  api: CoreAPI,
  contest: ContestRow,
): { readonly termId: string | null; readonly personId: string | null } {
  const term = incumbentOf(api, contest.id);
  const serving = term?.status === "serving" ? term : null;
  return { termId: serving?.id ?? null, personId: serving?.personId ?? null };
}

/**
 * Everyone else with a filing in the contest, whatever its status: a person
 * running against the player is never evidence of help for the player.
 */
function othersRunning(
  api: CoreAPI,
  contest: ContestRow,
  me: string,
): ReadonlySet<string> {
  return new Set(
    queryOf<FilingRow>(
      api,
      ELECTIONS_MODULE_ID,
      "filings",
      "byContest",
      contest.id,
    )
      .map((f) => f.personId)
      .filter((id) => id !== me),
  );
}

const dollars = (minor: number) => `$${Math.round(minor / 100)}`;

/** The player's race as the clauses read it on the eve, with what the play saw along the way. */
interface Race {
  /** The drawn place, its seeds and draw, for assertion messages. */
  readonly where: string;
  readonly core: CoreState;
  readonly api: CoreAPI;
  readonly town: string;
  readonly me: string;
  readonly filing: FilingRow;
  readonly contest: ContestRow;
  /** The town halls the player's forums held, as `campaignDay` returned them. */
  readonly hallIds: readonly string[];
  /**
   * The donor meetings the player held: the day and the host each one added
   * to the campaign's `donorMeetingHostIds` (`holdDonorMeeting`); the bench's
   * `campaignDay` returns no meeting.
   */
  readonly donorMeetings: readonly { date: string; hostId: string }[];
  /** Each day choice the week's plan reached and found unavailable: how many times, and the last facts. */
  readonly unavailable: Readonly<Record<string, string>>;
}

type Clauses = Readonly<Record<string, Clause>>;

/** The player's race, played to election day, with each clause as read on the eve. */
interface Played extends Race {
  /** The clauses, read on `readOn` (the eve) before the count. */
  readonly clauses: Clauses;
  readonly readOn: string;
  readonly summary: string;
}

/**
 * Build the drawn town and play the player's race the way path-check plays
 * it: live to the day after their 18th birthday, file for the soonest
 * council race they may file for (on their own platform), canvass the
 * petition, then campaign every week to election day.
 */
function playRace(
  where: string,
  placeSeed: string,
  placeKey: string,
): Played | { readonly tried: string } {
  const w = buildBenchWorld(placeSeed, gameStartDate(), {
    twoLevel: true,
    placeKey,
  });
  const core = w.core;
  const api = coreAPI(core);
  const me = w.playerId!;
  const player = new BenchPlayer(core, w.director);
  player.select(me);
  const notes: string[] = [];
  /** The contest the player is running in, whose ballot they mark for themselves. */
  let running: string | undefined = undefined;

  /**
   * Live until the date, the character answering its own choices
   * (path-check's liveUntil: a week's calendar jump at a time). With
   * `notPast`, no jump lands after that day, so the core never enters the day
   * after it.
   */
  const liveUntil = (date: string, notPast?: string) => {
    for (let guard = 0; core.date < date && guard < 400; guard++) {
      if (player.pollingPlace && running)
        try {
          player.markBallot(running, me);
        } catch (error) {
          notes.push(`no ballot of their own: ${(error as Error).message}`);
        }
      if (player.pollingPlace) player.leavePolls();
      const at = player.packet?.at ?? {
        date: addDays(makeIsoDate(core.date), 1),
        minuteOfDay: 0,
      };
      const ahead = addDays(makeIsoDate(at.date), 7);
      const to = notPast && ahead > notPast ? notPast : ahead;
      if (
        player.packet?.kind !== "stop" &&
        (to < at.date ||
          (to === at.date && at.minuteOfDay >= player.dayStartMinute()))
      )
        break;
      const packet =
        player.packet?.kind === "stop"
          ? player.packet
          : player.advance("calendar", to).packet;
      if (packet.kind === "stop") {
        const meeting = meetingInProgress(api);
        if (meeting) {
          for (const billId of meeting.agenda)
            takeUpItem(api, meeting.id, billId, "own");
          adjourn(api, meeting.id);
        }
        for (const bill of deskWaiting(api)) leaveDeskToCharacter(api, bill.id);
        const holderId = (packet as { controlledPersonId?: string })
          .controlledPersonId;
        if (holderId)
          for (const entry of waitingEntries(api, holderId)) actOn(api, entry);
        player.resume({ kind: "stop", pauseId: packet.pauseId });
      }
    }
    if (core.date < date)
      notes.push(`the day stopped at ${core.date}, before ${date}`);
  };

  const born = core.people.get(me)!.birthDate;
  const eighteenth = `${Number(born.slice(0, 4)) + 18}${born.slice(4)}`;
  if (core.date <= eighteenth) liveUntil(addDays(makeIsoDate(eighteenth), 1));

  // The soonest council race the player meets every check for, today.
  const gov = governmentView(core, me);
  const open = gov.contests
    .filter(
      (c) => c.checks.every((k) => k.met) && isCouncil(api, c.contest.officeId),
    )
    .sort(
      (a, b) =>
        a.contest.electionDate.localeCompare(b.contest.electionDate) ||
        a.contest.id.localeCompare(b.contest.id),
    );
  const target = open[0];
  if (!target)
    return {
      tried: `${where}: on ${core.date} the player ${me} could file for no council race (${gov.contests.length} contests offered: ${gov.contests
        .map(
          (c) =>
            `${c.contest.title}${isCouncil(api, c.contest.officeId) ? " (council)" : ""} ${c.checks.every((k) => k.met) ? "open" : "closed"}`,
        )
        .join(", ")})`,
    };
  const contest = target.contest;
  let visit = openBenchFilingVisit(core, me, target.filingOffice.filedWith, 0);
  const pick = visit.visit.choices.find(
    (row) => row.action.kind === "pick" && row.action.contestId === contest.id,
  );
  if (pick) visit = chooseAtCounter(core, visit, pick.key);
  const file = visit.visit.choices.find((row) => row.action.kind === "file");
  const platform = candidatePlatform(
    api,
    me,
    null,
    contestPositions(api, contest),
  ).map((stance) => `${stance.question}=${stance.position}`);
  if (file) visit = chooseAtCounter(core, visit, file.key, { platform });
  const filing = governmentView(core, me).filings.find(
    (row) => row.contestId === contest.id,
  );
  if (!filing)
    return {
      tried: `${where}: the counter at ${target.filingOffice.filedWith} took no filing for ${contest.title} (${contest.id}): ${(visit.result as { status?: string } | undefined)?.status ?? "no result"}`,
    };
  running = contest.id;

  // The petition: canvass each week until it holds the signatures it needs
  // (as path-check reads it) or the deadline comes; the clerk checks it the
  // morning after.
  for (let week = 0; week < 60; week++) {
    campaignDay(core, me, { filingId: filing.id, kind: "canvass" });
    const petition = petitionOf(api, filing.id);
    if (
      !petition ||
      !petitionCirculating(api, filing.id) ||
      petition.signers.length >= signaturesToGather(petition.needed)
    )
      break;
    liveUntil(addDays(makeIsoDate(core.date), 1));
  }
  const petition = petitionOf(api, filing.id);
  if (petition) liveUntil(addDays(makeIsoDate(petition.due), 1));
  const status = getOf<FilingRow>(
    api,
    ELECTIONS_MODULE_ID,
    "filings",
    filing.id,
  )?.status;
  if (status !== "on-ballot" && status !== "petitioning")
    return {
      tried: `${where}: the player's filing ${filing.id} for ${contest.title} ended ${status ?? "gone"}${petition ? ` (${petition.signers.length} of ${petition.needed} signatures by ${petition.due})` : ""}`,
    };

  // The campaign, every week to election day, as path-check plays it; no
  // week's living goes past the eve, where the clauses are read.
  const eve = addDays(makeIsoDate(contest.electionDate), -1);
  const hostsOf = () =>
    getOf<CampaignRow>(api, CAMPAIGNS_MODULE_ID, "campaigns", filing.id)
      ?.donorMeetingHostIds ?? [];
  const hallIds: string[] = [];
  const donorMeetings: { date: string; hostId: string }[] = [];
  const missed = new Map<string, { times: number; facts: string }>();
  const week = {
    weeks: 0,
    doors: 0,
    reached: 0,
    raised: 0,
    events: 0,
    forums: 0,
    donorMeetings: 0,
  };
  while (addDays(makeIsoDate(core.date), 7) <= contest.electionDate) {
    if (SMOKE_WEEKS && week.weeks >= SMOKE_WEEKS) break;
    if (week.weeks >= MAX_CAMPAIGN_WEEKS)
      throw new Error(
        `${where}: the campaign loop reached its ${MAX_CAMPAIGN_WEEKS}-week guard on ${core.date}, and election day ${contest.electionDate} not yet reached (filing ${filing.id}; ${notes.slice(0, 3).join("; ") || "no notes"})`,
      );
    const weekStart = core.date;
    // A forum and an event rent the same venue at the same price, and gifts
    // are the campaign's only money, so the week's venue evening is a forum
    // until one has been held and in every other week after it, and an event
    // in the weeks between. The raise-money evening stays ahead of it, so the
    // week's gifts count toward the rent.
    const forumWeek = week.forums === 0 || week.weeks % 2 === 0;
    for (const kind of [
      "canvass",
      "canvass",
      "raise-money",
      "canvass",
      forumWeek ? "forum" : "event",
      ...(week.weeks % 2 ? ["donor-meeting"] : []),
    ]) {
      const choice = campaignDayChoices(api, filing.id).find(
        (c) => c.kind === kind,
      );
      if (!choice?.available) {
        missed.set(kind, {
          times: (missed.get(kind)?.times ?? 0) + 1,
          facts: JSON.stringify(choice?.facts ?? "not offered").slice(0, 300),
        });
        continue;
      }
      let out: ReturnType<typeof campaignDay>;
      const day = core.date;
      const hosted = hostsOf().length;
      try {
        out = campaignDay(core, me, { filingId: filing.id, kind });
      } catch (error) {
        // Only the donor meeting's host may refuse on the day (campaign-day.ts:
        // the choice offered a host, `holdDonorMeeting` found no meeting to
        // hold); any other error is a defect and fails the draw.
        const message = error instanceof Error ? error.message : String(error);
        if (
          kind !== "donor-meeting" ||
          message !== "No donor meeting could be held"
        )
          throw error;
        missed.set(`${kind} (refused)`, {
          times: (missed.get(`${kind} (refused)`)?.times ?? 0) + 1,
          facts: message,
        });
        continue;
      }
      week.doors += out.doorsKnocked;
      week.reached += out.reached;
      week.raised += out.raisedMinor;
      if (kind === "event") week.events += 1;
      if (kind === "forum") week.forums += 1;
      if (kind === "donor-meeting") week.donorMeetings += 1;
      if (out.townHallId) hallIds.push(out.townHallId);
      if (kind === "donor-meeting")
        for (const hostId of hostsOf().slice(hosted))
          donorMeetings.push({ date: day, hostId });
      player.spend(out.hours);
    }
    week.weeks += 1;
    liveUntil(addDays(makeIsoDate(core.date), 7), eve);
    // A week that ends on the day it began is a play that has stopped, which
    // the loop would otherwise repeat for ever.
    if (core.date <= weekStart)
      throw new Error(
        `${where}: campaign week ${week.weeks} ended on ${core.date}, where it began (filing ${filing.id}, election day ${contest.electionDate}; ${notes.slice(0, 3).join("; ") || "no notes"})`,
      );
  }
  // The eve: every campaign day is done and the count has not run, so the
  // race's cause rows are all still kept. Each clause is read here.
  if (!SMOKE_WEEKS) liveUntil(eve, eve);
  const readOn = core.date;
  const town =
    getOf<{ townPlaceId: string }>(api, CAMPAIGNS_MODULE_ID, "town", "town")
      ?.townPlaceId ?? w.placeId;
  const race: Race = {
    where,
    core,
    api,
    town,
    me,
    filing,
    contest,
    hallIds,
    donorMeetings,
    unavailable: Object.fromEntries(
      [...missed].map(([kind, m]) => [kind, `${m.times}x, last ${m.facts}`]),
    ),
  };
  const clauses: Clauses = {
    "(a) group endorsed and sent volunteers": clauseGroup(race),
    "(b) forum the player hosted": clauseForum(race),
    "(c) named donors": clauseDonors(race),
    "(d) the incumbent stepped up": clauseSteppedUp(race),
  };
  // Then on through election day, as path-check plays it.
  if (!SMOKE_WEEKS) liveUntil(contest.electionDate);
  return {
    ...race,
    clauses,
    readOn,
    summary: `${contest.title} (${contest.id}, election ${contest.electionDate}), filing ${filing.id}; ${week.weeks} weeks: doors ${week.doors}, reached ${week.reached}, raised ${dollars(week.raised)}, events ${week.events}, forums ${week.forums}, donor meetings ${week.donorMeetings}; clauses read on ${readOn}${readOn === eve ? " (the eve)" : ""}${notes.length ? `; ${notes.slice(0, 3).join("; ")}` : ""}`,
  };
}

/**
 * (a) An organization endorsed the player and sent its members as
 * volunteers: an `endorsements` row for the player's filing with the group's
 * organization and a yes (`groupsWeighRace`), one of the members it sent on
 * the player's campaign's volunteers (`askToVolunteer`), and the volunteers
 * engine walking that member to doors for the player (`volunteerShifts`): a
 * `volunteer-door` cause by them for the player, which the campaigns engine
 * keeps because the candidate is the player (`keepCause` reads `keepsWhy`).
 * A member with a filing in the player's contest is never the evidence.
 */
function clauseGroup(played: Race): Clause {
  const { api, me, filing, contest, town } = played;
  const running = othersRunning(api, contest, me);
  const backing = endorsementsOf(api, filing.id)
    .filter(
      (row) =>
        row.organizationId !== null &&
        row.answer === "yes" &&
        row.candidateId === me,
    )
    .sort((a, b) => a.date.localeCompare(b.date) || a.id.localeCompare(b.id));
  if (!backing.length) {
    const groups = organizedGroupsIn(api, town);
    const inRace = queryOf<EndorsementRow>(
      api,
      CAMPAIGNS_MODULE_ID,
      "endorsements",
      "byContest",
      contest.id,
    ).filter((row) => row.organizationId !== null);
    return {
      missing: groups.length
        ? `no group backed the player's filing ${filing.id}; ${groups.length} organizations in town (${groups
            .slice(0, 6)
            .map(
              (g) =>
                `${g.organizationId} ${g.kind}, ${g.memberIds.length} members, speaker ${g.speakerId ?? "none"}`,
            )
            .join("; ")}), ${inRace.length} group answers in the race (${inRace
            .slice(0, 4)
            .map(
              (row) =>
                `${row.organizationId} ${row.answer} for ${row.candidateId === me ? "the player" : row.candidateId} (${row.reason})`,
            )
            .join("; ")})`
        : "no organization in town to endorse anyone",
    };
  }
  const campaign = getOf<CampaignRow>(
    api,
    CAMPAIGNS_MODULE_ID,
    "campaigns",
    filing.id,
  );
  const onCampaign = new Set(campaign?.volunteerIds ?? []);
  const doors = queryOf<CauseRow>(
    api,
    CAMPAIGNS_MODULE_ID,
    "causes",
    "byCandidate",
    me,
  )
    .filter((c) => c.act === "volunteer-door" && c.candidateId === me)
    .sort((a, b) => a.date.localeCompare(b.date) || a.id.localeCompare(b.id));
  const seen: string[] = [];
  for (const row of backing) {
    const rivalsSent = row.volunteerIds.filter((id) => running.has(id));
    const sent = row.volunteerIds.filter(
      (id) => onCampaign.has(id) && !running.has(id),
    );
    if (!sent.length) {
      seen.push(
        `${row.id}: ${row.volunteerIds.length} members said yes (${rivalsSent.length} running in the race, not counted), none not running on the player's campaign's ${onCampaign.size} volunteers`,
      );
      continue;
    }
    const walkers = new Set(sent);
    const cause = doors.find((c) => walkers.has(c.actorId));
    if (!cause) {
      seen.push(
        `${row.id}: members ${sent.join(", ")} on the player's campaign, no volunteer-door cause by them (${doors.length} volunteer-door causes for the player in all)`,
      );
      continue;
    }
    return {
      found: `endorsement ${row.id} by ${row.organizationId} (speaker ${row.speakerId}, ${row.reason}) on ${row.date} for the player's filing ${row.filingId}; ${sent.length} of its members, none running in the race (${running.size} others filed), on the player's campaign's volunteers (${sent.slice(0, 4).join(", ")}); volunteer-door cause ${cause.id} on ${cause.date} by member ${cause.actorId} for the player (moved ${cause.voterId} ${cause.warmthBefore.toFixed(3)} to ${cause.warmthAfter.toFixed(3)})`,
    };
  }
  return {
    missing: `${backing.length} group endorsements of the player, none whose members walked doors for them: ${seen.slice(0, 4).join("; ")}`,
  };
}

/**
 * (b) A forum the player hosted: the meetings engine's town hall
 * (`holdTownHall`, through the forum day choice) with the player as host and
 * the player's filing, whose causes the campaigns engine kept.
 */
function clauseForum(played: Race): Clause {
  const { api, me, filing } = played;
  const halls = queryOf<TownHallRow>(
    api,
    MEETINGS_MODULE_ID,
    "townHalls",
    "byHost",
    me,
  ).filter((h) => h.filingId === filing.id);
  const hall = halls.find((h) => h.causeIds.length > 0);
  if (!hall)
    return {
      missing: `the player hosted ${halls.length} forums for filing ${filing.id}, none that moved anyone (forum unavailable ${played.unavailable.forum ?? "never"})`,
    };
  const cause = getOf<CauseRow>(
    api,
    CAMPAIGNS_MODULE_ID,
    "causes",
    hall.causeIds[0]!,
  );
  if (!cause || cause.candidateId !== me)
    return {
      missing: `town hall ${hall.id} names cause ${hall.causeIds[0]} that the campaigns engine kept ${cause ? `for ${cause.candidateId}` : "nowhere"}`,
    };
  return {
    found: `town hall ${hall.id} on ${hall.date} (host ${hall.hostId}, filing ${hall.filingId}): ${hall.attendeeIds.length} came, ${hall.questions.length} questions, ${hall.causeIds.length} causes, first ${cause.id} (${cause.act}: ${cause.voterId} ${cause.warmthBefore.toFixed(3)} to ${cause.warmthAfter.toFixed(3)}); ${played.hallIds.length} forums in the campaign (${played.hallIds.slice(0, 3).join(", ")})`,
  };
}

/**
 * The player's filing's gifts from named people: full people other than the
 * player (`donationAnswer`) who gave something and are not themselves a
 * candidate in the player's contest. A rival's money is the engine's defect,
 * never the player's donors, so it is counted apart and never as evidence.
 */
function namedGifts(played: Race): {
  readonly gifts: GiftRow[];
  readonly fromCandidates: GiftRow[];
} {
  const { api, core, me, filing, contest } = played;
  const running = othersRunning(api, contest, me);
  const named = queryOf<GiftRow>(
    api,
    CAMPAIGNS_MODULE_ID,
    "gifts",
    "byCampaign",
    filing.id,
  ).filter(
    (g) => g.donorId !== me && core.people.has(g.donorId) && g.totalMinor > 0,
  );
  return {
    gifts: named.filter((g) => !running.has(g.donorId)),
    fromCandidates: named.filter((g) => running.has(g.donorId)),
  };
}

/**
 * (c) Money raised by named donors the player reached: the player's filing's
 * `gifts` rows from full people who are not candidates in the player's
 * contest (`donationAnswer`, `namedGifts`) with their public `campaign-gift`
 * records (`recordGift`), and a donor meeting the player held at a host who
 * is not running (a host the day added to the campaign's
 * `donorMeetingHostIds`, `holdDonorMeeting`), where one of the meeting's
 * donors gave: the `campaign-donor-meeting` record for that filing, day and
 * host names the donors, and that donor's gift and record are dated that day.
 * Missing when there is no such gift, when no donor meeting was held, when
 * every meeting was hosted by someone running in the contest or left no
 * record, and when no donor at a meeting left a gift with its record. Money
 * from anyone with a filing in the player's contest is never the evidence.
 */
function clauseDonors(played: Race): Clause {
  const { api, core, me, filing, contest } = played;
  const running = othersRunning(api, contest, me);
  const { gifts, fromCandidates } = namedGifts(played);
  const events = logOfKind(core, "campaign-gift").filter(
    (e) => e.facts?.filingId === filing.id,
  );
  const event = events.find((e) =>
    gifts.some((g) => g.donorId === e.facts?.donorId),
  );
  const gift = event && gifts.find((g) => g.donorId === event.facts?.donorId);
  const notCounted = fromCandidates.length
    ? ` (${fromCandidates.length} gifts from people running in the race, ${fromCandidates
        .slice(0, 3)
        .map((g) => `${g.id} ${dollars(g.totalMinor)}`)
        .join(", ")}, not counted)`
    : "";
  if (!event || !gift)
    return {
      missing: `the player's filing ${filing.id} has ${gifts.length} gifts from named people not running${notCounted} and ${events.length} campaign-gift records, none matching (raise-money unavailable ${played.unavailable["raise-money"] ?? "never"})`,
    };
  const base = `${gifts.length} named donors not running${notCounted}; gift ${gift.id} (${gift.donorId}, ${dollars(gift.totalMinor)} in all) and its record ${event.id}`;
  if (!played.donorMeetings.length)
    return {
      missing: `${base}; but no donor meeting was held (donor-meeting unavailable ${played.unavailable["donor-meeting"] ?? "never"}; refused ${played.unavailable["donor-meeting (refused)"] ?? "never"})`,
    };
  const kept = logOfKind(core, "campaign-donor-meeting").filter(
    (row) => row.facts?.filingId === filing.id,
  );
  const atRivals = played.donorMeetings.filter((held) =>
    running.has(held.hostId),
  );
  const meetings = played.donorMeetings
    .filter((held) => !running.has(held.hostId))
    .flatMap(
      (held) =>
        kept.find(
          (row) => row.date === held.date && row.facts?.hostId === held.hostId,
        ) ?? [],
    );
  if (!meetings.length)
    return {
      missing: `${base}; the player held ${played.donorMeetings.length} donor meetings (${played.donorMeetings
        .slice(0, 3)
        .map((m) => `${m.date} at ${m.hostId}'s`)
        .join(
          ", ",
        )}), ${atRivals.length} hosted by someone running in the race (not counted), and the log kept none of the others' records (${kept.length} campaign-donor-meeting records for the filing)`,
    };
  for (const meeting of meetings)
    for (const donorId of (meeting.facts?.donorIds ?? "")
      .split(",")
      .filter((id) => id && !running.has(id))) {
      const given = gifts.find((g) => g.donorId === donorId);
      const record = events.find(
        (e) => e.facts?.donorId === donorId && e.date === meeting.date,
      );
      if (given && record)
        return {
          found: `${base}; at donor meeting ${meeting.id} (host ${meeting.facts?.hostId}, not running in the race; ${meeting.facts?.came ?? "?"} came, ${meeting.facts?.gave ?? "?"} gave) ${donorId} gave: gift ${given.id}, record ${record.id}; ${meetings.length} donor meetings held at hosts not running (${atRivals.length} at hosts running)`,
        };
    }
  return {
    missing: `${base}; but the ${meetings.length} donor meetings held (${meetings
      .slice(0, 3)
      .map((m) => `${m.id} gave ${m.facts?.gave ?? "?"}`)
      .join(", ")}) left no named gift with its record`,
  };
}

/**
 * (d) The seat's incumbent, running against the player, changed their
 * schedule after the player gained (the done-when: "the incumbent changing
 * their schedule after the player gains"): a `steppedUp` row
 * (`campaignTurn` keeps `rivalDay`'s stepped-up day, `recordSteppedUp`) for
 * the incumbent's own filing in the player's contest, whose candidate is the
 * incumbent (`incumbentOf`), naming the player as the rival ahead, whose
 * source is a `polls` or `rivalWord` row that exists, with hours or door
 * hours gained, and whose `campaign-stepped-up` event was told. An open seat
 * (no incumbent on the ballot) cannot show it, and the draw is missing; a
 * rival who is not the incumbent, or the town's other races, never stand in
 * for it.
 */
function clauseSteppedUp(played: Race): Clause {
  const { api, core, me, contest, where } = played;
  const seat = seatIncumbent(api, contest);
  const incumbent = seat.personId;
  const sourceKept = (row: SteppedUpRow) =>
    !!getOf(
      api,
      CAMPAIGNS_MODULE_ID,
      row.sourceKind === "poll" ? "polls" : "rivalWord",
      row.sourceRecordId,
    );
  const rivals = queryOf<FilingRow>(
    api,
    ELECTIONS_MODULE_ID,
    "filings",
    "byContest",
    contest.id,
  ).filter(
    (f) =>
      f.personId !== me &&
      (f.status === "on-ballot" || f.status === "petitioning"),
  );
  const onBallot = rivals
    .map((f) => `${f.id} (${f.personId}, ${f.status})`)
    .join("; ");
  const held = incumbent
    ? rivals.find((f) => f.personId === incumbent)
    : undefined;
  if (!incumbent || !held)
    return {
      missing: `open seat, no incumbent running: the player's race ${contest.id} (incumbent ${incumbent ? `${incumbent}, term ${seat.termId}, not on the ballot` : seat.termId ? `term ${seat.termId}, no person filled in` : "none, the seat has no serving term"}; ${rivals.length} rivals: ${onBallot || "none"})`,
    };
  const readings = rivals.flatMap((f) => steppedUpOf(api, f.id));
  const ahead = (row: SteppedUpRow) =>
    row.contestId === contest.id &&
    row.rivalId === me &&
    (row.extraHours > 0 || row.extraDoorHours > 0) &&
    sourceKept(row);
  const rows = steppedUpOf(api, held.id)
    .filter((row) => row.candidateId === incumbent && ahead(row))
    .sort((a, b) => a.date.localeCompare(b.date) || a.id.localeCompare(b.id));
  const others = readings.filter(
    (row) => row.candidateId !== incumbent && ahead(row),
  );
  const row = rows[0];
  if (row) {
    const eventId = `${CAMPAIGN_STEPPED_UP_EVENT}:${row.id}`;
    expect(
      core.eventIds.has(eventId),
      `${where}: the incumbent's steppedUp ${row.id} told as ${eventId}`,
    ).toBe(true);
    return {
      found: `in the player's race (incumbent ${incumbent}, filing ${held.id}; ${rows.length} of the incumbent's readings of the player ahead stepped them up, ${others.length} by the other ${rivals.length - 1} rivals): steppedUp ${row.id} on ${row.date}, candidate ${row.candidateId} (the incumbent), read ${row.sourceKind} ${row.sourceRecordId} naming the player ahead (own ${row.ownShare.toFixed(3)}, the player ${row.rivalShare.toFixed(3)}, threat ${row.threat.toFixed(3)}); extra hours ${row.extraHours.toFixed(2)}, extra door hours ${row.extraDoorHours.toFixed(2)}${row.cameHome ? ", came home to the town's doors" : ""}; record ${eventId}${core.durableLog.has(eventId) ? " (kept in the durable log)" : ""}`,
    };
  }
  const polls = queryOf<PollRow>(
    api,
    CAMPAIGNS_MODULE_ID,
    "polls",
    "byContest",
    contest.id,
  );
  return {
    missing: `the incumbent ${incumbent} (filing ${held.id}) never stepped up on reading the player ahead (${readings.length} stepped-up rows in the race, ${readings.filter((r) => r.rivalId === me).length} naming the player, ${others.length} by rivals who are not the incumbent, not counted): ${rivals
      .map((f) => {
        const word = queryOf<{ contestId?: string }>(
          api,
          CAMPAIGNS_MODULE_ID,
          "rivalWord",
          "byCandidate",
          f.personId,
        ).filter((r) => r.contestId === contest.id).length;
        return `${f.id} (${f.personId}${f.personId === incumbent ? ", the incumbent" : ""}, ${f.status}): ${polls.filter((p) => p.campaignId === f.id).length} polls, ${word} words of a rival, ${steppedUpOf(api, f.id).length} stepped-up rows`;
      })
      .join("; ")}`,
  };
}

type Draw = { readonly proven: string } | { readonly tried: string };

/**
 * The place for one draw: the draw of seed and attempt, and, where that place
 * has no elected council, the next draws of the same attempt (`:skipN`) until
 * one has; every place passed over is named, and none is played.
 */
function drawCouncilPlace(attempt: number): {
  readonly place: DrawnPlace;
  readonly skipped: readonly string[];
} {
  const skipped: string[] = [];
  for (let redraw = 0; redraw <= MAX_SKIPPED_PLACES; redraw += 1) {
    const place = drawPlace(
      redraw ? `${seed}:${attempt}:skip${redraw}` : `${seed}:${attempt}`,
      "campaign-real-race-played",
    );
    if (hasCouncilSeat(place.key)) return { place, skipped };
    skipped.push(
      `${place.name} (${place.key}), place seed ${place.seed}, no elected council`,
    );
  }
  throw new Error(
    `draw ${attempt} of seed ${seed}: ${skipped.length} places drawn in a row with no elected council: ${skipped.join("; ")}`,
  );
}

/** One drawn place: play the race, reading each clause's records on the eve. */
function attemptPlace(attempt: number): Draw {
  setBookkeeping(false);
  const { place, skipped } = drawCouncilPlace(attempt);
  const where = `${place.name} (${place.key}), place seed ${place.seed}, draw ${attempt} of seed ${seed}${skipped.length ? ` (skipped ${skipped.length} drawn places with no council: ${skipped.join("; ")})` : ""}`;
  const played = playRace(where, place.seed, place.key);
  if ("tried" in played) return played;
  const { clauses } = played;
  // Every clause is read before the count: on a day before election day.
  expect(
    played.readOn < played.contest.electionDate,
    `${where}: clauses read on ${played.readOn}, before election day ${played.contest.electionDate}`,
  ).toBe(true);
  const report = Object.entries(clauses)
    .map(
      ([name, c]) =>
        `${name}: ${"found" in c ? c.found : `MISSING ${c.missing}`}`,
    )
    .join(" | ");
  const text = `${where}; ${played.summary}; ${report}`;
  if (SMOKE_WEEKS) return { tried: `SMOKE ${text}` };
  if (Object.values(clauses).every((c) => "found" in c)) {
    // The found records that outlive the count (town halls and gifts), read
    // back once more after election day with the place in the message.
    const { api, me, filing } = played;
    expect(
      queryOf<TownHallRow>(api, MEETINGS_MODULE_ID, "townHalls", "byHost", me)
        .filter((h) => h.filingId === filing.id)
        .some((h) => h.causeIds.length > 0),
      `${where}: the player's forum`,
    ).toBe(true);
    expect(
      namedGifts(played).gifts.length,
      `${where}: named donors not running in the race`,
    ).toBeGreaterThan(0);
    return { proven: text };
  }
  return { tried: text };
}

const draws: Draw[] = [];

// One draw per test, so a long run yields between places; the last test
// fails, naming every place and seed tried and why, when none showed all four.
for (let attempt = 0; attempt < DRAWS; attempt += 1)
  it(
    `draw ${attempt}: a played race shows a group's volunteers, the player's forum, named donors and the incumbent stepping up`,
    () => {
      if (draws.some((d) => "proven" in d)) return;
      const result = attemptPlace(attempt);
      process.stdout.write(`DRAW ${attempt}: ${JSON.stringify(result)}\n`);
      draws.push(result);
    },
    DRAW_TIMEOUT,
  );

it("some drawn place showed every clause by record id", () => {
  const proven = draws.flatMap((d) => ("proven" in d ? [d.proven] : []));
  const tried = draws.flatMap((d) => ("tried" in d ? [d.tried] : []));
  if (SMOKE_WEEKS) {
    // A smoke run plays a few weeks only: it shows the loop ran, not the clauses.
    process.stdout.write(`SMOKE seed ${seed}: ${tried.join("; ")}\n`);
    expect(draws.length, `smoke run, seed ${seed}`).toBe(1);
    return;
  }
  expect(
    proven.length,
    `no drawn place showed all four in ${DRAWS} draws (seed ${seed}): ${tried.join(" || ")}`,
  ).toBeGreaterThan(0);
  process.stdout.write(`PROVEN seed ${seed}: ${proven[0]}\n`);
});
