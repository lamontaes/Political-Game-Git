import { isExplicitlyControlledPersonV1 } from "../player-control-state-v1";
/** Opening terms and chronological scheduled work; no legacy World or tick. */
import { addDays, makeIsoDate, daysBetweenText } from "../kernel/dates";
import { runWorkPayrollDay } from "../work-payroll-dispatch";
import {
  OPENING_PAYROLL_CALENDAR_STOPGAP,
  openingWorkPayrollCalendars,
} from "../opening-payroll-calendar";
import { stopgap } from "../stopgaps";
import { FinanceReadGuard } from "../finance-plan";

import { careNeedOf } from "./health";
import type {
  ActOffer,
  CoreAPI,
  CoreModule,
  DecisionContext,
  DecisionResult,
  PersonState,
  Source,
  WorkCommitmentInput,
  WorkAttendanceResult,
  WorkScheduleSlot,
} from "../types";
import { fieldsOf } from "../module-fields";
import {
  dateSegments,
  discretionaryHours,
  openingWorkCommitments,
  plannedWorkMinutesBetween,
  plannedWorkMinutesOnDate,
  remainder,
  workData,
} from "../work-reads";
export {
  activityAgeId,
  dateSegments,
  discretionaryHours,
  openingWorkCommitments,
  plannedWorkMinutesBetween,
  plannedWorkMinutesOnDate,
  workWeekStart,
} from "../work-reads";

export { DEFAULT_WORK_DATA } from "../work-data";

export interface OpeningSchedule {
  periodDays: number;
  anchorDate: string;
  slots: readonly WorkScheduleSlot[];
  expectedWeeklyMinutes: number;
  templateJobId?: string;
  source: Source;
}

export function commitmentCalendar(
  row: WorkCommitmentInput,
  api: CoreAPI,
): Map<number, number> {
  const dayMinutes =
    api.parameter("hoursPerDay") * api.parameter("minutesPerHour");
  const anchor = daysBetweenText(api.state.startedAt, row.anchorDate);
  const calendar = new Map<number, number>();
  for (const slot of row.slots)
    for (const part of dateSegments(
      slot,
      dayMinutes,
      api.state.data.parameters,
    )) {
      const residue = remainder(anchor + part.offset, row.periodDays);
      calendar.set(
        residue,
        (calendar.get(residue) ?? api.parameter("zero")) + part.minutes,
      );
    }
  return calendar;
}

export function hasDailyWorkRefresh(
  api: CoreAPI,
  actor: Readonly<PersonState>,
): boolean {
  const core = api.state;
  return (
    core.observer ||
    isExplicitlyControlledPersonV1(core, actor.id) ||
    actor.id === core.playerId ||
    core.focusPersonIds.has(actor.id) ||
    core.focusPlaceIds.has(actor.placeId) ||
    (actor.countyId !== undefined && core.focusPlaceIds.has(actor.countyId))
  );
}

/** Trace retention is circle/player/observer. A place cadence does not grant a trace. */
export function isWorkFocus(
  api: CoreAPI,
  actor: Readonly<PersonState>,
): boolean {
  return (
    api.state.observer ||
    isExplicitlyControlledPersonV1(api.state, actor.id) ||
    actor.id === api.state.playerId ||
    api.state.focusPersonIds.has(actor.id)
  );
}

/** Engine-owned continuation state. Root projects client offers; clients never supply these objects. */
export interface PreparedWorkChoice {
  readonly personId: string;
  readonly commitmentId: string;
  readonly date: string;
  readonly plannedMinutes: number;
  readonly offers: readonly ActOffer[];
  readonly context: DecisionContext | undefined;
}

type WorkRefresh = (
  actor: PersonState,
  needIds?: readonly string[],
) => DecisionContext | undefined;
type WorkChoiceBinding = {
  api: CoreAPI;
  core: CoreAPI["state"];
  reads: FinanceReadGuard;
  actorReads: FinanceReadGuard;
  commitmentId: string;
  jobId: string;
  organizationId: string;
  personId: string;
  date: string;
  planned: number;
  hourlyMinor: number;
  previousCarry: number;
  attendanceEffect: string;
  zero: number;
  minutesPerHour: number;
  offers: readonly ActOffer[];
  status: "ready" | "committing" | "committed";
  committed?: WorkAttendanceResult;
  notified: boolean;
};
const workChoices = new WeakMap<PreparedWorkChoice, WorkChoiceBinding>();
const workChoiceGet = WeakMap.prototype.get;
const workChoiceSet = WeakMap.prototype.set;
const workChoiceFreeze = Object.freeze;
const workChoicePrototypeWitness = Symbol("work-choice-data-prototype");

