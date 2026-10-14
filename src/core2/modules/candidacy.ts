/**
 * Who runs for office (M2-04). When a contest opens, each adult it reaches
 * weighs running against staying out through the core's one chooser, from
 * their own record: how closely they follow politics (views), the strongest
 * cause they carry (drives), their temperament, their work hours, their
 * age, how they stand with the incumbent, how many people in town know them
 * and, for a county seat,
 * the wider ground a countywide race covers. The decision and every
 * reason behind it are kept, so each candidate on a ballot filed through a
 * choice that can be explained. Filing itself is GOV's (`fileCandidacy`).
 *
 * In play (PW-3), the day a local contest's filing window opens every named
 * adult who lives in town weighs it. A wider race (a state legislative
 * seat, the House, a statewide office) is weighed by everyone with standing
 * in its jurisdiction (`candidate-pool.ts`: officeholders at every level,
 * party officers, former candidates, prominent people and the town's adults),
 * each by the same chooser. Where a major party's side has no candidate, its
 * officers ask the strongest in the pool on that side, who decide the same
 * way. Whoever decides to run files with the place's filing office, on a
 * platform from their own views.
 */
import { votesOf } from "./record";
import { leanOf } from "./legislature";
import { viewOn } from "./views";
import { ageOnDate, makeIsoDate } from "../../simulation/dates";
import { scoreOffers, decisionFromScores } from "../choice";
import type { ModuleRow } from "../module-data";
import type {
  ActionDefinition,
  ActOffer,
  CoreAPI,
  CoreModule,
  CoreState,
  PersonId,
  PersonInput,
  PersonState,
} from "../types";
import { decisionKinds } from "../trait-decisions";
import { closenessBetween } from "../closeness";
import { PLATFORM_QUESTIONS, questionAxis } from "../campaign-views";
import { partySide } from "../appointments";
import { pressConflict } from "../press-conflict";
import { isExplicitlyControlledPersonV1 } from "../player-control-state-v1";
import {
  ELECTIONS_MODULE_ID,
  fileCandidacy,
  filingRulesFor,
  checkEligibility,
  type ContestRow,
  type FilingRow,
  type OfficeFamily,
} from "./elections";
import { OFFICES_MODULE_ID, type TermRow } from "./offices";
import { PARTIES_MODULE_ID, partiesHere } from "./parties";
import {
  VIEWS_DATA,
  VIEWS_KEYS,
  VIEWS_MODULE_ID,
  viewCell,
  viewOf,
} from "./views";
import { DEFAULT_DRIVES_DATA } from "./drives";
import { residentPerson } from "./residents";
import { stableHash } from "../../simulation/ids";
import { countedResidents, type CountedVoter } from "../electorate";
import { fillInPerson } from "../state";
import {
  CANDIDACY_MODULE_ID,
  CANDIDACY_PARAMETERS,
  candidacyParameter as c,
  appointedHolders,
  partyOf,
  poolFactsFor,
  raceScope,
  seatParty,
  sideOf,
  standingPool,
  type PoolFacts,
  type PoolMember,
  type RaceScope,
} from "../candidate-pool";

export { CANDIDACY_MODULE_ID, CANDIDACY_PARAMETERS };
const STOPGAP = "SG-P15-candidacy-weights";

/** What a person knows about a contest when deciding (GOV's records). */
export interface OpenContest {
  contestId: string;
  officeName: string;
  filingDeadline: string;
  /** The seat's government is the county's: a countywide campaign. */
  countywide?: boolean;
  /** Who holds the seat now, if anyone (GOV's term record). */
  incumbentId?: PersonId;
  /** How many have already decided to run for it. */
  runners?: number;
  /** A race wider than the county: a state legislative seat, the House or a statewide office. */
  wide?: boolean;
  /** What each weigher of a wide race brings beyond a resident's record (the standing pool's facts). */
  facts?: ReadonlyMap<PersonId, RaceFacts>;
  sourceIds: readonly string[];
}

/** The pool's facts about one weigher of a wide race, with how far their lean sits from the race's electorate. */
export interface RaceFacts extends PoolFacts {
  /** The distance between their lean and the electorate's, 0 to 2. */
  readonly leanGap: number;
  /** Their party's officers asked them to run. */
  readonly asked: boolean;
}

export interface CandidacyDecision {
  id: string;
  personId: PersonId;
  contestId: string;
  date: string;
  run: boolean;
  reasons: Readonly<Record<string, number>>;
  scores: readonly { actionId: string; score: number }[];
  sourceIds: readonly string[];
  /** What came of a decision to run: the filing, or the rules it didn't meet. */
  filing?: {
    readonly status: FilingRow["status"] | "refused";
    readonly filingId: string | null;
    readonly unmet: readonly string[];
  };
}

const causeKinds: ReadonlySet<string> = new Set(
  DEFAULT_DRIVES_DATA.driveKinds
    .filter((kind) => kind.shareable)
    .map((kind) => kind.id),
);

/** What a person's record says that bears on running. */
interface RunFacts {
  readonly id: PersonId;
  readonly birthDate: string;
  readonly traits: Readonly<Record<string, number>>;
  /** Recorded work hours a day. */
  readonly workHoursDaily: number;
  /** How many people know them. */
  readonly known: number;
  /** How closely they follow politics, 0 to 1. */
  readonly engagement: number;
  /** Their strongest recorded cause, 0 to 1. */
  readonly cause: number;
  /** Their recorded relationship with the incumbent, -1 to 1. */
  readonly incumbentTie: number;
  /** How far the incumbent's recorded votes go against their own views, 0 to 1. */
  readonly recordGap: number;
  /** A wide race: what the standing pool adds. */
  readonly pool?: RaceFacts;
}

/**
 * Each recorded reason for running, as a signed pull. With `bound`, the
 * reasons that need the incumbent's record (a tie to the officeholder, the
 * votes they cast) are left at their most favorable value, so the sum is
 * the most the person could be pulled: a cheap screen for a wide race.
 */
