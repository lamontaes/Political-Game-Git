import {
  standingPool,
  partyOf,
  seatParty,
  raceScope,
  poolFactsFor,
  appointedHolders,
  type PoolFacts,
  type RaceScope,
} from "../candidate-pool";
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
 * adult who lives in town weighs it; an officeholder also weighs the seat
 * any level in the jurisdiction. Whoever decides to run files with the place's filing office,
 * on a platform from their own views.
 */
import { votesOf } from "./record";
import { leanOf } from "./legislature";
import { viewOn } from "./views";
import { ageOnDate } from "../kernel/dates";
import { scoreOffers, decisionFromScores } from "../choice";
import rows from "../data/candidacy/parameters.json" with { type: "json" };
import type { Parameter } from "../parameters";
import type { ModuleRow } from "../module-data";
import type {
  ActionDefinition,
  ActOffer,
  CoreAPI,
  CoreEventInput,
  CoreModule,
  CoreState,
  PersonId,
  PersonState,
} from "../types";
import { decisionKinds, leanedYes } from "../trait-decisions";
import { closenessBetween } from "../closeness";
import { candidatePlatform } from "../campaign-stances";
import { contestPositions } from "../contest-positions";
import { isExplicitlyControlledPersonV1 } from "../player-control-state-v1";
import type { OfficeInput } from "../offices-local";
import {
  ELECTIONS_MODULE_ID,
  fileCandidacy,
  filingRulesFor,
  checkEligibility,
  officeFamily,
  type ContestRow,
  type FilingRow,
  type OfficeFamily,
} from "./elections";
import { OFFICES_MODULE_ID, type TermRow } from "./offices";
import {
  PARTIES_MODULE_ID,
  partiesHere,
  partyTie,
  type PartyRow,
  type TieRow,
} from "./parties";
import { countedEngagement, viewOf } from "./views";
import { DEFAULT_DRIVES_DATA } from "./drives";
import { residentFacts } from "./residents";
import { countedResidents, type CountedVoter } from "../electorate";
import { revolvingDoorFor } from "../law-reach/group-a-voting";
import { fillInPerson } from "../state";
import { campaignParameter } from "../campaign-views";

export const CANDIDACY_MODULE_ID = "candidacy";
export const CANDIDACY_PARAMETERS = rows as Readonly<Record<string, Parameter>>;
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
  poolFacts?: ReadonlyMap<PersonId, PoolFacts>;
  wideScope?: RaceScope;
  /** The party asked them to run for it: the ask's record and the chair who made it. */
  askedBy?: { readonly recordId: string; readonly chairId: PersonId };
  sourceIds: readonly string[];
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

function c(api: CoreAPI, key: string): number {
  const row = CANDIDACY_PARAMETERS[key];
  if (!row) return api.parameter(key);
  if (row.stopgapId) api.stopgap(row.stopgapId);
  return row.value;
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
}

/** Each recorded reason for running, as a signed pull. */
export function candidacyReasons(
  api: CoreAPI,
  person: Readonly<PersonState>,
  contest: OpenContest,
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
  if (contest.incumbentId && contest.incumbentId !== person.id)
    incumbentTie = Math.min(
      one,
      closenessBetween(api.state, person.id, contest.incumbentId),
    );
  const recordGap = recordGapOf(api, person, contest);
  const reasons = reasonsFrom(
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
      recordGap,
    },
    contest,
  );
  // Being asked by the party draws a person to run, the more so the closer
  // they are to the chair who asked.
  if (contest.askedBy)
    reasons.partyAsked =
      c(api, "candidacyPartyAskPull") *
      (one + closenessBetween(api.state, person.id, contest.askedBy.chairId));
  const pool = contest.poolFacts?.get(person.id);
  if (
    !api.state.modules.has(ELECTIONS_MODULE_ID) ||
    !api.state.modules.has(OFFICES_MODULE_ID)
  )
    return withPoolReasons(api, reasons, pool);
  // Changing office costs the authority and unfinished term already held.
  const race = api
    .moduleState(ELECTIONS_MODULE_ID)
    .table("contests")
    .get(contest.contestId) as unknown as ContestRow | undefined;
  const offices = api.moduleState(OFFICES_MODULE_ID).table("offices");
  const held = (
    api
      .moduleState(OFFICES_MODULE_ID)
      .table("terms")
      .query("byPerson", [person.id]) as unknown as TermRow[]
  ).filter((term) => term.status === "serving");
  const currentRank = held.reduce((highest, term) => {
    const office = offices.get(term.officeId) as unknown as
      OfficeInput | undefined;
    return office
      ? Math.max(highest, FAMILY_RANK[officeFamily(office)])
      : highest;
  }, -1);
  reasons.officeOpportunity =
    race && currentRank >= 0 && contest.incumbentId !== person.id
      ? -c(api, "candidacyOfficeOpportunityWeight") *
        Math.max(one, currentRank - FAMILY_RANK[race.family] + one)
      : zero;
  return withPoolReasons(api, reasons, pool);
}

