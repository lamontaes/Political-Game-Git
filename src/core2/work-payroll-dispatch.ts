/** Due-index-only payroll dispatch; attendance and cash callbacks are distinct. */
import type {
  WorkPayrollCashReceipt,
  WorkPayrollGroupReceipt,
} from "./work-payroll-cash";
import { addDays, makeIsoDate } from "./kernel/dates";
import { drawSavingsToCover } from "./accounts";
import { cashJournalParameters } from "./cash-host";
import { FinancePlanningSession, FinanceReadGuard } from "./finance-plan";
import { ensureFinanceCashModule } from "./finance-cash";
import { admittedWorkPayrollCalendarMatches } from "./work-attendance";
import {
  ensureWorkPayrollCashModule,
  settleWorkPayrollJournal,
  workPayrollCashSourceProvider,
  verifyCurrentWorkPayrollGroup,
} from "./work-payroll-cash";
import {
  nextWorkPayrollPeriod,
  prepareWorkPayrollRequest,
} from "./work-pay-period";
import type { WorkPayrollBasis } from "./work-pay-period";
import type {
  WorkPayrollJournalReceipt,
  WorkPayrollCashRuntime,
} from "./work-payroll-cash";
import type {
  CoreAPI,
  CoreModule,
  CoreState,
  Source,
  WorkCommitmentInput,
  WorkData,
  WorkRuntime,
} from "./types";