export function candidacyReasons(
  api: CoreAPI,
  person: Readonly<PersonState>,
  contest: OpenContest,
  bound = false,
): Record<string, number> {
  const zero = api.parameter("zero");
  const one = api.parameter("one");
  const view = viewOf(api, person.id);
  let cause = zero;
  // Only drives about a question the town faces (the shareable kinds in the
  // drives data: a cause, a calling) are reasons to run. A grudge, family or
  // status drive is about a person or oneself and gives filing no push.
  for (const drive of person.drives.values())
    if (drive.kind && causeKinds.has(drive.kind))
      cause = Math.max(cause, Math.min(one, drive.strength));
  const job = person.jobId ? api.state.jobs.get(person.jobId) : undefined;
  // How they stand with the incumbent: someone close to the officeholder
  // doesn't run against them; someone at odds with them is drawn to.
  let incumbentTie = zero;
  if (!bound && contest.incumbentId && contest.incumbentId !== person.id)
    incumbentTie = Math.min(
      one,
      closenessBetween(api.state, person.id, contest.incumbentId),
    );
  // How the incumbent has voted against what they think: each vote on the
  // record, by how strongly their current view on its question opposes it.
  let recordGap = bound && contest.incumbentId ? one : zero;
  if (!bound && contest.incumbentId && contest.incumbentId !== person.id) {
    const votes = votesOf(api, contest.incumbentId);
    if (votes.length) {
      const lean = leanOf(api, person.id);
      recordGap =
        votes.reduce(
          (sum, vote) =>
            sum +
            Math.max(
              zero,
              -viewOn(api, person.id, vote.stance.question, lean) *
                Math.sign(vote.stance.position),
            ),
          zero,
        ) / votes.length;
    }
  }
  return reasonsFrom(
    api,
    {
      id: person.id,
      birthDate: person.birthDate,
      traits: person.traits,
      workHoursDaily: job?.hoursDaily ?? zero,
      known: person.knownIds.size,
      engagement: view?.engagement ?? zero,
      cause,
      incumbentTie,
      recordGap: Math.min(one, recordGap),
      ...(contest.facts?.get(person.id)
        ? { pool: contest.facts.get(person.id)! }
        : {}),
    },
    contest,
  );
}

/**
 * The same reasons for a counted resident, from what their counted record
 * holds: their traits, age, scheduled work and the people who know
 * them. How closely they follow politics is the average for their state and
 * age (CES 2024, the cell their own view will be read from once they are
 * filled in); no cause is recorded for them yet.
 */
export function countedCandidacyReasons(
  api: CoreAPI,
  voter: CountedVoter,
  contest: OpenContest,
): Record<string, number> {
  const zero = api.parameter("zero");
  const record = residentPerson(api.state as CoreState, voter.id);
  return reasonsFrom(
    api,
    {
      id: voter.id,
      birthDate: voter.birthDate,
      traits: voter.traits,
      workHoursDaily:
        voter.weeklyMinutes /
        api.parameter("minutesPerHour") /
        c(api, "candidacyWorkDaysPerWeek"),
      known: record?.knownIds.length ?? zero,
      engagement: countedEngagement(api, voter, record),
      cause: zero,
      incumbentTie: zero,
      recordGap: zero,
    },
    contest,
  );
}

/**
 * How closely a counted resident follows politics: the same value the views
 * engine gives them when they are filled in (their own key spread around the
 * CES cell's average for their state and age), so the screen and their full
 * decision agree. A copy of the views engine's formula until it exports one
 * (stopgap SG-PW3-counted-engagement-copy).
 */
function countedEngagement(
  api: CoreAPI,
  voter: CountedVoter,
  record: PersonInput | undefined,
): number {
  // stopgapId: SG-PW3-counted-engagement-copy
  api.stopgap("SG-PW3-counted-engagement-copy");
  const mean = cellEngagement(api, voter, record);
  const one = api.parameter("one");
  const digits = VIEWS_DATA.parameters.hashDigits!.value;
  const radix = VIEWS_DATA.parameters.hashRadix!.value;
  const draw = Number.parseInt(
    stableHash(`${api.state.seed}:views:engagement:${voter.id}`).slice(
      0,
      digits,
    ),
    radix,
  );
  const uniform = (draw + one / api.parameter("two")) / radix ** digits;
  return uniform ** (one / mean - one);
}

/** The CES cell's average engagement for a counted resident's state and age. */
function cellEngagement(
  api: CoreAPI,
  voter: CountedVoter,
  record: PersonInput | undefined,
): number {
  const cache = engagementCells.get(api.state) ?? new Map<string, number>();
  engagementCells.set(api.state, cache);
  const age = ageOnDate(
    makeIsoDate(voter.birthDate),
    makeIsoDate(api.state.startedAt),
  );
  const key = `${voter.placeId}|${age}`;
  const hit = cache.get(key);
  if (hit !== undefined) return hit;
  const person = {
    ...(record ?? {}),
    id: voter.id,
    birthDate: voter.birthDate,
    placeId: voter.placeId,
    traits: voter.traits,
  } as unknown as PersonState;
  const { cell } = viewCell(person, api.state.startedAt, api.state.seed);
  const value = cell.engagement ?? VIEWS_KEYS.national.engagement!;
  cache.set(key, value);
  return value;
}
const engagementCells = new WeakMap<object, Map<string, number>>();

