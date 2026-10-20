/** Proposed internal payroll arithmetic. This helper never writes cash or grants authority. */
import { bookkeeping } from "./bookkeeping";
import { addDays, daysBetween, makeIsoDate } from "./kernel/dates";
import { FinanceReadGuard } from "./finance-plan";
import type { IsoDate } from "./kernel/brands";
import type { Source, WorkAttendanceResult } from "./types";

/**
 * One separately recorded employer pay calendar, never the attendance periodDays.
 * Fixed-day and true calendar-month boundaries are distinct recorded rules.
 * Every phase, boundary, short-month and nonbusiness-day convention needs its own
 * actual or explicitly estimated owning evidence before this candidate is wired.
 */
export interface WorkPayrollCalendarInput {
  id: string;
  organizationId: string;
  workCommitmentIds: readonly string[];
  basisRecordIds: readonly string[];
  rule:
    | "fixed-days-after-inclusive-period-end"
    | "calendar-months-after-inclusive-period-end"
    | "twice-calendar-month-after-inclusive-period-end";
  firstPeriodStartsAt: string;
  periodDays?: number;
  periodMonths?: number;
  nominalBoundaryDays?: readonly number[];
  shortMonthRule?: "clamp-to-calendar-month-end";
  nonbusinessDayRule: "no-adjustment";
  firstPaydayAt: string;
  effectiveFrom: string;
  effectiveUntil?: string;
  /** Explicit modeled/supplied retry policy; no daily or end-date cash acceleration. */
  arrearsRule: "carry-to-next-recorded-payday";
  source: Source;
}

/** The actual owning writer must resolve these links and full Sources from CoreState. */
export interface WorkPayrollBasis {
  calendarId: string;
  commitmentId: string;
  jobId: string;
  personId: string;
  organizationId: string;
  jobSource: Source;
  paySource: Source;
  scheduleSource: Source;
}

export interface WorkPayPeriod {
  index: number;
  fromAt: string;
  throughAt: string;
  dueAt: string;
}

/** A bounded open-period aggregate, not a prediction of attendance or payment. */
export interface WorkEarnedPayPeriod extends WorkPayPeriod, WorkPayrollBasis {
  id: string;
  firstEarnedAt: string;
  lastEarnedAt: string;
  lastWorkResultId: string;
  /** Latest actual attendance, retained with this aggregate after the job advances. */
  lastAttendanceBasis?: Readonly<Omit<WorkAttendanceResult, "decision">>;
  segmentCount: number;
  plannedMinutes: number;
  attendedMinutes: number;
  earnedMinor: number;
  source: Source;
}

/** Cumulative original earned amounts and current stocks have distinct meanings. */
export interface WorkPayrollLedger {
  calendarId: string;
  commitmentId: string;
  jobId: string;
  personId: string;
  organizationId: string;
  earnedMinor: number;
  dueRecognizedMinor: number;
  paidMinor: number;
  accruedMinor: number;
  arrearsMinor: number;
  lastEarnedAt?: string;
  lastWorkResultId?: string;
  lastSettledPeriodIndex?: number;
  lastSettledAt?: string;
  lastPayrollReceiptId?: string;
}

export interface WorkEarnedShift {
  id: string;
  date: string;
  commitmentId: string;
  jobId: string;
  personId: string;
  organizationId: string;
  plannedMinutes: number;
  attendedMinutes: number;
  absentMinutes: number;
  /** Must already match actual hourly terms and prior fractional carry. */
  earnedMinor: number;
  source: Source;
}

export interface WorkPayrollRequest extends WorkPayrollBasis, WorkPayPeriod {
  id: string;
  date: string;
  earnedPeriodId?: string;
  newlyDueMinor: number;
  arrearsBeforeMinor: number;
  requestedMinor: number;
  source: Source;
}

export interface WorkPayrollSettlement extends WorkPayrollRequest {
  paidMinor: number;
  shortfallMinor: number;
  paidArrearsMinor: number;
  paidNewlyDueMinor: number;
  missedNewlyDueMinor: number;
  arrearsAfterMinor: number;
}

type Units = Readonly<{ zero: number; one: number; monthsPerYear: number }>;

// This registry brands only graphs allocated below. A caller freeze, proxy or
// structurally equal copy never enters it, and it grants no world/owner authority.
const immutableCalendarUnits = new WeakMap<object, Units>();
const nativeCalendarWeakGet = WeakMap.prototype.get;
const nativeCalendarWeakSet = WeakMap.prototype.set;

