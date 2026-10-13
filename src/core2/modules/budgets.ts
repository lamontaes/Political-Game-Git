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
 *   the federal government. Local spending is shared between county and city
 *   by function (stand-in: SG-GOV-local-budget-split). Each new fiscal year's
 *   budget is voted on its start date by the government's legislature; where
 *   none sits, the old rule carries the lines forward:
 *   SG-GOV-budget-adopted-by-rule. A passed budget bill's line changes join
 *   the government's enacted lines, which every later year starts from; a
 *   failed one leaves the enacted lines in force. Each line that moves is
 *   announced, so what it pays for (staff pay, benefits) follows it.
 * - Draws: each public payroll payment is booked against its government's
 *   spending line in force that fiscal year (`draws`, `spent`).
 * - Withholding: each paycheck's income, Social Security and Medicare taxes,
 *   by the law in force (`tax-withholding.ts`), move from the worker's cash to
 *   each government's account through the journal on payday.
 */
import budgetBases from "../../../data/research/money/public-budget-bases.json" with { type: "json" };
import federal from "../../../data/research/money/federal-budget-fy2025.json" with { type: "json" };
import localYears from "../data/budgets/local-fiscal-years.json" with { type: "json" };
import payrollLines from "../data/budgets/payroll-lines.json" with { type: "json" };
import { coreAPI, registerModule } from "../state";
import { stopgap } from "../stopgaps";
import type { CoreAPI, CoreModule, CoreState, Source } from "../types";
import type { ModuleRow } from "../module-data";
import type { ModuleCalendarWork } from "../module-calendar";
import type { CashJournalSourceSlot } from "../journal-state";
import type { WorkPayrollJournalReceipt } from "../work-payroll-cash";
import {
  countyGovernmentUnit,
  governmentUnitsForPlace,
} from "../../simulation/government-units";
import { lawChain, lawInForce } from "./laws";
import { withholdingFor, type WithholdingLine } from "../tax-withholding";
import { purchaseTaxes } from "./purchase-tax";

export const BUDGETS_MODULE_ID = "core2-budgets-v1";
const WITHHOLDING_KIND = "budgets:withholding";

/** Spending functions a county carries; the rest of local spending is the city's or township's. */
const COUNTY_FUNCTIONS = new Set([
  "welfareAndMedicaid",
  "healthAndHospitals",
  "corrections",
  "highways",
  "naturalResources",
]);

export interface GovernmentRow {
  readonly id: string;
  readonly level: "federal" | "state" | "county" | "city";
  readonly name: string;
  readonly organizationId: string;
  readonly fiscalYearStart: string;
  readonly residents: number;
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
  const resolved = {
    kind: WITHHOLDING_KIND,
    id: row.id,
    date: row.date,
    source: row.source,
    expectedPostings: row.postings.map((p) => ({ ...p })),
    requiredRelatedRefs: [],
    relatedRecords: [],
  };
  const slot = {
    resolved,
    marker: resolved,
    retainFull: false,
    metadata: [],
  } as unknown as CashJournalSourceSlot;
  map.set(id, slot);
  return slot;
}

export const BUDGETS_MODULE: CoreModule = {
  id: BUDGETS_MODULE_ID,
  state: {
    schemaVersion: 1,
    tables: {
      governments: {},
      budgets: { indexes: { byGovernment: { fields: ["governmentId"] } } },
      withholding: { indexes: { byPerson: { fields: ["personId"] } } },
      priorities: {},
      /** Each government's line changes from every budget bill it enacted. */
      enacted: {},
      /** Each public payroll payment, booked against the line in force. */
      draws: { indexes: { byBudgetLine: { fields: ["budgetId", "line"] } } },
      /** Each budget line's draws to date, by budget and line. */
      spent: {},
      yearToDate: {},
    },
  },
  journalSourceProviders: {
    [WITHHOLDING_KIND]: (api, reference) => withholdingSlot(api, reference.id),
  },
  onCalendarWork: adoptBudget,
  onWorkPayroll: (api, receipt) => {
    withhold(api, receipt);
    drawOnLine(api, receipt);
  },
};

