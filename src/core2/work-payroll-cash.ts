/** Proposed recorded-payday cash owner. Attendance creates no cash or choice here. */
import { addDays, makeIsoDate } from "./kernel/dates";
import { bookkeeping } from "./bookkeeping";
import { cashJournalParameters } from "./cash-host";
import { snapshotExplicitControlV1 } from "./player-control-state-v1";
import { registerModule } from "./state";
import {
  FinanceReadGuard,
  FinancePlanningSession,
  guardWorkFinanceResult,
  prepareWorkFinancePlan,
} from "./finance-plan";
import {
  admitCompositeFinanceCreditSources,
  cancelCompositeFinanceCreditSources,
  ensureFinanceCashModule,
  finishCompositeFinanceCreditSources,
  resolveCompositeFinanceCreditSources,
} from "./finance-cash";
import {
  preparePublicWorkPay,
  resolvePublicWorkPayDue,
} from "./public-work-pay";
import {
  admittedWorkPayrollCalendarMatches,
  workEarnedPayPeriodId,
} from "./work-attendance";
import { allocateWorkPayrollGroup } from "./work-payroll-group";
import type {
  PublicWorkPayrollGroupDue,
  WorkPayrollAttributionRule,
} from "./work-payroll-group";
import {
  nextWorkPayrollPeriod,
  workPayPeriodAtIndex,
  workPayPeriodOnDate,
  prepareWorkPayrollRequest,
  prepareWorkPayrollSettlement,
} from "./work-pay-period";
import type { PreparedFinancePlan, PreparedWorkFinance } from "./finance-plan";
import type { CreditReceipt } from "./finance-types";
import type {
  CashJournalPosting,
  CashJournalSourceRef,
  ResolvedCashJournalSource,
} from "./journal";
import type {
  CashJournalPostedMarker,
  CashJournalSourceProvider,
  CashJournalSourceSlot,
} from "./journal-state";
import type {
  CoreAPI,
  CoreModule,
  CoreState,
  PublicWorkPayDue,
  Source,
  WorkCommitmentInput,
  WorkData,
  WorkRuntime,
} from "./types";
import type {
  WorkEarnedPayPeriod,
  WorkPayrollBasis,
  WorkPayrollCalendarInput,
  WorkPayrollLedger,
  WorkPayrollRequest,
  WorkPayrollSettlement,
} from "./work-pay-period";

export interface WorkPayrollCashReceipt extends WorkPayrollSettlement {
  group?: false;
  components?: never;
  calendarSource: Source;
  earnedPeriodSource?: Source;
  priorPayrollReceiptId?: string;
  payerCashBeforeMinor: number;
  payerCashAfterMinor: number;
  payeeCashBeforeMinor: number;
  payeeCashAfterMinor: number;
  employerOpeningFundsSource: Source;
  publicPayDue?: PublicWorkPayDue;
}

export interface WorkPayrollGroupComponentReceipt extends Omit<
  WorkPayrollCashReceipt,
  | "payerCashBeforeMinor"
  | "payerCashAfterMinor"
  | "payeeCashBeforeMinor"
  | "payeeCashAfterMinor"
  | "employerOpeningFundsSource"
> {
  groupReceiptId: string;
  /** Original individual request identity; there is only one completed group cash source. */
  claimId: string;
}
export interface WorkPayrollGroupReceipt {
  group: true;
  id: string;
  date: string;
  calendarId: string;
  personId: string;
  organizationId: string;
  index: number;
  fromAt: string;
  throughAt: string;
  dueAt: string;
  requestedMinor: number;
  newlyDueMinor: number;
  arrearsBeforeMinor: number;
  paidMinor: number;
  shortfallMinor: number;
  paidArrearsMinor: number;
  paidNewlyDueMinor: number;
  missedNewlyDueMinor: number;
  arrearsAfterMinor: number;
  payerCashBeforeMinor: number;
  payerCashAfterMinor: number;
  payeeCashBeforeMinor: number;
  payeeCashAfterMinor: number;
  components: readonly WorkPayrollGroupComponentReceipt[];
  accountingAttributionRule: WorkPayrollAttributionRule;
  attributionSource: Source;
  calendarSource: Source;
  employerOpeningFundsSource: Source;
  publicPayDue?: PublicWorkPayrollGroupDue;
  source: Source;
  // These are never manufactured for an aggregate. Existing single receipt fields remain exact.
  jobId?: never;
  commitmentId?: never;
  earnedPeriodId?: never;
}
export type WorkPayrollJournalReceipt =
  WorkPayrollCashReceipt | WorkPayrollGroupReceipt;
export type WorkPayrollJobReceipt =
  WorkPayrollCashReceipt | WorkPayrollGroupComponentReceipt;
export interface WorkPayrollGroupComponentState {
  result: WorkPayrollGroupComponentReceipt;
  ledgerBefore: WorkPayrollLedger;
  ledgerAfter: WorkPayrollLedger;
  earnedPeriod?: WorkEarnedPayPeriod;
}
export interface WorkPayrollGroupSourceState extends CashJournalPostedMarker {
  group: true;
  id: string;
  kind: string;
  date: string;
  result: WorkPayrollGroupReceipt;
  componentStates: readonly WorkPayrollGroupComponentState[];
  credits: readonly CreditReceipt[];
  postings: readonly CashJournalPosting[];
  projection: PreparedWorkFinance;
  references: ResolvedCashJournalSource["relatedRecords"];
}
export interface SingleWorkPayrollCashSourceState extends CashJournalPostedMarker {
  group?: false;
  id: string;
  kind: string;
  date: string;
  result: WorkPayrollCashReceipt;
  ledgerBefore: WorkPayrollLedger;
  ledgerAfter: WorkPayrollLedger;
  /** Original genuine earned record survives removal from the open-period index. */
  earnedPeriod?: WorkEarnedPayPeriod;
  credits: readonly CreditReceipt[];
  postings: readonly CashJournalPosting[];
  projection: PreparedWorkFinance;
  references: ResolvedCashJournalSource["relatedRecords"];
}

export type WorkPayrollCashSourceState =
  SingleWorkPayrollCashSourceState | WorkPayrollGroupSourceState;

/** Root merges these typed fields into WorkRuntime; no OrganizationInput metadata. */
export interface WorkPayrollCashRuntime {
  payrollCalendars: Map<string, WorkPayrollCalendarInput>;
  payrollCalendarByCommitment: Map<string, string>;
  payrollCalendarByJob: Map<string, string>;
  payrollLedgerByCommitment: Map<string, WorkPayrollLedger>;
  earnedPayPeriods: Map<string, WorkEarnedPayPeriod>;
  earnedPayPeriodByCommitmentIndex: Map<string, Map<number, string>>;
  payrollPeriodsByDue: Map<string, Set<string>>;
  payrollArrearsByDue: Map<string, Set<string>>;
  payrollCashSources: Map<string, WorkPayrollCashSourceState>;
  latestPayrollByJob: Map<string, WorkPayrollJobReceipt>;
  detailedPayroll: Map<string, WorkPayrollJournalReceipt>;
}

type AttendanceFact = {
  id: string;
  date: string;
  commitmentId: string;
  jobId: string;
  personId: string;
  organizationId: string;
  payrollCalendarId: string;
  earnedPayPeriodId: string;
  earnedMinor: number;
  sourceActId: string;
  source: Source;
};
type Runtime = WorkRuntime &
  WorkPayrollCashRuntime & { lastAttendanceByJob: Map<string, AttendanceFact> };
type Commitment = WorkCommitmentInput & { payrollCalendarId?: string };
type PayrollData = WorkData & {
  payrollCashModuleId: string;
  payrollReceiptIdPrefix: string;
  payrollReceiptCitation: string;
  publicPayrollPayDueCitation: string;
  journalSourceKinds: WorkData["journalSourceKinds"] & {
    payroll: string;
    payrollCalendar: string;
    earnedPayPeriod: string;
  };
};
type Related = ResolvedCashJournalSource["relatedRecords"][number];
type Context = {
  work: Runtime;
  cfg: PayrollData;
  commitment: Commitment;
  calendar: WorkPayrollCalendarInput;
  basis: WorkPayrollBasis;
  ledger: WorkPayrollLedger;
  period?: WorkEarnedPayPeriod;
  periodIndex?: Map<number, string>;
  request: WorkPayrollRequest;
};
const installed = new WeakMap<
  CoreState,
  {
    module: CoreModule;
    provider: CashJournalSourceProvider;
    kind: string;
    id: string;
  }
>();
const pending = new WeakMap<
  WorkPayrollCashSourceState,
  PreparedFinancePlan<WorkPayrollJournalReceipt>
>();
type ControlSnapshot = ReturnType<typeof snapshotExplicitControlV1>;
const sessionControl = new WeakMap<FinancePlanningSession, ControlSnapshot>(),
  pendingControl = new WeakMap<WorkPayrollCashSourceState, ControlSnapshot>(),
  retainedControlledSources = new WeakSet<WorkPayrollCashSourceState>();
const nativeSet = Map.prototype.set,
  nativeDelete = Map.prototype.delete,
  controlGet = WeakMap.prototype.get,
  controlSet = WeakMap.prototype.set,
  retainedHas = WeakSet.prototype.has,
  retainedAdd = WeakSet.prototype.add;
function controlledPayrollSession(core: CoreState): FinancePlanningSession {
  const snapshot = snapshotExplicitControlV1(core),
    s = new FinancePlanningSession(
      core,
      core.cashJournal,
      cashJournalParameters(core),
    );
  controlSet.call(sessionControl, s, snapshot);
  return s;
}
function payrollControl(s: FinancePlanningSession): ControlSnapshot {
  const snapshot = controlGet.call(sessionControl, s) as
    ControlSnapshot | undefined;
  if (!snapshot)
    throw new Error(
      "Payroll writer lost its original explicit-control preimage.",
    );
  return snapshot;
}