/** Own, descriptor-only data copy. Native mutable collections cannot be frozen this way. */
function immutableCalendarCopy<T>(
  r: FinanceReadGuard,
  raw: T,
  u: Units,
  active = new Set<object>(),
  copied = new WeakMap<object, object>(),
): T {
  if (typeof raw === "function" || typeof raw === "symbol")
    throw new Error("Immutable payroll calendars require non-executable data.");
  if (raw === null || typeof raw !== "object") return raw;
  if (active.has(raw))
    throw new Error(
      "Immutable payroll calendar evidence cannot contain a cycle.",
    );
  const previous = nativeCalendarWeakGet.call(copied, raw) as
    object | undefined;
  if (previous) return previous as T;
  const array = Array.isArray(raw),
    prototype = Object.getPrototypeOf(raw);
  if (
    array
      ? prototype !== Array.prototype
      : prototype !== Object.prototype && prototype !== null
  )
    throw new Error(
      "Immutable payroll calendars require ordinary records and native data arrays.",
    );
  const result = array ? [] : Object.create(null);
  active.add(raw);
  nativeCalendarWeakSet.call(copied, raw, result);
  try {
    for (const key of r.keys(raw)) {
      if (array && key === "length") continue;
      const value = r.field(raw as Record<PropertyKey, unknown>, key),
        descriptor = Object.getOwnPropertyDescriptor(raw, key);
      if (
        !descriptor ||
        !("value" in descriptor) ||
        !Object.is(descriptor.value, value)
      )
        throw new Error("Payroll calendar descriptor changed while copying.");
      Object.defineProperty(result, key, {
        value: immutableCalendarCopy(r, value, u, active, copied),
        enumerable: descriptor.enumerable,
        writable: false,
        configurable: false,
      });
    }
    if (array) {
      // The original full validator checks calendar arrays. Optional nested
      // Source arrays must independently retain dense own data as well.
      const values = r.array(raw as readonly unknown[], u.zero, u.one);
      Object.defineProperty(result, "length", { value: values.length });
    }
    return Object.freeze(result) as T;
  } finally {
    active.delete(raw);
  }
}

/**
 * One-time arithmetic admission, separate from actual CoreState owner admission.
 * Validate first; build an independent graph; validate that graph; seal the
 * original descriptor/shape preimages last; only then privately brand it.
 */
export function createImmutableWorkPayrollCalendar(
  input: WorkPayrollCalendarInput,
  evidenceAvailableAt: string,
  suppliedUnits: Units,
): WorkPayrollCalendarInput {
  const r = new FinanceReadGuard(),
    u = capturedUnits(r, suppliedUnits),
    at = date(evidenceAvailableAt);
  validateCalendar(r, input, at, u);
  const result = immutableCalendarCopy(r, input, u);
  validateCalendar(r, result, at, u);
  const admittedUnits = Object.freeze({
    zero: u.zero,
    one: u.one,
    monthsPerYear: u.monthsPerYear,
  });
  // No caller hook or graph read follows this final verification.
  r.seal();
  nativeCalendarWeakSet.call(immutableCalendarUnits, result, admittedUnits);
  return result;
}

const validatedOn = new WeakMap<
  object,
  Map<string, WorkPayrollCalendarInput>
>();

/** Immutable structure only; full current Source guards remain on every call. */
function calendar(
  r: FinanceReadGuard,
  c: WorkPayrollCalendarInput,
  at: string,
  u: Units,
): WorkPayrollCalendarInput {
  const admitted = nativeCalendarWeakGet.call(immutableCalendarUnits, c) as
    Units | undefined;
  if (!admitted) {
    // In play, a calendar checked once for a date needn't be checked again.
    if (bookkeeping()) return validateCalendar(r, c, at, u);
    const seen = validatedOn.get(c);
    const prior = seen?.get(at);
    if (prior) return prior;
    const result = validateCalendar(r, c, at, u);
    validatedOn.set(c, (seen ?? new Map()).set(at, result));
    return result;
  }
  units(u);
  if (
    !Object.is(admitted.zero, u.zero) ||
    !Object.is(admitted.one, u.one) ||
    !Object.is(admitted.monthsPerYear, u.monthsPerYear)
  )
    throw new Error(
      "Immutable payroll calendar units differ from their admission.",
    );
  availableSource(r, c.source, at, u);
  return c;
}

/** Calculations use captured descriptors, never a raw getter/proxy get value. */
function guardedRecord<T extends object>(
  r: FinanceReadGuard,
  raw: T,
  u: Units,
): T {
  // Play reads the record as it is; the copy exists for the read guard that
  // tests and the bench run with bookkeeping on.
  if (!bookkeeping()) return raw;
  r.payload(raw, u.zero, u.one);
  const result = Object.create(null) as Record<PropertyKey, unknown>;
  for (const key of r.keys(raw))
    Object.defineProperty(result, key, {
      value: r.field(raw as Record<PropertyKey, unknown>, key),
      enumerable: true,
      writable: true,
      configurable: true,
    });
  return result as T;
}

function identity(value: string): void {
  if (typeof value !== "string" || !value || value !== value.trim())
    throw new Error("Payroll requires canonical recorded identities.");
}

function units(value: Units): void {
  if (
    value.zero !== value.zero - value.zero ||
    value.one !== Math.sign(value.one) ||
    value.one <= value.zero ||
    !Number.isSafeInteger(value.monthsPerYear) ||
    value.monthsPerYear <= value.zero ||
    value.monthsPerYear !==
      new Date(Date.UTC(value.one, value.zero, value.zero)).getUTCMonth() +
        value.one
  )
    throw new Error("Payroll requires the registered exact zero/one units.");
}

