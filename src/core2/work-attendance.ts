import { queueDecisionDetail } from "./decision-detail";
import { validateCompactChoice } from "./compact-choice";
import { bookkeeping } from "./bookkeeping";
/** Attendance and earned wages only. Cash settlement belongs to the recorded payday. */
import { ageOnDate, makeIsoDate } from "./kernel/dates";
import { FinanceReadGuard } from "./finance-plan";
import { snapshotExplicitControlV1 } from "./player-control-state-v1";
import { carryTraitScores } from "./choice";
import { workWeekStart } from "./modules/work";
import { validateDatedWorkResult } from "./work-state";
import {
  createImmutableWorkPayrollCalendar,
  prepareWorkPayAccrual,
  workPayPeriodOnDate,
} from "./work-pay-period";
import type {
  WorkPayrollCalendarInput,
  WorkPayrollBasis,
} from "./work-pay-period";
import type { Parameter } from "./parameters";
import type {
  CoreAPI,
  CoreState,
  DecisionResult,
  KnownFact,
  Source,
  WorkAttendanceInput,
  WorkAttendanceResult,
  WorkResultInput,
} from "./types";
import { registerSnapshotPart } from "./snapshot";

const nativeSet = Map.prototype.set,
  nativeDelete = Map.prototype.delete,
  nativeGet = Map.prototype.get,
  nativeEntries = Map.prototype.entries,
  nativeAdd = Set.prototype.add,
  nativeWeakGet = WeakMap.prototype.get,
  nativeWeakSet = WeakMap.prototype.set;
type Operation =
  | { kind: "map"; target: Map<unknown, unknown>; key: unknown; next: unknown }
  | { kind: "delete"; target: Map<unknown, unknown>; key: unknown }
  | { kind: "set"; target: Set<unknown>; value: unknown };

function tables(r: FinanceReadGuard, core: CoreState) {
  const w = r.field(core, "work");
  return [
    r.field(core, "people"),
    r.field(core, "actCounters"),
    r.field(core, "actCountersByMonth"),
    r.field(core, "actsByMonthKind"),
    r.field(core, "durableLog"),
    r.field(core, "logByPerson"),
    r.field(core, "logByKind"),
    r.field(core, "logByPlace"),
    r.field(core, "knowledgeByPerson"),
    r.field(w, "currentAttendanceJobByRecordId"),
    r.field(w, "lastAttendanceByJob"),
    r.field(w, "detailedAttendance"),
    r.field(w, "totalsByJob"),
    r.field(w, "rollups"),
    r.field(w, "rollupsByWeek"),
    r.field(w, "timeByPerson"),
    r.field(w, "primaryTimeTotals"),
    r.field(w, "payrollCalendars"),
    r.field(w, "payrollCalendarByCommitment"),
    r.field(w, "payrollCalendarByJob"),
    r.field(w, "payrollLedgerByCommitment"),
    r.field(w, "earnedPayPeriods"),
    r.field(w, "earnedPayPeriodByCommitmentIndex"),
    r.field(w, "payrollPeriodsByDue"),
  ] as readonly Map<unknown, unknown>[];
}

/** Private identity of this world's native write tables, not payroll or cash authority. */
const owners = new WeakMap<CoreState, readonly Map<unknown, unknown>[]>();
const admittedCalendars = new WeakMap<
  CoreState,
  Map<string, WorkPayrollCalendarInput>
>();
// A world snapshot saves which calendars were admitted; the restored world
// admits its restored calendar records under the same ids.
registerSnapshotPart("core2-work-admitted-calendars", {
  save: (core) => [...(admittedCalendars.get(core)?.keys() ?? [])],
  restore: (core, ids) => {
    const map = new Map<string, WorkPayrollCalendarInput>();
    for (const id of (ids as string[] | undefined) ?? []) {
      const calendar = core.work.payrollCalendars.get(id);
      if (calendar) map.set(id, calendar);
    }
    nativeWeakSet.call(admittedCalendars, core, map);
  },
});
/** Exact owner-admitted immutable identity, never a caller freeze or Source/citation claim. */
export function admittedWorkPayrollCalendarMatches(
  core: CoreState,
  id: string,
  calendar: WorkPayrollCalendarInput,
): boolean {
  const actual = nativeWeakGet.call(admittedCalendars, core) as
    Map<string, WorkPayrollCalendarInput> | undefined;
  return actual !== undefined && nativeGet.call(actual, id) === calendar;
}
export function admitWorkAttendanceOwner(core: CoreState): void {
  if (owners.has(core))
    throw new Error("Attendance owner already initialized.");
  const r = new FinanceReadGuard(),
    actual = tables(r, core);
  if (new Set(actual).size !== actual.length)
    throw new Error("Attendance tables must have independent actual owners.");
  for (const table of actual) r.mapHas(table, undefined);
  r.verify();
  owners.set(core, actual);
  nativeWeakSet.call(
    admittedCalendars,
    core,
    new Map<string, WorkPayrollCalendarInput>(),
  );
}