/** Bounded Source/offer/decision data only; no getter or executable payload is evaluated. */
function captureWorkChoiceData(
  reads: FinanceReadGuard,
  value: unknown,
  zero: number,
  one: number,
  active = new Set<object>(),
): void {
  if (
    typeof value === "function" ||
    typeof value === "symbol" ||
    typeof value === "bigint"
  )
    throw new Error("Work continuation requires saved ordinary data.");
  if (value === null || typeof value !== "object") return;
  if (active.has(value)) throw new Error("Work continuation data has a cycle.");
  const prototype = Object.getPrototypeOf(value);
  if (
    Array.isArray(value)
      ? prototype !== Array.prototype
      : prototype !== Object.prototype && prototype !== null
  )
    throw new Error(
      "Work continuation requires ordinary data rows and arrays.",
    );
  reads.field(
    value as Record<PropertyKey, unknown>,
    workChoicePrototypeWitness,
  );
  active.add(value);
  try {
    for (const key of reads.keys(value))
      captureWorkChoiceData(
        reads,
        reads.field(value as Record<PropertyKey, unknown>, key),
        zero,
        one,
        active,
      );
    if (Array.isArray(value)) reads.array(value, zero, one);
  } finally {
    active.delete(value);
  }
}

/** Same indexed due set and same employer/job order as the autonomous work loop. */
export function enumerateDueWorkItems(
  api: CoreAPI,
): readonly WorkCommitmentInput[] {
  if (!api.state.data.work) return [];
  const elapsed = daysBetweenText(api.state.startedAt, api.state.date);
  const due = new Set<string>();
  for (const [period, residues] of api.state.work.byPeriodResidue)
    for (const id of residues.get(remainder(elapsed, period)) ?? [])
      due.add(id);
  // Dated same-payer order is stable and explicitly a prototype accounting policy.
  return [...due]
    .map((id) => api.state.work.commitments.get(id)!)
    .sort(
      (a, b) =>
        a.organizationId.localeCompare(b.organizationId) ||
        a.jobId.localeCompare(b.jobId),
    );
}

