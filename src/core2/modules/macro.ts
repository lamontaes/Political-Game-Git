/**
 * The national economy and the central bank. Every state is kept as counts
 * (country-model.ts) and stepped once a month under the law in force and the
 * central bank's rate; the national figures are the states' sum; eight meetings a year
 * the board votes from each member's own view; each month's prices, pay and
 * demand reach every business as dated conditions; a decision reprices
 * prime-linked credit lines on its effective date.
 */
import { taxIndexOf } from "../tax-index";
import { addDays, makeIsoDate } from "../kernel/dates";
import { chooseAct } from "../choice";
import { reviewBoardTerms } from "../central-bank-appointments";
import { DEFAULT_DATA, extendData } from "../data";
import macroParameters from "../data/macro/parameters.json" with { type: "json" };
import {
  BOARD,
  RATE_PULL_PROVIDER,
  committeeDecision,
  generateBoard,
  meetingReadings,
  memberView,
  moveOfTarget,
  nextMeetingDate,
  rateOffers,
  rateOptions,
  votersOn,
  type BoardMember,
} from "../central-bank-board";
import {
  MACRO_HISTORY_SOURCE,
  checkBands,
  historyMonths,
  monthKey,
  publishedMonth,
  shiftMonth,
  countryMacroMonth,
  type MacroMonth,
  type NationFigures,
  type MacroParameter,
} from "../macro-model";
import countryParameters from "../data/country/parameters.json" with { type: "json" };
import {
  countryLaw,
  federalSpendingReader,
  startingLawReader,
} from "../country-law";
import { BUDGETS_MODULE_ID, budgetsOf, governments } from "./budgets";
import { stateStake } from "../budgets-treasury";
import {
  COUNTRY_AGE_BANDS,
  countryFlows,
  registerCountryFlowsReader,
  countryMoney,
  countryPartFigures,
  countryPeople,
  countryProblems,
  countryRules,
  countryStateFigures,
  openCountry,
  resolveCountryPart,
  stepCountry,
  COUNTRY_SECTORS,
  type CountryFlow,
  type CountryMonth,
  type CountryPart,
  type CountryPartCounts,
  type CountryRules,
  type CountrySector,
  type CountryState,
  type CountryTier,
} from "../country-model";
import employerSectors from "../data/country/employer-sectors.json" with { type: "json" };
import { classifyBusiness, sectorOfKind } from "../business-books";
import { placeStateKey } from "../place-map";
import { stopgap } from "../stopgaps";
import { residentsPart, residentsRuntime } from "./residents";
import { countryOpening } from "../country-opening";
/** The country tier's sectors and state rows, for screens that read a state's record (dev mode's Trace). */
export {
  COUNTRY_SECTORS,
  type CountrySector,
  type CountryState,
} from "../country-model";
import { bookkeeping } from "../bookkeeping";
import type { Parameter } from "../parameters";
import { JOBS_PARAMETERS } from "./jobs";
import {
  scaleOutsideSales,
  type OutsideSectorFactor,
} from "../residents-economy";
import { coreStateKeyOfPlaceholderId } from "../place-lookup";
import { firmStaffing } from "./jobs";
import { LAWS_MODULE_ID, stateLawInForce } from "./laws";
import { openingRegionMonths, stateFigures } from "../regional-model";
import { coarseSteps, type PreStartModule } from "../pre-start";
import {
  REGIONAL_PARAMETERS,
  openRegional,
  regionalFactors,
  regionalRegistered,
  regionalShocksStarting,
  stepRegional,
} from "./regional";
import type { CoreAPI, CoreData, CoreInput, CoreState, Source } from "../types";

/** Where a custom world's chosen national economy rides in the opening input (see worldGameOptions). */
export const CUSTOM_ECONOMY_KEY = "customEconomy";
export const MACRO_MODULE_ID = "macro";
/** The national economy's numbers: the central bank's and the published past's, and the country tier's (data/country). */
export const MACRO_PARAMETERS = {
  ...macroParameters,
  ...countryParameters,
} as unknown as Readonly<Record<string, Parameter>>;
const STATE_ID = "macro:state";
const COUNTRY_ID = "country";

interface MacroStateRow {
  id: string;
  openedAt: string;
  openingMonth: string;
  latestMonth: string;
  /** Target-range midpoint in force. */
  policyRatePct: number;
  placeIds: string[];
  /** The states' sums at the opening: the national figures since are the opening month's times how far these have moved. */
  countryBase: NationFigures;
}

/** One state's figures at the opening, kept so its regions can be read against them. */
export interface CountryStateBase {
  id: string;
  fips: string;
  unemploymentPct: number;
  jobs: number;
  hourlyPay: number;
  population: number;
  /** Each sector's sales in the opening month, dollars: what its outside buyers' factor is read against. */
  sectorSales: Readonly<Record<CountrySector, number>>;
}

export interface LinkedLineRow {
  id: string;
  facilityId: string;
  index: "prime";
  spreadPct: number;
  source: Source;
}

function recordSource(api: CoreAPI): Source {
  return {
    tag: "SOURCED",
    asOf: api.state.date,
    citation: (MACRO_HISTORY_SOURCE as Source).citation,
  };
}

function params(api: CoreAPI): MacroParameter {
  return (key) => api.parameter(key);
}

function store(api: CoreAPI) {
  return api.moduleState(MACRO_MODULE_ID);
}

function readState(api: CoreAPI): MacroStateRow | undefined {
  return store(api).table("state").get(STATE_ID) as MacroStateRow | undefined;
}

function dated(api: CoreAPI, estimatedFrom: string): Source {
  return {
    tag: "ESTIMATED",
    asOf: api.state.date,
    citation: (MACRO_HISTORY_SOURCE as Source).citation,
    estimatedFrom,
  };
}

function firstOfNextMonth(date: string, p: MacroParameter): string {
  return `${shiftMonth(monthKey(date), p("one"), p)}-01`;
}

