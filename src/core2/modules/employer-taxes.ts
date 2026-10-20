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
 * work payroll; the residents engine tells this module each payday
 * (`onCountedWages`), and the same share is posted for those workers: the
 * law's rates and wage bases per worker, times the workers the flow pays.
 */
import { registerModule } from "../state";
import type { CoreAPI, CoreModule, CoreState, Source } from "../types";
import type { ModuleRow } from "../module-data";
import type { CashJournalSourceSlot } from "../journal-state";
import { lawChain, lawInForce } from "./laws";
import { ownerOf } from "./business";
import { residentPerson, residentsRuntime } from "./residents";
import { countedPayment, paydayLaw } from "../counted-money";
import { withholdingFor } from "../tax-withholding";
import { BUDGETS_MODULE_ID, governments, withholdPay } from "./budgets";
import { addDays, makeIsoDate } from "../kernel/dates";
import { lawApplied } from "../law-reach/applied";
import { noteTownRevenue } from "../budgets-treasury";

export const EMPLOYER_TAXES_MODULE_ID = "core2-employer-taxes-v1";
const KIND = "employer-taxes:share";
const PROFIT_KIND = "employer-taxes:profit";
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
  /** Set when the wages are the counted workers' pay in one flow: each took the same wages per worker, `workers` of them. */
  readonly counted?: { readonly workers: number };
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
      /** Each quarter's profit of a business a person owns, taxed as the owner's income. */
      passThroughs: { indexes: { byBusiness: { fields: ["businessId"] } } },
      /** Each business's books at its last quarter, to measure the next. */
      quarters: {},
    },
  },
  journalSourceProviders: {
    [KIND]: (api, ref) => slotFor(api, ref.id),
    [PROFIT_KIND]: (api, ref) => slotFor(api, ref.id, PROFIT_KIND),
  },
  onWorkPayroll: (api, receipt) =>
    payEmployerShare(api, {
      organizationId: receipt.organizationId,
      personId: receipt.personId,
      receiptId: receipt.id,
      wages: receipt.paidMinor,
      workers: 1,
    }),
  onCountedWages: (api, notice) =>
    payEmployerShare(api, {
      organizationId: notice.employerId,
      personId: `counted:${notice.id}`,
      receiptId: notice.id,
      wages: notice.paidMinor,
      workers: notice.workers,
      ytdKey: `${notice.employerId}:counted`,
    }),
  onDay: (api) => {
    // Corporations pay tax on each quarter's profit at its end (26 U.S.C.
    // 6655 estimated payments are due quarterly); the days are the calendar's.
    const day = api.state.date.slice(5);
    if (QUARTER_DAYS.includes(day)) payProfitTaxes(api);
  },
};

const QUARTER_DAYS = ["01-01", "04-01", "07-01", "10-01"];
/** The days a quarter's estimated payment covers (about a quarter of the year). */
const QUARTER_DAYS_COUNT = 91;

/**
 * A quarter's tax on profit (owner ruling, Oct 14): a business owned by
 * another organization (a corporation's location) pays the corporate rate in
 * force on its operating profit over the quarter, from its books, to the
 * federal and state treasuries. An owner-run business's profit is its owner's income
 * under the law and is taxed as that (`passThrough`); property tax on
 * premises, which the books don't record, is not (registered stopgap).
 */