/**
 * How far the incumbent's recorded votes go against what a person thinks,
 * 0 to 1: each vote on the record, by how strongly their current view on its
 * question opposes it. A resident still in the counts reads their view by the
 * same rule, from their counted record's lean.
 */
function recordGapOf(
  api: CoreAPI,
  person: Readonly<Pick<PersonState, "id" | "traits">>,
  contest: OpenContest,
  counted = false,
): number {
  const zero = api.parameter("zero");
  if (!contest.incumbentId || contest.incumbentId === person.id) return zero;
  const votes = votesOf(api, contest.incumbentId);
  if (!votes.length) return zero;
  const lean = leanOf(api, person.id, counted ? person : undefined);
  return Math.min(
    api.parameter("one"),
    votes.reduce(
      (sum, vote) =>
        sum +
        Math.max(
          zero,
          -viewOn(api, person.id, vote.stance.question, lean) *
            Math.sign(vote.stance.position),
        ),
      zero,
    ) / votes.length,
  );
}

/**
 * How many people know a resident still in the counts: those the opening's
 * acquaintance rule gives everyone, filled in or not (deep-past.ts, the same
 * rule that builds their circle when they are filled in): a school peer
 * group, and a workgroup at their employer where they work.
 */
function countedKnown(api: CoreAPI, voter: CountedVoter): number {
  const one = api.parameter("one");
  const school = api.parameter("openingPeerGroupSize") - one;
  const work =
    voter.weeklyMinutes > api.parameter("zero")
      ? api.parameter("openingCoworkerGroupSize") - one
      : api.parameter("zero");
  return school + work;
}