function publishConditions(
  api: CoreAPI,
  state: MacroStateRow,
  row: MacroMonth,
): void {
  const opening = store(api)
    .table("months")
    .get(`macro-month:${state.openingMonth}`) as unknown as MacroMonth;
  const one = api.parameter("one"),
    hundred = api.parameter("macroHundred");
  const regional = regionalRegistered(api);
  const outside = outsideBySector(api);
  const books = (api.state as CoreState).finance.businesses;
  // A seller's sector, by its kind: read once per kind, never per flow.
  const sectorOf = new Map<string, CountrySector | null>();
  const sectorOfSeller = (sellerId: string) => {
    const kindId = books.get(sellerId)?.kindId;
    if (kindId === undefined) return null;
    let sector = sectorOf.get(kindId);
    if (sector === undefined)
      sectorOf.set(kindId, (sector = sectorOfKind(kindId)));
    return sector;
  };
  for (const placeId of state.placeIds) {
    // The place's region moves its pay, demand and price level against the nation's.
    const region = regional
      ? regionalFactors(api, placeId, opening, row)
      : { wage: one, demand: one, price: one };
    // The nation's prices, moved by the region's price level against the nation's.
    const prices = (row.priceIndex / opening.priceIndex) * region.price,
      demand =
        ((one + row.outputGapPct / hundred) /
          (one + opening.outputGapPct / hundred)) *
        region.demand;
    // Buyers outside the town follow the seller's own sector: its sales in the place's state and the nation's.
    const factors = outside(placeId);
    scaleOutsideSales(
      api.state as CoreState,
      placeId,
      (sellerId) => {
        const sector = sectorOfSeller(sellerId);
        return sector ? factors.get(sector) : undefined;
      },
      (organizationId) => firmStaffing(api, organizationId)?.serviceLevel,
    );
    api.addFinanceCondition({
      id: `macro-condition:${placeId}:${api.state.date}`,
      placeId,
      at: api.state.date,
      generalPriceFactor: prices,
      wagePriceFactor:
        (row.hourlyEarnings / opening.hourlyEarnings) * region.wage,
      // Demand outside the town: national output against its trend, relative to the opening month.
      macroDemandFactor: demand,
      source: dated(
        api,
        `National ${row.month}: prices, average hourly pay and output against trend, relative to ${state.openingMonth}${regional ? ", with the place's region's pay and jobs against the nation's" : ""}.`,
      ),
    });
  }
}

/**
 * Each sector's outside buyers this month, for a place: the sector's sales against the opening
 * month's, the state's own cell for the part of the sector that sells at home and the nation's
 * sum for the part traded between states (`tradedShare`). Sales are dollars, so prices are in
 * them. Read once a month per sector and state, never per flow; a place in no state follows
 * the nation.
 */
function outsideBySector(
  api: CoreAPI,
): (placeId: string) => ReadonlyMap<CountrySector, OutsideSectorFactor> {
  const rules = rulesOf(api);
  const zero = api.parameter("zero"),
    one = api.parameter("one"),
    hundred = api.parameter("macroHundred");
  const states = countryStates(api);
  const bases = new Map(
    (
      store(api).table("countryBases").rows() as unknown as CountryStateBase[]
    ).map((row) => [row.fips, row]),
  );
  const since = (now: number, then: number) => (then > zero ? now / then : one);
  const nationNow = new Map<CountrySector, number>(),
    nationThen = new Map<CountrySector, number>();
  for (const own of states)
    for (const cell of own.sectors) {
      nationNow.set(
        cell.sector,
        (nationNow.get(cell.sector) ?? zero) + cell.sales,
      );
      nationThen.set(
        cell.sector,
        (nationThen.get(cell.sector) ?? zero) +
          (bases.get(own.fips)?.sectorSales[cell.sector] ?? zero),
      );
    }
  const byState = new Map<
    string | null,
    ReadonlyMap<CountrySector, OutsideSectorFactor>
  >();
  const read = (key: string | null) => {
    const own = key ? states.find((row) => row.key === key) : undefined;
    const base = own && bases.get(own.fips);
    const factors = new Map<CountrySector, OutsideSectorFactor>();
    for (const sector of COUNTRY_SECTORS) {
      const nation = since(
        nationNow.get(sector) ?? zero,
        nationThen.get(sector) ?? zero,
      );
      const cell = own?.sectors.find((row) => row.sector === sector);
      if (!own || !base || !cell) {
        factors.set(sector, {
          factor: nation,
          followed: `${sector} sales in the nation (country)`,
        });
        continue;
      }
      const traded = rules.tradedShare[sector];
      factors.set(sector, {
        factor:
          (one - traded) * since(cell.sales, base.sectorSales[sector]) +
          traded * nation,
        followed: `${sector} sales in ${own.id} for the ${Math.round((one - traded) * hundred)}% sold at home and in the nation (country) for the ${Math.round(traded * hundred)}% traded`,
      });
    }
    return factors;
  };
  return (placeId) => {
    const key =
      placeStateKey(placeId) ?? coreStateKeyOfPlaceholderId(placeId) ?? null;
    let factors = byState.get(key);
    if (!factors) byState.set(key, (factors = read(key)));
    return factors;
  };
}

/** The rules' numbers, read once per parameter registry. */
const rulesByData = new WeakMap<object, CountryRules>();
function rulesOf(api: CoreAPI): CountryRules {
  const data = (api.state as CoreState).data.parameters;
  let rules = rulesByData.get(data);
  if (!rules) rulesByData.set(data, (rules = countryRules(params(api))));
  return rules;
}

/** The law in force in every state on a day (today unless one is given), read through the laws module where the world has one, else from the starting law. */
function lawNow(api: CoreAPI, date: string = api.state.date) {
  const read = (api.state as CoreState).modules.has(LAWS_MODULE_ID)
    ? (stateKey: string, series: string) =>
        stateLawInForce(api, stateKey, series, date)
    : startingLawReader(date, api.state.startedAt);
  return countryLaw(
    read,
    params(api),
    date,
    taxIndexOf(api, date),
    federalOn(api, date),
  );
}

