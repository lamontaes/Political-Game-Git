/**
 * Every other state's budget, in the one budget store (Nation, Nov 8, 2026),
 * as a view of that state's ledger in the country tier (country-model.ts).
 * Each state outside the town's chain keeps a budget row for its fiscal
 * year (the same `BudgetRow` the town's state keeps, level as data). The
 * published row (`publishedBudgetFor`, the state's Census finances) is the
 * year the world opens on. Every later year reads the tier: the income,
 * profit and general sales tax lines are the state's share of what its
 * ledger took in under each over the last twelve months (under the law in
 * force there, so a state that raises a tax shows it), and spending is its
 * share of the budget the ledger adopted. The tier keeps a state's
 * governments together, state and local; the shares that split off the state
 * government are the published lines over the tier's first month, fixed
 * then. The lines the tier does not model stay estimates at their published
 * opening values. Money does not move here: these are results, read by
 * screens, the news and the state's own comparisons (stopgap
 * SG-NATION-outside-budget-lines).
 */
import { stateJurisdictionId } from "../government-jurisdictions";
import budgetBases from "../../../data/research/money/public-budget-bases.json" with { type: "json" };
import type { CountryState } from "./macro";
import { registerModule } from "../state";
import { lawChain } from "./laws";
import { nationalDisasterDetail, NATIONAL_DISASTER } from "./national-events";
import {
  BUDGETS_MODULE_ID,
  putBudget,
  publishedBudgetFor,
  type BudgetRow,
  type GovernmentRow,
} from "./budgets";
import { addDays, makeIsoDate } from "../kernel/dates";
import type { CoreAPI, CoreEventInput, CoreModule, CoreState } from "../types";

export const OUTSIDE_BUDGETS_MODULE_ID = "outside-budgets";
const RUN_KIND = "outside-budgets";

export interface StateBase {
  readonly name: string;
  readonly fiscalYearStart: string;
  readonly population2024?: number;
  readonly puertoRicoPopulation2025?: number;
  readonly islandAreaPopulation2020?: number;
}
export const residentsOf = (base: StateBase) =>
  base.population2024 ??
  base.puertoRicoPopulation2025 ??
  base.islandAreaPopulation2020 ??
  0;
export const STATES = (
  budgetBases as unknown as { places: Record<string, StateBase> }
).places;

const monthOf = (date: string) => date.slice(0, "YYYY-MM".length);

/**
 * The published revenue lines the country tier keeps a source for: the
 * income, profit and general sales taxes the state's own law sets. Every other
 * line (selective sales taxes, property, fees, federal aid and the rest) is
 * one the tier does not model.
 */
const TIER_SOURCES = {
  individualIncomeTax: "incomeTaxRevenue",
  corporateIncomeTax: "profitTaxRevenue",
  generalSalesTax: "salesTaxRevenue",
} as const;
type TierSource = (typeof TIER_SOURCES)[keyof typeof TIER_SOURCES];
const MACRO_MODULE_ID = "macro";
/** The tier keeps dollars; a budget row keeps minor units. */
const MINOR_PER_DOLLAR = 100;

/** The state's row in the country tier: its governments' ledger and what each month moved. */
const tierId = (stateKey: string) => `country-state:${stateKey}`;
function tierState(api: CoreAPI, stateKey: string): CountryState | undefined {
  if (!(api.state as CoreState).modules.has(MACRO_MODULE_ID)) return undefined;
  return api
    .moduleState(MACRO_MODULE_ID)
    .table("countryStates")
    .get(tierId(stateKey)) as unknown as CountryState | undefined;
}

/** A year of the tier's revenue by source, in minor units: the months it keeps, as a year. Null before its first month. */
function tierYear(
  api: CoreAPI,
  state: CountryState,
): Record<TierSource, number> | null {
  const months = state.whatMoved;
  if (!months.length) return null;
  const scale = api.parameter("monthsPerYear") / months.length;
  const year = (source: TierSource) =>
    months.reduce((n, m) => n + m[source], 0) * scale * MINOR_PER_DOLLAR;
  return {
    incomeTaxRevenue: year("incomeTaxRevenue"),
    profitTaxRevenue: year("profitTaxRevenue"),
    salesTaxRevenue: year("salesTaxRevenue"),
  };
}

/**
 * What part of the tier's ledger is the state government's own: the tier
 * keeps a state's governments together, state and local, and the budget row
 * is the state's alone. Each modeled line's share is the published line over
 * the tier's year of that source, and spending's is the published spending
 * over the budget the ledger adopted, both fixed from the tier's first month,
 * so the published figures set day one and the tier moves every year after.
 */
