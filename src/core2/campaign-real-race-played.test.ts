/**
 * Campaigning the way real races are won, in a played world (pool item
 * campaign-like-real-races, the done-when's second half): in a place drawn
 * from all 56 on a seed nobody chose (GOLDEN_PATH_SEED pins one), the town
 * as the player gets it (buildBenchWorld, two-level, every module), the
 * player turns 18, files for the soonest council race they may file for at
 * the office that takes it, and campaigns every week to election day the way
 * `src/bench/path-check.ts` plays it: three evenings at the doors, an evening
 * of calls, an event, and a forum one week and a donor meeting the next.
 * Then, each by record id:
 *
 * (a) an organization endorsed a candidate in one of the town's races and
 *     sent its members as volunteers, and the volunteers engine walked them
 *     to doors (an `endorsements` row with an organization, its members on
 *     the campaign's volunteers, a volunteer-door record by one of them);
 * (b) a forum the player hosted (a meetings `townHalls` row with the player
 *     as host, the player's filing and the causes it wrote);
 * (c) money raised by named donors (`gifts` rows and `campaign-gift`
 *     events), one of them given at a donor meeting where one was held;
 * (d) a rival, the incumbent first, campaigning harder after reading the
 *     race (a `steppedUp` row naming the poll or word of a rival it read,
 *     with hours or door hours gained).
 *
 * A clause the drawn place cannot show (no group in town, the player's
 * petition short, nobody stepped up) is named and the next place drawn, up
 * to six; the last test fails naming every place, seed and reason.
 * REAL_RACE_SMOKE_WEEKS=<n> plays one place for n campaign weeks and only
 * prints what it found (a quick check that the play loop runs).
 */