function withPoolReasons(
  api: CoreAPI,
  reasons: Record<string, number>,
  pool?: PoolFacts,
): Record<string, number> {
  const zero = api.parameter("zero");
  if (pool) {
    reasons.standing = Math.max(
      reasons.standing ?? zero,
      c(api, "candidacyStandingWeight") * pool.standing,
    );
    reasons.ambition = c(api, "candidacyAmbitionWeight") * pool.ambition;
    reasons.backing = c(api, "candidacyBackingWeight") * pool.backing;
    reasons.means = c(api, "candidacyMeansWeight") * pool.means;
    reasons.wideCampaign = -c(api, "candidacyStatewideWeight");
  }
  return reasons;
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
  const record = residentFacts(api.state as CoreState, voter.id);
  const reasons = reasonsFrom(
    api,
    {
      id: voter.id,
      birthDate: voter.birthDate,
      traits: voter.traits,
      workHoursDaily:
        voter.weeklyMinutes /
        api.parameter("minutesPerHour") /
        c(api, "candidacyWorkDaysPerWeek"),
      known: countedKnown(api, voter),
      engagement: countedEngagement(api, voter, record),
      cause: zero,
      incumbentTie: zero,
      recordGap: recordGapOf(api, voter, contest, true),
    },
    contest,
  );
  return withPoolReasons(
    api,
    reasons,
    contest.wideScope && record
      ? poolFactsFor(api, record, contest.wideScope)
      : undefined,
  );
}

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
  const age = ageOnDate(person.birthDate, api.state.date);
  const distance =
    (age - c(api, "candidacyAgeCenter")) / c(api, "candidacyAgeSpread");
  // Standing in town: how many people know them, against the circle a local
  // campaign starts from.
  const standing = Math.min(
    one,
    person.known / c(api, "candidacyStandingCircle"),
  );
  return {
    engagement: c(api, "candidacyEngagementWeight") * person.engagement,
    cause: c(api, "candidacyCauseWeight") * person.cause,
    time: -c(api, "candidacyTimeWeight") * Math.min(one, hours),
    incumbentTie: -c(api, "candidacyIncumbentTieWeight") * person.incumbentTie,
    // A seat no one holds draws people in; an incumbent whose record goes
    // against one's views draws a challenge.
    openSeat: contest.incumbentId ? zero : c(api, "candidacyOpenSeatWeight"),
    recordGap: c(api, "candidacyRecordGapWeight") * person.recordGap,
    standing: c(api, "candidacyStandingWeight") * standing,
    // A crowded race: each person already running lowers the pull.
    field: -c(api, "candidacyFieldWeight") * (contest.runners ?? zero),
    age:
      c(api, "candidacyAgeWeight") *
      (two * Math.exp(-distance * distance) - one),
    // A countywide race: more ground and more voters to reach than a town seat.
    reach: contest.countywide ? -c(api, "candidacyCountywideWeight") : zero,
    // A revolving-door law in force: a legislative seat is worth less to a
    // newcomer who could not lobby for a time after leaving it.
    afterOffice:
      contest.incumbentId !== person.id &&
      revolvingDoorFor(api, contest.contestId)
        ? -c(api, "candidacyRevolvingDoorWeight")
        : zero,
  };
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
  if (held && (held.run || !reconsider)) return held;
  // A serving incumbent's choice is whether to stand again: their age and
  // temperament, the one rule for it (voting.stand-again, calibrated so about
  // four in five stand), not a newcomer's case for entering the race.
  if (contest.incumbentId === personId) {
    const row: CandidacyDecision = {
      id,
      personId,
      contestId: contest.contestId,
      date: api.state.date,
      run: standsAgain(api, person),
      reasons: { standAgain: standAgainReason(api, person) },
      scores: [],
      sourceIds: [...contest.sourceIds, person.id, person.householdId],
    };
    table(api).put(row as unknown as { id: string });
    return row;
  }
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
    sourceIds: [
      ...contest.sourceIds,
      person.id,
      person.householdId,
      ...(api.state.modules.has(OFFICES_MODULE_ID)
        ? (
            api
              .moduleState(OFFICES_MODULE_ID)
              .table("terms")
              .query("byPerson", [person.id]) as unknown as TermRow[]
          )
            .filter((term) => term.status === "serving")
            .map((term) => term.id)
        : []),
      ...(contest.poolFacts?.get(person.id)?.sourceIds ?? []),
    ],
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

/**
 * A filing keeps the same recorded positions and strengths its campaign reads,
 * on the questions the contest's seat takes up (`contestPositions`).
 */
export function platformFromViews(
  api: CoreAPI,
  personId: PersonId,
  party: string | null,
  positions: readonly string[],
): string[] {
  return candidatePlatform(
    api,
    personId,
    party,
    positions,
    c(api, "candidacyPlatformQuestions"),
  ).map(({ question, position }) => `${question}=${position}`);
}