function table(api: CoreAPI, name: string) {
  return api.moduleState(BUDGETS_MODULE_ID).table(name);
}

interface PlaceBases {
  name: string;
  fiscalYearStart: string;
  population2024?: number;
  state?: { revenue: Record<string, number>; spending: Record<string, number> };
  local?: { revenue: Record<string, number>; spending: Record<string, number> };
}
const bases = budgetBases as unknown as {
  calibration: { factor: number };
  places: Record<string, PlaceBases>;
  countyPopulation2024: Record<string, number>;
};

function government(
  api: CoreAPI,
  row: Omit<GovernmentRow, "organizationId">,
  unitId?: string,
): GovernmentRow {
  // Each government's treasury is its own account. The opening's public
  // employers are outside payers with no cash; their pay should draw from
  // this treasury once the core links them (needs OPUS-CORE).
  const organizationId = `organization:treasury:${row.id}`;
  if (!api.state.organizations.has(organizationId))
    api.addOrganization({
      id: organizationId,
      placeId: lawChain(api).townPlaceId,
      name: `${row.name} treasury`,
      kind: "government-treasury",
      liquidMinor: 0,
      source: {
        tag: "SOURCED",
        citation: "U.S. Census Bureau, 2025 government units listing",
        asOf: api.state.date,
      },
      governmentFacts: { governmentKey: unitId ?? row.id },
    });
  const full = { ...row, organizationId };
  table(api, "governments").put(full as unknown as ModuleRow);
  return full;
}

const minor = (dollarsPerResident: number, residents: number, factor: number) =>
  Math.round(dollarsPerResident * residents * factor * 100);

