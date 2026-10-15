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
 * Counted workers' wages (the residents' merged flows) don't pass through the
 * work payroll: on the first of each month each business pays the same share
 * on the counted wages it paid the month before, split over its counted
 * workers by their pay for each worker's wage base (one model, two tiers).
 * Public employers' counted wages are paid from outside accounts and carry no
 * share yet.
 * stopgapId: SG-WORLD-employer-tax-counted-wages
 */
import { registerModule } from "../state";
import { addDays, makeIsoDate } from "../kernel/dates";
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
const COUNTED_KIND = "employer-taxes:counted";
const COUNTED_STOPGAP = "SG-WORLD-employer-tax-counted-wages";
const PROFIT_KIND = "employer-taxes:profit";
const PASS_THROUGH_STOPGAP = "SG-WORLD-business-profit-pass-through";

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

/** A business's month of the employer's share on its counted workers' wages. */
export interface CountedEmployerTaxRecord {
  readonly id: string;
  readonly date: string;
  readonly employerId: string;
  /** The month the wages were paid in. */
  readonly month: string;
  /** Counted workers the wages were split over. */
  readonly workers: number;
  readonly wagesMinor: number;
  readonly socialSecurityMinor: number;
  readonly medicareMinor: number;
  readonly federalUnemploymentMinor: number;
  readonly stateUnemploymentMinor: number;
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
  const row = table(
    api,
    kind === KIND
      ? "shares"
      : kind === COUNTED_KIND
        ? "countedShares"
        : "profits",
  ).get(id) as unknown as
    EmployerTaxRecord | CountedEmployerTaxRecord | ProfitTaxRecord | undefined;
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
      /** Each business's monthly share on its counted workers' wages. */
      countedShares: { indexes: { byEmployer: { fields: ["employerId"] } } },
      /** The counted wages each business had paid at the last month's close. */
      countedPaid: {},
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
    [COUNTED_KIND]: (api, ref) => slotFor(api, ref.id, COUNTED_KIND),
  },
  onWorkPayroll: payEmployerShare,
  onDay: (api) => {
    // Corporations pay tax on each quarter's profit at its end (26 U.S.C.
    // 6655 estimated payments are due quarterly); the days are the calendar's.
    const day = api.state.date.slice(5);
    if (QUARTER_DAYS.includes(day)) payProfitTaxes(api);
    if (day.endsWith("-01")) payCountedShares(api);
  },
};

const QUARTER_DAYS = ["01-01", "04-01", "07-01", "10-01"];

/**
 * A quarter's tax on profit (owner ruling, Oct 14): a business owned by
 * another organization (a corporation's location) pays the corporate rate in
 * force on its operating profit over the quarter, from its books, to the
 * federal treasury. An owner-run business's profit is its owner's income
 * under the law, which is not taxed yet (registered stopgap). Property tax on
 * premises is billed with homes' (billBusinessPropertyTax).
 */