/** One read guard and native map/set-only commit; no direct live row/setter mutation. */
class AttendanceBatch {
  readonly reads = new FinanceReadGuard();
  private readonly operations: Operation[] = [];
  private readonly registry: CoreState["data"]["parameters"];
  readonly zero: number;
  readonly one: number;
  readonly viewParameters: Record<string, Parameter> = Object.create(null);
  // Play keeps no validator view, so parameters are read without a view row.
  private readonly viewing = bookkeeping();
  constructor(
    readonly core: CoreState,
    api: CoreAPI,
  ) {
    const r = this.reads;
    if (r.field(api, "state") !== core)
      throw new Error("Attendance writer has another actual host.");
    const expected = owners.get(core),
      actual = tables(r, core);
    if (!expected || actual.some((table, index) => table !== expected[index]))
      throw new Error("Actual attendance write table was replaced.");
    this.registry = r.field(r.field(core, "data"), "parameters");
    this.zero = this.parameter("zero");
    this.one = this.parameter("one");
  }
  parameter(key: string): number {
    const row = this.reads.field(this.registry, key);
    if (!row)
      throw new Error("Attendance has an unregistered parameter: " + key);
    const value = this.reads.field(row, "value");
    if (!Number.isFinite(value))
      throw new Error("Non-finite attendance parameter.");
    if (this.viewing)
      this.viewParameters[key] = {
        value,
        tag: this.reads.field(row, "tag"),
        citation: this.reads.field(row, "citation"),
      };
    return value;
  }
  private noDuplicate(target: Map<unknown, unknown>, key: unknown): void {
    if (
      this.operations.some(
        (row) =>
          (row.kind === "map" || row.kind === "delete") &&
          row.target === target &&
          Object.is(row.key, key),
      )
    )
      throw new Error("Duplicate attendance mutation target.");
  }
  map<K, V>(target: Map<K, V>, key: K, next: V): void {
    this.reads.mapGet(target, key);
    if (this.viewing) this.noDuplicate(target, key);
    this.operations.push({
      kind: "map",
      target: target as Map<unknown, unknown>,
      key,
      next,
    });
  }
  delete<K, V>(target: Map<K, V>, key: K): void {
    this.reads.mapGet(target, key);
    if (this.viewing) this.noDuplicate(target, key);
    this.operations.push({
      kind: "delete",
      target: target as Map<unknown, unknown>,
      key,
    });
  }
  index<K, V>(target: Map<K, Set<V>>, key: K, value: V): void {
    const old = this.reads.mapGet(target, key);
    if (!old) this.map(target, key, new Set([value]));
    else if (!this.reads.member(old, value))
      this.operations.push({ kind: "set", target: old, value });
  }
  commit(controlSnapshot?: ReturnType<typeof snapshotExplicitControlV1>): void {
    // Original reflective preflight, then the factory's native-only identity check.
    this.reads.verify();
    controlSnapshot?.verify();
    for (const row of this.operations)
      if (row.kind === "map") nativeSet.call(row.target, row.key, row.next);
      else if (row.kind === "delete") nativeDelete.call(row.target, row.key);
      else nativeAdd.call(row.target, row.value);
  }
}

function finite(value: number): number {
  if (!Number.isFinite(value))
    throw new Error("Attendance time/reasons overflow.");
  return value;
}
function minor(value: number, zero: number): number {
  if (!Number.isSafeInteger(value) || value < zero)
    throw new Error(
      "Attendance integer amount/counter is malformed or overflows.",
    );
  return value;
}
function addFinite(left: number, right: number): number {
  finite(left);
  finite(right);
  return finite(left + right);
}
function addMinor(left: number, right: number, zero: number): number {
  minor(left, zero);
  minor(right, zero);
  return minor(left + right, zero);
}
function shallow<T extends object>(r: FinanceReadGuard, raw: T): T {
  const prototype = Object.getPrototypeOf(raw);
  if (
    prototype !== Object.prototype &&
    prototype !== null &&
    !Array.isArray(raw)
  )
    throw new Error("Attendance requires ordinary owned data rows.");
  const result = Object.create(prototype) as Record<PropertyKey, unknown>;
  for (const key of r.keys(raw)) {
    const value = r.field(raw as Record<PropertyKey, unknown>, key),
      descriptor = Object.getOwnPropertyDescriptor(raw, key);
    if (
      !descriptor ||
      !("value" in descriptor) ||
      !Object.is(value, descriptor.value)
    )
      throw new Error("Attendance owned descriptor changed while copying.");
    Object.defineProperty(result, key, {
      value,
      enumerable: descriptor.enumerable,
      writable: true,
      configurable: true,
    });
  }
  return result as T;
}

// Only this copier can admit these independently detached, deeply frozen graphs.
// Caller-frozen inputs are never trusted: their descriptor/read guards still run.
const detachedAttendanceEvidence = new WeakSet<object>(),
  hasDetachedAttendanceEvidence = WeakSet.prototype.has,
  addDetachedAttendanceEvidence = WeakSet.prototype.add,
  freezeDetachedAttendanceEvidence = Object.freeze,
  createDetachedAttendanceEvidence = Object.create,
  defineDetachedAttendanceEvidence = Object.defineProperty;

/** Only a bounded result/evidence payload, never an actor/history/whole-world copy. */
function detached<T>(
  r: FinanceReadGuard,
  raw: T,
  active = new Set<object>(),
): T {
  // Play stores the freshly built result itself; bookkeeping detaches and freezes it.
  if (!bookkeeping()) return raw;
  if (typeof raw === "function" || typeof raw === "symbol")
    throw new Error("Attendance payload cannot contain executable values.");
  if (raw === null || typeof raw !== "object") return raw;
  if (hasDetachedAttendanceEvidence.call(detachedAttendanceEvidence, raw))
    return raw;
  if (active.has(raw)) throw new Error("Attendance payload has a cycle.");
  active.add(raw);
  try {
    const result = Array.isArray(raw)
      ? []
      : createDetachedAttendanceEvidence(Object.getPrototypeOf(raw));
    if (
      !Array.isArray(raw) &&
      Object.getPrototypeOf(raw) !== Object.prototype &&
      Object.getPrototypeOf(raw) !== null
    )
      throw new Error("Attendance payload requires ordinary data.");
    for (const key of r.keys(raw)) {
      if (Array.isArray(raw) && key === "length") continue;
      const value = r.field(raw as Record<PropertyKey, unknown>, key),
        descriptor = Object.getOwnPropertyDescriptor(raw, key);
      if (
        !descriptor ||
        !("value" in descriptor) ||
        !Object.is(value, descriptor.value)
      )
        throw new Error("Attendance payload descriptor changed while copying.");
      defineDetachedAttendanceEvidence(result, key, {
        value: detached(r, value, active),
        enumerable: descriptor.enumerable,
        writable: false,
        configurable: false,
      });
    }
    if (Array.isArray(raw)) {
      const length = r.field(raw, "length");
      for (let index = 0; index < length; index++)
        if (!Object.hasOwn(raw, index))
          throw new Error("Attendance arrays must be dense.");
      defineDetachedAttendanceEvidence(result, "length", { value: length });
    }
    freezeDetachedAttendanceEvidence(result);
    addDetachedAttendanceEvidence.call(detachedAttendanceEvidence, result);
    return result as T;
  } finally {
    active.delete(raw);
  }
}