/**
 * The federal budget in force on a day as it reaches each state, line by line: the budget the
 * game's Congress adopted (the budgets engine's rows), shared among the states by population and
 * this world's stake of each state in each line. None where the world keeps no budgets.
 */
function federalOn(api: CoreAPI, date: string) {
  if (!(api.state as CoreState).modules.has(BUDGETS_MODULE_ID))
    return federalSpendingReader(undefined, () => 1, 1);
  const nation = governments(api).find((gov) => gov.level === "federal");
  const budget = nation
    ? budgetsOf(api, nation.id)
        .filter((row) => row.startsOn <= date)
        .sort((a, b) => a.startsOn.localeCompare(b.startsOn))
        .at(-1)
    : undefined;
  return federalSpendingReader(
    budget,
    (stateKey, line) => stateStake(api, stateKey, `budget-line:${line}`),
    params(api)("minorPerDollar"),
  );
}

/**
 * The law the world began with: the research's starting law on the first day, with no act of
 * play in it. The tier opens and fits its first month under it, so a law enacted on day one is
 * a change the economy answers.
 */
function lawAtTheStart(api: CoreAPI) {
  const start = api.state.startedAt;
  return countryLaw(
    startingLawReader(start, start),
    params(api),
    start,
    undefined,
    federalOn(api, start),
  );
}

/** The country tier as the tables keep it: one row for the nation's accounts, one for each state. A copy, so a month can change it. */
function readCountry(api: CoreAPI): CountryTier {
  const kept = store(api).table("country").get(COUNTRY_ID) as unknown as Omit<
    CountryTier,
    "states"
  >;
  const states = store(api)
    .table("countryStates")
    .rows() as unknown as CountryState[];
  return structuredClone({ ...kept, states: [...states] }) as CountryTier;
}

function writeCountry(api: CoreAPI, tier: CountryTier): void {
  const { states, ...nation } = tier;
  store(api)
    .table("country")
    .put(nation as unknown as { id: string });
  for (const state of states)
    store(api)
      .table("countryStates")
      .put(state as unknown as { id: string });
}

/** Every state's tier row today: its households by fifth and age, its sectors and its ledger. Read-only. */
export function countryStates(api: CoreAPI): readonly CountryState[] {
  return store(api).table("countryStates").rows() as unknown as CountryState[];
}

/**
 * Every state's people and this month's movers by the tier's own rule, read
 * without moving anyone (counted-moves reads them: the tier is the one holder
 * of every state's people). Empty before the tier opens.
 */
export function countryFlowsNow(api: CoreAPI): {
  states: readonly CountryState[];
  flows: readonly CountryFlow[];
} {
  if (!countryOpened(api)) return { states: [], flows: [] };
  const tier = readCountry(api);
  return {
    states: tier.states,
    flows: countryFlows(tier, lawNow(api), rulesOf(api)),
  };
}

registerCountryFlowsReader(countryFlowsNow);

/** One state's figures today and at the opening, by FIPS code. */
export function countryStateNow(api: CoreAPI, fips: string) {
  const state = store(api)
    .table("countryStates")
    .query("byFips", [fips])[0] as unknown as CountryState | undefined;
  const base = store(api).table("countryBases").get(`country-base:${fips}`) as
    CountryStateBase | undefined;
  return state && base
    ? { now: countryStateFigures(state, rulesOf(api)), base, state }
    : undefined;
}

/** A state's part held in full (the played town and its county), as the tables keep it: one row per state, replaced each month. */
export interface CountryPartRow extends CountryPart {
  id: string;
  /** The state's jurisdiction key, as `US-UT`. */
  key: string;
  /** The month it was counted for, and the places it counts. */
  month: string;
  placeIds: string[];
}

const partId = (key: string) => `country-part:${key}`;
const UNSORTED_JOBS = "SG-NATION-town-part-unsorted-jobs";
const SECTOR_TABLE = employerSectors as unknown as {
  classifications: Record<string, CountrySector>;
  kinds: Record<string, CountrySector>;
  naics: Record<string, CountrySector>;
};

/** An employer's sector: its business kind's, else its classification's or its kind's in the table; none when it has none. */
function sectorOfEmployer(
  core: CoreState,
  organizationId: string,
): CountrySector | undefined {
  const org = core.organizations.get(organizationId);
  if (!org) return undefined;
  const kind = org.classification
    ? classifyBusiness(org.classification).kind?.id
    : undefined;
  const ofKind = kind ? sectorOfKind(kind) : null;
  if (ofKind) return ofKind;
  return (
    (org.classification && SECTOR_TABLE.classifications[org.classification]) ||
    SECTOR_TABLE.kinds[org.kind]
  );
}

/**
 * What the played places' own records count today, by the state they are in: the town and
 * its county, their people by the tier's age bands, at work and looking, the jobs they hold
 * by their employer's sector, and their cash. Read on a month's first day.
 */