/** Refreshes once and presents actual work offers; never chooses or records attendance. */
export function prepareWorkChoice(
  api: CoreAPI,
  actualItem: WorkCommitmentInput,
  refresh: WorkRefresh,
): PreparedWorkChoice | undefined {
  const reads = new FinanceReadGuard(),
    beforeActorReads = new FinanceReadGuard(),
    core = reads.field(api, "state"),
    dataOwner = reads.field(core, "data"),
    data = reads.field(dataOwner, "work"),
    work = reads.field(core, "work"),
    date = reads.field(core, "date"),
    startedAt = reads.field(core, "startedAt");
  if (!data) return undefined;
  const id = reads.field(actualItem, "id"),
    row = reads.mapGet(reads.field(work, "commitments"), id);
  if (!row || row !== actualItem)
    throw new Error("Work continuation requires the actual owned commitment.");
  const personId = reads.field(row, "personId"),
    jobId = reads.field(row, "jobId"),
    organizationId = reads.field(row, "organizationId"),
    people = reads.field(core, "people"),
    actor = beforeActorReads.mapGet(people, personId),
    job = reads.mapGet(reads.field(core, "jobs"), jobId);
  if (
    !actor ||
    !beforeActorReads.field(actor, "alive") ||
    beforeActorReads.field(actor, "jobId") !== jobId ||
    !job ||
    reads.field(job, "personId") !== beforeActorReads.field(actor, "id")
  )
    return undefined;
  const previous = reads.mapGet(
    reads.field(work, "lastAttendanceByJob"),
    jobId,
  );
  if (previous && reads.field(previous, "date") === date) return undefined;
  const zero = api.parameter("zero"),
    one = api.parameter("one"),
    period = reads.field(row, "periodDays"),
    residue = remainder(daysBetweenText(startedAt, date), period),
    residues = reads.mapGet(reads.field(work, "byPeriodResidue"), period),
    due = residues ? reads.mapGet(residues, residue) : undefined;
  if (!due || !reads.member(due, id))
    throw new Error("Work continuation is not in its actual dated due index.");
  for (const key of ["startsAt", "endsAt", "anchorDate"] as const)
    reads.field(row, key);
  captureWorkChoiceData(reads, reads.field(row, "slots"), zero, one);
  const plannedMap = reads.mapGet(
    reads.field(work, "plannedByCommitmentResidue"),
    id,
  );
  if (plannedMap) reads.mapGet(plannedMap, residue);
  const planned = plannedWorkMinutesOnDate(api, row);
  if (planned <= zero) return undefined;
  reads.field(job, "id");
  reads.field(job, "organizationId");
  reads.field(job, "endsAt");
  const employer = reads.mapGet(
    reads.field(core, "organizations"),
    organizationId,
  );
  if (!employer)
    throw new Error("Work continuation actual employer is absent.");
  reads.field(employer, "id");
  for (const source of [
    reads.field(row, "scheduleSource"),
    reads.field(row, "paySource"),
    reads.field(job, "source"),
    reads.field(employer, "source"),
  ])
    captureWorkChoiceData(reads, source, zero, one);
  const calendarId = reads.field(row, "payrollCalendarId"),
    calendar = calendarId
      ? reads.mapGet(reads.field(work, "payrollCalendars"), calendarId)
      : undefined;
  reads.mapGet(reads.field(work, "payrollCalendarByCommitment"), id);
  reads.mapGet(reads.field(work, "payrollCalendarByJob"), jobId);
  if (calendar) captureWorkChoiceData(reads, calendar, zero, one);
  const attendance = reads.field(data, "attendanceAction"),
    absenceAction = reads.field(data, "absenceAction"),
    sleepParameter = reads.field(data, "sleepReserveParameter"),
    registry = reads.field(dataOwner, "parameters");
  captureWorkChoiceData(reads, attendance, zero, one);
  captureWorkChoiceData(reads, absenceAction, zero, one);
  for (const key of [
    "zero",
    "one",
    "minutesPerHour",
    "hoursPerDay",
    "daysPerWeek",
    sleepParameter,
    "needWeight",
    "goalWeight",
    "driveWeight",
    "traitWeight",
    "emotionWeight",
    "effortWeight",
    "traitScale",
    attendance.emotion?.moodMultiplierParameter ?? "zero",
    attendance.emotion?.stressMultiplierParameter ?? "zero",
    absenceAction.emotion?.moodMultiplierParameter ?? "zero",
    absenceAction.emotion?.stressMultiplierParameter ?? "zero",
    ...(attendance.reasonBindings ?? []).map(
      (binding) => binding.weightParameter,
    ),
    ...(absenceAction.reasonBindings ?? []).map(
      (binding) => binding.weightParameter,
    ),
  ])
    captureWorkChoiceData(reads, reads.field(registry, key), zero, one);
  const previousCarry = previous
      ? reads.field(previous, "payRemainderMinor")
      : zero,
    hourlyMinor = reads.field(row, "hourlyMinor"),
    today = reads.mapGet(reads.field(work, "timeByPerson"), personId);
  if (today)
    for (const key of ["date", "workMinutes", "discretionaryMinutes"] as const)
      reads.field(today, key);
  // Full refresh may replace the actor; only stable work/date/terms survive it.
  const actorId = beforeActorReads.field(actor, "id"),
    placeId = beforeActorReads.field(actor, "placeId"),
    countyId = beforeActorReads.field(actor, "countyId");
  reads.field(core, "observer");
  reads.field(core, "playerId");
  reads.member(reads.field(core, "focusPersonIds"), actorId);
  reads.member(reads.field(core, "focusPlaceIds"), placeId);
  if (countyId !== undefined)
    reads.member(reads.field(core, "focusPlaceIds"), countyId);
  beforeActorReads.verify();
  reads.verify();
  api.stopgap("SG-P8-attendance-choice");
  api.stopgap("SG-P8-work-pay-terms");
  const context = hasDailyWorkRefresh(api, actor)
    ? refresh(actor)
    : refresh(actor, [attendance.need, absenceAction.need]);
  reads.verify();
  const actorReads = new FinanceReadGuard(),
    currentActor = actorReads.mapGet(people, personId);
  if (
    !currentActor ||
    actorReads.field(currentActor, "id") !== personId ||
    !actorReads.field(currentActor, "alive") ||
    actorReads.field(currentActor, "jobId") !== jobId
  )
    throw new Error("Work continuation owner changed during refresh.");
  for (const key of ["traits", "needs", "affect", "source"] as const)
    captureWorkChoiceData(
      actorReads,
      actorReads.field(currentActor, key),
      zero,
      one,
    );
  for (const key of ["goals", "drives"] as const)
    actorReads.payload(actorReads.field(currentActor, key), zero, one);
  const traits = actorReads.field(currentActor, "traits"),
    pulls = reads.field(dataOwner, "traitPulls");
  for (const key of actorReads.keys(traits))
    if (typeof key === "string")
      captureWorkChoiceData(reads, reads.field(pulls, key), zero, one);
  for (const binding of [
    ...(attendance.reasonBindings ?? []),
    ...(absenceAction.reasonBindings ?? []),
  ])
    reads.mapGet(reads.field(core, "reasonProviders"), binding.provider);
  captureWorkChoiceData(reads, context, zero, one);
  const available = discretionaryHours(api, personId),
    minutesPerHour = api.parameter("minutesPerHour"),
    hours = planned / minutesPerHour,
    absence: ActOffer = {
      definition: absenceAction,
      targetId: id,
      availableHours: available,
      effortHours: zero,
    },
    attendanceOffer: ActOffer = {
      definition: attendance,
      targetId: id,
      availableHours: available,
      effortHours: hours,
    },
    offers =
      hours <= available && available > zero
        ? [attendanceOffer, absence]
        : [absence];
  for (const offer of offers) workChoiceFreeze(offer);
  workChoiceFreeze(offers);
  captureWorkChoiceData(reads, offers, zero, one);
  const attendanceEffect = reads.field(attendance, "effect");
  reads.field(api, "recordWorkAttendance");
  reads.seal();
  actorReads.seal();
  const prepared: PreparedWorkChoice = workChoiceFreeze({
    personId,
    commitmentId: id,
    date,
    plannedMinutes: planned,
    offers,
    context,
  });
  workChoiceSet.call(workChoices, prepared, {
    api,
    core,
    reads,
    actorReads,
    commitmentId: id,
    jobId,
    organizationId,
    personId,
    date,
    planned,
    hourlyMinor,
    previousCarry,
    attendanceEffect,
    zero,
    minutesPerHour,
    offers,
    status: "ready",
    notified: false,
  } satisfies WorkChoiceBinding);
  return prepared;
}

