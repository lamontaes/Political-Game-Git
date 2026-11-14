/**
 * The counted population moves from causes (one model, two tiers; owner,
 * Oct 14, 2026: "if California repealed its state income tax, people would
 * flood in"). Every state and territory holds its people at a coarse grain
 * (age bands, from its BEA population); the town and its neighbors hold
 * theirs as counted groups. Once a month every group weighs every other
 * place: the share of its age that leaves its county in a year (ACS 2024),
 * scaled by each place's pull against home: the after-tax income it offers
 * in real terms (the state income tax in force, the region's prices) to a
 * power, and its unemployment against home's, held back by a home owned and
 * children at home. Nothing is rolled: the expected movers accrue month by
 * month and a whole household moves when one is due, toward the place that
 * pulled hardest. People arrive in the town the same way from every other
 * place. The regional engine reads each state's counts.
 */
import { taxIndexOf } from "../tax-index";
import { placeStateKey } from "../place-map";
import { worldRateFactor } from "../world-base-rates";
import { createStableId, stableHash } from "../kernel/ids";
import moverRates from "../../../data/research/migration/mover-rates-acs-2024.json" with { type: "json" };
import moveRows from "../data/moves/parameters.json" with { type: "json" };
import regions from "../data/regional/regions.json" with { type: "json" };
import rppHousing from "../data/regional/rpp-housing.json" with { type: "json" };
import { withholdingFor } from "../budgets-treasury";
import { startingLawReader } from "../country-law";
import { COUNTRY_AGE_BANDS, countryFlowsIn } from "../country-model";
import type { LawInForceAnswer } from "../laws-in-force";
import { ageOn, type CountedHousehold } from "../counted-groups";
import { openingTemperaments } from "../opening-personality";
import { coreStateKeyOfPlaceholderId } from "../place-lookup";
import { returnedMembersLeave } from "../returned-members-move";
import { isDemoted } from "../counted-groups";
import { stateFigures, type RegionMonth } from "../regional-model";
import { LAWS_MODULE_ID, lawInForce, stateLawInForce } from "./laws";
import { REGIONAL_MODULE_ID } from "./regional";
import { webFactorFor, type Subject } from "../outcome-web-reach";
import {
  admitCountedHousehold,
  countedParameter,
  departCountedHousehold,
  householdIncome,
  residentsRuntime,
  townPlaceOf,
  type ResidentsRuntime,
} from "./residents";
import type { ResidentHouseholdRecord } from "../residents";
import type { ModuleRow } from "../module-data";
import { registerWorldMapPart } from "../snapshot";
import type {
  CoreAPI,
  CoreModule,
  CoreState,
  IsoDate,
  PersonId,
  PersonInput,
  PersonState,
  PlaceId,
  Source,
} from "../types";

export const COUNTED_MOVES_MODULE_ID = "core2-counted-moves-v1";

/** The living members of a counted household who keep their own records: people returned to the counts earlier. */
function returnedMembersOf(
  core: CoreState,
  h: CountedHousehold,
): PersonState[] {
  const residents = residentsRuntime(core);
  if (!residents) return [];
  const out: PersonState[] = [];
  for (const m of residents.store.countedMembers(h)) {
    const person = core.people.get(residents.store.ids[m]! as PersonId);
    if (person?.alive && isDemoted(person)) out.push(person);
  }
  return out;
}

const TABLE = "moves";
const PULLS_TABLE = "pulls";

/** Coarse age bands and the ACS bands each averages. */
const ADMIT_MORE_IMMIGRANTS =
  "us-federal-positions:immigration.admit-more-immigrants";
/** Where newcomers from outside the country are from, in an arrival's key. */
const ABROAD = "abroad";
const COARSE = [
  ["under-18", "countedPeopleShareUnder18", ["30-34", "35-39", "40-44"]],
  ["18-29", "countedPeopleShare18to29", ["18-19", "20-24", "25-29"]],
  ["30-44", "countedPeopleShare30to44", ["30-34", "35-39", "40-44"]],
  ["45-64", "countedPeopleShare45to64", ["45-49", "50-54", "55-59", "60-64"]],
  ["65-plus", "countedPeopleShare65plus", ["65-69", "70-74", "75+"]],
] as const;

const RATES = moverRates as unknown as {
  national: {
    abroadPerResidentPerYear: number;
    abroadAgeShare: Readonly<Record<string, number>>;
    admitMoreImmigrantsLaw: { shareOfArrivalsFromAbroad: number };
  };
  places: Readonly<Record<string, { abroadPerResidentPerYear?: number }>>;
};
const STATES = (
  regions as unknown as {
    states: Record<
      string,
      {
        usps: string;
        rppPct: Record<string, number>;
        perCapitaIncome: number | null;
        population: number;
      }
    >;
    nation: { perCapitaIncome: number };
  }
).states;
const MOVES = moveRows as unknown as Record<string, { value: number }>;
/** Each state's FIPS code by its USPS code, from the regional data. */
const FIPS_OF = new Map(
  Object.entries(STATES).map(([fips, row]) => [row.usps, fips] as const),
);

/** One state's or territory's people at the coarse grain. */
export interface CoarsePlace {
  readonly usps: string;
  readonly fips: string;
  /** People by coarse age band (fractional: counts at this grain are expected values). */
  people: number[];
}

/** A household that moved, with the pull that moved it. */
export interface MoveRecord {
  readonly id: string;
  readonly date: string;
  readonly direction: "out" | "in";
  readonly householdId: string;
  readonly groupId: string;
  readonly fromPlace: string;
  readonly toPlace: string;
  readonly people: number;
  /** What weighed toward the move, by cause: the yearly rate of leaving at the movers' age (lifeStage, or for a household of minors alone its group's yearly rate, groupRate); the web's factor, each hold (negative) and the pull toward another state, in log units. */
  readonly reasons: Readonly<Record<string, number>>;
}

export interface Runtime {
  /** Each state's people this month, read from the country tier (the one holder), by coarse band. */
  states: Map<string, CoarsePlace>;
  /** Each state's movers this month by the tier's own rule: the share of each coarse band leaving for another state, and the share of its leavers each state takes. */
  flows: Map<string, { leaving: number[]; toShare: Map<string, number> }>;
  /** Each state's size times its draw (the tier's place constant, fitted once at the opening): its weight as a destination. */
  draw: Map<string, number>;
  /** People arriving from abroad in a year, for each resident of a state (the tier's opening rate). */
  abroad: Map<string, number>;
  /** The share of the town's state living outside its counted places, fixed when the engine opens: none where the counted places are the whole jurisdiction (Washington, D.C.). */
  restShare: number;
  townState: string;
  /** People due to leave, by group and destination state. */
  leave: Map<string, number>;
  /** People due to arrive in a place, by origin state and coarse band. */
  arrive: Map<string, number>;
  /** Normalizes the holds so a place's average leaving rate is the ACS rate. */
  holdNorm: Map<PlaceId, number>;
  /** The people each institution's rooms hold (place and type), seen the first month: its beds. */
  roomCapacity: Map<string, number>;
  /** Next in line on each institution type's waiting list (admitToRooms). */
  roomQueue: Map<string, number>;
  serial: number;
  /** After-tax real income by state and wage, for this month (cleared each month). */
  netCache: Map<string, number>;
}
const runtimes = new WeakMap<CoreState, Runtime>();
registerWorldMapPart("core2-counted-moves", runtimes);
/** Each household's place in its group's order of leaving (a hash of the seed and its id), kept per world outside the saved runtime. */
const orderHashes = new WeakMap<
  CoreState,
  { seed: string; byId: Map<string, string> }
