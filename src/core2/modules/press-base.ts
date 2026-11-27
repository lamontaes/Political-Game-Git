import nationalJson from "../data/press/national.json";
import {
  type WireLevel,
  isPolicyTopic,
  wireItem,
  type WireItem,
} from "../press-topics";
import rows from "../data/press/parameters.json";
import news from "../../../data/research/press/local-news-2026.json";
import bases from "../../../data/research/money/public-budget-bases.json";
import type {
  CoreAPI,
  PersonState,
  CoreState,
  CoreEventInput,
  PersonId,
} from "../types";
import {
  VIEWS_MODULE_ID,
  viewOf,
  stancesOf,
  type Stance as ViewStance,
  countedNewsConcern,
} from "./views";
import { ageInYears, addDays, makeIsoDate } from "../kernel/dates";
import { countedJobsOf, countedJobHeads } from "./residents";
import { residentCounts } from "./residents";
import { employerTaxShareOfWage } from "./budgets";
import {
  adBudgetMonthMinor,
  outsideCustomersOf,
  type OutletMoneyDeps,
  installOutletMoney,
} from "../press-money";
import { lawChain } from "./laws";
import {
  engagementOf,
  NATIONAL_ENGAGEMENT,
  countedResidentsOf,
} from "./campaigns";
import {
  CAMPAIGNS_MODULE_ID,
  type CampaignRow,
  parsePlatform,
  campaignRecognition,
  type ImpressionRow,
  townShareOfRace,
  contestPositions,
  touchImpression,
} from "./campaigns";
import { type StanceReader, stanceReader } from "./campaigns";
import { questionAxis, publicOffset } from "./campaigns";
import {
  decisionLean,
  decisionTraitWeight,
  reportOutcome,
  leanedScore,
} from "../trait-decisions";
import {
  type ContestRow,
  ELECTIONS_MODULE_ID,
  type FilingRow,
  ballot,
  inTheRace,
} from "./elections";
import { type TermRow, OFFICES_MODULE_ID } from "./offices";
import { partySide } from "./offices";
import { type Stance, PLATFORM_QUESTIONS } from "../campaign-data";
import { promisesOf, votesCast } from "./record";
import { bookkeeping } from "../bookkeeping";
import type { ModuleRow } from "../module-data";
import {
  regard,
  closeness,
  printItem,
  grudge,
  type DeskContext,
  type PrintedStory,
} from "../press-desk";
import { STAFF_ROLES } from "../press-staff";
import { pressStaffChanged } from "../press-conflict";
import { BUSINESS_MODULE_ID } from "./business";
import { JOBS_MODULE_ID } from "./jobs";
import type { ModuleCalendarWork } from "../module-calendar";
import { ACCEPTING_MOVES, REFUSING_MOVES } from "../scene-replies";
import { PRESS_MODULE_ID } from "./press-ids";

/** The change a speech against an outlet asks of its hearers. */
export const DISTRUST = "distrust";

export type LocalKind = "newspaper" | "television" | "radio";

export type NationalKind = "cable" | "magazine" | "online" | "national-paper";

export type OutletKind = LocalKind | NationalKind;

export const KINDS: readonly LocalKind[] = ["newspaper", "television", "radio"];

export interface NationalKindRow {
  readonly kind: NationalKind;
  readonly followShare: number;
  readonly audienceLeans: readonly number[];
  readonly reporters: number;
  readonly nameWords: readonly string[];
  readonly namePrefix?: string;
  readonly nameSuffix?: string;
}

export const NATIONAL = nationalJson as unknown as {
  basedIn: string;
  kinds: readonly NationalKindRow[];
};

export const ALL_KINDS: readonly OutletKind[] = [
  ...KINDS,
  ...NATIONAL.kinds.map((row) => row.kind),
];

export interface OutletRow {
  readonly id: string;
  readonly organizationId: string;
  readonly kind: OutletKind;
  /** Which of its kind it is, in the order outlets were recorded. */
  readonly index: number;
  readonly placeId: string;
  /** A town's own outlet, or one of the national tier its people follow. */
  readonly tier?: "local" | "national";
  /** For a national outlet: its kind's real audience lean (Pew 2020). */
  readonly audienceLean?: number;
  /** Its owner: a person who holds it, and whose views and ties read into it. */
  readonly ownerId: string | null;
  /** Its head (publisher or news director), who sets its editorial line. */
  readonly headId: string | null;
  readonly reporterIds: readonly string[];
  /**
   * Its editorial lean, -2 to +2 on the views scale: its head's lean and its
   * audience's, weighted (`outletLeanHeadWeight`).
   */
  readonly lean: number;
  /** Yearly revenue it took from its audience's spending at the opening. */
  readonly audienceRevenueMinor: number;
  /**
   * For a local outlet: the people it serves (`servedPeopleOf`), so a race or
   * a story is weighed against its own audience, not the town's. A national
   * outlet has none: its bar (`nationalInterviewBar`) and its beat weigh it.
   */
  readonly audiencePeople?: number;
  /** The town's outlet of record (`townOutlet`), settled at the opening. */
  readonly ofRecord?: boolean;
  /** How far each seat's race has built toward a turn at this outlet (`raceTurns`). */
  readonly raceCredit?: Readonly<Record<string, number>>;
  /** How far each level's stories have built up at this outlet (`levelRoom`). */
  readonly storyCredit?: Readonly<Partial<Record<WireLevel, number>>>;
}

/**
 * How an answer is given, the conversation's moves: plainly, with a further
 * fact from the record, turning it back on a rival, briefly; or the lie, a
 * position the candidate's own record contradicts.
 */
export type InterviewMove = "plain" | "further" | "turn" | "brief" | "lie";

export interface InterviewAnswer {
  readonly question: string;
  /** The stated position in [-1, 1], or null where the candidate declined. */
  readonly position: number | null;
  /** How it was said (plain where not given). */
  readonly move?: InterviewMove;
  /** The record it rests on: a vote that backs a further fact, or one a lie contradicts. */
  readonly recordId?: string | null;
}

export interface InterviewRow {
  readonly id: string;
  readonly outletId: string;
  readonly candidateId: string;
  /** The race's filing; null for an officeholder between races. */
  readonly filingId: string | null;
  readonly contestId: string | null;
  readonly askedBy: "candidate" | "outlet";
  readonly date: string;
  readonly status: "invited" | "declined" | "published";
  /**
   * Why it was declined: by the outlet (room, newsworthiness, its people's
   * regard and its readers' interest) or the one asked.
   */
  readonly reason:
    | "no-room"
    | "not-newsworthy"
    | "not-interested"
    | "already-interviewed"
    | "race-over"
    | "no-standing"
    | "candidate-declined"
    | null;
  /** How the outlet weighed an ask (`outletInterest`), when one asked it. */
  readonly interest?: OutletInterest | null;
  readonly questions: readonly string[];
  readonly answers: readonly InterviewAnswer[];
  readonly audience: number;
  readonly newsworthiness: number;
  /** The outlet's reporter who asks: the one closest to the candidate. */
  readonly reporterId?: string | null;
  /** The story the outlet printed from it. */
  readonly storyId?: string | null;
  /**
   * Why the candidate accepted or declined, kept where why is kept: the share
   * of the town that follows the outlet, whether they hold the seat, their
   * closeness to the reporter and any grudge, and their trait lean toward
   * accepting before the weight.
   */
  readonly acceptReasons?: {
    readonly reach: number;
    readonly incumbent: boolean;
    readonly closeness: number;
    readonly grudge: number;
    readonly lean: number;
  };
}

interface ParameterRow {
  readonly value: number;
}

const PARAMETERS = (
  rows as unknown as { parameters: Record<string, ParameterRow> }
).parameters;

export function pressParameter(key: string): number {
  const row = PARAMETERS[key];
  if (!row) throw new Error(`Unknown press parameter: ${key}`);
  return row.value;
}

export interface PlaceNews {
  readonly newspapers: number;
  readonly tvStations: number;
  readonly radioStations: number;
  readonly tvMarkets: number;
}