/** Preserve the existing dated-work domain rejection while identifying stale continuation reads. */
function verifyPreparedWorkChoice(binding: WorkChoiceBinding): void {
  try {
    binding.actorReads.verify();
    binding.reads.verify();
  } catch (error) {
    throw new Error(
      "Invalid or duplicate dated work result. " +
        (error instanceof Error
          ? error.message
          : "Stale work continuation reads."),
    );
  }
}

/** Read-only root continuation preflight, before accepting a client ID or progressing time. */
export function verifyWorkChoiceV1(
  api: CoreAPI,
  prepared: PreparedWorkChoice,
): void {
  const binding = workChoiceGet.call(workChoices, prepared) as
    WorkChoiceBinding | undefined;
  if (!binding || binding.api !== api || binding.status !== "ready")
    throw new Error("Work continuation is foreign or already consumed.");
  verifyPreparedWorkChoice(binding);
}

/** Root passes its original saved decision, never client amounts, durations, Source or score payloads. */
export function commitWorkChoice(
  api: CoreAPI,
  prepared: PreparedWorkChoice,
  originalSavedDecision: DecisionResult,
): WorkAttendanceResult {
  const binding = workChoiceGet.call(workChoices, prepared) as
    WorkChoiceBinding | undefined;
  if (!binding || binding.api !== api || binding.status !== "ready")
    throw new Error("Work continuation is foreign or already consumed.");
  verifyPreparedWorkChoice(binding);
  const decisionReads = new FinanceReadGuard(),
    one = api.parameter("one");
  captureWorkChoiceData(
    decisionReads,
    originalSavedDecision,
    binding.zero,
    one,
  );
  const selected = decisionReads.field(originalSavedDecision, "selected");
  if (!selected) throw new Error("Work attendance has no admitted decision.");
  if (
    !binding.offers.includes(selected) ||
    decisionReads.field(originalSavedDecision, "actorId") !==
      binding.personId ||
    decisionReads.field(originalSavedDecision, "date") !== binding.date
  )
    throw new Error(
      "Work continuation decision does not select its original actual offer.",
    );
  const effect = decisionReads.field(
      decisionReads.field(selected, "definition"),
      "effect",
    ),
    attended =
      effect === binding.attendanceEffect ? binding.planned : binding.zero,
    exact =
      binding.previousCarry +
      (binding.hourlyMinor * attended) / binding.minutesPerHour,
    requested = Math.floor(exact),
    carry = exact - requested,
    result = {
      id: `work-result:${binding.date}:${binding.commitmentId}`,
      commitmentId: binding.commitmentId,
      jobId: binding.jobId,
      personId: binding.personId,
      organizationId: binding.organizationId,
      date: binding.date,
      plannedMinutes: binding.planned,
      attendedMinutes: attended,
      absentMinutes: binding.planned - attended,
      earnedMinor: requested,
      payRemainderMinor: carry,
      reasonKey: decisionReads.field(originalSavedDecision, "reasonKey"),
      decision: originalSavedDecision,
      source: {
        tag: "SOURCED" as const,
        asOf: binding.date,
        citation:
          "Actual prototype owned-job attendance decision, occupied minutes and earned pay; cash follows the separately recorded employer payday. Fictional schedule/pay inputs retain their own source estimates.",
      },
    };
  // No stale answer can enter the canonical writer. The writer retains every final guard.
  decisionReads.verify();
  verifyPreparedWorkChoice(binding);
  binding.status = "committing";
  const committed = api.recordWorkAttendance(result);
  binding.committed = committed;
  binding.status = "committed";
  return committed;
}

