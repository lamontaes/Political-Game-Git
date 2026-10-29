/**
 * Budgets and taxes (M1-07, the government half, first slice): every
 * government covering the town has a treasury and a budget adopted on its
 * fiscal calendar, and every paycheck pays the taxes the law in force says.
 *
 * - Governments: federal, the state (or district or territory), the county,
 *   the city or township, each an organization with a cash account.
 * - Budgets: each government's revenue by source and spending by function,
 *   from the Census Bureau's state and local finances (fiscal 2022, carried to
 *   the opening year by NASBO's calibration; `public-budget-bases.json`) per
 *   resident times its residents, and the Treasury's fiscal 2025 statement for
 *   the federal government. Local spending divides between county and city
 *   by each function's real shares in the state (Census 2022). Each new fiscal year's
 *   budget is adopted on its start date by its council's or legislature's vote;
 *   where no body votes it, the year's amounts carry forward. A budget bill the legislature passes adds
 *   its line changes to the government's enacted lines, which every later
 *   year's budget starts from.
 * - Withholding: each paycheck's income, Social Security and Medicare taxes,
 *   by the law in force (`tax-withholding.ts`), move from the worker's cash to
 *   each government's account through the journal on payday.
 */
import { corePlaceByKey } from "../place-lookup";
import { placeLocalGovernmentUnits } from "../gov-rules/local-governments";
import budgetBases from "../../../data/research/money/public-budget-bases.json" with { type: "json" };
import federal from "../../../data/research/money/federal-budget-fy2025.json" with { type: "json" };
import localYears from "../data/budgets/local-fiscal-years.json" with { type: "json" };
import { addDays, makeIsoDate } from "../kernel/dates";
import priorGrowth from "../data/budgets/prior-year-growth.json" with { type: "json" };
import { coreAPI, registerModule } from "../state";
import { keepsWhy } from "../why-kept";
import { lawApplied } from "../law-reach/applied";
import type {
  HistoryWriter,
  PreStartModule,
  PreStartWindow,
} from "../pre-start";
import type { CoreAPI, CoreState, Source } from "../types";
import type { ModuleRow } from "../module-data";
import type { ModuleCalendarWork } from "../module-calendar";
import type { CashJournalSourceSlot } from "../journal-state";
import type { WorkPayrollJournalReceipt } from "../work-payroll-cash";
import { countyGovernmentUnit } from "../reference/government-units";
import { LAWS_MODULE_ID, lawChain, lawInForce, yesLevels } from "./laws";
import { worldOffsetUnit } from "../world-draw";
import lawParameters from "../data/laws/reach-group-b-parameters.json" with { type: "json" };
import propertyTaxCaps from "../data/laws/property-tax-caps.json" with { type: "json" };
import { registerPropertyTax } from "../housing-property-tax";
import {
  lawChainForPlace,
  startingLawRows,
  type LawChain,
  type LawRowInput,
} from "../laws-starting";
import { resolveLawInForce, type LawInForceAnswer } from "../laws-in-force";
import { corePlaceByJurisdictionId } from "../place-lookup";
import { outsideGovernment } from "../outside-governments";
import { withholdingFor, type WithholdingLine } from "../tax-withholding";
import { recordIncomeTaxApplied } from "../tax-applied";
import {
  applySocialSecurityLevel,
  closeTreasuries,
  notePublicPay,
  sameGovernment,
} from "../budgets-treasury";
import {
  federalJurisdictionId,
  stateJurisdictionId,
} from "../government-jurisdictions";
import { syncServiceCharges } from "../budgets-service-charges";

export { townShareOf } from "../budgets-treasury";

export const BUDGETS_MODULE_ID = "core2-budgets-v1";

/** The law series each payroll withholding line is read from (income tax is read elsewhere). */
export const PAYROLL_TAX_SERIES: Readonly<Record<string, string | undefined>> =
  { "social-security": "social-security-tax", medicare: "medicare-tax" };
const WITHHOLDING_KIND = "budgets:withholding";

export interface GovernmentRow {
  readonly id: string;
  readonly level: "federal" | "state" | "county" | "city";
  readonly name: string;
  readonly organizationId: string;
  readonly fiscalYearStart: string;
  readonly residents: number;
  /**
   * The government's base row (data/research/money/public-budget-bases.json
   * `governments`, or the nation's statement): `county-whole` is a county-level
   * government of a town with no city or township government of its own, which
   * carries the whole local share of every function.
   */
  readonly base: BaseRowName;
}

export interface BudgetRow {
  readonly id: string;
  readonly governmentId: string;
  readonly fiscalYear: number;
  readonly startsOn: string;
  readonly adoptedOn: string;
  readonly adoptedBy: string;
  readonly revenueMinor: Readonly<Record<string, number>>;
  readonly spendingMinor: Readonly<Record<string, number>>;
  readonly source: string;
}

interface WithholdingRecord {
  readonly id: string;
  readonly date: string;
  readonly personId: string;
  readonly payrollReceiptId: string;
  readonly paidMinor: number;
  readonly periodDays: number;
  readonly yearToDateMinor: number;
  readonly lines: readonly WithholdingLine[];
  readonly postings: readonly {
    id: string;
    accountId: string;
    deltaMinor: number;
  }[];
  readonly source: Source;
}

const slots = new WeakMap<object, Map<string, CashJournalSourceSlot>>();
function holdWithholdingSlot(api: CoreAPI, row: WithholdingRecord): void {
  const map = slots.get(api.state) ?? new Map<string, CashJournalSourceSlot>();
  slots.set(api.state, map);
  map.set(row.id, slotOf(row));
}
/** The accounts of outside governments a withholding pays: the tax owed them is the due record. */
const OUTSIDE_GOVERNMENT_ACCOUNT = /^cash:organization:outside-government:/;
const WITHHOLDING_DUE_KIND = "budgets:withholding-due";
function slotOf(row: WithholdingRecord): CashJournalSourceSlot {
  const outside = [
    ...new Set(
      row.postings
        .map((p) => p.accountId)
        .filter((id) => OUTSIDE_GOVERNMENT_ACCOUNT.test(id)),
    ),
  ];
  const due = outside.map((accountId) => ({
    kind: WITHHOLDING_DUE_KIND,
    id: `${row.id}:due:${accountId}`,
  }));
  const resolved = {
    kind: WITHHOLDING_KIND,
    id: row.id,
    date: row.date,
    source: row.source,
    expectedPostings: row.postings.map((p) => ({ ...p })),
    requiredRelatedRefs: due,
    relatedRecords: due.map((ref) => ({
      ...ref,
      date: row.date,
      source: row.source,
    })),
    ...(outside.length
      ? {
          externalFlowAuthorizations: outside.map((accountId, index) => ({
            accountId,
            obligation: due[index]!,
          })),
        }
      : {}),
  };
  return {
    resolved,
    marker: resolved,
    retainFull: false,
    metadata: [],
  } as unknown as CashJournalSourceSlot;
}
function withholdingSlot(
  api: CoreAPI,
  id: string,
): CashJournalSourceSlot | undefined {
  const map = slots.get(api.state) ?? new Map<string, CashJournalSourceSlot>();
  slots.set(api.state, map);
  if (map.has(id)) return map.get(id);
  const row = table(api, "withholding").get(id) as unknown as
    WithholdingRecord | undefined;
  if (!row) return undefined;
  const slot = slotOf(row);
  map.set(id, slot);
  return slot;
}

/** Prior fiscal years the history shows before the opening budget. */
const PRIOR_BUDGET_YEARS = 2;

/** The same month and day `years` earlier (February 29 falls back to the 28th). */
function yearsEarlier(date: string, years: number): string {
  const day = date.slice(5) === "02-29" ? "02-28" : date.slice(5);
  return `${Number(date.slice(0, 4)) - years}-${day}`;
}

/**
 * Pre-start government pass (M1-14): a budget adopted between the window's
 * start and day one is entered in the history, from the budget's own record,
 * and so are its prior years' budgets, each the opening budget's lines taken
 * back by the level's published spending growth (prior-year-growth.json, an
 * estimate with its spread; the record names the growth and its source).
 */