// In play the checks and copies below only confirm what the engines already
// wrote, so they return at once; tests and the bench run them with bookkeeping on.
function identity(value: string): void {
  if (!bookkeeping()) return;
  if (typeof value !== "string" || !value || value !== value.trim())
    throw new Error("Payroll cash requires exact recorded identities.");
}
function minor(value: number, zero: number): number {
  if (!bookkeeping()) return value;
  if (!Number.isSafeInteger(value) || value < zero)
    throw new Error("Payroll cash amount or stock is malformed or overflows.");
  return value;
}
function plus(left: number, right: number, zero: number): number {
  if (!bookkeeping()) return left + right;
  return minor(
    Number(BigInt(minor(left, zero)) + BigInt(minor(right, zero))),
    zero,
  );
}
function units(s: FinancePlanningSession) {
  return {
    zero: s.zero,
    one: s.one,
    monthsPerYear: s.parameter("monthsPerYear"),
  };
}
function configuration(s: FinancePlanningSession): PayrollData {
  const r = s.reads,
    cfg = r.field(r.field(s.core, "data"), "work") as PayrollData | undefined;
  if (!cfg) throw new Error("Payroll cash has no actual work data.");
  if (!bookkeeping()) return cfg;
  const kinds = r.field(cfg, "journalSourceKinds");
  for (const value of [
    r.field(cfg, "payrollCashModuleId"),
    r.field(cfg, "payrollReceiptIdPrefix"),
    r.field(kinds, "payroll"),
    r.field(kinds, "payrollCalendar"),
    r.field(kinds, "earnedPayPeriod"),
    r.field(kinds, "commitment"),
  ])
    identity(value);
  if (!r.field(cfg, "payrollReceiptCitation")?.trim())
    throw new Error("Payroll cash lacks its owning receipt provenance.");
  return cfg;
}
function source(s: FinancePlanningSession, value: Source, at: string): Source {
  if (!bookkeeping()) return value;
  const r = s.reads;
  if (!value) throw new Error("Payroll cash requires full owning Source.");
  r.payload(value, s.zero, s.one);
  const tag = r.field(value, "tag"),
    asOf = r.field(value, "asOf"),
    citation = r.field(value, "citation");
  if (
    !["SOURCED", "ESTIMATED"].includes(tag) ||
    typeof citation !== "string" ||
    !citation.trim() ||
    typeof asOf !== "string" ||
    makeIsoDate(asOf) !== asOf ||
    asOf > at ||
    (tag === "ESTIMATED" && !r.field(value, "estimatedFrom")?.trim())
  )
    throw new Error("Payroll cash owning Source is unavailable or incomplete.");
  return value;
}
/** Full detached own data, never invoking a raw getter, toJSON or Proxy get. */
function copy<T>(
  r: FinanceReadGuard,
  raw: T,
  zero: number,
  one: number,
  active = new Set<object>(),
): T {
  if (!bookkeeping()) return raw;
  if (
    typeof raw === "function" ||
    typeof raw === "symbol" ||
    typeof raw === "bigint"
  )
    throw new Error("Payroll evidence must be ordinary nonexecutable data.");
  if (raw === null || typeof raw !== "object") return raw;
  if (active.has(raw)) throw new Error("Cyclic payroll evidence.");
  active.add(raw);
  try {
    const array = Array.isArray(raw),
      prototype = Object.getPrototypeOf(raw);
    if (
      (!array && prototype !== Object.prototype && prototype !== null) ||
      (array && prototype !== Array.prototype)
    )
      throw new Error("Payroll evidence requires ordinary owned data rows.");
    const result = array ? [] : Object.create(null);
    for (const key of r.keys(raw)) {
      if (array && key === "length") continue;
      Object.defineProperty(result, key, {
        value: copy(
          r,
          r.field(raw as Record<PropertyKey, unknown>, key),
          zero,
          one,
          active,
        ),
        enumerable: true,
      });
    }
    if (array) {
      const length = r.field(raw, "length" as keyof T) as number;
      for (let index = zero; index < length; index += one)
        if (!Object.hasOwn(raw, index))
          throw new Error("Payroll arrays must be dense.");
      Object.defineProperty(result, "length", { value: length });
    }
    return Object.freeze(result) as T;
  } finally {
    active.delete(raw);
  }
}
function same(
  r: FinanceReadGuard,
  left: unknown,
  right: unknown,
  seen = new WeakMap<object, object>(),
): boolean {
  if (!bookkeeping() || Object.is(left, right)) return true;
  if (
    left === null ||
    right === null ||
    typeof left !== "object" ||
    typeof right !== "object"
  )
    return false;
  if (seen.has(left)) return seen.get(left) === right;
  seen.set(left, right);
  const a = r.keys(left),
    b = r.keys(right);
  return (
    a.length === b.length &&
    a.every(
      (key, index) =>
        key === b[index] &&
        same(
          r,
          r.field(left as Record<PropertyKey, unknown>, key),
          r.field(right as Record<PropertyKey, unknown>, key),
          seen,
        ),
    )
  );
}

export function ensureWorkPayrollCashModule(core: CoreState): void {
  const s = new FinancePlanningSession(
      core,
      core.cashJournal,
      cashJournalParameters(core),
    ),
    r = s.reads,
    cfg = configuration(s),
    id = r.field(cfg, "payrollCashModuleId"),
    kind = r.field(r.field(cfg, "journalSourceKinds"), "payroll"),
    modules = r.field(core, "modules"),
    providers = r.field(r.field(core, "cashJournal"), "sourceProviders"),
    prior = installed.get(core);
  if (prior) {
    if (
      id !== prior.id ||
      kind !== prior.kind ||
      r.mapGet(modules, id) !== prior.module ||
      r.mapGet(providers, kind) !== prior.provider
    )
      throw new Error("Actual payroll cash owner or provider was replaced.");
    r.verify();
    return;
  }
  if (r.mapHas(modules, id) || r.mapHas(providers, kind))
    throw new Error("Payroll cash namespace is already owned.");
  r.verify();
  const module: CoreModule = Object.freeze({
    id,
    journalSourceProviders: Object.freeze({
      [kind]: workPayrollCashSourceProvider,
    }),
  });
  registerModule(core, module);
  const provider = core.cashJournal.sourceProviders.get(kind);
  if (!provider)
    throw new Error(
      "Payroll provider registration did not install its actual owner.",
    );
  installed.set(core, { module, provider, kind, id });
}

function owningBasis(
  s: FinancePlanningSession,
  commitmentId: string,
  at: string,
  requireLivingPayee: boolean,
) {
  identity(commitmentId);
  const r = s.reads,
    core = s.core,
    work = r.field(core, "work") as Runtime,
    row = r.mapGet(r.field(work, "commitments"), commitmentId) as
      Commitment | undefined;
  if (!row || r.field(row, "id") !== commitmentId)
    throw new Error("Payroll lost the actual retained commitment.");
  const calendarId = r.field(row, "payrollCalendarId"),
    jobId = r.field(row, "jobId"),
    personId = r.field(row, "personId"),
    organizationId = r.field(row, "organizationId"),
    job = r.mapGet(r.field(core, "jobs"), jobId),
    person = r.mapGet(r.field(core, "people"), personId),
    employer = r.mapGet(r.field(core, "organizations"), organizationId),
    calendar = calendarId
      ? r.mapGet(r.field(work, "payrollCalendars"), calendarId)
      : undefined;
  if (!calendar || !job)
    throw new Error(
      "Payroll no longer resolves its actual job/person/employer/calendar links.",
    );
  if (
    bookkeeping() &&
    (!person ||
      !employer ||
      r.field(job, "id") !== jobId ||
      r.field(job, "personId") !== personId ||
      r.field(job, "organizationId") !== organizationId ||
      r.field(person, "id") !== personId ||
      r.field(employer, "id") !== organizationId ||
      r.field(calendar, "id") !== calendarId ||
      r.field(calendar, "organizationId") !== organizationId ||
      r.mapGet(r.field(work, "payrollCalendarByCommitment"), commitmentId) !==
        calendarId ||
      r.mapGet(r.field(work, "payrollCalendarByJob"), jobId) !== calendarId)
  )
    throw new Error(
      "Payroll no longer resolves its actual job/person/employer/calendar links.",
    );
  if (
    bookkeeping() &&
    !admittedWorkPayrollCalendarMatches(core, calendarId!, calendar)
  )
    throw new Error(
      "Payroll calendar was replaced or lacks its genuine owning admission.",
    );
  // Primary active job and end bounds govern attendance, not cancellation of earned debt.
  if (bookkeeping() && requireLivingPayee && r.field(person!, "alive") !== true)
    throw new Error(
      "Payroll debt is held pending separately qualified deceased-payee authority.",
    );
  const basis: WorkPayrollBasis = {
    calendarId: calendarId!,
    commitmentId,
    jobId,
    personId,
    organizationId,
    jobSource: source(s, r.field(job, "source"), at),
    paySource: source(s, r.field(row, "paySource"), at),
    scheduleSource: source(s, r.field(row, "scheduleSource"), at),
  };
  source(s, r.field(calendar, "source"), at);
  source(s, r.field(employer!, "source"), at);
  const startsAt = r.field(row, "startsAt"),
    commitmentEnd = r.field(row, "endsAt"),
    jobEnd = r.field(job, "endsAt");
  if (bookkeeping())
    for (const bound of [startsAt, commitmentEnd, jobEnd])
      if (bound !== undefined && makeIsoDate(bound) !== bound)
        throw new Error("Payroll retained employment bounds are malformed.");
  return {
    work,
    commitment: row,
    calendar,
    basis,
    employer: employer!,
    startsAt,
    commitmentEnd,
    jobEnd,
  };
}