function capturedUnits(r: FinanceReadGuard, value: Units): Units {
  const result = {
    zero: r.field(value, "zero"),
    one: r.field(value, "one"),
    monthsPerYear: r.field(value, "monthsPerYear"),
  };
  units(result);
  return result;
}

function minor(value: number, u: Units): number {
  if (!Number.isSafeInteger(value) || value < u.zero)
    throw new Error("Payroll minor units are malformed or overflow.");
  return value;
}

function sum(left: number, right: number, u: Units): number {
  minor(left, u);
  minor(right, u);
  return minor(Number(BigInt(left) + BigInt(right)), u);
}

function date(value: string): IsoDate {
  const normalized = makeIsoDate(value);
  if (normalized !== value)
    throw new Error("Payroll dates must retain their exact recorded ISO form.");
  return normalized;
}

function availableSource(
  r: FinanceReadGuard,
  source: Source,
  at: string,
  u: Units,
): void {
  if (!source) throw new Error("Payroll requires full dated Source evidence.");
  // Full payload retains optional provenance, every own key/descriptor and nesting.
  r.payload(source, u.zero, u.one);
  const tag = r.field(source, "tag"),
    asOf = r.field(source, "asOf"),
    citation = r.field(source, "citation");
  if (
    !["SOURCED", "ESTIMATED"].includes(tag) ||
    !citation?.trim() ||
    date(asOf) > at ||
    (tag === "ESTIMATED" && !r.field(source, "estimatedFrom")?.trim())
  )
    throw new Error(
      "Payroll requires available complete dated Source evidence.",
    );
}

/** Full evidence equality without invoking serialization hooks. */
function sameEvidence(
  r: FinanceReadGuard,
  left: unknown,
  right: unknown,
  u: Units,
  seen = new WeakMap<object, object>(),
): boolean {
  if (Object.is(left, right)) return true;
  if (
    left === null ||
    right === null ||
    typeof left !== "object" ||
    typeof right !== "object"
  )
    return false;
  if (seen.has(left)) return seen.get(left) === right;
  seen.set(left, right);
  r.payload(left, u.zero, u.one);
  r.payload(right, u.zero, u.one);
  const a = r.keys(left),
    b = r.keys(right);
  return (
    a.length === b.length &&
    a.every(
      (key, index) =>
        key === b[index] &&
        sameEvidence(
          r,
          r.field(left as Record<PropertyKey, unknown>, key),
          r.field(right as Record<PropertyKey, unknown>, key),
          u,
          seen,
        ),
    )
  );
}

function earnedSource(at: string): Source {
  return {
    tag: "SOURCED",
    asOf: at,
    citation:
      "Actual validated owned-job dated work accrued in its separately recorded pay period. No cash was moved and no future attendance or payment is established.",
  };
}

function requestSource(at: string): Source {
  return {
    tag: "SOURCED",
    asOf: at,
    citation:
      "Actual current payroll request from canonical earned work and preserved prior unpaid wages on the separately recorded employer payday. Amount requested is not cash paid or an observed legal entitlement.",
  };
}

function monthBoundary(
  c: WorkPayrollCalendarInput,
  months: number,
  nominalDay: number,
  u: Units,
): string {
  if (!Number.isSafeInteger(months))
    throw new Error("Payroll month offset overflows.");
  const d = new Date(`${date(c.firstPeriodStartsAt)}T00:00:00.000Z`);
  d.setUTCDate(u.one);
  d.setUTCMonth(d.getUTCMonth() + months);
  const last = new Date(d);
  last.setUTCMonth(last.getUTCMonth() + u.one);
  last.setUTCDate(u.zero);
  d.setUTCDate(Math.min(nominalDay, last.getUTCDate()));
  return date(d.toISOString().split("T")[u.zero]!);
}

function anchorPosition(c: WorkPayrollCalendarInput, u: Units): number {
  const days = c.nominalBoundaryDays!;
  const matches = days
    .map((day, index) => ({ index, at: monthBoundary(c, u.zero, day, u) }))
    .filter((row) => row.at === c.firstPeriodStartsAt);
  if (matches.length !== u.one)
    throw new Error(
      "Payroll first boundary is missing or ambiguous under its recorded month rule.",
    );
  return matches[u.zero]!.index;
}

function boundaryAtIndex(
  c: WorkPayrollCalendarInput,
  index: number,
  u: Units,
): string {
  if (!Number.isSafeInteger(index) || index < u.zero)
    throw new Error("Payroll period index is outside its recorded calendar.");
  if (c.rule === "fixed-days-after-inclusive-period-end") {
    const offset = index * c.periodDays!;
    if (!Number.isSafeInteger(offset))
      throw new Error("Payroll day offset overflows.");
    return addDays(date(c.firstPeriodStartsAt), offset);
  }
  if (c.rule === "calendar-months-after-inclusive-period-end")
    return monthBoundary(
      c,
      index * c.periodMonths!,
      c.nominalBoundaryDays![u.zero]!,
      u,
    );
  const ordinal = anchorPosition(c, u) + index,
    count = c.nominalBoundaryDays!.length;
  return monthBoundary(
    c,
    Math.floor(ordinal / count),
    c.nominalBoundaryDays![ordinal % count]!,
    u,
  );
}