function budgetHistory(
  api: CoreAPI,
  window: PreStartWindow,
  history: HistoryWriter,
): void {
  const governmentsById = new Map(
    governments(api).map((gov) => [gov.id, gov] as const),
  );
  for (const row of table(api, "budgets").rows()) {
    const budget = row as unknown as BudgetRow;
    if (budget.adoptedOn < window.from || budget.adoptedOn > window.through)
      continue;
    history.record({
      id: `budget-adopted:${budget.id}`,
      date: makeIsoDate(budget.adoptedOn),
      kind: "budget.adopted",
      facts: {
        budgetId: budget.id,
        governmentId: budget.governmentId,
        fiscalYear: budget.fiscalYear,
        adoptedBy: budget.adoptedBy,
      },
      publicRecord: true,
      source: {
        tag: "ESTIMATED",
        asOf: api.state.date,
        citation: `Budget record ${budget.id}: ${budget.source}`,
        estimatedFrom:
          "The opening's carried budget and its adoption date, as the world recorded them.",
      },
    });
    const gov = governmentsById.get(budget.governmentId);
    if (!gov) continue;
    const growth =
      gov.level === "federal"
        ? priorGrowth.levels.federal
        : priorGrowth.levels["state-and-local"];
    for (let back = 1; back <= PRIOR_BUDGET_YEARS; back += 1) {
      const adoptedOn = yearsEarlier(budget.adoptedOn, back);
      if (adoptedOn < window.from) break;
      const divisor = (1 + growth.annualGrowth) ** back;
      // Each line as a fact of its own (`spending.schools`), taken back.
      const scale = (
        kind: "spending" | "revenue",
        lines: Readonly<Record<string, number>>,
      ) =>
        Object.fromEntries(
          Object.entries(lines).map(([line, minor]) => [
            `${kind}.${line}`,
            Math.round(minor / divisor),
          ]),
        );
      const fiscalYear = budget.fiscalYear - back;
      history.record({
        id: `budget-adopted:budget:${budget.governmentId}:${fiscalYear}`,
        date: makeIsoDate(adoptedOn),
        kind: "budget.adopted",
        facts: {
          budgetId: `budget:${budget.governmentId}:${fiscalYear}`,
          governmentId: budget.governmentId,
          fiscalYear,
          adoptedBy: budget.adoptedBy,
          openingBudgetId: budget.id,
          yearsBack: back,
          annualGrowth: growth.annualGrowth,
          growthLow: growth.spread.low,
          growthHigh: growth.spread.high,
          ...scale("spending", budget.spendingMinor),
          ...scale("revenue", budget.revenueMinor),
        },
        publicRecord: true,
        source: {
          tag: "ESTIMATED",
          asOf: api.state.date,
          citation: growth.citation,
          estimatedFrom: `The opening budget ${budget.id} taken back ${back} year${back === 1 ? "" : "s"} at ${(growth.annualGrowth * 100).toFixed(1)} percent growth a year (single years ran ${(growth.spread.low * 100).toFixed(1)} to ${(growth.spread.high * 100).toFixed(1)} percent).`,
        },
      });
    }
  }
}

export const BUDGETS_MODULE: PreStartModule = {
  id: BUDGETS_MODULE_ID,
  preStart: { phase: "government", run: budgetHistory },
  state: {
    schemaVersion: 1,
    tables: {
      governments: {},
      budgets: { indexes: { byGovernment: { fields: ["governmentId"] } } },
      withholding: { indexes: { byPerson: { fields: ["personId"] } } },
      priorities: {},
      /** Each government's spending changes from every budget bill it enacted. */
      enacted: {},
      /** The measure that last changed each government's spending line (a bill, an ordinance, an adoption), for the engines that serve from the line. */
      lineChanges: {},
      yearToDate: {},
      outsideRevenue: {
        indexes: { byGovernment: { fields: ["governmentId"] } },
      },
      /** The part of each spending line that left the town, by the group it paid. */
      spendingPayments: {
        indexes: { byGovernment: { fields: ["governmentId"] } },
      },
      /** Each tax paid by a named group of payers on its due date. */
      taxPayments: {
        indexes: { byGovernment: { fields: ["governmentId"] } },
      },
      /** Each treasury's monthly close: every line's money, where it went. */
      treasuryMonths: {
        indexes: { byGovernment: { fields: ["governmentId"] } },
      },
      /** Pay each treasury paid on paydays since its last close, by line. */
      sinceClose: {},
      /** What the town's own payers paid a treasury on a line with named outside payers since the last installment. */
      townRevenue: {},
      /** What each treasury's lines fell short at its last close, owed at the next. */
      arrears: {},
      /** Each change to an award that landed on a person, and what told them why. */
      landed: {},
      /** Each Social Security award's amount at the base federal line. */
      awardBase: {},
      /** What the federal treasury owes each group of lenders, and what it has borrowed and paid them. */
      federalDebt: {},
      /** Each government's charges as a part of the town's living cost, for the next month. */
      serviceCharges: {},
      /** What households paid each government's charges in a month, by service. */
      serviceChargeMonths: {
        indexes: { byGovernment: { fields: ["governmentId"] } },
      },
    },
  },
  journalSourceProviders: {
    [WITHHOLDING_KIND]: (api, reference) => withholdingSlot(api, reference.id),
  },
  onCalendarWork: (api, work) => {
    adoptBudget(api, work);
    holdBudgetHearing(api, work);
    closeMonth(api, work);
    if (work.kind === "outside-revenue" || work.kind === "budget-adoption")
      syncServiceCharges(api);
  },
  onWorkPayroll: withhold,
  eventKinds: ["law-took-effect", "budget-line-changed"],
  onEvent: (api, event) => {
    const series = event.facts?.series;
    if (series === "sales-tax" || series === GROCERY_EXEMPTION)
      syncSalesTax(api);
    if (event.kind === "budget-line-changed") {
      syncServiceCharges(api);
      const f = event.facts ?? {};
      if (f.governmentId && f.line)
        table(api, "lineChanges").put({
          id: `${f.governmentId}:${f.line}`,
          governmentId: f.governmentId,
          line: f.line,
          measureId: f.measureId ?? event.id,
          date: event.date,
        } as unknown as ModuleRow);
    }
    // A change to the federal Social Security line reaches the next payment.
    if (
      event.kind === "budget-line-changed" &&
      event.facts?.level === "federal" &&
      event.facts?.line === "socialSecurity"
    )
      applySocialSecurityLevel(api, {
        measureId: event.facts.measureId ?? event.id,
      });
  },
};

function table(api: CoreAPI, name: string) {
  return api.moduleState(BUDGETS_MODULE_ID).table(name);
}

interface PlaceBases {
  name: string;
  fiscalYearStart: string;
  population2024?: number;
  /** An island area's 2020 Census Island Areas count (Guam, the Virgin Islands, American Samoa, the Northern Marianas). */
  islandAreaPopulation2020?: number;
  /** Puerto Rico's Census population estimate. */
  puertoRicoPopulation2025?: number;
  /** An island area's all-funds government spending in the opening year, in millions, where published. */
  territoryAllFundsSpendingFY2025Millions?: number | null;
  state?: { revenue: Record<string, number>; spending: Record<string, number> };
  /** One base row per government the place opens, by row name (the exporter's `add_government_rows`). */
  governments: Partial<Record<BaseRowName, BaseRow>>;
}
type BaseRowName = "federal" | "state" | "county" | "county-whole" | "city";
interface BaseRow {
  readonly revenue: Readonly<Record<string, number>>;
  readonly spending: Readonly<Record<string, number>>;
  /** A row that is an estimate carries the stopgap that replaces it. */
  readonly stopgapId?: string;
  /** The nation's statement is whole dollars, not dollars a resident. */
  readonly totalDollars?: boolean;
  readonly source?: string;
}
const bases = budgetBases as unknown as {
  calibration: { factor: number };
  places: Record<string, PlaceBases>;
  countyPopulation2024: Record<string, number>;
};

/** A place's residents: the states' and D.C.'s Census estimate, else an island area's count. */
function residentsOfPlace(place: PlaceBases | undefined): number {
  return (
    place?.population2024 ??
    place?.puertoRicoPopulation2025 ??
    place?.islandAreaPopulation2020 ??
    0
  );
}