function townPartCounts(
  api: CoreAPI,
): Map<string, { placeIds: string[]; counts: CountryPartCounts }> {
  const core = api.state as CoreState;
  const out = new Map<
    string,
    { placeIds: string[]; counts: CountryPartCounts }
  >();
  const byState = new Map<string, string[]>();
  for (const row of residentsRuntime(core)?.input.accounts ?? []) {
    const key = placeStateKey(row.placeId);
    if (key) byState.set(key, [...(byState.get(key) ?? []), row.placeId]);
  }
  const p = params(api);
  for (const [key, placeIds] of byState) {
    const part = residentsPart(core, new Set(placeIds), COUNTRY_AGE_BANDS);
    const jobs: Partial<Record<CountrySector, number>> = {};
    let unsortedJobs = p("zero");
    const add = (sector: CountrySector | undefined, workers: number) => {
      if (sector) jobs[sector] = (jobs[sector] ?? p("zero")) + workers;
      else unsortedJobs += workers;
    };
    for (const [employer, workers] of part.workersByEmployer)
      add(employer ? sectorOfEmployer(core, employer) : undefined, workers);
    for (const [industry, workers] of part.workersByIndustry)
      add(SECTOR_TABLE.naics[industry], workers);
    if (unsortedJobs > p("zero")) stopgap(UNSORTED_JOBS);
    out.set(key, {
      placeIds: [...placeIds].sort(),
      counts: {
        people: part.adults,
        workers: part.workers,
        seekers: part.seekers,
        children: part.children,
        jobs,
        unsortedJobs,
        cash: part.cashMinor / p("minorPerDollar"),
      },
    });
  }
  return out;
}
const partOf = (api: CoreAPI, key: string) =>
  store(api).table("countryParts").get(partId(key)) as unknown as
    CountryPartRow | undefined;

/**
 * A state's people and jobs, and of them the part held in full and the rest the tier steps:
 * the part and the rest add to the state's figures. By jurisdiction key (`US-UT`).
 */
export function countryStateParts(api: CoreAPI, key: string) {
  const state = store(api)
    .table("countryStates")
    .get(`country-state:${key}`) as unknown as CountryState | undefined;
  if (!state) return undefined;
  const total = countryStateFigures(state, rulesOf(api));
  const row = partOf(api, key);
  const part = row
    ? countryPartFigures(row)
    : { population: 0, jobs: 0, workers: 0, seekers: 0 };
  return {
    stateId: state.id,
    partId: row?.id,
    month: row?.month,
    placeIds: row?.placeIds ?? [],
    total: { people: total.population, jobs: total.jobs },
    part: { people: part.population, jobs: part.jobs },
    rest: {
      people: total.population - part.population,
      jobs: total.jobs - part.jobs,
    },
  };
}

const nationFigures = (
  month: Pick<
    CountryMonth,
    | "unemploymentPct"
    | "priceIndex"
    | "jobs"
    | "hourlyPay"
    | "realOutput"
    | "busy"
  >,
): NationFigures => ({
  unemploymentPct: month.unemploymentPct,
  priceIndex: month.priceIndex,
  jobs: month.jobs,
  hourlyPay: month.hourlyPay,
  realOutput: month.realOutput,
  busy: month.busy,
});

function runMonth(api: CoreAPI, state: MacroStateRow): void {
  const p = params(api);
  const months = store(api).table("months");
  const previous = months.get(
    `macro-month:${state.latestMonth}`,
  ) as unknown as MacroMonth;
  const month = shiftMonth(state.latestMonth, p("one"), p);
  // Every state's month, under the law in force there and the central bank's rate; a recorded disaster ends jobs in its state.
  const tier = readCountry(api);
  const lost = regionalRegistered(api)
    ? regionalShocksStarting(api, month)
    : new Map<string, number>();
  // The played town and its county are counted from their own records: the part their state's
  // cells held for them last month comes out before the state steps (the opening's totals
  // held them the first time), and today's count goes in after it.
  const counted = townPartCounts(api);
  const parts = new Map<string, { out: CountryPart; in: CountryPartRow }>();
  for (const row of tier.states) {
    const held = partOf(api, row.key);
    const now = counted.get(row.key);
    if (!held && !now) continue;
    const today = now
      ? resolveCountryPart(row, now.counts)
      : resolveCountryPart(row, {
          people: COUNTRY_AGE_BANDS.map(() => p("zero")),
          workers: COUNTRY_AGE_BANDS.map(() => p("zero")),
          seekers: COUNTRY_AGE_BANDS.map(() => p("zero")),
          children: p("zero"),
          jobs: {},
          unsortedJobs: p("zero"),
          cash: p("zero"),
        });
    parts.set(row.key, {
      out: held ?? today,
      in: {
        ...today,
        id: partId(row.key),
        key: row.key,
        month,
        placeIds: now?.placeIds ?? [],
      },
    });
  }
  const nation = stepCountry(
    tier,
    {
      // The tier's first month fits its hiring and matching constants, so it runs under the
      // law the world began with, as the opening does; a law enacted on the first day
      // reaches paychecks from the second month.
      law: tier.month === p("zero") ? lawAtTheStart(api) : lawNow(api),
      policyRate: state.policyRatePct / p("macroHundred"),
      jobsLost: (row) => lost.get(row.usps) ?? p("zero"),
      parts: (row) => parts.get(row.key),
    },
    rulesOf(api),
  );
  for (const part of parts.values())
    store(api)
      .table("countryParts")
      .put(part.in as unknown as { id: string });
  if (bookkeeping()) {
    const problems = countryProblems(tier);
    if (problems.length)
      throw new Error(
        `The country tier holds counts that cannot be: ${problems.join("; ")}`,
      );
  }
  writeCountry(api, tier);
  const opening = months.get(
    `macro-month:${state.openingMonth}`,
  ) as unknown as MacroMonth;
  const row = countryMacroMonth(
    previous,
    { row: opening, nation: state.countryBase },
    nationFigures(nation),
    months.get(
      `macro-month:${shiftMonth(month, -p("macroMonthsPerYear"), p)}`,
    ) as unknown as MacroMonth | undefined,
    state.policyRatePct,
    p,
  );
  months.put(row as unknown as { id: string });
  if (regionalRegistered(api)) {
    const prices = tier.priceIndex;
    stepRegional(api, previous, row, (fips) => {
      const own = countryStateNow(api, fips);
      if (!own) return undefined;
      const since = (now: number, then: number) =>
        then > p("zero") ? now / then : p("one");
      return {
        unemploymentPct: own.now.unemploymentPct,
        unemploymentAtStartPct: own.base.unemploymentPct,
        jobs: since(own.now.jobs, own.base.jobs),
        pay:
          (since(own.now.hourlyPay, own.base.hourlyPay) /
            since(nation.hourlyPay, state.countryBase.hourlyPay)) *
          since(row.hourlyEarnings, opening.hourlyEarnings),
        people: since(own.now.population, own.base.population),
        // The state's prices against the nation's: both opened at one.
        prices: since(own.now.prices, prices),
      };
    });
  }
  const next = { ...state, latestMonth: row.month };
  store(api).table("state").put(next);
  publishConditions(api, next, row);
  reviewBoardTerms(api, store(api).table("members"), p, recordSource(api));
  api.moduleCalendar(MACRO_MODULE_ID).schedule({
    key: `month:${shiftMonth(row.month, p("one"), p)}`,
    date: firstOfNextMonth(api.state.date, p),
    kind: "macro-month",
    source: recordSource(api),
    sourceRecordIds: [row.id],
  });
}