/** File for a runner: no fee; the filing's petition circulates until the clerk's check. */
function fileFor(
  api: CoreAPI,
  person: Readonly<PersonState>,
  contest: ContestRow,
  partisan: boolean,
): NonNullable<CandidacyDecision["filing"]> {
  let party: string | null = partisan ? partyOf(api, person.id) : null;
  if (partisan && api.state.modules.has(PARTIES_MODULE_ID)) {
    const tie = partyTie(api, person.id);
    party =
      partiesHere(api).find((row) => row.id === tie?.partyId)?.name ?? party;
  }
  const result = fileCandidacy(api, {
    personId: person.id,
    contestId: contest.id,
    platform: platformFromViews(
      api,
      person.id,
      party,
      contestPositions(api, contest),
    ),
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
 * The town's adults weigh a contest: every named adult who lives in town
 * weighs a local seat (where the town has no city or county seats, its most
 * local ones); officeholders weigh races across their jurisdiction;
 * the incumbent weighs keeping theirs. Each decision is kept.
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
  // Whoever serves the seat today, so a member seated by a special election
  // after the contest was recorded is its incumbent; else the term the
  // contest names.
  const termTable = api.moduleState(OFFICES_MODULE_ID).table("terms");
  const incumbent =
    (
      termTable.query("bySeatStatus", [
        contest.seatId,
        "serving",
      ]) as unknown as TermRow[]
    )[0] ??
    (contest.incumbentTermId
      ? (termTable.get(contest.incumbentTermId) as unknown as
          TermRow | undefined)
      : undefined);
  const incumbentId =
    incumbent?.status === "serving"
      ? (incumbent.personId ?? undefined)
      : undefined;
  const rank = FAMILY_RANK[contest.family];
  const wide = contest.level === "state" || contest.level === "federal";
  const scope = wide ? raceScope(api, contest) : null;
  if (wide) {
    // stopgapId: SG-GOV-wide-resident-pool
    api.stopgap("SG-GOV-wide-resident-pool");
  }
  const pool = new Map(
    scope
      ? standingPool(api, scope).map(
          (member) => [member.personId, member] as const,
        )
      : [],
  );
  const appointed = wide ? appointedHolders(api) : new Set<string>();
  const facts = new Map<PersonId, PoolFacts>();
  const rules = filingRulesFor(api, contest, "party");
  const date = api.state.date;
  const asked: PersonId[] = [];
  const running: PersonId[] = [];
  const open: OpenContest = {
    contestId: contest.id,
    officeName: contest.title,
    filingDeadline: rules.deadline ?? contest.filingDeadline,
    ...(contest.family === "countyOffice" ? { countywide: true } : {}),
    ...(incumbentId ? { incumbentId } : {}),
    ...(scope ? { poolFacts: facts, wideScope: scope } : {}),
    sourceIds: [contest.id, ...(incumbent ? [incumbent.id] : [])],
  };
  // Someone already running on this election day runs for one seat only,
  // and someone whose own seat is up that day defends it.
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
  const weighs = (p: PersonState) =>
    p.alive &&
    (p.placeId === town.townPlaceId || pool.has(p.id)) &&
    !appointed.has(p.id) &&
    ageOnDate(p.birthDate, date) >= rules.minimumAge &&
    !isExplicitlyControlledPersonV1(api.state, p.id) &&
    !committed.has(p.id) &&
    !(incumbentFiled && p.id === incumbentId) &&
    (!wide ||
      !checkEligibility(api, p.id, contest.id, null).some(
        (check) => check.rule === "residency" && !check.met,
      ));
  // The incumbent weighs standing again first: one who stands down leaves
  // the seat open, and everyone else weighs it as an open seat, citing the
  // decision that opened it.
  const holder = incumbentId ? api.state.people.get(incumbentId) : undefined;
  let field = open;
  if (holder && weighs(holder)) {
    const decision = decideToRun(
      api,
      holder.id,
      { ...open, runners: 0 },
      reconsider,
    );
    if (decision) {
      asked.push(holder.id);
      if (decision.run) running.push(holder.id);
      else field = openSeatOf(open, decision.id);
    }
  }
  // A local seat: the town's counted adults weigh it from their counted
  // records; those it draws are filled in and decide in full like anyone.
  let countedWeighed = 0;
  const filledInIds: PersonId[] = [];
  if (rank <= localRank || wide) {
    const screen = countedScreen(
      api,
      field,
      town.townPlaceId,
      rules.minimumAge,
    );
    countedWeighed = screen.weighed;
    for (const id of screen.drawn) {
      if (committed.has(id)) continue;
      fillInPerson(api.state as CoreState, id);
      filledInIds.push(id);
    }
  }
  const people = [...api.state.people.values()]
    .filter((p) => !asked.includes(p.id) && weighs(p))
    .sort((a, b) => a.id.localeCompare(b.id));
  for (const person of people) {
    if (scope)
      facts.set(
        person.id,
        poolFactsFor(api, person, scope, pool.get(person.id)),
      );
    const decision = decideToRun(
      api,
      person.id,
      { ...field, runners: running.length },
      reconsider,
    );
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
  };
  api
    .moduleState(CANDIDACY_MODULE_ID)
    .table("weighed")
    .put(row as unknown as { id: string });
  return row;
}

/** The seat as the rest of the town weighs it once its incumbent stands down. */
function openSeatOf(open: OpenContest, stoodDown: string): OpenContest {
  const seat: OpenContest = {
    ...open,
    sourceIds: [...open.sourceIds, stoodDown],
  };
  delete seat.incumbentId;
  return seat;
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

/** Each counted adult's pull to run apart from the seat itself, cached for the year. */
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
          // The pull apart from the seat: an open town seat with no one
          // running yet, which bounds every seat's pull from above but for
          // the incumbent's record, which only a seat with one can add.
          const reasons = countedCandidacyReasons(api, voter, {
            contestId: open.contestId,
            officeName: open.officeName,
            filingDeadline: open.filingDeadline,
            sourceIds: open.sourceIds,
          });
          // A seat's own law (a revolving-door law) only lowers the pull,
          // so it is left out of the bound.
          let base = -(reasons.afterOffice ?? api.parameter("zero"));
          for (const value of Object.values(reasons)) base += value;
          return { voter, base };
        })
        .sort(
          (a, b) => b.base - a.base || a.voter.id.localeCompare(b.voter.id),
        ),
    };
    countedBases.set(api.state, held);
  }
  const bar = c(api, "candidacyStayOutPull");
  // The most an incumbent's record can add to the cached pull.
  const record = open.incumbentId
    ? c(api, "candidacyRecordGapWeight")
    : api.parameter("zero");
  // Old enough to file: born on or before this day minus the minimum age.
  const today = api.state.date;
  const bornBy = `${Number(today.slice(0, 4)) - minimumAge}${today.slice(4)}`;
  let weighed = api.parameter("zero");
  // The year's pulls are kept, but only those still in the town's counts
  // today weigh the seat: someone who has died, moved or been filled in since
  // is not drawn from them.
  const counted = new Set(
    countedResidents(api.state as CoreState).map((voter) => voter.id),
  );
  const here = (voter: CountedVoter) =>
    voter.birthDate <= bornBy &&
    counted.has(voter.id) &&
    !api.state.people.has(voter.id);
  for (const { voter } of held.rows) if (here(voter)) weighed += voter.weight;
  const drawn: PersonId[] = [];
  for (const { voter, base } of held.rows) {
    // Sorted by pull: past here no one clears the bar.
    if (!open.wideScope && base + record <= bar) break;
    if (!here(voter)) continue;
    const reasons = countedCandidacyReasons(api, voter, open);
    let pull = api.parameter("zero");
    for (const value of Object.values(reasons)) pull += value;
    if (pull > bar) drawn.push(voter.id);
  }
  return { weighed, drawn };
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
  const row =
    first.date < api.state.date
      ? weighContest(api, contest, localRank, false, true)
      : first;
  for (const personId of row.runIds) {
    const decision = decisionOf(api, contest.id, personId);
    const person = api.state.people.get(personId);
    if (!decision || !person) continue;
    const filing: NonNullable<CandidacyDecision["filing"]> = person.alive
      ? fileFor(api, person, contest, Boolean(seatParty(api, contest)))
      : { status: "refused", filingId: null, unmet: ["not-available"] };
    table(api).put({ ...decision, filing } as unknown as { id: string });
  }
  // A runner the filing day's weighing no longer holds (gone from the town,
  // dead) is refused for the rules they no longer meet, so every decision to
  // run ends with a filing or a refusal.
  for (const decision of candidatesFor(api, contest.id)) {
    if (decision.filing || row.runIds.includes(decision.personId)) continue;
    const person = api.state.people.get(decision.personId);
    const unmet = person?.alive
      ? checkEligibility(api, decision.personId, contest.id, null)
          .filter((check) => !check.met)
          .map((check) => check.rule)
      : [];
    table(api).put({
      ...decision,
      filing: {
        status: "refused",
        filingId: null,
        unmet: unmet.length ? unmet : ["not-available"],
      },
    } as unknown as { id: string });
  }
  weighed.put({ ...row, filedOn: api.state.date } as unknown as {
    id: string;
  });
  askForCandidates(api, contest);
}