function reasonsFrom(
  api: CoreAPI,
  person: RunFacts,
  contest: OpenContest,
): Record<string, number> {
  const zero = api.parameter("zero");
  const one = api.parameter("one");
  const two = api.parameter("two");
  // Personality enters once, through the chooser's trait term on the two
  // options' act kinds; no second temperament term here.
  const hours = person.workHoursDaily / c(api, "candidacyFullShiftHours");
  const age = ageOnDate(
    makeIsoDate(person.birthDate),
    makeIsoDate(api.state.date),
  );
  const distance =
    (age - c(api, "candidacyAgeCenter")) / c(api, "candidacyAgeSpread");
  // Standing in town: how many people know them, against the circle a local
  // campaign starts from.
  const standing = Math.min(
    one,
    Math.max(
      person.known / c(api, "candidacyStandingCircle"),
      person.pool?.standing ?? zero,
    ),
  );
  const reasons: Record<string, number> = {
    engagement: c(api, "candidacyEngagementWeight") * person.engagement,
    cause: c(api, "candidacyCauseWeight") * person.cause,
    time: -c(api, "candidacyTimeWeight") * Math.min(one, hours),
    incumbency:
      contest.incumbentId === person.id
        ? c(api, "candidacyIncumbencyWeight")
        : zero,
    incumbentTie: -c(api, "candidacyIncumbentTieWeight") * person.incumbentTie,
    // A seat no one holds draws people in; an incumbent whose record goes
    // against one's views draws a challenge.
    openSeat: contest.incumbentId ? zero : c(api, "candidacyOpenSeatWeight"),
    recordGap: c(api, "candidacyRecordGapWeight") * person.recordGap,
    standing: c(api, "candidacyStandingWeight") * standing,
    // A crowded race: each person already running lowers the pull.
    // (A wide race's holder is not deterred by the field: their seat is theirs.)
    field:
      contest.wide && contest.incumbentId === person.id
        ? zero
        : -c(api, "candidacyFieldWeight") * (contest.runners ?? zero),
    age:
      c(api, "candidacyAgeWeight") *
      (two * Math.exp(-distance * distance) - one),
    // A countywide race: more ground and more voters to reach than a town seat;
    // a statewide or congressional one, more still.
    reach: contest.countywide
      ? -c(api, "candidacyCountywideWeight")
      : contest.wide
        ? -c(api, "candidacyStatewideWeight")
        : zero,
  };
  // A wide race: what the standing pool adds. The ambition the person's
  // traits give them, the chance their lean gives them against the electorate,
  // their party's backing, their means, and being asked by their party.
  const pool = person.pool;
  if (pool) {
    reasons["ambition"] = c(api, "candidacyAmbitionWeight") * pool.ambition;
    reasons["chance"] = -c(api, "candidacyChanceWeight") * pool.leanGap;
    reasons["backing"] = c(api, "candidacyBackingWeight") * pool.backing;
    reasons["means"] = c(api, "candidacyMeansWeight") * pool.means;
    reasons["asked"] = pool.asked ? c(api, "candidacyAskedWeight") : zero;
  }
  return reasons;
}

function action(id: string, running: boolean): ActionDefinition {
  return {
    id,
    actKinds: decisionKinds("candidacy.run", id),
    goalKinds: [],
    need: "time",
    effortParameter: "zero",
    effectParameter: "one",
    targetKind: "contest",
    effect: "candidacy",
    reasonBindings: [
      {
        id: "circumstances",
        provider: "candidacy-circumstances",
        weightParameter: "one",
        arguments: { running: String(running) },
        stopgapId: STOPGAP,
      },
    ],
  };
}
export const RUN = action("candidacy-run", true);
export const STAY_OUT = action("candidacy-stay-out", false);

const pending = new WeakMap<object, OpenContest>();

function table(api: CoreAPI) {
  return api.moduleState(CANDIDACY_MODULE_ID).table("decisions");
}

/** How near a decision came to running: its run score less staying out. */
function runGap(decision: CandidacyDecision): number {
  const score = (id: string) =>
    decision.scores.find((s) => s.actionId === id)?.score ?? 0;
  return score(RUN.id) - score(STAY_OUT.id);
}

/** One person decides whether to run in an open contest; the decision is kept. */
export function decideToRun(
  api: CoreAPI,
  personId: PersonId,
  contest: OpenContest,
  /** Weigh again from today's record, unless they already chose to run. */
  reconsider = false,
): CandidacyDecision | null {
  const person = api.state.people.get(personId);
  if (!person?.alive) return null;
  const id = `${contest.contestId}:${personId}`;
  const held = table(api).get(id) as unknown as CandidacyDecision | undefined;
  // A working reporter, head or owner of an outlet does not run (owner
  // ruling, Oct 14, 2026), even if they chose to before taking the job: the
  // reason kept is the outlet.
  const conflict = pressConflict(api, personId);
  if (conflict) {
    if (held && !held.run) return held;
    const passed: CandidacyDecision = {
      id,
      personId,
      contestId: contest.contestId,
      date: api.state.date,
      run: false,
      reasons: { press: -api.parameter("one") },
      scores: [],
      sourceIds: [...contest.sourceIds, person.id, conflict.outletId],
    };
    table(api).put(passed as unknown as { id: string });
    return passed;
  }
  if (held && (held.run || !reconsider)) return held;
  pending.set(api.state, contest);
  const offers: ActOffer[] = [STAY_OUT, RUN].map((definition) => ({
    definition,
    targetId: contest.contestId,
    availableHours: api.parameter("hoursPerDay"),
  }));
  const scored = scoreOffers(api.state, personId, offers, {
    needValues: { time: api.parameter("zero") },
  });
  const decision = decisionFromScores(api.state, personId, scored);
  pending.delete(api.state);
  const row: CandidacyDecision = {
    id,
    personId,
    contestId: contest.contestId,
    date: api.state.date,
    run: decision.selected?.definition.id === RUN.id,
    reasons: candidacyReasons(api, person, contest),
    scores: scored.map((entry) => ({
      actionId: entry.offer.definition.id,
      score: entry.score,
    })),
    sourceIds: [...contest.sourceIds, person.id, person.householdId],
  };
  table(api).put(row as unknown as { id: string });
  return row;
}

export function candidatesFor(
  api: CoreAPI,
  contestId: string,
): CandidacyDecision[] {
  return table(api).query("byContestRun", [
    contestId,
    true,
  ]) as unknown as CandidacyDecision[];
}

/** One person's recorded decision in one contest, if they made one. */
export function decisionOf(
  api: CoreAPI,
  contestId: string,
  personId: PersonId,
): CandidacyDecision | null {
  if (!api.state.modules.has(CANDIDACY_MODULE_ID)) return null;
  return (
    (table(api).get(`${contestId}:${personId}`) as unknown as
      CandidacyDecision | undefined) ?? null
  );
}