function validateEarnedBounds(
  s: FinancePlanningSession,
  period: WorkEarnedPayPeriod | undefined,
  owner: ReturnType<typeof owningBasis>,
): void {
  if (!period || !bookkeeping()) return;
  const r = s.reads,
    first = r.field(period, "firstEarnedAt"),
    last = r.field(period, "lastEarnedAt");
  // Commitment endsAt is inclusive in plannedWorkMinutesOnDate. A calendar's
  // effectiveUntil remains independently exclusive in the pure earned validator.
  if (
    first < owner.startsAt ||
    (owner.commitmentEnd !== undefined && last > owner.commitmentEnd) ||
    (owner.jobEnd !== undefined && last > owner.jobEnd)
  )
    throw new Error(
      "Payroll earned record lies outside its original employment bounds.",
    );
  if (owner.jobEnd === undefined || last < owner.jobEnd) return;
  // closeEmployer changes job.endsAt after this day's genuine attendance. An
  // ordinary supplied ended job cannot authorize a newly fabricated end-day shift.
  const attendance = r.mapGet(
      r.field(owner.work, "lastAttendanceByJob"),
      owner.basis.jobId,
    ),
    closure = r.mapGet(s.map("closures"), owner.basis.organizationId);
  if (
    !attendance ||
    !closure ||
    r.field(attendance, "date") !== last ||
    r.field(attendance, "id") !== r.field(period, "lastWorkResultId") ||
    r.field(attendance, "earnedPayPeriodId") !== r.field(period, "id") ||
    r.field(attendance, "commitmentId") !== owner.basis.commitmentId ||
    r.field(attendance, "jobId") !== owner.basis.jobId ||
    r.field(attendance, "personId") !== owner.basis.personId ||
    r.field(attendance, "organizationId") !== owner.basis.organizationId ||
    r.field(attendance, "payrollCalendarId") !== owner.basis.calendarId ||
    r.field(closure, "organizationId") !== owner.basis.organizationId ||
    r.field(closure, "date") !== last ||
    !r
      .array(r.field(closure, "endedJobIds"), s.zero, s.one)
      .includes(owner.basis.jobId) ||
    !r
      .array(r.field(closure, "affectedPersonIds"), s.zero, s.one)
      .includes(owner.basis.personId)
  )
    throw new Error(
      "Final-day payroll earnings lack their genuine retained attendance and closure basis.",
    );
  r.payload(attendance, s.zero, s.one);
  r.payload(closure, s.zero, s.one);
  identity(r.field(attendance, "sourceActId"));
  source(s, r.field(attendance, "source"), last);
  source(s, r.field(closure, "source"), last);
  const cause = r.field(closure, "cause") as unknown as Record<string, unknown>;
  // An owner who closed by choice owes the day's work like any other: the
  // final-day earnings are paid, with no unpaid obligation behind them.
  if (r.field(cause, "kind") === "owner.choice") {
    if (
      r.field(cause, "id") !== r.field(closure, "sourceReceiptId") ||
      r.field(cause, "date") !== last ||
      r.field(cause, "organizationId") !== owner.basis.organizationId
    )
      throw new Error(
        "Final-day payroll lacks its owner's actual closing choice.",
      );
    source(s, r.field(cause, "source") as Source, last);
    return;
  }
  const causeId = r.field(cause, "id") as string,
    requested = r.field(cause, "requestedMinor") as number,
    paid = r.field(cause, "paidMinor") as number,
    contractId = r.field(cause, "contractId");
  if (
    causeId !== r.field(closure, "sourceReceiptId") ||
    r.field(cause, "date") !== last ||
    minor(requested, s.zero) - minor(paid, s.zero) <= s.zero
  )
    throw new Error(
      "Final-day payroll closure lacks its genuine positive unpaid cause.",
    );
  identity(causeId);
  source(s, r.field(cause, "source") as Source, last);
  if (typeof contractId === "string") {
    const contract = r.mapGet(s.map("contracts"), contractId),
      payments = r.field(cause, "payments") as readonly Record<
        string,
        unknown
      >[];
    if (
      !contract ||
      r.field(contract, "id") !== contractId ||
      !r.field(contract, "accruesArrears") ||
      r.field(cause, "unfundedMinor") !== requested - paid ||
      !r
        .array(payments, s.zero, s.one)
        .some(
          (payment) =>
            r.field(payment, "payerId") === owner.basis.organizationId,
        )
    )
      throw new Error(
        "Final-day payroll closure has another standing obligation owner.",
      );
  } else {
    if (
      r.field(cause, "organizationId") !== owner.basis.organizationId ||
      r.field(cause, "shortfallMinor") !== requested - paid
    )
      throw new Error(
        "Final-day payroll closure has another wage owner or amount.",
      );
    if (r.field(cause, "calendarId") !== undefined) {
      const canonical = r.mapGet(
        r.field(owner.work, "payrollCashSources"),
        causeId,
      );
      if (
        !canonical ||
        r.field(canonical, "date") !== last ||
        (r.field(canonical, "postedJournalSequence") === undefined &&
          r.field(canonical, "completedAt") === undefined) ||
        !same(r, r.field(canonical, "result"), cause)
      )
        throw new Error(
          "Final-day payroll closure lost its actual completed payday cause.",
        );
    }
  }
}

function currentContext(
  s: FinancePlanningSession,
  commitmentId: string,
): Context {
  const r = s.reads,
    cfg = configuration(s),
    owner = owningBasis(s, commitmentId, s.date, true),
    { work, calendar, basis } = owner,
    u = units(s),
    due = nextWorkPayrollPeriod(r, calendar, s.date, s.date, u);
  if (due.dueAt !== s.date)
    throw new Error(
      "Payroll may move cash only on its separately recorded payday.",
    );
  const ledger = r.mapGet(
      r.field(work, "payrollLedgerByCommitment"),
      commitmentId,
    ),
    periodIndex = r.mapGet(
      r.field(work, "earnedPayPeriodByCommitmentIndex"),
      commitmentId,
    );
  if (!ledger) throw new Error("Payroll has no actual admitted earned ledger.");
  const targets = !bookkeeping()
    ? []
    : [
        r.field(work, "payrollLedgerByCommitment"),
        r.field(work, "earnedPayPeriods"),
        r.field(work, "earnedPayPeriodByCommitmentIndex"),
        r.field(work, "payrollPeriodsByDue"),
        r.field(work, "payrollArrearsByDue"),
        r.field(work, "payrollCashSources"),
        r.field(work, "latestPayrollByJob"),
        r.field(work, "detailedPayroll"),
        r.field(work, "totalsByJob"),
      ];
  if (new Set(targets).size !== targets.length)
    throw new Error("Payroll writable tables must retain independent owners.");
  for (const table of targets)
    r.mapHas(table as ReadonlyMap<unknown, unknown>, undefined);
  if (bookkeeping() && periodIndex) {
    r.payload(periodIndex, s.zero, s.one);
    for (const [index, id] of Map.prototype.entries.call(
      periodIndex,
    ) as IterableIterator<[number, string]>) {
      if (!Number.isSafeInteger(index) || index < s.zero)
        throw new Error("Payroll original period index is malformed.");
      const actual = r.mapGet(r.field(work, "earnedPayPeriods"), id),
        expected = workPayPeriodAtIndex(r, calendar, index, s.date, u);
      if (
        !actual ||
        r.field(actual, "id") !== id ||
        r.field(actual, "commitmentId") !== commitmentId ||
        r.field(actual, "calendarId") !== basis.calendarId ||
        r.field(actual, "index") !== index ||
        r.field(actual, "dueAt") !== expected.dueAt
      )
        throw new Error(
          "Payroll earned-period index lost its exact actual owning record.",
        );
      if (index < due.index)
        throw new Error(
          "An earlier original earned period remains unrecognized; payroll debt is preserved.",
        );
    }
  }
  const periodId = periodIndex ? r.mapGet(periodIndex, due.index) : undefined,
    period = periodId
      ? r.mapGet(r.field(work, "earnedPayPeriods"), periodId)
      : undefined;
  if (bookkeeping() && periodId !== undefined) {
    const dueMembers = r.mapGet(r.field(work, "payrollPeriodsByDue"), s.date);
    if (!period || !dueMembers || !r.member(dueMembers, periodId))
      throw new Error(
        "Payroll original earned period is absent from its actual due index.",
      );
  }
  validateEarnedBounds(s, period, owner);
  const lastEarnedAt = r.field(ledger, "lastEarnedAt"),
    lastWorkResultId = r.field(ledger, "lastWorkResultId");
  if (bookkeeping() && lastEarnedAt !== undefined) {
    const attendance = r.mapGet(
      r.field(work, "lastAttendanceByJob"),
      basis.jobId,
    );
    if (!attendance)
      throw new Error(
        "Payroll earned ledger lost its actual latest attendance fact.",
      );
    r.payload(attendance, s.zero, s.one);
    if (
      r.field(attendance, "id") !== lastWorkResultId ||
      r.field(attendance, "date") !== lastEarnedAt ||
      r.field(attendance, "commitmentId") !== commitmentId ||
      r.field(attendance, "jobId") !== basis.jobId ||
      r.field(attendance, "personId") !== basis.personId ||
      r.field(attendance, "organizationId") !== basis.organizationId ||
      r.field(attendance, "payrollCalendarId") !== basis.calendarId ||
      minor(r.field(attendance, "earnedMinor"), s.zero) >
        r.field(ledger, "earnedMinor")
    )
      throw new Error(
        "Payroll earned ledger differs from its actual latest owned attendance.",
      );
    identity(r.field(attendance, "sourceActId"));
    source(s, r.field(attendance, "source"), lastEarnedAt);
  }
  const priorReceiptId = r.field(ledger, "lastPayrollReceiptId");
  if (bookkeeping() && priorReceiptId !== undefined) {
    const prior = r.mapGet(r.field(work, "payrollCashSources"), priorReceiptId),
      latest = r.mapGet(r.field(work, "latestPayrollByJob"), basis.jobId);
    if (
      !prior ||
      !latest ||
      r.field(latest, "id") !== priorReceiptId ||
      (r.field(prior, "postedJournalSequence") === undefined &&
        r.field(prior, "completedAt") === undefined)
    )
      throw new Error(
        "Payroll ledger lost its genuine previous completed payroll source.",
      );
    let after: WorkPayrollLedger;
    if (r.field(prior, "group") === true) {
      const group = prior as WorkPayrollGroupSourceState;
      const states = r.array(r.field(group, "componentStates"), s.zero, s.one),
        matches = states.filter(
          (item) =>
            r.field(r.field(item, "result"), "commitmentId") === commitmentId,
        );
      if (matches.length !== s.one)
        throw new Error(
          "Payroll group predecessor lost its exact actual component.",
        );
      const component = matches[s.zero]!,
        actual = r.field(component, "result");
      r.payload(r.field(group, "result"), s.zero, s.one);
      r.payload(component, s.zero, s.one);
      const matchingViews = r
        .array(r.field(r.field(group, "result"), "components"), s.zero, s.one)
        .filter((item) => r.field(item, "commitmentId") === commitmentId);
      if (
        r.field(group, "id") !== priorReceiptId ||
        r.field(r.field(group, "result"), "id") !== priorReceiptId ||
        r.field(r.field(group, "result"), "group") !== true ||
        r.field(actual, "id") !== priorReceiptId ||
        r.field(actual, "groupReceiptId") !== priorReceiptId ||
        r.field(actual, "jobId") !== basis.jobId ||
        actual !== latest ||
        matchingViews.length !== s.one ||
        matchingViews[s.zero] !== actual
      )
        throw new Error(
          "Payroll latest job differs from its actual completed group component.",
        );
      after = r.field(component, "ledgerAfter");
    } else {
      const single = prior as SingleWorkPayrollCashSourceState;
      if (r.field(single, "result") !== latest)
        throw new Error(
          "Payroll ledger lost its genuine previous completed payroll source.",
        );
      after = r.field(single, "ledgerAfter");
    }
    r.payload(after, s.zero, s.one);
    for (const key of [
      "calendarId",
      "commitmentId",
      "jobId",
      "personId",
      "organizationId",
      "dueRecognizedMinor",
      "paidMinor",
      "arrearsMinor",
      "lastSettledPeriodIndex",
      "lastSettledAt",
      "lastPayrollReceiptId",
    ] as const)
      if (r.field(after, key) !== r.field(ledger, key))
        throw new Error(
          "Payroll current ledger differs from its actual prior cash result.",
        );
  }
  if (bookkeeping() && r.field(ledger, "arrearsMinor") > s.zero) {
    const priorAt = r.field(ledger, "lastSettledAt"),
      retry = priorAt
        ? nextWorkPayrollPeriod(
            r,
            calendar,
            addDays(makeIsoDate(priorAt), s.one),
            s.date,
            u,
          )
        : undefined,
      retryMembers = r.mapGet(r.field(work, "payrollArrearsByDue"), s.date);
    if (
      !retry ||
      retry.dueAt !== s.date ||
      !retryMembers ||
      !r.member(retryMembers, commitmentId)
    )
      throw new Error(
        "Payroll arrears are not owned by this exact recorded retry payday.",
      );
  }
  const receiptId =
      r.field(cfg, "payrollReceiptIdPrefix") +
      s.date +
      ":" +
      commitmentId +
      ":" +
      due.index,
    request = prepareWorkPayrollRequest(
      r,
      calendar,
      basis,
      ledger,
      period,
      s.date,
      receiptId,
      u,
    );
  const members = r.mapGet(
    r.field(work, "commitmentsByPerson"),
    basis.personId,
  );
  if (bookkeeping() && (!members || !r.member(members, commitmentId)))
    throw new Error("Payroll actual retained person membership is absent.");
  return {
    work,
    cfg,
    commitment: owner.commitment,
    calendar,
    basis,
    ledger,
    period,
    periodIndex,
    request,
  };
}

