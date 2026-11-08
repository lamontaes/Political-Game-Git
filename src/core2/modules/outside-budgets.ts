/**
 * Every other state's budget, in the one budget store (Nation, Nov 8, 2026).
 * Each state outside the town's chain keeps a budget row for its fiscal
 * year (the same `BudgetRow` the town's state keeps, level as data) built by
 * the budget engine's own `publishedBudgetFor` from the state's Census
 * finances, then moved by what the state's economy has done since the world
 * opened: the state's jobs times its average pay (the regional engine's
 * months, summed over the state's regions) against the opening month. Money
 * does not move here: these are results, read by screens, the news and the
 * state's own comparisons; the lines a legislature's acts change and the
 * state's treasury follow when someone opens that state
 * (stopgap SG-NATION-outside-budget-lines).
 */
import budgetBases from "../../../data/research/money/public-budget-bases.json" with { type: "json" };
import { REGIONS } from "../regional-model";
import type { RegionMonth } from "../regional-model";
import { registerModule } from "../state";
import { lawChain } from "./laws";
import {
  BUDGETS_MODULE_ID,
  putBudget,
  publishedBudgetFor,
  type BudgetRow,
  type GovernmentRow,
} from "./budgets";
import { addDays, makeIsoDate } from "../kernel/dates";
import type { CoreAPI, CoreModule, CoreState } from "../types";

export const OUTSIDE_BUDGETS_MODULE_ID = "outside-budgets";
const RUN_KIND = "outside-budgets";

interface StateBase {
  readonly name: string;
  readonly fiscalYearStart: string;
  readonly population2024?: number;
  readonly puertoRicoPopulation2025?: number;
  readonly islandAreaPopulation2020?: number;
}
const residentsOf = (base: StateBase) =>
  base.population2024 ??
  base.puertoRicoPopulation2025 ??
  base.islandAreaPopulation2020 ??
  0;
const STATES = (budgetBases as unknown as { places: Record<string, StateBase> })
  .places;

const monthOf = (date: string) => date.slice(0, "YYYY-MM".length);

/** The state's regions (a state with metros has the rest-of-state region too). */
const regionsOf = (usps: string) =>
  REGIONS.filter((row) => row.stateUsps === usps);

function wageBill(api: CoreAPI, usps: string, month: string): number | null {
  const months = api.moduleState("regional").table("months");
  let total = 0;
  for (const region of regionsOf(usps)) {
    const row = months.get(`${region.id}:${month}`) as unknown as
      RegionMonth | undefined;
    if (!row) return null;
    total += row.jobsThousands * row.hourlyEarnings;
  }
  return total > 0 ? total : null;
}

/** The state's economy now against the opening month: jobs times pay (1 before the engines have a month). */
export function stateEconomyFactor(api: CoreAPI, usps: string): number {
  if (!(api.state as CoreState).modules.has("regional")) return 1;
  const macro = api.moduleState("macro").table("state").get("macro:state") as
    { openingMonth: string; latestMonth: string } | undefined;
  if (!macro) return 1;
  const open = wageBill(api, usps, macro.openingMonth);
  const now = wageBill(api, usps, macro.latestMonth);
  return open && now ? now / open : 1;
}

/** The state's government row for the budget engine's base (no treasury: a result, not a payer). */
function government(stateKey: string, base: StateBase): GovernmentRow {
  return {
    id: stateKey,
    level: "state",
    name: base.name,
    organizationId: "",
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

function writeBudget(
  api: CoreAPI,
  stateKey: string,
  base: StateBase,
  fiscalYear: number,
): void {
  const gov = government(stateKey, base);
  const published = publishedBudgetFor(
    gov,
    stateKey,
    fiscalYear,
    api.state.date,
    "state legislature",
  );
  const g = stateEconomyFactor(api, stateKey.slice("US-".length));
  const scale = (lines: Readonly<Record<string, number>>) =>
    Object.fromEntries(
      Object.entries(lines).map(([line, v]) => [line, Math.round(v * g)]),
    );
  const budget: BudgetRow = {
    ...published,
    revenueMinor: scale(published.revenueMinor),
    spendingMinor: scale(published.spendingMinor),
    source: `${published.source}; moved by the state's jobs times pay since the opening (factor ${g.toFixed(4)}, the regional engine's months)`,
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

export const OUTSIDE_BUDGETS_MODULE: CoreModule = {
  id: OUTSIDE_BUDGETS_MODULE_ID,
  state: { schemaVersion: 1, tables: { state: {} } },
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