type Band = "18-29" | "30-49" | "50-64" | "65+";

type HabitKey = "localTv" | "localNewspapers" | "localRadio";

export const NEWS = news as unknown as {
  places: Record<string, PlaceNews>;
  habits: {
    national: Record<HabitKey, number>;
    byAge: Record<Band, Record<HabitKey, number>>;
  };
};

export const BASES = bases as unknown as {
  places: Record<
    string,
    {
      population2024?: number;
      puertoRicoPopulation2025?: number;
      islandAreaPopulation2020?: number;
    }
  >;
  countyPopulation2024: Record<string, number>;
};

export const HABIT: Record<LocalKind, HabitKey> = {
  newspaper: "localNewspapers",
  television: "localTv",
  radio: "localRadio",
};

/** A person's lean on the views scale; level where the world keeps no views. */
export const leanOf = (api: CoreAPI, id: string): number =>
  api.state.modules.has(VIEWS_MODULE_ID) ? (viewOf(api, id)?.lean ?? 0) : 0;

export const table = (api: CoreAPI, name: string) =>
  api.moduleState(PRESS_MODULE_ID).table(name);

export const ageOn = (
  p: Readonly<Pick<PersonState, "birthDate">>,
  date: string,
) => ageInYears(p.birthDate, date);

export const bandOf = (age: number): Band =>
  age < 30 ? "18-29" : age < 50 ? "30-49" : age < 65 ? "50-64" : "65+";

/**
 * What an outlet's own open jobs are paid in a year: each full job at its work
 * schedule's weekly hours, and each counted job at its daily wage times the
 * jobs it stands for, as the payroll and wage flows pay them.
 */
export function outletPayrollYearMinor(
  api: CoreAPI,
  organizationId: string,
): number {
  const core = api.state as CoreState;
  let total = 0;
  for (const id of core.finance.jobsByOrganization.get(organizationId) ?? []) {
    const job = core.jobs.get(id);
    if (!job || job.endsAt !== undefined) continue;
    for (const commitmentId of core.work.commitmentsByPerson.get(
      job.personId,
    ) ?? []) {
      const commitment = core.work.commitments.get(commitmentId);
      if (commitment?.jobId !== job.id || commitment.endsAt !== undefined)
        continue;
      total +=
        ((commitment.hourlyMinor * commitment.expectedWeeklyMinutes) / 60) *
        pressParameter("weeksPerYear");
    }
  }
  for (const job of countedJobsOf(core, organizationId))
    total +=
      job.wageDailyMinor *
      api.parameter("jobsDaysPerYear") *
      countedJobHeads(core, job);
  return total;
}

/** What an outlet's people in town cost in a month: their pay, the employer's payroll taxes on it and its margin. */
export function outletMonthlyCostMinor(
  api: CoreAPI,
  outlet: OutletRow,
): number {
  const payroll = outletPayrollYearMinor(api, outlet.organizationId);
  const payTaxShare = employerTaxShareOfWage(
    api,
    pressParameter("reporterAnnualPayMinor"),
  );
  return (
    (payroll * (1 + payTaxShare + pressParameter("bureauMarginShare"))) /
    pressParameter("monthsPerYear")
  );
}

/** The counted adults who follow an outlet: its audience less its full followers. */
function countedReadersOf(api: CoreAPI, outlet: OutletRow): number {
  return Math.max(
    0,
    countedAudience(api, outlet) - followersOf(api, outlet.id).length,
  );
}

/** A paper's revenue per reader a year: the national amount per adult over the share of adults who follow local newspapers. */
function revenuePerReaderYearMinor(): number {
  return (
    pressParameter("newspaperRevenuePerAdultYear") /
    NEWS.habits.national.localNewspapers
  );
}

/**
 * What an outlet can expect to take in a year: its readers' subscriptions and
 * its share of the town's businesses' ads at their cash today. No wider
 * audience tops it up: a paper that takes in less than its people cost shows
 * the loss, and its owner weighs closing it.
 */
export function expectedRevenueYearMinor(
  api: CoreAPI,
  outlet: OutletRow,
): number {
  const core = api.state as CoreState;
  const months = pressParameter("monthsPerYear");
  const local = outletsHere(api).filter((o) => o.tier !== "national");
  const audience = (o: OutletRow) => countedAudience(api, o);
  const total = local.reduce((n, o) => n + audience(o), 0);
  const subscriptions =
    outlet.kind === "newspaper"
      ? audience(outlet) *
        revenuePerReaderYearMinor() *
        pressParameter("newspaperCirculationShare")
      : 0;
  let ads = 0;
  if (total > 0)
    for (const id of core.finance.businessesByPlace.get(outlet.placeId) ?? [])
      if (!local.some((o) => o.organizationId === id))
        ads += adBudgetMonthMinor(api, id) * months;
  const town =
    subscriptions + (total > 0 ? (ads * audience(outlet)) / total : 0);
  // A paper's market readers pay the national revenue per reader.
  if (outlet.kind === "newspaper")
    return Math.round(
      town + marketReadersOf(api, outlet) * revenuePerReaderYearMinor(),
    );
  // A station's wider audience makes up its people's cost
  // (SG-PEOPLE-press-bureau-shortfall), until its whole-cost model.
  const floor = outsideCustomersOf(core, outlet.placeId)
    ? outletMonthlyCostMinor(api, outlet) * months
    : 0;
  return Math.round(Math.max(town, floor));
}

/**
 * The adults beyond the town whom an outlet reaches, counted and not
 * simulated: a newspaper's county adults less the town's, at the town's own
 * reading habits by age, shared among the papers as the town's readers are.
 */
export function marketReadersOf(api: CoreAPI, outlet: OutletRow): number {
  // Only newspapers are paid by their market; a station's wider audience still
  // makes up its people's cost.
  if (outlet.kind !== "newspaper") return 0;
  const town = townReading(api, outlet);
  if (!town) return 0;
  const own = openOfKind(api, outlet.kind);
  const beyond = Math.max(0, marketAdultsOf(api, outlet, town) - town.adults);
  return (beyond * (town.readers / town.adults)) / Math.max(1, own);
}

/** How many outlets of a kind are open: a closed one's readers go to the rest. */
export function openOfKind(api: CoreAPI, kind: string): number {
  return outletsHere(api).filter(
    (o) =>
      o.kind === kind &&
      !api.state.finance.businesses.get(o.organizationId)?.closedAt,
  ).length;
}

/** The town's adults, all its people, and the adults who read an outlet's kind, by the habits of their age. */
function townReading(
  api: CoreAPI,
  outlet: OutletRow,
): { adults: number; people: number; readers: number } | null {
  const adultAge = api.parameter("votingAge");
  let adults = 0,
    people = 0,
    readers = 0;
  for (const row of countsThisMonth(api)) {
    if (row.placeId !== outlet.placeId) continue;
    for (const [bandKey, count] of Object.entries(row.byAgeBand ?? {})) {
      const low = Number(bandKey.split("-")[0]);
      if (!Number.isFinite(low)) continue;
      people += count;
      if (low < adultAge) continue;
      adults += count;
      readers +=
        count *
        (NEWS.habits.byAge[bandOf(low)]?.[HABIT[outlet.kind as LocalKind]] ??
          0);
    }
  }
  return adults > 0 && people > 0 ? { adults, people, readers } : null;
}

/**
 * The people in a newspaper's market: its county. A county the population
 * data does not list (Puerto Rico's municipios, the island areas) is the
 * state's people over the state's published newspapers, the average area one
 * serves. Throws where no population is known, so a missing market never
 * quietly becomes the town alone.
 */
export function marketPeople(
  stateKey: string,
  countyGeoid: string | undefined,
): number {
  // The state's people, or an island area's or Puerto Rico's own count.
  const base = BASES.places[stateKey];
  const state =
    base?.population2024 ??
    base?.puertoRicoPopulation2025 ??
    base?.islandAreaPopulation2020 ??
    0;
  const county =
    (countyGeoid ? BASES.countyPopulation2024[countyGeoid] : 0) ?? 0;
  if (county > 0) return county;
  const papers = NEWS.places[stateKey]?.newspapers ?? 0;
  if (!(state > 0) || !(papers > 0))
    throw new Error(`No population for ${stateKey}'s newspaper market`);
  return state / papers;
}