function references(
  s: FinancePlanningSession,
  c: Context,
  publicPayDue: PublicWorkPayDue | undefined,
): readonly Related[] {
  const r = s.reads,
    kinds = r.field(c.cfg, "journalSourceKinds"),
    rows: Related[] = [
      {
        kind: r.field(kinds, "commitment"),
        id: c.basis.commitmentId,
        date: [
          r.field(c.commitment, "startsAt"),
          r.field(c.basis.paySource, "asOf"),
        ]
          .sort()
          .at(-s.one)!,
        source: c.basis.paySource,
      },
      {
        kind: r.field(kinds, "payrollCalendar"),
        id: c.basis.calendarId,
        date: r.field(r.field(c.calendar, "source"), "asOf"),
        source: r.field(c.calendar, "source"),
      },
    ];
  if (c.period)
    rows.push({
      kind: r.field(kinds, "earnedPayPeriod"),
      id: r.field(c.period, "id"),
      date: r.field(c.period, "lastEarnedAt"),
      source: r.field(c.period, "source"),
    });
  if (publicPayDue) {
    const employer = r.mapGet(
        r.field(s.core, "organizations"),
        c.basis.organizationId,
      )!,
      authority = r.field(employer, "publicPayAuthority")!;
    rows.push(
      {
        kind: r.field(kinds, "publicPayAuthority"),
        id: r.field(authority, "id"),
        date: r.field(r.field(authority, "source"), "asOf"),
        source: r.field(authority, "source"),
      },
      {
        kind: publicPayDue.kind,
        id: publicPayDue.id,
        date: publicPayDue.date,
        source: publicPayDue.source,
      },
    );
  }
  for (const row of rows) {
    identity(row.kind);
    identity(row.id);
    source(s, row.source, row.date);
  }
  return copy(r, rows, s.zero, s.one);
}

function prepare(s: FinancePlanningSession, c: Context) {
  const r = s.reads,
    publicPayDue = resolvePublicWorkPayDue(s, c.request, "recorded-payroll");
  preparePublicWorkPay(s, publicPayDue);
  const projection = prepareWorkFinancePlan(
      s,
      c.basis.organizationId,
      c.basis.personId,
      c.request.requestedMinor,
      c.request.id,
      c.request.newlyDueMinor,
    ),
    settled = prepareWorkPayrollSettlement(
      r,
      c.calendar,
      c.basis,
      c.ledger,
      c.period,
      c.request,
      projection.expectedPaidMinor,
      units(s),
    ),
    employer = r.mapGet(
      r.field(s.core, "organizations"),
      c.basis.organizationId,
    )!;
  const result: WorkPayrollCashReceipt = {
    ...settled.receipt,
    calendarSource: copy(r, r.field(c.calendar, "source"), s.zero, s.one),
    ...(c.period
      ? {
          earnedPeriodSource: copy(
            r,
            r.field(c.period, "source"),
            s.zero,
            s.one,
          ),
        }
      : {}),
    ...(r.field(c.ledger, "lastPayrollReceiptId") !== undefined
      ? { priorPayrollReceiptId: r.field(c.ledger, "lastPayrollReceiptId") }
      : {}),
    payerCashBeforeMinor: projection.payerCashBeforeMinor,
    payerCashAfterMinor: projection.payerCashAfterMinor,
    payeeCashBeforeMinor: projection.payeeCashBeforeMinor,
    payeeCashAfterMinor: projection.payeeCashAfterMinor,
    employerOpeningFundsSource: copy(
      r,
      source(s, r.field(employer, "source"), s.date),
      s.zero,
      s.one,
    ),
    ...(publicPayDue ? { publicPayDue } : {}),
    source: {
      ...copy(r, settled.receipt.source, s.zero, s.one),
      citation:
        r.field(settled.receipt.source, "citation") +
        " " +
        r.field(c.cfg, "payrollReceiptCitation"),
    },
  };
  guardWorkFinanceResult(s, result, projection);
  return {
    result,
    ledger: settled.ledger,
    projection,
    related: references(s, c, publicPayDue),
  };
}

function stage<T extends WorkPayrollJobReceipt>(
  s: FinancePlanningSession,
  c: Context,
  result: T,
  ledger: WorkPayrollLedger,
  retainDetailed = true,
): T {
  const r = s.reads,
    m = s.metadata,
    work = c.work,
    totalsMap = r.field(work, "totalsByJob"),
    totals = r.mapGet(totalsMap, c.basis.jobId);
  if (
    !totals ||
    r.field(totals, "requestedMinor") !== r.field(c.ledger, "earnedMinor") ||
    r.field(totals, "paidMinor") !== r.field(c.ledger, "paidMinor")
  )
    throw new Error(
      "Payroll cash disagrees with the actual cumulative earned/paid work totals.",
    );
  m.mapSet(totalsMap, c.basis.jobId, {
    ...copy(r, totals, s.zero, s.one),
    paidMinor: plus(r.field(totals, "paidMinor"), result.paidMinor, s.zero),
    earnedMinor: ledger.earnedMinor,
    accruedMinor: ledger.accruedMinor,
    dueRecognizedMinor: ledger.dueRecognizedMinor,
    arrearsMinor: ledger.arrearsMinor,
  });
  m.mapSet(
    r.field(work, "payrollLedgerByCommitment"),
    c.basis.commitmentId,
    ledger,
  );
  if (c.period) {
    m.mapDelete(r.field(work, "earnedPayPeriods"), r.field(c.period, "id"));
    m.mapDelete(c.periodIndex!, r.field(c.period, "index"));
    m.indexRemove(
      r.field(work, "payrollPeriodsByDue"),
      s.date,
      r.field(c.period, "id"),
    );
  }
  m.indexRemove(
    r.field(work, "payrollArrearsByDue"),
    s.date,
    c.basis.commitmentId,
  );
  if (ledger.arrearsMinor > s.zero) {
    const next = nextWorkPayrollPeriod(
      r,
      c.calendar,
      addDays(makeIsoDate(s.date), s.one),
      s.date,
      units(s),
    );
    m.indexAdd(
      r.field(work, "payrollArrearsByDue"),
      next.dueAt,
      c.basis.commitmentId,
    );
  }
  const stored = m.mapSet(
      r.field(work, "latestPayrollByJob"),
      c.basis.jobId,
      result,
    ),
    detailed =
      r.field(s.core, "observer") ||
      r.field(s.core, "playerId") === c.basis.personId ||
      r.member(r.field(s.core, "focusPersonIds"), c.basis.personId) ||
      payrollControl(s).personId === c.basis.personId;
  if (detailed && retainDetailed)
    m.mapSet(
      r.field(work, "detailedPayroll"),
      result.id,
      stored as WorkPayrollCashReceipt,
    );
  return stored as T;
}

