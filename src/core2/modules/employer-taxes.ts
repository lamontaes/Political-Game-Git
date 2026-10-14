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
import { lawInForce } from "./laws";
import { BUDGETS_MODULE_ID, governments } from "./budgets";

export const EMPLOYER_TAXES_MODULE_ID = "core2-employer-taxes-v1";
const KIND = "employer-taxes:share";

export interface EmployerTaxRecord {
  readonly id: string;
  readonly date: string;
  readonly employerId: string;
  readonly personId: string;
  readonly payrollReceiptId: string;
  readonly wagesMinor: number;
  readonly socialSecurityMinor: number;
  readonly medicareMinor: number;
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
function slotFor(api: CoreAPI, id: string): CashJournalSourceSlot | undefined {
  const map = slots.get(api.state) ?? new Map<string, CashJournalSourceSlot>();
  slots.set(api.state, map);
  if (map.has(id)) return map.get(id);
  const row = table(api, "shares").get(id) as unknown as
    EmployerTaxRecord | undefined;
  if (!row) return undefined;
  const resolved = {
    kind: KIND,
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
    },
  },
  journalSourceProviders: { [KIND]: (api, ref) => slotFor(api, ref.id) },
  onWorkPayroll: payEmployerShare,
};

function table(api: CoreAPI, name: string) {
  return api.moduleState(EMPLOYER_TAXES_MODULE_ID).table(name);
}

/** Installs the module (the budgets module, which holds the treasury, must be open). */
export function openEmployerTaxes(core: CoreState): void {
  if (!core.modules.has(EMPLOYER_TAXES_MODULE_ID))
    registerModule(core, EMPLOYER_TAXES_MODULE);
}

/** What the employer owes the treasury, by employer, still unpaid. */
export function employerArrears(api: CoreAPI, employerId: string): number {
  return (
    (
      table(api, "arrears").get(employerId) as unknown as
        { minor: number } | undefined
    )?.minor ?? 0
  );
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
  const arrearsBefore = employerArrears(api, receipt.organizationId);
  const owed = socialSecurity + medicare + arrearsBefore;
  if (owed <= 0) return;
  const paid = Math.min(owed, Math.max(0, api.accounts().balance(from)));
  const arrearsAfter = owed - paid;
  table(api, "arrears").put({
    id: receipt.organizationId,
    minor: arrearsAfter,
  } as unknown as ModuleRow);
  const postings =
    paid > 0
      ? [
          {
            id: `${receipt.id}:employer-tax:out`,
            accountId: from,
            deltaMinor: -paid,
          },
          {
            id: `${receipt.id}:employer-tax:in`,
            accountId: to,
            deltaMinor: paid,
          },
        ]
      : [];
  const record: EmployerTaxRecord = {
    id: `employer-tax:${receipt.id}`,
    date: api.state.date,
    employerId: receipt.organizationId,
    personId: receipt.personId,
    payrollReceiptId: receipt.id,
    wagesMinor: wages,
    socialSecurityMinor: socialSecurity,
    medicareMinor: medicare,
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