/** The adults of an outlet's market: its people at the town's share of adults. */
function marketAdultsOf(
  api: CoreAPI,
  outlet: OutletRow,
  town: { adults: number; people: number },
): number {
  const chain = lawChain(api);
  return (
    marketPeople(chain.stateKey, chain.countyGeoids[0]) *
    (town.adults / town.people)
  );
}

/**
 * The newsroom jobs a newspaper keeps for its market, shared among the
 * papers there: the national jobs per adult (Pew 2020), scaled by how much
 * the market reads relative to the nation so the newsroom follows circulation
 * as revenue does, but never below the floor.
 */
export function newsroomJobsOf(
  marketAdults: number,
  papers: number,
  readingRatio = 1,
): number {
  return Math.max(
    pressParameter("newspaperNewsroomFloor"),
    (marketAdults * readingRatio) /
      pressParameter("adultsPerNewspaperNewsroomWorker") /
      Math.max(1, papers),
  );
}

/**
 * What a newspaper pays each year outside the town: the newsroom beyond its
 * town bureau (its market's newsroom jobs less the bureau's people, at a
 * reporter's pay and the employer's payroll tax; these workers live outside
 * the town and are not simulated) and the rest of its cost with each
 * newsroom job (printing, delivery, sales, administration). A station has no
 * whole-cost model yet and pays its town bureau alone.
 */
export function outsideNewsroomYearMinor(
  api: CoreAPI,
  outlet: OutletRow,
  bureauPeople: number,
): number {
  // A station's cost stays its town bureau's pay until its whole-cost model.
  if (outlet.kind !== "newspaper") return 0;
  const town = townReading(api, outlet);
  if (!town) return 0;
  const own = openOfKind(api, outlet.kind);
  const jobs = newsroomJobsOf(
    marketAdultsOf(api, outlet, town),
    own,
    town.readers / town.adults / NEWS.habits.national.localNewspapers,
  );
  const pay = pressParameter("reporterAnnualPayMinor");
  const other =
    jobs * pressParameter("newspaperOtherCostPerNewsroomJobYearMinor");
  return Math.round(
    Math.max(0, jobs - bureauPeople) *
      pay *
      (1 + employerTaxShareOfWage(api, pay)) +
      other,
  );
}

/** What the money side reads of the press: its outlets, their audiences and costs. */
export function outletMoneyDeps(api: CoreAPI): OutletMoneyDeps {
  // A closed outlet is paid by no one.
  const local = () =>
    outletsHere(api).filter(
      (o) =>
        o.tier !== "national" &&
        !api.state.finance.businesses.get(o.organizationId)?.closedAt,
    );
  return {
    moduleId: PRESS_MODULE_ID,
    townPlaceId: () => lawChain(api).townPlaceId,
    outlets: local,
    followers: (id) => followersOf(api, id),
    marketMonthlyPerReaderMinor: () =>
      revenuePerReaderYearMinor() / pressParameter("monthsPerYear"),
    monthlyCostMinor: (id) => {
      const outlet = local().find((o) => o.id === id);
      return outlet ? outletMonthlyCostMinor(api, outlet) : 0;
    },
    marketReaders: (id) => {
      const outlet = local().find((o) => o.id === id);
      return outlet ? marketReadersOf(api, outlet) : 0;
    },
    countedFollowers: (id) => {
      const outlet = local().find((o) => o.id === id);
      return outlet ? countedReadersOf(api, outlet) : 0;
    },
    subscriptionYearMinor:
      revenuePerReaderYearMinor() * pressParameter("newspaperCirculationShare"),
    adShareOfCosts: pressParameter("advertisingShareOfCosts"),
    localNewsShareOfAds: pressParameter("localNewsShareOfAdvertising"),
    source: {
      tag: "ESTIMATED",
      citation:
        "src/core2/data/press/parameters.json: a paper's circulation revenue per reader (Pew newspapers fact sheet 2022); businesses' advertising share of costs (IRS SOI 2022 Table 2.1) and the local news share of it (Pew 2022)",
      asOf: api.state.date,
      estimatedFrom: "subscriptions and advertising",
    },
  };
}

/**
 * How many of the town's adults, counted and full, follow an outlet: its
 * kind's share of each age band (Pew 2024), split evenly among the kind's
 * outlets.
 */
export function countedAudience(api: CoreAPI, outlet: OutletRow): number {
  const town = outlet.placeId;
  const own = openOfKind(api, outlet.kind);
  const adultAge = api.parameter("votingAge");
  let total = 0;
  for (const row of countsThisMonth(api)) {
    if (row.placeId !== town) continue;
    for (const [bandKey, people] of Object.entries(row.byAgeBand ?? {})) {
      const low = Number(bandKey.split("-")[0]);
      if (!Number.isFinite(low) || low < adultAge) continue;
      total +=
        people *
        (NEWS.habits.byAge[bandOf(low)]?.[HABIT[outlet.kind as LocalKind]] ??
          0);
    }
  }
  total += followersOf(api, outlet.id).length * own;
  return total / Math.max(1, own);
}

export function outletsHere(api: CoreAPI): readonly OutletRow[] {
  if (!api.state.modules.has(PRESS_MODULE_ID)) return [];
  return (table(api, "outlets").rows() as unknown as OutletRow[])
    .slice()
    .sort((a, b) => a.id.localeCompare(b.id));
}

/**
 * The town's outlet of record, which carries its public record (its legal
 * notices, its police log, its government as a beat): the town's own
 * newspaper, else the local outlet the most of the town follows
 * (`widestLocalOutlet`), whatever its kind. Settled at the opening and kept
 * on the outlet (`ofRecord`), so the town's record does not move from one
 * station to another as followers shift week to week. Null where the town has no local
 * outlet at all; then no outlet holds the town as its beat, and each weighs
 * the town against its own audience.
 */
export function townOutlet(api: CoreAPI): OutletRow | null {
  const local = outletsHere(api).filter((o) => o.tier === "local");
  return (
    local.find((o) => o.ofRecord) ??
    local.find((o) => o.kind === "newspaper" && o.index === 0) ??
    widestLocalOutlet(api)?.outlet ??
    null
  );
}

export function scheduleWeek(api: CoreAPI, from: string): void {
  const date = addDays(makeIsoDate(from), 7);
  api.moduleCalendar(PRESS_MODULE_ID).schedule({
    key: `press-week:${date}`,
    date,
    kind: "press-week",
    source: {
      tag: "ESTIMATED",
      citation: "A local newsroom plans its week's political coverage",
      asOf: api.state.date,
      estimatedFrom: "interviewsPerWeek",
    },
    sourceRecordIds: [`press-week:${lawChain(api).townPlaceId}`],
  });
}

/**
 * How much a person keeps up with the news: how closely they follow politics
 * (their view's engagement, against the nation's) plus every trait's lean
 * toward keeping up over letting it go, at the decision's weight.
 */
export const habitScore = (p: Readonly<PersonState>, core: CoreState) => {
  const engaged =
    (engagementOf(core, p) ?? NATIONAL_ENGAGEMENT) - NATIONAL_ENGAGEMENT;
  const lean = decisionLean(core, p, "press.follow-news", "follow", "skip");
  const term = decisionTraitWeight(core, "press.follow-news") * lean;
  // The audit's probe (off in play) sees the habit with and without the trait term.
  reportOutcome("press.follow-news", p.id, lean, "size", (withTerm) =>
    withTerm ? engaged + term : engaged,
  );
  return engaged + term;
};

export const followCache = new WeakMap<
  object,
  { date: string; map: Map<string, readonly string[]> }
>();

/**
 * Each adult's habit, worked out once and kept: a person's engagement and
 * traits do not change after they are built, and the audiences are rebuilt
 * every week and sorted by it.
 */
const habitScores = new WeakMap<object, Map<string, number>>();