type GroupData = PayrollData & {
  payrollGroupReceiptIdPrefix: string;
  payrollGroupReceiptCitation: string;
  payrollGroupAttributionRule: WorkPayrollAttributionRule;
  payrollGroupAttributionCitation: string;
  publicPayrollGroupDueIdPrefix: string;
  publicPayrollGroupDueCitation: string;
  journalSourceKinds: PayrollData["journalSourceKinds"] & {
    publicPayrollGroupDue: string;
  };
};
function groupConfiguration(s: FinancePlanningSession): GroupData {
  const r = s.reads,
    cfg = configuration(s) as GroupData;
  for (const key of [
    "payrollGroupReceiptIdPrefix",
    "payrollGroupReceiptCitation",
    "payrollGroupAttributionCitation",
    "publicPayrollGroupDueIdPrefix",
    "publicPayrollGroupDueCitation",
  ] as const)
    identity(r.field(cfg, key));
  identity(
    r.field(r.field(cfg, "journalSourceKinds"), "publicPayrollGroupDue"),
  );
  if (
    r.field(cfg, "payrollGroupAttributionRule") !==
    "arrears-then-newly-due-commitment-id"
  )
    throw new Error(
      "Payroll group lacks its declared same-payee accounting attribution rule.",
    );
  return cfg;
}
/** Only this actual worker's retained index is traversed. No future payroll or world scan. */
function groupContexts(
  s: FinancePlanningSession,
  anchor: Context,
): readonly Context[] {
  const r = s.reads,
    work = anchor.work,
    members = r.mapGet(
      r.field(work, "commitmentsByPerson"),
      anchor.basis.personId,
    );
  if (!members || !r.member(members, anchor.basis.commitmentId))
    throw new Error("Payroll group lost its actual worker membership.");
  const contexts: Context[] = [anchor];
  for (const id of r.members(members)) {
    if (id === anchor.basis.commitmentId) continue;
    const row = r.mapGet(r.field(work, "commitments"), id);
    if (!row || r.field(row, "personId") !== anchor.basis.personId)
      throw new Error("Payroll retained worker index is inconsistent.");
    const recordedCalendar = r.field(row, "payrollCalendarId"),
      indexedCalendar = r.mapGet(
        r.field(work, "payrollCalendarByCommitment"),
        id,
      ),
      jobId = r.field(row, "jobId");
    if (
      indexedCalendar !== recordedCalendar ||
      r.mapGet(r.field(work, "payrollCalendarByJob"), jobId) !==
        recordedCalendar
    )
      throw new Error(
        "Payroll retained member changed its actual admitted calendar binding.",
      );
    if (recordedCalendar !== undefined) {
      const actualCalendar = r.mapGet(
        r.field(work, "payrollCalendars"),
        recordedCalendar,
      );
      if (
        !actualCalendar ||
        !admittedWorkPayrollCalendarMatches(
          s.core,
          recordedCalendar,
          actualCalendar,
        ) ||
        r.field(actualCalendar, "organizationId") !==
          r.field(row, "organizationId")
      )
        throw new Error(
          "Payroll retained member changed its actual admitted employer/calendar owner.",
        );
    }
    if (
      r.field(row, "organizationId") !== anchor.basis.organizationId ||
      recordedCalendar !== anchor.basis.calendarId
    )
      continue;
    const ledger = r.mapGet(r.field(work, "payrollLedgerByCommitment"), id),
      index = r.mapGet(r.field(work, "earnedPayPeriodByCommitmentIndex"), id),
      periodId = index ? r.mapGet(index, anchor.request.index) : undefined;
    const expectedPeriodId = workEarnedPayPeriodId(
        anchor.basis.calendarId,
        id,
        anchor.request.index,
      ),
      originalPeriod = r.mapGet(
        r.field(work, "earnedPayPeriods"),
        expectedPeriodId,
      ),
      duePeriods = r.mapGet(r.field(work, "payrollPeriodsByDue"), s.date);
    if (
      (originalPeriod ||
        (duePeriods && r.member(duePeriods, expectedPeriodId))) &&
      periodId !== expectedPeriodId
    )
      throw new Error(
        "Payroll retained member lost its actual current due period index.",
      );
    // Reconcile bounded retained witnesses before excluding a member. Losing an
    // index must never permit another job's payment to commit first.
    const attendance = r.mapGet(r.field(work, "lastAttendanceByJob"), jobId),
      totals = r.mapGet(r.field(work, "totalsByJob"), jobId),
      retryMembers = r.mapGet(r.field(work, "payrollArrearsByDue"), s.date),
      retryDue = retryMembers ? r.member(retryMembers, id) : false;
    if (!ledger) {
      if (index) r.payload(index, s.zero, s.one);
      if (
        attendance ||
        totals ||
        (index && [...Map.prototype.entries.call(index)].length > s.zero) ||
        retryDue
      )
        throw new Error(
          "Payroll retained member lost its actual earned ledger.",
        );
      continue;
    }
    if (
      !totals ||
      r.field(totals, "requestedMinor") !== r.field(ledger, "earnedMinor") ||
      r.field(totals, "paidMinor") !== r.field(ledger, "paidMinor")
    )
      throw new Error(
        "Payroll retained member lost its actual earned work totals.",
      );
    let openEarned = BigInt(s.zero);
    if (index) r.payload(index, s.zero, s.one);
    if (index)
      for (const [periodIndex, ownedId] of Map.prototype.entries.call(
        index,
      ) as IterableIterator<[number, string]>) {
        const owned = r.mapGet(r.field(work, "earnedPayPeriods"), ownedId);
        if (
          !owned ||
          r.field(owned, "id") !== ownedId ||
          r.field(owned, "commitmentId") !== id ||
          r.field(owned, "calendarId") !== recordedCalendar ||
          r.field(owned, "index") !== periodIndex
        )
          throw new Error(
            "Payroll retained member lost its actual earned period index.",
          );
        openEarned += BigInt(minor(r.field(owned, "earnedMinor"), s.zero));
      }
    if (openEarned !== BigInt(minor(r.field(ledger, "accruedMinor"), s.zero)))
      throw new Error(
        "Payroll retained member lost its actual accrued period index.",
      );
    if (attendance) {
      const ownedId = r.field(attendance, "earnedPayPeriodId"),
        owned = r.mapGet(r.field(work, "earnedPayPeriods"), ownedId);
      const attendedPeriod = workPayPeriodOnDate(
          r,
          anchor.calendar,
          r.field(attendance, "date"),
          units(s),
        ),
        recognizedThrough = r.field(ledger, "lastSettledPeriodIndex");
      if (
        recognizedThrough === undefined ||
        recognizedThrough < attendedPeriod.index
      ) {
        const attendedId = workEarnedPayPeriodId(
            anchor.basis.calendarId,
            id,
            attendedPeriod.index,
          ),
          attendedDue = r.mapGet(
            r.field(work, "payrollPeriodsByDue"),
            attendedPeriod.dueAt,
          );
        if (
          !owned ||
          ownedId !== attendedId ||
          r.field(owned, "index") !== attendedPeriod.index ||
          r.field(owned, "dueAt") !== attendedPeriod.dueAt ||
          !attendedDue ||
          !r.member(attendedDue, attendedId)
        )
          throw new Error(
            "Payroll retained member lost its actual unrecognized attendance period.",
          );
      }
      if (
        owned &&
        (!index || r.mapGet(index, r.field(owned, "index")) !== ownedId)
      )
        throw new Error(
          "Payroll retained member lost its actual attendance period index.",
        );
    }
    if (retryDue && minor(r.field(ledger, "arrearsMinor"), s.zero) === s.zero)
      throw new Error(
        "Payroll retained member has an unowned arrears due entry.",
      );
    // A genuine zero-earned period still needs exactly-once recognition/removal.
    if (
      periodId !== undefined ||
      minor(r.field(ledger, "arrearsMinor"), s.zero) > s.zero
    ) {
      const current = currentContext(s, id);
      if (current.calendar !== anchor.calendar)
        throw new Error(
          "Payroll group replaced its actual admitted calendar identity.",
        );
      contexts.push(current);
    }
  }
  return contexts.sort((a, b) =>
    a.basis.commitmentId < b.basis.commitmentId
      ? -s.one
      : a.basis.commitmentId > b.basis.commitmentId
        ? s.one
        : s.zero,
  );
}
function groupReceiptId(
  s: FinancePlanningSession,
  contexts: readonly Context[],
): string {
  const cfg = groupConfiguration(s),
    first = contexts[s.zero]!;
  return (
    s.reads.field(cfg, "payrollGroupReceiptIdPrefix") +
    first.request.date +
    ":" +
    [first.basis.organizationId, first.basis.personId, first.basis.calendarId]
      .map((id) => encodeURIComponent(id))
      .join(":") +
    ":" +
    first.request.index
  );
}
/** Historical verification resolves actual current authority, then checks its full evidence at the original due date. */
function componentPublicDue(
  s: FinancePlanningSession,
  c: Context,
): PublicWorkPayDue | undefined {
  const r = s.reads,
    at = c.request.date,
    resolved = resolvePublicWorkPayDue(
      s,
      { ...c.request, date: s.date },
      "recorded-payroll",
    );
  if (!resolved) return undefined;
  const employer = r.mapGet(
      r.field(s.core, "organizations"),
      c.basis.organizationId,
    )!,
    authority = r.field(employer, "publicPayAuthority")!,
    owner = r.mapGet(r.field(s.core, "organizations"), resolved.ownerId)!;
  source(s, r.field(owner, "outsideFlow")!, at);
  const authoritySource = copy(
    r,
    source(s, r.field(authority, "source"), at),
    s.zero,
    s.one,
  );
  return copy(
    r,
    {
      ...resolved,
      date: at,
      source: {
        ...authoritySource,
        asOf: at,
        citation:
          r.field(authoritySource, "citation") +
          " " +
          r.field(c.cfg, "publicPayrollPayDueCitation"),
      },
    },
    s.zero,
    s.one,
  );
}
function groupPublicDue(
  s: FinancePlanningSession,
  contexts: readonly Context[],
  dues: readonly (PublicWorkPayDue | undefined)[],
): PublicWorkPayrollGroupDue | undefined {
  const r = s.reads,
    cfg = groupConfiguration(s),
    qualified = dues.filter(
      (due): due is PublicWorkPayDue => due !== undefined,
    );
  if (qualified.length === s.zero) return undefined;
  if (qualified.length !== contexts.length)
    throw new Error(
      "Payroll public group lacks actual authority for every component.",
    );
  const first = qualified[s.zero]!,
    anchor = contexts[s.zero]!;
  let amountMinor = s.zero;
  for (let index = s.zero; index < qualified.length; index += s.one) {
    const due = qualified[index]!,
      c = contexts[index]!;
    for (const key of [
      "authorityId",
      "ownerId",
      "organizationId",
      "personId",
      "date",
    ] as const)
      if (r.field(due, key) !== r.field(first, key))
        throw new Error(
          "Payroll public group has different actual owner authorization.",
        );
    if (
      due.commitmentId !== c.basis.commitmentId ||
      due.jobId !== c.basis.jobId ||
      due.amountMinor !== c.request.requestedMinor ||
      !same(r, due.source, first.source)
    )
      throw new Error(
        "Payroll public group lost a full independently qualified component.",
      );
    amountMinor = plus(amountMinor, due.amountMinor, s.zero);
  }
  return copy(
    r,
    {
      kind: r.field(
        r.field(cfg, "journalSourceKinds"),
        "publicPayrollGroupDue",
      ),
      id:
        r.field(cfg, "publicPayrollGroupDueIdPrefix") +
        groupReceiptId(s, contexts),
      date: anchor.request.date,
      authorityId: first.authorityId,
      ownerId: first.ownerId,
      organizationId: first.organizationId,
      personId: first.personId,
      calendarId: anchor.basis.calendarId,
      amountMinor,
      components: qualified,
      source: {
        ...first.source,
        citation:
          first.source.citation +
          " " +
          r.field(cfg, "publicPayrollGroupDueCitation"),
      },
    },
    s.zero,
    s.one,
  );
}
function groupReferences(
  s: FinancePlanningSession,
  contexts: readonly Context[],
  dues: readonly (PublicWorkPayDue | undefined)[],
  due: PublicWorkPayrollGroupDue | undefined,
): readonly Related[] {
  const r = s.reads,
    rows: Related[] = [],
    seen = new Map<string, Related>();
  const add = (row: Related) => {
    const key = JSON.stringify([row.kind, row.id]),
      prior = seen.get(key);
    if (prior) {
      if (!same(r, prior, row))
        throw new Error(
          "Payroll group has conflicting duplicate full related evidence.",
        );
      return;
    }
    seen.set(key, row);
    rows.push(row);
  };
  for (let index = s.zero; index < contexts.length; index += s.one)
    for (const row of references(s, contexts[index]!, dues[index])) add(row);
  if (due)
    add({ kind: due.kind, id: due.id, date: due.date, source: due.source });
  return copy(r, rows, s.zero, s.one);
}
function composeGroup(
  s: FinancePlanningSession,
  contexts: readonly Context[],
  projection: PreparedWorkFinance,
  dues: readonly (PublicWorkPayDue | undefined)[],
  publicPayDue: PublicWorkPayrollGroupDue | undefined,
) {
  const r = s.reads,
    cfg = groupConfiguration(s),
    first = contexts[s.zero]!,
    id = groupReceiptId(s, contexts),
    allocation = allocateWorkPayrollGroup(
      r,
      contexts.map((c) => c.request),
      projection.expectedPaidMinor,
      r.field(cfg, "payrollGroupAttributionRule"),
      s.zero,
      s.one,
    ),
    states: WorkPayrollGroupComponentState[] = [];
  for (let index = s.zero; index < contexts.length; index += s.one) {
    const c = contexts[index]!,
      part = allocation.allocations[index]!;
    if (part.commitmentId !== c.basis.commitmentId)
      throw new Error(
        "Payroll accounting attribution differs from actual sorted component ownership.",
      );
    const request = prepareWorkPayrollRequest(
        r,
        c.calendar,
        c.basis,
        c.ledger,
        c.period,
        c.request.date,
        id,
        units(s),
      ),
      settled = prepareWorkPayrollSettlement(
        r,
        c.calendar,
        c.basis,
        c.ledger,
        c.period,
        request,
        part.paidMinor,
        units(s),
      );
    if (
      settled.receipt.paidArrearsMinor !== part.paidArrearsMinor ||
      settled.receipt.paidNewlyDueMinor !== part.paidNewlyDueMinor
    )
      throw new Error(
        "Payroll component did not conserve aggregate old/new cash attribution.",
      );
    const result: WorkPayrollGroupComponentReceipt = {
      ...settled.receipt,
      groupReceiptId: id,
      claimId: c.request.id,
      calendarSource: copy(r, r.field(c.calendar, "source"), s.zero, s.one),
      ...(c.period
        ? {
            earnedPeriodSource: copy(
              r,
              r.field(c.period, "source"),
              s.zero,
              s.one,
            ),
          }
        : {}),
      ...(r.field(c.ledger, "lastPayrollReceiptId") !== undefined
        ? { priorPayrollReceiptId: r.field(c.ledger, "lastPayrollReceiptId") }
        : {}),
      ...(dues[index] ? { publicPayDue: dues[index] } : {}),
      source: {
        ...copy(r, settled.receipt.source, s.zero, s.one),
        citation:
          r.field(settled.receipt.source, "citation") +
          " " +
          r.field(cfg, "payrollReceiptCitation"),
      },
    };
    states.push({
      result: copy(r, result, s.zero, s.one),
      ledgerBefore: copy(r, c.ledger, s.zero, s.one),
      ledgerAfter: copy(r, settled.ledger, s.zero, s.one),
      ...(c.period ? { earnedPeriod: copy(r, c.period, s.zero, s.one) } : {}),
    });
  }
  const paidArrearsMinor = Math.min(
      allocation.arrearsBeforeMinor,
      projection.expectedPaidMinor,
    ),
    paidNewlyDueMinor = projection.expectedPaidMinor - paidArrearsMinor,
    employer = r.mapGet(
      r.field(s.core, "organizations"),
      first.basis.organizationId,
    )!,
    result: WorkPayrollGroupReceipt = {
      group: true,
      id,
      date: first.request.date,
      calendarId: first.basis.calendarId,
      personId: first.basis.personId,
      organizationId: first.basis.organizationId,
      index: first.request.index,
      fromAt: first.request.fromAt,
      throughAt: first.request.throughAt,
      dueAt: first.request.dueAt,
      requestedMinor: allocation.requestedMinor,
      newlyDueMinor: allocation.newlyDueMinor,
      arrearsBeforeMinor: allocation.arrearsBeforeMinor,
      paidMinor: projection.expectedPaidMinor,
      shortfallMinor: allocation.requestedMinor - projection.expectedPaidMinor,
      paidArrearsMinor,
      paidNewlyDueMinor,
      missedNewlyDueMinor: allocation.newlyDueMinor - paidNewlyDueMinor,
      arrearsAfterMinor:
        allocation.requestedMinor - projection.expectedPaidMinor,
      payerCashBeforeMinor: projection.payerCashBeforeMinor,
      payerCashAfterMinor: projection.payerCashAfterMinor,
      payeeCashBeforeMinor: projection.payeeCashBeforeMinor,
      payeeCashAfterMinor: projection.payeeCashAfterMinor,
      components: states.map((item) => item.result),
      accountingAttributionRule: r.field(cfg, "payrollGroupAttributionRule"),
      attributionSource: {
        tag: "ESTIMATED",
        asOf: first.request.date,
        citation: r.field(cfg, "payrollGroupAttributionCitation"),
        estimatedFrom: r.field(cfg, "payrollGroupAttributionCitation"),
      },
      calendarSource: copy(r, r.field(first.calendar, "source"), s.zero, s.one),
      employerOpeningFundsSource: copy(
        r,
        source(s, r.field(employer, "source"), first.request.date),
        s.zero,
        s.one,
      ),
      ...(publicPayDue ? { publicPayDue } : {}),
      source: {
        tag: "SOURCED",
        asOf: first.request.date,
        citation: r.field(cfg, "payrollGroupReceiptCitation"),
      },
    };
  if (
    result.id !== projection.receiptId ||
    result.organizationId !== projection.organizationId ||
    result.personId !== projection.personId ||
    result.requestedMinor !== projection.requestedMinor
  )
    throw new Error(
      "Payroll group differs from its original single cash projection.",
    );
  return {
    result,
    states,
    projection,
    related: groupReferences(s, contexts, dues, publicPayDue),
  };
}
function prepareGroup(s: FinancePlanningSession, contexts: readonly Context[]) {
  const r = s.reads,
    cfg = groupConfiguration(s),
    amounts = allocateWorkPayrollGroup(
      r,
      contexts.map((c) => c.request),
      s.zero,
      r.field(cfg, "payrollGroupAttributionRule"),
      s.zero,
      s.one,
    ),
    dues = contexts.map((c) => componentPublicDue(s, c)),
    due = groupPublicDue(s, contexts, dues),
    first = contexts[s.zero]!;
  if (due) {
    s.cash.authorizeOutside(due.ownerId, { kind: due.kind, id: due.id });
    if (
      due.ownerId !== due.organizationId &&
      due.amountMinor > s.zero &&
      s.cash.move(
        due.ownerId,
        due.organizationId,
        due.amountMinor,
        due.id + ":fund-recorded-wage",
      ) !== due.amountMinor
    )
      throw new Error(
        "Payroll aggregate public funding differs from independently qualified earned requests.",
      );
  }
  const projection = prepareWorkFinancePlan(
      s,
      first.basis.organizationId,
      first.basis.personId,
      amounts.requestedMinor,
      groupReceiptId(s, contexts),
      amounts.newlyDueMinor,
    ),
    actual = composeGroup(s, contexts, projection, dues, due);
  guardWorkFinanceResult(s, actual.result, projection);
  return actual;
}
function stageGroup(
  s: FinancePlanningSession,
  contexts: readonly Context[],
  actual: ReturnType<typeof prepareGroup>,
) {
  const r = s.reads,
    states = actual.states.map((item, index) => {
      const stored = stage(
        s,
        contexts[index]!,
        item.result,
        item.ledgerAfter,
        false,
      );
      // Retain these exact detached component identities in all three canonical views.
      return Object.freeze({ ...item, result: stored });
    }),
    components = Object.freeze(states.map((item) => item.result)),
    base = copy(r, { ...actual.result, components: [] }, s.zero, s.one);
  let result: WorkPayrollGroupReceipt = Object.freeze({ ...base, components });
  const first = contexts[s.zero]!,
    detailed =
      r.field(s.core, "observer") ||
      r.field(s.core, "playerId") === first.basis.personId ||
      r.member(r.field(s.core, "focusPersonIds"), first.basis.personId) ||
      payrollControl(s).personId === first.basis.personId;
  if (detailed)
    result = s.metadata.mapSet(
      r.field(first.work, "detailedPayroll"),
      result.id,
      result,
    );
  return { result, states: Object.freeze(states) };
}
/** Rebuilds each component independently on each genuine lookup; does not create a historical cash plan. */
function validateGroupSource(
  s: FinancePlanningSession,
  row: WorkPayrollGroupSourceState,
  bundle: PreparedFinancePlan<WorkPayrollJournalReceipt> | undefined,
): readonly Related[] {
  const r = s.reads,
    result = r.field(row, "result"),
    states = r.array(r.field(row, "componentStates"), s.zero, s.one),
    date = r.field(row, "date");
  r.payload(states, s.zero, s.one);
  if (r.field(result, "group") !== true || states.length <= s.one)
    throw new Error("Payroll group lost its typed genuine components.");
  let actual: ReturnType<typeof prepareGroup>;
  if (bundle) {
    const anchor = currentContext(
        s,
        r.field(r.field(states[s.zero]!, "result"), "commitmentId"),
      ),
      contexts = groupContexts(s, anchor);
    actual = prepareGroup(s, contexts);
    if (
      !same(r, actual.states, states) ||
      r.field(row, "postings") !== bundle.postings ||
      !same(r, result, bundle.result)
    )
      throw new Error(
        "Payroll group changed a genuine current component or original plan.",
      );
  } else {
    const contexts: Context[] = states.map((item) => {
      const original = r.field(item, "result"),
        id = r.field(original, "commitmentId"),
        owner = owningBasis(s, id, date, false),
        period = r.field(item, "earnedPeriod"),
        ledger = r.field(item, "ledgerBefore");
      validateEarnedBounds(s, period, owner);
      const requestId =
          r.field(configuration(s), "payrollReceiptIdPrefix") +
          date +
          ":" +
          id +
          ":" +
          r.field(result, "index"),
        request = prepareWorkPayrollRequest(
          r,
          owner.calendar,
          owner.basis,
          ledger,
          period,
          date,
          requestId,
          units(s),
        );
      return {
        work: owner.work,
        cfg: configuration(s),
        commitment: owner.commitment,
        calendar: owner.calendar,
        basis: owner.basis,
        ledger,
        period,
        request,
      };
    });
    const dues = contexts.map((c) => componentPublicDue(s, c)),
      due = groupPublicDue(s, contexts, dues);
    actual = composeGroup(s, contexts, r.field(row, "projection"), dues, due);
    if (!same(r, actual.states, states))
      throw new Error(
        "Completed payroll group lost its original full component requests/ledgers/evidence.",
      );
  }
  if (
    !same(r, actual.result, result) ||
    !same(r, actual.projection, r.field(row, "projection")) ||
    !same(r, actual.related, r.field(row, "references"))
  )
    throw new Error(
      "Payroll group differs from its genuine original conserving projection or references.",
    );
  return actual.related;
}
/** Called only after currentContext/groupContexts validated every actual component. */
function settleWorkPayrollGroupJournal(
  core: CoreState,
  api: CoreAPI,
  s: FinancePlanningSession,
  contexts: readonly Context[],
): WorkPayrollGroupReceipt {
  const actual = prepareGroup(s, contexts),
    stored = stageGroup(s, contexts, actual),
    r = s.reads,
    first = contexts[s.zero]!,
    row: WorkPayrollGroupSourceState = {
      group: true,
      id: stored.result.id,
      kind: r.field(r.field(first.cfg, "journalSourceKinds"), "payroll"),
      date: s.date,
      result: stored.result,
      componentStates: stored.states,
      credits: actual.projection.credits,
      postings: [],
      projection: actual.projection,
      references: actual.related,
    },
    table = r.field(first.work, "payrollCashSources");
  if (r.field(api, "state") !== core)
    throw new Error("Payroll group writer host changed during preparation.");
  const post = r.field(api, "postJournal"),
    complete = r.field(api, "completeJournalSource");
  if (typeof post !== "function" || typeof complete !== "function")
    throw new Error("Payroll actual journal writer is absent.");
  if (Map.prototype.has.call(table, row.id))
    throw new Error("Duplicate actual payroll group source.");
  nativeSet.call(table, row.id, row);
  try {
    if (r.mapGet(table, row.id) !== row)
      throw new Error(
        "Payroll group preparation marker lost its actual owning table.",
      );
    for (const key of [
      "group",
      "id",
      "kind",
      "date",
      "result",
      "componentStates",
      "credits",
      "projection",
      "references",
    ] as const)
      r.field(row, key);
    for (const value of [
      row.result,
      row.componentStates,
      row.credits,
      row.projection,
      row.references,
    ])
      r.payload(value, s.zero, s.one);
    admitCompositeFinanceCreditSources(core, s, row.credits, {
      kind: row.kind,
      id: row.id,
    });
    const plan = s.seal(stored.result),
      caller = plan.result,
      controlSnapshot = payrollControl(s);
    row.postings = plan.postings;
    controlSet.call(pendingControl, row, controlSnapshot);
    if (controlSnapshot.personId === row.result.personId)
      retainedAdd.call(retainedControlledSources, row);
    pending.set(row, plan);
    if (plan.postings.length > s.zero)
      post.call(api, {
        id: `journal:${s.date}:${core.cashJournal.nextSequence}`,
        date: s.date,
        expectedSequence: core.cashJournal.nextSequence,
        sourceRef: { kind: row.kind, id: row.id },
        postings: plan.postings,
      });
    else complete.call(api, { kind: row.kind, id: row.id });
    pending.delete(row);
    finishCompositeFinanceCreditSources(core, api, row.credits);
    return caller;
  } catch (error) {
    pending.delete(row);
    cancelCompositeFinanceCreditSources(core, row.credits);
    if (
      row.postedJournalSequence === undefined &&
      row.completedAt === undefined &&
      Map.prototype.get.call(table, row.id) === row
    )
      nativeDelete.call(table, row.id);
    throw error;
  }
}