/**
 * The country tier's day one: every state from the world's own opening figures
 * (the regional rows this seed drew), with its books made to add up under the
 * law in force.
 */
function openCountryTier(
  api: CoreAPI,
  opening: Readonly<MacroMonth>,
): NationFigures {
  const p = params(api),
    rules = rulesOf(api);
  const regionMonths = openingRegionMonths(
    opening,
    api.state.startedAt,
    api.state.seed,
    p,
  );
  const tier = openCountry(
    countryOpening(
      (fips) => {
        const own = stateFigures(regionMonths, fips);
        return {
          unemploymentPct: own.unemploymentPct,
          hourlyPay: own.hourlyEarnings,
          priceLevelPct: own.priceLevelPct,
        };
      },
      {
        unemploymentPct: opening.unemploymentPct,
        policyRatePct: opening.policyRatePct,
        // People open expecting the price rises the last twelve months gave them.
        expectedInflationPct: opening.inflationPct,
      },
      p,
    ),
    // The opening is fitted under the law the world began with: the law in force the day
    // before the start. A law enacted on the first day (dev mode's law control, before the
    // economy opens) is a change the first month then answers, never part of the baseline.
    lawAtTheStart(api),
    rules,
  );
  writeCountry(api, tier);
  let jobs = p("zero"),
    paid = p("zero");
  for (const state of tier.states) {
    const figures = countryStateFigures(state, rules);
    jobs += figures.jobs;
    paid += figures.jobs * figures.hourlyPay;
    store(api)
      .table("countryBases")
      .put({
        id: `country-base:${state.fips}`,
        fips: state.fips,
        unemploymentPct: figures.unemploymentPct,
        jobs: figures.jobs,
        hourlyPay: figures.hourlyPay,
        population: figures.population,
        sectorSales: Object.fromEntries(
          state.sectors.map((cell) => [cell.sector, cell.sales]),
        ) as Record<CountrySector, number>,
      } satisfies CountryStateBase);
  }
  return {
    unemploymentPct: opening.unemploymentPct,
    priceIndex: tier.priceIndex,
    jobs,
    hourlyPay: jobs > p("zero") ? paid / jobs : p("zero"),
    realOutput: tier.openingRealSales,
    busy: p("zero"),
  };
}

function scheduleMeeting(api: CoreAPI, after: string): void {
  const date = nextMeetingDate(after);
  api.moduleCalendar(MACRO_MODULE_ID).schedule({
    key: `meeting:${date}`,
    date,
    kind: "macro-meeting",
    source: recordSource(api),
    sourceRecordIds: [STATE_ID],
  });
}

function open(api: CoreAPI): MacroStateRow {
  const p = params(api),
    core = api.state;
  const months = store(api).table("months");
  const rows = [...historyMonths(core.startedAt, core.seed, p)];
  // A custom world (M6-04): the opening month starts from the player's figures; its output gap follows by Okun's law.
  const custom = core.placeMetadata?.[CUSTOM_ECONOMY_KEY];
  if (custom) {
    const chosen = JSON.parse(custom) as {
      unemploymentPct?: number;
      inflationPct?: number;
      policyRatePct?: number;
    };
    const last = rows.at(-p("one"))!;
    const unemploymentPct = chosen.unemploymentPct ?? last.unemploymentPct;
    const policyRatePct = chosen.policyRatePct ?? last.policyRatePct;
    rows[rows.length - p("one")] = {
      ...last,
      unemploymentPct,
      inflationPct: chosen.inflationPct ?? last.inflationPct,
      outputGapPct:
        -p("macroOkunOutputPerUnemploymentPoint") *
        (unemploymentPct - last.naturalUnemploymentPct),
      policyRatePct,
      primeRatePct: policyRatePct + p("macroPrimeSpreadPct"),
    };
    // A chosen inflation is the rise in prices over the year before the opening, so the year's
    // price history is the chosen pace: the months after it then measure their own year from it.
    if (chosen.inflationPct !== undefined) {
      const perMonth =
        (p("one") + chosen.inflationPct / p("macroHundred")) **
        (p("one") / p("macroMonthsPerYear"));
      const end = rows.length - p("one");
      for (
        let back = p("one");
        back <= p("macroMonthsPerYear") && end - back >= p("zero");
        back += p("one")
      )
        rows[end - back] = {
          ...rows[end - back]!,
          priceIndex: last.priceIndex / perMonth ** back,
        };
    }
  }
  for (const row of rows) months.put(row as unknown as { id: string });
  const board = generateBoard(core, p);
  for (const member of board.members) {
    if (!core.people.has(member.personId))
      throw new Error(
        "Board members must be in the opening input (withCentralBank).",
      );
    store(api)
      .table("members")
      .put({ ...member, isMember: true } as unknown as { id: string });
  }
  // Businesses' places, once at the opening; the regional layer replaces this with each place's region.
  const placeIds = [
    ...new Set([...core.organizations.values()].map((row) => row.placeId)),
  ].sort();
  const opening = rows.at(-p("one"))!;
  const step = p("macroPolicyStepPct");
  const state: MacroStateRow = {
    id: STATE_ID,
    openedAt: core.date,
    openingMonth: opening.month,
    latestMonth: opening.month,
    // The target range the effective rate sat in: its midpoint.
    policyRatePct: Math.max(
      p("macroPolicyLowerBoundPct"),
      Math.floor(opening.policyRatePct / step) * step + step / p("two"),
    ),
    placeIds,
    countryBase: openCountryTier(api, opening),
  };
  store(api)
    .table("state")
    .put(state as unknown as { id: string });
  if (regionalRegistered(api)) openRegional(api, opening, placeIds, rows);
  if (monthKey(core.date) === shiftMonth(opening.month, p("one"), p))
    runMonth(api, state);
  else
    api.moduleCalendar(MACRO_MODULE_ID).schedule({
      key: `month:${shiftMonth(opening.month, p("one"), p)}`,
      date: firstOfNextMonth(core.date, p),
      kind: "macro-month",
      source: recordSource(api),
      sourceRecordIds: [opening.id],
    });
  scheduleMeeting(api, core.date);
  return readState(api)!;
}