function periodAtIndex(
  c: WorkPayrollCalendarInput,
  index: number,
  u: Units,
): WorkPayPeriod {
  const fromAt = boundaryAtIndex(c, index, u),
    next = boundaryAtIndex(c, index + u.one, u),
    throughAt = addDays(date(next), -u.one),
    firstThrough = addDays(date(boundaryAtIndex(c, u.one, u)), -u.one),
    lag = daysBetween(firstThrough, date(c.firstPaydayAt));
  if (next <= fromAt || lag < u.zero)
    throw new Error(
      "Payroll boundary/phase collapses or precedes its original period end.",
    );
  return { index, fromAt, throughAt, dueAt: addDays(throughAt, lag) };
}

/** Play reuses the period every worker on one calendar resolves on the same day. */
const lastPeriod = new WeakMap<
  WorkPayrollCalendarInput,
  { at: string; u: Units; period: WorkPayPeriod }
>();

function periodContaining(
  c: WorkPayrollCalendarInput,
  at: string,
  u: Units,
): WorkPayPeriod {
  if (bookkeeping()) return computePeriodContaining(c, at, u);
  const cached = lastPeriod.get(c);
  if (
    cached &&
    cached.at === at &&
    (cached.u === u ||
      (cached.u.zero === u.zero &&
        cached.u.one === u.one &&
        cached.u.monthsPerYear === u.monthsPerYear))
  )
    return cached.period;
  const period = computePeriodContaining(c, at, u);
  lastPeriod.set(c, { at, u, period });
  return period;
}

function computePeriodContaining(
  c: WorkPayrollCalendarInput,
  at: string,
  u: Units,
): WorkPayPeriod {
  if (at < c.firstPeriodStartsAt)
    throw new Error("Payroll date precedes its recorded first period.");
  let index: number;
  if (c.rule === "fixed-days-after-inclusive-period-end")
    index = Math.floor(
      daysBetween(date(c.firstPeriodStartsAt), date(at)) / c.periodDays!,
    );
  else {
    const first = new Date(`${c.firstPeriodStartsAt}T00:00:00.000Z`),
      current = new Date(`${at}T00:00:00.000Z`);
    let months =
      (current.getUTCFullYear() - first.getUTCFullYear()) * u.monthsPerYear +
      current.getUTCMonth() -
      first.getUTCMonth();
    if (c.rule === "calendar-months-after-inclusive-period-end") {
      index = Math.floor(months / c.periodMonths!);
      if (boundaryAtIndex(c, index, u) > at) index -= u.one;
    } else {
      const days = c.nominalBoundaryDays!;
      let position = -u.one;
      for (let n = u.zero; n < days.length; n += u.one)
        if (monthBoundary(c, months, days[n]!, u) <= at) position = n;
      if (position < u.zero) {
        months -= u.one;
        position = days.length - u.one;
      }
      index = months * days.length + position - anchorPosition(c, u);
    }
  }
  const result = periodAtIndex(c, index, u);
  if (at < result.fromAt || at > result.throughAt)
    throw new Error("Payroll date does not belong to its recorded period.");
  return result;
}