>();

/**
 * A state's yearly arrivals from abroad per resident, from the ACS "moved from
 * abroad" line (B07001_081 over B07001_001), times this world's movers factor.
 */
function abroadRate(api: CoreAPI, usps: string): number {
  const row = RATES.places[`US-${usps}`];
  // While Congress's law to admit more immigrants stands, more come: the
  // researched extra admissions as a share of today's arrivals from abroad.
  const admitting =
    api.state.modules.has(LAWS_MODULE_ID) &&
    lawInForce(api, ADMIT_MORE_IMMIGRANTS).value === 1;
  return (
    (row?.abroadPerResidentPerYear ?? RATES.national.abroadPerResidentPerYear) *
    worldRateFactor(api.state.seed, "movers") *
    (admitting
      ? 1 + RATES.national.admitMoreImmigrantsLaw.shareOfArrivalsFromAbroad
      : 1)
  );
}

/** A state's regional price level (nation = 100), latest year. */
function priceLevel(fips: string): number {
  const rpp = STATES[fips]?.rppPct ?? {};
  const year = Object.keys(rpp).sort().pop();
  return year ? rpp[year]! : 100;
}

/**
 * A state's price level for a renting household: the all-items level tilted
 * toward housing by what a renter spends on it over what every household does
 * (BEA's housing component of the regional price parities).
 */
function renterPriceLevel(fips: string): number {
  const row = (
    rppHousing as unknown as {
      byFips: Record<string, { allItems: number; housing: number }>;
    }
  ).byFips[fips];
  const all = priceLevel(fips);
  if (!row) return all;
  const tilt =
    countedParameter("countedMovesRenterHousingWeight") -
    (rppHousing as unknown as { housingWeight: number }).housingWeight;
  return all * Math.pow(row.housing / row.allItems, tilt);
}

/**
 * Yearly state income tax on wages in dollars: every state's law in force
 * (the laws module's answer for the town's state and for any other), taken as
 * the paycheck takes it (`withholdingFor`, as the country tier does in
 * country-law.ts): one rule for every place. A world without the laws module
 * reads the research's starting law through the same rule.
 */
function stateIncomeTax(
  api: CoreAPI,
  rt: Runtime,
  usps: string,
  wages: number,
): number {
  const core = api.state as CoreState;
  let answer: LawInForceAnswer;
  if (core.modules.has(LAWS_MODULE_ID))
    answer =
      usps === rt.townState
        ? lawInForce(api, "income-tax")
        : stateLawInForce(api, `US-${usps}`, "income-tax");
  // A world without the laws module reads the research's starting law by the
  // same rule, on today's date (never a table of its own).
  else
    answer = startingLawReader(core.date, core.startedAt)(
      `US-${usps}`,
      "income-tax",
    );
  const lines = withholdingFor({
    paidMinor: Math.round(wages * 100),
    periodDays: 365,
    yearToDateMinor: 0,
    incomeTax: answer,
    // Only the income tax is weighed here: no payroll lines.
    socialSecurity: { ...answer, governing: null },
    medicare: { ...answer, governing: null },
    index: taxIndexOf(api),
  });
  let minor = 0;
  for (const line of lines)
    if (line.level === "state" && line.tax === "income") minor += line.minor;
  return minor / 100;
}

/** Each state's unemployment rate this month by USPS code, from the regional engine where it runs (also read by the working lives elsewhere, src/core2/jobs-elsewhere.ts). */
export function stateUnemployment(api: CoreAPI): Map<string, number> {
  const out = new Map<string, number>();
  if (!api.state.modules.has(REGIONAL_MODULE_ID)) return out;
  const latest = (
    api.moduleState("macro").table("state").get("macro:state") as
      { latestMonth?: string } | undefined
  )?.latestMonth;
  if (!latest) return out;
  const months = api
    .moduleState(REGIONAL_MODULE_ID)
    .table("months")
    .query("byMonth", [latest]) as unknown as RegionMonth[];
  for (const fips of new Set(months.map((row) => row.stateFips)))
    out.set(
      STATES[fips]?.usps ?? fips,
      stateFigures(months, fips).unemploymentPct,
    );
  return out;
}

/** After-tax real income at these wages in a state, kept for the month. */
function netIncome(
  api: CoreAPI,
  rt: Runtime,
  usps: string,
  wages: number,
  renter = false,
): number {
  const key = `${usps}|${wages}|${renter ? "rent" : "own"}`;
  let value = rt.netCache.get(key);
  if (value === undefined) {
    value =
      Math.max(1, wages - stateIncomeTax(api, rt, usps, wages)) /
      ((renter ? renterPriceLevel : priceLevel)(FIPS_OF.get(usps) ?? "") / 100);
    rt.netCache.set(key, value);
  }
  return value;
}

/** What draws a person with these wages from one state to another, by cause, in log units. */
export function pullBetween(
  api: CoreAPI,
  rt: Runtime,
  from: string,
  to: string,
  wages: number,
  jobless: ReadonlyMap<string, number>,
  renter = false,
): Record<string, number> {
  const income =
    countedParameter("countedMovesIncomeElasticity") *
    Math.log(
      netIncome(api, rt, to, wages, renter) /
        netIncome(api, rt, from, wages, renter),
    );
  const here = jobless.get(from),
    there = jobless.get(to);
  const jobs =
    here !== undefined && there !== undefined
      ? countedParameter("countedMovesUnemploymentPull") * (here - there)
      : 0;
  return { income, jobs };
}

const sum = (row: Record<string, number>) =>
  Object.values(row).reduce((n, v) => n + v, 0);

/**
 * The share of the town's state outside its counted places at the opening:
 * the state's people by the regional data less the counted people, none where
 * the counted places are the whole jurisdiction (Washington, D.C.).
 */
function openingRestShare(core: CoreState, townState: string): number {
  const residents = residentsRuntime(core);
  const row = Object.values(STATES).find((st) => st.usps === townState);
  if (!residents || !row?.population) return 1;
  const counted = countedPeople(residents);
  return Math.max(0, row.population - counted) / row.population;
}

/**
 * Each state's people and movers this month, read from the country tier
 * (country-tier design: the tier is the one holder of every state's
 * people). Nothing here is a count
 * of its own: the view is rebuilt from the tier each month, and a move of the
 * town's own households is part of the tier's own flows from its state. A
 * world whose economy does not run has no tier and so no moves.
 */
function viewStates(api: CoreAPI, rt: Runtime): void {
  const { states, flows } = countryFlowsIn(api);
  rt.states.clear();
  rt.flows.clear();
  rt.draw.clear();
  rt.abroad.clear();
  const adults = states.map((st) => st.cells.reduce((n, c) => n + c.people, 0));
  const total = adults.reduce((n, v) => n + v, 0) || 1;
  states.forEach((st, index) => {
    const people = COARSE.map(() => 0);
    people[0] = st.children;
    for (const cell of st.cells) people[cell.band + 1]! += cell.people;
    rt.states.set(st.usps, { usps: st.usps, fips: st.fips, people });
    const flow = flows[index];
    if (flow) {
      // A child moves with the household: the band's share is its adults' mean.
      const adultShare =
        flow.leavingByBand.reduce((n, v) => n + v, 0) /
        Math.max(1, COUNTRY_AGE_BANDS.length);
      rt.flows.set(st.usps, {
        leaving: [adultShare, ...flow.leavingByBand],
        toShare: new Map(
          states.map((to, d) => [to.usps, flow.toShare[d] ?? 0] as const),
        ),
      });
    }
    rt.draw.set(st.usps, (adults[index]! / total) * st.draw);
    rt.abroad.set(st.usps, st.abroadYear);
  });
}

