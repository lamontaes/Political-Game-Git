import { isExplicitlyControlledPersonV1 } from "../player-control-state-v1";
/** Opening terms and chronological scheduled work; no legacy World or tick. */
import { DEFAULT_WORK_DATA } from "../work-data";
import { addDays, ageOnDate, daysBetween, makeIsoDate } from "../kernel/dates";
import { parameter, PARAMETERS } from "../parameters";
import { runWorkPayrollDay } from "../work-payroll-dispatch";
import { FinanceReadGuard } from "../finance-plan";
import { careNeedOf } from "./health";
import type { Parameter } from "../parameters";
import type {
  ActOffer,
  CoreAPI,
  CoreModule,
  DecisionContext,
  DecisionResult,
  JobInput,
  OrganizationInput,
  PersonState,
  Source,
  WorkCommitmentInput,
  WorkAttendanceResult,
  WorkData,
  WorkScheduleSlot,
} from "../types";

export { DEFAULT_WORK_DATA } from "../work-data";

const remainder = (value: number, period: number) =>
  ((value % period) + period) % period;

export interface OpeningSchedule {
  periodDays: number;
  anchorDate: string;
  slots: readonly WorkScheduleSlot[];
  expectedWeeklyMinutes: number;
  templateJobId?: string;
  source: Source;
}

/** This adapter declares fictional opening commitments, never an attendance outcome. */
export function openingWorkCommitments(
  jobs: readonly JobInput[],
  organizations: readonly OrganizationInput[],
  startedAt: string,
  data: WorkData = DEFAULT_WORK_DATA,
  registry: Readonly<Record<string, Parameter>> = PARAMETERS,
  suppliedSchedules: ReadonlyMap<string, OpeningSchedule> = new Map(),
): readonly WorkCommitmentInput[] {
  const p = (key: string) => parameter(key, registry);
  const employers = new Map(organizations.map((row) => [row.id, row]));
  const result: WorkCommitmentInput[] = [];
  for (const job of jobs) {
    if (job.hoursDaily <= p("zero")) continue;
    const employer = employers.get(job.organizationId);
    if (!employer)
      throw new Error("Opening work requires the recorded employer.");
    const mapped = data.classificationPatterns.find((row) =>
      employer.classification?.startsWith(row.prefix),
    );
    const pattern = data.patterns.find(
      (row) => row.id === (mapped?.patternId ?? data.fallbackPatternId),
    );
    if (!pattern || pattern.slots.length <= p("zero"))
      throw new Error("Opening work has no configured schedule pattern.");
    const supplied = suppliedSchedules.get(job.id);
    const periodDays = supplied?.periodDays ?? p(pattern.periodDaysParameter);
    const weeklyMinutes =
      job.hoursDaily * p("daysPerWeek") * p("minutesPerHour");
    const minutes =
      (weeklyMinutes * periodDays) / p("daysPerWeek") / pattern.slots.length;
    const slots =
      supplied?.slots ??
      pattern.slots.map((row) => ({
        offsetDays: p(row.offsetParameter),
        startMinute: p(row.startMinuteParameter),
        minutes,
      }));
    const hourlyMinor =
      job.hourlyMinor ?? Math.round(job.wageDailyMinor / job.hoursDaily);
    const scheduleSource: Source = supplied?.source ?? {
      ...pattern.source,
      asOf: startedAt,
      tag: "ESTIMATED",
      estimatedFrom: `${pattern.source.estimatedFrom} Recorded weekly minutes ${weeklyMinutes}; pattern ${pattern.id}. Timings are uncalibrated assumptions, not observed employer hours.`,
    };
    result.push({
      id: `work-commitment:${job.id}`,
      jobId: job.id,
      personId: job.personId,
      organizationId: job.organizationId,
      startsAt: startedAt,
      anchorDate:
        supplied?.anchorDate ??
        (pattern.anchorOperation === "civil-week"
          ? addDays(
              makeIsoDate(startedAt),
              -new Date(makeIsoDate(startedAt)).getUTCDay(),
            )
          : pattern.anchorOperation === "opening-date"
            ? makeIsoDate(startedAt)
            : (() => {
                throw new Error("Unregistered work anchor operation.");
              })()),
      periodDays,
      slots,
      expectedWeeklyMinutes: supplied?.expectedWeeklyMinutes ?? weeklyMinutes,
      hourlyMinor,
      scheduleTemplateJobId: supplied?.templateJobId,
      scheduleSource,
      paySource: {
        ...job.source,
        tag: "ESTIMATED",
        estimatedFrom: `${job.source.estimatedFrom ?? job.source.citation} Opening hourly payment terms are a prototype projection of the recorded SOC proxy; no historical hourly contract, salary entitlement or tax treatment is inferred.${job.hourlyMinor === undefined ? " Hourly rate recovered from rounded calendar-average pay; rounding provenance remains a gap." : ""}`,
      },
    });
  }
  return result;
}

/** Constant-time periodic counting per slot, including midnight overflow. */
function occurrences(
  anchor: string,
  offset: number,
  period: number,
  from: string,
  through: string,
  registry: Readonly<Record<string, Parameter>>,
): number {
  const p = (key: string) => parameter(key, registry);
  const first = daysBetween(makeIsoDate(anchor), makeIsoDate(from));
  const last = daysBetween(makeIsoDate(anchor), makeIsoDate(through));
  return last < first
    ? p("zero")
    : Math.max(
        p("zero"),
        Math.floor((last - offset) / period) -
          Math.floor((first - p("one") - offset) / period),
      );
}

