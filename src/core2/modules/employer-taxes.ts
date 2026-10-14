/**
 * The employer's payroll tax share (OPUS-WORLD, laws audit 19).
 *
 * On each payday the employer pays its Social Security and Medicare share to
 * the federal treasury, from its own cash, read from the same law rows the
 * worker's withholding reads (`social-security-tax`, `medicare-tax`). Under
 * current law the employer's rate equals the employee's; a law row that
 * carries `terms.employerRate` is read instead. Social Security stops at the
 * wage base per worker per employer per year; the Medicare surtax is the
 * worker's alone. A business or government with no cash for the share records
 * arrears and pays them off on later paydays: no money is dropped or made up.
 * Business taxes are money flows with no player step.
 *
 * Counted workers' wages (the residents' merged flows) do not pass through the
 * work payroll, so their employers' share is not posted yet.
 * stopgapId: SG-WORLD-employer-tax-counted-wages
 */
import { registerModule } from "../state";
import type { CoreAPI, CoreModule, CoreState, Source } from "../types";
import type { ModuleRow } from "../module-data";
import type { CashJournalSourceSlot } from "../journal-state";
import type { WorkPayrollJournalReceipt } from "../work-payroll-cash";
import { lawChain, lawInForce } from "./laws";
import { ownerOf } from "./business";
import { residentsRuntime } from "./residents";
import { BUDGETS_MODULE_ID, governments } from "./budgets";

export const EMPLOYER_TAXES_MODULE_ID = "core2-employer-taxes-v1";
const KIND = "employer-taxes:share";
const PROFIT_KIND = "employer-taxes:profit";
const PASS_THROUGH_STOPGAP = "SG-WORLD-business-profit-pass-through";
const PREMISES_STOPGAP = "SG-WORLD-business-premises-property-tax";

/** A quarter's tax on a corporation's operating profit. */
export interface ProfitTaxRecord {
  readonly id: string;
  readonly date: string;
  readonly businessId: string;
  /** Sales less operating costs and wages over the quarter, from its books. */
  readonly profitMinor: number;
  readonly taxMinor: number;
  readonly paidMinor: number;
  readonly arrearsAfterMinor: number;
  readonly lawIds: readonly string[];
  readonly postings: readonly {
    id: string;
    accountId: string;
    deltaMinor: number;
  }[];
  readonly source: Source;
}

export interface EmployerTaxRecord {
  readonly id: string;
  readonly date: string;
  readonly employerId: string;
  readonly personId: string;
  readonly payrollReceiptId: string;
  readonly wagesMinor: number;
  readonly socialSecurityMinor: number;
  readonly medicareMinor: number;
  /** Federal unemployment tax (FUTA, after the state credit), to the federal treasury. */
  readonly federalUnemploymentMinor?: number;
  /** State unemployment tax, to the state's treasury. */
  readonly stateUnemploymentMinor?: number;
  /** Paid today: this payday's share plus any arrears the employer could cover. */
  readonly paidMinor: number;
  /** Owed and still unpaid after today. */
  readonly arrearsAfterMinor: number;
  readonly lawIds: readonly string[];
  readonly postings: readonly {
    id: string;
    accountId: string;
    deltaMinor: number;
  }[];
  readonly source: Source;
}