function payProfitTaxes(api: CoreAPI): void {
  if (!api.state.modules.has(BUDGETS_MODULE_ID)) return;
  // The corporate rate in force at each level (a territory's own tax stands in
  // place of the federal one), each paid to that level's treasury.
  const levels = lawInForce(api, "corporate-income-tax")
    .levels.filter(
      (level) =>
        !level.setAside &&
        level.row &&
        (level.row.value ?? 0) > 0 &&
        (level.level === "federal" || level.level === "state"),
    )
    .flatMap((level) => {
      const gov = governments(api).find((g) => g.id === level.jurisdiction);
      return gov ? [{ row: level.row!, level: level.level, gov }] : [];
    });
  if (!levels.length) return;
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
    // An owner-run business's profit is its owner's income: they pay the
    // income tax law in force where they live on it, as an estimated payment.
    if (owner && core.people.has(owner)) {
      passThrough(api, id, owner, total - last.minor);
      continue;
    }
    if (owner && residentPerson(core, owner)) {
      passThroughCounted(api, id, owner, total - last.minor);
      continue;
    }
    // A business with no owner has no income to pass on; one an organization
    // owns pays the corporate rate below.
    if (!owner || !core.organizations.has(owner)) continue;
    const profit = total - last.minor;
    const key = `${id}:profit`;
    const taxes = levels.map((l) => ({
      ...l,
      tax: profit > 0 ? Math.round((profit * l.row.value!) / 100) : 0,
    }));
    const tax = taxes.reduce((n, l) => n + l.tax, 0);
    const owed = tax + arrearsOf(api, key);
    if (owed <= 0) continue;
    const from = `cash:${id}:residual`;
    const paid = Math.min(owed, Math.max(0, api.accounts().balance(from)));
    table(api, "arrears").put({
      id: key,
      minor: owed - paid,
    } as unknown as ModuleRow);
    const recordId = `profit-tax:${id}:${api.state.date}`;
    // What is paid goes to the treasuries by their share of what is owed
    // (arrears are the federal's first, being the oldest rows).
    const shares = splitByWeight(
      paid,
      taxes.map((l) => l.tax || 1),
    );
    const postings =
      paid > 0
        ? [
            { id: `${recordId}:out`, accountId: from, deltaMinor: -paid },
            ...taxes
              .map((l, index) => ({
                id: `${recordId}:in:${l.level}`,
                accountId: `cash:${l.gov.organizationId}:residual`,
                deltaMinor: shares[index]!,
              }))
              .filter((p) => p.deltaMinor > 0),
          ]
        : [];
    // The business was taxed at the rates in force: one row per level, the
    // state's (the most local law) on the business itself.
    for (const [index, l] of taxes.entries())
      lawApplied(api, {
        key: "corporate-income-tax",
        lawId: l.row.id,
        targetId: index === taxes.length - 1 ? id : `${id}|${l.level}`,
        target: "organization",
        engine: EMPLOYER_TAXES_MODULE_ID,
        what: "profit-taxed",
        amountMinor: shares[index]!,
      });
    const record: ProfitTaxRecord = {
      id: recordId,
      date: api.state.date,
      businessId: id,
      profitMinor: profit,
      taxMinor: tax,
      paidMinor: paid,
      arrearsAfterMinor: owed - paid,
      lawIds: taxes.map((l) => l.row.id),
      postings,
      source: {
        tag: taxes.some((l) => l.row.estimate) ? "ESTIMATED" : "SOURCED",
        citation: taxes.map((l) => l.row.id).join(" ; "),
        asOf: api.state.date,
        ...(taxes.some((l) => l.row.estimate)
          ? {
              estimatedFrom: `Law rows read that are estimates: ${taxes
                .filter((l) => l.row.estimate)
                .map((l) => l.row.id)
                .join(" ; ")}`,
            }
          : {}),
      },
    };
    table(api, "profits").put(record as unknown as ModuleRow);
    if (!postings.length) continue;
    // The corporate line's outside payers owe that much less at their next installment.
    for (const [index, l] of taxes.entries())
      noteTownRevenue(api, {
        governmentId: l.gov.id,
        line: "corporateIncomeTax",
        paidMinor: shares[index]!,
      });
    api.postJournal({
      id: `journal:${api.state.date}:${core.cashJournal.nextSequence}`,
      date: api.state.date,
      expectedSequence: core.cashJournal.nextSequence,
      sourceRef: { kind: PROFIT_KIND, id: record.id },
      postings,
    });
  }
}

/** Split `whole` by weights in whole minor units; the last share takes the remainder. */
function splitByWeight(whole: number, weights: readonly number[]): number[] {
  const sum = weights.reduce((n, w) => n + w, 0);
  const out: number[] = [];
  let given = 0;
  for (const [index, w] of weights.entries()) {
    const share =
      index === weights.length - 1
        ? whole - given
        : Math.floor((whole * w) / sum);
    out.push(share);
    given += share;
  }
  return out;
}

/**
 * A quarter's profit of a business a full person owns, taxed as their income
 * (26 U.S.C. 1402 and 6654: estimated payments on self-employment income): the
 * same withholding rule as pay, paid from the owner's cash to each government
 * the law names, never more than the cash they hold.
 */
function passThrough(
  api: CoreAPI,
  businessId: string,
  ownerId: string,
  profitMinor: number,
): void {
  if (profitMinor <= 0) return;
  const id = `pass-through:${businessId}:${api.state.date}`;
  if (table(api, "passThroughs").get(id)) return;
  table(api, "passThroughs").put({
    id,
    date: api.state.date,
    businessId,
    ownerId,
    profitMinor,
  } as unknown as ModuleRow);
  withholdPay(api, {
    id,
    personId: ownerId,
    paidMinor: profitMinor,
    fromAt: addDays(makeIsoDate(api.state.date), -QUARTER_DAYS_COUNT + 1),
    throughAt: api.state.date,
    limitToCash: true,
  });
}

/**
 * The same quarter's tax for a business a counted resident owns: the owner's
 * household group pays it from its account by the same withholding rule,
 * times the household's weight, as far as the group holds the cash.
 */