import { randomBytes } from "node:crypto";
import { expect, it } from "vitest";
import { drawPlace } from "../../scripts/core2-year/place";
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
  VOLUNTEER_SHIFT_EVENT,
  organizedGroupsIn,
  signaturesToGather,
  steppedUpOf,
  type CampaignRow,
  type CauseRow,
  type EndorsementRow,
  type GiftRow,
  type PledgeRow,
  type PollRow,
  type SteppedUpRow,
} from "./modules/campaigns";
import {
  ELECTIONS_MODULE_ID,
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
import { OFFICES_MODULE_ID, type TermRow } from "./modules/offices";
import { actOn, waitingEntries } from "./office-day-state";
import { coreAPI } from "./state";
import type { CoreAPI, CoreState, LogRecord } from "./types";

const seed = process.env.GOLDEN_PATH_SEED ?? randomBytes(8).toString("hex");
const SMOKE_WEEKS = Math.max(
  0,
  Math.floor(Number(process.env.REAL_RACE_SMOKE_WEEKS ?? 0) || 0),
);
const DRAWS = SMOKE_WEEKS ? 1 : 6;
/** One draw is a played year: building the town, living to 18 and a campaign. */
const DRAW_TIMEOUT = 1_800_000;

/** What a clause found, by record id, or why the drawn place could not show it. */
type Clause = { readonly found: string } | { readonly missing: string };

const rowsOf = <T>(api: CoreAPI, moduleId: string, name: string): T[] =>
  api.moduleState(moduleId).table(name).rows() as unknown as T[];
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

/** The person serving the seat a contest is for, if they hold it. */
function incumbentOf(api: CoreAPI, contest: ContestRow): string | null {
  if (!contest.incumbentTermId) return null;
  const term = getOf<TermRow>(
    api,
    OFFICES_MODULE_ID,
    "terms",
    contest.incumbentTermId,
  );
  return term?.status === "serving" ? term.personId : null;
}

const dollars = (minor: number) => `$${Math.round(minor / 100)}`;

/** The player's race, played to election day, with what the play saw along the way. */
interface Played {
  readonly core: CoreState;
  readonly api: CoreAPI;
  readonly town: string;
  readonly me: string;
  readonly filing: FilingRow;
  readonly contest: ContestRow;
  /** The town halls the player's forums held, as `campaignDay` returned them. */
  readonly hallIds: readonly string[];
  /** Each day choice the week's plan reached and found unavailable: how many times, and the last facts. */
  readonly unavailable: Readonly<Record<string, string>>;
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

  /** Live until the date, the character answering its own choices (path-check's liveUntil). */
  const liveUntil = (date: string) => {
    for (let guard = 0; core.date < date && guard < 400; guard++) {
      if (player.pollingPlace && running)
        try {
          player.markBallot(running, me);
        } catch (error) {
          notes.push(`no ballot of their own: ${(error as Error).message}`);
        }
      if (player.pollingPlace) player.leavePolls();
      const packet =
        player.packet?.kind === "stop"
          ? player.packet
          : player.advance(
              "calendar",
              addDays(makeIsoDate(player.packet?.at.date ?? core.date), 7),
            ).packet;
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

  // The petition: canvass each week until it holds the signatures the clerk
  // will count or the deadline comes; the clerk checks it the morning after.
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

  // The campaign, every week to election day, as path-check plays it.
  const hallIds: string[] = [];
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
    for (const kind of [
      "canvass",
      "canvass",
      "raise-money",
      "canvass",
      "event",
      week.weeks % 2 ? "donor-meeting" : "forum",
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
      try {
        out = campaignDay(core, me, { filingId: filing.id, kind });
      } catch (error) {
        missed.set(`${kind} (refused)`, {
          times: (missed.get(`${kind} (refused)`)?.times ?? 0) + 1,
          facts: (error as Error).message,
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
      player.spend(out.hours);
    }
    week.weeks += 1;
    liveUntil(addDays(makeIsoDate(core.date), 7));
  }
  if (!SMOKE_WEEKS) liveUntil(contest.electionDate);
  const town =
    getOf<{ townPlaceId: string }>(api, CAMPAIGNS_MODULE_ID, "town", "town")
      ?.townPlaceId ?? w.placeId;
  return {
    core,
    api,
    town,
    me,
    filing,
    contest,
    hallIds,
    unavailable: Object.fromEntries(
      [...missed].map(([kind, m]) => [kind, `${m.times}x, last ${m.facts}`]),
    ),
    summary: `${contest.title} (${contest.id}, election ${contest.electionDate}), filing ${filing.id}; ${week.weeks} weeks: doors ${week.doors}, reached ${week.reached}, raised ${dollars(week.raised)}, events ${week.events}, forums ${week.forums}, donor meetings ${week.donorMeetings}${notes.length ? `; ${notes.slice(0, 3).join("; ")}` : ""}`,
  };
}

/**
 * (a) An organization backed a candidate in one of the town's races
 * (`groupsWeighRace` writes the `endorsements` row with its organization),
 * its members who said yes are on that campaign's volunteers
 * (`askToVolunteer`), and the volunteers engine walked one of them to doors
 * (`volunteerShifts` reads the campaign's volunteers): a `volunteer-door`
 * cause by them, or where its voter is outside the player's circle (whose
 * causes play keeps) the door "yes" they took or their kept shift.
 */
function clauseGroup(played: Played): Clause {
  const { api, core, town } = played;
  const endorsements = rowsOf<EndorsementRow>(
    api,
    CAMPAIGNS_MODULE_ID,
    "endorsements",
  )
    .filter((row) => row.organizationId !== null && row.answer === "yes")
    .sort((a, b) => a.date.localeCompare(b.date) || a.id.localeCompare(b.id));
  if (!endorsements.length) {
    const groups = organizedGroupsIn(api, town);
    return {
      missing: groups.length
        ? `${groups.length} organizations in town (${groups
            .slice(0, 6)
            .map(
              (g) =>
                `${g.organizationId} ${g.kind}, ${g.memberIds.length} members, speaker ${g.speakerId ?? "none"}`,
            )
            .join("; ")}) endorsed no one in the town's races`
        : "no organization in town to endorse anyone",
    };
  }
  const seen: string[] = [];
  for (const row of endorsements) {
    const campaign = getOf<CampaignRow>(
      api,
      CAMPAIGNS_MODULE_ID,
      "campaigns",
      row.filingId,
    );
    const sent = row.volunteerIds.filter((id) =>
      campaign?.volunteerIds.includes(id),
    );
    if (!sent.length) {
      seen.push(
        `${row.id}: ${row.volunteerIds.length} members said yes, none on the campaign's volunteers`,
      );
      continue;
    }
    const walkers = new Set(sent);
    const cause = queryOf<CauseRow>(
      api,
      CAMPAIGNS_MODULE_ID,
      "causes",
      "byCandidate",
      row.candidateId,
    ).find((c) => c.act === "volunteer-door" && walkers.has(c.actorId));
    const pledge = queryOf<PledgeRow>(
      api,
      CAMPAIGNS_MODULE_ID,
      "pledges",
      "byCandidate",
      row.candidateId,
    ).find((p) => p.contestId === row.contestId && walkers.has(p.canvasserId));
    const shift = logOfKind(core, VOLUNTEER_SHIFT_EVENT).find(
      (e) =>
        e.facts?.filingId === row.filingId &&
        walkers.has(e.facts?.volunteerId ?? ""),
    );
    const door = cause
      ? `volunteer-door cause ${cause.id} by ${cause.actorId} (moved ${cause.voterId})`
      : pledge
        ? `door yes ${pledge.id} taken by volunteer ${pledge.canvasserId}`
        : shift
          ? `volunteer-shift ${shift.id} (${shift.facts?.doorsKnocked ?? "?"} doors)`
          : null;
    if (!door) {
      seen.push(
        `${row.id}: volunteers ${sent.join(", ")} on the campaign, no door record by them`,
      );
      continue;
    }
    return {
      found: `endorsement ${row.id} by ${row.organizationId} (speaker ${row.speakerId}, ${row.reason}) on ${row.date} for filing ${row.filingId} (candidate ${row.candidateId}${row.candidateId === played.me ? ", the player" : ""}); ${sent.length} of its members on the campaign's volunteers (${sent.slice(0, 4).join(", ")}); ${door}`,
    };
  }
  return {
    missing: `${endorsements.length} group endorsements, none whose volunteers walked: ${seen.slice(0, 4).join("; ")}`,
  };
}

/**
 * (b) A forum the player hosted: the meetings engine's town hall
 * (`holdTownHall`, through the forum day choice) with the player as host and
 * the player's filing, whose causes the campaigns engine kept.
 */
function clauseForum(played: Played): Clause {
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
 * (c) Money raised by named donors: the player's filing's `gifts` rows from
 * full people (`donationAnswer`) and their public `campaign-gift` records
 * (`recordGift`), one of them given at a donor meeting
 * (`holdDonorMeeting`'s `campaign-donor-meeting` record names the donors)
 * where one was held.
 */
function clauseDonors(played: Played): Clause {
  const { api, core, me, filing } = played;
  const gifts = queryOf<GiftRow>(
    api,
    CAMPAIGNS_MODULE_ID,
    "gifts",
    "byCampaign",
    filing.id,
  ).filter(
    (g) => g.donorId !== me && core.people.has(g.donorId) && g.totalMinor > 0,
  );
  const events = logOfKind(core, "campaign-gift").filter(
    (e) => e.facts?.filingId === filing.id,
  );
  const event = events.find((e) =>
    gifts.some((g) => g.donorId === e.facts?.donorId),
  );
  const gift = event && gifts.find((g) => g.donorId === event.facts?.donorId);
  if (!event || !gift)
    return {
      missing: `the player's filing ${filing.id} has ${gifts.length} gifts from named people and ${events.length} campaign-gift records, none matching (raise-money unavailable ${played.unavailable["raise-money"] ?? "never"})`,
    };
  const base = `${gifts.length} named donors; gift ${gift.id} (${gift.donorId}, ${dollars(gift.totalMinor)} in all) and its record ${event.id}`;
  const meetings = logOfKind(core, "campaign-donor-meeting").filter(
    (e) => e.facts?.filingId === filing.id,
  );
  if (!meetings.length)
    return {
      found: `${base}; no donor meeting could be held (donor-meeting unavailable ${played.unavailable["donor-meeting"] ?? "never"}; refused ${played.unavailable["donor-meeting (refused)"] ?? "never"})`,
    };
  for (const meeting of meetings)
    for (const donorId of (meeting.facts?.donorIds ?? "")
      .split(",")
      .filter(Boolean)) {
      const given = gifts.find((g) => g.donorId === donorId);
      const record = events.find(
        (e) => e.facts?.donorId === donorId && e.date === meeting.date,
      );
      if (given && record)
        return {
          found: `${base}; at donor meeting ${meeting.id} (host ${meeting.facts?.hostId}, ${meeting.facts?.came ?? "?"} came, ${meeting.facts?.gave ?? "?"} gave) ${donorId} gave: gift ${given.id}, record ${record.id}; ${meetings.length} donor meetings held`,
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
 * (d) A rival in the player's race, the incumbent and a reading that named
 * the player first, campaigned harder after reading the race: a `steppedUp`
 * row (`campaignTurn` keeps `rivalDay`'s stepped-up day, `recordSteppedUp`)
 * whose source is a `polls` or `rivalWord` row that exists, with hours or
 * door hours gained. A race with no rival is said so, and the town's other
 * races are read.
 */
function clauseSteppedUp(played: Played): Clause {
  const { api, core, me, contest } = played;
  const incumbent = incumbentOf(api, contest);
  const sourceKept = (row: SteppedUpRow) =>
    !!getOf(
      api,
      CAMPAIGNS_MODULE_ID,
      row.sourceKind === "poll" ? "polls" : "rivalWord",
      row.sourceRecordId,
    );
  const gained = (row: SteppedUpRow) =>
    (row.extraHours > 0 || row.extraDoorHours > 0) && sourceKept(row);
  const rank = (row: SteppedUpRow) =>
    (row.rivalId === me ? 0 : 2) + (row.candidateId === incumbent ? 0 : 1);
  const order = (a: SteppedUpRow, b: SteppedUpRow) =>
    rank(a) - rank(b) ||
    a.date.localeCompare(b.date) ||
    a.id.localeCompare(b.id);
  const describe = (row: SteppedUpRow, scope: string) => {
    const eventId = `${CAMPAIGN_STEPPED_UP_EVENT}:${row.id}`;
    return `${scope}: steppedUp ${row.id} on ${row.date}, candidate ${row.candidateId}${row.candidateId === incumbent ? " (the incumbent)" : ""}, read ${row.sourceKind} ${row.sourceRecordId} naming ${row.rivalId === me ? "the player" : row.rivalId} ahead (own ${row.ownShare.toFixed(3)}, rival ${row.rivalShare.toFixed(3)}, threat ${row.threat.toFixed(3)}); extra hours ${row.extraHours.toFixed(2)}, extra door hours ${row.extraDoorHours.toFixed(2)}${row.cameHome ? ", came home to the town's doors" : ""}; record ${core.durableLog.has(eventId) ? eventId : "not kept in the log (outside the player's circle)"}`;
  };
  const rivals = queryOf<FilingRow>(
    api,
    ELECTIONS_MODULE_ID,
    "filings",
    "byContest",
    contest.id,
  ).filter((f) => f.personId !== me && f.status !== "withdrawn");
  if (rivals.length) {
    const rows = rivals
      .flatMap((f) => steppedUpOf(api, f.id))
      .filter(gained)
      .sort(order);
    if (rows[0])
      return {
        found: describe(
          rows[0],
          `in the player's race (${rows.length} readings stepped ${rivals.length} rivals up)`,
        ),
      };
    return {
      missing: `no rival in the player's race stepped up (incumbent ${incumbent ?? "none"}): ${rivals
        .map((f) => {
          const polls = queryOf<PollRow>(
            api,
            CAMPAIGNS_MODULE_ID,
            "polls",
            "byContest",
            contest.id,
          ).filter((p) => p.campaignId === f.id).length;
          const word = queryOf<{ contestId?: string }>(
            api,
            CAMPAIGNS_MODULE_ID,
            "rivalWord",
            "byCandidate",
            f.personId,
          ).filter((r) => r.contestId === contest.id).length;
          return `${f.id} (${f.personId}, ${f.status}): ${polls} polls, ${word} words of a rival, ${steppedUpOf(api, f.id).length} stepped-up rows`;
        })
        .join("; ")}`,
    };
  }
  const elsewhere = rowsOf<SteppedUpRow>(api, CAMPAIGNS_MODULE_ID, "steppedUp")
    .filter(gained)
    .sort(order);
  if (elsewhere[0])
    return {
      found: describe(
        elsewhere[0],
        `the player's race ${contest.id} had no rival, so another of the town's races`,
      ),
    };
  return {
    missing: `the player's race ${contest.id} had no rival, and no candidate in the town's other races stepped up`,
  };
}

type Draw = { readonly proven: string } | { readonly tried: string };

/** One drawn place: play the race, then read each clause's records. */
function attemptPlace(attempt: number): Draw {
  setBookkeeping(false);
  const place = drawPlace(`${seed}:${attempt}`, "campaign-real-race-played");
  const where = `${place.name} (${place.key}), place seed ${place.seed}, draw ${attempt} of seed ${seed}`;
  const played = playRace(where, place.seed, place.key);
  if ("tried" in played) return played;
  const clauses = {
    "(a) group endorsed and sent volunteers": clauseGroup(played),
    "(b) forum the player hosted": clauseForum(played),
    "(c) named donors": clauseDonors(played),
    "(d) a rival stepped up": clauseSteppedUp(played),
  };
  const report = Object.entries(clauses)
    .map(
      ([name, c]) =>
        `${name}: ${"found" in c ? c.found : `MISSING ${c.missing}`}`,
    )
    .join(" | ");
  const text = `${where}; ${played.summary}; ${report}`;
  if (SMOKE_WEEKS) return { tried: `SMOKE ${text}` };
  if (Object.values(clauses).every((c) => "found" in c)) {
    // The found records, read back once more with the place in the message.
    const { api, me, filing } = played;
    expect(
      queryOf<TownHallRow>(api, MEETINGS_MODULE_ID, "townHalls", "byHost", me)
        .filter((h) => h.filingId === filing.id)
        .some((h) => h.causeIds.length > 0),
      `${where}: the player's forum`,
    ).toBe(true);
    expect(
      queryOf<GiftRow>(
        api,
        CAMPAIGNS_MODULE_ID,
        "gifts",
        "byCampaign",
        filing.id,
      ).filter((g) => g.donorId !== me && played.core.people.has(g.donorId))
        .length,
      `${where}: named donors`,
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
    `draw ${attempt}: a played race shows a group's volunteers, the player's forum, named donors and a rival stepping up`,
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