function government(
  api: CoreAPI,
  row: Omit<GovernmentRow, "organizationId">,
  unitId?: string,
): GovernmentRow {
  // Each government's treasury is its own account. The opening's public
  // employers are outside payers with no cash; their pay should draw from
  // this treasury once the core links them (needs OPUS-CORE).
  const organizationId = `organization:treasury:${row.id}`;
  const jurisdictionId =
    row.level === "federal"
      ? federalJurisdictionId()
      : row.level === "state"
        ? stateJurisdictionId(row.id)
        : undefined;
  if (!api.state.organizations.has(organizationId))
    api.addOrganization({
      id: organizationId,
      placeId: lawChain(api).townPlaceId,
      name: `${row.name} treasury`,
      kind: "government-treasury",
      // stopgapId: SG-WORLD-government-opening-fund-balance
      liquidMinor: 0,
      source: {
        tag: "SOURCED",
        citation: "U.S. Census Bureau, 2025 government units listing",
        asOf: api.state.date,
      },
      governmentFacts: {
        governmentKey: unitId ?? row.id,
        // A state's and the nation's offices name their government by jurisdiction.
        ...(jurisdictionId ? { governmentJurisdictionId: jurisdictionId } : {}),
      },
    });
  const full = { ...row, organizationId };
  table(api, "governments").put(full as unknown as ModuleRow);
  return full;
}

const minor = (dollarsPerResident: number, residents: number, factor: number) =>
  Math.round(dollarsPerResident * residents * factor * 100);

/**
 * This world's factor on a published figure (owner, Oct 27: realistic, not
 * real): one plus the world's own offset for that figure, drawn once from the
 * world's seed, its size between the floor share of the spread and the whole
 * spread named by `spreadKey`. The same factor every year, so a base year and
 * its successors agree. Budget lines, the federal debt and its holders, the
 * payees of a line, the service charges' mix and the states' federal stakes
 * all move by it.
 */
export function budgetWorldFactor(
  api: CoreAPI,
  key: string,
  spreadKey = "budgetWorldLineSpreadShare",
): number {
  // The one world draw (world-draw.ts), times this table's spread row.
  return (
    api.parameter("one") +
    worldOffsetUnit(api.state.seed, key) * api.parameter(spreadKey)
  );
}

/** A published mix of shares, each moved by the world's factor and summed back to the published total. */
export function budgetWorldShares(
  api: CoreAPI,
  key: string,
  shares: Readonly<Record<string, number>>,
): Record<string, number> {
  const moved = Object.entries(shares).map(
    ([k, v]) =>
      [
        k,
        v *
          budgetWorldFactor(api, `${key}:${k}`, "budgetWorldShareSpreadShare"),
      ] as const,
  );
  const total = Object.values(shares).reduce((a, b) => a + b, 0);
  const sum = moved.reduce((a, [, v]) => a + v, 0);
  return Object.fromEntries(
    moved.map(([k, v]) => [k, sum > 0 ? (v * total) / sum : v]),
  );
}

/** This world's line: the published line moved by the world's factor for that government and line. */
function worldLine(
  api: CoreAPI,
  gov: GovernmentRow,
  line: string,
  minorUnits: number,
): number {
  return Math.round(
    minorUnits * budgetWorldFactor(api, `budget-world:${gov.id}:${line}`),
  );
}

function budgetFor(
  api: CoreAPI,
  gov: GovernmentRow,
  stateKey: string,
  fiscalYear: number,
  date: string,
  adoptedBy: string,
): BudgetRow {
  const published = publishedBudgetFor(
    gov,
    stateKey,
    fiscalYear,
    date,
    adoptedBy,
  );
  const moved = (lines: Record<string, number>) =>
    Object.fromEntries(
      Object.entries(lines).map(([line, v]) => [
        line,
        worldLine(api, gov, line, v),
      ]),
    );
  return {
    ...published,
    revenueMinor: moved(published.revenueMinor),
    spendingMinor: moved(published.spendingMinor),
    source: `${published.source}; this world's lines, drawn around it (budgetWorldLineSpreadShare)`,
  };
}

const BASES_SOURCE =
  "data/research/money/public-budget-bases.json (Census state and local finances, fiscal 2022, calibrated to the opening year)";
const FEDERAL_ROW: BaseRow = {
  revenue: (federal as unknown as { receipts: Record<string, number> })
    .receipts,
  spending: (federal as unknown as { outlays: Record<string, number> }).outlays,
  totalDollars: true,
  source:
    "U.S. Treasury, Monthly Treasury Statement, fiscal 2025 (data/research/money/federal-budget-fy2025.json)",
};
/** Every government's base row for a place, by row name: the nation's and the place's own. */
function baseRowsOf(stateKey: string): Partial<Record<BaseRowName, BaseRow>> {
  return { federal: FEDERAL_ROW, ...bases.places[stateKey]?.governments };
}

/** A government's year at the published bases (calibration; play reads `budgetFor`). */
export function publishedBudgetFor(
  gov: GovernmentRow,
  stateKey: string,
  fiscalYear: number,
  date: string,
  adoptedBy: string,
): BudgetRow {
  const row = baseRowsOf(stateKey)[gov.base];
  // A row is dollars a resident in fiscal 2022 (the calibration carries it to
  // the opening year), or the nation's statement in whole dollars.
  const amount = (v: number) =>
    row?.totalDollars
      ? Math.round(v * 100)
      : minor(v, gov.residents, bases.calibration.factor);
  const lines = (side: Readonly<Record<string, number>> = {}) =>
    Object.fromEntries(Object.entries(side).map(([k, v]) => [k, amount(v)]));
  const revenue = lines(row?.revenue);
  const spending = lines(row?.spending);
  const source = row?.source ?? BASES_SOURCE;
  const startsOn = `${fiscalYear}-${gov.fiscalYearStart}`;
  return {
    id: `budget:${gov.id}:${fiscalYear}`,
    governmentId: gov.id,
    fiscalYear,
    startsOn,
    adoptedOn: date,
    adoptedBy,
    revenueMinor: revenue,
    spendingMinor: spending,
    source,
  };
}

/** The fiscal year a date falls in, named by the year it starts. */
export function fiscalYearOf(date: string, start: string): number {
  const year = Number(date.slice(0, 4));
  return date.slice(5) >= start ? year : year - 1;
}

const LOCAL_YEARS = localYears as unknown as {
  states: Record<string, Record<string, { population: number; end: string }[]>>;
  national: Record<string, string>;
};

/**
 * A local government's fiscal year start (MM-DD): its state's sampled unit of
 * the same type nearest it in population (Census 2024 unit files), else the
 * national most common year end for the type.
 */
export function localFiscalYearStart(
  stateKey: string,
  type: "county" | "municipal",
  population: number,
): string {
  const units = LOCAL_YEARS.states[stateKey]?.[type] ?? [];
  const nearest = [...units].sort(
    (a, b) =>
      Math.abs(a.population - population) -
        Math.abs(b.population - population) || a.end.localeCompare(b.end),
  )[0];
  const end = nearest?.end ?? LOCAL_YEARS.national[type]!;
  const date = new Date(
    Date.UTC(2023, Number(end.slice(0, 2)) - 1, Number(end.slice(2, 4)) + 1),
  );
  return date.toISOString().slice(5, 10);
}