/** Both genuine provider lookups validate actual owners/records, then ORIGINAL preflight LAST. */
export function workPayrollCashSourceProvider(
  api: CoreAPI,
  reference: Readonly<CashJournalSourceRef>,
): CashJournalSourceSlot | undefined {
  // Play reads the staged row and hands back its own references. Bookkeeping
  // (tests, the bench) re-derives the settlement from the current records and
  // compares it with the row before the journal trusts it.
  const apiReads = new FinanceReadGuard(),
    core = apiReads.field(api, "state") as CoreState,
    s = bookkeeping()
      ? new FinancePlanningSession(
          core,
          core.cashJournal,
          cashJournalParameters(core),
        )
      : undefined,
    r = s ? s.reads : apiReads,
    work = r.field(core, "work") as Runtime,
    row = r.mapGet(r.field(work, "payrollCashSources"), reference.id);
  if (
    !row ||
    r.field(row, "id") !== reference.id ||
    r.field(row, "kind") !== reference.kind
  )
    return undefined;
  const installation = installed.get(core),
    cfg = s
      ? configuration(s)
      : (r.field(r.field(core, "data"), "work") as PayrollData);
  if (
    r.field(api, "state") !== core ||
    r.field(r.field(cfg, "journalSourceKinds"), "payroll") !== reference.kind ||
    !installation ||
    installation.kind !== reference.kind ||
    r.mapGet(r.field(core, "modules"), installation.id) !==
      installation.module ||
    r.mapGet(
      r.field(r.field(core, "cashJournal"), "sourceProviders"),
      installation.kind,
    ) !== installation.provider
  )
    throw new Error(
      "Payroll provider no longer has its actual owning registration.",
    );
  const bundle = pending.get(row),
    controlSnapshot = controlGet.call(pendingControl, row) as
      ControlSnapshot | undefined,
    result = r.field(row, "result"),
    date = r.field(row, "date");
  let actualRelated: readonly Related[];
  if (!s) actualRelated = r.field(row, "references") as readonly Related[];
  else {
    r.payload(result, s.zero, s.one);
    r.payload(r.field(row, "credits"), s.zero, s.one);
    r.payload(r.field(row, "projection"), s.zero, s.one);
    r.payload(r.field(row, "references"), s.zero, s.one);
    if (
      r.field(result, "id") !== reference.id ||
      r.field(result, "date") !== date
    )
      throw new Error(
        "Payroll canonical source lost its actual receipt identity.",
      );
    const completed =
      r.field(row, "postedJournalSequence") !== undefined ||
      r.field(row, "completedAt") !== undefined;
    if ((bundle && (date !== s.date || completed)) || (!bundle && !completed))
      throw new Error(
        "Payroll source is stale, unprepared or already completed.",
      );
    if (r.field(row, "group") === true) {
      actualRelated = validateGroupSource(
        s,
        row as WorkPayrollGroupSourceState,
        bundle,
      );
    } else {
      const single = row as SingleWorkPayrollCashSourceState,
        value = result as WorkPayrollCashReceipt;
      r.payload(r.field(single, "ledgerBefore"), s.zero, s.one);
      r.payload(r.field(single, "ledgerAfter"), s.zero, s.one);
      r.payload(r.field(single, "earnedPeriod"), s.zero, s.one);
      if (bundle) {
        const current = currentContext(s, r.field(value, "commitmentId"));
        if (groupContexts(s, current).length !== s.one)
          throw new Error(
            "Single payroll source now owns a different payable retained group.",
          );
        const actual = prepare(s, current);
        if (
          current.request.id !== r.field(single, "id") ||
          !same(r, actual.result, value) ||
          !same(r, actual.ledger, r.field(single, "ledgerAfter")) ||
          !same(r, current.ledger, r.field(single, "ledgerBefore")) ||
          !same(r, current.period, r.field(single, "earnedPeriod")) ||
          !same(r, actual.projection, r.field(single, "projection")) ||
          !same(r, actual.related, r.field(single, "references")) ||
          r.field(single, "postings") !== bundle.postings ||
          !same(r, value, bundle.result)
        )
          throw new Error(
            "Payroll source differs from its genuine current accrued request or cash projection.",
          );
        actualRelated = actual.related;
      } else {
        // Completed rows retain their actual original earned record, not invented current attendance.
        const owner = owningBasis(
            s,
            r.field(value, "commitmentId"),
            date,
            false,
          ),
          period = r.field(single, "earnedPeriod");
        validateEarnedBounds(s, period, owner);
        const request = prepareWorkPayrollRequest(
            r,
            owner.calendar,
            owner.basis,
            r.field(single, "ledgerBefore"),
            period,
            date,
            r.field(single, "id"),
            units(s),
          ),
          settled = prepareWorkPayrollSettlement(
            r,
            owner.calendar,
            owner.basis,
            r.field(single, "ledgerBefore"),
            period,
            request,
            r.field(value, "paidMinor"),
            units(s),
          );
        for (const key of [
          "calendarId",
          "commitmentId",
          "jobId",
          "personId",
          "organizationId",
          "index",
          "fromAt",
          "throughAt",
          "dueAt",
          "earnedPeriodId",
          "newlyDueMinor",
          "arrearsBeforeMinor",
          "requestedMinor",
          "paidMinor",
          "shortfallMinor",
          "paidArrearsMinor",
          "paidNewlyDueMinor",
          "missedNewlyDueMinor",
          "arrearsAfterMinor",
        ] as const)
          if (r.field(value, key) !== settled.receipt[key])
            throw new Error(
              "Completed payroll lost its original genuine request/settlement.",
            );
        if (
          !same(r, settled.ledger, r.field(single, "ledgerAfter")) ||
          !same(
            r,
            r.field(value, "calendarSource"),
            r.field(owner.calendar, "source"),
          ) ||
          !same(r, r.field(value, "jobSource"), owner.basis.jobSource) ||
          !same(r, r.field(value, "paySource"), owner.basis.paySource) ||
          !same(
            r,
            r.field(value, "scheduleSource"),
            owner.basis.scheduleSource,
          ) ||
          !same(
            r,
            r.field(value, "earnedPeriodSource"),
            period ? r.field(period, "source") : undefined,
          )
        )
          throw new Error(
            "Completed payroll lost its full original owning evidence.",
          );
        const projection = r.field(single, "projection");
        if (
          r.field(value, "id") !== r.field(projection, "receiptId") ||
          r.field(value, "organizationId") !==
            r.field(projection, "organizationId") ||
          r.field(value, "personId") !== r.field(projection, "personId") ||
          r.field(value, "requestedMinor") !==
            r.field(projection, "requestedMinor") ||
          r.field(value, "paidMinor") !==
            r.field(projection, "expectedPaidMinor") ||
          r.field(value, "shortfallMinor") !==
            r.field(projection, "requestedMinor") -
              r.field(projection, "expectedPaidMinor") ||
          r.field(value, "payerCashBeforeMinor") !==
            r.field(projection, "payerCashBeforeMinor") ||
          r.field(value, "payerCashAfterMinor") !==
            r.field(projection, "payerCashAfterMinor") ||
          r.field(value, "payeeCashBeforeMinor") !==
            r.field(projection, "payeeCashBeforeMinor") ||
          r.field(value, "payeeCashAfterMinor") !==
            r.field(projection, "payeeCashAfterMinor")
        )
          throw new Error(
            "Completed payroll financial evidence differs from its actual original projection.",
          );
        const expectedSource = {
          ...copy(r, settled.receipt.source, s.zero, s.one),
          citation:
            r.field(settled.receipt.source, "citation") +
            " " +
            r.field(cfg, "payrollReceiptCitation"),
        };
        if (!same(r, r.field(value, "source"), expectedSource))
          throw new Error(
            "Completed payroll lost its original full receipt Source.",
          );
        const context: Context = {
          work,
          cfg,
          commitment: owner.commitment,
          calendar: owner.calendar,
          basis: owner.basis,
          ledger: r.field(single, "ledgerBefore"),
          period,
          request,
        };
        if (
          !same(
            r,
            references(s, context, r.field(value, "publicPayDue")),
            r.field(single, "references"),
          )
        )
          throw new Error(
            "Completed payroll related records no longer match its actual owning evidence.",
          );
        actualRelated = r.field(single, "references");
      }
    }
    for (const item of actualRelated) source(s, item.source, item.date);
    source(s, r.field(result, "source"), date);
  }
  const credit = resolveCompositeFinanceCreditSources(
      core,
      r.field(row, "credits"),
      { kind: r.field(row, "kind"), id: r.field(row, "id") },
    ),
    related = [...actualRelated, ...credit.relatedRecords],
    slot: CashJournalSourceSlot = {
      resolved: {
        kind: r.field(row, "kind"),
        id: r.field(row, "id"),
        date,
        source: r.field(result, "source"),
        expectedPostings: r.field(row, "postings"),
        postedJournalSequence: r.field(row, "postedJournalSequence"),
        requiredRelatedRefs: related.map((item) => ({
          kind: item.kind,
          id: item.id,
        })),
        relatedRecords: related,
        externalFlowAuthorizations: bundle?.externalFlowAuthorizations ?? [],
      },
      marker: row,
      metadata: bundle?.metadata ?? [],
      secondaryMarkers: bundle ? credit.secondaryMarkers : [],
      retainFull: retainedHas.call(retainedControlledSources, row),
    };
  if (s) {
    apiReads.verify();
    s.reads.verify();
    s.nextReads.verify();
    if (bundle) {
      if (!controlSnapshot)
        throw new Error(
          "Payroll source lost its original explicit-control preimage.",
        );
      controlSnapshot.verify();
      bundle.preflight.verify(
        core,
        core.cashJournal,
        cashJournalParameters(core),
      );
      // Native private identity only, after the original reflective preflight.
      controlSnapshot.verify();
    }
  }
  return slot;
}

