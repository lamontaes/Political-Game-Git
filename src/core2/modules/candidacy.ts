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
 * one level up. Whoever decides to run files with the place's filing office,
 * on a platform from their own views.
 */
import { ageOnDate, makeIsoDate } from "../kernel/dates";
import { scoreOffers, decisionFromScores } from "../choice";
import rows from "../data/candidacy/parameters.json" with { type: "json" };
import type { Parameter } from "../parameters";
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
import { PLATFORM_QUESTIONS, questionAxis } from "../campaign-views";
import { isExplicitlyControlledPersonV1 } from "../player-control-state-v1";
import type { OfficeInput } from "../offices-local";
import {
  ELECTIONS_MODULE_ID,
  fileCandidacy,
  filingRulesFor,
  officeFamily,
  type ContestRow,
  type FilingRow,
  type OfficeFamily,
} from "./elections";
import { OFFICES_MODULE_ID, type TermRow } from "./offices";
import { PARTIES_MODULE_ID, partiesHere, partyTie } from "./parties";
import {
  VIEWS_DATA,
  VIEWS_KEYS,
  VIEWS_MODULE_ID,
  viewCell,
  viewOf,
} from "./views";
import { residentPerson } from "./residents";
import { stableHash } from "../kernel/ids";
import { countedResidents, type CountedVoter } from "../electorate";
import { fillInPerson } from "../state";

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
  for (const drive of person.drives.values())
    cause = Math.max(cause, Math.min(one, drive.strength));
  const job = person.jobId ? api.state.jobs.get(person.jobId) : undefined;
  // How they stand with the incumbent: someone close to the officeholder
  // doesn't run against them; someone at odds with them is drawn to.
  let incumbentTie = zero;
  if (contest.incumbentId && contest.incumbentId !== person.id)
    for (const id of api.state.relationshipsByPerson.get(person.id) ?? []) {
      const row = api.state.relationships.get(id);
      if (
        row &&
        (row.otherId === contest.incumbentId ||
          row.actorId === contest.incumbentId)
      )
        incumbentTie = Math.max(-one, Math.min(one, row.level));
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
    person.known / c(api, "candidacyStandingCircle"),
  );
  return {
    engagement: c(api, "candidacyEngagementWeight") * person.engagement,
    cause: c(api, "candidacyCauseWeight") * person.cause,
    time: -c(api, "candidacyTimeWeight") * Math.min(one, hours),
    incumbency:
      contest.incumbentId === person.id
        ? c(api, "candidacyIncumbencyWeight")
        : zero,
    incumbentTie: -c(api, "candidacyIncumbentTieWeight") * person.incumbentTie,
    standing: c(api, "candidacyStandingWeight") * standing,
    // A crowded race: each person already running lowers the pull.
    field: -c(api, "candidacyFieldWeight") * (contest.runners ?? zero),
    age:
      c(api, "candidacyAgeWeight") *
      (two * Math.exp(-distance * distance) - one),
    // A countywide race: more ground and more voters to reach than a town seat.
    reach: contest.countywide ? -c(api, "candidacyCountywideWeight") : zero,
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
): CandidacyDecision | null {
  const person = api.state.people.get(personId);
  if (!person?.alive) return null;
  const id = `${contest.contestId}:${personId}`;
  const held = table(api).get(id) as unknown as CandidacyDecision | undefined;
  if (held) return held;
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

/** Each serving officeholder who is a person here, with the rank of their highest seat. */
function officeholders(api: CoreAPI): Map<PersonId, number> {
  const held = new Map<PersonId, number>();
  if (!api.state.modules.has(OFFICES_MODULE_ID)) return held;
  const offices = api.moduleState(OFFICES_MODULE_ID).table("offices");
  for (const term of api
    .moduleState(OFFICES_MODULE_ID)
    .table("terms")
    .rows() as unknown as TermRow[]) {
    if (term.status !== "serving" || !term.personId) continue;
    const office = offices.get(term.officeId) as unknown as
      OfficeInput | undefined;
    if (!office) continue;
    const rank = FAMILY_RANK[officeFamily(office)];
    held.set(term.personId, Math.max(held.get(term.personId) ?? -1, rank));
  }
  return held;
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
  let party: string | null = null;
  if (partisan && api.state.modules.has(PARTIES_MODULE_ID)) {
    const tie = partyTie(api, person.id);
    party =
      partiesHere(api).find((row) => row.id === tie?.partyId)?.name ?? null;
  }
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
 * The town's adults weigh a contest: every named adult who lives in town
 * weighs a local seat (where the town has no city or county seats, its most
 * local ones); an officeholder weighs the seat one level above their own;
 * the incumbent weighs keeping theirs. Each decision is kept.
 */
export function weighContest(
  api: CoreAPI,
  contest: ContestRow,
  localRank: number = LOCAL_RANK,
  /** The incumbent's own filing is already on record (a race that closed before the opening). */
  incumbentFiled = false,
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
  const holders = officeholders(api);
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
    sourceIds: [contest.id, ...(incumbent ? [incumbent.id] : [])],
  };
  // Someone already running on this election day runs for one seat only.
  const committed = committedOn(api, contest.electionDate);
  // A local seat: the town's counted adults weigh it from their counted
  // records; those it draws are filled in and decide in full like anyone.
  let countedWeighed = 0;
  const filledInIds: PersonId[] = [];
  if (rank <= localRank) {
    const screen = countedScreen(api, open, town.townPlaceId, rules.minimumAge);
    countedWeighed = screen.weighed;
    for (const id of screen.drawn) {
      if (committed.has(id)) continue;
      fillInPerson(api.state as CoreState, id);
      filledInIds.push(id);
    }
  }
  const people = [...api.state.people.values()]
    .filter(
      (p) =>
        p.alive &&
        p.placeId === town.townPlaceId &&
        ageOnDate(makeIsoDate(p.birthDate), makeIsoDate(date)) >=
          rules.minimumAge &&
        !isExplicitlyControlledPersonV1(api.state, p.id) &&
        !committed.has(p.id) &&
        !(incumbentFiled && p.id === incumbentId) &&
        (p.id === incumbentId ||
          rank <= localRank ||
          holders.get(p.id) === rank - 1),
    )
    .sort((a, b) => a.id.localeCompare(b.id));
  for (const person of people) {
    const decision = decideToRun(api, person.id, {
      ...open,
      runners: running.length,
    });
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

/** Everyone who decided to run in a contest held on this election day. */
function committedOn(api: CoreAPI, electionDate: string): Set<PersonId> {
  const contests = api.moduleState(ELECTIONS_MODULE_ID).table("contests");
  const out = new Set<PersonId>();
  for (const row of api
    .moduleState(CANDIDACY_MODULE_ID)
    .table("weighed")
    .rows() as unknown as WeighedContest[]) {
    const held = contests.get(row.contestId) as unknown as
      ContestRow | undefined;
    if (held?.electionDate === electionDate)
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

/** Filing opens: each runner files with the place's filing office. */
export function fileRunners(api: CoreAPI, contest: ContestRow): void {
  const weighed = api.moduleState(CANDIDACY_MODULE_ID).table("weighed");
  const row = weighed.get(contest.id) as unknown as WeighedContest | undefined;
  if (!row || row.filedOn !== null) return;
  const incumbent = contest.incumbentTermId
    ? (api
        .moduleState(OFFICES_MODULE_ID)
        .table("terms")
        .get(contest.incumbentTermId) as unknown as TermRow | undefined)
    : undefined;
  for (const personId of row.runIds) {
    const decision = decisionOf(api, contest.id, personId);
    const person = api.state.people.get(personId);
    if (!decision || !person) continue;
    const filing: NonNullable<CandidacyDecision["filing"]> = person.alive
      ? fileFor(api, person, contest, Boolean(incumbent?.party))
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
  const row = weighContest(api, contest, localRank, true);
  const incumbent = contest.incumbentTermId
    ? (api
        .moduleState(OFFICES_MODULE_ID)
        .table("terms")
        .get(contest.incumbentTermId) as unknown as TermRow | undefined)
    : undefined;
  const filings = api.moduleState(ELECTIONS_MODULE_ID).table("filings");
  for (const personId of row.runIds) {
    const decision = decisionOf(api, contest.id, personId);
    if (!decision) continue;
    let party: string | null = null;
    if (incumbent?.party && api.state.modules.has(PARTIES_MODULE_ID)) {
      const tie = partyTie(api, personId);
      party = partiesHere(api).find((p) => p.id === tie?.partyId)?.name ?? null;
    }
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
    if (contest.filingDeadline >= today) fileRunners(api, contest);
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