/** Preserve original ordinary-row admission while omitting unused own-key walks. */
function ordinaryRow<T extends object>(raw: T): T {
  const prototype = Object.getPrototypeOf(raw);
  if (
    prototype !== Object.prototype &&
    prototype !== null &&
    !Array.isArray(raw)
  )
    throw new Error("Attendance requires ordinary owned data rows.");
  return raw;
}

/** Preserve full pay/schedule Source payload guards without detaching the commitment. */
function guardSourceData(
  r: FinanceReadGuard,
  raw: unknown,
  zero: number,
  one: number,
  active = new Set<object>(),
): void {
  if (typeof raw === "function" || typeof raw === "symbol")
    throw new Error("Attendance payload cannot contain executable values.");
  if (raw === null || typeof raw !== "object") return;
  if (active.has(raw)) throw new Error("Attendance payload has a cycle.");
  active.add(raw);
  try {
    if (
      !Array.isArray(raw) &&
      Object.getPrototypeOf(raw) !== Object.prototype &&
      Object.getPrototypeOf(raw) !== null
    )
      throw new Error("Attendance payload requires ordinary data.");
    for (const key of r.keys(raw)) {
      if (Array.isArray(raw) && key === "length") continue;
      const value = r.field(raw as Record<PropertyKey, unknown>, key),
        descriptor = Object.getOwnPropertyDescriptor(raw, key);
      if (
        !descriptor ||
        !("value" in descriptor) ||
        !Object.is(value, descriptor.value)
      )
        throw new Error("Attendance payload descriptor changed while copying.");
      guardSourceData(r, value, zero, one, active);
    }
    if (Array.isArray(raw)) {
      const length = r.field(raw, "length");
      for (let index = zero; index < length; index += one)
        if (!Object.hasOwn(raw, index))
          throw new Error("Attendance arrays must be dense.");
    }
  } finally {
    active.delete(raw);
  }
}

function availableSource(
  r: FinanceReadGuard,
  source: Source,
  at: string,
  zero: number,
  one: number,
): void {
  if (!source) throw new Error("Attendance requires full dated owning Source.");
  r.payload(source, zero, one);
  const tag = r.field(source, "tag"),
    asOf = r.field(source, "asOf"),
    citation = r.field(source, "citation");
  if (
    !["SOURCED", "ESTIMATED"].includes(tag) ||
    typeof citation !== "string" ||
    !citation.trim() ||
    typeof asOf !== "string" ||
    makeIsoDate(asOf) !== asOf ||
    asOf > at ||
    (tag === "ESTIMATED" && !r.field(source, "estimatedFrom")?.trim())
  )
    throw new Error("Attendance owning Source is undated or unavailable.");
}

function basis(
  batch: AttendanceBatch,
  commitmentId: string,
  calendar: WorkPayrollCalendarInput,
  play = false,
): WorkPayrollBasis {
  const r = batch.reads,
    core = batch.core,
    work = r.field(core, "work"),
    row = r.mapGet(r.field(work, "commitments"), commitmentId);
  if (play && row) {
    // Play resolves the owner rows by their ids; the owner and Source checks
    // below run with bookkeeping on.
    const job = r.mapGet(r.field(core, "jobs"), row.jobId);
    return {
      calendarId: calendar.id,
      commitmentId,
      jobId: row.jobId,
      personId: row.personId,
      organizationId: row.organizationId,
      jobSource: job!.source,
      paySource: row.paySource,
      scheduleSource: row.scheduleSource,
    };
  }
  if (
    !row ||
    r.field(row, "id") !== commitmentId ||
    r.field(row, "payrollCalendarId") !== r.field(calendar, "id")
  )
    throw new Error(
      "Payroll calendar is not the explicit actual commitment calendar.",
    );
  const jobId = r.field(row, "jobId"),
    personId = r.field(row, "personId"),
    organizationId = r.field(row, "organizationId"),
    job = r.mapGet(r.field(core, "jobs"), jobId),
    person = r.mapGet(r.field(core, "people"), personId),
    employer = r.mapGet(r.field(core, "organizations"), organizationId);
  if (
    !job ||
    !person ||
    !employer ||
    r.field(job, "id") !== jobId ||
    r.field(job, "personId") !== personId ||
    r.field(job, "organizationId") !== organizationId ||
    r.field(person, "id") !== personId ||
    r.field(employer, "id") !== organizationId ||
    r.field(calendar, "organizationId") !== organizationId
  )
    throw new Error(
      "Payroll calendar lacks independently resolved job/person/employer owners.",
    );
  const result: WorkPayrollBasis = {
    calendarId: r.field(calendar, "id"),
    commitmentId,
    jobId,
    personId,
    organizationId,
    jobSource: r.field(job, "source"),
    paySource: r.field(row, "paySource"),
    scheduleSource: r.field(row, "scheduleSource"),
  };
  for (const source of [
    result.jobSource,
    result.paySource,
    result.scheduleSource,
    r.field(employer, "source"),
  ])
    availableSource(r, source, r.field(core, "date"), batch.zero, batch.one);
  return result;
}