/** The kind of a party's ask that someone run for a seat. */
export const PARTY_ASKED_EVENT = "party-asked";
/** The replies in an ask's scene that mean yes. */
const AGREEING_MOVES: ReadonlySet<string> = new Set(["agree", "relent"]);

/**
 * A party with no one filed for a partisan seat looks for someone to run
 * (owner, Oct 14 and Oct 25: the Pendergast approach). The day filing opens,
 * once the town's runners have filed, its chair asks the party's own members
 * in town who could hold the seat (those who file under its label, by the
 * filing's own membership rule): those the chair is closest to first, then
 * those the most people know (the party's read of who can carry it). Each ask
 * is a record for the member and the chair. The member weighs running again with the ask as a reason; the
 * first who decides to run files, and the party asks no one else. A member
 * whose choices are the player's answers in the scene the ask stages.
 */
/** Members asked today, so a chair asks one member to run for one seat a day. */
const askedOn = new WeakMap<object, { date: string; ids: Set<string> }>();
function askedToday(api: CoreAPI): Set<string> {
  const held = askedOn.get(api.state);
  if (held?.date === api.state.date) return held.ids;
  const today = { date: api.state.date, ids: new Set<string>() };
  askedOn.set(api.state, today);
  return today.ids;
}

/**
 * A seat's open asks: each party in town with no one filed under its label
 * for a partisan seat, its chair, and the members it would ask in turn (none
 * already asked today for another seat).
 */