function habitOf(api: CoreAPI, p: PersonState) {
  let scores = habitScores.get(api.state);
  if (!scores) habitScores.set(api.state, (scores = new Map()));
  let score = scores.get(p.id);
  if (score === undefined) {
    score = habitScore(p, api.state as CoreState);
    scores.set(p.id, score);
  }
  return score;
}

/**
 * The town's full adults who follow a kind of local news: in each age band,
 * the share that follows that kind (Pew 2024), its most dutiful and
 * deliberate members first.
 */
export function audienceOfKind(
  api: CoreAPI,
  kind: OutletKind,
): readonly string[] {
  const town = lawChain(api).townPlaceId;
  const date = api.state.date;
  const adultAge = api.parameter("votingAge");
  const bands = new Map<Band, PersonState[]>();
  for (const id of api.state.peopleByPlace.get(town) ?? []) {
    const p = api.state.people.get(id);
    if (!p?.alive) continue;
    const age = ageOn(p, date);
    if (age < adultAge) continue;
    const band = bandOf(age);
    const list = bands.get(band) ?? [];
    list.push(p);
    bands.set(band, list);
  }
  const habit = (p: PersonState) => habitOf(api, p);
  const followers: PersonState[] = [];
  const national = NATIONAL.kinds.find((row) => row.kind === kind);
  for (const [band, people] of bands) {
    const share = national
      ? national.followShare
      : (NEWS.habits.byAge[band]?.[HABIT[kind as LocalKind]] ?? 0);
    followers.push(
      ...people
        .slice()
        .sort((a, b) => habit(b) - habit(a) || a.id.localeCompare(b.id))
        .slice(0, Math.round(share * people.length)),
    );
  }
  // The ones who follow most closely first: an ad's or a story's first
  // contacts.
  followers.sort((a, b) => habit(b) - habit(a) || a.id.localeCompare(b.id));
  return followers.map((p) => p.id);
}

/**
 * The adults in town who read, watch or listen to an outlet. A kind's
 * audience (`audienceOfKind`) each follows the outlet of that kind whose
 * lean is nearest their own (selective exposure: Stroud 2011).
 */
export function followersOf(api: CoreAPI, outletId: string): readonly string[] {
  // Who follows what is settled once a week (the press's own cycle), or
  // again when something changes it (an attack on an outlet).
  const cached = followCache.get(api.state);
  if (
    cached &&
    cached.date <= api.state.date &&
    api.state.date < addDays(makeIsoDate(cached.date), 7)
  )
    return cached.map.get(outletId) ?? [];
  const map = new Map<string, readonly string[]>();
  const outlets = outletsHere(api);
  for (const kind of ALL_KINDS) {
    const own = outlets.filter((o) => o.kind === kind);
    if (!own.length) continue;
    const lists = new Map<string, string[]>(own.map((o) => [o.id, []]));
    const views = api.state.modules.has(VIEWS_MODULE_ID);
    for (const id of audienceOfKind(api, kind)) {
      const lean = leanOf(api, id);
      // Distrust of an outlet (a speech against it they took in) pushes a
      // follower away from it, on the lean scale.
      const distrust = new Map<string, number>();
      if (views)
        for (const stance of stancesOf(api, id))
          if (stance.desiredChange === DISTRUST)
            distrust.set(stance.topic, stance.strength);
      const distance = (o: OutletRow) =>
        Math.abs((o.lean ?? 0) - lean) +
        pressParameter("distrustDistance") *
          (distrust.get(o.organizationId) ?? 0);
      const nearest = own.reduce((best, o) =>
        distance(o) < distance(best) ? o : best,
      );
      lists.get(nearest.id)!.push(id);
    }
    for (const [id, list] of lists) map.set(id, list);
  }
  // What a person chose themselves stands over the audiences' shares.
  for (const raw of table(api, "follows").rows() as unknown as FollowRow[]) {
    const list = map.get(raw.outletId);
    if (!list) continue;
    const without = list.filter((p) => p !== raw.personId);
    map.set(raw.outletId, raw.follows ? [...without, raw.personId] : without);
  }
  followCache.set(api.state, { date: api.state.date, map });
  return map.get(outletId) ?? [];
}

type FollowRow = {
  id: string;
  personId: string;
  outletId: string;
  follows: boolean;
  since: string;
};

/**
 * The town's own outlet with the widest audience in town, television first
 * where audiences tie. A national outlet's audience in town is not the town's.
 */
function widestLocalOutlet(
  api: CoreAPI,
): { outlet: OutletRow; followers: readonly string[] } | null {
  if (!api.state.modules.has(PRESS_MODULE_ID)) return null;
  const best = outletsHere(api)
    .filter((o) => o.tier !== "national")
    .map((o) => ({ outlet: o, followers: followersOf(api, o.id) }))
    .sort(
      (a, b) =>
        b.followers.length - a.followers.length ||
        ALL_KINDS.indexOf(b.outlet.kind) - ALL_KINDS.indexOf(a.outlet.kind) ||
        a.outlet.id.localeCompare(b.outlet.id),
    )[0];
  return best ?? null;
}

/**
 * Where a campaign buys an ad: the town's own outlet with the widest
 * audience (`widestLocalOutlet`).
 */
export function adOutlet(api: CoreAPI): {
  organizationId: string;
  followerIds: readonly string[];
  countedFollowers: number;
} | null {
  const best = widestLocalOutlet(api);
  return best
    ? {
        organizationId: best.outlet.organizationId,
        followerIds: best.followers,
        countedFollowers: countedFollowers(api, best.outlet.id),
      }
    : null;
}

/**
 * The town's counted adults by age band, counted once a week: the count walks
 * every counted resident, and a campaign asks for an outlet's audience many
 * times a day while the adults change slowly (the same week the followers of
 * an outlet are held, `countedFollowersOf`).
 */
function townAdultsByBand(api: CoreAPI): ReadonlyMap<Band, number> {
  const held = adultsCache.get(api.state);
  if (
    held &&
    held.date <= api.state.date &&
    api.state.date < addDays(makeIsoDate(held.date), 7)
  )
    return held.adults;
  const town = lawChain(api).townPlaceId;
  const date = api.state.date;
  const adultAge = api.parameter("votingAge");
  const adults = new Map<Band, number>();
  for (const voter of countedResidentsOf(api.state as CoreState, town)) {
    const age = ageOn(voter, date);
    if (age < adultAge) continue;
    const band = bandOf(age);
    adults.set(band, (adults.get(band) ?? 0) + voter.weight);
  }
  adultsCache.set(api.state, { date, adults });
  return adults;
}

const adultsCache = new WeakMap<
  object,
  { date: string; adults: ReadonlyMap<Band, number> }
>();

/**
 * The counted adults in town who follow an outlet: the same rule as the full
 * people (in each age band the share that follows its kind, Pew 2024), times
 * each counted household's weight, and the outlet's slice of its kind's
 * followers is the slice the full people's choice gives it (selective
 * exposure), so one rule reads both tiers.
 */
export function countedFollowers(api: CoreAPI, outletId: string): number {
  const outlet = table(api, "outlets").get(outletId) as unknown as
    OutletRow | undefined;
  if (!outlet) return 0;
  const national = NATIONAL.kinds.find((row) => row.kind === outlet.kind);
  const adults = townAdultsByBand(api);
  let ofKind = 0;
  for (const [band, count] of adults) {
    const share = national
      ? national.followShare
      : (NEWS.habits.byAge[band]?.[HABIT[outlet.kind as LocalKind]] ?? 0);
    ofKind += Math.round(share * count);
  }
  const same = outletsHere(api).filter((o) => o.kind === outlet.kind);
  const all = same.reduce((sum, o) => sum + followersOf(api, o.id).length, 0);
  const slice = all
    ? followersOf(api, outletId).length / all
    : 1 / Math.max(1, same.length);
  return Math.round(ofKind * slice);
}

export function contestOf(api: CoreAPI, contestId: string): ContestRow {
  return api
    .moduleState(ELECTIONS_MODULE_ID)
    .table("contests")
    .get(contestId) as unknown as ContestRow;
}