/** Admission names actual commitments; a calendar claim never creates money authority. */
export function admitWorkPayrollCalendar(
  core: CoreState,
  api: CoreAPI,
  input: WorkPayrollCalendarInput,
): void {
  const batch = new AttendanceBatch(core, api),
    r = batch.reads,
    work = r.field(core, "work"),
    at = r.field(core, "date"),
    calendar = createImmutableWorkPayrollCalendar(detached(r, input), at, {
      zero: batch.zero,
      one: batch.one,
      monthsPerYear: batch.parameter("monthsPerYear"),
    }),
    id = r.field(calendar, "id"),
    calendars = r.field(work, "payrollCalendars"),
    byCommitment = r.field(work, "payrollCalendarByCommitment"),
    byJob = r.field(work, "payrollCalendarByJob");
  const admitted = nativeWeakGet.call(admittedCalendars, core) as
    Map<string, WorkPayrollCalendarInput> | undefined;
  if (
    !admitted ||
    r.mapHas(calendars, id) ||
    nativeGet.call(admitted, id) !== undefined
  )
    throw new Error("Duplicate or unavailable actual payroll calendar owner.");
  availableSource(r, r.field(calendar, "source"), at, batch.zero, batch.one);
  const ids = r.array(
    r.field(calendar, "workCommitmentIds"),
    batch.zero,
    batch.one,
  );
  if (ids.length <= batch.zero || new Set(ids).size !== ids.length)
    throw new Error("Payroll calendar needs distinct actual commitments.");
  // Every saved basis ID resolves independently; the calendar cannot cite itself as evidence.
  for (const basisId of r.array(
    r.field(calendar, "basisRecordIds"),
    batch.zero,
    batch.one,
  )) {
    const record =
      r.mapGet(r.field(core, "people"), basisId) ??
      r.mapGet(r.field(core, "jobs"), basisId) ??
      r.mapGet(r.field(core, "organizations"), basisId) ??
      r.mapGet(r.field(work, "commitments"), basisId);
    if (!record || r.field(record, "id") !== basisId || basisId === id)
      throw new Error(
        "Payroll calendar basis ID has no independent saved owning record.",
      );
    const evidence = record as {
      source?: Source;
      paySource?: Source;
      scheduleSource?: Source;
    };
    const source =
      r.field(evidence, "source") ?? r.field(evidence, "paySource");
    if (!source)
      throw new Error("Payroll calendar basis record has no full Source.");
    availableSource(r, source, at, batch.zero, batch.one);
  }
  const queryAt = [
    at,
    r.field(calendar, "firstPeriodStartsAt"),
    r.field(calendar, "effectiveFrom"),
  ]
    .sort()
    .at(-batch.one)!;
  workPayPeriodOnDate(r, calendar, queryAt, {
    zero: batch.zero,
    one: batch.one,
    monthsPerYear: batch.parameter("monthsPerYear"),
  });
  for (const commitmentId of ids) {
    const owner = basis(batch, commitmentId, calendar);
    if (
      r.mapHas(byCommitment, commitmentId) ||
      r.mapHas(byJob, owner.jobId) ||
      r.mapHas(r.field(work, "lastResultByJob"), owner.jobId) ||
      r.mapHas(r.field(work, "lastAttendanceByJob"), owner.jobId) ||
      r.mapHas(r.field(work, "latestLegacyCashResultByPerson"), owner.personId)
    )
      throw new Error(
        "Payroll enrollment is duplicate or follows an already settled work mode.",
      );
    batch.map(byCommitment, commitmentId, id);
    batch.map(byJob, owner.jobId, id);
  }
  batch.map(calendars, id, calendar);
  batch.commit();
  // Detached calendar and all nested evidence are frozen; native private marking follows successful admission only.
  nativeSet.call(admitted, id, calendar);
}

export function workEarnedPayPeriodId(
  calendarId: string,
  commitmentId: string,
  index: number,
): string {
  return "earned-work-period:" + calendarId + ":" + commitmentId + ":" + index;
}