export function runtimeOf(api: CoreAPI): Runtime | undefined {
  const core = api.state as CoreState;
  let rt = runtimes.get(core);
  if (rt) return rt;
  const town = townPlaceOf(core);
  const key = town ? placeStateKey(town) : undefined;
  if (!key) return undefined;
  rt = {
    states: new Map(),
    flows: new Map(),
    draw: new Map(),
    abroad: new Map(),
    restShare: 1,
    townState: key.slice("US-".length),
    leave: new Map(),
    arrive: new Map(),
    holdNorm: new Map(),
    roomCapacity: new Map(),
    roomQueue: new Map(),
    serial: 0,
    netCache: new Map(),
  };
  viewStates(api, rt);
  rt.restShare = openingRestShare(core, rt.townState);
  runtimes.set(core, rt);
  return rt;
}

/** A household's counted members' ages on a date, in member order. */
function agesOf(
  residents: ResidentsRuntime,
  h: CountedHousehold,
  date: string,
): number[] {
  const store = residents.store;
  return store.countedMembers(h).map((m) => ageOn(store.born[m]!, date));
}

/** What holds a household in place (log units): a home owned, children at home. */
function holdOf(
  residents: ResidentsRuntime,
  h: CountedHousehold,
  date: string,
  adultAge: number,
  /** Its members' ages on the date, when the caller has them (`agesOf`). */
  ages?: readonly number[],
): number {
  return sum(holdsOf(residents, h, date, adultAge, ages));
}

/** What holds a counted household where it lives, by cause: a home it owns, children at home. */
function holdsOf(
  residents: ResidentsRuntime,
  h: CountedHousehold,
  date: string,
  adultAge: number,
  ages: readonly number[] = agesOf(residents, h, date),
): Record<string, number> {
  const holds: Record<string, number> = {};
  // A household without a home (removed by an eviction or a foreclosure) has
  // no owned home to hold it, as a renter has none.
  if (h.tenure === "mortgage" || h.tenure === "other")
    holds.owner = MOVES.movesOwnerHold!.value;
  const children = ages.some((age) => age < adultAge);
  if (children) holds.children = MOVES.movesChildrenHold!.value;
  return holds;
}

/** The housing engine's module id (kept here so the moves engine does not import housing). */
const HOUSING_MODULE = "housing";
/** How the housing engine's eviction case ids begin (`eviction:<lease>:<date>`). */
const EVICTION_CASE_PREFIX = "eviction:";

/**
 * What pushes a counted household toward leaving, by cause (log units): an
 * eviction's push while the eviction leaves it without a home (the housing
 * engine's status row names the case), the same parameter a full person's
 * pull takes once on the day from a housing.eviction (moves.ts EVENT_PULLS).
 * A foreclosure records no eviction, so a household it removed takes no
 * push, as a full owner takes none. Here the push raises the household's
 * rate of leaving for as long as it is without a home.
 */
function pushesOf(api: CoreAPI, h: CountedHousehold): Record<string, number> {
  if (h.tenure !== "none" || !api.state.modules.has(HOUSING_MODULE)) return {};
  const status = api.moduleState(HOUSING_MODULE).table("statuses").get(h.id) as
    { caseId?: string } | undefined;
  if (!status?.caseId?.startsWith(EVICTION_CASE_PREFIX)) return {};
  // stopgapId: SG-WORLD-counted-evicted-push-rate
  return { evicted: MOVES.movesEvictedPull!.value };
}

/**
 * A move's causes on the same keys a full person's departure records: the
 * yearly rate of leaving at the movers' age (lifeStage; for a household of
 * minors alone, its group's yearly rate, groupRate), the outcome web's
 * factor on leaving (web, in log units), each hold against it (hold:...),
 * and the pull toward another state (income, jobs).
 */
function causesOf(
  rate: number,
  web: number,
  holds: Readonly<Record<string, number>>,
  pull: Readonly<Record<string, number>>,
  /** The group's yearly rate, for a household that had no adult to weigh. */
  groupRate?: number,
): Record<string, number> {
  return {
    ...(groupRate === undefined ? { lifeStage: rate } : { groupRate }),
    ...(web !== 1 ? { web: Math.log(web) } : {}),
    ...Object.fromEntries(
      Object.entries(holds).map(([key, value]) => [`hold:${key}`, -value]),
    ),
    ...pull,
  };
}

/** A counted household's head's age and wages per adult (the pull is read for them). */
function headOf(
  residents: ResidentsRuntime,
  h: CountedHousehold,
  date: string,
  adultAge: number,
  ages: readonly number[] = agesOf(residents, h, date),
): { age: number; wages: number; adults: number } {
  let age = 0,
    adults = 0;
  for (const a of ages) {
    age = Math.max(age, a);
    if (a >= adultAge) adults++;
  }
  return {
    age,
    adults,
    wages: householdIncome(residents, h) / 100 / Math.max(1, adults),
  };
}

/** The state a counted place lies in: a town's or county's record names it, and a state-level place's id is the state's own. */
export const stateOfCountedPlace = (placeId: string) =>
  (placeStateKey(placeId) ?? coreStateKeyOfPlaceholderId(placeId))?.slice(
    "US-".length,
  );
/**
 * The state a counted household lives in. The town's counted households keep
 * the place id of their governing unit, which the place lookup may not know
 * (a consolidated town, a balance); they are the town's people, in its state.
 */
const homeStateOf = (rt: Pick<Runtime, "townState">, placeId: string) =>
  stateOfCountedPlace(placeId) ?? rt.townState;

/**
 * The state a household of the world's places lives in, by the same rule as
 * homeStateOf: its place's state, else the town's (the place id of the
 * town's governing unit, which the lookup may not know).
 */
export function householdStateOf(
  core: CoreState,
  placeId: string,
): string | undefined {
  const town = townPlaceOf(core);
  return (
    stateOfCountedPlace(placeId) ??
    (town ? stateOfCountedPlace(town) : undefined)
  );
}