/**
 * Who an interview is with: a candidate on the ballot (their filing) or an
 * officeholder between races (no filing; their party from the seat they
 * hold).
 */
export interface Speaker {
  readonly personId: string;
  readonly party: string | null;
  readonly filing: FilingRow | null;
}

export function asSpeaker(who: FilingRow | Speaker): Speaker {
  return "filing" in who
    ? who
    : { personId: who.personId, party: who.party ?? null, filing: who };
}

export function servingTerms(
  api: CoreAPI,
  personId: string,
): readonly TermRow[] {
  if (!api.state.modules.has(OFFICES_MODULE_ID)) return [];
  return (
    api
      .moduleState(OFFICES_MODULE_ID)
      .table("terms")
      .query("byPerson", [personId]) as unknown as TermRow[]
  ).filter((t) => t.status === "serving");
}

export function platformOf(
  api: CoreAPI,
  who: FilingRow | Speaker,
): readonly Stance[] {
  const filing = asSpeaker(who).filing;
  // Between races there is no platform; the record and their views speak.
  if (!filing) return [];
  const campaign = api.state.modules.has(CAMPAIGNS_MODULE_ID)
    ? (api
        .moduleState(CAMPAIGNS_MODULE_ID)
        .table("campaigns")
        .get(filing.id) as unknown as CampaignRow | undefined)
    : undefined;
  return campaign?.platform ?? parsePlatform(filing.platform);
}

export function isIncumbent(
  api: CoreAPI,
  contest: ContestRow,
  personId: string,
) {
  if (!contest.incumbentTermId || !api.state.modules.has(OFFICES_MODULE_ID))
    return false;
  const term = api
    .moduleState(OFFICES_MODULE_ID)
    .table("terms")
    .get(contest.incumbentTermId) as unknown as TermRow | undefined;
  return term?.personId === personId;
}

/**
 * How much of the town knows a candidate: the people who've heard of them and
 * the counted households their mail reached (`campaignRecognition`).
 */
function knownShare(api: CoreAPI, filing: FilingRow): number {
  if (!api.state.modules.has(CAMPAIGNS_MODULE_ID)) return 0;
  const campaigns = api.moduleState(CAMPAIGNS_MODULE_ID);
  if (campaigns.table("campaigns").get(filing.id))
    return campaignRecognition(api, filing.id);
  const adults =
    [...(api.state.peopleByPlace.get(lawChain(api).townPlaceId) ?? [])]
      .length || 1;
  return (
    (
      campaigns
        .table("impressions")
        .query("byCandidate", [filing.personId]) as unknown as ImpressionRow[]
    ).filter((i) => i.heardOf).length / adults
  );
}

/**
 * The people of one level of the town's government: the town, its county, its
 * state, or the nation (more than any outlet serves).
 */
function peopleAt(api: CoreAPI, level: WireLevel): number {
  const town =
    Number(api.state.placeMetadata.referencePopulation) ||
    api.state.people.size;
  if (level === "town") return town;
  if (level === "nation") return Number.POSITIVE_INFINITY;
  const chain = lawChain(api);
  if (level === "state") {
    const base = BASES.places[chain.stateKey];
    return Math.max(
      town,
      base?.population2024 ??
        base?.puertoRicoPopulation2025 ??
        base?.islandAreaPopulation2020 ??
        town,
    );
  }
  const county = chain.countyGeoids[0];
  return Math.max(
    town,
    (county ? BASES.countyPopulation2024[county] : undefined) ?? town,
  );
}

/** The level whose people an office answers to. */
const OFFICE_LEVEL: Readonly<Record<string, WireLevel>> = {
  federal: "nation",
  state: "state",
  county: "county",
};

/**
 * The share of an outlet's audience that a level's people make up, 0 to 1:
 * one for a national outlet, and for a town's outlet the level's people over
 * the people it serves. A market's station serves the state's people over its
 * markets, so a village is a sliver of it and the state is all of it.
 */
export function levelAudienceShare(
  api: CoreAPI,
  outlet: OutletRow,
  level: WireLevel,
): number {
  const served = servedPeople(api, outlet);
  return served ? Math.min(1, peopleAt(api, level) / served) : 1;
}

/**
 * The people an outlet answers to: those it serves (`audiencePeople`), but
 * the town's own for the outlet that holds its record (`recordOutletOf`), whose beat is
 * the town's government and record however wide it reaches. None for a
 * national outlet.
 */
function servedPeople(api: CoreAPI, outlet: OutletRow): number | undefined {
  if (!outlet.audiencePeople) return undefined;
  // The outlet that holds the town's record now: the outlet of record, or,
  // once it has no reporter living to file, the local outlet that took the
  // record over (`recordOutletOf`, which the police log reads too).
  return outlet.id === (recordOutletOf(api) ?? townOutlet(api)?.id)
    ? Math.min(outlet.audiencePeople, peopleAt(api, "town"))
    : outlet.audiencePeople;
}

/**
 * The share of an outlet's audience a race's voters make up, 0 to 1: the
 * race's people (the town's over the town's share of the race,
 * `townShareOfRace`) over the people the outlet serves.
 */
export function raceAudienceShare(
  api: CoreAPI,
  outlet: OutletRow,
  contestId: string,
): number {
  const served = servedPeople(api, outlet);
  if (!served) return 1;
  const ofRace = api.state.modules.has(CAMPAIGNS_MODULE_ID)
    ? townShareOfRace(api, contestId)
    : 1;
  if (!(ofRace > 0)) return 1;
  return Math.min(1, peopleAt(api, "town") / ofRace / served);
}

/**
 * The share of an outlet's audience a person answers to: their race's voters
 * when they are on a ballot, else the people of the highest office they hold.
 */
function speakerAudienceShare(
  api: CoreAPI,
  outlet: OutletRow,
  speaker: Speaker,
): number {
  if (speaker.filing)
    return raceAudienceShare(api, outlet, speaker.filing.contestId);
  return servingTerms(api, speaker.personId).reduce((widest, term) => {
    const office = api
      .moduleState(OFFICES_MODULE_ID)
      .table("offices")
      .get(term.officeId) as unknown as { level: string } | undefined;
    return Math.max(
      widest,
      levelAudienceShare(
        api,
        outlet,
        OFFICE_LEVEL[office?.level ?? ""] ?? "town",
      ),
    );
  }, 0);
}

/**
 * How newsworthy a candidate is to a reporter: how many people in town have
 * heard of them, whether they hold the seat, and their share of the money
 * raised in the race. To one outlet, that worth is weighed against the
 * outlet's own audience (`speakerAudienceShare`): a village race is a sliver
 * of a market station's viewers, however well the village knows its
 * candidates.
 */
export function newsworthiness(
  api: CoreAPI,
  who: FilingRow | Speaker,
  outlet?: OutletRow,
): number {
  const speaker = asSpeaker(who);
  const worth = townNewsworthiness(api, speaker);
  return outlet ? worth * speakerAudienceShare(api, outlet, speaker) : worth;
}