function meet(api: CoreAPI, meetingId: string): void {
  const p = params(api),
    core = api.state as CoreState;
  const state = readState(api)!;
  const latest = store(api)
    .table("months")
    .get(`macro-month:${state.latestMonth}`) as unknown as MacroMonth;
  const readings = meetingReadings(latest, state.policyRatePct, p);
  const members = store(api)
    .table("members")
    .query("all", [true]) as unknown as BoardMember[];
  const voters = votersOn(core.date, members);
  const moves = rateOptions(state.policyRatePct, p);
  const votes = voters.map((member) => {
    const view = memberView(member, readings, p);
    const result = chooseAct(
      core,
      member.personId,
      rateOffers(view, moves, meetingId, p),
    );
    return {
      member,
      view,
      move: moveOfTarget(result.selected!.targetId),
      reasonKey: result.reasonKey,
    };
  });
  const move = committeeDecision(votes.map((row) => row.move));
  const effectiveAt = addDays(
    makeIsoDate(core.date),
    BOARD.effectiveDaysAfterDecision,
  );
  for (const vote of votes)
    store(api)
      .table("votes")
      .put({
        id: `${meetingId}:${vote.member.id}`,
        meetingId,
        memberId: vote.member.id,
        personId: vote.member.personId,
        movePct: vote.move,
        dissent: vote.move !== move,
        inflationLean: vote.member.inflationLean,
        experiencedInflationPct: vote.member.experiencedInflationPct,
        desiredRatePct: vote.view.desiredRatePct,
        smoothing: vote.view.smoothing,
        pulls: vote.view.pulls,
        sizeCost: vote.view.sizeCost,
        reasonKey: vote.reasonKey,
      });
  store(api)
    .table("meetings")
    .put({
      id: meetingId,
      date: core.date,
      effectiveAt,
      readings: { ...readings },
      optionsPct: moves,
      voterIds: voters.map((row) => row.id),
      movePct: move,
      fromRatePct: state.policyRatePct,
      toRatePct: state.policyRatePct + move,
      dissents: votes.filter((row) => row.move !== move).length,
    });
  api.emit({
    id: `event:${meetingId}`,
    date: core.date,
    kind: "central-bank-rate-decision",
    personIds: voters.map((row) => row.personId),
    placeId: BOARD.placeId,
    source: recordSource(api),
    publicRecord: true,
  });
  api.moduleCalendar(MACRO_MODULE_ID).schedule({
    key: `effective:${meetingId}`,
    date: effectiveAt,
    kind: "macro-rate-effective",
    source: recordSource(api),
    sourceRecordIds: [meetingId],
  });
  scheduleMeeting(api, core.date);
}

function lineRate(primePct: number, line: LinkedLineRow, p: MacroParameter) {
  return (primePct + line.spreadPct) / p("macroHundred");
}

function takeEffect(api: CoreAPI, meetingId: string): void {
  const p = params(api);
  const meeting = store(api).table("meetings").get(meetingId) as unknown as {
    toRatePct: number;
    fromRatePct: number;
  };
  const state = readState(api)!;
  store(api)
    .table("state")
    .put({ ...state, policyRatePct: meeting.toRatePct });
  if (meeting.toRatePct === meeting.fromRatePct) return;
  const prime = meeting.toRatePct + p("macroPrimeSpreadPct");
  for (const row of store(api)
    .table("lines")
    .query("byIndex", ["prime"]) as unknown as LinkedLineRow[]) {
    const before = api.state.finance.facilities.get(row.facilityId);
    if (
      !before ||
      !before.active ||
      api.state.finance.businesses.get(before.borrowerId)?.closedAt
    )
      continue;
    const fromRate =
      before.annualInterestRate ??
      api.parameter(before.annualInterestParameter);
    const toRate = lineRate(prime, row, p);
    api.repriceCreditFacility(
      row.facilityId,
      toRate,
      dated(api, `Prime rate after ${meetingId}, plus the line's own spread.`),
    );
    store(api)
      .table("repricings")
      .put({
        id: `${row.facilityId}:${api.state.date}`,
        facilityId: row.facilityId,
        borrowerId: before.borrowerId,
        date: api.state.date,
        meetingId,
        fromRate,
        toRate,
      });
  }
}

/** The annual rate a line with this spread is charged today: the prime rate (policy rate plus the bank prime spread) plus the line's own spread. Borrowers weigh this same rate. */
export function quotedLineRate(api: CoreAPI, spreadPct: number): number {
  const state = readState(api) ?? open(api);
  return lineRate(
    state.policyRatePct + api.parameter("macroPrimeSpreadPct"),
    { spreadPct } as LinkedLineRow,
    params(api),
  );
}