function month(api: CoreAPI): void {
  const core = api.state as CoreState;
  const residents = residentsRuntime(core);
  const rt = runtimeOf(api);
  if (!residents || !rt) return;
  const date = api.state.date;
  const adultAge = api.parameter("votingAge");
  rt.netCache.clear();
  // This month's states and movers, from the country tier.
  viewStates(api, rt);
  if (!rt.states.size) return;
  const jobless = stateUnemployment(api);
  const stateList = [...rt.states.values()];
  const inState = countedParameter("countedMovesInStateShare");
  const store = residents.store;
  const source: Source = {
    tag: "ESTIMATED",
    asOf: date,
    citation:
      "Moves from causes: the country tier's leaving by age band and its destinations (its opening ACS rates times how pay after tax, prices and work compare); CPS ASEC 2023 in-state share; the state income tax in force (every state's, through the laws engine); BEA regional price parities; the regional engine's unemployment.",
    estimatedFrom:
      "Each counted group's expected movers toward each place accrue monthly from its pull; a whole household moves when one is due.",
  };
  // Holds normalized so a place's average leaving rate is the ACS rate.
  for (const placeId of new Set(
    [...store.liveHouseholds()].map((h) => h.placeId),
  ))
    if (!rt.holdNorm.has(placeId)) {
      let people = 0,
        held = 0;
      for (const h of store.liveHouseholds()) {
        // Group-quarters rooms move with their institution, not the ACS rates.
        if (h.placeId !== placeId || h.tenure === "group") continue;
        const n = store.weightedCount(h);
        people += n;
        held += n * Math.exp(-holdOf(residents, h, date, adultAge));
      }
      rt.holdNorm.set(placeId, held > 0 ? people / held : 1);
    }

  // Each home state's yearly rate of moving at an age, by the tier's own
  // rule: the share of its band leaving for another state this month, a
  // year of it, over the share of all movers who leave the state.
  const rateAt = (home: string, age: number) =>
    yearlyRate(rt, home, coarseIndex(age, adultAge), inState);
  const homeByPlace = new Map<PlaceId, string>();
  const homeOf = (placeId: PlaceId) => {
    let home = homeByPlace.get(placeId);
    if (home === undefined)
      homeByPlace.set(placeId, (home = homeStateOf(rt, placeId)));
    return home;
  };
  // Each group's keys in `rt.leave` toward every state, in `stateList` order.
  const stateIndex = new Map(stateList.map((s, i) => [s.usps, i]));
  const groupKeys = new Map<number, string[]>();
  const keysOf = (g: number) => {
    let keys = groupKeys.get(g);
    if (!keys) {
      const id = store.groups[g]!.id;
      keys = stateList.map((s) => `${id}|${s.usps}`);
      groupKeys.set(g, keys);
    }
    return keys;
  };
  const leaveKey = (g: number, usps: string) => {
    const i = stateIndex.get(usps);
    return i === undefined ? `${store.groups[g]!.id}|${usps}` : keysOf(g)[i]!;
  };

  // 1. Counted groups weigh every other state, and the rest of their own.
  const pullCache = new Map<string, Record<string, number>>();
  const pullFor = (from: string, to: string, wages: number, renter = false) => {
    const key = `${from}|${to}|${Math.round(wages / 1000)}|${renter ? "rent" : "own"}`;
    let row = pullCache.get(key);
    if (!row) {
      row = pullBetween(
        api,
        rt,
        from,
        to,
        Math.round(wages / 1000) * 1000,
        jobless,
        renter,
      );
      pullCache.set(key, row);
    }
    return row;
  };
  const webCache = new Map<string, number>();
  // What sets a household's leaving: each adult's own age sets their rate of
  // leaving (ACS), and the household goes as one, at its adults' average,
  // with its children. The outcome web's links land on it by its adults'
  // age, tenure, kind and income, as they land on a full person in town
  // (moves.ts): the same factors, once per kind of household this month.
  const leavingOf = (
    h: CountedHousehold,
    home: string,
    ages: readonly number[],
  ) => {
    let rates = 0,
      adultAges = 0,
      adults = 0;
    for (const age of ages)
      if (age >= adultAge) {
        rates += rateAt(home, age);
        adultAges += age;
        adults++;
      }
    const group = store.groups[h.group]!;
    // A household of minors alone has no adult to set a rate: the monthly
    // weighing skips it, and it leaves only as its group's due movers come
    // round to it (see `reasonsFor`).
    const age = adults ? Math.round(adultAges / adults) : 0;
    const webKey = `${h.placeId}|${h.group}|${age}`;
    let web = webCache.get(webKey);
    if (web === undefined) {
      // A household without a home weighs leaving as a renter does.
      const renting = h.tenure === "rent" || h.tenure === "none";
      const subject: Subject = {
        age,
        tenure: renting ? "rent" : "own",
        householdKind: group.kind,
        incomeFifth: group.incomeBand,
        work: group.work,
      };
      web =
        webFactorFor(api, h.placeId, "population.out-migration", subject) *
        (renting
          ? webFactorFor(api, h.placeId, "housing.renter-moves", subject)
          : 1);
      webCache.set(webKey, web);
    }
    return { rate: adults ? rates / adults : 0, web };
  };
  const groupPulls = new Map<
    number,
    { total: number; byCause: Record<string, number>; people: number }
  >();
  // Each household's people times its age's leaving rate and what holds it,
  // summed by group, home state and wage step: households alike in these
  // weigh the same places the same way.
  const alike = new Map<
    string,
    {
      group: number;
      home: string;
      wages: number;
      renter: boolean;
      weight: number;
      people: number;
    }
  >();
  for (const h of store.liveHouseholds()) {
    // An institution admits and discharges its residents (not built yet):
    // nobody leaves group quarters by the households' leaving rates.
    if (h.tenure === "group") continue;
    const home = homeOf(h.placeId);
    if (!rt.states.has(home)) continue;
    // Real people: a record stands for as many households as its weight says.
    const people = store.weightedCount(h);
    if (!people) continue;
    const ages = agesOf(residents, h, date);
    const head = headOf(residents, h, date, adultAge, ages);
    if (head.adults === 0) continue;
    const { rate, web } = leavingOf(h, home, ages);
    const pushes = pushesOf(api, h);
    if (pushes.evicted !== undefined)
      api.stopgap("SG-WORLD-counted-evicted-push-rate");
    const weight =
      people *
      rate *
      web *
      Math.exp(sum(pushes) - holdOf(residents, h, date, adultAge, ages)) *
      rt.holdNorm.get(h.placeId)!;
    const wages = Math.round(head.wages / 1000) * 1000;
    // A household without a home weighs prices as a renter does.
    const renter = h.tenure === "rent" || h.tenure === "none";
    const key = `${h.group}|${home}|${wages}|${renter ? "rent" : "own"}`;
    const row = alike.get(key) ?? {
      group: h.group,
      home,
      wages,
      renter,
      weight: 0,
      people: 0,
    };
    row.weight += weight;
    row.people += people;
    alike.set(key, row);
  }
  // The share of a home state living outside the counted places: where the
  // counted places are the whole jurisdiction (Washington, D.C.) there is no
  // remainder to move to, and a leaver within the state lands in one of the
  // counted places again, so it is no departure. Where the remainder is the
  // whole state, the share is one and nothing changes.
  // Where people go: each state's size times its draw, the tier's place
  // constant fitted once at the opening, times the pull below.
  const attractOf = (usps: string) => rt.draw.get(usps) ?? 0;
  const remainderShare = (home: string) =>
    home === rt.townState ? rt.restShare : 1;
  // Each state's share of the movers out of a home state and its pull at a
  // wage step, in `stateList` order (none for home), worked out once.
  const destRows = new Map<
    string,
    ({
      share: number;
      exp: number;
      causes: [string, number][];
    } | null)[]
  >();
  const destRowsOf = (home: string, wages: number, renter: boolean) => {
    const key = `${home}|${wages}|${renter ? "rent" : "own"}`;
    let rows = destRows.get(key);
    if (!rows) {
      const parts = new Map(
        stateList.map((dest) => [
          dest.usps,
          pullFor(home, dest.usps, wages, renter),
        ]),
      );
      // The kept attractiveness times the pull, over every other state's.
      let norm = 0;
      for (const dest of stateList)
        if (dest.usps !== home)
          norm += attractOf(dest.usps) * Math.exp(sum(parts.get(dest.usps)!));
      rows = stateList.map((dest) => {
        if (dest.usps === home) return null;
        const row = parts.get(dest.usps)!;
        return {
          share: norm > 0 ? attractOf(dest.usps) / norm : 0,
          exp: Math.exp(sum(row)),
          causes: Object.entries(row),
        };
      });
      destRows.set(key, rows);
    }
    return rows;
  };
  for (const row of alike.values()) {
    const keys = keysOf(row.group);
    const summary = groupPulls.get(row.group) ?? {
      total: 0,
      byCause: {},
      people: 0,
    };
    summary.people += row.people;
    // Out of state: each state by its people and its pull.
    const dests = destRowsOf(row.home, row.wages, row.renter);
    for (let i = 0; i < dests.length; i++) {
      const d = dests[i];
      if (!d) continue;
      const due = (row.weight * (1 - inState) * d.share * d.exp) / 12;
      const key = keys[i]!;
      rt.leave.set(key, (rt.leave.get(key) ?? 0) + due);
      summary.total += due;
      for (const [cause, value] of d.causes)
        summary.byCause[cause] = (summary.byCause[cause] ?? 0) + due * value;
    }
    // Within the state (same taxes and prices).
    const due = (row.weight * inState * remainderShare(row.home)) / 12;
    const key = leaveKey(row.group, row.home);
    rt.leave.set(key, (rt.leave.get(key) ?? 0) + due);
    summary.total += due;
    groupPulls.set(row.group, summary);
  }
  for (const [g, summary] of groupPulls) {
    const cause = summary.total > 0 ? summary.byCause : {};
    api
      .moduleState(COUNTED_MOVES_MODULE_ID)
      .table(PULLS_TABLE)
      .put({
        id: store.groups[g]!.id,
        date,
        people: summary.people,
        moversPerMonth: summary.total,
        byCause: Object.fromEntries(
          Object.entries(cause).map(([k, v]) => [
            k,
            summary.total ? v / summary.total : 0,
          ]),
        ),
      } as unknown as ModuleRow);
  }
  // A whole household leaves as its place's movers come due, rounded to the
  // nearest household (the balance carries): from the group whose movers
  // are most due, toward the place that drew most; within a group,
  // households go in a fixed order.
  const dueOf = (g: number) => {
    const keys = keysOf(g);
    const rows: (readonly [string, number])[] = [];
    let total = 0;
    for (let i = 0; i < stateList.length; i++) {
      const v = rt.leave.get(keys[i]!) ?? 0;
      if (v === 0) continue;
      rows.push([stateList[i]!.usps, v]);
      total += v;
    }
    return { rows, total };
  };
  const byPlace = new Map<PlaceId, number[]>();
  for (const g of groupPulls.keys()) {
    const first = store.households[[...store.groups[g]!.households][0]!];
    if (!first) continue;
    const list = byPlace.get(first.placeId) ?? [];
    list.push(g);
    byPlace.set(first.placeId, list);
  }
  const orders = new Map<number, CountedHousehold[]>();
  let hashes = orderHashes.get(core);
  if (!hashes || hashes.seed !== core.seed) {
    hashes = { seed: core.seed, byId: new Map() };
    orderHashes.set(core, hashes);
  }
  const byId = hashes.byId;
  const orderHash = (h: CountedHousehold) => {
    let hash = byId.get(h.id);
    if (hash === undefined)
      byId.set(h.id, (hash = stableHash(`${core.seed}:moves:${h.id}`)));
    return hash;
  };
  const orderOf = (g: number) => {
    let order = orders.get(g);
    if (!order) {
      order = [...store.groups[g]!.households]
        .map((i) => store.households[i]!)
        .filter((h) => !h.gone && store.countedCount(h) > 0)
        .map((h) => [orderHash(h), h] as const)
        .sort((a, b) => (a[0] < b[0] ? -1 : 1))
        .map(([, h]) => h);
      orders.set(g, order);
    }
    return order;
  };
  for (const groupsHere of byPlace.values()) {
    const dues = new Map(groupsHere.map((g) => [g, dueOf(g)]));
    for (;;) {
      let placeDue = 0;
      let g: number | undefined;
      for (const [k, d] of dues) {
        placeDue += d.total;
        if (
          orderOf(k).length &&
          (g === undefined ||
            d.total > dues.get(g)!.total ||
            (d.total === dues.get(g)!.total &&
              store.groups[k]!.id < store.groups[g]!.id))
        )
          g = k;
      }
      if (g === undefined) break;
      const next = orderOf(g)[0]!;
      const size = store.weightedCount(next);
      if (placeDue < size / 2) break;
      orderOf(g).shift();
      const group = store.groups[g]!;
      const dests = dues.get(g)!.rows;
      const home = homeOf(next.placeId);
      const to =
        [...dests]
          .filter(([, v]) => v > 0)
          .sort((a, b) => b[1] - a[1] || (a[0] < b[0] ? -1 : 1))[0]?.[0] ??
        home;
      // Take its people from the group's due movers, toward that place
      // first; what it lacks is owed by the group from then on.
      let take = size;
      for (const [usps] of [...dests].sort((a, b) =>
        a[0] === to ? -1 : b[0] === to ? 1 : b[1] - a[1],
      )) {
        const k = leaveKey(g, usps);
        const have = rt.leave.get(k) ?? 0;
        const used = Math.max(0, Math.min(have, take));
        rt.leave.set(k, have - used);
        take -= used;
        if (take <= 0) break;
      }
      if (take > 0) {
        const k = leaveKey(g, to);
        rt.leave.set(k, (rt.leave.get(k) ?? 0) - take);
      }
      dues.set(g, dueOf(g));
      const ages = agesOf(residents, next, date);
      // What weighed toward its going, read before it leaves the counts: its
      // age's rate and the web against what held it, and toward another
      // state its pull (within the state taxes and prices are the same).
      const head = headOf(residents, next, date, adultAge, ages);
      const leaving = leavingOf(next, home, ages);
      const pulled = groupPulls.get(g);
      // A household with adults weighed its own adults' rate. One of minors
      // alone was never weighed: its group's movers came due and the group's
      // order reached it, so what weighed is the group's yearly rate of
      // leaving across the households it did weigh.
      const reasons = {
        ...causesOf(
          leaving.rate,
          // The web's links land on a household by its adults; none, none.
          head.adults ? leaving.web : 1,
          holdsOf(residents, next, date, adultAge, ages),
          to === home
            ? {}
            : pullFor(
                home,
                to,
                head.wages,
                next.tenure === "rent" || next.tenure === "none",
              ),
          !head.adults && pulled?.people
            ? (pulled.total * 12) / pulled.people
            : undefined,
        ),
        ...(head.adults ? pushesOf(api, next) : {}),
      };
      const returned = returnedMembersOf(core, next);
      departCountedHousehold(core, next.id);
      returnedMembersLeave(api, returned, next.placeId, to);
      record(api, {
        id: `move:out:${next.id}:${date}`,
        date,
        direction: "out",
        householdId: next.id,
        groupId: group.id,
        fromPlace: next.placeId,
        toPlace: to === home ? `${to}:rest-of-state` : to,
        people: size,
        reasons,
      });
    }
  }

  // 2. Who comes to the town's state this month, by the tier's own flows:
  // each other state's leavers that the town's state takes, by band.
  const home = rt.states.get(rt.townState);
  const placePeople = new Map<PlaceId, number>();
  // Newcomers come to households, not to group quarters.
  for (const h of store.liveHouseholds())
    if (h.tenure !== "group")
      placePeople.set(
        h.placeId,
        (placePeople.get(h.placeId) ?? 0) + store.weightedCount(h),
      );
  // The full people living in those places are residents too: newcomers
  // arrive in proportion to everyone who lives there at the arriving age, not
  // only to the part held as counted households, so a place's full people
  // are replaced as surely as its counted ones.
  const agedHere = new Map<PlaceId, number[]>();
  const addResident = (placeId: PlaceId, age: number, n: number) => {
    const row = agedHere.get(placeId) ?? COARSE.map(() => 0);
    row[coarseIndex(age, adultAge)]! += n;
    agedHere.set(placeId, row);
  };
  for (const h of store.liveHouseholds())
    if (h.tenure !== "group")
      for (const m of store.countedMembers(h))
        addResident(h.placeId, ageOn(store.born[m]!, date), store.weightOf(h));
  for (const person of core.people.values())
    if (
      person.alive &&
      placePeople.has(person.placeId) &&
      !core.households.get(person.householdId)?.quarters
    )
      addResident(person.placeId, ageOn(person.birthDate, date), 1);
  const living = [...agedHere.values()].reduce(
    (n, row) => n + row.reduce((a, c) => a + c, 0),
    0,
  );
  if (home) {
    const stateTotal = home.people.reduce((a, b) => a + b, 0);
    const toCounted = (people: number) =>
      stateTotal > 0 ? (people * living) / stateTotal : 0;
    const due = (origin: string, band: number, people: number) => {
      const key = `${origin}|${band}`;
      rt.arrive.set(key, (rt.arrive.get(key) ?? 0) + toCounted(people));
    };
    for (const from of stateList) {
      if (from === home) continue;
      const flow = rt.flows.get(from.usps);
      const share = flow?.toShare.get(home.usps) ?? 0;
      if (!flow || !share) continue;
      COARSE.forEach((_, band) =>
        due(from.usps, band, from.people[band]! * flow.leaving[band]! * share),
      );
    }
    // In-state movers from the rest of the state into its counted places:
    // the state's own movers who stay in it, by the CPS share.
    const own = rt.flows.get(home.usps);
    if (own)
      COARSE.forEach((_, band) =>
        due(
          home.usps,
          band,
          (home.people[band]! * rt.restShare * own.leaving[band]! * inState) /
            Math.max(1e-9, 1 - inState),
        ),
      );
    // stopgapId: SG-LIVES-abroad-arrivals-no-pull (the flow is sized by the sourced rate and does not respond to a place's pull)
    // People from abroad: the state takes in its rate of its people a year
    // (the age mix of the nation's arrivals from abroad); its counted places
    // take their share to settle as households.
    const monthly = (stateTotal * abroadRate(api, home.usps)) / 12;
    COARSE.forEach(([name], band) =>
      due(ABROAD, band, monthly * (RATES.national.abroadAgeShare[name] ?? 0)),
    );
  }
  // 3. Whole households arrive as their people come due.
  arrivals(api, rt, residents, placePeople, agedHere, source, jobless);
  // Institutions fill the rooms their residents left (deaths, fill-ins).
  admitToRooms(api, rt, residents, source);
}