interface Shares {
  readonly id: string;
  readonly revenue: Readonly<
    Partial<Record<keyof typeof TIER_SOURCES, number>>
  >;
  readonly spending: number;
  /** The published year the shares were taken against: its lines are the base of every line the tier does not model. */
  readonly baseYear: number;
}

function sharesOf(
  api: CoreAPI,
  stateKey: string,
  base: StateBase,
  state: CountryState,
): Shares | null {
  const table = api.moduleState(OUTSIDE_BUDGETS_MODULE_ID).table("shares");
  const kept = table.get(stateKey) as unknown as Shares | undefined;
  if (kept) return kept;
  const year = tierYear(api, state);
  if (!year || !(state.ledger.budgetYear > 0)) return null;
  const baseYear = fiscalYearOn(api.state.startedAt, base.fiscalYearStart);
  const published = publishedFor(api, stateKey, base, baseYear);
  const revenue: Partial<Record<keyof typeof TIER_SOURCES, number>> = {};
  for (const [line, source] of Object.entries(TIER_SOURCES) as [
    keyof typeof TIER_SOURCES,
    TierSource,
  ][])
    if (year[source] > 0)
      revenue[line] = (published.revenueMinor[line] ?? 0) / year[source];
  const shares: Shares = {
    id: stateKey,
    revenue,
    spending:
      sum(published.spendingMinor) /
      (state.ledger.budgetYear * MINOR_PER_DOLLAR),
    baseYear,
  };
  table.put(shares as unknown as { id: string });
  return shares;
}

const sum = (lines: Readonly<Record<string, number>>) =>
  Object.values(lines).reduce((n, v) => n + v, 0);

/** The state's government row for the budget engine's base (no treasury: a result, not a payer). */
function government(stateKey: string, base: StateBase): GovernmentRow {
  return {
    id: stateKey,
    level: "state",
    name: base.name,
    organizationId: "",
    jurisdictionId: stateJurisdictionId(stateKey) ?? stateKey,
    fiscalYearStart: base.fiscalYearStart,
    residents: residentsOf(base),
    base: "state",
  };
}

/** The year a fiscal year that starts `start` (MM-DD) and covers `date` is named for. */
function fiscalYearOn(date: string, start: string): number {
  const year = Number(date.slice(0, 4));
  return date.slice(5) >= start ? year : year - 1;
}

function publishedFor(
  api: CoreAPI,
  stateKey: string,
  base: StateBase,
  fiscalYear: number,
): BudgetRow {
  return publishedBudgetFor(
    government(stateKey, base),
    stateKey,
    fiscalYear,
    api.state.date,
    { kind: "published" },
  );
}

/**
 * The state's budget for a fiscal year, as a view of its ledger in the
 * country tier: the income, profit and sales tax lines are the state's share
 * of the tier's last year of each, spending is its share of the budget the
 * ledger adopted (in the published mix of lines), and the lines the tier does
 * not model stay estimates at their published opening values. Before the
 * tier's first month, the published year.
 */
function writeBudget(
  api: CoreAPI,
  stateKey: string,
  base: StateBase,
  fiscalYear: number,
): void {
  const published = publishedFor(api, stateKey, base, fiscalYear);
  const state = tierState(api, stateKey);
  const shares = state ? sharesOf(api, stateKey, base, state) : null;
  const year = state ? tierYear(api, state) : null;
  if (!state || !shares || !year) {
    putBudget(api, published);
    return;
  }
  // stopgapId: SG-NATION-outside-budget-lines
  api.stopgap("SG-NATION-outside-budget-lines");
  const opening = publishedFor(api, stateKey, base, shares.baseYear);
  const revenue: Record<string, number> = { ...opening.revenueMinor };
  for (const [line, source] of Object.entries(TIER_SOURCES) as [
    keyof typeof TIER_SOURCES,
    TierSource,
  ][]) {
    const share = shares.revenue[line];
    if (share !== undefined) revenue[line] = Math.round(share * year[source]);
  }
  const spent = shares.spending * state.ledger.budgetYear * MINOR_PER_DOLLAR;
  const mix = sum(opening.spendingMinor);
  const budget: BudgetRow = {
    ...published,
    revenueMinor: revenue,
    spendingMinor: Object.fromEntries(
      Object.entries(opening.spendingMinor).map(([line, v]) => [
        line,
        mix ? Math.round((v * spent) / mix) : 0,
      ]),
    ),
    ledgerId: tierId(stateKey),
    source: `The state's share of its governments' ledger in the country tier (${tierId(stateKey)}): income, profit and general sales tax lines from the tier's last ${state.whatMoved.length} months of each under the law in force, spending from the budget the ledger adopted, both at the shares the published FY${shares.baseYear} lines set; every other line is an estimate held at its published FY${shares.baseYear} value (${opening.source})`,
  };
  putBudget(api, budget);
}