/** A contest the town's adults weighed, who was asked, who ran and when they filed. */
export interface WeighedContest {
  readonly id: string;
  readonly contestId: string;
  readonly date: string;
  readonly askedIds: readonly PersonId[];
  readonly runIds: readonly PersonId[];
  /** How many counted adults in town weighed it from their counted records. */
  readonly countedWeighed: number;
  /** Counted adults whose records drew them to it, filled in to decide in full. */
  readonly filledInIds: readonly PersonId[];
  /** The day the runners filed, once the filing window opened. */
  readonly filedOn: string | null;
  /** A wide race: how many of the standing pool and the town's adults weighed it without choosing in full, and the pool's size. */
  readonly poolWeighed?: number;
  readonly poolSize?: number;
  /** A wide race: the party officers' asks, by party. */
  readonly recruitedIds?: readonly PersonId[];
}

/** How high an office sits, for "the next seat up". */
const FAMILY_RANK: Readonly<Record<OfficeFamily, number>> = {
  municipalOffice: 0,
  countyOffice: 1,
  stateLegislative: 2,
  usHouse: 3,
  statewideExecutive: 3,
};
/** Local contests: every named adult in town weighs them. */
const LOCAL_RANK = FAMILY_RANK.countyOffice;

function addDays(date: string, days: number): string {
  return new Date(Date.parse(`${date}T00:00:00Z`) + days * 86_400_000)
    .toISOString()
    .slice(0, 10);
}

/** The day a contest's filing window opens: the record's date, else a window before the deadline. */
export function filingWindowOpens(api: CoreAPI, contest: ContestRow): string {
  return (
    contest.filingOpens ??
    addDays(contest.filingDeadline, -c(api, "candidacyFilingWindowDays"))
  );
}

/**
 * The day the town's adults weigh a contest: a lead time before its filing
 * deadline (people decide to run well before they file), or the day filing
 * opens if that comes first.
 */
export function weighingDate(api: CoreAPI, contest: ContestRow): string {
  const lead = addDays(
    contest.filingDeadline,
    -c(api, "candidacyDecisionLeadDays"),
  );
  const opens = filingWindowOpens(api, contest);
  return lead < opens ? lead : opens;
}

interface Queues {
  size: number;
  /** The most local office rank on the town's ballots. */
  localRank: number;
  weigh: ContestRow[];
  file: { contest: ContestRow; opens: string }[];
  /** Contests on the town's calendar whose filing closed before the record began. */
  opening: ContestRow[];
}
const queues = new WeakMap<object, Queues>();

/** Contests to weigh and runners to file, soonest first; rebuilt when contests are added. */
function queuesFor(api: CoreAPI): Queues | null {
  if (!api.state.modules.has(ELECTIONS_MODULE_ID)) return null;
  const contests = api.moduleState(ELECTIONS_MODULE_ID).table("contests");
  const held = queues.get(api.state);
  if (held && held.size === contests.size) return held;
  const weighed = api.moduleState(CANDIDACY_MODULE_ID).table("weighed");
  const rows = (contests.rows() as unknown as ContestRow[]).filter(
    (row) => row.filingDeadline >= api.state.date,
  );
  const built: Queues = {
    size: contests.size,
    localRank: Math.max(
      LOCAL_RANK,
      Math.min(
        Number.POSITIVE_INFINITY,
        ...(contests.rows() as unknown as ContestRow[]).map(
          (row) => FAMILY_RANK[row.family],
        ),
      ),
    ),
    weigh: rows
      .filter((row) => !weighed.get(row.id))
      .sort(
        (a, b) =>
          weighingDate(api, a).localeCompare(weighingDate(api, b)) ||
          FAMILY_RANK[a.family] - FAMILY_RANK[b.family] ||
          a.id.localeCompare(b.id),
      ),
    // Only on the first day: later contests always open before filing closes
    // (a tie's second election reuses its field).
    opening: held
      ? []
      : (contests.rows() as unknown as ContestRow[])
          .filter(
            (row) =>
              row.filingDeadline < api.state.date &&
              row.electionDate > api.state.date &&
              !weighed.get(row.id),
          )
          .sort((a, b) => a.id.localeCompare(b.id)),
    file: rows
      .filter((row) => {
        const w = weighed.get(row.id) as unknown as WeighedContest | undefined;
        return !w || w.filedOn === null;
      })
      .map((contest) => ({ contest, opens: filingWindowOpens(api, contest) }))
      .sort(
        (a, b) =>
          a.opens.localeCompare(b.opens) ||
          a.contest.id.localeCompare(b.contest.id),
      ),
  };
  queues.set(api.state, built);
  return built;
}

/** The questions a runner campaigns on: where their own views are strongest. */
export function platformFromViews(api: CoreAPI, personId: PersonId): string[] {
  if (!api.state.modules.has(VIEWS_MODULE_ID)) return [];
  const view = viewOf(api, personId);
  if (!view) return [];
  const lean = view.lean / VIEWS_DATA.parameters.leanMax!.value;
  return PLATFORM_QUESTIONS.map((question) => ({
    question,
    stance: lean * questionAxis(question),
  }))
    .filter((row) => row.stance !== 0)
    .sort(
      (a, b) =>
        Math.abs(b.stance) - Math.abs(a.stance) ||
        a.question.localeCompare(b.question),
    )
    .slice(0, c(api, "candidacyPlatformQuestions"))
    .map((row) => `${row.question}=${Math.sign(row.stance)}`);
}

/** File for a runner: no fee and no petition, so a filing is on the ballot. */
function fileFor(
  api: CoreAPI,
  person: Readonly<PersonState>,
  contest: ContestRow,
  partisan: boolean,
): NonNullable<CandidacyDecision["filing"]> {
  const party = partisan ? partyOf(api, person.id) : null;
  const result = fileCandidacy(api, {
    personId: person.id,
    contestId: contest.id,
    platform: platformFromViews(api, person.id),
    party,
  });
  if (result.status === "refused")
    return {
      status: "refused",
      filingId: null,
      unmet: result.unmet.map((row) => row.rule),
    };
  return {
    status: filingStatus(api, result.filing.id),
    filingId: result.filing.id,
    unmet: [],
  };
}