function validateCalendar(
  r: FinanceReadGuard,
  c: WorkPayrollCalendarInput,
  at: string,
  u: Units,
): WorkPayrollCalendarInput {
  units(u);
  if (!c) throw new Error("Recorded employer payday terms are missing.");
  c = guardedRecord(r, c, u);
  for (const key of ["id", "organizationId"] as const)
    identity(r.field(c, key));
  const ids = r.array(r.field(c, "workCommitmentIds"), u.zero, u.one),
    basis = r.array(r.field(c, "basisRecordIds"), u.zero, u.one);
  for (const id of [...ids, ...basis]) identity(id);
  if (
    !ids.length ||
    !basis.length ||
    new Set(ids).size !== ids.length ||
    new Set(basis).size !== basis.length ||
    ![
      "fixed-days-after-inclusive-period-end",
      "calendar-months-after-inclusive-period-end",
      "twice-calendar-month-after-inclusive-period-end",
    ].includes(r.field(c, "rule")) ||
    r.field(c, "arrearsRule") !== "carry-to-next-recorded-payday" ||
    r.field(c, "nonbusinessDayRule") !== "no-adjustment"
  )
    throw new Error(
      "Unsupported, incomplete or ambiguous recorded employer calendar.",
    );
  if (c.rule === "fixed-days-after-inclusive-period-end") {
    if (
      !Number.isSafeInteger(r.field(c, "periodDays")) ||
      c.periodDays! <= u.zero ||
      c.periodMonths !== undefined ||
      c.nominalBoundaryDays !== undefined ||
      c.shortMonthRule !== undefined
    )
      throw new Error(
        "Fixed-day payroll requires only its recorded day cadence.",
      );
  } else {
    const days = r.array(
      r.field(c, "nominalBoundaryDays") ?? [],
      u.zero,
      u.one,
    );
    const lastMonth = new Date(`${date(c.firstPeriodStartsAt)}T00:00:00.000Z`);
    lastMonth.setUTCMonth(u.zero);
    lastMonth.setUTCDate(u.one);
    lastMonth.setUTCMonth(lastMonth.getUTCMonth() + u.one);
    lastMonth.setUTCDate(u.zero);
    if (
      c.periodDays !== undefined ||
      c.shortMonthRule !== "clamp-to-calendar-month-end" ||
      days.length !==
        (c.rule === "calendar-months-after-inclusive-period-end"
          ? u.one
          : u.one + u.one) ||
      days.some(
        (day, index) =>
          !Number.isSafeInteger(day) ||
          day <= u.zero ||
          day > lastMonth.getUTCDate() ||
          (index > u.zero && day <= days[index - u.one]!),
      ) ||
      (c.rule === "calendar-months-after-inclusive-period-end"
        ? !Number.isSafeInteger(c.periodMonths) || c.periodMonths! <= u.zero
        : c.periodMonths !== undefined)
    )
      throw new Error(
        "Month payroll requires distinct recorded nominal boundaries and short-month handling.",
      );
    c = { ...c, nominalBoundaryDays: days };
    if (c.rule === "twice-calendar-month-after-inclusive-period-end") {
      // Two adjacent Gregorian years include a non-leap February. This is a
      // calendar identity, not a model coefficient or an attendance forecast.
      let shortest = lastMonth.getUTCDate();
      for (
        let offset = u.zero;
        offset < u.monthsPerYear * (u.one + u.one);
        offset += u.one
      )
        shortest = Math.min(
          shortest,
          new Date(
            `${monthBoundary(c, offset, lastMonth.getUTCDate(), u)}T00:00:00.000Z`,
          ).getUTCDate(),
        );
      if (days[u.zero]! >= Math.min(days[u.one]!, shortest))
        throw new Error(
          "Recorded twice-month boundaries collapse in a short calendar month.",
        );
    }
    anchorPosition(c, u);
  }
  date(r.field(c, "firstPeriodStartsAt"));
  const firstThrough = periodAtIndex(c, u.zero, u).throughAt,
    firstDue = date(r.field(c, "firstPaydayAt")),
    effective = date(r.field(c, "effectiveFrom")),
    until = r.field(c, "effectiveUntil");
  if (
    firstDue < firstThrough ||
    (until !== undefined && date(until) <= effective)
  )
    throw new Error("Payroll calendar has inconsistent recorded boundaries.");
  availableSource(r, r.field(c, "source"), at, u);
  return { ...c, workCommitmentIds: ids, basisRecordIds: basis };
}

function basis(
  r: FinanceReadGuard,
  c: WorkPayrollCalendarInput,
  b: WorkPayrollBasis,
  at: string,
  u: Units,
): WorkPayrollBasis {
  b = guardedRecord(r, b, u);
  for (const key of [
    "calendarId",
    "commitmentId",
    "jobId",
    "personId",
    "organizationId",
  ] as const)
    identity(r.field(b, key));
  if (
    b.calendarId !== c.id ||
    b.organizationId !== c.organizationId ||
    !c.workCommitmentIds.includes(b.commitmentId)
  )
    throw new Error(
      "Payroll basis differs from its owning employer/calendar membership.",
    );
  for (const source of [b.jobSource, b.paySource, b.scheduleSource])
    availableSource(r, source, at, u);
  return b;
}

function sameOwner(
  row: WorkPayrollBasis | WorkPayrollLedger,
  b: WorkPayrollBasis,
): void {
  for (const key of [
    "calendarId",
    "commitmentId",
    "jobId",
    "personId",
    "organizationId",
  ] as const)
    if (row[key] !== b[key])
      throw new Error(
        "Payroll ledger/period has changed its actual owning links.",
      );
}

function readLedger(
  r: FinanceReadGuard,
  c: WorkPayrollCalendarInput,
  b: WorkPayrollBasis,
  prior: WorkPayrollLedger | undefined,
  u: Units,
): WorkPayrollLedger {
  if (!prior)
    return {
      calendarId: b.calendarId,
      commitmentId: b.commitmentId,
      jobId: b.jobId,
      personId: b.personId,
      organizationId: b.organizationId,
      earnedMinor: u.zero,
      dueRecognizedMinor: u.zero,
      paidMinor: u.zero,
      accruedMinor: u.zero,
      arrearsMinor: u.zero,
    };
  prior = guardedRecord(r, prior, u);
  sameOwner(prior, b);
  for (const value of [
    prior.earnedMinor,
    prior.dueRecognizedMinor,
    prior.paidMinor,
    prior.accruedMinor,
    prior.arrearsMinor,
  ])
    minor(value, u);
  if (
    prior.earnedMinor !==
      sum(prior.dueRecognizedMinor, prior.accruedMinor, u) ||
    prior.dueRecognizedMinor !== sum(prior.paidMinor, prior.arrearsMinor, u) ||
    (prior.lastEarnedAt === undefined) !==
      (prior.lastWorkResultId === undefined)
  )
    throw new Error(
      "Payroll ledger does not conserve earned/due/paid/accrued/arrears.",
    );
  if (prior.lastEarnedAt !== undefined) date(prior.lastEarnedAt);
  if (prior.lastWorkResultId !== undefined) identity(prior.lastWorkResultId);
  const marked = [
    prior.lastSettledPeriodIndex,
    prior.lastSettledAt,
    prior.lastPayrollReceiptId,
  ];
  if (marked.some((value) => value !== undefined)) {
    if (
      !Number.isSafeInteger(prior.lastSettledPeriodIndex) ||
      prior.lastSettledPeriodIndex! < u.zero ||
      prior.lastSettledAt === undefined ||
      prior.lastPayrollReceiptId === undefined ||
      date(prior.lastSettledAt) !==
        periodAtIndex(c, prior.lastSettledPeriodIndex!, u).dueAt
    )
      throw new Error(
        "Payroll ledger has a partial or inconsistent settlement marker.",
      );
    identity(prior.lastPayrollReceiptId);
  }
  return prior;
}