/** Ties a recorded credit line to the prime rate plus its own spread, repricing it now and at every decision. */
export function linkCreditLineToPrime(
  api: CoreAPI,
  facilityId: string,
  spreadPct: number,
  lineSource: Source,
): void {
  const state = readState(api) ?? open(api);
  const row: LinkedLineRow = {
    id: facilityId,
    facilityId,
    index: "prime",
    spreadPct,
    source: lineSource,
  };
  store(api)
    .table("lines")
    .put(row as unknown as { id: string });
  api.repriceCreditFacility(
    facilityId,
    lineRate(
      state.policyRatePct + api.parameter("macroPrimeSpreadPct"),
      row,
      params(api),
    ),
    lineSource,
  );
}

export const MACRO_MODULE: PreStartModule = {
  id: MACRO_MODULE_ID,
  // History before the start (M1-14): the nation's published months, and each change in the policy rate.
  preStart: {
    phase: "economy",
    run(api, window, history) {
      let previous: number | undefined;
      for (const date of coarseSteps(window)) {
        const month = date.slice(0, "YYYY-MM".length);
        const row = publishedMonth(month);
        if (!row) continue;
        const facts: Record<string, number> = {};
        for (const key of [
          "unemploymentPct",
          "priceIndex",
          "payrollJobsThousands",
          "hourlyEarnings",
          "policyRatePct",
          "treasury10Pct",
          "mortgage30Pct",
        ] as const)
          if (row[key] !== undefined) facts[key] = row[key]!;
        const source: Source = {
          tag: "SOURCED",
          asOf: api.state.date,
          citation: MACRO_HISTORY_SOURCE.citation,
        };
        history.record({
          id: `economy.conditions:${month}`,
          date,
          kind: "economy.conditions",
          facts,
          publicRecord: true,
          source,
        });
        if (
          row.policyRatePct !== undefined &&
          previous !== undefined &&
          row.policyRatePct !== previous
        )
          history.record({
            id: `economy.rate-decision:${month}`,
            date,
            kind: "economy.rate-decision",
            facts: { fromRatePct: previous, toRatePct: row.policyRatePct },
            publicRecord: true,
            source,
          });
        if (row.policyRatePct !== undefined) previous = row.policyRatePct;
      }
    },
  },
  state: {
    schemaVersion: 1,
    tables: {
      state: {},
      months: {},
      country: {},
      countryStates: { indexes: { byFips: { fields: ["fips"] } } },
      countryBases: {},
      countryParts: {},
      members: { indexes: { all: { fields: ["isMember"] } } },
      meetings: {},
      votes: { indexes: { byMeeting: { fields: ["meetingId"] } } },
      lines: { indexes: { byIndex: { fields: ["index"] } } },
      repricings: { indexes: { byFacility: { fields: ["facilityId"] } } },
    },
  },
  reasonProviders: {
    [RATE_PULL_PROVIDER]: (_api, _actor, _offer, binding) => ({
      value: Number(binding.arguments!.value),
      sourceIds: [binding.arguments!.meetingId!],
    }),
  },
  onCalendarWork(api, work) {
    const state = readState(api)!;
    if (work.kind === "macro-month") runMonth(api, state);
    else if (work.kind === "macro-meeting") meet(api, work.key);
    else if (work.kind === "macro-rate-effective")
      takeEffect(api, work.sourceRecordIds[0]!);
  },
  onDay: openOnce,
  // Results mode (time nobody watches): the engine's only daily work is its
  // opening; its months, meetings and rate changes are dated work and run.
  onResultsMonth: openOnce,
};

/** The economy opens on the first day the engine runs, in play or skipped. */
function openOnce(api: CoreAPI): void {
  if (!readState(api)) open(api);
}

/** The board members are people in the world; add them to the opening input. */
export function withCentralBank(input: CoreInput): CoreInput {
  const p: MacroParameter = (key) => {
    const row = MACRO_PARAMETERS[key] ?? DEFAULT_DATA.parameters[key];
    if (!row) throw new Error(`Untagged numeric parameter: ${key}`);
    return row.value;
  };
  const board = generateBoard(input, p);
  return {
    ...input,
    people: [...input.people, ...board.people],
    households: [...input.households, ...board.households],
  };
}

/** Core data with the macro parameters merged in. */
export function macroCoreData(base: CoreData = DEFAULT_DATA): CoreData {
  return extendData(base, {
    parameters: {
      ...MACRO_PARAMETERS,
      ...REGIONAL_PARAMETERS,
      ...JOBS_PARAMETERS,
    },
  });
}

/** One year's end in the outlook: the nation's figures, or one state's. */
export interface OutlookPoint {
  month: string;
  unemploymentPct: number;
  people: number;
  hourlyPay: number;
}
export interface CountryOutlook {
  /** The month the outlook starts from: the latest month the game has lived. */
  from: string;
  months: number;
  /** The nation at the start and at each year's end, with its prices and the board's rate. */
  nation: (OutlookPoint & {
    inflationPct: number;
    policyRatePct: number;
    /** Payroll jobs in thousands, as the national month keeps them. */
    jobsThousands: number;
  })[];
  /** Each state at the start and at each year's end, by postal code, with its jobs and its budget for the year. */
  states: Record<
    string,
    (OutlookPoint & { jobs: number; budgetYear: number })[]
  >;
  /** Months in which some count could not be (more at work than people, a negative count), and the first few. */
  monthsWithProblems: number;
  problems: string[];
  /** The most the country's dollars strayed from their sum at the start, as a share: zero but for rounding. */
  moneyDrift: number;
}

const OUTLOOK_PROBLEMS_KEPT = 8;

/**
 * The country some years on if nothing else changes: a copy of every state's counts, stepped by
 * the same month the game steps (`stepCountry`, `countryMacroMonth`) under the law in force
 * today, with today's board meeting on its own calendar and each member voting by the rule they
 * vote by in play. Read-only: it writes no record and moves no date, so it is what the tier
 * would do, not what the town will (the town and county held in full stay as they are today).
 */