/** Validates and commits attendance/accrual; no financing, journal, cash balances or shortfall. */
export function recordWorkAttendance(
  core: CoreState,
  api: CoreAPI,
  raw: WorkAttendanceInput,
): WorkAttendanceResult {
  // Play reads the live rows and writes the result; the detached views, the
  // descriptor and Source guards and the dated-result validator run with
  // bookkeeping on (tests, the bench).
  const play = !bookkeeping(),
    controlSnapshot = snapshotExplicitControlV1(core),
    batch = new AttendanceBatch(core, api),
    r = batch.reads,
    input = play ? raw : shallow(r, raw),
    work = r.field(core, "work"),
    data = r.field(r.field(core, "data"), "work"),
    date = r.field(core, "date"),
    zero = batch.zero,
    one = batch.one;
  if (!data) throw new Error("Attendance requires its actual work policy.");
  const row = r.mapGet(r.field(work, "commitments"), input.commitmentId),
    actor = r.mapGet(r.field(core, "people"), input.personId),
    job = r.mapGet(r.field(core, "jobs"), input.jobId),
    previous = r.mapGet(r.field(work, "lastAttendanceByJob"), input.jobId);
  if (!row || !actor || !job)
    throw new Error("Attendance actual owner is absent.");
  const calendarId = r.field(row, "payrollCalendarId"),
    calendars = r.field(work, "payrollCalendars"),
    calendar = calendarId ? r.mapGet(calendars, calendarId) : undefined;
  if (!calendar)
    throw new Error(
      "Attendance has no independently admitted actual payroll calendar.",
    );
  const today = r.mapGet(r.field(work, "timeByPerson"), input.personId);
  let commitment: {
      id: string;
      jobId: string;
      personId: string;
      organizationId: string;
    } = row,
    actorView = actor,
    reasons: DecisionResult["selectedReasons"],
    compactChoice: WorkAttendanceResult["compactChoice"],
    todayView = today as
      | { date: string; workMinutes: number; discretionaryMinutes: number }
      | undefined,
    viewApi = api;
  if (!play) {
    // The validator consumes these actual terms and bounded slot geometry, not a
    // detached commitment or unrelated job metadata. Actor replacement still owns
    // a complete shallow preimage so no unrelated property/reference is lost.
    ordinaryRow(row);
    ordinaryRow(job);
    if (previous) ordinaryRow(previous);
    actorView = shallow(r, actor);
    commitment = {
      id: r.field(row, "id"),
      jobId: r.field(row, "jobId"),
      personId: r.field(row, "personId"),
      organizationId: r.field(row, "organizationId"),
      startsAt: r.field(row, "startsAt"),
      endsAt: r.field(row, "endsAt"),
      anchorDate: r.field(row, "anchorDate"),
      periodDays: r.field(row, "periodDays"),
      hourlyMinor: r.field(row, "hourlyMinor"),
      slots: r.array(r.field(row, "slots"), zero, one).map((originalSlot) => {
        const slot = ordinaryRow(originalSlot);
        return {
          offsetDays: r.field(slot, "offsetDays"),
          startMinute: r.field(slot, "startMinute"),
          minutes: r.field(slot, "minutes"),
        };
      }),
    };
    if (
      !admittedWorkPayrollCalendarMatches(core, calendarId!, calendar) ||
      r.mapGet(
        r.field(work, "payrollCalendarByCommitment"),
        input.commitmentId,
      ) !== calendarId ||
      r.mapGet(r.field(work, "payrollCalendarByJob"), input.jobId) !==
        calendarId
    )
      throw new Error(
        "Attendance has no independently admitted actual payroll calendar.",
      );
  }
  const owner = basis(batch, input.commitmentId, calendar, play),
    ownedCalendarId = r.field(calendar, "id");
  if (!play) {
    // These Source graphs were fully checked by the old commitment detachment.
    // Keep their ordinary-data, dense-array, descriptor, cycle and late-drift checks.
    guardSourceData(r, owner.paySource, zero, one);
    guardSourceData(r, owner.scheduleSource, zero, one);
  }
  const detailed =
    r.field(core, "observer") ||
    r.field(core, "playerId") === actorView.id ||
    r.member(r.field(core, "focusPersonIds"), actorView.id) ||
    controlSnapshot.personId === actorView.id;
  if (!play) {
    if (!input.decision)
      throw new Error("Attendance needs its actual shared-score choice.");
    ordinaryRow(input.decision);
    ordinaryRow(data);
    const checked = {
        actorId: r.field(input.decision, "actorId"),
        date: r.field(input.decision, "date"),
        selected: r.field(input.decision, "selected"),
        reasonKey: r.field(input.decision, "reasonKey"),
        selectedReasons: r.field(input.decision, "selectedReasons"),
      },
      checkedOffer = checked.selected
        ? {
            definition: r.field(checked.selected, "definition"),
            targetId: r.field(checked.selected, "targetId"),
            availableHours: r.field(checked.selected, "availableHours"),
            effortHours: r.field(checked.selected, "effortHours"),
            driveId: r.field(checked.selected, "driveId"),
          }
        : undefined;
    if (!checkedOffer) throw new Error("Attendance has no selected offer.");
    ordinaryRow(checked.selected!);
    const checkedDefinition = checkedOffer.definition,
      checkedAttendance = r.field(data, "attendanceAction"),
      checkedAbsence = r.field(data, "absenceAction");
    if (
      checkedDefinition !== checkedAttendance &&
      checkedDefinition !== checkedAbsence
    )
      throw new Error(
        "Attendance choice must use its actual registered work action.",
      );
    ordinaryRow(checkedDefinition);
    ordinaryRow(checkedAttendance);
    ordinaryRow(checkedAbsence);
    const actionView = {
        id: r.field(checkedDefinition, "id"),
        effect: r.field(checkedDefinition, "effect"),
      },
      cfg = {
        sleepReserveParameter: r.field(data, "sleepReserveParameter"),
        attendanceAction: { effect: r.field(checkedAttendance, "effect") },
        absenceAction: { effect: r.field(checkedAbsence, "effect") },
      };
    reasons = checked.selectedReasons
      ? shallow(r, checked.selectedReasons)
      : undefined;
    if (
      reasons &&
      Object.values(reasons).some((value) => !Number.isFinite(value))
    )
      throw new Error("Attendance choice reasons are non-finite.");
    // This private validator view contains only guarded fields the unchanged
    // validator reads. Detailed retention below still detaches the original graph.
    const decisionView = {
      ...checked,
      selected: { ...checkedOffer, definition: actionView },
      selectedReasons: reasons,
      scores: undefined,
      selectedReasonTerms: undefined,
    } as unknown as DecisionResult;
    if (today) ordinaryRow(today);
    todayView = today
      ? {
          date: r.field(today, "date"),
          workMinutes: r.field(today, "workMinutes"),
          discretionaryMinutes: r.field(today, "discretionaryMinutes"),
        }
      : undefined;
    const plannedMap = r.mapGet(
        r.field(work, "plannedByCommitmentResidue"),
        input.commitmentId,
      ),
      plannedView = new Map<number, number>();
    if (plannedMap) {
      r.payload(plannedMap, zero, one);
      for (const [key] of nativeEntries.call(plannedMap))
        plannedView.set(key, r.mapGet(plannedMap, key)!);
    }
    for (const key of [
      "hoursPerDay",
      "minutesPerHour",
      "daysPerWeek",
      "mondayIndex",
      "isoMonthCharacters",
      r.field(data, "sleepReserveParameter"),
    ])
      batch.parameter(key);
    const jobView = {
        id: r.field(job, "id"),
        personId: r.field(job, "personId"),
        organizationId: r.field(job, "organizationId"),
        endsAt: r.field(job, "endsAt"),
      },
      priorView = previous
        ? {
            date: r.field(previous, "date"),
            payRemainderMinor: r.field(previous, "payRemainderMinor"),
          }
        : undefined;
    const view = {
      date,
      startedAt: r.field(core, "startedAt"),
      people: new Map([[input.personId, actorView]]),
      jobs: new Map([[input.jobId, jobView]]),
      work: {
        commitments: new Map([[input.commitmentId, commitment]]),
        lastResultByJob: new Map(priorView ? [[input.jobId, priorView]] : []),
        plannedByCommitmentResidue: new Map([
          [input.commitmentId, plannedView],
        ]),
        timeByPerson: new Map(todayView ? [[input.personId, todayView]] : []),
      },
      data: { work: cfg, parameters: batch.viewParameters },
    } as unknown as CoreState;
    viewApi = {
      state: view,
      parameter: (key: string) => batch.parameter(key),
    } as unknown as CoreAPI;
    validateDatedWorkResult(view, viewApi, {
      ...input,
      requestedMinor: input.earnedMinor,
      decision: decisionView,
    } as WorkResultInput);
    if (
      checked.selected !== r.field(input.decision, "selected") ||
      checkedOffer.targetId !== commitment.id ||
      !Number.isFinite(checkedOffer.availableHours) ||
      checkedOffer.availableHours < zero ||
      (checkedOffer.effortHours !== undefined &&
        (!Number.isFinite(checkedOffer.effortHours) ||
          checkedOffer.effortHours < zero))
    )
      throw new Error(
        "Attendance choice does not retain its actual selected identity/time.",
      );
    const rawCompact = r.field(input.decision, "compactChoice");
    compactChoice =
      rawCompact === undefined ? undefined : detached(r, rawCompact);
    if (compactChoice) validateCompactChoice(compactChoice);
    if (
      compactChoice &&
      (compactChoice.version !== "core2-compact-choice-v1" ||
        compactChoice.actorId !== actorView.id ||
        compactChoice.date !== date ||
        compactChoice.chosen.actionId !== actionView.id ||
        compactChoice.chosen.targetId !== checkedOffer.targetId ||
        compactChoice.chosen.availableHours !== checkedOffer.availableHours ||
        compactChoice.chosen.driveId !== checkedOffer.driveId ||
        compactChoice.chosen.effortHours !==
          (checkedOffer.effortHours ??
            batch.parameter(r.field(checkedDefinition, "effortParameter"))) ||
        !reasons ||
        Object.keys(compactChoice.chosen.contributions).length !==
          Object.keys(reasons).length ||
        compactChoice.chosen.score !==
          Object.values(reasons).reduce((sum, value) => sum + value, zero) ||
        Object.keys(reasons).some(
          (key) =>
            compactChoice.chosen.contributions[key as keyof typeof reasons] !==
            reasons[key as keyof typeof reasons],
        ))
    )
      throw new Error(
        "Attendance compact choice disagrees with its actual selected evidence.",
      );
    availableSource(r, input.source, date, zero, one);
  } else {
    if (!input.decision?.selected)
      throw new Error("Attendance has no selected offer.");
    reasons = input.decision.selectedReasons;
    compactChoice = input.decision.compactChoice;
  }
  const selected = input.decision!.selected!,
    definition = r.field(selected, "definition"),
    offer = {
      targetId: r.field(selected, "targetId"),
      driveId: r.field(selected, "driveId"),
    },
    attendance = r.field(data, "attendanceAction"),
    monthsPerYear = batch.parameter("monthsPerYear"),
    selectedId = r.field(definition, "id");
  const actionKind = r.field(definition, "effect"),
    attended = actionKind === r.field(attendance, "effect"),
    before = minor(actorView.actCount, zero),
    after = minor(before + one, zero),
    sourceActId = "act:" + date + ":" + actorView.id + ":" + after;
  const resolved = workPayPeriodOnDate(r, calendar, date, {
      zero,
      one,
      monthsPerYear,
    }),
    periodId = workEarnedPayPeriodId(
      ownedCalendarId,
      commitment.id,
      resolved.index,
    ),
    periods = r.field(work, "earnedPayPeriods"),
    ledger = r.field(work, "payrollLedgerByCommitment"),
    originalPeriod = r.mapGet(periods, periodId),
    priorLedger = r.mapGet(ledger, commitment.id);
  const earned = prepareWorkPayAccrual(
    r,
    calendar,
    owner,
    priorLedger,
    originalPeriod,
    {
      id: input.id,
      date,
      commitmentId: commitment.id,
      jobId: commitment.jobId,
      personId: commitment.personId,
      organizationId: commitment.organizationId,
      plannedMinutes: input.plannedMinutes,
      attendedMinutes: input.attendedMinutes,
      absentMinutes: input.absentMinutes,
      earnedMinor: input.earnedMinor,
      source: input.source,
    },
    periodId,
    { zero, one, monthsPerYear },
  );
  const full: WorkAttendanceResult = {
    id: input.id,
    date,
    commitmentId: input.commitmentId,
    jobId: input.jobId,
    personId: input.personId,
    organizationId: input.organizationId,
    plannedMinutes: input.plannedMinutes,
    attendedMinutes: input.attendedMinutes,
    absentMinutes: input.absentMinutes,
    earnedMinor: input.earnedMinor,
    payRemainderMinor: input.payRemainderMinor,
    reasonKey: input.reasonKey,
    sourceActId,
    payrollCalendarId: ownedCalendarId,
    earnedPayPeriodId: periodId,
    ...(detailed ? { decision: detached(r, input.decision) } : {}),
    ...(detailed && compactChoice ? { compactChoice } : {}),
    source: {
      tag: "SOURCED",
      asOf: date,
      citation:
        "Actual owned-job shared-score attendance, occupied minutes and earned wages; cash is not due until the independently recorded employer payday.",
    },
  };
  const stored = detached(r, full),
    caller = stored,
    nextActor = actorView;
  nextActor.lastChoice = selectedId;
  nextActor.lastReason = input.reasonKey;
  nextActor.actCount = after;
  const actualKinds = r.field(actor, "actsByKind");
  r.payload(actualKinds, zero, one);
  const kinds = play
    ? actualKinds
    : new Map<string, number>(nativeEntries.call(actualKinds));
  kinds.set(
    selectedId,
    addMinor(
      r.mapGet(r.field(actor, "actsByKind"), selectedId) ?? zero,
      one,
      zero,
    ),
  );
  nextActor.actsByKind = kinds;
  carryTraitScores(actor, nextActor);
  batch.map(r.field(core, "people"), actorView.id, nextActor);
  const month = date.slice(zero, batch.parameter("isoMonthCharacters")),
    counterKey = month + ":" + actorView.id + ":" + selectedId,
    counters = r.field(core, "actCounters"),
    oldCounter = r.mapGet(counters, counterKey);
  batch.map(counters, counterKey, {
    month,
    actorId: actorView.id,
    actionId: selectedId,
    count: addMinor(
      oldCounter ? r.field(oldCounter, "count") : zero,
      one,
      zero,
    ),
    needContribution: addFinite(
      oldCounter ? r.field(oldCounter, "needContribution") : zero,
      reasons?.need ?? zero,
    ),
    goalContribution: addFinite(
      oldCounter ? r.field(oldCounter, "goalContribution") : zero,
      reasons?.goal ?? zero,
    ),
    driveContribution: addFinite(
      oldCounter ? r.field(oldCounter, "driveContribution") : zero,
      reasons?.drive ?? zero,
    ),
  });
  batch.index(r.field(core, "actCountersByMonth"), month, counterKey);
  const monthTotals = r.field(core, "actsByMonthKind"),
    monthKey = month + ":" + selectedId;
  batch.map(
    monthTotals,
    monthKey,
    addMinor(r.mapGet(monthTotals, monthKey) ?? zero, one, zero),
  );
  const totals = r.field(work, "totalsByJob"),
    oldTotals = r.mapGet(totals, input.jobId),
    old = oldTotals && !play ? shallow(r, oldTotals) : oldTotals;
  if (
    (old?.requestedMinor ?? zero) !==
      (priorLedger ? r.field(priorLedger, "earnedMinor") : zero) ||
    (old?.paidMinor ?? zero) !==
      (priorLedger ? r.field(priorLedger, "paidMinor") : zero)
  )
    throw new Error(
      "Work totals differ from their actual earned/paid payroll ledger.",
    );
  batch.map(totals, input.jobId, {
    plannedMinutes: addFinite(
      old?.plannedMinutes ?? zero,
      input.plannedMinutes,
    ),
    attendedMinutes: addFinite(
      old?.attendedMinutes ?? zero,
      input.attendedMinutes,
    ),
    requestedMinor: addMinor(
      old?.requestedMinor ?? zero,
      input.earnedMinor,
      zero,
    ),
    paidMinor: minor(old?.paidMinor ?? zero, zero),
    workedDays: addMinor(old?.workedDays ?? zero, attended ? one : zero, zero),
    missedDays: addMinor(old?.missedDays ?? zero, attended ? zero : one, zero),
    earnedMinor: earned.ledger.earnedMinor,
    accruedMinor: earned.ledger.accruedMinor,
    dueRecognizedMinor: earned.ledger.dueRecognizedMinor,
    arrearsMinor: earned.ledger.arrearsMinor,
  });
  const currentAttendanceIds = r.field(work, "currentAttendanceJobByRecordId");
  if (previous) {
    const previousId = r.field(previous, "id");
    if (r.mapGet(currentAttendanceIds, previousId) !== input.jobId)
      throw new Error(
        "Current attendance record index differs from its actual previous owner.",
      );
    batch.delete(currentAttendanceIds, previousId);
  }
  if (r.mapHas(currentAttendanceIds, input.id))
    throw new Error("Current attendance record identity already exists.");
  batch.map(currentAttendanceIds, input.id, input.jobId);
  batch.map(r.field(work, "lastAttendanceByJob"), input.jobId, stored);
  if (detailed)
    batch.map(r.field(work, "detailedAttendance"), input.id, stored);
  batch.map(r.field(work, "timeByPerson"), input.personId, {
    date,
    workMinutes: addFinite(
      todayView?.date === date ? todayView.workMinutes : zero,
      input.attendedMinutes,
    ),
    discretionaryMinutes:
      todayView?.date === date ? todayView.discretionaryMinutes : zero,
  });
  const week = workWeekStart(date, viewApi),
    rollupKey = week + ":" + input.jobId,
    rollups = r.field(work, "rollups"),
    priorRollup = r.mapGet(rollups, rollupKey),
    rollup = priorRollup && !play ? shallow(r, priorRollup) : priorRollup;
  batch.map(rollups, rollupKey, {
    weekStartedAt: week,
    jobId: input.jobId,
    personId: input.personId,
    plannedDays: addMinor(rollup?.plannedDays ?? zero, one, zero),
    workedDays: addMinor(
      rollup?.workedDays ?? zero,
      attended ? one : zero,
      zero,
    ),
    missedDays: addMinor(
      rollup?.missedDays ?? zero,
      attended ? zero : one,
      zero,
    ),
    plannedMinutes: addFinite(
      rollup?.plannedMinutes ?? zero,
      input.plannedMinutes,
    ),
    attendedMinutes: addFinite(
      rollup?.attendedMinutes ?? zero,
      input.attendedMinutes,
    ),
    requestedMinor: addMinor(
      rollup?.requestedMinor ?? zero,
      input.earnedMinor,
      zero,
    ),
    paidMinor: minor(rollup?.paidMinor ?? zero, zero),
    latestReasonKey: input.reasonKey,
  });
  batch.index(r.field(work, "rollupsByWeek"), week, rollupKey);
  const ageRows = r.array(r.field(data, "activityAgeRows"), zero, one),
    age = ageOnDate(actorView.birthDate, date);
  const ageRow = ageRows.find(
    (row) =>
      age >= batch.parameter(r.field(row, "minimumAgeParameter")) &&
      (r.field(row, "maximumAgeParameter") === undefined ||
        age < batch.parameter(r.field(row, "maximumAgeParameter")!)),
  );
  const ageId = ageRow ? r.field(ageRow, "id") : "below-reference-age",
    category = "paid-job-work",
    activityKey = ageId + ":" + category,
    primary = r.field(work, "primaryTimeTotals"),
    priorActivity = r.mapGet(primary, activityKey);
  batch.map(primary, activityKey, {
    ageReferenceId: ageId,
    category,
    minutes: addFinite(
      priorActivity ? r.field(priorActivity, "minutes") : zero,
      input.attendedMinutes,
    ),
    source: priorActivity ? r.field(priorActivity, "source") : stored.source,
  });
  batch.map(ledger, commitment.id, detached(r, earned.ledger));
  const { decision: omittedDecision, ...lastAttendanceBasis } = stored;
  void omittedDecision;
  const { lastAttendanceBasis: omittedBasis, ...periodFields } = earned.period;
  void omittedBasis;
  batch.map(
    periods,
    periodId,
    detached(r, {
      ...periodFields,
      ...(detailed ? { lastAttendanceBasis } : {}),
    }),
  );
  const periodIndexes = r.field(work, "earnedPayPeriodByCommitmentIndex"),
    priorIndex = r.mapGet(periodIndexes, commitment.id),
    nextIndex =
      play && priorIndex
        ? priorIndex
        : new Map<number, string>(
            priorIndex
              ? (r.payload(priorIndex, zero, one),
                nativeEntries.call(priorIndex))
              : [],
          );
  if (
    r.mapGet(priorIndex ?? new Map<number, string>(), resolved.index) !==
    (originalPeriod ? periodId : undefined)
  )
    throw new Error("Original earned period/index ownership disagrees.");
  nextIndex.set(resolved.index, periodId);
  batch.map(periodIndexes, commitment.id, nextIndex);
  const dueIndex = r.field(work, "payrollPeriodsByDue"),
    dueIds = r.mapGet(dueIndex, resolved.dueAt);
  if (
    (dueIds ? r.member(dueIds, periodId) : false) !==
    (originalPeriod !== undefined)
  )
    throw new Error("Original earned period/due index ownership disagrees.");
  batch.index(dueIndex, resolved.dueAt, periodId);
  if (detailed) {
    const logs = r.field(core, "durableLog");
    if (r.mapHas(logs, sourceActId))
      throw new Error("Actual attendance act trace already exists.");
    queueDecisionDetail(core, date, sourceActId);
    batch.map(logs, sourceActId, {
      id: sourceActId,
      date,
      kind: "person.acted",
      personIds: [actorView.id],
      placeId: actorView.placeId,
      source: {
        tag: "SOURCED",
        asOf: date,
        citation: "Prototype committed attendance decision result.",
      },
      actorId: actorView.id,
      actionId: selectedId,
      targetId: offer.targetId,
      driveId: offer.driveId,
      reasonKey: input.reasonKey,
      decision: stored.decision,
      visibility: r.field(core, "observer") ? "observer" : "circle",
    });
    batch.index(r.field(core, "logByPerson"), actorView.id, sourceActId);
    batch.index(r.field(core, "logByKind"), "person.acted", sourceActId);
    batch.index(r.field(core, "logByPlace"), actorView.placeId, sourceActId);
    const known = r.mapGet(r.field(core, "knowledgeByPerson"), actorView.id);
    if (!known) throw new Error("Missing watched worker knowledge index.");
    // Replace the owned inner map; never mutate an injected map/property callback.
    r.payload(known, zero, one);
    const nextKnown = play
        ? known
        : new Map<string, KnownFact>(nativeEntries.call(known)),
      key = "job:" + input.jobId + ":latest-work-attendance";
    nextKnown.set(key, {
      key,
      value: JSON.stringify({
        date,
        plannedMinutes: input.plannedMinutes,
        attendedMinutes: input.attendedMinutes,
        earnedMinor: input.earnedMinor,
        payrollCalendarId: ownedCalendarId,
        earnedPayPeriodId: periodId,
        reasonKey: input.reasonKey,
      }),
      learnedAt: date,
      sourceId: input.commitmentId,
      access: "self",
    });
    batch.map(r.field(core, "knowledgeByPerson"), actorView.id, nextKnown);
  }
  batch.commit(controlSnapshot);
  return caller;
}