/**
 * Whether a counted household can move to another place now
 * (`moveCountedHouseholdAway`): the moves engine is running and knows the
 * town's state.
 */
export function countedMovesRunning(api: CoreAPI): boolean {
  return (
    (api.state as CoreState).modules.has(COUNTED_MOVES_MODULE_ID) &&
    runtimeOf(api) !== undefined
  );
}

/**
 * A counted household moves to another place now, for a cause another engine
 * recorded (an evicted household doubling up with a relative there): it
 * leaves the counts as a departure does, its people join that place's state
 * at the coarse grain (the rest of the state, where it is the town's own),
 * and the move is recorded with the causes given. False when there is no
 * such counted household or the moves engine is not running.
 */
export function moveCountedHouseholdAway(
  api: CoreAPI,
  householdId: string,
  toPlaceId: string,
  reasons: Readonly<Record<string, number>>,
): boolean {
  const core = api.state as CoreState;
  const residents = residentsRuntime(core);
  const rt = core.modules.has(COUNTED_MOVES_MODULE_ID)
    ? runtimeOf(api)
    : undefined;
  const h = residents?.store.liveHousehold(householdId);
  if (!residents || !rt || !h) return false;
  const store = residents.store;
  const date = core.date;
  const home = homeStateOf(rt, h.placeId);
  const found = stateOfCountedPlace(toPlaceId);
  const to = found && rt.states.has(found) ? found : home;
  const group = store.groups[h.group]!;
  const size = store.weightedCount(h);
  const fromPlace = h.placeId;
  const returned = returnedMembersOf(core, h);
  departCountedHousehold(core, h.id);
  returnedMembersLeave(api, returned, fromPlace, to);
  record(api, {
    id: `move:out:${householdId}:${date}`,
    date,
    direction: "out",
    householdId,
    groupId: group.id,
    fromPlace,
    toPlace: to === home ? `${to}:rest-of-state` : to,
    people: size,
    reasons,
  });
  return true;
}