/** The engines that hear each attendance, in registration order, kept per registry size. */
const attendanceHooks = new WeakMap<
  ReadonlyMap<string, CoreModule>,
  { size: number; hooks: readonly CoreModule[] }
>();
// Outside tests engines are only ever added to the registry (registerModule),
// so the same registry at the same size holds the same engines in the same
// order: no walk per attendance. A test that replaces or deletes an engine
// after an attendance uses a fresh world.
function workAttendanceHooks(api: CoreAPI): readonly CoreModule[] {
  const modules = api.state.modules;
  let kept = attendanceHooks.get(modules);
  if (!kept || kept.size !== modules.size)
    attendanceHooks.set(
      modules,
      (kept = {
        size: modules.size,
        hooks: [...modules.values()].filter((m) => m.onWorkAttendance),
      }),
    );
  return kept.hooks;
}

/** Separate cursor step, preserving the original callback order without replaying attendance. */
export function notifyWorkChoice(
  api: CoreAPI,
  prepared: PreparedWorkChoice,
): void {
  const binding = workChoiceGet.call(workChoices, prepared) as
    WorkChoiceBinding | undefined;
  if (
    !binding ||
    binding.api !== api ||
    binding.status !== "committed" ||
    binding.notified
  )
    throw new Error(
      "Work continuation notification is absent, foreign or already delivered.",
    );
  const reads = new FinanceReadGuard(),
    core = reads.field(api, "state");
  if (
    core !== binding.core ||
    reads.field(core, "date") !== binding.date ||
    reads.mapGet(
      reads.field(reads.field(core, "work"), "lastAttendanceByJob"),
      binding.jobId,
    ) !== binding.committed
  )
    throw new Error(
      "Work continuation notification no longer owns its current attendance.",
    );
  reads.verify();
  binding.notified = true;
  for (const module of workAttendanceHooks(api))
    module.onWorkAttendance!(api, binding.committed!);
  // No financial-pressure event or civic drive is synthesized by this module.
}