function run(api: CoreAPI, opening: boolean): void {
  const town = lawChain(api).stateKey;
  const month = Number(api.state.date.slice(5, 7));
  for (const [stateKey, base] of Object.entries(STATES).sort((a, b) =>
    a[0].localeCompare(b[0]),
  )) {
    if (stateKey === town || !base.fiscalYearStart || !residentsOf(base))
      continue;
    // A new fiscal year starts this month in this state, or the world is
    // opening and every state has the year it is in.
    if (!opening && Number(base.fiscalYearStart.slice(0, 2)) !== month)
      continue;
    writeBudget(
      api,
      stateKey,
      base,
      fiscalYearOn(api.state.date, base.fiscalYearStart),
    );
  }
}

function schedule(api: CoreAPI): void {
  const next =
    addDays(makeIsoDate(`${monthOf(api.state.date)}-01`), 32).slice(
      0,
      "YYYY-MM".length,
    ) + "-08";
  api.moduleCalendar(OUTSIDE_BUDGETS_MODULE_ID).schedule({
    key: `${RUN_KIND}:${next}`,
    date: next,
    kind: RUN_KIND,
    source: {
      tag: "SOURCED",
      asOf: api.state.date,
      citation: "Census state finances and the regional engine's months.",
    },
    sourceRecordIds: ["outside-budgets:state"],
  });
}

/**
 * A disaster elsewhere reaches the state's budget: the Public Assistance FEMA
 * obligated for it (read from the record when the disaster is opened,
 * `nationalDisasterDetail`) comes in as federal aid and goes out as relief,
 * in the state's budget for the year the disaster begins. The aid is
 * obligated after the declaration in fact; it lands on the incident's year
 * here (stopgap SG-NATION-disaster-damage-from-causes).
 */
function disasterAid(api: CoreAPI, event: Readonly<CoreEventInput>): void {
  const stateKey = event.facts?.stateKey ?? "";
  const base = STATES[stateKey];
  if (!base?.fiscalYearStart || stateKey === lawChain(api).stateKey) return;
  const aid = nationalDisasterDetail(api, event.id)?.publicAssistanceMinor ?? 0;
  if (aid <= 0) return;
  const year = fiscalYearOn(api.state.date, base.fiscalYearStart);
  const row = api
    .moduleState(BUDGETS_MODULE_ID)
    .table("budgets")
    .get(`budget:${stateKey}:${year}`) as unknown as BudgetRow | undefined;
  if (!row) return;
  putBudget(api, {
    ...row,
    revenueMinor: {
      ...row.revenueMinor,
      federalAid: (row.revenueMinor.federalAid ?? 0) + aid,
    },
    spendingMinor: {
      ...row.spendingMinor,
      otherPrograms: (row.spendingMinor.otherPrograms ?? 0) + aid,
    },
    source: `${row.source}; plus the federal aid for disaster ${event.facts?.disasterNumber ?? event.id} (${event.id})`,
  });
}

export const OUTSIDE_BUDGETS_MODULE: CoreModule = {
  id: OUTSIDE_BUDGETS_MODULE_ID,
  state: { schemaVersion: 1, tables: { state: {}, shares: {} } },
  eventKinds: [NATIONAL_DISASTER],
  onEvent(api, event) {
    disasterAid(api, event);
  },
  onCalendarWork(api, work) {
    if (work.kind !== RUN_KIND) return;
    run(api, false);
    schedule(api);
  },
  onDay(api) {
    const state = api.moduleState(OUTSIDE_BUDGETS_MODULE_ID).table("state");
    if (state.get("outside-budgets:state")) return;
    state.put({ id: "outside-budgets:state", openedAt: api.state.date });
    run(api, true);
    schedule(api);
  },
};

/** Install the engine in a world (after the budgets and the regional engine). */
export function openOutsideBudgets(core: CoreState): void {
  if (!core.modules.has(BUDGETS_MODULE_ID)) return;
  if (!core.modules.has(OUTSIDE_BUDGETS_MODULE_ID))
    registerModule(core, OUTSIDE_BUDGETS_MODULE);
}