/** Source dates are checked against earning time, not just a later cash date. */
export function workPayPeriodOnDate(
  r: FinanceReadGuard,
  c: WorkPayrollCalendarInput,
  earnedAt: string,
  u: Units,
): WorkPayPeriod {
  u = capturedUnits(r, u);
  const at = date(earnedAt);
  c = calendar(r, c, at, u);
  if (
    at < c.effectiveFrom ||
    at < c.firstPeriodStartsAt ||
    (c.effectiveUntil !== undefined && at >= c.effectiveUntil)
  )
    throw new Error("Earned work lies outside its recorded payroll calendar.");
  return periodContaining(c, at, u);
}

function readPeriod(
  r: FinanceReadGuard,
  c: WorkPayrollCalendarInput,
  b: WorkPayrollBasis,
  prior: WorkEarnedPayPeriod,
  u: Units,
): WorkEarnedPayPeriod {
  prior = guardedRecord(r, prior, u);
  sameOwner(prior, b);
  identity(prior.id);
  identity(prior.lastWorkResultId);
  const expected = workPayPeriodOnDate(r, c, date(prior.firstEarnedAt), u);
  basis(r, c, prior, prior.firstEarnedAt, u);
  availableSource(r, prior.source, prior.lastEarnedAt, u);
  if (
    !sameEvidence(r, prior.source, earnedSource(prior.lastEarnedAt), u) ||
    !sameEvidence(r, prior.jobSource, b.jobSource, u) ||
    !sameEvidence(r, prior.paySource, b.paySource, u) ||
    !sameEvidence(r, prior.scheduleSource, b.scheduleSource, u)
  )
    throw new Error(
      "Accrued payroll full Source evidence differs from its original owning basis.",
    );
  if (
    prior.index !== expected.index ||
    prior.fromAt !== expected.fromAt ||
    prior.throughAt !== expected.throughAt ||
    prior.dueAt !== expected.dueAt ||
    date(prior.lastEarnedAt) < prior.firstEarnedAt ||
    prior.lastEarnedAt > expected.throughAt ||
    !Number.isSafeInteger(prior.segmentCount) ||
    prior.segmentCount <= u.zero ||
    !Number.isFinite(prior.plannedMinutes) ||
    prior.plannedMinutes < u.zero ||
    !Number.isFinite(prior.attendedMinutes) ||
    prior.attendedMinutes < u.zero ||
    prior.attendedMinutes > prior.plannedMinutes
  )
    throw new Error(
      "Payroll period no longer matches its original dated earned facts.",
    );
  minor(prior.earnedMinor, u);
  return prior;
}