/** Work decisions use the same recorded named reasons and trait pulls as other acts. */
/**
 * The hours each person's office takes from their day today, from that
 * office's own records (office-hours-never-fill-an-officials-day): a state
 * legislator's session, committee and caucus days, a town body's meetings, a
 * salaried post's weekday. Each engine's module that keeps an office's days
 * carries one (`officeTime`); a person's office time is the sum of what each
 * says.
 */
/** An office's hours in a day and the record they come from (an entry, a meeting, a post). */
export interface OfficeTime {
  readonly hours: number;
  readonly sourceId: string;
}

/** Office hours already put on each person's day today, so no office is counted twice. */
const officeCharged = new WeakMap<
  object,
  { date: string; hours: Map<string, OfficeTime> }
>();

/**
 * The office hours on a person's day today and the record they come from,
 * for dev mode's person view (office-hours-never-fill-an-officials-day); null
 * when no office took any of it.
 */
export function officeTimeToday(
  api: CoreAPI,
  personId: string,
): OfficeTime | null {
  const kept = officeCharged.get(api.state);
  return kept?.date === api.state.date
    ? (kept.hours.get(personId) ?? null)
    : null;
}

/**
 * Put `hours` of office time on a person's day, less what their office has
 * already taken today: the day's longest office record stands for the day (a
 * session day at the Capitol holds its committee and caucus). Read by the
 * day's pass below and by an office day the player lives (office-day-state.ts
 * `actOn`), so the two never count the same day twice.
 */
export function chargeOfficeHours(
  api: CoreAPI,
  personId: string,
  hours: number,
  sourceId: string,
): void {
  if (!api.state.data.work || !api.state.people.has(personId)) return;
  let kept = officeCharged.get(api.state);
  if (!kept || kept.date !== api.state.date) {
    kept = { date: api.state.date, hours: new Map() };
    officeCharged.set(api.state, kept);
  }
  const already = kept.hours.get(personId)?.hours ?? api.parameter("zero");
  if (hours <= already) return;
  kept.hours.set(personId, { hours, sourceId });
  api.recordOfficeTime(
    personId as PersonState["id"],
    (hours - already) * api.parameter("minutesPerHour"),
  );
}

/** Each office's hours today, on its holder's day, before anyone's shift or free time. */
function chargeOfficeTime(api: CoreAPI, excludePersonId?: string): void {
  const total = new Map<string, OfficeTime>();
  for (const reader of fieldsOf(api.state, "officeTime"))
    for (const [personId, time] of reader(api) as ReadonlyMap<
      string,
      OfficeTime
    >) {
      const held = total.get(personId);
      total.set(
        personId,
        held
          ? {
              hours: held.hours + time.hours,
              sourceId: `${held.sourceId} ${time.sourceId}`,
            }
          : time,
      );
    }
  for (const [personId, time] of total)
    if (personId !== excludePersonId && api.state.people.get(personId)?.alive)
      chargeOfficeHours(api, personId, time.hours, time.sourceId);
}

/**
 * One day of work: every scheduled shift is attended or missed by its worker's own decision, then the day's payroll
 * runs. The module's `onDay` and the controlled person's own day both run it, so the clock's day and the player's day
 * are one function; the controlled person (when there is one) is left out of the shifts, who are the clock's.
 */
export function runWorkDay(
  api: CoreAPI,
  decide: (
    personId: string,
    offers: readonly ActOffer[],
    context?: DecisionContext,
  ) => DecisionResult,
  refresh: (
    actor: PersonState,
    needIds?: readonly string[],
  ) => DecisionContext | undefined,
  controlledPersonId?: string,
): { decisions: number; acts: number } {
  const attendance = runScheduledWork(api, decide, refresh, controlledPersonId);
  runWorkPayrollDay(api);
  return attendance;
}