type Runtime = WorkRuntime & WorkPayrollCashRuntime;
type Data = WorkData & {
  payrollReceiptIdPrefix: string;
  payrollDispatchCitation: string;
  payrollDeceasedHoldCitation: string;
  payrollGroupHoldCitation: string;
  payrollDispatchOrderRule: "organization-job-commitment-id";
};
type Commitment = WorkCommitmentInput & { payrollCalendarId?: string };
type Candidate = {
  commitmentId: string;
  organizationId: string;
  jobId: string;
  periodId?: string;
  arrears: boolean;
};
export interface WorkPayrollDispatchHold {
  date: string;
  commitmentId: string;
  jobId: string;
  personId: string;
  organizationId: string;
  calendarId: string;
  reason: "deceased-payee-authority-pending" | "retained-payroll-group-pending";
  source: Source;
}
export interface WorkPayrollDispatchResult {
  date: string;
  settled: number;
  held: readonly WorkPayrollDispatchHold[];
  source: Source;
}
function exactId(value: string): void {
  if (typeof value !== "string" || !value || value !== value.trim())
    throw new Error("Payroll dispatch lost an exact owning identity.");
}
function minor(value: number, zero: number): number {
  if (!Number.isSafeInteger(value) || value < zero)
    throw new Error("Payroll dispatch stock is not a safe nonnegative amount.");
  return value;
}
function config(s: FinancePlanningSession): Data {
  const cfg = s.reads.field(s.reads.field(s.core, "data"), "work") as
    Data | undefined;
  if (!cfg) throw new Error("Payroll dispatch has no owning work data.");
  for (const key of [
    "payrollReceiptIdPrefix",
    "payrollDispatchCitation",
    "payrollDeceasedHoldCitation",
    "payrollGroupHoldCitation",
  ] as const)
    exactId(s.reads.field(cfg, key));
  if (
    s.reads.field(cfg, "payrollDispatchOrderRule") !==
    "organization-job-commitment-id"
  )
    throw new Error(
      "Payroll dispatch lacks its explicit recorded ordering rule.",
    );
  return cfg;
}
function unit(s: FinancePlanningSession) {
  return {
    zero: s.zero,
    one: s.one,
    monthsPerYear: s.parameter("monthsPerYear"),
  };
}
function owning(s: FinancePlanningSession, id: string) {
  const r = s.reads,
    w = r.field(s.core, "work") as Runtime,
    row = r.mapGet(r.field(w, "commitments"), id) as Commitment | undefined;
  if (!row || r.field(row, "id") !== id)
    throw new Error("Payroll due index has no actual retained commitment.");
  const jobId = r.field(row, "jobId"),
    personId = r.field(row, "personId"),
    organizationId = r.field(row, "organizationId"),
    calendarId = r.field(row, "payrollCalendarId"),
    job = r.mapGet(r.field(s.core, "jobs"), jobId),
    person = r.mapGet(r.field(s.core, "people"), personId),
    employer = r.mapGet(r.field(s.core, "organizations"), organizationId),
    c = calendarId
      ? r.mapGet(r.field(w, "payrollCalendars"), calendarId)
      : undefined,
    ledger = r.mapGet(r.field(w, "payrollLedgerByCommitment"), id);
  if (
    !job ||
    !person ||
    !employer ||
    !c ||
    !ledger ||
    r.field(job, "id") !== jobId ||
    r.field(job, "personId") !== personId ||
    r.field(job, "organizationId") !== organizationId ||
    r.field(person, "id") !== personId ||
    r.field(employer, "id") !== organizationId ||
    r.field(c, "id") !== calendarId ||
    r.field(c, "organizationId") !== organizationId ||
    r.mapGet(r.field(w, "payrollCalendarByCommitment"), id) !== calendarId ||
    r.mapGet(r.field(w, "payrollCalendarByJob"), jobId) !== calendarId ||
    !admittedWorkPayrollCalendarMatches(s.core, calendarId, c)
  )
    throw new Error(
      "Payroll due record lost its actual job/person/employer/admitted calendar links.",
    );
  const basis: WorkPayrollBasis = {
    calendarId,
    commitmentId: id,
    jobId,
    personId,
    organizationId,
    jobSource: r.field(job, "source"),
    paySource: r.field(row, "paySource"),
    scheduleSource: r.field(row, "scheduleSource"),
  };
  // The pure request validates all links, complete Source, dated calendar and stock identities.
  return { w, row, person, c, ledger, basis };
}
function ownedRequest(s: FinancePlanningSession, id: string) {
  const r = s.reads,
    cfg = config(s),
    o = owning(s, id),
    u = unit(s),
    due = nextWorkPayrollPeriod(r, o.c, s.date, s.date, u),
    index = r.mapGet(r.field(o.w, "earnedPayPeriodByCommitmentIndex"), id),
    periodId = index ? r.mapGet(index, due.index) : undefined,
    period = periodId
      ? r.mapGet(r.field(o.w, "earnedPayPeriods"), periodId)
      : undefined;
  if (due.dueAt !== s.date)
    throw new Error("Payroll due index points at a nonpayday.");
  if (
    periodId !== undefined &&
    (!period ||
      r.field(period, "id") !== periodId ||
      r.field(period, "dueAt") !== s.date)
  )
    throw new Error(
      "Payroll commitment-period index lost its exact owning due record.",
    );
  if (period) {
    const members = r.mapGet(r.field(o.w, "payrollPeriodsByDue"), s.date);
    if (!members || !r.member(members, periodId!))
      throw new Error("Payroll owning earned period lost its due membership.");
  }
  const oldArrears = minor(r.field(o.ledger, "arrearsMinor"), s.zero);
  // A deceased payee's held retry is never run, so its bucket date goes stale; the hold needs no retry route.
  if (oldArrears > s.zero && r.field(o.person, "alive") !== false) {
    const at = r.field(o.ledger, "lastSettledAt"),
      next = at
        ? nextWorkPayrollPeriod(
            r,
            o.c,
            addDays(makeIsoDate(at), s.one),
            s.date,
            u,
          )
        : undefined,
      members = r.mapGet(r.field(o.w, "payrollArrearsByDue"), s.date);
    if (!next || next.dueAt !== s.date || !members || !r.member(members, id))
      throw new Error(
        "Payroll arrears lost their actual recorded retry membership.",
      );
  }
  const request = prepareWorkPayrollRequest(
    r,
    o.c,
    o.basis,
    o.ledger,
    period,
    s.date,
    r.field(cfg, "payrollReceiptIdPrefix") +
      s.date +
      ":" +
      id +
      ":" +
      due.index,
    u,
  );
  return { ...o, period, periodId, request, oldArrears };
}
function candidateIds(api: CoreAPI): {
  core: CoreState;
  date: string;
  rows: readonly Candidate[];
} {
  const ar = new FinanceReadGuard(),
    core = ar.field(api, "state") as CoreState,
    s = new FinancePlanningSession(
      core,
      core.cashJournal,
      cashJournalParameters(core),
    ),
    r = s.reads,
    w = r.field(core, "work") as Runtime,
    date = s.date,
    earned = r.mapGet(r.field(w, "payrollPeriodsByDue"), date),
    arrears = r.mapGet(r.field(w, "payrollArrearsByDue"), date),
    rows = new Map<string, Candidate>();
  for (const id of earned ? r.members(earned) : []) {
    exactId(id);
    const period = r.mapGet(r.field(w, "earnedPayPeriods"), id);
    if (
      !period ||
      r.field(period, "id") !== id ||
      r.field(period, "dueAt") !== date
    )
      throw new Error(
        "Payroll due bucket has a dangling or wrongly dated earned period.",
      );
    const commitmentId = r.field(period, "commitmentId");
    exactId(commitmentId);
    if (rows.get(commitmentId)?.periodId !== undefined)
      throw new Error(
        "Payroll due bucket has two original periods for one commitment.",
      );
    rows.set(commitmentId, {
      commitmentId,
      organizationId: r.field(period, "organizationId"),
      jobId: r.field(period, "jobId"),
      periodId: id,
      arrears: false,
    });
  }
  for (const id of arrears ? r.members(arrears) : []) {
    exactId(id);
    const row = r.mapGet(r.field(w, "commitments"), id);
    if (!row || r.field(row, "id") !== id)
      throw new Error("Payroll retry bucket lost its retained commitment.");
    rows.set(id, {
      ...(rows.get(id) ?? {
        commitmentId: id,
        organizationId: r.field(row, "organizationId"),
        jobId: r.field(row, "jobId"),
      }),
      arrears: true,
    });
  }
  for (const row of rows.values()) {
    exactId(row.organizationId);
    exactId(row.jobId);
  }
  ar.verify();
  r.verify();
  s.nextReads.verify();
  return {
    core,
    date,
    rows: Object.freeze(
      [...rows.values()].sort(
        (a, b) =>
          a.organizationId.localeCompare(b.organizationId) ||
          a.jobId.localeCompare(b.jobId) ||
          a.commitmentId.localeCompare(b.commitmentId),
      ),
    ),
  };
}
function dispatchStatus(
  api: CoreAPI,
  core: CoreState,
  at: string,
  entry: Candidate,
) {
  const s = new FinancePlanningSession(
      core,
      core.cashJournal,
      cashJournalParameters(core),
    ),
    r = s.reads,
    cfg = config(s);
  if (r.field(api, "state") !== core || s.date !== at)
    throw new Error(
      "Payroll dispatch host or date changed during its due batch.",
    );
  const o = ownedRequest(s, entry.commitmentId),
    alive = r.field(o.person, "alive");
  if (
    typeof alive !== "boolean" ||
    o.basis.organizationId !== entry.organizationId ||
    o.basis.jobId !== entry.jobId ||
    o.periodId !== entry.periodId ||
    (alive !== false && o.oldArrears > s.zero !== entry.arrears)
  )
    throw new Error(
      "Payroll due route changed or its actual payee state is malformed.",
    );
  const memberships = r.mapGet(
    r.field(o.w, "commitmentsByPerson"),
    o.basis.personId,
  );
  if (!memberships || !r.member(memberships, entry.commitmentId))
    throw new Error("Payroll actual retained person membership is absent.");
  const payable = new Set<string>();
  let owed = s.zero;
  if (o.request.requestedMinor > s.zero) {
    payable.add(entry.commitmentId);
    owed += o.request.requestedMinor;
  }
  // Bounded actual worker membership only, never all jobs, residents or historical payroll.
  for (const id of r.members(memberships)) {
    if (id === entry.commitmentId) continue;
    const row = r.mapGet(r.field(o.w, "commitments"), id) as
      Commitment | undefined;
    if (!row || r.field(row, "personId") !== o.basis.personId)
      throw new Error("Payroll retained-person index has another owner.");
    if (
      r.field(row, "organizationId") !== o.basis.organizationId ||
      r.field(row, "payrollCalendarId") !== o.basis.calendarId
    )
      continue;
    const index = r.mapGet(
        r.field(o.w, "earnedPayPeriodByCommitmentIndex"),
        id,
      ),
      pid = index ? r.mapGet(index, o.request.index) : undefined,
      period = pid
        ? r.mapGet(r.field(o.w, "earnedPayPeriods"), pid)
        : undefined,
      ledger = r.mapGet(r.field(o.w, "payrollLedgerByCommitment"), id);
    if (
      (period && minor(r.field(period, "earnedMinor"), s.zero) > s.zero) ||
      (ledger && minor(r.field(ledger, "arrearsMinor"), s.zero) > s.zero)
    ) {
      const other = ownedRequest(s, id);
      if (other.request.requestedMinor > s.zero) {
        payable.add(id);
        owed += other.request.requestedMinor;
      }
    }
  }
  const reason =
      alive === false ? "deceased-payee-authority-pending" : undefined,
    hold: WorkPayrollDispatchHold | undefined = reason
      ? {
          date: at,
          commitmentId: entry.commitmentId,
          jobId: o.basis.jobId,
          personId: o.basis.personId,
          organizationId: o.basis.organizationId,
          calendarId: o.basis.calendarId,
          reason,
          source: {
            tag: "SOURCED",
            asOf: at,
            citation: r.field(
              cfg,
              reason === "deceased-payee-authority-pending"
                ? "payrollDeceasedHoldCitation"
                : "payrollGroupHoldCitation",
            ),
          },
        }
      : undefined,
    settle = r.field(api, "settleWorkPayroll");
  if (!hold && typeof settle !== "function")
    throw new Error("Payroll dispatch lacks its canonical cash facade.");
  r.verify();
  s.nextReads.verify();
  return { hold, settle, one: s.one, owed };
}
/** No decide/refresh argument, choices, act increments or cash off actual payday. */
export function runWorkPayrollDay(
  api: CoreAPI,
): WorkPayrollDispatchResult | undefined {
  const initial = new FinanceReadGuard(),
    core = initial.field(api, "state") as CoreState;
  if (!initial.field(initial.field(core, "data"), "work")) {
    initial.verify();
    return undefined;
  }
  initial.verify();
  const batch = candidateIds(api),
    held: WorkPayrollDispatchHold[] = [];
  const start = new FinancePlanningSession(
      core,
      core.cashJournal,
      cashJournalParameters(core),
    ),
    cfg = config(start),
    citation = start.reads.field(cfg, "payrollDispatchCitation");
  let settled = start.zero;
  start.reads.verify();
  const consumed = new Set<string>();
  for (const entry of batch.rows) {
    if (consumed.has(entry.commitmentId)) continue;
    const status = dispatchStatus(api, batch.core, batch.date, entry);
    if (status.hold) held.push(status.hold);
    else {
      // An employer short of cash on payday draws the savings it holds at a
      // local bank before the payroll goes unpaid.
      drawSavingsToCover(batch.core, api, {
        id: `savings-for-payment:work-payroll:${entry.commitmentId}@${batch.date}`,
        holderId: entry.organizationId,
        owedMinor: Number(status.owed),
        asOf: makeIsoDate(batch.date),
        reason: `Work payroll ${entry.commitmentId} asked ${status.owed} minor units.`,
      });
      const returned = status.settle.call(api, entry.commitmentId),
        g = new FinanceReadGuard(),
        work = g.field(batch.core, "work"),
        row = g.mapGet(
          g.field(work, "payrollCashSources"),
          g.field(returned, "id"),
        ),
        actual = row ? g.field(row, "result") : undefined;
      if (
        !row ||
        !actual ||
        g.field(actual, "date") !== batch.date ||
        (g.field(row, "postedJournalSequence") === undefined &&
          g.field(row, "completedAt") === undefined)
      )
        throw new Error(
          "Payroll dispatch received no genuine completed current source.",
        );
      if (g.field(actual, "group") === true) {
        const group = actual as WorkPayrollGroupReceipt;
        verifyCurrentWorkPayrollGroup(api, group);
        for (const component of g.array(
          g.field(group, "components"),
          start.zero,
          status.one,
        ))
          consumed.add(g.field(component, "commitmentId"));
      } else consumed.add(entry.commitmentId);
      g.verify();
      settled += status.one;
    }
  }
  return {
    date: batch.date,
    settled,
    held: Object.freeze(held),
    source: { tag: "SOURCED", asOf: batch.date, citation },
  };
}