function budgetFor(
  gov: GovernmentRow,
  stateKey: string,
  fiscalYear: number,
  date: string,
  adoptedBy: string,
): BudgetRow {
  const place = bases.places[stateKey];
  const factor = bases.calibration.factor;
  const revenue: Record<string, number> = {};
  const spending: Record<string, number> = {};
  let source =
    "data/research/money/public-budget-bases.json (Census state and local finances, fiscal 2022, calibrated to the opening year)";
  if (gov.level === "federal") {
    const f = federal as unknown as {
      receipts: Record<string, number>;
      outlays: Record<string, number>;
    };
    for (const [k, v] of Object.entries(f.receipts))
      revenue[k] = Math.round(v * 100);
    for (const [k, v] of Object.entries(f.outlays))
      spending[k] = Math.round(v * 100);
    source =
      "U.S. Treasury, Monthly Treasury Statement, fiscal 2025 (data/research/money/federal-budget-fy2025.json)";
  } else if (gov.level === "state" && place?.state) {
    for (const [k, v] of Object.entries(place.state.revenue))
      revenue[k] = minor(v, gov.residents, factor);
    for (const [k, v] of Object.entries(place.state.spending))
      spending[k] = minor(v, gov.residents, factor);
  } else if (place?.local) {
    stopgap("SG-GOV-local-budget-split");
    const county = gov.level === "county";
    for (const [k, v] of Object.entries(place.local.spending))
      if (COUNTY_FUNCTIONS.has(k) === county)
        spending[k] = minor(v, gov.residents, factor);
    const share =
      Object.values(spending).reduce((a, b) => a + b, 0) /
      Math.max(
        1,
        Object.values(place.local.spending).reduce(
          (a, b) => a + minor(b, gov.residents, factor),
          0,
        ),
      );
    for (const [k, v] of Object.entries(place.local.revenue))
      revenue[k] = Math.round(minor(v, gov.residents, factor) * share);
  }
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
function fiscalYearOf(date: string, start: string): number {
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
      name: "United States",
      fiscalYearStart: "10-01",
      residents: 0,
    }),
    government(api, {
      id: chain.stateKey,
      level: "state",
      name: place?.name ?? chain.stateKey,
      fiscalYearStart: stateStart,
      residents: place?.population2024 ?? 0,
    }),
  ];
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
        },
        countyUnit.id,
      ),
    );
  const geoid = chain.levels[chain.levels.length - 1]!.jurisdiction.slice(
    "place:".length,
  );
  const city = governmentUnitsForPlace(geoid).find(
    (u) => u.unitType === "municipality",
  );
  if (city)
    govs.push(
      government(
        api,
        {
          id: `place:${geoid}`,
          level: "city",
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
  const calendar = api.moduleCalendar(BUDGETS_MODULE_ID);
  for (const gov of govs) {
    const fy = fiscalYearOf(core.date, gov.fiscalYearStart);
    table(api, "budgets").put(
      budgetFor(
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
        estimatedFrom: "SG-GOV-budget-adopted-by-rule",
      },
      sourceRecordIds: [gov.id],
    });
  }
  openSalesTaxes(api, govs);
  return govs;
}

/**
 * The sales tax in force at each level, collected on every recorded sale by a
 * seller in the town (`purchase-tax.ts`) and remitted to that level's
 * treasury: the state's rate to the state, the local rate (the place's own,
 * or the state's average local rate) to the city, else the county.
 */
function openSalesTaxes(api: CoreAPI, govs: readonly GovernmentRow[]): void {
  const answer = lawInForce(api, "sales-tax");
  const town = lawChain(api).townPlaceId;
  const local =
    govs.find((g) => g.level === "city") ??
    govs.find((g) => g.level === "county");
  for (const level of answer.levels) {
    const row = level.row;
    if (!row || level.setAside || !(Number(row.value) > 0)) continue;
    const gov =
      level.level === "state"
        ? govs.find((g) => g.level === "state")
        : level.level === "federal"
          ? undefined
          : local;
    const payee = gov
      ? (api.state as CoreState).cashJournal.residualAccountByOwner.get(
          gov.organizationId,
        )
      : undefined;
    if (!payee) continue;
    // stopgapId: SG-GOV-sales-tax-base-all-sales
    api.stopgap("SG-GOV-sales-tax-base-all-sales");
    api.setPurchaseTax({
      id: `sales-tax:${row.id}`,
      placeId: town,
      ratePercent: Number(row.value),
      payeeAccountId: payee,
      source: {
        tag: row.estimate ? "ESTIMATED" : "SOURCED",
        citation: `${row.id} (${Array.isArray(row.source) ? row.source.join(" ; ") : String(row.source)})`,
        asOf: api.state.date,
        ...(row.estimate ? { estimatedFrom: String(row.source) } : {}),
      },
    });
  }
}

/** The sales taxes collected in the town, by law row. */
export function salesTaxesCollected(
  api: CoreAPI,
): readonly { lawId: string; collectedMinor: number }[] {
  return [...purchaseTaxes(api.state as CoreState).values()]
    .filter((t) => t.id.startsWith("sales-tax:"))
    .map((t) => ({
      lawId: t.id.slice("sales-tax:".length),
      collectedMinor: t.collectedMinor,
    }));
}

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

/**
 * A year's budget at its base: the researched amounts, before any budget
 * bill. Law reach measures a line's service level against it.
 */
export function baseBudget(
  api: CoreAPI,
  gov: GovernmentRow,
  fy: number,
  adoptedBy = "base",
): BudgetRow {
  return budgetFor(gov, lawChain(api).stateKey, fy, api.state.date, adoptedBy);
}

/** The line changes every budget bill a government enacted has made. */
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
 * The next year's budget as proposed: the base with the enacted lines
 * carried forward and the given changes (by default the year's stored
 * priorities) applied. The legislature engine votes it.
 */
export function proposedBudget(
  api: CoreAPI,
  gov: GovernmentRow,
  fy: number,
  adoptedBy: string,
  changes: Readonly<Record<string, number>> = budgetPriorities(api, gov.id)
    ?.changes ?? {},
): BudgetRow {
  const base = baseBudget(api, gov, fy, adoptedBy);
  const spending = { ...base.spendingMinor };
  for (const set of [enactedBudgetChanges(api, gov.id), changes])
    for (const [line, delta] of Object.entries(set))
      spending[line] = Math.max(0, (spending[line] ?? 0) + delta);
  return { ...base, spendingMinor: spending };
}

/**
 * A passed budget bill: its line changes join the government's enacted
 * lines, and the year's budget in force is the base with them.
 */
export function enactBudget(
  api: CoreAPI,
  gov: GovernmentRow,
  fy: number,
  adoptedBy: string,
  changes: Readonly<Record<string, number>>,
  measureId: string,
): BudgetRow {
  const enacted = { ...enactedBudgetChanges(api, gov.id) };
  for (const [line, delta] of Object.entries(changes))
    enacted[line] = (enacted[line] ?? 0) + delta;
  table(api, "enacted").put({
    id: gov.id,
    changes: enacted,
  } as unknown as ModuleRow);
  return putInForce(
    api,
    proposedBudget(api, gov, fy, adoptedBy, {}),
    measureId,
  );
}

/** A year's budget when no bill passes: the enacted lines carried forward. */
export function carriedBudget(
  api: CoreAPI,
  gov: GovernmentRow,
  fy: number,
  adoptedBy: string,
  measureId: string,
): BudgetRow {
  return putInForce(
    api,
    proposedBudget(api, gov, fy, adoptedBy, {}),
    measureId,
  );
}

/**
 * Put a new fiscal year's budget in force and announce each line that differs
 * from last year's, so what the line pays for follows it (law reach).
 */
function putInForce(
  api: CoreAPI,
  budget: BudgetRow,
  measureId: string,
): BudgetRow {
  const prior = table(api, "budgets").get(
    `budget:${budget.governmentId}:${budget.fiscalYear - 1}`,
  ) as unknown as BudgetRow | undefined;
  putBudget(api, budget);
  if (!prior) return budget;
  const gov = table(api, "governments").get(
    budget.governmentId,
  ) as unknown as GovernmentRow;
  const lines = new Set([
    ...Object.keys(prior.spendingMinor),
    ...Object.keys(budget.spendingMinor),
  ]);
  for (const line of [...lines].sort()) {
    const delta =
      (budget.spendingMinor[line] ?? 0) - (prior.spendingMinor[line] ?? 0);
    if (delta) announceLine(api, gov, budget, line, delta, measureId);
  }
  return budget;
}

function announceLine(
  api: CoreAPI,
  gov: GovernmentRow,
  budget: BudgetRow,
  line: string,
  deltaMinor: number,
  measureId: string,
): void {
  api.emit({
    id: `budget-line-changed:${budget.id}:${line}:${measureId}`,
    date: api.state.date,
    kind: "budget-line-changed",
    personIds: [],
    placeId: lawChain(api).townPlaceId,
    source: {
      tag: "SOURCED",
      citation: `Budget ${budget.id} adopted by ${budget.adoptedBy}`,
      asOf: api.state.date,
    },
    publicRecord: true,
    news: false,
    facts: {
      governmentId: gov.id,
      level: gov.level,
      line,
      deltaMinor: String(deltaMinor),
      measureId,
    },
  });
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

function adoptBudget(api: CoreAPI, work: Readonly<ModuleCalendarWork>): void {
  if (work.kind !== "budget-adoption") return;
  const gov = table(api, "governments").get(
    work.sourceRecordIds[0]!,
  ) as unknown as GovernmentRow;
  const fy = fiscalYearOf(api.state.date, gov.fiscalYearStart);
  // The town's council votes its own budget where the legislature engine runs.
  const voted = councilBudgetVote?.(api, gov, fy) ?? null;
  let budget: BudgetRow;
  if (voted) budget = voted;
  else {
    // stopgapId: SG-GOV-budget-adopted-by-rule
    api.stopgap("SG-GOV-budget-adopted-by-rule");
    budget = carriedBudget(
      api,
      gov,
      fy,
      "carried forward by the budget rule until the council or legislature votes it",
      `budget-rule:${gov.id}:${fy}`,
    );
  }
  api.emit({
    id: `budget-adopted:${budget.id}`,
    date: api.state.date,
    kind: "budget-adopted",
    personIds: [],
    placeId: lawChain(api).townPlaceId,
    source: work.source,
    publicRecord: true,
    news: true,
    facts: { governmentId: gov.id, fiscalYear: String(fy) },
  });
  api.moduleCalendar(BUDGETS_MODULE_ID).schedule({
    key: `adopt:${gov.id}:${fy + 1}`,
    date: `${fy + 1}-${gov.fiscalYearStart}`,
    kind: "budget-adoption",
    source: work.source,
    sourceRecordIds: [gov.id],
  });
}

/** The government account a law row's jurisdiction pays into. */
function accountFor(api: CoreAPI, jurisdiction: string): string | null {
  const gov = table(api, "governments").get(jurisdiction) as unknown as
    GovernmentRow | undefined;
  return gov ? `cash:${gov.organizationId}:residual` : null;
}

/** On payday: the taxes the law in force says come out of this paycheck go to each government. */
function withhold(
  api: CoreAPI,
  receipt: Readonly<WorkPayrollJournalReceipt>,
): void {
  const paid = receipt.paidMinor;
  if (paid <= 0) return;
  const person = api.state.people.get(receipt.personId);
  if (!person || person.placeId !== lawChain(api).townPlaceId) return;
  const year = api.state.date.slice(0, 4);
  const ytdId = `${receipt.personId}:${year}`;
  const ytd =
    (
      table(api, "yearToDate").get(ytdId) as unknown as
        { minor: number } | undefined
    )?.minor ?? 0;
  const periodDays = Math.max(
    1,
    Math.round(
      (Date.parse(receipt.throughAt) - Date.parse(receipt.fromAt)) / 86_400_000,
    ) + 1,
  );
  const lines = withholdingFor({
    paidMinor: paid,
    periodDays,
    yearToDateMinor: ytd,
    incomeTax: lawInForce(api, "income-tax"),
    socialSecurity: lawInForce(api, "social-security-tax"),
    medicare: lawInForce(api, "medicare-tax"),
  });
  table(api, "yearToDate").put({
    id: ytdId,
    minor: ytd + paid,
  } as unknown as ModuleRow);
  const postings: { id: string; accountId: string; deltaMinor: number }[] = [];
  let total = 0;
  for (const [index, line] of lines.entries()) {
    const account = accountFor(api, line.jurisdiction);
    if (!account) continue;
    postings.push({
      id: `${receipt.id}:tax:${index}`,
      accountId: account,
      deltaMinor: line.minor,
    });
    total += line.minor;
  }
  if (!total) return;
  postings.unshift({
    id: `${receipt.id}:tax:out`,
    accountId: `cash:${receipt.personId}:residual`,
    deltaMinor: -total,
  });
  const record: WithholdingRecord = {
    id: `withholding:${receipt.id}`,
    date: api.state.date,
    personId: receipt.personId,
    payrollReceiptId: receipt.id,
    paidMinor: paid,
    periodDays,
    yearToDateMinor: ytd,
    lines,
    postings,
    source: {
      tag: "SOURCED",
      citation: lines.map((l) => l.lawId).join(" ; "),
      asOf: api.state.date,
    },
  };
  table(api, "withholding").put(record as unknown as ModuleRow);
  const state = api.state as CoreState;
  api.postJournal({
    id: `journal:${api.state.date}:${state.cashJournal.nextSequence}`,
    date: api.state.date,
    expectedSequence: state.cashJournal.nextSequence,
    sourceRef: { kind: WITHHOLDING_KIND, id: record.id },
    postings,
  });
}

const PAYROLL_LINES = (
  payrollLines as unknown as {
    classifications: Record<
      string,
      { level: GovernmentRow["level"]; lines: readonly string[] }
    >;
  }
).classifications;
const LEVELS_UP: readonly GovernmentRow["level"][] = [
  "city",
  "county",
  "state",
  "federal",
];

/** A government's budget in force today: the latest one that has started. */
export function budgetInForce(
  api: CoreAPI,
  governmentId: string,
): BudgetRow | undefined {
  const today = api.state.date;
  return budgetsOf(api, governmentId)
    .filter((b) => b.startsOn <= today)
    .sort((a, b) => b.startsOn.localeCompare(a.startsOn))[0];
}

export interface DrawRecord {
  readonly id: string;
  readonly date: string;
  readonly payrollReceiptId: string;
  readonly personId: string;
  readonly organizationId: string;
  readonly governmentId: string;
  readonly budgetId: string;
  readonly fiscalYear: number;
  /** The line drawn on, or null where the budget carries none for this work. */
  readonly line: string | null;
  readonly lineMinor: number;
  readonly drawnMinor: number;
  readonly drawnToDateMinor: number;
}

/** The government whose payroll this employer is, from its record or its kind. */
function payrollGovernment(
  api: CoreAPI,
  organizationId: string,
): { gov: GovernmentRow; lines: readonly string[] } | null {
  const org = api.state.organizations.get(organizationId);
  const rule = PAYROLL_LINES[org?.classification ?? ""];
  if (!org || !rule) return null;
  const govs = governments(api);
  const key = org.governmentFacts?.governmentKey;
  const recorded = key
    ? govs.find(
        (g) =>
          api.state.organizations.get(g.organizationId)?.governmentFacts
            ?.governmentKey === key,
      )
    : undefined;
  if (recorded) return { gov: recorded, lines: rule.lines };
  for (const level of LEVELS_UP.slice(LEVELS_UP.indexOf(rule.level))) {
    const gov = govs.find((g) => g.level === level);
    if (gov) return { gov, lines: rule.lines };
  }
  return null;
}

/**
 * On payday: a public employer's payroll payment is spending under its
 * government's line in force this fiscal year, booked against it.
 */
function drawOnLine(
  api: CoreAPI,
  receipt: Readonly<WorkPayrollJournalReceipt>,
): void {
  if (receipt.paidMinor <= 0) return;
  const payer = payrollGovernment(api, receipt.organizationId);
  if (!payer) return;
  const budget = budgetInForce(api, payer.gov.id);
  if (!budget) return;
  const line = payer.lines.find((l) => l in budget.spendingMinor) ?? null;
  const spentId = `${budget.id}:${line ?? "none"}`;
  const before =
    (
      table(api, "spent").get(spentId) as unknown as
        { minor: number } | undefined
    )?.minor ?? 0;
  const drawn = before + receipt.paidMinor;
  table(api, "spent").put({
    id: spentId,
    budgetId: budget.id,
    line,
    minor: drawn,
  } as unknown as ModuleRow);
  const record: DrawRecord = {
    id: `draw:${receipt.id}`,
    date: api.state.date,
    payrollReceiptId: receipt.id,
    personId: receipt.personId,
    organizationId: receipt.organizationId,
    governmentId: payer.gov.id,
    budgetId: budget.id,
    fiscalYear: budget.fiscalYear,
    line,
    lineMinor: line ? (budget.spendingMinor[line] ?? 0) : 0,
    drawnMinor: receipt.paidMinor,
    drawnToDateMinor: drawn,
  };
  table(api, "draws").put(record as unknown as ModuleRow);
  // stopgapId: SG-GOV-public-pay-not-from-treasury
  api.stopgap("SG-GOV-public-pay-not-from-treasury");
}

/** Every payroll payment booked against one line of one budget. */
export function drawsOn(
  api: CoreAPI,
  budgetId: string,
  line: string,
): readonly DrawRecord[] {
  return table(api, "draws").query("byBudgetLine", [
    budgetId,
    line,
  ]) as unknown as DrawRecord[];
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
    },
  });
  return amended;
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