function filingStatus(api: CoreAPI, filingId: string): FilingRow["status"] {
  return (
    api
      .moduleState(ELECTIONS_MODULE_ID)
      .table("filings")
      .get(filingId) as unknown as FilingRow
  ).status;
}

/**
 * A contest is weighed: a local seat by every named adult who lives in town
 * and the town's counted adults (where the town has no city or county seats,
 * its most local ones); a wider race by everyone with standing in its
 * jurisdiction, from the standing pool and the town's adults, the people
 * with no reason to run counted as weighed. The incumbent weighs keeping
 * their seat. Each decision is kept.
 */
export function weighContest(
  api: CoreAPI,
  contest: ContestRow,
  localRank: number = LOCAL_RANK,
  /** The incumbent's own filing is already on record (a race that closed before the opening). */
  incumbentFiled = false,
  /** Those who stayed out weigh it again from today's record (filing opens). */
  reconsider = false,
): WeighedContest {
  const town = api
    .moduleState(ELECTIONS_MODULE_ID)
    .table("town")
    .get("town") as unknown as { townPlaceId: string };
  const incumbent = contest.incumbentTermId
    ? (api
        .moduleState(OFFICES_MODULE_ID)
        .table("terms")
        .get(contest.incumbentTermId) as unknown as TermRow | undefined)
    : undefined;
  const incumbentId =
    incumbent?.status === "serving"
      ? (incumbent.personId ?? undefined)
      : undefined;
  const rank = FAMILY_RANK[contest.family];
  const wide = rank > localRank;
  const rules = filingRulesFor(api, contest, "party");
  const date = api.state.date;
  const asked: PersonId[] = [];
  const running: PersonId[] = [];
  const open: OpenContest = {
    contestId: contest.id,
    officeName: contest.title,
    filingDeadline: rules.deadline ?? contest.filingDeadline,
    ...(contest.family === "countyOffice" ? { countywide: true } : {}),
    ...(wide ? { wide: true } : {}),
    ...(incumbentId ? { incumbentId } : {}),
    sourceIds: [contest.id, ...(incumbent ? [incumbent.id] : [])],
  };
  const committed = committedFor(api, contest);
  // The town's counted adults weigh the seat from their counted records;
  // those it draws are filled in and decide in full like anyone.
  let countedWeighed = 0;
  const filledInIds: PersonId[] = [];
  const screen = countedScreen(api, open, town.townPlaceId, rules.minimumAge);
  countedWeighed = screen.weighed;
  for (const id of screen.drawn) {
    if (committed.has(id)) continue;
    fillInPerson(api.state as CoreState, id);
    filledInIds.push(id);
  }
  // Who weighs it: a local seat, every named adult in town; a wide race, the
  // standing pool and the town's adults.
  const scope = wide ? raceScope(api, contest) : null;
  const members = new Map<PersonId, PoolMember>();
  if (scope)
    for (const member of standingPool(api, scope))
      members.set(member.personId, member);
  const todayDate = makeIsoDate(date);
  const appointedNow = wide ? appointedHolders(api) : new Set<PersonId>();
  const weighers = [...api.state.people.values()]
    .filter(
      (p) =>
        p.alive &&
        !appointedNow.has(p.id) &&
        !pressConflict(api, p.id) &&
        (p.placeId === town.townPlaceId || members.has(p.id)) &&
        ageOnDate(makeIsoDate(p.birthDate), todayDate) >= rules.minimumAge &&
        !isExplicitlyControlledPersonV1(api.state, p.id) &&
        !committed.has(p.id) &&
        // Someone who doesn't live where the seat is (a legislator of
        // another district) can't file for it, so doesn't weigh it.
        !(
          wide &&
          checkEligibility(api, p.id, contest.id, partyOf(api, p.id)).some(
            (check) => !check.met && check.rule === "residency",
          )
        ) &&
        // A local incumbent's filing is already on record; a wide race's
        // incumbent weighs it too, so the reasons behind it are kept.
        !(incumbentFiled && !wide && p.id === incumbentId),
    )
    .sort((a, b) => a.id.localeCompare(b.id));
  const facts = new Map<PersonId, RaceFacts>();
  const screenedBar =
    c(api, "candidacyStayOutPull") - c(api, "candidacyScreenMargin");
  let poolWeighed = 0;
  for (const person of weighers) {
    let context: OpenContest = { ...open, runners: running.length };
    if (scope) {
      facts.set(
        person.id,
        raceFactsFor(api, person, scope, members.get(person.id)),
      );
      context = { ...context, facts };
      // Someone whose summed reasons sit far below the bar never chooses to
      // run: weighed, not asked one by one (the incumbent always decides).
      if (
        person.id !== incumbentId &&
        !decisionOf(api, contest.id, person.id)?.run
      ) {
        poolWeighed += 1;
        let sum = api.parameter("zero");
        for (const v of Object.values(
          candidacyReasons(api, person, context, true),
        ))
          sum += v;
        if (sum < screenedBar) continue;
      }
    }
    const decision = decideToRun(api, person.id, context, reconsider);
    if (!decision) continue;
    asked.push(person.id);
    if (decision.run) running.push(person.id);
  }
  const row: WeighedContest = {
    id: contest.id,
    contestId: contest.id,
    date,
    askedIds: asked,
    runIds: running,
    countedWeighed,
    filledInIds,
    filedOn: null,
    ...(wide ? { poolWeighed, poolSize: members.size } : {}),
  };
  api
    .moduleState(CANDIDACY_MODULE_ID)
    .table("weighed")
    .put(row as unknown as { id: string });
  return row;
}

/** The serving holder of the contest's seat, if a person. */
function incumbentOf(api: CoreAPI, contest: ContestRow): PersonId | undefined {
  const term = contest.incumbentTermId
    ? (api
        .moduleState(OFFICES_MODULE_ID)
        .table("terms")
        .get(contest.incumbentTermId) as unknown as TermRow | undefined)
    : undefined;
  return term?.status === "serving" ? (term.personId ?? undefined) : undefined;
}