/** Caller preserves the existing dated attendance/hourly/carry/decision validation. */
export function prepareWorkPayAccrual(
  r: FinanceReadGuard,
  c: WorkPayrollCalendarInput,
  b: WorkPayrollBasis,
  priorLedger: WorkPayrollLedger | undefined,
  priorPeriod: WorkEarnedPayPeriod | undefined,
  shift: WorkEarnedShift,
  periodId: string,
  u: Units,
): Readonly<{ ledger: WorkPayrollLedger; period: WorkEarnedPayPeriod }> {
  u = capturedUnits(r, u);
  shift = guardedRecord(r, shift, u);
  const at = date(r.field(shift, "date")),
    resolved = workPayPeriodOnDate(r, c, at, u);
  c = calendar(r, c, at, u);
  b = basis(r, c, b, at, u);
  const old = readLedger(r, c, b, priorLedger, u);
  identity(periodId);
  identity(shift.id);
  for (const key of [
    "commitmentId",
    "jobId",
    "personId",
    "organizationId",
  ] as const)
    if (shift[key] !== b[key])
      throw new Error("Earned shift has another actual owner.");
  availableSource(r, shift.source, at, u);
  if (
    (old.lastEarnedAt !== undefined && old.lastEarnedAt >= at) ||
    (old.lastSettledPeriodIndex !== undefined &&
      old.lastSettledPeriodIndex >= resolved.index) ||
    !Number.isFinite(shift.plannedMinutes) ||
    shift.plannedMinutes <= u.zero ||
    !Number.isFinite(shift.attendedMinutes) ||
    shift.attendedMinutes < u.zero ||
    !Number.isFinite(shift.absentMinutes) ||
    shift.absentMinutes < u.zero ||
    shift.attendedMinutes > shift.plannedMinutes ||
    shift.absentMinutes !== shift.plannedMinutes - shift.attendedMinutes
  )
    throw new Error("Invalid, duplicate or already settled earned shift.");
  minor(shift.earnedMinor, u);
  if (priorPeriod) {
    priorPeriod = readPeriod(r, c, b, priorPeriod, u);
    if (priorPeriod.id !== periodId || priorPeriod.index !== resolved.index)
      throw new Error(
        "Accrual target differs from the actual open payroll period.",
      );
  }
  const ledger: WorkPayrollLedger = {
    ...old,
    earnedMinor: sum(old.earnedMinor, shift.earnedMinor, u),
    accruedMinor: sum(old.accruedMinor, shift.earnedMinor, u),
    lastEarnedAt: at,
    lastWorkResultId: shift.id,
  };
  const period: WorkEarnedPayPeriod = {
    ...b,
    ...resolved,
    id: periodId,
    firstEarnedAt: priorPeriod?.firstEarnedAt ?? at,
    lastEarnedAt: at,
    lastWorkResultId: shift.id,
    segmentCount: sum(priorPeriod?.segmentCount ?? u.zero, u.one, u),
    plannedMinutes:
      (priorPeriod?.plannedMinutes ?? u.zero) + shift.plannedMinutes,
    attendedMinutes:
      (priorPeriod?.attendedMinutes ?? u.zero) + shift.attendedMinutes,
    earnedMinor: sum(priorPeriod?.earnedMinor ?? u.zero, shift.earnedMinor, u),
    source: earnedSource(at),
  };
  if (
    !Number.isFinite(period.plannedMinutes) ||
    !Number.isFinite(period.attendedMinutes)
  )
    throw new Error("Accrued payroll time overflows.");
  return Object.freeze({ ledger, period });
}

/** A period becomes due once. Re-requested old arrears are not newly recognized wages. */
export function prepareWorkPayrollRequest(
  r: FinanceReadGuard,
  c: WorkPayrollCalendarInput,
  b: WorkPayrollBasis,
  priorLedger: WorkPayrollLedger,
  earnedPeriod: WorkEarnedPayPeriod | undefined,
  at: string,
  receiptId: string,
  u: Units,
): WorkPayrollRequest {
  u = capturedUnits(r, u);
  date(at);
  identity(receiptId);
  c = calendar(r, c, at, u);
  b = basis(r, c, b, at, u);
  const old = readLedger(r, c, b, priorLedger, u),
    firstThrough = periodAtIndex(c, u.zero, u).throughAt,
    lag = daysBetween(date(firstThrough), date(c.firstPaydayAt)),
    throughDate = addDays(date(at), -lag);
  if (throughDate < c.firstPeriodStartsAt)
    throw new Error("Payroll cash may settle only on its recorded payday.");
  const resolved = periodContaining(c, throughDate, u),
    index = resolved.index;
  if (resolved.dueAt !== at)
    throw new Error("Payroll cash may settle only on its recorded payday.");
  if (
    !Number.isSafeInteger(index) ||
    (old.lastSettledPeriodIndex !== undefined &&
      index <= old.lastSettledPeriodIndex)
  )
    throw new Error("Duplicate or stale payroll settlement period.");
  const fromAt = resolved.fromAt,
    throughAt = resolved.throughAt;
  if (earnedPeriod) {
    earnedPeriod = readPeriod(r, c, b, earnedPeriod, u);
    if (
      earnedPeriod.index !== index ||
      earnedPeriod.dueAt !== at ||
      earnedPeriod.earnedMinor > old.accruedMinor
    )
      throw new Error(
        "Payday does not own the original earned period or accrued balance.",
      );
  }
  const newlyDueMinor = earnedPeriod?.earnedMinor ?? u.zero,
    requestedMinor = sum(old.arrearsMinor, newlyDueMinor, u);
  return {
    ...b,
    index,
    fromAt,
    throughAt,
    dueAt: at,
    id: receiptId,
    date: at,
    ...(earnedPeriod ? { earnedPeriodId: earnedPeriod.id } : {}),
    newlyDueMinor,
    arrearsBeforeMinor: old.arrearsMinor,
    requestedMinor,
    source: requestSource(at),
  };
}