/** Canonical API wrapper: callback ownership is checked before cash, receipt comes from the actual completed row. */
export function settleWorkPayrollAndNotify(
  core: CoreState,
  api: CoreAPI,
  id: string,
): WorkPayrollJournalReceipt {
  const before = new FinanceReadGuard();
  if (before.field(api, "state") !== core)
    throw new Error("Payroll facade has another actual host.");
  before.verify();
  ensureWorkPayrollCashModule(core);
  ensureFinanceCashModule(core);
  const callbacksSession = new FinancePlanningSession(
      core,
      core.cashJournal,
      cashJournalParameters(core),
    ),
    g = callbacksSession.reads,
    modules = g.field(core, "modules"),
    zero = callbacksSession.zero,
    one = callbacksSession.one;
  g.payload(modules, zero, one);
  const callbacks: [CoreModule, NonNullable<CoreModule["onWorkPayroll"]>][] =
    [];
  for (const [moduleId, module] of Map.prototype.entries.call(
    modules,
  ) as IterableIterator<[string, CoreModule]>) {
    if (
      g.mapGet(modules, moduleId) !== module ||
      g.field(module, "id") !== moduleId
    )
      throw new Error("Payroll callback lost its actual module owner.");
    const callback = g.field(module, "onWorkPayroll");
    if (callback !== undefined) {
      if (typeof callback !== "function")
        throw new Error("Payroll callback is not callable.");
      callbacks.push([module, callback]);
    }
  }
  g.verify();
  const returned = settleWorkPayrollJournal(core, api, id);
  g.verify();
  const r = new FinanceReadGuard(),
    w = r.field(core, "work") as Runtime,
    row = r.mapGet(r.field(w, "payrollCashSources"), returned.id),
    actual = row ? r.field(row, "result") : undefined;
  if (
    !row ||
    !actual ||
    r.field(actual, "id") !== returned.id ||
    (r.field(row, "postedJournalSequence") === undefined &&
      r.field(row, "completedAt") === undefined)
  )
    throw new Error(
      "Payroll callback has no genuine completed canonical result.",
    );
  if (r.field(actual, "group") === true)
    verifyCurrentWorkPayrollGroup(api, actual as WorkPayrollGroupReceipt);
  else if (
    r.mapGet(
      r.field(w, "latestPayrollByJob"),
      r.field(actual as WorkPayrollCashReceipt, "jobId"),
    ) !== actual
  )
    throw new Error(
      "Payroll callback has no genuine completed canonical result.",
    );
  r.payload(actual, zero, one);
  r.verify();
  for (const [module, callback] of callbacks)
    callback.call(module, api, actual);
  return returned;
}