const slots = new WeakMap<object, Map<string, CashJournalSourceSlot>>();
function slotFor(
  api: CoreAPI,
  id: string,
  kind: string = KIND,
): CashJournalSourceSlot | undefined {
  const map = slots.get(api.state) ?? new Map<string, CashJournalSourceSlot>();
  slots.set(api.state, map);
  if (map.has(id)) return map.get(id);
  const row = table(api, kind === KIND ? "shares" : "profits").get(
    id,
  ) as unknown as EmployerTaxRecord | ProfitTaxRecord | undefined;
  if (!row) return undefined;
  const resolved = {
    kind,
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

export const EMPLOYER_TAXES_MODULE: CoreModule = {
  id: EMPLOYER_TAXES_MODULE_ID,
  state: {
    schemaVersion: 1,
    tables: {
      shares: { indexes: { byEmployer: { fields: ["employerId"] } } },
      /** Wages paid by an employer to a worker this year, for the wage base. */
      yearToDate: {},
      /** What an employer owes the treasury and could not pay yet. */
      arrears: {},
      /** Each quarter's tax on a corporation's profit. */
      profits: { indexes: { byBusiness: { fields: ["businessId"] } } },
      /** Each business's books at its last quarter, to measure the next. */
      quarters: {},
    },
  },
  journalSourceProviders: {
    [KIND]: (api, ref) => slotFor(api, ref.id),
    [PROFIT_KIND]: (api, ref) => slotFor(api, ref.id, PROFIT_KIND),
  },
  onWorkPayroll: payEmployerShare,
  onDay: (api) => {
    // Corporations pay tax on each quarter's profit at its end (26 U.S.C.
    // 6655 estimated payments are due quarterly); the days are the calendar's.
    const day = api.state.date.slice(5);
    if (QUARTER_DAYS.includes(day)) payProfitTaxes(api);
  },
};

const QUARTER_DAYS = ["01-01", "04-01", "07-01", "10-01"];

/**
 * A quarter's tax on profit (owner ruling, Oct 14): a business owned by
 * another organization (a corporation's location) pays the corporate rate in
 * force on its operating profit over the quarter, from its books, to the
 * federal treasury. An owner-run business's profit is its owner's income
 * under the law, which is not taxed yet (registered stopgap); nor is property
 * tax on premises, which the books don't record (registered stopgap).
 */
function payProfitTaxes(api: CoreAPI): void {
  if (!api.state.modules.has(BUDGETS_MODULE_ID)) return;
  const treasury = governments(api).find((g) => g.id === "US");
  if (!treasury) return;
  const law = lawInForce(api, "corporate-income-tax").governing;
  // stopgapId: SG-WORLD-business-premises-property-tax
  api.stopgap(PREMISES_STOPGAP);
  const core = api.state as CoreState;
  for (const [id, books] of [...core.finance.businesses].sort((a, b) =>
    a[0].localeCompare(b[0]),
  )) {
    // Operating profit to date: sales less local costs, wages and the costs
    // paid to suppliers outside the town (the residents' outside-costs flow).
    const outside =
      residentsRuntime(core)?.flows.get(`outside-costs:${id}`)
        ?.outsidePaidMinor ?? 0;
    const total =
      books.salesReceivedMinor -
      books.operatingPaidMinor -
      books.wagesPaidMinor -
      outside;
    const last = table(api, "quarters").get(id) as unknown as
      { minor: number } | undefined;
    table(api, "quarters").put({ id, minor: total } as unknown as ModuleRow);
    if (!last || books.closedAt) continue;
    const owner = ownerOf(api, id);
    if (!owner || !core.organizations.has(owner)) {
      // stopgapId: SG-WORLD-business-profit-pass-through
      api.stopgap(PASS_THROUGH_STOPGAP);
      continue;
    }
    if (!law?.value) continue;
    const profit = total - last.minor;
    const key = `${id}:profit`;
    const tax = profit > 0 ? Math.round((profit * law.value) / 100) : 0;
    const owed = tax + arrearsOf(api, key);
    if (owed <= 0) continue;
    const from = `cash:${id}:residual`;
    const paid = Math.min(owed, Math.max(0, api.accounts().balance(from)));
    table(api, "arrears").put({
      id: key,
      minor: owed - paid,
    } as unknown as ModuleRow);
    const recordId = `profit-tax:${id}:${api.state.date}`;
    const postings =
      paid > 0
        ? [
            { id: `${recordId}:out`, accountId: from, deltaMinor: -paid },
            {
              id: `${recordId}:in`,
              accountId: `cash:${treasury.organizationId}:residual`,
              deltaMinor: paid,
            },
          ]
        : [];
    const record: ProfitTaxRecord = {
      id: recordId,
      date: api.state.date,
      businessId: id,
      profitMinor: profit,
      taxMinor: tax,
      paidMinor: paid,
      arrearsAfterMinor: owed - paid,
      lawIds: [law.id],
      postings,
      source: {
        tag: law.estimate ? "ESTIMATED" : "SOURCED",
        citation: law.id,
        asOf: api.state.date,
        ...(law.estimate
          ? { estimatedFrom: `Law row read is an estimate: ${law.id}` }
          : {}),
      },
    };
    table(api, "profits").put(record as unknown as ModuleRow);
    if (!postings.length) continue;
    api.postJournal({
      id: `journal:${api.state.date}:${core.cashJournal.nextSequence}`,
      date: api.state.date,
      expectedSequence: core.cashJournal.nextSequence,
      sourceRef: { kind: PROFIT_KIND, id: record.id },
      postings,
    });
  }
}

function table(api: CoreAPI, name: string) {
  return api.moduleState(EMPLOYER_TAXES_MODULE_ID).table(name);
}

/** Installs the module (the budgets module, which holds the treasury, must be open). */
export function openEmployerTaxes(core: CoreState): void {
  if (!core.modules.has(EMPLOYER_TAXES_MODULE_ID))
    registerModule(core, EMPLOYER_TAXES_MODULE);
}

/** What the employer owes the treasury, by employer, still unpaid. */
function arrearsOf(api: CoreAPI, key: string): number {
  return (
    (table(api, "arrears").get(key) as unknown as { minor: number } | undefined)
      ?.minor ?? 0
  );
}

/** What a corporation still owes in tax on its profit. */
export function profitTaxArrears(api: CoreAPI, businessId: string): number {
  return arrearsOf(api, `${businessId}:profit`);
}

/** What an employer still owes in payroll taxes, to every government. */
export function employerArrears(api: CoreAPI, employerId: string): number {
  return arrearsOf(api, employerId) + arrearsOf(api, `${employerId}:state`);
}

export function employerShareOf(
  api: CoreAPI,
  receiptId: string,
): EmployerTaxRecord | undefined {
  return table(api, "shares").get(`employer-tax:${receiptId}`) as unknown as
    EmployerTaxRecord | undefined;
}

function payEmployerShare(
  api: CoreAPI,
  receipt: Readonly<WorkPayrollJournalReceipt>,
): void {
  const wages = receipt.paidMinor;
  if (wages <= 0 || !api.state.modules.has(BUDGETS_MODULE_ID)) return;
  const treasury = governments(api).find((g) => g.id === "US");
  if (!treasury || treasury.organizationId === receipt.organizationId) return;
  const to = `cash:${treasury.organizationId}:residual`;
  const from = `cash:${receipt.organizationId}:residual`;
  const year = api.state.date.slice(0, 4);
  const ytdId = `${receipt.organizationId}:${receipt.personId}:${year}`;
  const ytd =
    (
      table(api, "yearToDate").get(ytdId) as unknown as
        { minor: number } | undefined
    )?.minor ?? 0;
  table(api, "yearToDate").put({
    id: ytdId,
    minor: ytd + wages,
  } as unknown as ModuleRow);

  const rate = (row: {
    value: number | null;
    terms?: Record<string, unknown>;
  }) =>
    typeof row.terms?.employerRate === "number"
      ? row.terms.employerRate
      : (row.value ?? 0);
  const lawIds: string[] = [];
  let socialSecurity = 0,
    medicare = 0,
    estimate = false;
  const ss = lawInForce(api, "social-security-tax").governing;
  if (ss?.value) {
    const base = Math.round(Number(ss.terms?.wageBase ?? Infinity) * 100);
    const taxable = Math.max(0, Math.min(wages, base - ytd));
    socialSecurity = Math.round((taxable * rate(ss)) / 100);
    lawIds.push(ss.id);
    estimate ||= ss.estimate === true;
  }
  const med = lawInForce(api, "medicare-tax").governing;
  if (med?.value) {
    medicare = Math.round((wages * rate(med)) / 100);
    lawIds.push(med.id);
    estimate ||= med.estimate === true;
  }
  // Unemployment insurance taxes, each on its own wage base for the year.
  const ui = (series: string) => {
    const row = lawInForce(api, series).governing;
    if (!row?.value) return { minor: 0, row };
    const notCovered = (row.terms?.notCovered as string[] | undefined) ?? [];
    if (notCovered.includes(lawChain(api).stateKey)) return { minor: 0, row };
    const base = Math.round(Number(row.terms?.wageBase ?? Infinity) * 100);
    const taxable = Math.max(0, Math.min(wages, base - ytd));
    lawIds.push(row.id);
    estimate ||= row.estimate === true;
    return { minor: Math.round((taxable * row.value) / 100), row };
  };
  const federalUnemployment = ui("federal-unemployment-tax").minor;
  const stateTreasury = governments(api).find((g) => g.level === "state");
  const stateUnemployment = stateTreasury
    ? ui("state-unemployment-tax").minor
    : 0;
  // Each government is owed its own share; arrears are kept per government.
  const dues: { account: string; key: string; minor: number }[] = [
    {
      account: to,
      key: receipt.organizationId,
      minor: socialSecurity + medicare + federalUnemployment,
    },
    ...(stateTreasury && stateTreasury.organizationId !== receipt.organizationId
      ? [
          {
            account: `cash:${stateTreasury.organizationId}:residual`,
            key: `${receipt.organizationId}:state`,
            minor: stateUnemployment,
          },
        ]
      : []),
  ];
  let available = Math.max(0, api.accounts().balance(from));
  let paid = 0,
    arrearsAfter = 0,
    owedAll = 0;
  const postings: { id: string; accountId: string; deltaMinor: number }[] = [];
  for (const [index, due] of dues.entries()) {
    const owed = due.minor + arrearsOf(api, due.key);
    owedAll += owed;
    if (owed <= 0) continue;
    const pay = Math.min(owed, available);
    available -= pay;
    paid += pay;
    arrearsAfter += owed - pay;
    table(api, "arrears").put({
      id: due.key,
      minor: owed - pay,
    } as unknown as ModuleRow);
    if (pay > 0)
      postings.push({
        id: `${receipt.id}:employer-tax:in:${index}`,
        accountId: due.account,
        deltaMinor: pay,
      });
  }
  if (owedAll <= 0) return;
  if (paid > 0)
    postings.unshift({
      id: `${receipt.id}:employer-tax:out`,
      accountId: from,
      deltaMinor: -paid,
    });
  const record: EmployerTaxRecord = {
    id: `employer-tax:${receipt.id}`,
    date: api.state.date,
    employerId: receipt.organizationId,
    personId: receipt.personId,
    payrollReceiptId: receipt.id,
    wagesMinor: wages,
    socialSecurityMinor: socialSecurity,
    medicareMinor: medicare,
    federalUnemploymentMinor: federalUnemployment,
    stateUnemploymentMinor: stateUnemployment,
    paidMinor: paid,
    arrearsAfterMinor: arrearsAfter,
    lawIds,
    postings,
    source: {
      tag: estimate ? "ESTIMATED" : "SOURCED",
      citation: lawIds.join(" ; "),
      asOf: api.state.date,
      ...(estimate
        ? {
            estimatedFrom: `Law rows read that are estimates: ${lawIds.join(" ; ")}`,
          }
        : {}),
    },
  };
  table(api, "shares").put(record as unknown as ModuleRow);
  if (!postings.length) return;
  const state = api.state as CoreState;
  api.postJournal({
    id: `journal:${api.state.date}:${state.cashJournal.nextSequence}`,
    date: api.state.date,
    expectedSequence: state.cashJournal.nextSequence,
    sourceRef: { kind: KIND, id: record.id },
    postings,
  });
}