/** actualPaidMinor must come from the unchanged conserving finance projection. */
export function prepareWorkPayrollSettlement(
  r: FinanceReadGuard,
  c: WorkPayrollCalendarInput,
  b: WorkPayrollBasis,
  priorLedger: WorkPayrollLedger,
  earnedPeriod: WorkEarnedPayPeriod | undefined,
  request: WorkPayrollRequest,
  actualPaidMinor: number,
  u: Units,
): Readonly<{ ledger: WorkPayrollLedger; receipt: WorkPayrollSettlement }> {
  u = capturedUnits(r, u);
  request = guardedRecord(r, request, u);
  c = calendar(r, c, request.date, u);
  b = basis(r, c, b, request.date, u);
  const expected = prepareWorkPayrollRequest(
    r,
    c,
    b,
    priorLedger,
    earnedPeriod,
    request.date,
    request.id,
    u,
  );
  for (const key of [
    "index",
    "fromAt",
    "throughAt",
    "dueAt",
    "earnedPeriodId",
    "newlyDueMinor",
    "arrearsBeforeMinor",
    "requestedMinor",
  ] as const)
    if (request[key] !== expected[key])
      throw new Error(
        "Payroll request differs from its owned original earned/due terms.",
      );
  sameOwner(request, b);
  availableSource(r, request.source, request.date, u);
  if (
    !sameEvidence(r, request.source, expected.source, u) ||
    !sameEvidence(r, request.jobSource, b.jobSource, u) ||
    !sameEvidence(r, request.paySource, b.paySource, u) ||
    !sameEvidence(r, request.scheduleSource, b.scheduleSource, u)
  )
    throw new Error(
      "Payroll request full Source evidence differs from its original owning basis.",
    );
  const paid = minor(actualPaidMinor, u);
  if (paid > request.requestedMinor)
    throw new Error("Payroll paid exceeds its actual request.");
  const old = readLedger(r, c, b, priorLedger, u),
    arrearsAfterMinor = request.requestedMinor - paid,
    paidArrearsMinor = Math.min(request.arrearsBeforeMinor, paid),
    paidNewlyDueMinor = paid - paidArrearsMinor;
  const ledger: WorkPayrollLedger = {
    ...old,
    dueRecognizedMinor: sum(old.dueRecognizedMinor, request.newlyDueMinor, u),
    paidMinor: sum(old.paidMinor, paid, u),
    accruedMinor: old.accruedMinor - request.newlyDueMinor,
    arrearsMinor: arrearsAfterMinor,
    lastSettledPeriodIndex: request.index,
    lastSettledAt: request.date,
    lastPayrollReceiptId: request.id,
  };
  readLedger(r, c, b, ledger, u);
  return Object.freeze({
    ledger,
    receipt: {
      ...request,
      paidMinor: paid,
      shortfallMinor: arrearsAfterMinor,
      paidArrearsMinor,
      paidNewlyDueMinor,
      missedNewlyDueMinor: request.newlyDueMinor - paidNewlyDueMinor,
      arrearsAfterMinor,
    },
  });
}

/** Readonly validation of already recorded earned stocks; no due request or payment is created. */
export function validateRetainedWorkPayrollObligation(
  r: FinanceReadGuard,
  c: WorkPayrollCalendarInput,
  b: WorkPayrollBasis,
  ledger: WorkPayrollLedger,
  period: WorkEarnedPayPeriod | undefined,
  evidenceAvailableAt: string,
  u: Units,
): void {
  u = capturedUnits(r, u);
  const at = date(evidenceAvailableAt);
  c = calendar(r, c, at, u);
  b = basis(r, c, b, at, u);
  const recorded = readLedger(r, c, b, ledger, u);
  if (recorded.lastEarnedAt !== undefined && recorded.lastEarnedAt > at)
    throw new Error(
      "Retained payroll earning evidence is unavailable at this date.",
    );
  if (period) {
    const earned = readPeriod(r, c, b, period, u),
      last = workPayPeriodOnDate(r, c, earned.lastEarnedAt, u);
    if (
      earned.lastEarnedAt > at ||
      last.index !== earned.index ||
      earned.earnedMinor > recorded.accruedMinor ||
      (recorded.lastSettledPeriodIndex !== undefined &&
        earned.index <= recorded.lastSettledPeriodIndex)
    )
      throw new Error(
        "Retained payroll period is future, spent or outside its genuine earned stocks.",
      );
  }
}

/** Exact recorded period query; it creates no attendance, due request or payment. */
export function workPayPeriodAtIndex(
  r: FinanceReadGuard,
  c: WorkPayrollCalendarInput,
  index: number,
  evidenceAvailableAt: string,
  u: Units,
): WorkPayPeriod {
  u = capturedUnits(r, u);
  c = calendar(r, c, date(evidenceAvailableAt), u);
  return periodAtIndex(c, index, u);
}

/** A calendar opportunity is separate from actual earned wages or available cash. */
export function nextWorkPayrollPeriod(
  r: FinanceReadGuard,
  c: WorkPayrollCalendarInput,
  fromAt: string,
  evidenceAvailableAt: string,
  u: Units,
): WorkPayPeriod {
  u = capturedUnits(r, u);
  c = calendar(r, c, date(evidenceAvailableAt), u);
  const from = date(fromAt),
    first = periodAtIndex(c, u.zero, u);
  if (from <= first.dueAt) return first;
  const lag = daysBetween(date(first.throughAt), date(first.dueAt)),
    current = periodContaining(c, addDays(from, -lag), u);
  return current.dueAt >= from
    ? current
    : periodAtIndex(c, current.index + u.one, u);
}