/** Whether the national economy has opened: it opens on the game's first day, and there is no outlook before it. */
export function countryOpened(api: CoreAPI): boolean {
  return readState(api) !== undefined;
}

/** The tier's own check for counts that cannot be (negative, more working than people, jobs not matching workers); empty before the economy opens. */
export function countryTierProblems(api: CoreAPI): string[] {
  return readState(api) ? countryProblems(readCountry(api)) : [];
}

export function countryOutlook(api: CoreAPI, months: number): CountryOutlook {
  const p = params(api),
    core = api.state as CoreState;
  const state = readState(api);
  if (!state) throw new Error("The national economy has not opened yet.");
  const table = store(api).table("months");
  const lived = (month: string) =>
    table.get(`macro-month:${month}`) as unknown as MacroMonth | undefined;
  const opening = lived(state.openingMonth)!;
  const tier = readCountry(api);
  const rules = rulesOf(api);
  const members = store(api)
    .table("members")
    .query("all", [true]) as unknown as BoardMember[];
  const made = new Map<string, MacroMonth>();
  const hundred = p("macroHundred"),
    year = p("macroMonthsPerYear");
  let previous = lived(state.latestMonth)!;
  let rate = state.policyRatePct;
  // A decision takes effect some days after its meeting; the month that starts on or after that day is stepped at the new rate.
  let pending: { at: string; rate: number } | undefined;
  let meeting = nextMeetingDate(core.date);
  const nationPoint = (row: MacroMonth) => ({
    month: row.month,
    unemploymentPct: row.unemploymentPct,
    inflationPct: row.inflationPct,
    policyRatePct: rate,
    people: tier.states.reduce((sum, own) => sum + countryPeople(own), 0),
    jobsThousands: row.payrollJobsThousands,
    hourlyPay: row.hourlyEarnings,
  });
  const statePoint = (own: CountryState, month: string) => {
    const now = countryStateFigures(own, rules);
    return {
      month,
      unemploymentPct: now.unemploymentPct,
      people: now.population,
      jobs: now.jobs,
      hourlyPay: now.hourlyPay,
      budgetYear: own.ledger.budgetYear,
    };
  };
  const out: CountryOutlook = {
    from: previous.month,
    months,
    nation: [nationPoint(previous)],
    states: Object.fromEntries(
      tier.states.map((own) => [own.usps, [statePoint(own, previous.month)]]),
    ),
    monthsWithProblems: 0,
    problems: [],
    moneyDrift: 0,
  };
  // The board meets on its calendar and votes on the month it has just read.
  const meetIn = (row: MacroMonth) => {
    while (monthKey(meeting) === row.month) {
      if (pending) {
        rate = pending.rate;
        pending = undefined;
      }
      const readings = meetingReadings(row, rate, p);
      const options = rateOptions(rate, p);
      const seated = votersOn(meeting, members);
      const moves = (seated.length ? seated : members).map((member) =>
        moveOfTarget(
          chooseAct(
            core,
            member.personId,
            rateOffers(
              memberView(member, readings, p),
              options,
              `outlook:${meeting}`,
              p,
            ),
          ).selected!.targetId,
        ),
      );
      const move = moves.length ? committeeDecision(moves) : p("zero");
      pending = {
        at: addDays(makeIsoDate(meeting), BOARD.effectiveDaysAfterDecision),
        rate: rate + move,
      };
      meeting = nextMeetingDate(meeting);
    }
  };
  // A meeting still to come this month reads the month the game has already lived.
  meetIn(previous);
  const dollars = countryMoney(tier);
  for (let step = 1; step <= months; step += 1) {
    const month = shiftMonth(previous.month, p("one"), p);
    if (pending && pending.at <= `${month}-01`) {
      rate = pending.rate;
      pending = undefined;
    }
    // The law already on the books for that month: a change enacted with a later date arrives on its date.
    const nation = stepCountry(
      tier,
      {
        law: lawNow(api, `${month}-01`),
        policyRate: rate / hundred,
        parts: (own) => {
          const held = partOf(api, own.key);
          return held && { out: held, in: held };
        },
      },
      rules,
    );
    const found = countryProblems(tier);
    if (found.length) {
      out.monthsWithProblems += 1;
      if (out.problems.length < OUTLOOK_PROBLEMS_KEPT)
        out.problems.push(`${month}: ${found[0]}`);
    }
    out.moneyDrift = Math.max(
      out.moneyDrift,
      Math.abs(countryMoney(tier) - dollars) / Math.abs(dollars),
    );
    const earlier = shiftMonth(month, -year, p);
    const row = countryMacroMonth(
      previous,
      { row: opening, nation: state.countryBase },
      nationFigures(nation),
      made.get(earlier) ?? lived(earlier),
      rate,
      p,
    );
    made.set(month, row);
    previous = row;
    meetIn(row);
    if (step % year === 0) {
      out.nation.push(nationPoint(row));
      for (const own of tier.states)
        out.states[own.usps]!.push(statePoint(own, month));
    }
  }
  return out;
}

/** What the bench's national panel shows: each month against its band, each meeting with every vote's reasons. Read-only. */
export function nationalPanel(api: CoreAPI) {
  const snap = store(api).snapshot();
  const months = snap.tables.months as unknown as MacroMonth[];
  const votes = snap.tables.votes as unknown as { meetingId: string }[];
  return {
    months,
    bands: checkBands(months, params(api)),
    meetings: (snap.tables.meetings as unknown as { id: string }[]).map(
      (meeting) => ({
        ...meeting,
        votes: votes.filter((vote) => vote.meetingId === meeting.id),
      }),
    ),
    members: snap.tables.members,
    repricings: snap.tables.repricings,
  };
}