export function runScheduledWork(
  api: CoreAPI,
  decide: (
    personId: string,
    offers: readonly ActOffer[],
    context?: DecisionContext,
  ) => DecisionResult,
  refresh: (
    actor: PersonState,
    needIds?: readonly string[],
  ) => DecisionContext | undefined,
  excludePersonId?: string,
): { decisions: number; acts: number } {
  const data = api.state.data.work;
  if (!data)
    return { decisions: api.parameter("zero"), acts: api.parameter("zero") };
  let decisions = api.parameter("zero"),
    acts = api.parameter("zero");
  // An official's office comes first: a session day takes the day a shift
  // would have had (office-hours-never-fill-an-officials-day).
  chargeOfficeTime(api, excludePersonId);
  const p = api.parameter;
  const elapsed = daysBetweenText(api.state.startedAt, api.state.date);
  const due = new Set<string>();
  for (const [period, residues] of api.state.work.byPeriodResidue)
    for (const id of residues.get(remainder(elapsed, period)) ?? [])
      due.add(id);
  // Dated same-payer order is stable and explicitly a prototype accounting policy.
  const ordered = [...due]
    .map((id) => api.state.work.commitments.get(id)!)
    .sort(
      (a, b) =>
        a.organizationId.localeCompare(b.organizationId) ||
        a.jobId.localeCompare(b.jobId),
    );
  for (const row of ordered) {
    if (excludePersonId !== undefined && row.personId === excludePersonId)
      continue;
    const actor = api.state.people.get(row.personId);
    const job = api.state.jobs.get(row.jobId);
    if (
      !actor?.alive ||
      actor.jobId !== row.jobId ||
      job?.personId !== actor.id
    )
      continue;
    const previous = api.state.work.lastAttendanceByJob.get(row.jobId);
    if (previous?.date === api.state.date) continue;
    const planned = plannedWorkMinutesOnDate(api, row);
    if (planned <= p("zero")) continue;
    api.stopgap("SG-P8-attendance-choice");
    api.stopgap("SG-P8-work-pay-terms");
    const context = hasDailyWorkRefresh(api, actor)
      ? refresh(actor)
      : refresh(actor, [data.attendanceAction.need, data.absenceAction.need]);
    const available = discretionaryHours(api, actor.id);
    const hours = planned / p("minutesPerHour");
    const absence: ActOffer = {
      definition: data.absenceAction,
      targetId: row.id,
      availableHours: available,
      effortHours: p("zero"),
    };
    const attendance: ActOffer = {
      definition: data.attendanceAction,
      targetId: row.id,
      availableHours: available,
      effortHours: hours,
    };
    const offers =
      hours <= available && available > p("zero")
        ? [attendance, absence]
        : [absence];
    const decision = decide(actor.id, offers, context);
    if (!decision.selected)
      throw new Error("Work attendance has no admitted decision.");
    const attended =
      decision.selected.definition.effect === data.attendanceAction.effect
        ? planned
        : p("zero");
    const exact =
      (previous?.payRemainderMinor ?? p("zero")) +
      (row.hourlyMinor * attended) / p("minutesPerHour");
    const requested = Math.floor(exact),
      carry = exact - requested;
    const result = {
      id: `work-result:${api.state.date}:${row.id}`,
      commitmentId: row.id,
      jobId: row.jobId,
      personId: actor.id,
      organizationId: row.organizationId,
      date: api.state.date,
      plannedMinutes: planned,
      attendedMinutes: attended,
      absentMinutes: planned - attended,
      earnedMinor: requested,
      payRemainderMinor: carry,
      reasonKey: decision.reasonKey,
      decision,
      source: {
        tag: "SOURCED" as const,
        asOf: api.state.date,
        citation:
          "Actual prototype owned-job attendance decision, occupied minutes and earned pay; cash follows the separately recorded employer payday. Fictional schedule/pay inputs retain their own source estimates.",
      },
    };
    const committed = api.recordWorkAttendance(result);
    decisions += p("one");
    acts += p("one");
    for (const module of workAttendanceHooks(api))
      module.onWorkAttendance!(api, committed);
    // No financial-pressure event or civic drive is synthesized by this module.
  }
  return { decisions, acts };
}