/** Register the module, open each government's treasury and the budget in force. */
export function openBudgets(core: CoreState): readonly GovernmentRow[] {
  if (!core.modules.has(BUDGETS_MODULE_ID))
    registerModule(core, BUDGETS_MODULE);
  const api = coreAPI(core);
  const chain = lawChain(api);
  const place = bases.places[chain.stateKey];
  const stateStart = place?.fiscalYearStart ?? "07-01";
  const townResidents =
    Number(api.state.placeMetadata.referencePopulation) || core.people.size;
  const govs: GovernmentRow[] = [
    government(api, {
      id: "US",
      level: "federal",
      base: "federal",
      name: "United States",
      fiscalYearStart: "10-01",
      residents: 0,
    }),
    government(api, {
      id: chain.stateKey,
      level: "state",
      base: "state",
      name: place?.name ?? chain.stateKey,
      fiscalYearStart: stateStart,
      residents: residentsOfPlace(place),
    }),
  ];
  const geoid = chain.levels[chain.levels.length - 1]!.jurisdiction.slice(
    "place:".length,
  );
  // The town's own government: its city or village, or where the place has
  // none, the township that governs it.
  // (the same units the town's offices are seated for).
  const local = placeLocalGovernmentUnits(corePlaceByKey(geoid));
  const city = local.municipal[0] ?? local.townships[0];
  const county = chain.countyGeoids[0];
  const countyUnit = county ? countyGovernmentUnit(county) : null;
  if (countyUnit)
    govs.push(
      government(
        api,
        {
          id: `county:${county}`,
          level: "county",
          name: countyUnit.name,
          fiscalYearStart: localFiscalYearStart(
            chain.stateKey,
            "county",
            bases.countyPopulation2024[county!] ?? townResidents,
          ),
          residents: bases.countyPopulation2024[county!] ?? townResidents,
          base: city ? "county" : "county-whole",
        },
        countyUnit.id,
      ),
    );

  // A municipio (Puerto Rico) is its own government and the employer of the
  // town's police, schools and offices, though the law chain holds no county
  // for it: its treasury is the county-level government of the town.
  const municipio = countyUnit ? undefined : local.counties[0];
  if (municipio)
    govs.push(
      government(
        api,
        {
          id: `county:${municipio.id.slice("municipio:".length)}`,
          level: "county",
          name: municipio.name,
          fiscalYearStart: localFiscalYearStart(
            chain.stateKey,
            "county",
            townResidents,
          ),
          residents: townResidents,
          base: city ? "county" : "county-whole",
        },
        municipio.id,
      ),
    );
  if (city)
    govs.push(
      government(
        api,
        {
          id: `place:${geoid}`,
          level: "city",
          base: "city",
          name: city.name,
          fiscalYearStart: localFiscalYearStart(
            chain.stateKey,
            "municipal",
            townResidents,
          ),
          residents: townResidents,
        },
        city.id,
      ),
    );
  // The opening's public employers (the county's offices, schools, police)
  // draw their wages from their own government's treasury; what it can't
  // cover is a record the month's close reads (public-pay shortfall).
  for (const employer of core.organizations.values()) {
    const authority = employer.publicPayAuthority;
    if (!authority) continue;
    const treasury = govs.find((g) =>
      sameGovernment(employer, core.organizations.get(g.organizationId)!),
    );
    if (treasury)
      api.fundPublicPay(authority.id, treasury.organizationId, employer.source);
  }
  const calendar = api.moduleCalendar(BUDGETS_MODULE_ID);
  for (const gov of govs) {
    const fy = fiscalYearOf(core.date, gov.fiscalYearStart);
    const stopgapId = baseRowsOf(chain.stateKey)[gov.base]?.stopgapId;
    if (stopgapId) api.stopgap(stopgapId);
    table(api, "budgets").put(
      budgetFor(
        api,
        gov,
        chain.stateKey,
        fy,
        `${fy}-${gov.fiscalYearStart}`,
        "in force at the opening",
      ) as unknown as ModuleRow,
    );
    calendar.schedule({
      key: `adopt:${gov.id}:${fy + 1}`,
      date: `${fy + 1}-${gov.fiscalYearStart}`,
      kind: "budget-adoption",
      source: {
        tag: "ESTIMATED",
        citation:
          "Fiscal year start (data/research/money/public-budget-bases.json)",
        asOf: core.date,
        estimatedFrom:
          "Fiscal year start of the state's sampled unit of the same type.",
      },
      sourceRecordIds: [gov.id],
    });
    scheduleBudgetHearing(api, gov, fy + 1, core.date);
  }
  syncSalesTax(api);
  syncServiceCharges(api);
  scheduleOutsideRevenue(api, core.date);
  return govs;
}

function scheduleOutsideRevenue(api: CoreAPI, after: string): void {
  const d = new Date(`${after.slice(0, 7)}-01T00:00:00Z`);
  d.setUTCMonth(d.getUTCMonth() + 1);
  const date = d.toISOString().slice(0, 10);
  api.moduleCalendar(BUDGETS_MODULE_ID).schedule({
    key: `outside-revenue:${date}`,
    date,
    kind: "outside-revenue",
    source: {
      tag: "ESTIMATED",
      citation:
        "Census per-resident revenue and spending (public-budget-bases.json); Treasury fiscal 2025 statement (federal-budget-fy2025.json)",
      asOf: api.state.date,
      estimatedFrom: "SG-GOV-outside-revenue-monthly",
    },
    sourceRecordIds: ["budgets:outside-revenue"],
  });
}

/**
 * Laws that set a budget line's level (a dedicated levy, a share of one line
 * moved to another) are read by the treasury each month it closes and each
 * year a budget is adopted, so the line it pays is the line the law in force
 * sets. Law reach registers what runs them.
 */
let standingLineLaws: ((api: CoreAPI) => void) | null = null;
export function registerStandingLineLaws(run: (api: CoreAPI) => void): void {
  standingLineLaws = run;
}

/**
 * Each month: the tax collector passes property tax on, then every treasury
 * receives its revenue from outside the town's flows and pays a twelfth of
 * each budget line (`budgets-treasury.ts`). Counted workers' taxes are
 * withheld on each payday from each group's pay (`counted-money.ts`).
 */
function closeMonth(api: CoreAPI, work: Readonly<ModuleCalendarWork>): void {
  if (work.kind !== "outside-revenue") return;
  remitPropertyTax(api, work.source);
  standingLineLaws?.(api);
  // stopgapId: SG-GOV-outside-revenue-monthly
  api.stopgap("SG-GOV-outside-revenue-monthly");
  closeTreasuries(api, work.source);
  // Standing programs a law has a treasury pay each month (a state's
  // redistricting commission), registered by the engines that apply them.
  for (const pay of monthlyPrograms) pay(api, work.source);
  scheduleOutsideRevenue(api, api.state.date);
}

const monthlyPrograms: ((api: CoreAPI, source: Source) => void)[] = [];
/** An engine registers a program its law has a treasury pay at each month's close. */
export function registerMonthlyProgram(
  pay: (api: CoreAPI, source: Source) => void,
): void {
  if (!monthlyPrograms.includes(pay)) monthlyPrograms.push(pay);
}

const GROCERY_EXEMPTION =
  "us-policy-positions:fiscal.exempt-groceries-from-sales-tax";
/** Retail sellers' classification: where households buy food at home. */
const GROCERY_SELLERS = "enterprise:retail";

/**
 * The sales tax in force collected on every purchase in town (core2-api-v21):
 * each level's rate to its own treasury (a local rate without a city
 * government goes to the county, else the state), set so the levels' shares
 * sum to the combined tax inside the price; groceries are exempt where a
 * grocery exemption is law. Re-run when a sales-tax law takes effect.
 */
export function syncSalesTax(api: CoreAPI): void {
  registerPropertyTax(propertyTaxTerms);
  taxCollector(api);
  if (!api.state.modules.has(BUDGETS_MODULE_ID)) return;
  const answer = lawInForce(api, "sales-tax");
  const town = lawChain(api).townPlaceId;
  const govs = governments(api);
  const payee = (level: string) =>
    (level === "city" || level === "township"
      ? (govs.find((g) => g.level === "city") ??
        govs.find((g) => g.level === "county"))
      : level === "county"
        ? govs.find((g) => g.level === "county")
        : undefined) ?? govs.find((g) => g.level === "state");
  const rates = new Map<string, number>();
  const rows = new Map<string, { key: string; lawId: string }[]>();
  for (const l of answer.levels) {
    if (!l.row || l.setAside || l.level === "federal") continue;
    const gov = payee(l.level);
    const value = l.row.value ?? 0;
    if (!gov || !(value > 0)) continue;
    rates.set(gov.id, (rates.get(gov.id) ?? 0) + value);
    rows.set(gov.id, [
      ...(rows.get(gov.id) ?? []),
      { key: l.row.series, lawId: l.row.id },
    ]);
  }
  const total = [...rates.values()].reduce((a, b) => a + b, 0);
  const exempting = yesLevels(api, GROCERY_EXEMPTION);
  // A state's exemption spares groceries from every level's tax, as the
  // state sets the base local sales taxes follow; a county's or city's spares
  // only its own tax, which is all a local vote can change.
  api.stopgap("SG-LAWS-grocery-exemption-local-base");
  // stopgapId: SG-LAWS-grocery-exemption-local-base
  const exemptionFor = (level: string): LawRowInput | null =>
    (
      exempting.find((l) => l.level === "state") ??
      exempting.find(
        (l) =>
          l.level === level || (level === "city" && l.level === "township"),
      )
    )?.row ?? null;
  for (const gov of govs) {
    const exemption = exemptionFor(gov.level);
    const id = `sales-tax:${gov.id}`;
    const rate = rates.get(gov.id) ?? 0;
    const account = accountFor(api, gov.id);
    if (!account) continue;
    // The share of a tax-inclusive price that is this level's: rate / (100 + total).
    const effective = rate > 0 ? (100 * rate) / (100 + total - rate) : 0;
    api.setPurchaseTax({
      id,
      placeId: town,
      ratePercent: effective,
      payeeAccountId: account,
      ...(exemption
        ? {
            exemptions: [
              {
                classificationPrefix: GROCERY_SELLERS,
                share: lawParameters.parameters.groceryShareOfRetailSales.value,
                lawKey: GROCERY_EXEMPTION,
                lawId: exemption.id,
              },
            ],
          }
        : {}),
      ...(rows.get(gov.id) ? { laws: rows.get(gov.id)! } : {}),
      from: api.state.date,
      source: {
        tag: answer.estimate ? "ESTIMATED" : "SOURCED",
        citation: `Sales tax in force (${gov.name})`,
        asOf: api.state.date,
        ...(answer.estimate ? { estimatedFrom: "starting-law" } : {}),
      },
    });
  }
}