/**
 * Those who may not run for this contest: someone already running on its
 * election day runs for one seat only, and someone whose own seat is up that
 * day defends it.
 */
function committedFor(api: CoreAPI, contest: ContestRow): Set<PersonId> {
  const committed = committedOn(api, contest.electionDate, contest.id);
  const terms = api.moduleState(OFFICES_MODULE_ID).table("terms");
  for (const other of api
    .moduleState(ELECTIONS_MODULE_ID)
    .table("contests")
    .rows() as unknown as ContestRow[]) {
    if (other.id === contest.id || other.electionDate !== contest.electionDate)
      continue;
    const term = other.incumbentTermId
      ? (terms.get(other.incumbentTermId) as unknown as TermRow | undefined)
      : undefined;
    if (term?.status === "serving" && term.personId)
      committed.add(term.personId);
  }
  return committed;
}

/** The pool's facts about one weigher, with how far their lean sits from the race's electorate. */
function raceFactsFor(
  api: CoreAPI,
  person: Readonly<PersonState>,
  scope: RaceScope,
  member: PoolMember | undefined,
  asked = false,
): RaceFacts {
  return {
    ...poolFactsFor(api, person, scope, member),
    leanGap: Math.abs(leanOf(api, person.id) - scope.lean),
    asked,
  };
}

/** Everyone who decided to run in a contest held on this election day. */
function committedOn(
  api: CoreAPI,
  electionDate: string,
  /** The contest being weighed: its own earlier runners are not committed elsewhere. */
  exceptContestId?: string,
): Set<PersonId> {
  const contests = api.moduleState(ELECTIONS_MODULE_ID).table("contests");
  const out = new Set<PersonId>();
  for (const row of api
    .moduleState(CANDIDACY_MODULE_ID)
    .table("weighed")
    .rows() as unknown as WeighedContest[]) {
    const held = contests.get(row.contestId) as unknown as
      ContestRow | undefined;
    if (
      held?.electionDate === electionDate &&
      row.contestId !== exceptContestId
    )
      for (const id of row.runIds) out.add(id);
  }
  return out;
}

/** Each counted adult's pull to run apart from the seat's own reach, cached for the year. */
const countedBases = new WeakMap<
  object,
  { year: string; rows: { voter: CountedVoter; base: number }[] }
>();

/**
 * The town's counted adults weigh a local seat from their counted records:
 * every reason the record holds, against the same pull of staying out.
 * Returns how many weighed it and those it draws, strongest pull first.
 */
function countedScreen(
  api: CoreAPI,
  open: OpenContest,
  townPlaceId: string,
  minimumAge: number,
): { weighed: number; drawn: PersonId[] } {
  const year = api.state.date.slice(0, 4);
  let held = countedBases.get(api.state);
  if (!held || held.year !== year) {
    held = {
      year,
      rows: countedResidents(api.state as CoreState)
        .filter((voter) => voter.placeId === townPlaceId)
        .map((voter) => {
          const reasons = countedCandidacyReasons(api, voter, open);
          let base = api.parameter("zero");
          // The seat's own reach (a countywide race) only lowers the pull,
          // so the rest bounds it from above.
          for (const [key, value] of Object.entries(reasons))
            if (key !== "reach") base += value;
          return { voter, base };
        })
        .sort(
          (a, b) => b.base - a.base || a.voter.id.localeCompare(b.voter.id),
        ),
    };
    countedBases.set(api.state, held);
  }
  const bar = c(api, "candidacyStayOutPull");
  // Old enough to file: born on or before this day minus the minimum age.
  const today = api.state.date;
  const bornBy = `${Number(today.slice(0, 4)) - minimumAge}${today.slice(4)}`;
  let weighed = api.parameter("zero");
  for (const { voter } of held.rows)
    if (voter.birthDate <= bornBy && !api.state.people.has(voter.id))
      weighed += api.parameter("one");
  const drawn: PersonId[] = [];
  for (const { voter, base } of held.rows) {
    // Sorted by pull: past here no one clears the bar.
    if (base <= bar) break;
    if (voter.birthDate > bornBy || api.state.people.has(voter.id)) continue;
    const reasons = countedCandidacyReasons(api, voter, open);
    let pull = api.parameter("zero");
    for (const value of Object.values(reasons)) pull += value;
    if (pull > bar) drawn.push(voter.id);
  }
  return { weighed, drawn };
}

/**
 * A wide race whose filing closed before the record began has candidates on
 * its ballot already (the holder standing again, a party's nominee put
 * forward at the opening). Each weighs the race now with the same chooser, so
 * the reasons behind every filing are kept; a nominee a party put forward
 * counts as asked.
 */
function recordFiledReasons(
  api: CoreAPI,
  contest: ContestRow,
  row: WeighedContest,
): WeighedContest {
  const scope = raceScope(api, contest);
  const members = new Map(
    standingPool(api, scope).map((member) => [member.personId, member]),
  );
  const incumbent = incumbentOf(api, contest);
  const rules = filingRulesFor(api, contest, "party");
  const open: OpenContest = {
    contestId: contest.id,
    officeName: contest.title,
    filingDeadline: rules.deadline ?? contest.filingDeadline,
    wide: true,
    ...(incumbent ? { incumbentId: incumbent } : {}),
    sourceIds: [contest.id],
  };
  const asked = [...row.askedIds];
  const filings = api.moduleState(ELECTIONS_MODULE_ID).table("filings");
  for (const filing of filings.query("byContest", [
    contest.id,
  ]) as unknown as FilingRow[]) {
    const person = api.state.people.get(filing.personId);
    if (filing.status !== "on-ballot" || !person) continue;
    const nominated =
      filing.how !== undefined && filing.how !== "incumbent stands again";
    const facts = new Map([
      [
        person.id,
        raceFactsFor(api, person, scope, members.get(person.id), nominated),
      ],
    ]);
    // Someone the pool already asked keeps their answer; anyone else on the
    // opening's ballot is asked now.
    const decision =
      decisionOf(api, contest.id, person.id) ??
      decideToRun(api, person.id, { ...open, facts }, false);
    if (!decision) continue;
    if (!asked.includes(person.id)) asked.push(person.id);
    // A runner's decision names the filing that stood on the record.
    if (decision.run)
      table(api).put({
        ...decision,
        filing: { status: "on-ballot", filingId: filing.id, unmet: [] },
      } as unknown as { id: string });
    // The opening's ballot for a race whose filing closed before it is the
    // record (a name stays on the ballot past the deadline): their reasons
    // are kept, and the filing stands.
  }
  return { ...row, askedIds: asked };
}