function payProfitTaxes(api: CoreAPI): void {
  if (!api.state.modules.has(BUDGETS_MODULE_ID)) return;
  const treasury = governments(api).find((g) => g.id === "US");
  if (!treasury) return;
  const law = lawInForce(api, "corporate-income-tax").governing;
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

/** The payroll tax rows in force, read once for a payday or a month's close. */
function payrollRows(api: CoreAPI) {
  const lawIds: string[] = [];
  let estimate = false;
  const read = (series: string) => {
    const row = lawInForce(api, series).governing;
    if (!row?.value) return undefined;
    lawIds.push(row.id);
    estimate ||= row.estimate === true;
    return row;
  };
  const covered = (row: ReturnType<typeof read>) =>
    row &&
    !((row.terms?.notCovered as string[] | undefined) ?? []).includes(
      lawChain(api).stateKey,
    )
      ? row
      : undefined;
  const ss = read("social-security-tax"),
    medicare = read("medicare-tax");
  const futa = covered(read("federal-unemployment-tax"));
  const stateTreasury = governments(api).find((g) => g.level === "state");
  const suta = stateTreasury
    ? covered(read("state-unemployment-tax"))
    : undefined;
  return { ss, medicare, futa, suta, stateTreasury, lawIds, estimate };
}

/**
 * The employer's share on one worker's wages, given what the employer had
 * paid them earlier in the year: Social Security and the unemployment taxes
 * each stop at their own wage base.
 */
function shareOn(
  rows: ReturnType<typeof payrollRows>,
  employerId: string,
  wages: number,
  ytd: number,
) {
  const rate = (row: {
    value: number | null;
    terms?: Record<string, unknown>;
  }) =>
    typeof row.terms?.employerRate === "number"
      ? row.terms.employerRate
      : (row.value ?? 0);
  const capped = (
    row: { value: number | null; terms?: Record<string, unknown> } | undefined,
    employer: boolean,
  ) => {
    if (!row) return 0;
    const base = Math.round(Number(row.terms?.wageBase ?? Infinity) * 100);
    const taxable = Math.max(0, Math.min(wages, base - ytd));
    return Math.round(
      (taxable * (employer ? rate(row) : (row.value ?? 0))) / 100,
    );
  };
  return {
    socialSecurity: capped(rows.ss, true),
    medicare: rows.medicare
      ? Math.round((wages * rate(rows.medicare)) / 100)
      : 0,
    federalUnemployment: capped(rows.futa, false),
    // A state doesn't owe its own unemployment fund a tax on its payroll.
    stateUnemployment:
      rows.stateTreasury?.organizationId === employerId
        ? 0
        : capped(rows.suta, false),
  };
}

/** Wages an employer has paid a worker this year, and adds today's. */
function addYearToDate(
  api: CoreAPI,
  employerId: string,
  personId: string,
  wages: number,
): number {
  const id = `${employerId}:${personId}:${api.state.date.slice(0, 4)}`;
  const ytd =
    (
      table(api, "yearToDate").get(id) as unknown as
        { minor: number } | undefined
    )?.minor ?? 0;
  table(api, "yearToDate").put({
    id,
    minor: ytd + wages,
  } as unknown as ModuleRow);
  return ytd;
}

/**
 * Pays what an employer owes each government (today's share plus earlier
 * arrears) from its cash, keeping arrears per government. Returns the
 * postings, nothing posted yet.
 */
function settleDues(
  api: CoreAPI,
  employerId: string,
  idPrefix: string,
  dues: { account: string; key: string; minor: number }[],
) {
  const from = `cash:${employerId}:residual`;
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
        id: `${idPrefix}:employer-tax:in:${index}`,
        accountId: due.account,
        deltaMinor: pay,
      });
  }
  if (paid > 0)
    postings.unshift({
      id: `${idPrefix}:employer-tax:out`,
      accountId: from,
      deltaMinor: -paid,
    });
  return { paid, arrearsAfter, owedAll, postings };
}

/** Each government's due from one employer: federal (Social Security, Medicare, FUTA) and the state's unemployment tax. */
function duesOf(
  api: CoreAPI,
  rows: ReturnType<typeof payrollRows>,
  employerId: string,
  federalMinor: number,
  stateMinor: number,
) {
  const treasury = governments(api).find((g) => g.id === "US")!;
  return [
    {
      account: `cash:${treasury.organizationId}:residual`,
      key: employerId,
      minor: federalMinor,
    },
    ...(rows.stateTreasury && rows.stateTreasury.organizationId !== employerId
      ? [
          {
            account: `cash:${rows.stateTreasury.organizationId}:residual`,
            key: `${employerId}:state`,
            minor: stateMinor,
          },
        ]
      : []),
  ];
}

function sourceOf(api: CoreAPI, rows: ReturnType<typeof payrollRows>): Source {
  return {
    tag: rows.estimate ? "ESTIMATED" : "SOURCED",
    citation: rows.lawIds.join(" ; "),
    asOf: api.state.date,
    ...(rows.estimate
      ? {
          estimatedFrom: `Law rows read that are estimates: ${rows.lawIds.join(" ; ")}`,
        }
      : {}),
  };
}

/**
 * The first of the month: each business pays the employer's share on the
 * counted wages it paid last month (the residents' wage flows add to its
 * books' `wagesPaidMinor`), split over its counted workers by daily pay so
 * each worker's wage base applies.
 */