/** A person's newsworthiness to the town (`newsworthiness`). */
function townNewsworthiness(api: CoreAPI, speaker: Speaker): number {
  const filing = speaker.filing;
  const officeWorth = servingTerms(api, speaker.personId).reduce(
    (highest, term) => {
      const office = api
        .moduleState(OFFICES_MODULE_ID)
        .table("offices")
        .get(term.officeId) as unknown as
        { kind: string; level: string } | undefined;
      if (!office) return highest;
      const key = `officeNewsworthiness:${office.kind}`;
      const fallback = `officeNewsworthiness:${office.level}`;
      return Math.max(
        highest,
        pressParameter(key in PARAMETERS ? key : fallback),
      );
    },
    0,
  );
  if (!filing) {
    // An officeholder between races: who has heard of them, and the seat.
    const campaigns = api.state.modules.has(CAMPAIGNS_MODULE_ID)
      ? api.moduleState(CAMPAIGNS_MODULE_ID)
      : null;
    const adults =
      api.state.peopleByPlace.get(lawChain(api).townPlaceId)?.size || 1;
    // Each voter once, across the races they were met in.
    const known = campaigns
      ? new Set(
          (
            campaigns
              .table("impressions")
              .query("byCandidate", [
                speaker.personId,
              ]) as unknown as ImpressionRow[]
          )
            .filter((i) => i.heardOf)
            .map((i) => i.voterId),
        ).size / adults
      : 0;
    return (
      officeWorth +
      Math.min(1, known) +
      (servingTerms(api, speaker.personId).length
        ? pressParameter("incumbentNewsworthiness")
        : 0)
    );
  }
  const contest = contestOf(api, filing.contestId);
  const campaigns = api.state.modules.has(CAMPAIGNS_MODULE_ID)
    ? api.moduleState(CAMPAIGNS_MODULE_ID)
    : null;
  const known = knownShare(api, filing);
  const raised = (f: FilingRow) =>
    (
      campaigns?.table("campaigns").get(f.id) as unknown as
        CampaignRow | undefined
    )?.raisedMinor ?? 0;
  const total = ballot(api, contest.id).reduce((s, f) => s + raised(f), 0);
  return (
    officeWorth +
    Math.min(1, known) +
    (isIncumbent(api, contest, filing.personId)
      ? pressParameter("incumbentNewsworthiness")
      : 0) +
    (total > 0
      ? (raised(filing) / total) * pressParameter("moneyNewsworthiness")
      : 0)
  );
}

/**
 * A candidate's public position on a question: what they've stated, else
 * where they stand (through `reader`, their stance reader for a caller that
 * asks many questions; a fresh one otherwise).
 */
function statedPosition(
  api: CoreAPI,
  who: FilingRow | Speaker,
  platform: readonly Stance[],
  question: string,
  reader?: StanceReader,
): number {
  const { personId, party } = asSpeaker(who);
  return (
    platform.find((s) => s.question === question)?.position ??
    (reader ?? stanceReader(api, personId, party)).stance(question) ??
    0
  );
}

/**
 * Where a candidate stands on a question, as a reporter reads it: what they
 * said in the campaign, else how they last voted on it, else their own view
 * blended with their party's; 0 where none says. `reader` is their stance
 * reader for a caller that asks many questions; a fresh one otherwise.
 */
export function standingOn(
  api: CoreAPI,
  who: FilingRow | Speaker,
  question: string,
  reader?: StanceReader,
): {
  position: number;
  from: "platform" | "vote" | "party" | "none";
  recordId: string | null;
} {
  const { personId, party } = asSpeaker(who);
  const stated = platformOf(api, who).find((s) => s.question === question);
  if (stated)
    return { position: stated.position, from: "platform", recordId: null };
  const read = reader ?? stanceReader(api, personId, party);
  const vote = read.lastVote(question);
  if (vote)
    return { position: vote.stance.position, from: "vote", recordId: vote.id };
  // Their own view blended with their party's (GOV's campaign stances).
  const stance = read.stance(question);
  return stance === null
    ? { position: 0, from: "none", recordId: null }
    : { position: stance, from: "party", recordId: null };
}

/**
 * Local adults' concern, by the people each resident record represents.
 * Build the audience once per interview; read the current stance rows for
 * each question. A child or someone elsewhere is not a local adult, and a
 * counted resident without a heard stance contributes only to the audience.
 */
export function townConcernReader(api: CoreAPI): (question: string) => number {
  if (!api.state.modules.has(VIEWS_MODULE_ID)) return () => 0;
  const town = lawChain(api).townPlaceId;
  const adultAge = api.parameter("votingAge");
  const adults = new Map<string, number>();
  for (const id of api.state.peopleByPlace.get(town) ?? []) {
    const person = api.state.people.get(id);
    if (person?.alive && ageOn(person, api.state.date) >= adultAge)
      adults.set(id, 1);
  }
  for (const resident of countedResidentsOf(api.state as CoreState, town)) {
    if (
      ageOn(resident, api.state.date) >= adultAge &&
      api.state.people.get(resident.id)?.alive !== false
    )
      adults.set(resident.id, resident.weight);
  }
  const count = [...adults.values()].reduce((sum, weight) => sum + weight, 0);
  const stances = api.moduleState(VIEWS_MODULE_ID).table("stances");
  return (question) => {
    const strength = (
      stances.query("byTopic", [question]) as unknown as ViewStance[]
    ).reduce(
      (sum, row) => sum + row.strength * (adults.get(row.personId) ?? 0),
      countedNewsConcern(api, town, question),
    );
    return Math.min(1, strength / Math.max(1, count));
  };
}

/**
 * The questions the seat a speaker runs for or holds decides (the same read
 * the filing panel lists its positions from), or null where they have none.
 */
function seatQuestions(
  api: CoreAPI,
  speaker: Speaker,
): ReadonlySet<string> | null {
  const offices = speaker.filing
    ? [contestOf(api, speaker.filing.contestId).officeId]
    : servingTerms(api, speaker.personId).map((t) => t.officeId);
  if (!offices.length) return null;
  const positions = new Set(
    offices.flatMap((officeId) => contestPositions(api, { officeId })),
  );
  // A body whose list is empty (a world that keeps no budget for it and whose
  // state lets it decide none of the platform questions) leaves nothing to
  // restrict to, so the reporter asks as before.
  return positions.size ? positions : null;
}

/**
 * What the reporter asks: the questions the race's record puts in play,
 * scored by every reason a reporter has to ask each one: a promise the
 * candidate broke; the incumbent's recent recorded votes; how far apart the
 * candidates (their stated positions, else their own and their party's)
 * stand; how much the town cares (the stances its people hold); and how
 * divisive the question is nationally. A question this candidate has
 * already been asked on the record counts for less each time, so outlets
 * and weeks ask different things. The press adds its own reads: a vote
 * that broke with the candidate's party, how far the candidate stands from
 * the asking outlet's line on what its readers care about (a hostile outlet
 * asks where the candidate is weakest with its audience), and the cause the
 * asking reporter is driven on.
 */