/**
 * A wide race where a major party's side has no candidate: that party's
 * officers (its chair) ask the strongest in the standing pool on that side,
 * in turn, and each decides with the same chooser, the party's ask one more
 * reason among the rest. The ask and its answer are kept (`recruits`, and
 * the decision's reasons). Returns the weighed row with whoever said yes.
 */
function recruitParties(
  api: CoreAPI,
  contest: ContestRow,
  row: WeighedContest,
  incumbentId: PersonId | undefined,
  incumbentFiled: boolean,
): WeighedContest {
  if (!api.state.modules.has(PARTIES_MODULE_ID)) return row;
  const scope = raceScope(api, contest);
  if (!scope.party) return row;
  const running = new Set<PersonId>(row.runIds);
  if (incumbentFiled && incumbentId) running.add(incumbentId);
  // Whoever is already on the ballot (a filing made before the pool met)
  // counts as a candidate for their side.
  for (const filing of api
    .moduleState(ELECTIONS_MODULE_ID)
    .table("filings")
    .query("byContest", [contest.id]) as unknown as FilingRow[])
    if (filing.status === "on-ballot") running.add(filing.personId);
  const runningSides = new Set([...running].map((id) => sideOf(api, id)));
  for (const filing of api
    .moduleState(ELECTIONS_MODULE_ID)
    .table("filings")
    .query("byContest", [contest.id]) as unknown as FilingRow[])
    if (filing.status === "on-ballot")
      runningSides.add(partySide(filing.party));
  const rules = filingRulesFor(api, contest, "party");
  const committed = committedFor(api, contest);
  const members = new Map(
    standingPool(api, scope).map((member) => [member.personId, member]),
  );
  const town = api
    .moduleState(ELECTIONS_MODULE_ID)
    .table("town")
    .get("town") as unknown as { townPlaceId: string };
  const today = makeIsoDate(api.state.date);
  const incumbent = contest.incumbentTermId
    ? (api
        .moduleState(OFFICES_MODULE_ID)
        .table("terms")
        .get(contest.incumbentTermId) as unknown as TermRow | undefined)
    : undefined;
  const open: OpenContest = {
    contestId: contest.id,
    officeName: contest.title,
    filingDeadline: rules.deadline ?? contest.filingDeadline,
    wide: true,
    ...(incumbent?.status === "serving" && incumbent.personId
      ? { incumbentId: incumbent.personId }
      : {}),
    sourceIds: [contest.id, ...(incumbent ? [incumbent.id] : [])],
  };
  const circle = c(api, "candidacyStandingCircle");
  const recruits = api.moduleState(CANDIDACY_MODULE_ID).table("recruits");
  const recruited: PersonId[] = [];
  const askedNow: PersonId[] = [...row.askedIds];
  for (const party of partiesHere(api)
    .filter((p) => p.side !== 0)
    .sort((a, b) => a.side - b.side)) {
    if (runningSides.has(party.side)) continue;
    // The party's side of the pool: everyone old enough to file under its
    // label who is free to run, strongest standing first.
    const standing = new Map<PersonId, number>();
    const side = [...api.state.people.values()]
      .filter(
        (p) =>
          p.alive &&
          !appointedHolders(api).has(p.id) &&
          !pressConflict(api, p.id) &&
          (p.placeId === town.townPlaceId || members.has(p.id)) &&
          !running.has(p.id) &&
          !committed.has(p.id) &&
          ageOnDate(makeIsoDate(p.birthDate), today) >= rules.minimumAge &&
          !isExplicitlyControlledPersonV1(api.state, p.id) &&
          sideOf(api, p.id) === party.side &&
          !checkEligibility(api, p.id, contest.id, partyOf(api, p.id)).some(
            (check) =>
              !check.met &&
              check.rule !== "filing-deadline" &&
              check.rule !== "already-filed",
          ),
      )
      .map((p) => {
        const facts = raceFactsFor(api, p, scope, members.get(p.id));
        standing.set(p.id, Math.max(facts.standing, p.knownIds.size / circle));
        return p;
      })
      .sort(
        (a, b) =>
          standing.get(b.id)! - standing.get(a.id)! || a.id.localeCompare(b.id),
      )
      .slice(0, c(api, "candidacyRecruitAsks"));
    const askedIds: PersonId[] = [];
    let accepted: PersonId | null = null;
    for (const person of side) {
      askedIds.push(person.id);
      const facts = new Map([
        [
          person.id,
          raceFactsFor(api, person, scope, members.get(person.id), true),
        ],
      ]);
      const decision = decideToRun(
        api,
        person.id,
        { ...open, facts, runners: running.size },
        true,
      );
      if (!askedNow.includes(person.id)) askedNow.push(person.id);
      if (decision?.run) {
        accepted = person.id;
        break;
      }
    }
    // No one asked agreed: the party's committee fills its ballot vacancy,
    // as state election codes let it (e.g. 10 ILCS 5/7-61), naming the one
    // asked whose own reasons came nearest to running.
    if (!accepted) {
      const nearest = askedIds
        .map((id) => table(api).get(`${contest.id}:${id}`))
        .map((row) => row as unknown as CandidacyDecision | undefined)
        .filter((row): row is CandidacyDecision => !!row)
        .map((row) => ({ row, gap: runGap(row) }))
        .sort(
          (a, b) =>
            b.gap - a.gap || a.row.personId.localeCompare(b.row.personId),
        )[0];
      if (nearest) {
        table(api).put({
          ...nearest.row,
          run: true,
          reasons: {
            ...nearest.row.reasons,
            committee: c(api, "candidacyCommitteeNamed"),
          },
          sourceIds: [...nearest.row.sourceIds, party.id],
        } as unknown as ModuleRow);
        accepted = nearest.row.personId;
      }
    }
    recruits.put({
      id: `${contest.id}:${party.id}`,
      contestId: contest.id,
      partyId: party.id,
      askedBy: party.leaderId,
      askedIds,
      acceptedId: accepted,
      date: api.state.date,
      sourceIds: [
        contest.id,
        party.id,
        ...(party.leaderId ? [party.leaderId] : []),
      ],
    } as unknown as { id: string });
    if (accepted) {
      running.add(accepted);
      recruited.push(accepted);
    }
  }
  if (!recruited.length && askedNow.length === row.askedIds.length) return row;
  const next: WeighedContest = {
    ...row,
    askedIds: askedNow,
    runIds: [...row.runIds, ...recruited],
    recruitedIds: [...(row.recruitedIds ?? []), ...recruited],
  };
  api
    .moduleState(CANDIDACY_MODULE_ID)
    .table("weighed")
    .put(next as unknown as { id: string });
  return next;
}