/** Current callback/dispatch witness: the canonical aggregate and every job view share exact owned identities. */
export function verifyCurrentWorkPayrollGroup(
  api: CoreAPI,
  receipt: Readonly<WorkPayrollGroupReceipt>,
): void {
  const a = new FinanceReadGuard(),
    core = a.field(api, "state") as CoreState,
    s = new FinancePlanningSession(
      core,
      core.cashJournal,
      cashJournalParameters(core),
    ),
    r = s.reads,
    work = r.field(core, "work") as Runtime,
    id = r.field(receipt, "id"),
    raw = r.mapGet(r.field(work, "payrollCashSources"), id);
  if (!raw || r.field(raw, "group") !== true)
    throw new Error("Payroll group callback lost its actual canonical source.");
  const row = raw as WorkPayrollGroupSourceState,
    states = r.array(r.field(row, "componentStates"), s.zero, s.one),
    components = r.array(r.field(receipt, "components"), s.zero, s.one);
  r.payload(receipt, s.zero, s.one);
  r.payload(states, s.zero, s.one);
  if (
    r.field(row, "result") !== receipt ||
    r.field(row, "id") !== id ||
    r.field(row, "date") !== s.date ||
    r.field(receipt, "date") !== s.date ||
    (r.field(row, "postedJournalSequence") === undefined &&
      r.field(row, "completedAt") === undefined) ||
    states.length <= s.one ||
    states.length !== components.length
  )
    throw new Error(
      "Payroll group callback has no genuine current completed aggregate.",
    );
  const ids = new Set<string>();
  for (let index = s.zero; index < states.length; index += s.one) {
    const state = states[index]!,
      result = r.field(state, "result"),
      commitmentId = r.field(result, "commitmentId"),
      jobId = r.field(result, "jobId"),
      ledger = r.mapGet(
        r.field(work, "payrollLedgerByCommitment"),
        commitmentId,
      );
    if (
      ids.has(commitmentId) ||
      components[index] !== result ||
      r.mapGet(r.field(work, "latestPayrollByJob"), jobId) !== result ||
      r.field(result, "id") !== id ||
      r.field(result, "groupReceiptId") !== id ||
      !ledger ||
      !same(r, ledger, r.field(state, "ledgerAfter"))
    )
      throw new Error(
        "Payroll group callback lost an exact actual job view or committed component ledger.",
      );
    ids.add(commitmentId);
  }
  a.verify();
  r.verify();
  s.nextReads.verify();
}