function passThroughCounted(
  api: CoreAPI,
  businessId: string,
  ownerId: string,
  profitMinor: number,
): void {
  if (profitMinor <= 0) return;
  const id = `pass-through:${businessId}:${api.state.date}`;
  if (table(api, "passThroughs").get(id)) return;
  const core = api.state as CoreState;
  const owner = residentPerson(core, ownerId);
  const law = paydayLaw(api);
  if (!owner || !law) return;
  const lines = withholdingFor({
    paidMinor: profitMinor,
    periodDays: QUARTER_DAYS_COUNT,
    yearToDateMinor: 0,
    incomeTax: law.incomeTax,
    socialSecurity: law.socialSecurity,
    medicare: law.medicare,
  });
  const treasuryOf = new Map(
    governments(api).map((row) => [row.id, row.organizationId]),
  );
  let paidMinor = 0;
  for (const [index, line] of lines.entries()) {
    const treasury = treasuryOf.get(line.jurisdiction);
    if (!treasury || line.minor <= 0) continue;
    paidMinor += countedPayment(api, {
      id: `${id}:tax:${index}`,
      placeId: owner.placeId,
      personId: ownerId,
      otherOwnerId: treasury,
      amountMinor: line.minor,
      reasonKey: "owner-profit-tax",
      source: {
        tag: line.estimate ? "ESTIMATED" : "SOURCED",
        citation: line.lawId,
        asOf: api.state.date,
        ...(line.estimate
          ? { estimatedFrom: `Law row read is an estimate: ${line.lawId}` }
          : {}),
      },
    });
  }
  table(api, "passThroughs").put({
    id,
    date: api.state.date,
    businessId,
    ownerId,
    profitMinor,
    counted: true,
    taxPaidMinor: paidMinor,
  } as unknown as ModuleRow);
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

/** Every quarter's profit tax a corporation has paid, with the books' profit it was on. */
export function profitTaxesOf(api: CoreAPI): readonly ProfitTaxRecord[] {
  return table(api, "profits").rows() as unknown as ProfitTaxRecord[];
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

/**
 * The share of a worker's yearly wage an employer pays in payroll taxes under
 * the law in force today: Social Security and Medicare (each to its wage
 * base) and the federal and state unemployment taxes, read from the same law
 * rows `payEmployerShare` reads on each payday. A business sizes what its
 * revenue must cover from this.
 */
export function employerTaxShareOfWage(
  api: CoreAPI,
  annualWageMinor: number,
): number {
  if (annualWageMinor <= 0) return 0;
  const rate = (row: {
    value: number | null;
    terms?: Record<string, unknown>;
  }) =>
    typeof row.terms?.employerRate === "number"
      ? row.terms.employerRate
      : (row.value ?? 0);
  const upTo = (row: { terms?: Record<string, unknown> }) =>
    Math.min(
      annualWageMinor,
      Math.round(Number(row.terms?.wageBase ?? Infinity) * 100),
    );
  let minor = 0;
  const ss = lawInForce(api, "social-security-tax").governing;
  if (ss?.value) minor += (upTo(ss) * rate(ss)) / 100;
  const med = lawInForce(api, "medicare-tax").governing;
  if (med?.value) minor += (annualWageMinor * rate(med)) / 100;
  for (const series of ["federal-unemployment-tax", "state-unemployment-tax"]) {
    const row = lawInForce(api, series).governing;
    if (!row?.value) continue;
    const notCovered = (row.terms?.notCovered as string[] | undefined) ?? [];
    if (notCovered.includes(lawChain(api).stateKey)) continue;
    minor += (upTo(row) * row.value) / 100;
  }
  return minor / annualWageMinor;
}

/**
 * One payday's employer share. `wages` is the whole payday, `workers` the
 * people it pays (one for a paycheck, the counted workers of a flow, each on
 * the same wages), so the law's rates and wage bases are read per worker and
 * the share is their sum.
 */
function payEmployerShare(
  api: CoreAPI,
  pay: {
    readonly organizationId: string;
    readonly personId: string;
    readonly receiptId: string;
    readonly wages: number;
    readonly workers: number;
    readonly ytdKey?: string;
  },
): void {
  const total = pay.wages;
  const workers = Math.max(1, pay.workers);
  const wages = total / workers;
  if (total <= 0 || !api.state.modules.has(BUDGETS_MODULE_ID)) return;
  const receipt = {
    id: pay.receiptId,
    organizationId: pay.organizationId,
    personId: pay.personId,
  };
  const treasury = governments(api).find((g) => g.id === "US");
  if (!treasury || treasury.organizationId === receipt.organizationId) return;
  const to = `cash:${treasury.organizationId}:residual`;
  const from = `cash:${receipt.organizationId}:residual`;
  const year = api.state.date.slice(0, 4);
  const ytdId = `${pay.ytdKey ?? `${receipt.organizationId}:${receipt.personId}`}:${year}`;
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
    socialSecurity = Math.round((workers * taxable * rate(ss)) / 100);
    lawIds.push(ss.id);
    estimate ||= ss.estimate === true;
  }
  const med = lawInForce(api, "medicare-tax").governing;
  if (med?.value) {
    medicare = Math.round((workers * wages * rate(med)) / 100);
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
    return { minor: Math.round((workers * taxable * row.value) / 100), row };
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
    wagesMinor: Math.round(total),
    socialSecurityMinor: socialSecurity,
    medicareMinor: medicare,
    federalUnemploymentMinor: federalUnemployment,
    stateUnemploymentMinor: stateUnemployment,
    paidMinor: paid,
    arrearsAfterMinor: arrearsAfter,
    lawIds,
    postings,
    ...(pay.ytdKey ? { counted: { workers } } : {}),
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