function countedPeople(residents: ResidentsRuntime): number {
  let n = 0;
  for (const h of residents.store.liveHouseholds())
    n += residents.store.weightedCount(h);
  return n;
}

function coarseIndex(age: number, adultAge: number): number {
  return age < adultAge ? 0 : age < 30 ? 1 : age < 45 ? 2 : age < 65 ? 3 : 4;
}

/** A state's yearly rate of moving at a coarse band, by the tier's rule: its month's share leaving the state, a year of it, over the share of movers who leave. */
function yearlyRate(
  rt: Runtime,
  usps: string,
  band: number,
  inState: number,
): number {
  const monthly = rt.flows.get(usps)?.leaving[band] ?? 0;
  return (monthly * 12) / Math.max(1e-9, 1 - inState);
}

function record(api: CoreAPI, row: MoveRecord): void {
  api
    .moduleState(COUNTED_MOVES_MODULE_ID)
    .table(TABLE)
    .put(row as unknown as ModuleRow);
}

/**
 * Newcomers: when an origin's arrivals for an age band reach a household,
 * one arrives, shaped like a counted household here whose head is that age
 * (the first in a fixed order this month); who they are is generated from
 * the world's seed, as all generation is.
 */
function arrivals(
  api: CoreAPI,
  rt: Runtime,
  residents: ResidentsRuntime,
  placePeople: ReadonlyMap<PlaceId, number>,
  agedHere: ReadonlyMap<PlaceId, readonly number[]>,
  source: Source,
  jobless: ReadonlyMap<string, number>,
): void {
  const core = api.state as CoreState;
  const store = residents.store;
  const date = api.state.date;
  const adultAge = api.parameter("votingAge");
  const templates = new Map<PlaceId, Map<number, CountedHousehold[]>>();
  for (const h of store.liveHouseholds()) {
    // A newcomer copying a room would join group quarters, and institutions
    // admit nobody yet: their rooms only empty as residents die or are met.
    // stopgapId: SG-GQ-no-turnover
    if (h.tenure === "group") continue;
    // A household without a home is no shape a newcomer arrives in.
    if (h.tenure === "none") continue;
    const members = store.countedMembers(h);
    if (!members.length) continue;
    let head = 0;
    for (const m of members) head = Math.max(head, ageOn(store.born[m]!, date));
    const byBand =
      templates.get(h.placeId) ?? new Map<number, CountedHousehold[]>();
    templates.set(h.placeId, byBand);
    const list = byBand.get(coarseIndex(head, adultAge));
    if (list) list.push(h);
    else byBand.set(coarseIndex(head, adultAge), [h]);
  }
  if (!placePeople.size) return;
  const rates = unplacedRates(residents, date);
  const places = [...templates.keys()].sort();
  for (const [key, due] of [...rt.arrive].sort((a, b) =>
    a[0] < b[0] ? -1 : 1,
  )) {
    const [origin, bandText] = key.split("|");
    const band = Number(bandText);
    // A newcomer settles in a place in proportion to everyone living there
    // at their age (full people too), as a household shaped like one of the
    // counted households there whose head is that age.
    const cumulative: number[] = [];
    let weightSum = 0;
    for (const place of places) {
      weightSum += agedHere.get(place)?.[band] ?? 0;
      cumulative.push(weightSum);
    }
    if (weightSum <= 0) continue;
    let left = due;
    for (;;) {
      const unit = (salt: string) =>
        Number.parseInt(
          stableHash(`${core.seed}:${salt}:${key}:${date}:${rt.serial}`).slice(
            0,
            8,
          ),
          16,
        );
      const at = cumulative.findIndex(
        (c) => c > (unit("arrival-place") / 0x1_0000_0000) * weightSum,
      );
      const byBand = templates.get(places[at < 0 ? places.length - 1 : at]!)!;
      const shapes =
        byBand.get(band) ??
        byBand.get(2) ??
        [...byBand.entries()].sort((x, y) => x[0] - y[0])[0]![1];
      const template = shapes[unit("arrival") % shapes.length]!;
      const size = store.weightedCount(template);
      if (left < size) break;
      left -= size;
      // They settle where the household they resemble lives.
      const placeId = template.placeId;
      const record = newcomers(api, rt, residents, template, origin!, source);
      // A newcomer household stands for as many as the one it resembles.
      admitCountedHousehold(core, record, store.weightOf(template));
      const h = store.households[store.householdOf.get(record.household.id)!]!;
      // Working-age newcomers share the place's unplaced workers at its rate.
      h.unplacedWorkers = jobShare(residents, h, rates, date);
      rt.serial++;
      api
        .moduleState(COUNTED_MOVES_MODULE_ID)
        .table(TABLE)
        .put({
          id: `move:in:${record.household.id}:${date}`,
          date,
          direction: "in",
          householdId: record.household.id,
          groupId: store.groups[h.group]!.id,
          fromPlace:
            origin === rt.townState ? `${origin}:rest-of-state` : origin!,
          toPlace: placeId,
          people: size,
          // The rate its people's age leaves where they came from, and
          // from another state the pull toward this one.
          reasons: causesOf(
            origin === ABROAD
              ? abroadRate(api, rt.townState)
              : yearlyRate(
                  rt,
                  origin!,
                  band,
                  countedParameter("countedMovesInStateShare"),
                ),
            1,
            {},
            origin === rt.townState || origin === ABROAD
              ? {}
              : pullBetween(
                  api,
                  rt,
                  origin!,
                  rt.townState,
                  headOf(residents, h, date, adultAge).wages,
                  jobless,
                ),
          ),
        } as unknown as ModuleRow);
    }
    rt.arrive.set(key, left);
  }
}