export function recordDiscretionaryActivity(
  api: CoreAPI,
  personId: string,
  offer: ActOffer,
): void {
  if (!api.state.data.work) return;
  const hours =
    offer.effortHours ?? api.parameter(offer.definition.effortParameter);
  const minutes = hours * api.parameter("minutesPerHour");
  api.recordDiscretionaryTime(personId, minutes);
  const category =
    workData(api).primaryActivityCrosswalk.find(
      (row) => row.effect === offer.definition.effect,
    )?.category ?? `unmapped:${offer.definition.effect}`;
  api.recordActivityTime(personId, category, minutes, {
    tag: "ESTIMATED",
    asOf: api.state.date,
    citation:
      "Actual selected prototype act and its registered assumed duration, not an observed diary duration.",
    estimatedFrom:
      "Attempt/time duration follows the admitted offer. Crosswalk limitations remain explicit and unmodeled primary activities are not assigned fabricated minutes.",
  });
}

/** A pure click-time read. Work already happened on dates, never as a retrospective choice. */
export function catchUpScheduledWork(
  api: CoreAPI,
  personId: string,
): readonly {
  jobId: string;
  throughDate: string;
  plannedSinceOpening: number;
  attendedMinutes: number;
  paidMinor: number;
}[] {
  return [...(api.state.work.commitmentsByPerson.get(personId) ?? [])].map(
    (id) => {
      const row = api.state.work.commitments.get(id)!;
      const totals = api.state.work.totalsByJob.get(row.jobId);
      return {
        jobId: row.jobId,
        throughDate: api.state.date,
        plannedSinceOpening: plannedWorkMinutesBetween(
          row,
          addDays(makeIsoDate(api.state.startedAt), api.parameter("one")),
          api.state.date,
          api.state.data.parameters,
        ),
        attendedMinutes: totals?.attendedMinutes ?? api.parameter("zero"),
        paidMinor: totals?.paidMinor ?? api.parameter("zero"),
      };
    },
  );
}

export const WORK_MODULE: CoreModule = {
  id: "core2-recorded-work-v1",
  // The recorded commitments of each person's primary job and the pay calendars
  // they sit on, worked out from the opening's own records; where a calendar
  // had to be estimated, the stopgap is registered once the core exists.
  prepareOpening: (input, { data }) => {
    if (!data.work) return { input };
    const primaryJobByPerson = new Map(
      input.people.map((person) => [person.id, person.jobId]),
    );
    const payroll = openingWorkPayrollCalendars(
      {
        ...input,
        workCommitments:
          input.workCommitments ??
          openingWorkCommitments(
            input.jobs.filter(
              (job) =>
                primaryJobByPerson.get(job.personId) === job.id &&
                (job.endsAt === undefined || job.endsAt > input.startedAt),
            ),
            input.organizations,
            input.startedAt,
            data.work,
            data.parameters,
          ),
      },
      { parameters: data.parameters },
    );
    return {
      input: {
        ...input,
        workCommitments: payroll.workCommitments,
        workPayrollCalendars: payroll.calendars,
        gaps: [...input.gaps, ...payroll.gaps],
      },
      afterOpen: (core) => {
        if (payroll.estimates.length)
          stopgap(OPENING_PAYROLL_CALENDAR_STOPGAP, core);
      },
    };
  },
  reasonProviders: {
    // A person stays home from a shift mostly because they are ill: their own
    // health record's care need (health.ts `careNeedOf`, 0 to 1, a sliding
    // scale) is the absence offer's reason, so circumstances, not temperament,
    // decide most missed shifts (BLS CPS 2023: illness is about two thirds of
    // full-time absence).
    "work.own-illness": (api, actor) => {
      const need = careNeedOf(api.state, actor.id);
      return need > api.parameter("zero")
        ? { value: need, sourceIds: [`health:${actor.id}`] }
        : undefined;
    },
  },
  onDay(api, decide, refresh) {
    return runWorkDay(api, decide, refresh);
  },
  // Results mode (time nobody watches): attendance is each worker's own dated
  // decision and pay follows it, so a skipped month records no shift and pays
  // no full worker; counted workers are paid by the residents engine.
  onResultsMonth(api) {
    // stopgapId: SG-SPEED-results-mode-work-attendance (a skipped month records no full worker's attendance and pays none)
    api.stopgap("SG-SPEED-results-mode-work-attendance");
  },
};