/**
 * Property tax for WORLD's billing: the county's rate in force (a share of
 * the home's value), paid to the treasury that collects it: the county,
 * else the city, else the state.
 */
function propertyTaxTerms(api: CoreAPI) {
  if (!api.state.modules.has(BUDGETS_MODULE_ID)) return undefined;
  const answer = lawInForce(api, "property-tax");
  const row = answer.governing;
  if (!row || answer.value === null || !(answer.value >= 0)) return undefined;
  const collector = taxCollector(api);
  if (!collector) return undefined;
  const citation = Array.isArray(row.source)
    ? row.source.join(" ; ")
    : (row.source as string);
  const cap = lawInForce(
    api,
    "us-policy-positions:fiscal.cap-property-tax-growth",
  );
  const capped = cap.value === 1 && cap.governing;
  // The state's own cap statute where its row is read; the generic estimate
  // (stopgapId: SG-GOV-REACH-B-property-tax-bills) for a state without one.
  const statute = capped
    ? (
        propertyTaxCaps.states as Record<
          string,
          { capShare: number; scope: string; source: string }
        >
      )[lawChain(api).stateKey.slice(3)]
    : undefined;
  if (capped && !statute) api.stopgap("SG-GOV-REACH-B-property-tax-bills");
  const capShare = statute
    ? statute.capShare
    : lawParameters.parameters.propertyTaxGrowthCapShare.value;
  const capSource = statute
    ? `${statute.source} (${statute.scope} property)`
    : lawParameters.parameters.propertyTaxGrowthCapShare.source;
  return {
    rate: answer.value / 100,
    lawRowId: row.id,
    ...(capped
      ? {
          assessmentCapShare: capShare,
          assessmentLawRowId: capped.id,
        }
      : {}),
    payeeId: collector,
    source: {
      tag: "ESTIMATED" as const,
      citation: `${row.id}: ${citation}${capped ? `; ${capped.id}: ${String(capped.source)}; ${capSource}` : ""}`,
      asOf: api.state.date,
      estimatedFrom:
        "Property tax in force, to the county's tax collector; a yes/no growth cap uses the registered assessment-cap estimate.",
    },
  };
}

/**
 * The county's tax collector (the city's, else the state's, where there's no
 * county government): owners pay it, and it passes each levying
 * government's share on each month.
 */
function taxCollector(api: CoreAPI): string | null {
  const govs = governments(api);
  const county =
    govs.find((g) => g.level === "county") ??
    govs.find((g) => g.level === "city") ??
    govs.find((g) => g.level === "state");
  if (!county) return null;
  const id = `organization:tax-collector:${county.id}`;
  if (!api.state.organizations.has(id))
    api.addOrganization({
      id,
      placeId: lawChain(api).townPlaceId,
      name: `${county.name} tax collector`,
      kind: "government-treasury",
      liquidMinor: 0,
      source: {
        tag: "SOURCED",
        citation: "U.S. Census Bureau, 2025 government units listing",
        asOf: api.state.date,
      },
      governmentFacts: { governmentKey: county.id },
    });
  return id;
}

/**
 * The tax collector passes on what it collected: each government that
 * levies property tax (state, county, city) gets its share, by what it
 * levies per resident (Census property-tax revenue over residents).
 */
function remitPropertyTax(api: CoreAPI, source: Source): void {
  const id = taxCollector(api);
  const collected = id
    ? (api.state.organizations.get(id)?.liquidMinor ?? 0)
    : 0;
  if (!id || collected <= 0) return;
  const levies = governments(api)
    .filter((g) => g.level !== "federal" && g.residents > 0)
    .map((g) => {
      const budget = budgetsOf(api, g.id)
        .filter((b) => b.startsOn <= api.state.date)
        .at(-1);
      return {
        gov: g,
        perResident: (budget?.revenueMinor.propertyTax ?? 0) / g.residents,
      };
    })
    .filter((l) => l.perResident > 0);
  // Where no government in the game levies it (the place's local levels have
  // no government of their own), the collector's own government keeps it.
  if (!levies.length) {
    const own = governments(api).find(
      (g) =>
        g.id ===
        api.state.organizations.get(id)?.governmentFacts?.governmentKey,
    );
    if (own) levies.push({ gov: own, perResident: 1 });
  }
  const total = levies.reduce((sum, l) => sum + l.perResident, 0);
  if (!(total > 0)) return;
  const accounts = api.accounts();
  let left = collected;
  levies.forEach((l, i) => {
    const amount =
      i === levies.length - 1
        ? left
        : Math.floor((collected * l.perResident) / total);
    left -= amount;
    if (amount > 0)
      accounts.transfer({
        id: `property-tax-remit:${l.gov.id}:${api.state.date}`,
        from: accounts.main(id),
        to: accounts.main(l.gov.organizationId),
        amountMinor: amount,
        reasonKey: "property-tax-remit",
        source,
      });
  });
}

/** The grocery exemption law row in force for the town (the latest yes at any level), or null. */
/** The executive's budget priorities for the next fiscal year: changes to lines, by government. */
export function setBudgetPriorities(
  api: CoreAPI,
  input: {
    readonly governmentId: string;
    readonly setBy: string;
    readonly changes: Readonly<Record<string, number>>;
  },
): void {
  table(api, "priorities").put({
    id: input.governmentId,
    ...input,
  } as unknown as ModuleRow);
}

/** The year's priorities are spent once its budget bill is voted. */
export function clearBudgetPriorities(
  api: CoreAPI,
  governmentId: string,
): void {
  table(api, "priorities").remove(governmentId);
}

export function budgetPriorities(
  api: CoreAPI,
  governmentId: string,
): {
  readonly setBy: string;
  readonly changes: Readonly<Record<string, number>>;
} | null {
  return (
    (table(api, "priorities").get(governmentId) as unknown as
      { setBy: string; changes: Record<string, number> } | undefined) ?? null
  );
}

/** The measure that last carried a change into a government's spending line (an ordinance or act that amended it), if one did. */
export function carriedMeasureOf(
  api: CoreAPI,
  governmentId: string,
  line: string,
): string | null {
  return (
    (
      table(api, "enacted").get(governmentId) as unknown as
        { measures?: Record<string, string> } | undefined
    )?.measures?.[line] ?? null
  );
}

/** The spending changes every budget bill a government enacted has made, by line. */
export function enactedBudgetChanges(
  api: CoreAPI,
  governmentId: string,
): Readonly<Record<string, number>> {
  return (
    (
      table(api, "enacted").get(governmentId) as unknown as
        { changes: Record<string, number> } | undefined
    )?.changes ?? {}
  );
}

/**
 * A year's budget as the legislature has written it: the base amounts with
 * every enacted budget bill's line changes, plus the given changes. Acts and
 * laws that amend a year's budget (`amendBudget`) apply on top each year, so
 * they never pile up by being carried forward.
 */
/** A year's budget at its Census base: no enacted or proposed changes. */
export function baseBudget(
  api: CoreAPI,
  gov: GovernmentRow,
  fy: number,
): BudgetRow {
  return budgetFor(
    api,
    gov,
    lawChain(api).stateKey,
    fy,
    api.state.date,
    "base",
  );
}

function legislatedBudget(
  api: CoreAPI,
  gov: GovernmentRow,
  fy: number,
  adoptedBy: string,
  changes: Readonly<Record<string, number>>,
): BudgetRow {
  const base = budgetFor(
    api,
    gov,
    lawChain(api).stateKey,
    fy,
    api.state.date,
    adoptedBy,
  );
  const spending = { ...base.spendingMinor };
  for (const set of [enactedBudgetChanges(api, gov.id), changes])
    for (const [line, delta] of Object.entries(set))
      spending[line] = Math.max(0, (spending[line] ?? 0) + delta);
  return { ...base, spendingMinor: spending };
}

/**
 * The next year's budget as proposed: the lines the legislature has enacted
 * carried forward, with the priorities set for the year applied. The
 * legislature engine votes it.
 */