function payCountedShares(api: CoreAPI): void {
  if (!api.state.modules.has(BUDGETS_MODULE_ID)) return;
  const treasury = governments(api).find((g) => g.id === "US");
  const core = api.state as CoreState;
  const rt = residentsRuntime(core);
  if (!treasury || !rt) return;
  api.stopgap(COUNTED_STOPGAP);
  // Each business's counted jobs paid now, with their daily pay.
  const jobsOf = new Map<string, { personId: string; daily: number }[]>();
  for (const [jobId, flow] of rt.wageFlowByJob) {
    const job = rt.jobs.get(jobId);
    if (!job || job.endsAt !== undefined || flow.endedAt) continue;
    const list = jobsOf.get(flow.payerId);
    const row = { personId: job.personId, daily: job.wageDailyMinor };
    if (list) list.push(row);
    else jobsOf.set(flow.payerId, [row]);
  }
  const rows = payrollRows(api);
  const month = addDays(makeIsoDate(api.state.date), -1).slice(0, 7);
  for (const [id, books] of [...core.finance.businesses].sort((a, b) =>
    a[0].localeCompare(b[0]),
  )) {
    if (id === treasury.organizationId) continue;
    const seen =
      (
        table(api, "countedPaid").get(id) as unknown as
          { minor: number } | undefined
      )?.minor ?? 0;
    const wages = books.wagesPaidMinor - seen;
    table(api, "countedPaid").put({
      id,
      minor: books.wagesPaidMinor,
    } as unknown as ModuleRow);
    if (wages <= 0) continue;
    // Split by daily pay, the remainder to the best paid (ties by person).
    const workers = [...(jobsOf.get(id) ?? [])].sort(
      (a, b) => b.daily - a.daily || a.personId.localeCompare(b.personId),
    );
    if (!workers.length) workers.push({ personId: `counted:${id}`, daily: 1 });
    const total = workers.reduce((n, w) => n + w.daily, 0) || 1;
    const parts = workers.map((w) => Math.floor((wages * w.daily) / total));
    parts[0]! += wages - parts.reduce((n, v) => n + v, 0);
    let ss = 0,
      medicare = 0,
      futa = 0,
      suta = 0;
    workers.forEach((w, i) => {
      const part = parts[i]!;
      if (part <= 0) return;
      const share = shareOn(
        rows,
        id,
        part,
        addYearToDate(api, id, w.personId, part),
      );
      ss += share.socialSecurity;
      medicare += share.medicare;
      futa += share.federalUnemployment;
      suta += share.stateUnemployment;
    });
    const recordId = `employer-tax:counted:${id}:${month}`;
    const settled = settleDues(
      api,
      id,
      recordId,
      duesOf(api, rows, id, ss + medicare + futa, suta),
    );
    if (settled.owedAll <= 0) continue;
    const record: CountedEmployerTaxRecord = {
      id: recordId,
      date: api.state.date,
      employerId: id,
      month,
      workers: workers.length,
      wagesMinor: wages,
      socialSecurityMinor: ss,
      medicareMinor: medicare,
      federalUnemploymentMinor: futa,
      stateUnemploymentMinor: suta,
      paidMinor: settled.paid,
      arrearsAfterMinor: settled.arrearsAfter,
      lawIds: [...rows.lawIds],
      postings: settled.postings,
      source: sourceOf(api, rows),
    };
    table(api, "countedShares").put(record as unknown as ModuleRow);
    if (!settled.postings.length) continue;
    api.postJournal({
      id: `journal:${api.state.date}:${core.cashJournal.nextSequence}`,
      date: api.state.date,
      expectedSequence: core.cashJournal.nextSequence,
      sourceRef: { kind: COUNTED_KIND, id: record.id },
      postings: settled.postings,
    });
  }
}

function payEmployerShare(
  api: CoreAPI,
  receipt: Readonly<WorkPayrollJournalReceipt>,
): void {
  const wages = receipt.paidMinor;
  if (wages <= 0 || !api.state.modules.has(BUDGETS_MODULE_ID)) return;
  const treasury = governments(api).find((g) => g.id === "US");
  if (!treasury || treasury.organizationId === receipt.organizationId) return;
  const ytd = addYearToDate(
    api,
    receipt.organizationId,
    receipt.personId,
    wages,
  );
  const rows = payrollRows(api);
  const share = shareOn(rows, receipt.organizationId, wages, ytd);
  const settled = settleDues(
    api,
    receipt.organizationId,
    receipt.id,
    duesOf(
      api,
      rows,
      receipt.organizationId,
      share.socialSecurity + share.medicare + share.federalUnemployment,
      share.stateUnemployment,
    ),
  );
  if (settled.owedAll <= 0) return;
  const record: EmployerTaxRecord = {
    id: `employer-tax:${receipt.id}`,
    date: api.state.date,
    employerId: receipt.organizationId,
    personId: receipt.personId,
    payrollReceiptId: receipt.id,
    wagesMinor: wages,
    socialSecurityMinor: share.socialSecurity,
    medicareMinor: share.medicare,
    federalUnemploymentMinor: share.federalUnemployment,
    stateUnemploymentMinor: share.stateUnemployment,
    paidMinor: settled.paid,
    arrearsAfterMinor: settled.arrearsAfter,
    lawIds: rows.lawIds,
    postings: settled.postings,
    source: sourceOf(api, rows),
  };
  table(api, "shares").put(record as unknown as ModuleRow);
  if (!settled.postings.length) return;
  const state = api.state as CoreState;
  api.postJournal({
    id: `journal:${api.state.date}:${state.cashJournal.nextSequence}`,
    date: api.state.date,
    expectedSequence: state.cashJournal.nextSequence,
    sourceRef: { kind: KIND, id: record.id },
    postings: settled.postings,
  });
}