export function partyProspects(
  api: CoreAPI,
  contest: ContestRow,
): {
  readonly party: PartyRow;
  readonly chairId: PersonId;
  readonly members: readonly PersonState[];
}[] {
  if (!api.state.modules.has(PARTIES_MODULE_ID) || !seatParty(api, contest))
    return [];
  const date = api.state.date;
  const town = api
    .moduleState(ELECTIONS_MODULE_ID)
    .table("town")
    .get("town") as unknown as { townPlaceId: string };
  const filings = api
    .moduleState(ELECTIONS_MODULE_ID)
    .table("filings")
    .query("byContest", [contest.id]) as unknown as FilingRow[];
  const committed = committedOn(api, contest.electionDate, contest.id);
  const ties = api.moduleState(PARTIES_MODULE_ID).table("ties");
  const rules = filingRulesFor(api, contest, "party");
  const asked = askedToday(api);
  const out: {
    party: PartyRow;
    chairId: PersonId;
    members: PersonState[];
  }[] = [];
  for (const party of partiesHere(api)) {
    const chairId = party.leaderId as PersonId | null;
    if (!chairId || !api.state.people.has(chairId)) continue;
    const named = party.name.toLowerCase();
    if (filings.some((row) => row.party?.toLowerCase() === named)) continue;
    const members = (ties.query("byParty", [party.id]) as unknown as TieRow[])
      .filter((tie) => tie.tie === "party")
      .map((tie) => api.state.people.get(tie.personId as PersonId))
      .filter(
        (person): person is PersonState =>
          !!person?.alive &&
          person.id !== chairId &&
          person.placeId === town.townPlaceId &&
          !asked.has(person.id) &&
          ageOnDate(person.birthDate, date) >= rules.minimumAge &&
          !committed.has(person.id) &&
          !filings.some((row) => row.personId === person.id) &&
          !checkEligibility(api, person.id, contest.id, party.name).some(
            (check) => !check.met,
          ),
      )
      // Inroads first, then standing (owner, Oct 15: "The party asks someone
      // to run only with some inroads on record"; Oct 14: a high-standing
      // member may be propositioned).
      .map((person) => ({
        person,
        closeness: closenessBetween(api.state, person.id, chairId),
      }))
      .sort(
        (a, b) =>
          b.closeness - a.closeness ||
          b.person.knownIds.size - a.person.knownIds.size ||
          a.person.id.localeCompare(b.person.id),
      )
      .map((row) => row.person)
      .slice(0, c(api, "candidacyPartyAskTries"));
    out.push({ party, chairId, members });
  }
  return out;
}