export function proposedBudget(
  api: CoreAPI,
  gov: GovernmentRow,
  fy: number,
  adoptedBy: string,
): BudgetRow {
  return legislatedBudget(
    api,
    gov,
    fy,
    adoptedBy,
    budgetPriorities(api, gov.id)?.changes ?? {},
  );
}

/**
 * A budget bill the legislature passed: its line changes join the
 * government's enacted lines and the year's budget is adopted with them.
 */
export function enactBudget(
  api: CoreAPI,
  gov: GovernmentRow,
  fy: number,
  adoptedBy: string,
  changes: Readonly<Record<string, number>>,
): BudgetRow {
  const prior = table(api, "enacted").get(gov.id) as unknown as
    | {
        changes: Record<string, number>;
        byYear?: Record<string, Record<string, number>>;
        measures?: Record<string, string>;
      }
    | undefined;
  const enacted = { ...(prior?.changes ?? {}) };
  const year = { ...(prior?.byYear?.[String(fy)] ?? {}) };
  for (const [line, delta] of Object.entries(changes)) {
    enacted[line] = (enacted[line] ?? 0) + delta;
    year[line] = (year[line] ?? 0) + delta;
  }
  table(api, "enacted").put({
    id: gov.id,
    changes: enacted,
    byYear: { ...(prior?.byYear ?? {}), [String(fy)]: year },
    ...(prior?.measures ? { measures: prior.measures } : {}),
  } as unknown as ModuleRow);
  const budget = legislatedBudget(api, gov, fy, adoptedBy, {});
  putBudget(api, budget);
  return budget;
}

/**
 * What the departments ask for next year, line by line: each line as the
 * body last enacted it. A budget bill with no executive to propose it
 * carries these lines (the legislature engine writes the bill).
 */
export function departmentRequests(
  api: CoreAPI,
  gov: GovernmentRow,
  fy: number,
): Readonly<Record<string, number>> {
  return legislatedBudget(api, gov, fy, "department requests", {})
    .spendingMinor;
}

/**
 * A line as the government adopted it for a fiscal year: its Census estimate
 * with every budget bill the body enacted, before any act amends it during
 * the year. Measures that change a line count their change from this.
 */
export function adoptedLine(
  api: CoreAPI,
  gov: GovernmentRow,
  fy: number,
  line: string,
): number {
  return legislatedBudget(api, gov, fy, "adopted", {}).spendingMinor[line] ?? 0;
}

/**
 * A line as it stood before the year's own budget bill: the adopted line less
 * what that bill changed in it. What a service is measured against, so a
 * change the body adopts this year reaches the people the line serves, and
 * becomes the base the next year.
 */
export function lineBeforeBill(
  api: CoreAPI,
  gov: GovernmentRow,
  fy: number,
  line: string,
): number {
  const year =
    (
      table(api, "enacted").get(gov.id) as unknown as
        { byYear?: Record<string, Record<string, number>> } | undefined
    )?.byYear?.[String(fy)]?.[line] ?? 0;
  return Math.max(0, adoptedLine(api, gov, fy, line) - year);
}

/**
 * A line as it would stand with no budget bill ever passed: the adopted line
 * less every change the government's bills carried into its enacted lines,
 * this year's and earlier years'. What a service is measured against, so a
 * raise a bill carries keeps moving the service in every later year it stays
 * in the line, and putting the old amount back ends it.
 */
export function lineWithoutBills(
  api: CoreAPI,
  gov: GovernmentRow,
  fy: number,
  line: string,
): number {
  return Math.max(
    0,
    adoptedLine(api, gov, fy, line) -
      (enactedBudgetChanges(api, gov.id)[line] ?? 0),
  );
}

/** A year's budget when its bill fails: the enacted lines carried forward. */
export function carriedBudget(
  api: CoreAPI,
  gov: GovernmentRow,
  fy: number,
  adoptedBy: string,
): BudgetRow {
  const budget = legislatedBudget(api, gov, fy, adoptedBy, {});
  putBudget(api, budget);
  return budget;
}

export function putBudget(api: CoreAPI, budget: BudgetRow): void {
  table(api, "budgets").put(budget as unknown as ModuleRow);
}

let councilBudgetVote:
  ((api: CoreAPI, gov: GovernmentRow, fy: number) => BudgetRow | null) | null =
  null;
/** The legislature engine registers how a council votes its budget. */
export function registerBudgetVote(
  vote: (api: CoreAPI, gov: GovernmentRow, fy: number) => BudgetRow | null,
): void {
  councilBudgetVote = vote;
}

let councilBudgetHearing:
  ((api: CoreAPI, gov: GovernmentRow, fy: number) => void) | null = null;
/** The legislature engine registers how a council holds its public hearing on the budget it will vote. */
export function registerBudgetHearing(
  hearing: (api: CoreAPI, gov: GovernmentRow, fy: number) => void,
): void {
  councilBudgetHearing = hearing;
}

/** The day a government's public hearing on its next budget falls: the hearing lead before the year starts. */
function scheduleBudgetHearing(
  api: CoreAPI,
  gov: GovernmentRow,
  fy: number,
  after: string,
): void {
  const date = addDays(
    makeIsoDate(`${fy}-${gov.fiscalYearStart}`),
    -api.parameter("budgetHearingLeadDays"),
  );
  // A year already inside its hearing lead at the opening has no hearing to hold.
  if (date <= after) return;
  api.moduleCalendar(BUDGETS_MODULE_ID).schedule({
    key: `hearing:${gov.id}:${fy}`,
    date,
    kind: "budget-hearing",
    source: {
      tag: "ESTIMATED",
      citation:
        "The body's public hearing on the executive's budget, before its vote (budgetHearingLeadDays)",
      asOf: api.state.date,
      estimatedFrom: "budgetHearingLeadDays",
    },
    sourceRecordIds: [gov.id],
  });
}

function holdBudgetHearing(
  api: CoreAPI,
  work: Readonly<ModuleCalendarWork>,
): void {
  if (work.kind !== "budget-hearing") return;
  const gov = table(api, "governments").get(
    work.sourceRecordIds[0]!,
  ) as unknown as GovernmentRow;
  councilBudgetHearing?.(
    api,
    gov,
    fiscalYearOf(api.state.date, gov.fiscalYearStart) + 1,
  );
}

function adoptBudget(api: CoreAPI, work: Readonly<ModuleCalendarWork>): void {
  if (work.kind !== "budget-adoption") return;
  const gov = table(api, "governments").get(
    work.sourceRecordIds[0]!,
  ) as unknown as GovernmentRow;
  const fy = fiscalYearOf(api.state.date, gov.fiscalYearStart);
  // The town's council votes its own budget where the legislature engine runs.
  const enactedBefore = { ...enactedBudgetChanges(api, gov.id) };
  const voted = councilBudgetVote?.(api, gov, fy) ?? null;
  let budget: BudgetRow;
  if (voted) budget = voted;
  else {
    // No body votes it (no seated members, or nothing to vote on): the
    // enacted lines carry, as a charter's carry-forward does.
    budget = carriedBudget(
      api,
      gov,
      fy,
      "carried forward by the budget rule until the council or legislature votes it",
    );
  }
  // The year's budget carries what the laws that set a line's level say.
  standingLineLaws?.(api);
  // The notice names who adopted it: the body's vote, or the carry-forward rule.
  api.emit({
    id: `budget-adopted:${budget.id}`,
    date: api.state.date,
    kind: "budget-adopted",
    personIds: [],
    placeId: lawChain(api).townPlaceId,
    source: voted
      ? {
          tag: "SOURCED",
          citation: `Budget adopted (${budget.adoptedBy})`,
          asOf: api.state.date,
        }
      : work.source,
    publicRecord: true,
    news: true,
    facts: {
      governmentId: gov.id,
      fiscalYear: String(fy),
      adoptedBy: budget.adoptedBy,
    },
  });
  // The line changes the body enacted this year reach whatever each line
  // pays for, as an amendment's change does (law-effects handlers).
  if (voted) {
    const after = enactedBudgetChanges(api, gov.id);
    for (const line of [
      ...new Set([...Object.keys(after), ...Object.keys(enactedBefore)]),
    ].sort()) {
      const delta = (after[line] ?? 0) - (enactedBefore[line] ?? 0);
      if (delta === 0) continue;
      api.emit({
        id: `budget-line-changed:${budget.id}:${line}:adopted`,
        date: api.state.date,
        kind: "budget-line-changed",
        personIds: [],
        placeId: lawChain(api).townPlaceId,
        source: {
          tag: "SOURCED",
          citation: `Budget adopted (${budget.adoptedBy})`,
          asOf: api.state.date,
        },
        publicRecord: true,
        news: false,
        facts: {
          governmentId: gov.id,
          level: gov.level,
          line,
          deltaMinor: String(delta),
          measureId: `budget:${gov.id}:${fy}`,
        },
      });
    }
  }
  api.moduleCalendar(BUDGETS_MODULE_ID).schedule({
    key: `adopt:${gov.id}:${fy + 1}`,
    date: `${fy + 1}-${gov.fiscalYearStart}`,
    kind: "budget-adoption",
    source: work.source,
    sourceRecordIds: [gov.id],
  });
  scheduleBudgetHearing(api, gov, fy + 1, api.state.date);
}