export function dateSegments(
  slot: WorkScheduleSlot,
  dayMinutes: number,
  registry: Readonly<Record<string, Parameter>>,
): readonly { offset: number; minutes: number }[] {
  const p = (key: string) => parameter(key, registry);
  const same = Math.min(slot.minutes, dayMinutes - slot.startMinute);
  const overflow = slot.minutes - same;
  return [
    { offset: slot.offsetDays, minutes: same },
    ...(overflow > p("zero")
      ? [{ offset: slot.offsetDays + p("one"), minutes: overflow }]
      : []),
  ];
}

/** Calendar bounds are facts; no future attendance or paycheck is generated by this query. */
export function plannedWorkMinutesBetween(
  row: WorkCommitmentInput,
  from: string,
  through: string,
  registry: Readonly<Record<string, Parameter>> = PARAMETERS,
): number {
  const p = (key: string) => parameter(key, registry);
  const first = [makeIsoDate(from), makeIsoDate(row.startsAt)]
    .sort()
    .at(-p("one"))!;
  const last =
    row.endsAt && row.endsAt < through ? row.endsAt : makeIsoDate(through);
  if (last < first) return p("zero");
  const dayMinutes = p("hoursPerDay") * p("minutesPerHour");
  return row.slots.reduce(
    (total, slot) =>
      total +
      dateSegments(slot, dayMinutes, registry).reduce(
        (sum, segment) =>
          sum +
          segment.minutes *
            occurrences(
              row.anchorDate,
              segment.offset,
              row.periodDays,
              [
                first,
                addDays(
                  makeIsoDate(row.startsAt),
                  segment.offset - slot.offsetDays,
                ),
              ]
                .sort()
                .at(-p("one"))!,
              last,
              registry,
            ),
        p("zero"),
      ),
    p("zero"),
  );
}

export function commitmentCalendar(
  row: WorkCommitmentInput,
  api: CoreAPI,
): Map<number, number> {
  const dayMinutes =
    api.parameter("hoursPerDay") * api.parameter("minutesPerHour");
  const anchor = daysBetween(
    makeIsoDate(api.state.startedAt),
    makeIsoDate(row.anchorDate),
  );
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
export function plannedWorkMinutesOnDate(
  api: CoreAPI,
  row: WorkCommitmentInput,
  date: string = api.state.date,
): number {
  if (date < row.startsAt || (row.endsAt !== undefined && date > row.endsAt))
    return api.parameter("zero");
  // The first contractual day may contain an overflow from a prior, ineligible origin.
  if (date === row.startsAt)
    return plannedWorkMinutesBetween(
      row,
      date,
      date,
      api.state.data.parameters,
    );
  const elapsed = daysBetween(
    makeIsoDate(api.state.startedAt),
    makeIsoDate(date),
  );
  return (
    api.state.work.plannedByCommitmentResidue
      .get(row.id)
      ?.get(remainder(elapsed, row.periodDays)) ?? api.parameter("zero")
  );
}

function workData(api: CoreAPI): WorkData {
  const data = api.state.data.work;
  if (!data) throw new Error("Scheduled work requires registered work data.");
  return data;
}

export function discretionaryHours(api: CoreAPI, personId: string): number {
  const data = api.state.data.work;
  if (!data) return api.parameter("hoursPerDay");
  const today = api.state.work.timeByPerson.get(personId);
  const used =
    today?.date === api.state.date
      ? today.workMinutes + today.discretionaryMinutes
      : api.parameter("zero");
  return Math.max(
    api.parameter("zero"),
    api.parameter("hoursPerDay") -
      api.parameter(data.sleepReserveParameter) -
      used / api.parameter("minutesPerHour"),
  );
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
  const elapsed = daysBetween(
    makeIsoDate(api.state.startedAt),
    makeIsoDate(api.state.date),
  );
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
    residue = remainder(
      daysBetween(makeIsoDate(startedAt), makeIsoDate(date)),
      period,
    ),
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
  for (const module of api.state.modules.values())
    module.onWorkAttendance?.(api, binding.committed!);
  // No financial-pressure event or civic drive is synthesized by this module.
}

/** Work decisions use the same recorded named reasons and trait pulls as other acts. */
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
  const p = api.parameter;
  const elapsed = daysBetween(
    makeIsoDate(api.state.startedAt),
    makeIsoDate(api.state.date),
  );
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
    for (const module of api.state.modules.values())
      module.onWorkAttendance?.(api, committed);
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

export function workWeekStart(date: string, api: CoreAPI): string {
  const day = new Date(makeIsoDate(date)).getUTCDay();
  const offset = remainder(
    day - api.parameter("mondayIndex"),
    api.parameter("daysPerWeek"),
  );
  return addDays(makeIsoDate(date), -offset);
}

/** Small age accounting crosswalk, independent of report/test expectations. */
export function activityAgeId(api: CoreAPI, personId: string): string {
  const actor = api.state.people.get(personId);
  if (!actor) throw new Error("Time actor is absent.");
  const age = ageOnDate(
    makeIsoDate(actor.birthDate),
    makeIsoDate(api.state.date),
  );
  return (
    workData(api).activityAgeRows.find(
      (row) =>
        age >= api.parameter(row.minimumAgeParameter) &&
        (!row.maximumAgeParameter ||
          age < api.parameter(row.maximumAgeParameter)),
    )?.id ?? "below-reference-age"
  );
}

export const WORK_MODULE: CoreModule = {
  id: "core2-recorded-work-v1",
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
    const attendance = runScheduledWork(api, decide, refresh);
    runWorkPayrollDay(api);
    return attendance;
  },
};