function askForCandidates(api: CoreAPI, contest: ContestRow): void {
  const date = api.state.date;
  const town = api
    .moduleState(ELECTIONS_MODULE_ID)
    .table("town")
    .get("town") as unknown as { townPlaceId: string };
  const rules = filingRulesFor(api, contest, "party");
  const incumbent = (
    api
      .moduleState(OFFICES_MODULE_ID)
      .table("terms")
      .query("bySeatStatus", [
        contest.seatId,
        "serving",
      ]) as unknown as TermRow[]
  )[0];
  // An incumbent who decided to stand down leaves the seat open: a party asks
  // its members to run for an open seat, citing that decision, as everyone
  // else weighs it.
  const incumbentDecision = incumbent?.personId
    ? decisionOf(api, contest.id, incumbent.personId as PersonId)
    : undefined;
  const standDown =
    incumbentDecision &&
    incumbentDecision.reasons.standAgain !== undefined &&
    !incumbentDecision.run
      ? incumbentDecision
      : undefined;
  for (const { party, chairId, members } of partyProspects(api, contest)) {
    for (const person of members) {
      const recordId = `${PARTY_ASKED_EVENT}:${contest.id}:${party.id}:${person.id}`;
      if (api.state.eventIds.has(recordId)) continue;
      askedToday(api).add(person.id);
      api.emit({
        id: recordId,
        date,
        kind: PARTY_ASKED_EVENT,
        personIds: [person.id, chairId],
        placeId: town.townPlaceId,
        source: {
          tag: "SOURCED",
          citation: `The ${party.name} party's chair asks a member to run for ${contest.title}`,
          asOf: date,
        },
        facts: {
          askedId: person.id,
          chairId,
          partyId: party.id,
          party: party.name,
          contestId: contest.id,
          office: contest.title,
          filingDeadline: rules.deadline ?? contest.filingDeadline,
        },
      });
      // The player answers in the scene the ask stages, and the party waits
      // on that answer.
      if (isExplicitlyControlledPersonV1(api.state, person.id)) {
        // stopgapId: SG-P15-party-ask-after-player
        api.stopgap("SG-P15-party-ask-after-player");
        break;
      }
      const decision = decideToRun(
        api,
        person.id,
        {
          contestId: contest.id,
          officeName: contest.title,
          filingDeadline: rules.deadline ?? contest.filingDeadline,
          ...(incumbent?.personId && !standDown
            ? { incumbentId: incumbent.personId as PersonId }
            : {}),
          askedBy: { recordId, chairId },
          sourceIds: [
            contest.id,
            recordId,
            ...(standDown ? [standDown.id] : []),
          ],
        },
        true,
      );
      if (!decision?.run) continue;
      const filing = fileFor(api, person, contest, true);
      table(api).put({ ...decision, filing } as unknown as { id: string });
      if (filing.status !== "refused") break;
    }
  }
}

/**
 * The answer to a party's ask, said in its scene: a yes is the decision to
 * run, recorded with the ask and the reply as its reasons, and the filing
 * follows with the office the place's rules name. Any other reply leaves the
 * seat to the party's next ask.
 */