/** The government account a law row's jurisdiction pays into. */
function accountFor(api: CoreAPI, jurisdiction: string): string | null {
  const gov = table(api, "governments").get(jurisdiction) as unknown as
    GovernmentRow | undefined;
  return gov ? `cash:${gov.organizationId}:residual` : null;
}

/** Residence law chains and their starting rows, by the residence's place id (static data). */
const residenceLaw = new Map<
  string,
  { chain: LawChain; rows: readonly LawRowInput[] } | null
>();
function residenceLawFor(placeId: string) {
  if (residenceLaw.has(placeId)) return residenceLaw.get(placeId)!;
  let found: { chain: LawChain; rows: readonly LawRowInput[] } | null = null;
  try {
    const place = corePlaceByJurisdictionId(placeId as never);
    if (place) {
      const chain = lawChainForPlace(place.key);
      found = { chain, rows: startingLawRows(chain) };
    }
  } catch {
    found = null;
  }
  residenceLaw.set(placeId, found);
  return found;
}

/**
 * The income and payroll tax law in force where a worker lives (audit 12). The
 * town's own residents read the town's law. Anyone else reads their own
 * residence's chain (federal, their state, county and place): the town's
 * recorded rows where the jurisdiction is shared with the town (so enacted
 * acts count), the starting rows for the rest.
 */
function residentLaw(
  api: CoreAPI,
  placeId: string,
): (series: string) => LawInForceAnswer {
  if (placeId === lawChain(api).townPlaceId)
    return (series) => lawInForce(api, series);
  const own = residenceLawFor(placeId);
  const town = lawChain(api);
  const shared = new Set(town.levels.map((l) => l.jurisdiction));
  return (series) => {
    if (!own) {
      // stopgapId: SG-WORLD-withholding-residence-law
      api.stopgap("SG-WORLD-withholding-residence-law");
      const answer = lawInForce(api, series);
      return {
        ...answer,
        levels: answer.levels.map((l) =>
          l.level === "federal" ? l : { ...l, row: null },
        ),
      };
    }
    // stopgapId: SG-WORLD-withholding-residence-law
    api.stopgap("SG-WORLD-withholding-residence-law");
    const recorded = api
      .moduleState(LAWS_MODULE_ID)
      .table("laws")
      .query("bySeriesOnly", [series]) as unknown as readonly LawRowInput[];
    const seen = new Set(recorded.map((r) => r.id));
    return resolveLawInForce({
      series,
      chain: own.chain,
      date: api.state.date,
      rows: [
        ...recorded,
        ...own.rows.filter(
          (r) =>
            r.series === series &&
            !shared.has(r.jurisdiction) &&
            !seen.has(r.id),
        ),
      ],
    });
  };
}

/** On payday: the taxes the law in force says come out of this paycheck go to each government. */
function withhold(
  api: CoreAPI,
  receipt: Readonly<WorkPayrollJournalReceipt>,
): void {
  const paid = receipt.paidMinor;
  if (paid <= 0) return;
  // Pay from a treasury is spending on the line the post draws on.
  if (receipt.group)
    for (const part of receipt.components)
      notePublicPay(api, {
        id: part.id,
        organizationId: receipt.organizationId,
        jobId: part.jobId,
        personId: receipt.personId,
        paidMinor: part.paidMinor,
      });
  else
    notePublicPay(api, {
      id: receipt.id,
      organizationId: receipt.organizationId,
      jobId: receipt.jobId,
      personId: receipt.personId,
      paidMinor: paid,
    });
  withholdPay(api, {
    id: receipt.id,
    personId: receipt.personId,
    paidMinor: paid,
    fromAt: receipt.fromAt,
    throughAt: receipt.throughAt,
  });
}

/**
 * The taxes the law in force takes out of one pay (a paycheck, an official's
 * salary) go from the person's cash to each government with a treasury, in one
 * journal entry; the year's pay so far is kept for the Social Security wage base.
 */
export function withholdPay(
  api: CoreAPI,
  pay: {
    readonly id: string;
    readonly personId: string;
    readonly paidMinor: number;
    readonly fromAt: string;
    readonly throughAt: string;
    /** Pay no more than the payer's cash holds: an owner's estimated payment on profit that has not all reached them as cash. */
    readonly limitToCash?: boolean;
  },
): void {
  const paid = pay.paidMinor;
  if (paid <= 0) return;
  const person = api.state.people.get(pay.personId);
  if (!person) return;
  const law = residentLaw(api, person.placeId);
  const year = api.state.date.slice(0, 4);
  const ytdId = `${pay.personId}:${year}`;
  const ytd =
    (
      table(api, "yearToDate").get(ytdId) as unknown as
        { minor: number } | undefined
    )?.minor ?? 0;
  const periodDays = Math.max(
    1,
    Math.round(
      (Date.parse(pay.throughAt) - Date.parse(pay.fromAt)) / 86_400_000,
    ) + 1,
  );
  let lines = withholdingFor({
    paidMinor: paid,
    periodDays,
    yearToDateMinor: ytd,
    incomeTax: law("income-tax"),
    socialSecurity: law("social-security-tax"),
    medicare: law("medicare-tax"),
  });
  if (pay.limitToCash) {
    const owed = lines.reduce((n, l) => n + l.minor, 0);
    const held = Math.max(
      0,
      api.accounts().balance(`cash:${pay.personId}:residual`),
    );
    if (owed > held)
      lines = lines.map((l) => ({
        ...l,
        minor: Math.floor((l.minor * held) / owed),
      }));
  }
  if (
    lines.some(
      (l) =>
        l.level === "county" || l.level === "township" || l.level === "city",
    )
  ) {
    // stopgapId: SG-WORLD-withholding-local-base
    api.stopgap("SG-WORLD-withholding-local-base");
  }
  if (person.placeId !== lawChain(api).townPlaceId) {
    // stopgapId: SG-WORLD-withholding-nonresident-local
    api.stopgap("SG-WORLD-withholding-nonresident-local");
  }
  const posted = postWithholding(api, {
    id: `withholding:${pay.id}`,
    payerId: pay.personId,
    payrollReceiptId: pay.id,
    paidMinor: paid,
    periodDays,
    yearToDateMinor: ytd,
    lines,
  });
  // The year's pay counts once the paycheck is withheld, or had nothing to withhold.
  if (posted || !lines.some((l) => l.minor > 0))
    table(api, "yearToDate").put({
      id: ytdId,
      minor: ytd + paid,
    } as unknown as ModuleRow);
}

/**
 * Post one withholding: the payer's cash to each government with a treasury
 * in the game, in one journal entry. Only lines that reach a treasury are
 * kept on the record, and the record is kept only once the entry posts.
 */