/**
 * Institutions admit as rooms empty (owner, Nov 8: group quarters turn over).
 * A place's rooms of one type are its beds: the people they held the first
 * month. When a resident dies or is filled in and the room stands empty, the
 * next person on the institution's waiting list moves in, a person drawn
 * like one the type's rooms hold (same ages, new identity, seeded), so a
 * nursing home, a dormitory or a barracks stays occupied the way its beds are.
 * Nobody is discharged yet: students and service members still age in place
 * (SG-GQ-no-turnover, narrowed to discharge).
 */
function admitToRooms(
  api: CoreAPI,
  rt: Runtime,
  residents: ResidentsRuntime,
  source: Source,
): void {
  const core = api.state as CoreState;
  const store = residents.store;
  const date = api.state.date;
  const rooms = new Map<string, CountedHousehold[]>();
  for (const h of store.liveHouseholds()) {
    if (!h.quarters) continue;
    const key = `${h.placeId}|${h.quarters}`;
    const list = rooms.get(key);
    if (list) list.push(h);
    else rooms.set(key, [h]);
  }
  for (const key of [...rooms.keys()].sort()) {
    const held = rooms.get(key)!;
    const filled = held.filter((h) => store.countedMembers(h).length > 0);
    const occupied = filled.reduce((n, h) => n + store.weightedCount(h), 0);
    const known = rt.roomCapacity.get(key);
    if (known === undefined) {
      rt.roomCapacity.set(key, occupied);
      continue;
    }
    let vacancy = known - occupied;
    if (!filled.length) continue;
    // The waiting list is read in order, never drawn: applicants queue in the
    // order of the type's own households (by id), and the next room goes to
    // the next in line.
    // stopgapId: SG-GQ-waiting-list-order
    const line = [...filled].sort((a, b) => (a.id < b.id ? -1 : 1));
    for (;;) {
      const turn = rt.roomQueue.get(key) ?? 0;
      const template = line[turn % line.length]!;
      const size = store.weightedCount(template);
      if (!(vacancy >= size) || size <= 0) break;
      rt.roomQueue.set(key, turn + 1);
      const record = drawHousehold(
        api,
        `${date}:${rt.serial}:room`,
        residents,
        template,
        "the institution's waiting list",
        source,
      );
      const withRoom = {
        ...record,
        household: { ...record.household, quarters: template.quarters! },
      };
      admitCountedHousehold(core, withRoom, store.weightOf(template));
      rt.serial++;
      vacancy -= size;
      api
        .moduleState(COUNTED_MOVES_MODULE_ID)
        .table(TABLE)
        .put({
          id: `move:in:${record.household.id}:${date}`,
          date,
          direction: "in",
          householdId: record.household.id,
          groupId:
            store.groups[
              store.households[store.householdOf.get(record.household.id)!]!
                .group
            ]!.id,
          fromPlace: "waiting-list",
          toPlace: template.placeId,
          people: size,
          reasons: {},
        } as unknown as ModuleRow);
    }
  }
}

/** A newcomer household's share of its place's unplaced workers, at the place's rate. */
function jobShare(
  residents: ResidentsRuntime,
  h: CountedHousehold,
  rate: ReadonlyMap<PlaceId, number>,
  date: string,
): number {
  return openWorkers(residents, h, date) * (rate.get(h.placeId) ?? 0);
}

/** Working-age counted members of a household without a recorded job. */
function openWorkers(
  residents: ResidentsRuntime,
  h: CountedHousehold,
  date: string,
): number {
  const store = residents.store;
  const from = countedParameter("countedWorkingAgeFrom"),
    below = countedParameter("countedWorkingAgeBelow");
  let n = 0;
  for (const m of store.countedMembers(h)) {
    const a = ageOn(store.born[m]!, date);
    if (a >= from && a < below) n++;
  }
  return Math.max(0, n - h.jobs.filter((j) => j.endsAt === undefined).length);
}

/**
 * Each place's unplaced workers per open working-age member, today: people
 * over people, so each record counts for as many households as it stands for
 * (a record of one household and a record of ninety are not one vote each).
 */
export function unplacedRates(
  residents: ResidentsRuntime,
  date: string,
): Map<PlaceId, number> {
  const workers = new Map<PlaceId, number>(),
    open = new Map<PlaceId, number>();
  for (const h of residents.store.liveHouseholds()) {
    // Newcomers are households: the rooms' pool is apart from theirs.
    if (h.quarters) continue;
    const weight = residents.store.weightOf(h);
    workers.set(
      h.placeId,
      (workers.get(h.placeId) ?? 0) + h.unplacedWorkers * weight,
    );
    open.set(
      h.placeId,
      (open.get(h.placeId) ?? 0) + openWorkers(residents, h, date) * weight,
    );
  }
  return new Map(
    [...open].map(([placeId, n]) => [
      placeId,
      n > 0 ? (workers.get(placeId) ?? 0) / n : 0,
    ]),
  );
}

function newcomers(
  api: CoreAPI,
  rt: Runtime,
  residents: ResidentsRuntime,
  template: CountedHousehold,
  origin: string,
  source: Source,
): ResidentHouseholdRecord {
  return drawHousehold(
    api,
    `${api.state.date}:${rt.serial}`,
    residents,
    template,
    origin,
    source,
  );
}

/**
 * New people drawn like a counted household: new identities, names and
 * temperaments seeded from the world's seed and `salt` (the same salt, the
 * same people). Arrivals (`newcomers`) draw whole households; `drawnResident`
 * draws one member.
 */