function answerPartyAsk(api: CoreAPI, event: Readonly<CoreEventInput>): void {
  const facts = event.facts ?? {};
  const ask = api.state.durableLog.get(String(facts.causeId ?? ""));
  if (
    ask?.kind !== PARTY_ASKED_EVENT ||
    !AGREEING_MOVES.has(String(facts.move))
  )
    return;
  const personId = ask.facts?.askedId as PersonId | undefined;
  const contest = api
    .moduleState(ELECTIONS_MODULE_ID)
    .table("contests")
    .get(String(ask.facts?.contestId ?? "")) as unknown as
    ContestRow | undefined;
  const person = personId ? api.state.people.get(personId) : undefined;
  if (!contest || !person?.alive || !event.personIds.includes(person.id))
    return;
  if (decisionOf(api, contest.id, person.id)?.filing?.filingId) return;
  const row: CandidacyDecision = {
    id: `${contest.id}:${person.id}`,
    personId: person.id,
    contestId: contest.id,
    date: api.state.date,
    run: true,
    reasons: { partyAsked: c(api, "candidacyPartyAskPull") },
    scores: [],
    sourceIds: [contest.id, ask.id, event.id],
  };
  table(api).put({
    ...row,
    filing: fileFor(api, person, contest, true),
  } as unknown as { id: string });
}

/**
 * A race whose filing closed before the record began: the town's adults
 * weighed it then, and each runner's filing is part of the opening record
 * (dated at the deadline), beside the incumbent's. Its petition was checked
 * before the record began, so the filing stands on the ballot.
 */
function weighClosedContest(
  api: CoreAPI,
  contest: ContestRow,
  localRank: number,
): void {
  const row = weighContest(
    api,
    contest,
    localRank,
    contest.level !== "state" && contest.level !== "federal",
  );
  const filings = api.moduleState(ELECTIONS_MODULE_ID).table("filings");
  const positions = contestPositions(api, contest);
  for (const personId of row.runIds) {
    const decision = decisionOf(api, contest.id, personId);
    if (!decision) continue;
    let party: string | null = seatParty(api, contest)
      ? partyOf(api, personId)
      : null;
    if (seatParty(api, contest) && api.state.modules.has(PARTIES_MODULE_ID)) {
      const tie = partyTie(api, personId);
      party =
        partiesHere(api).find((p) => p.id === tie?.partyId)?.name ?? party;
    }
    const rules = filingRulesFor(api, contest, party ? "party" : "independent");
    const filing: FilingRow = {
      id: `filing:${contest.id}:${personId}`,
      contestId: contest.id,
      personId,
      filedOn: contest.filingDeadline,
      filedWith: rules.filedWith,
      platform: platformFromViews(api, personId, party, positions),
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

/**
 * Whether a serving incumbent stands again: the base reason, less what their
 * age takes from it, and their calibrated trait lean toward standing over
 * retiring (voting.stand-again).
 */
export function standsAgain(
  api: CoreAPI,
  incumbent: Readonly<PersonState>,
): boolean {
  return leanedYes(
    api.state,
    incumbent,
    "voting.stand-again",
    "stand",
    "retire",
    standAgainReason(api, incumbent),
  );
}

/** The reasons to stand again before personality: the base, less the weight of age past the pivot. */
export function standAgainReason(
  api: CoreAPI,
  incumbent: Readonly<PersonState>,
): number {
  return (
    campaignParameter("votingStandAgainBase") -
    campaignParameter("votingStandAgainAgeWeight") *
      Math.min(
        1,
        Math.max(
          0,
          (ageOnDate(incumbent.birthDate, api.state.date) -
            campaignParameter("votingStandAgainAgePivot")) /
            campaignParameter("votingStandAgainAgeSpan"),
        ),
      )
  );
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
    },
  },
  onDay: (api) => {
    candidacyDay(api);
  },
  eventKinds: ["scene.reply"],
  onEvent: (api, event) => answerPartyAsk(api, event),
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