/**
 * Filing opens: the town's adults who stayed out weigh the seat again from
 * what has happened since they first did (a cause taken up, the incumbent's
 * votes), then each runner files with the place's filing office.
 */
export function fileRunners(
  api: CoreAPI,
  contest: ContestRow,
  localRank: number = LOCAL_RANK,
): void {
  const weighed = api.moduleState(CANDIDACY_MODULE_ID).table("weighed");
  const first = weighed.get(contest.id) as unknown as
    WeighedContest | undefined;
  if (!first || first.filedOn !== null) return;
  const weighedAgain =
    first.date < api.state.date
      ? weighContest(api, contest, localRank, false, true)
      : first;
  const row =
    FAMILY_RANK[contest.family] > localRank
      ? recruitParties(
          api,
          contest,
          weighedAgain,
          incumbentOf(api, contest),
          false,
        )
      : weighedAgain;
  const partisan = Boolean(seatParty(api, contest));
  for (const personId of row.runIds) {
    const decision = decisionOf(api, contest.id, personId);
    const person = api.state.people.get(personId);
    if (!decision || !person) continue;
    const filing: NonNullable<CandidacyDecision["filing"]> = person.alive
      ? fileFor(api, person, contest, partisan)
      : { status: "refused", filingId: null, unmet: ["not-available"] };
    table(api).put({ ...decision, filing } as unknown as { id: string });
  }
  weighed.put({ ...row, filedOn: api.state.date } as unknown as {
    id: string;
  });
}

/**
 * A race whose filing closed before the record began: the town's adults
 * weighed it then, and each runner's filing is part of the opening record
 * (dated at the deadline), beside the
 * incumbent's.
 */
function weighClosedContest(
  api: CoreAPI,
  contest: ContestRow,
  localRank: number,
): void {
  const weighed = weighContest(api, contest, localRank, true);
  const row =
    FAMILY_RANK[contest.family] > localRank
      ? recruitParties(
          api,
          contest,
          recordFiledReasons(api, contest, weighed),
          incumbentOf(api, contest),
          true,
        )
      : weighed;
  const filings = api.moduleState(ELECTIONS_MODULE_ID).table("filings");
  for (const personId of row.runIds) {
    const decision = decisionOf(api, contest.id, personId);
    if (!decision) continue;
    const party = seatParty(api, contest) ? partyOf(api, personId) : null;
    const rules = filingRulesFor(api, contest, party ? "party" : "independent");
    const filing: FilingRow = {
      id: `filing:${contest.id}:${personId}`,
      contestId: contest.id,
      personId,
      filedOn: contest.filingDeadline,
      filedWith: rules.filedWith,
      platform: platformFromViews(api, personId),
      party,
      status: "on-ballot",
    };
    filings.put(filing as unknown as ModuleRow);
    table(api).put({
      ...decision,
      filing: { status: "on-ballot", filingId: filing.id, unmet: [] },
    } as unknown as { id: string });
  }
  api
    .moduleState(CANDIDACY_MODULE_ID)
    .table("weighed")
    .put({ ...row, filedOn: contest.filingDeadline } as unknown as {
      id: string;
    });
}

/** Each day: weigh the contests whose weighing day has come, then file for those whose window opened. */
function candidacyDay(api: CoreAPI): void {
  const held = queuesFor(api);
  if (!held) return;
  const today = api.state.date;
  while (held.opening.length)
    weighClosedContest(api, held.opening.shift()!, held.localRank);
  while (held.weigh[0] && weighingDate(api, held.weigh[0]) <= today) {
    const contest = held.weigh.shift()!;
    if (contest.filingDeadline >= today)
      weighContest(api, contest, held.localRank);
  }
  while (held.file[0] && held.file[0].opens <= today) {
    const { contest } = held.file.shift()!;
    if (contest.filingDeadline >= today)
      fileRunners(api, contest, held.localRank);
  }
}

export const candidacyModule: CoreModule = {
  id: CANDIDACY_MODULE_ID,
  state: {
    schemaVersion: 1,
    tables: {
      decisions: {
        indexes: { byContestRun: { fields: ["contestId", "run"] } },
      },
      weighed: {},
      /** A party's officers asking the strongest of its side to fill a seat it has no candidate for. */
      recruits: {},
      /** An appointer's choice of who fills a vacancy, with the reasons. */
      appointments: {},
    },
  },
  onDay: (api) => {
    candidacyDay(api);
  },
  reasonProviders: {
    "candidacy-circumstances": (api, actor, offer, binding) => {
      const contest = pending.get(api.state);
      if (!contest || contest.contestId !== offer.targetId) return undefined;
      return {
        value:
          binding.arguments?.running === "true"
            ? Object.values(candidacyReasons(api, actor, contest)).reduce(
                (sum, value) => sum + value,
                api.parameter("zero"),
              )
            : c(api, "candidacyStayOutPull"),
        sourceIds: [...contest.sourceIds, actor.id],
      };
    },
  },
};