/** This writer accepts only an owning commitment identity, never amounts/terms/Source. */
export function settleWorkPayrollJournal(
  core: CoreState,
  api: CoreAPI,
  commitmentId: string,
): WorkPayrollJournalReceipt {
  const apiReads = new FinanceReadGuard();
  if (apiReads.field(api, "state") !== core)
    throw new Error("Payroll writer has another actual host.");
  apiReads.verify();
  ensureWorkPayrollCashModule(core);
  ensureFinanceCashModule(core);
  const s = controlledPayrollSession(core),
    c = currentContext(s, commitmentId),
    contexts = groupContexts(s, c);
  if (contexts.length > s.one)
    return settleWorkPayrollGroupJournal(core, api, s, contexts);
  const actual = prepare(s, c),
    stored = stage(s, c, actual.result, actual.ledger),
    r = s.reads,
    row: SingleWorkPayrollCashSourceState = {
      id: stored.id,
      kind: r.field(r.field(c.cfg, "journalSourceKinds"), "payroll"),
      date: s.date,
      result: stored,
      ledgerBefore: copy(r, c.ledger, s.zero, s.one),
      ledgerAfter: copy(r, actual.ledger, s.zero, s.one),
      ...(c.period ? { earnedPeriod: copy(r, c.period, s.zero, s.one) } : {}),
      credits: actual.projection.credits,
      postings: [],
      projection: actual.projection,
      references: actual.related,
    },
    table = r.field(c.work, "payrollCashSources");
  if (r.field(api, "state") !== core)
    throw new Error("Payroll writer host changed during preparation.");
  const post = r.field(api, "postJournal"),
    complete = r.field(api, "completeJournalSource");
  if (typeof post !== "function" || typeof complete !== "function")
    throw new Error("Payroll actual journal writer is absent.");
  if (Map.prototype.has.call(table, row.id))
    throw new Error("Duplicate actual payroll cash source.");
  // Admission is reversible; every actual model/index/money change is still staged.
  nativeSet.call(table, row.id, row);
  try {
    if (r.mapGet(table, row.id) !== row)
      throw new Error(
        "Payroll preparation marker was not admitted in its actual owning table.",
      );
    for (const key of [
      "id",
      "kind",
      "date",
      "result",
      "ledgerBefore",
      "ledgerAfter",
      "earnedPeriod",
      "credits",
      "projection",
      "references",
    ] as const)
      r.field(row, key);
    for (const payload of [
      row.result,
      row.ledgerBefore,
      row.ledgerAfter,
      row.earnedPeriod,
      row.credits,
      row.projection,
      row.references,
    ])
      r.payload(payload, s.zero, s.one);
    admitCompositeFinanceCreditSources(core, s, row.credits, {
      kind: row.kind,
      id: row.id,
    });
    const plan = s.seal(stored),
      caller = plan.result,
      controlSnapshot = payrollControl(s);
    row.postings = plan.postings;
    controlSet.call(pendingControl, row, controlSnapshot);
    if (controlSnapshot.personId === row.result.personId)
      retainedAdd.call(retainedControlledSources, row);
    pending.set(row, plan);
    if (plan.postings.length > s.zero)
      post.call(api, {
        id: `journal:${s.date}:${core.cashJournal.nextSequence}`,
        date: s.date,
        expectedSequence: core.cashJournal.nextSequence,
        sourceRef: { kind: row.kind, id: row.id },
        postings: plan.postings,
      });
    else complete.call(api, { kind: row.kind, id: row.id });
    pending.delete(row);
    finishCompositeFinanceCreditSources(core, api, row.credits);
    return caller;
  } catch (error) {
    pending.delete(row);
    cancelCompositeFinanceCreditSources(core, row.credits);
    if (
      row.postedJournalSequence === undefined &&
      row.completedAt === undefined &&
      Map.prototype.get.call(table, row.id) === row
    )
      nativeDelete.call(table, row.id);
    throw error;
  }
}
