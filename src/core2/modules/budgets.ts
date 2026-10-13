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
 *   budget is adopted on its start date by the old rule (carry the year's
 *   amounts forward) until a council or legislature votes it (M3):
 *   SG-GOV-budget-adopted-by-rule.
 * - Withholding: each paycheck's income, Social Security and Medicare taxes,
 *   by the law in force (`tax-withholding.ts`), move from the worker's cash to
 *   each government's account through the journal on payday.
 */
import budgetBases from "../../../data/research/money/public-budget-bases.json" with { type: "json" };
import federal from "../../../data/research/money/federal-budget-fy2025.json" with { type: "json" };
import localYears from "../data/budgets/local-fiscal-years.json" with { type: "json" };
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
import { LAWS_MODULE_ID, lawChain, lawInForce } from "./laws";
import type { LawRowInput } from "../laws-starting";
import { withholdingFor, type WithholdingLine } from "../tax-withholding";

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
      yearToDate: {},
    },
  },
  journalSourceProviders: {
    [WITHHOLDING_KIND]: (api, reference) => withholdingSlot(api, reference.id),
  },
  onCalendarWork: adoptBudget,
  onWorkPayroll: withhold,
  eventKinds: ["law-took-effect"],
  onEvent: (api, event) => {
    const series = event.facts?.series;
    if (series === "sales-tax" || series === GROCERY_EXEMPTION)
      syncSalesTax(api);
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
  syncSalesTax(api);
  return govs;
}

const GROCERY_EXEMPTION =
  "us-policy-positions:fiscal.exempt-groceries-from-sales-tax";
/** Grocery stores' classification (NAICS 445, food and beverage retailers). */
const GROCERY_SELLERS = ["445"];

/**
 * The sales tax in force collected on every purchase in town (core2-api-v21):
 * each level's rate to its own treasury (a local rate without a city
 * government goes to the county, else the state), set so the levels' shares
 * sum to the combined tax inside the price; groceries are exempt where a
 * grocery exemption is law. Re-run when a sales-tax law takes effect.
 */
export function syncSalesTax(api: CoreAPI): void {
  if (!api.state.modules.has(BUDGETS_MODULE_ID)) return;
  const answer = lawInForce(api, "sales-tax");
  const town = lawChain(api).townPlaceId;
  const govs = governments(api);
  const payee = (level: string) =>
    (level === "city"
      ? (govs.find((g) => g.level === "city") ??
        govs.find((g) => g.level === "county"))
      : level === "county"
        ? govs.find((g) => g.level === "county")
        : undefined) ?? govs.find((g) => g.level === "state");
  const rates = new Map<string, number>();
  for (const l of answer.levels) {
    if (!l.row || l.setAside || l.level === "federal") continue;
    const gov = payee(l.level);
    const value = l.row.value ?? 0;
    if (!gov || !(value > 0)) continue;
    rates.set(gov.id, (rates.get(gov.id) ?? 0) + value);
  }
  const total = [...rates.values()].reduce((a, b) => a + b, 0);
  const exempt = groceryExemptionInForce(api) ? GROCERY_SELLERS : undefined;
  for (const gov of govs) {
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
      ...(exempt ? { exemptClassificationPrefixes: exempt } : {}),
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

function groceryExemptionInForce(api: CoreAPI): boolean {
  const laws = api.moduleState(LAWS_MODULE_ID).table("laws");
  const date = api.state.date;
  return lawChain(api).levels.some(({ jurisdiction }) => {
    const latest = (
      laws.query("bySeries", [
        jurisdiction,
        GROCERY_EXEMPTION,
      ]) as unknown as LawRowInput[]
    )
      .filter((r) => r.effectiveDate <= date)
      .sort((a, b) => b.effectiveDate.localeCompare(a.effectiveDate))[0];
    return latest?.value === 1;
  });
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
 * The next year's budget as proposed: this year's lines carried forward, with
 * the executive's priorities applied. The legislature engine votes it.
 */
export function proposedBudget(
  api: CoreAPI,
  gov: GovernmentRow,
  fy: number,
  adoptedBy: string,
): BudgetRow {
  const base = budgetFor(
    gov,
    lawChain(api).stateKey,
    fy,
    api.state.date,
    adoptedBy,
  );
  const changes = budgetPriorities(api, gov.id)?.changes ?? {};
  const spending = { ...base.spendingMinor };
  for (const [line, delta] of Object.entries(changes))
    spending[line] = Math.max(0, (spending[line] ?? 0) + delta);
  return { ...base, spendingMinor: spending };
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
    budget = budgetFor(
      gov,
      lawChain(api).stateKey,
      fy,
      api.state.date,
      "carried forward by the budget rule until the council or legislature votes it",
    );
    table(api, "budgets").put(budget as unknown as ModuleRow);
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
  // The executive's priorities the body adopted reach whatever each line
  // pays for, as an amendment's change does (law-effects handlers).
  if (voted) {
    const base = budgetFor(
      gov,
      lawChain(api).stateKey,
      fy,
      api.state.date,
      "base",
    );
    for (const line of Object.keys(
      budgetPriorities(api, gov.id)?.changes ?? {},
    ).sort()) {
      const delta =
        (budget.spendingMinor[line] ?? 0) - (base.spendingMinor[line] ?? 0);
      if (delta === 0) continue;
      api.emit({
        id: `budget-line-changed:${budget.id}:${line}:adopted`,
        date: api.state.date,
        kind: "budget-line-changed",
        personIds: [],
        placeId: lawChain(api).townPlaceId,
        source: {
          tag: "SOURCED",
          citation: `Budget adopted with the executive's priorities (${budget.adoptedBy})`,
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