function postWithholding(
  api: CoreAPI,
  input: Omit<
    WithholdingRecord,
    "date" | "personId" | "postings" | "source"
  > & {
    readonly payerId: string;
  },
): WithholdingRecord | null {
  const postings: { id: string; accountId: string; deltaMinor: number }[] = [];
  const kept: WithholdingLine[] = [];
  let total = 0;
  for (const [index, line] of input.lines.entries()) {
    if (line.minor <= 0) continue;
    // A government with no treasury here (another state's, a county or city
    // the world does not model) is paid as an outside government: the tax
    // leaves the paycheck for its outside account, against the due record
    // this withholding itself writes (see `slotOf`).
    const account =
      accountFor(api, line.jurisdiction) ??
      `cash:${outsideGovernment(api, line.jurisdiction)}:residual`;
    kept.push(line);
    // The posting names its tax and the law row it took, so every paycheck's
    // journal entry says what it withheld and under which law; the table keeps
    // the full record only for the player's circle.
    postings.push({
      id: `${input.id}:tax:${index}:${line.level}:${line.tax}:${line.lawId}`,
      accountId: account,
      deltaMinor: line.minor,
    });
    total += line.minor;
  }
  if (!total) return null;
  recordIncomeTaxApplied(api, {
    targetId: input.payerId,
    target: "person",
    count: 1,
    lines: kept,
  });
  postings.unshift({
    id: `${input.id}:tax:out`,
    accountId: `cash:${input.payerId}:residual`,
    deltaMinor: -total,
  });
  const record: WithholdingRecord = {
    id: input.id,
    date: api.state.date,
    personId: input.payerId,
    payrollReceiptId: input.payrollReceiptId,
    paidMinor: input.paidMinor,
    periodDays: input.periodDays,
    yearToDateMinor: input.yearToDateMinor,
    lines: kept,
    postings,
    source: {
      // SOURCED only when every law row read is; a carried-back estimate makes
      // the record an estimate (audit 13).
      tag: kept.some((l) => l.estimate) ? "ESTIMATED" : "SOURCED",
      citation: [...new Set(kept.map((l) => l.lawId))].join(" ; "),
      asOf: api.state.date,
      ...(kept.some((l) => l.estimate)
        ? {
            estimatedFrom: `Law rows read that are estimates: ${kept
              .filter((l) => l.estimate)
              .map((l) => l.lawId)
              .join(" ; ")}`,
          }
        : {}),
    },
  };
  // The payroll taxes the worker paid, on the worker's own reach row.
  for (const line of kept) {
    const series = PAYROLL_TAX_SERIES[line.tax];
    if (series)
      lawApplied(api, {
        key: series,
        lawId: line.lawId,
        targetId: input.payerId,
        target: "person",
        engine: BUDGETS_MODULE_ID,
        what: "withheld",
        amountMinor: line.minor,
      });
  }
  // The journal reads the record from its slot; the table keeps it once posted.
  holdWithholdingSlot(api, record);
  const state = api.state as CoreState;
  api.postJournal({
    id: `journal:${api.state.date}:${state.cashJournal.nextSequence}`,
    date: api.state.date,
    expectedSequence: state.cashJournal.nextSequence,
    sourceRef: { kind: WITHHOLDING_KIND, id: record.id },
    postings,
  });
  if (keepsWhy(api.state as CoreState, input.payerId))
    table(api, "withholding").put(record as unknown as ModuleRow);
  // The entry is posted: the held slot (a second copy of every posting) is let go.
  slots.get(api.state)?.delete(record.id);
  return record;
}

/**
 * Amend a line of a government's budget in force (an ordinance or act that
 * changes spending), recorded with the measure that did it.
 */
export function amendBudget(
  api: CoreAPI,
  input: {
    readonly governmentId: string;
    readonly line: string;
    readonly deltaMinor: number;
    readonly measureId: string;
    /**
     * A passed budget bill's change: it joins the government's enacted lines,
     * which every later year's budget starts from (the carry rule above). A
     * one-time grant or a law that applies its own amount each year leaves
     * this off.
     */
    readonly carry?: boolean;
  },
): BudgetRow | null {
  const gov = table(api, "governments").get(input.governmentId) as unknown as
    GovernmentRow | undefined;
  if (!gov) return null;
  const fy = fiscalYearOf(api.state.date, gov.fiscalYearStart);
  const budget = table(api, "budgets").get(
    `budget:${gov.id}:${fy}`,
  ) as unknown as BudgetRow | undefined;
  if (!budget) return null;
  if (input.carry) {
    const prior = table(api, "enacted").get(gov.id) as unknown as
      | {
          changes: Record<string, number>;
          byYear?: Record<string, Record<string, number>>;
          measures?: Record<string, string>;
        }
      | undefined;
    const changes = { ...(prior?.changes ?? {}) };
    const year = { ...(prior?.byYear?.[String(fy)] ?? {}) };
    changes[input.line] = (changes[input.line] ?? 0) + input.deltaMinor;
    year[input.line] = (year[input.line] ?? 0) + input.deltaMinor;
    table(api, "enacted").put({
      id: gov.id,
      changes,
      byYear: { ...(prior?.byYear ?? {}), [String(fy)]: year },
      // The measure that last carried a change into the line, for the engines that pay from it.
      measures: { ...(prior?.measures ?? {}), [input.line]: input.measureId },
    } as unknown as ModuleRow);
  }
  const amended: BudgetRow = {
    ...budget,
    spendingMinor: {
      ...budget.spendingMinor,
      [input.line]: Math.max(
        0,
        (budget.spendingMinor[input.line] ?? 0) + input.deltaMinor,
      ),
    },
    adoptedBy: `${budget.adoptedBy}; amended by ${input.measureId}`,
  };
  table(api, "budgets").put(amended as unknown as ModuleRow);
  // The change reaches whatever that line pays for (law-effects handlers).
  api.emit({
    id: `budget-line-changed:${budget.id}:${input.line}:${input.measureId}`,
    date: api.state.date,
    kind: "budget-line-changed",
    personIds: [],
    placeId: lawChain(api).townPlaceId,
    source: {
      tag: "SOURCED",
      citation: `Budget amended by ${input.measureId}`,
      asOf: api.state.date,
    },
    publicRecord: true,
    news: false,
    facts: {
      governmentId: gov.id,
      level: gov.level,
      line: input.line,
      deltaMinor: String(input.deltaMinor),
      measureId: input.measureId,
      carried: input.carry ? "yes" : "no",
    },
  });
  return amended;
}

/**
 * The measure that last changed a government's spending line: the bill,
 * ordinance, act or adoption whose amendment the budget now stands on, with
 * the day it changed. Null while the line is as the world opened it.
 */
export function lineChangedBy(
  api: CoreAPI,
  governmentId: string,
  line: string,
): { readonly measureId: string; readonly date: string } | null {
  const row = table(api, "lineChanges").get(
    `${governmentId}:${line}`,
  ) as unknown as { measureId: string; date: string } | undefined;
  return row ? { measureId: row.measureId, date: row.date } : null;
}

/** What a government's treasury has received from outside the town's flows. */
export function outsideRevenueOf(api: CoreAPI, governmentId: string): number {
  return (
    table(api, "outsideRevenue").query("byGovernment", [
      governmentId,
    ]) as unknown as { amountMinor: number }[]
  ).reduce((sum, r) => sum + r.amountMinor, 0);
}

/** A tax installment a named group of payers paid a treasury. */
export interface TaxPayment {
  readonly id: string;
  readonly governmentId: string;
  readonly line: string;
  readonly payerId: string;
  readonly payerName: string;
  readonly dueOn: string;
  readonly date: string;
  /** What the outside group paid. */
  readonly amountMinor: number;
  /** The whole installment due from this line's payers. */
  readonly installmentMinor?: number;
  /** What the town's own payers paid on this line, taken off the installment. */
  readonly townPaidMinor?: number;
}

/** A payment from a treasury to a named group of payees outside the town. */
export interface SpendingPayment {
  readonly id: string;
  readonly governmentId: string;
  readonly line: string;
  readonly payeeId: string;
  readonly payeeName: string;
  readonly kind: string;
  readonly date: string;
  readonly amountMinor: number;
}

/** What a government's treasury has paid to named payees outside the town, by line. */
export function spendingPaymentsOf(
  api: CoreAPI,
  governmentId: string,
): readonly SpendingPayment[] {
  return table(api, "spendingPayments").query("byGovernment", [
    governmentId,
  ]) as unknown as SpendingPayment[];
}

/** What a government's treasury has received from named payers of its taxes. */
export function taxPaymentsOf(
  api: CoreAPI,
  governmentId: string,
): readonly TaxPayment[] {
  return table(api, "taxPayments").query("byGovernment", [
    governmentId,
  ]) as unknown as TaxPayment[];
}

export function governments(api: CoreAPI): readonly GovernmentRow[] {
  return table(api, "governments").rows() as unknown as GovernmentRow[];
}
export function budgetsOf(
  api: CoreAPI,
  governmentId: string,
): readonly BudgetRow[] {
  return table(api, "budgets").query("byGovernment", [
    governmentId,
  ]) as unknown as BudgetRow[];
}
export function withholdingOf(
  api: CoreAPI,
  personId: string,
): readonly WithholdingRecord[] {
  return table(api, "withholding").query("byPerson", [
    personId,
  ]) as unknown as WithholdingRecord[];
}