function drawHousehold(
  api: CoreAPI,
  /** What makes these people this one draw. */
  salt: string,
  residents: ResidentsRuntime,
  template: CountedHousehold,
  origin: string,
  source: Source,
  /** Draw only this member of the template (a lone adult), not the household. */
  only?: number,
): ResidentHouseholdRecord {
  const core = api.state as CoreState;
  const store = residents.store;
  const members = only === undefined ? store.countedMembers(template) : [only];
  const householdId = createStableId(
    "household",
    `${core.seed}:${COUNTED_MOVES_MODULE_ID}:${template.id}:${salt}`,
  );
  const ids = members.map((m) =>
    createStableId(
      "person",
      `${core.seed}:${COUNTED_MOVES_MODULE_ID}:${store.ids[m]}:${salt}`,
    ),
  );
  // Names come from the place's own counted people (generation is seeded).
  const pickName = (key: string, gender: string | undefined) => {
    const n = store.memberCount;
    for (let i = 0; i < 64; i++) {
      const m =
        Number.parseInt(
          stableHash(`${core.seed}:${key}:${i}`).slice(0, 8),
          16,
        ) % n;
      if (!gender || store.text(store.genderIx[m]!) === gender) return m;
    }
    return 0;
  };
  const familySource = pickName(`${householdId}:family`, undefined);
  const traits = openingTemperaments(
    members.map((m, i) => ({
      id: ids[i]!,
      birthDate: store.born[m]! as IsoDate,
      ...(store.text(store.genderIx[m]!)
        ? { gender: store.text(store.genderIx[m]!)! }
        : {}),
      parents: [],
    })),
    { seed: core.seed, startedAt: core.startedAt as IsoDate },
  );
  const people: PersonInput[] = members.map((m, i) => {
    const gender = store.text(store.genderIx[m]!);
    const given = pickName(`${ids[i]}:given`, gender);
    return {
      id: ids[i]!,
      givenName: store.given[given]!,
      familyName: store.family[familySource]!,
      birthDate: store.born[m]! as IsoDate,
      placeId: template.placeId,
      householdId,
      tier: "weekly",
      traits: traits.get(ids[i]!) ?? {},
      liquidMinor: store.liquid[m]!,
      livingCostDailyMinor: store.living[m]!,
      source: {
        ...source,
        estimatedFrom: `Moved in from ${origin}: ${source.estimatedFrom ?? ""}`,
      },
      familyIds: ids.filter((id) => id !== ids[i]),
      knownIds: [],
      looks: gender ? { gender } : ({} as Record<string, string>),
      pastFacts: [],
    };
  });
  return {
    household: {
      id: householdId,
      placeId: template.placeId,
      memberIds: ids,
      source,
    },
    people,
    jobs: [],
    workCommitments: [],
    contracts: [],
  };
}

/**
 * One person drawn like a counted resident of a place: a lone member of a
 * counted household there, with a new identity, name and temperament seeded
 * from the world's seed and `salt` (the same salt, the same person). Nothing
 * is stored until the record is admitted (`admitCountedHousehold`). Callers
 * that need a person from the wider population, who is not one of the
 * counted records themselves, draw here.
 */
export function drawnResident(
  api: CoreAPI,
  templateHouseholdId: string,
  templateMemberId: string,
  salt: string,
): ResidentHouseholdRecord | null {
  const residents = residentsRuntime(api.state as CoreState);
  if (!residents) return null;
  const store = residents.store;
  const ix = store.householdOf.get(templateHouseholdId);
  if (ix === undefined) return null;
  const template = store.households[ix]!;
  const memberIx = store
    .countedMembers(template)
    .find((m) => store.ids[m] === templateMemberId);
  if (memberIx === undefined) return null;
  const source: Source = {
    tag: "ESTIMATED",
    asOf: api.state.date,
    citation:
      "Drawn from the place's counted people: a member of a household there, with a new identity and a temperament drawn from the opening's temperament model.",
    estimatedFrom: `A seeded draw (${salt}) like the counted household ${templateHouseholdId}.`,
  };
  return drawHousehold(
    api,
    salt,
    residents,
    template,
    "the wider population",
    source,
    memberIx,
  );
}

/**
 * A person drawn like a counted adult of the town aged between `ages` (inclusive): the first such
 * counted member of the place's counts is the template, and `salt` gives the same person each
 * time. Null when the counts hold no adult of that age (nobody is drawn). Nothing is stored until
 * the record is admitted.
 */
export function drawnAdult(
  api: CoreAPI,
  salt: string,
  ages: readonly [number, number],
): ResidentHouseholdRecord | null {
  const store = residentsRuntime(api.state as CoreState)?.store;
  if (!store) return null;
  for (const household of store.households) {
    for (const member of store.countedMembers(household)) {
      const birth = store.born[member];
      if (birth === undefined) continue;
      const age = ageOn(birth, api.state.date);
      if (age < ages[0] || age > ages[1]) continue;
      return drawnResident(api, household.id, store.ids[member]!, salt);
    }
  }
  return null;
}

/** Each state's or territory's people as the moves engine last read them from the country tier. */
export function countedStatePeople(
  core: CoreState,
  usps: string,
): number | undefined {
  return runtimes
    .get(core)
    ?.states.get(usps)
    ?.people.reduce((a, b) => a + b, 0);
}

/** The pull toward each place for one counted group, as last weighed. */
export function countedPull(
  api: CoreAPI,
  groupId: string,
): { moversPerMonth: number; byCause: Record<string, number> } | undefined {
  return api
    .moduleState(COUNTED_MOVES_MODULE_ID)
    .table(PULLS_TABLE)
    .get(groupId) as unknown as
    { moversPerMonth: number; byCause: Record<string, number> } | undefined;
}

/** The moves recorded so far, oldest first. */
export function countedMoves(api: CoreAPI): readonly MoveRecord[] {
  return (
    api
      .moduleState(COUNTED_MOVES_MODULE_ID)
      .table(TABLE)
      .rows() as unknown as MoveRecord[]
  )
    .slice()
    .sort((a, b) =>
      a.date < b.date ? -1 : a.date > b.date ? 1 : a.id < b.id ? -1 : 1,
    );
}

/** The coarse people of a state or territory by age band (for proof and reach). */
export function coarsePlace(
  core: CoreState,
  usps: string,
): CoarsePlace | undefined {
  return runtimes.get(core)?.states.get(usps);
}

/**
 * A person met by someone living elsewhere comes out of the state's coarse
 * people, one in their age band, so a partnership adds no resident (one
 * model, two tiers). False when the state holds no one in that band.
 */
export function takeCoarsePerson(
  api: CoreAPI,
  placeId: string,
  age: number,
): boolean {
  const core = api.state as CoreState;
  if (!core.modules.has(COUNTED_MOVES_MODULE_ID)) return false;
  const usps = householdStateOf(core, placeId);
  const state = usps ? runtimeOf(api)?.states.get(usps) : undefined;
  if (!state) return false;
  const band = coarseIndex(age, api.parameter("votingAge"));
  if (!(state.people[band]! >= api.parameter("one"))) return false;
  state.people[band] = state.people[band]! - api.parameter("one");
  return true;
}

export const COUNTED_MOVES_MODULE: CoreModule = {
  id: COUNTED_MOVES_MODULE_ID,
  state: {
    schemaVersion: 1,
    tables: { [TABLE]: {}, [PULLS_TABLE]: {} },
  },
  onDay(api) {
    if (!api.state.date.endsWith("-01")) return;
    if (!residentsRuntime(api.state as CoreState)) return;
    month(api);
  },
};