export function interviewQuestions(
  api: CoreAPI,
  who: FilingRow | Speaker,
  outlet?:
    | (Pick<OutletRow, "id" | "lean"> & Partial<Pick<OutletRow, "reporterIds">>)
    | null,
): readonly string[] {
  const score = new Map<string, number>();
  const add = (q: string | undefined, weight: number) => {
    if (q) score.set(q, (score.get(q) ?? 0) + weight);
  };
  const speaker = asSpeaker(who);
  const filing = speaker.filing;
  const personId = speaker.personId;
  // One stance reader per person and party label, for this call only:
  // nothing a stance reads is written while the questions are scored.
  const readers = new Map<string, StanceReader>();
  const readerOf = (of: FilingRow | Speaker): StanceReader => {
    const { personId: id, party } = asSpeaker(of);
    const key = `${id}\u0000${party ?? ""}`;
    let reader = readers.get(key);
    if (!reader) readers.set(key, (reader = stanceReader(api, id, party)));
    return reader;
  };
  for (const p of promisesOf(api, personId))
    if (p.status === "broken")
      add(p.promise.stance.question, pressParameter("brokenPromiseNewsWeight"));
  // The seat's record: the race's incumbent, or an officeholder between races.
  const holds = filing
    ? isIncumbent(api, contestOf(api, filing.contestId), personId)
    : servingTerms(api, personId).length > 0;
  if (holds)
    for (const vote of votesCast(api.state as CoreState, personId).slice(
      -pressParameter("recordVotesConsidered"),
    ))
      add(vote.stance.question, pressParameter("recordVoteNewsWeight"));
  // The candidate's party: a recorded vote against their party's side.
  const side = partySide(speaker.party);
  if (side)
    for (const v of votesCast(api.state as CoreState, personId))
      if (
        Math.sign(v.stance.position) ===
        -side * Math.sign(questionAxis(v.stance.question))
      )
        add(v.stance.question, pressParameter("partyBreakNewsWeight"));
  const own = platformOf(api, speaker);
  const rivals = filing
    ? ballot(api, filing.contestId).filter((f) => f.id !== filing.id)
    : [];
  const questions = [
    ...new Set([
      ...PLATFORM_QUESTIONS,
      ...own.map((s) => s.question),
      ...rivals.flatMap((r) => platformOf(api, r).map((s) => s.question)),
    ]),
  ].sort();
  const speakerReader = readerOf(speaker);
  const mine = new Map(
    questions.map((q) => [
      q,
      statedPosition(api, speaker, own, q, speakerReader),
    ]),
  );
  // The asking outlet's readers: how far the candidate stands from the side
  // the outlet's line takes, on what its followers care about.
  if (outlet) {
    const followers = followersOf(api, outlet.id);
    // Each follower's lean, read once for every question.
    const leans = questions.length
      ? followers.map((id) => leanOf(api, id))
      : [];
    for (const q of questions) {
      const care = leans.length
        ? leans.reduce(
            (s, lean) => s + Math.abs((lean / 2) * questionAxis(q)),
            0,
          ) / leans.length
        : 0;
      const line = Math.sign((outlet.lean / 2) * questionAxis(q));
      add(
        q,
        (pressParameter("outletReadersNewsWeight") *
          care *
          Math.abs(
            line - standingOn(api, speaker, q, speakerReader).position,
          )) /
          2,
      );
    }
  }
  // The asking reporter's own causes on a policy question.
  const reporterId = outlet?.reporterIds
    ? reporterFor(
        api,
        outlet as OutletRow,
        personId,
        asSpeaker(who).filing?.contestId ?? null,
      )
    : null;
  const reporter = reporterId ? api.state.people.get(reporterId) : undefined;
  if (reporter)
    for (const d of reporter.drives.values())
      if (d.kind === "cause" && isPolicyTopic(d.topic))
        add(d.topic, pressParameter("reporterCauseNewsWeight") * d.strength);
  for (const rival of rivals) {
    const theirs = platformOf(api, rival);
    const reader = readerOf(rival);
    for (const q of questions)
      add(
        q,
        (pressParameter("partyGapNewsWeight") *
          Math.abs(
            mine.get(q)! - statedPosition(api, rival, theirs, q, reader),
          )) /
          2,
      );
  }
  const concern = townConcernReader(api);
  for (const q of questions) {
    add(q, pressParameter("townConcernNewsWeight") * concern(q));
    add(
      q,
      pressParameter("divisiveNewsWeight") *
        Math.max(
          0,
          Math.abs(questionAxis(q)) - Math.abs(publicOffset(q, api.state.seed)),
        ),
    );
  }
  // A reporter asks what the seat's own body decides, and otherwise only what
  // is truly in the news in the town: a question the body cannot decide keeps
  // nothing but the town's concern for it, so it is asked as the town's news
  // and never for the candidate's record or the rivals' gap.
  const seat = seatQuestions(api, speaker);
  if (seat)
    for (const [q] of score)
      if (!seat.has(q))
        score.set(q, pressParameter("townConcernNewsWeight") * concern(q));
  // Asked before, on the record: less to learn from asking again.
  const asked = new Map<string, number>();
  for (const row of table(api, "interviews").query("byCandidate", [
    personId,
  ]) as unknown as InterviewRow[])
    if (row.status !== "declined")
      for (const q of row.questions) asked.set(q, (asked.get(q) ?? 0) + 1);
  for (const [q, times] of asked)
    if (score.has(q))
      score.set(q, score.get(q)! - pressParameter("askedAgainPenalty") * times);
  return [...score]
    .filter(([, v]) => v > 0)
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, pressParameter("questionsPerInterview"))
    .map(([q]) => q);
}

/**
 * An outlet's interviews of the last seven days not declined: the room its
 * week has used, for the press desk and the campaign day alike. Read a day at
 * a time from its own index; an interview is dated the day it was asked and
 * never later (`record`), so the seven days hold every one of the week's, and
 * the outlet's older ones are not walked.
 */
export function weekCount(api: CoreAPI, outletId: string): number {
  const interviews = table(api, "interviews");
  let taken = 0;
  for (let back = 6; back >= 0; back -= 1)
    for (const i of interviews.query("byOutletDate", [
      outletId,
      addDays(makeIsoDate(api.state.date), -back),
    ]) as unknown as InterviewRow[])
      if (i.status !== "declined") taken += 1;
  return taken;
}

export function already(api: CoreAPI, outletId: string, filingId: string) {
  return (
    table(api, "interviews").query("byOutlet", [
      outletId,
    ]) as unknown as InterviewRow[]
  ).some((i) => i.filingId === filingId && i.status !== "declined");
}

/** Whether an outlet talked with this person within the last stretch. */
function talkedLately(api: CoreAPI, outletId: string, personId: string) {
  const since = addDays(
    makeIsoDate(api.state.date),
    -pressParameter("interviewAgainDays"),
  );
  return (
    table(api, "interviews").query("byCandidate", [
      personId,
    ]) as unknown as InterviewRow[]
  ).some(
    (i) =>
      i.outletId === outletId && i.status !== "declined" && i.date >= since,
  );
}

export function record(api: CoreAPI, row: InterviewRow): InterviewRow {
  // A row dated after today would fall outside the week `weekCount` reads.
  if (bookkeeping() && makeIsoDate(row.date) > api.state.date)
    throw new Error(`Interview ${row.id} is dated after ${api.state.date}.`);
  table(api, "interviews").put(row as unknown as ModuleRow);
  return row;
}

/** How an outlet weighs someone asking it for an interview. */
export interface OutletInterest {
  /** How newsworthy they are (`newsworthiness`). */
  readonly worth: number;
  /** The editor's regard for them, weighted. */
  readonly head: number;
  /** The owner's regard for them, weighted. */
  readonly owner: number;
  /** The share of the outlet's followers who have heard of them, weighted. */
  readonly readers: number;
  readonly total: number;
}

/**
 * How much an outlet wants to talk with someone who asks: how newsworthy
 * they are, its editor's and owner's regard for them (closeness, a grudge,
 * how near their views sit), and how many of its followers know who they
 * are.
 */
export function outletInterest(
  api: CoreAPI,
  outlet: OutletRow,
  speaker: Speaker,
): OutletInterest {
  const p = pressParameter;
  const regardOf = (id: string | null) =>
    id && api.state.people.get(id)?.alive
      ? regard(api, p, id, speaker.personId)
      : 0;
  const worth = newsworthiness(api, speaker, outlet);
  const head = p("interestHeadWeight") * regardOf(outlet.headId);
  const owner = p("slantOwnerWeight") * regardOf(outlet.ownerId);
  const followers = followersOf(api, outlet.id);
  const heard =
    followers.length && api.state.modules.has(CAMPAIGNS_MODULE_ID)
      ? new Set(
          (
            api
              .moduleState(CAMPAIGNS_MODULE_ID)
              .table("impressions")
              .query("byCandidate", [
                speaker.personId,
              ]) as unknown as ImpressionRow[]
          )
            .filter((i) => i.heardOf)
            .map((i) => i.voterId),
        )
      : new Set<string>();
  const readers =
    p("interestReadersWeight") *
    (followers.length
      ? followers.filter((id) => heard.has(id)).length / followers.length
      : 0);
  return { worth, head, owner, readers, total: worth + head + owner + readers };
}

export function arrange(
  api: CoreAPI,
  filingId: string,
  outletId: string,
  askedBy: InterviewRow["askedBy"],
): InterviewRow {
  const filing = api
    .moduleState(ELECTIONS_MODULE_ID)
    .table("filings")
    .get(filingId) as unknown as FilingRow;
  if (!filing) throw new Error(`No filing ${filingId}`);
  return arrangeWith(api, asSpeaker(filing), outletId, askedBy);
}