/** FINANCE observes genuine payday misses only; original journal already staged the end-of-day closure queue. */
export function observeWorkPayrollForFinance(
  api: CoreAPI,
  receipt: Readonly<WorkPayrollJournalReceipt>,
): void {
  const a = new FinanceReadGuard(),
    core = a.field(api, "state") as CoreState,
    s = new FinancePlanningSession(
      core,
      core.cashJournal,
      cashJournalParameters(core),
    ),
    r = s.reads,
    w = r.field(core, "work") as Runtime,
    id = r.field(receipt, "id"),
    org = r.field(receipt, "organizationId"),
    row = r.mapGet(r.field(w, "payrollCashSources"), id);
  if (!row)
    throw new Error(
      "Finance payroll callback lacks its actual completed wage source.",
    );
  if (r.field(receipt, "group") === true) {
    verifyCurrentWorkPayrollGroup(api, receipt as WorkPayrollGroupReceipt);
  } else {
    const single = receipt as WorkPayrollCashReceipt,
      jobId = r.field(single, "jobId"),
      ledger = r.mapGet(
        r.field(w, "payrollLedgerByCommitment"),
        r.field(single, "commitmentId"),
      );
    r.payload(receipt, s.zero, s.one);
    if (
      !row ||
      r.field(row, "result") !== receipt ||
      r.mapGet(r.field(w, "latestPayrollByJob"), jobId) !== receipt ||
      r.field(row, "id") !== id ||
      r.field(row, "date") !== s.date ||
      r.field(receipt, "date") !== s.date ||
      (r.field(row, "postedJournalSequence") === undefined &&
        r.field(row, "completedAt") === undefined) ||
      !ledger ||
      r.field(ledger, "lastPayrollReceiptId") !== id ||
      r.field(ledger, "lastSettledAt") !== s.date ||
      r.field(ledger, "arrearsMinor") !== r.field(receipt, "arrearsAfterMinor")
    )
      throw new Error(
        "Finance payroll callback lacks its actual completed wage source.",
      );
  }
  const requested = minor(r.field(receipt, "requestedMinor"), s.zero),
    paid = minor(r.field(receipt, "paidMinor"), s.zero),
    shortfall = minor(r.field(receipt, "shortfallMinor"), s.zero);
  if (paid > requested || requested - paid !== shortfall)
    throw new Error(
      "Finance payroll callback has inconsistent actual wage amounts.",
    );
  const book = r.mapGet(s.map("businesses"), org);
  if (shortfall > s.zero && book && !r.field(book, "closedAt")) {
    const slot = workPayrollCashSourceProvider(api, {
      kind: r.field(row, "kind"),
      id,
    });
    if (!slot || slot.marker !== row)
      throw new Error(
        "Actual payroll closure queue lacks its full owning cash source.",
      );
    const queued = r.mapGet(s.map("unfundedBusinessReceipts"), org);
    if (
      !queued ||
      r.field(queued, "id") !== id ||
      r.field(queued, "date") !== s.date
    )
      throw new Error(
        "Actual payday miss lost its journal-staged closure queue.",
      );
  }
  a.verify();
  r.verify();
  s.nextReads.verify();
}