export function arrangeWith(
  api: CoreAPI,
  speaker: Speaker,
  outletId: string,
  askedBy: InterviewRow["askedBy"],
): InterviewRow {
  const outlet = table(api, "outlets").get(outletId) as unknown as
    OutletRow | undefined;
  if (!outlet) throw new Error(`No outlet ${outletId}`);
  const filing = speaker.filing;
  const worth = newsworthiness(api, speaker, outlet);
  const key = filing?.id ?? speaker.personId;
  const base = {
    // One row per ask: a second ask the same day never overwrites the first.
    id: `interview:${outletId}:${key}:${api.state.date}:${
      (
        table(api, "interviews").query("byOutlet", [
          outletId,
        ]) as unknown as InterviewRow[]
      ).filter((i) => (i.filingId ?? i.candidateId) === key).length
    }`,
    outletId,
    candidateId: speaker.personId,
    filingId: filing?.id ?? null,
    contestId: filing?.contestId ?? null,
    askedBy,
    date: api.state.date,
    questions: [] as string[],
    answers: [] as InterviewAnswer[],
    audience: 0,
    newsworthiness: worth,
    reporterId: reporterFor(
      api,
      outlet,
      speaker.personId,
      filing?.contestId ?? null,
    ),
    storyId: null,
  };
  const declined = (
    reason: InterviewRow["reason"],
    interest: OutletInterest | null = null,
  ) => record(api, { ...base, status: "declined", reason, interest });
  if (filing) {
    if (
      contestOf(api, filing.contestId).electionDate < api.state.date ||
      !inTheRace(api, filing)
    )
      return declined("race-over");
    if (already(api, outletId, filing.id))
      return declined("already-interviewed");
  } else {
    // Between races, only one who holds a seat has a record to be asked on.
    if (!servingTerms(api, speaker.personId).length)
      return declined("no-standing");
    if (talkedLately(api, outletId, speaker.personId))
      return declined("already-interviewed");
  }
  if (weekCount(api, outletId) >= pressParameter("interviewsPerWeek"))
    return declined("no-room");
  // One who asks is weighed by the outlet's people and readers (a friend of
  // the owner may get airtime their name alone would not); an outlet's own
  // invitation was already its choice.
  const bar = newsworthyBar(outlet);
  const interest =
    askedBy === "candidate" ? outletInterest(api, outlet, speaker) : null;
  if (interest && interest.total < bar)
    return declined(
      worth < bar ? "not-newsworthy" : "not-interested",
      interest,
    );
  if (!interest && worth < bar) return declined("not-newsworthy");
  const arranged = record(api, {
    ...base,
    status: "invited",
    reason: null,
    interest,
    questions: interviewQuestions(api, speaker, outlet),
  });
  // A paper that says yes to the candidate's own ask sits down with them: the
  // same invitation event an outlet's own ask puts, which the director stages
  // as the interview.
  if (askedBy === "candidate" && arranged.status === "invited")
    invitation(api, arranged);
  return arranged;
}

/**
 * How newsworthy a candidate must be for an outlet to give them an interview:
 * a national outlet's bar, a television station's, else any candidate.
 */
export function newsworthyBar(outlet: OutletRow): number {
  if (outlet.tier === "national") return pressParameter("nationalInterviewBar");
  return outlet.kind === "television" ? pressParameter("televisionBar") : 0;
}

/**
 * Which of an outlet's reporters asks a candidate: the one closest to them
 * (a friend gets the friendly reporter), else its first. A reporter never
 * covers themself or a race they are in (the outlet recuses them from the
 * records), so a paper whose only reporter is the candidate has none to send.
 */
export function reporterFor(
  api: CoreAPI,
  outlet: OutletRow,
  candidateId: string,
  contestId: string | null = null,
): string | null {
  const rivals = new Set(
    contestId ? ballot(api, contestId).map((f) => f.personId) : [],
  );
  const reporters = (outlet.reporterIds ?? []).filter(
    (id) =>
      api.state.people.get(id)?.alive && id !== candidateId && !rivals.has(id),
  );
  if (!reporters.length) return null;
  // stopgapId: SG-PEOPLE-press-favors-and-leaks
  api.stopgap("SG-PEOPLE-press-favors-and-leaks");
  return reporters
    .map((id) => ({ id, tie: closeness(api, id, candidateId) }))
    .sort((a, b) => b.tie - a.tie || a.id.localeCompare(b.id))[0]!.id;
}

/**
 * The outlet that runs the town's own police log: the town's outlet of record
 * (`townOutlet`), or, when it has no reporter living to file it, the first
 * local outlet that has one.
 */
export function recordOutletOf(api: CoreAPI): string | undefined {
  const alive = (o: OutletRow) =>
    (o.reporterIds ?? []).some((id) => api.state.people.get(id)?.alive);
  const town = townOutlet(api);
  if (town && alive(town)) return town.id;
  return outletsHere(api).find((o) => o.tier === "local" && alive(o))?.id;
}

/**
 * The town's counted residents by place, read at most once a month: the
 * count walks every counted household, and an outlet's audience moves slowly.
 */
export function countsThisMonth(
  api: CoreAPI,
): ReturnType<typeof residentCounts> {
  const held = countsCache.get(api.state);
  if (
    held &&
    held.date <= api.state.date &&
    api.state.date <
      addDays(makeIsoDate(held.date), pressParameter("audienceRecountDays"))
  )
    return held.rows;
  const rows = residentCounts(api.state as CoreState);
  countsCache.set(api.state, { date: api.state.date, rows });
  return rows;
}

const countsCache = new WeakMap<
  object,
  { date: string; rows: ReturnType<typeof residentCounts> }
>();

/** The kind of an outlet's invitation to a candidate to sit for an interview. */
export const INTERVIEW_INVITED_EVENT = "interview-invited";

/**
 * The kind of the record that a candidate said yes to an outlet's invitation:
 * the sitting is waiting. It names the candidate and the reporter who will
 * ask; the director stages the sitting from it (`interview-sitting`), and the
 * candidate's answers, said there, publish the interview (`answerInterview`).
 */
export const INTERVIEW_ACCEPTED_EVENT = "interview-accepted";

/** One outlet's invitation on the record: the director stages it as a call from that outlet's reporter. */
export function invitation(api: CoreAPI, row: InterviewRow): void {
  const ids = [row.candidateId, row.reporterId ?? ""].filter((id) =>
    api.state.people.has(id),
  );
  if (!ids.includes(row.candidateId)) return;
  const contest = row.contestId ? contestOf(api, row.contestId) : null;
  // The outlet by its organization, as the press's other records name it.
  const outlet = outletsHere(api).find((o) => o.id === row.outletId);
  api.emit({
    id: `${INTERVIEW_INVITED_EVENT}:${row.id}`,
    date: api.state.date,
    kind: INTERVIEW_INVITED_EVENT,
    personIds: ids,
    placeId: lawChain(api).townPlaceId,
    source: {
      tag: "SOURCED",
      citation: `Interview ${row.id}`,
      asOf: api.state.date,
    },
    facts: {
      interviewId: row.id,
      invitedId: row.candidateId,
      outletId: outlet?.organizationId ?? row.outletId,
      ...(row.reporterId ? { reporterId: row.reporterId } : {}),
      ...(row.contestId ? { contestId: row.contestId } : {}),
      ...(contest ? { office: contest.title } : {}),
    },
  });
}

export {
  ACCEPTING_MOVES,
  BUSINESS_MODULE_ID,
  CAMPAIGNS_MODULE_ID,
  ELECTIONS_MODULE_ID,
  JOBS_MODULE_ID,
  PLATFORM_QUESTIONS,
  REFUSING_MOVES,
  STAFF_ROLES,
  VIEWS_MODULE_ID,
  addDays,
  ballot,
  closeness,
  countedJobsOf,
  decisionLean,
  grudge,
  installOutletMoney,
  isPolicyTopic,
  lawChain,
  leanedScore,
  makeIsoDate,
  outsideCustomersOf,
  pressStaffChanged,
  printItem,
  regard,
  stanceReader,
  stancesOf,
  touchImpression,
  votesCast,
  wireItem,
};
export type {
  CampaignRow,
  ContestRow,
  CoreAPI,
  CoreEventInput,
  CoreState,
  DeskContext,
  FilingRow,
  ModuleCalendarWork,
  ModuleRow,
  PersonId,
  PersonState,
  PrintedStory,
  Stance,
  WireItem,
  WireLevel,
};
