/** The work engine's front door for reads: a person's commitments, a job's last attendance, a payroll calendar. Each function answers one question; none hands back a map. */
import type {
  CoreAPI,
  CoreState,
  JobInput,
  OrganizationInput,
  Source,
  WorkAttendanceResult,
  WorkCommitmentInput,
  WorkData,
  WorkScheduleSlot,
} from "./types";
import {
  addDays,
  makeIsoDate,
  weekdayOf,
  daysBetweenText,
  ageOnDate,
} from "./kernel/dates";
import type { OpeningSchedule } from "./modules/work";
import { type Parameter, PARAMETERS, parameter } from "./parameters";
import { DEFAULT_WORK_DATA } from "./work-data";

/** A payroll calendar, as the work engine keeps it. */
export type PayrollCalendar = NonNullable<
  ReturnType<CoreState["work"]["payrollCalendars"]["get"]>
>;

/** One work commitment by its id. */
export function commitmentOf(
  core: CoreState,
  commitmentId: string,
): WorkCommitmentInput | undefined {
  return core.work.commitments.get(commitmentId);
}

/** Every work commitment. */
export function allCommitments(core: CoreState): Iterable<WorkCommitmentInput> {
  return core.work.commitments.values();
}

/** The ids of a person's work commitments. */
export function commitmentIdsOf(
  core: CoreState,
  personId: string,
): ReadonlySet<string> | undefined {
  return core.work.commitmentsByPerson.get(personId);
}

/** A person's work commitments. */
export function commitmentsOf(
  core: CoreState,
  personId: string,
): readonly WorkCommitmentInput[] {
  const out: WorkCommitmentInput[] = [];
  for (const id of core.work.commitmentsByPerson.get(personId) ?? []) {
    const row = core.work.commitments.get(id);
    if (row) out.push(row);
  }
  return out;
}

/** The latest attendance recorded for a job. */
export function lastAttendanceOf(
  core: CoreState,
  jobId: string,
): WorkAttendanceResult | undefined {
  return core.work.lastAttendanceByJob.get(jobId);
}

/** One payroll calendar by its id. */
export function payrollCalendarOf(
  core: CoreState,
  calendarId: string,
): PayrollCalendar | undefined {
  return core.work.payrollCalendars.get(calendarId);
}

export const remainder = (value: number, period: number) =>
  ((value % period) + period) % period;

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
          ? addDays(makeIsoDate(startedAt), -weekdayOf(startedAt))
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
  const first = daysBetweenText(anchor, from);
  const last = daysBetweenText(anchor, through);
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
  const elapsed = daysBetweenText(api.state.startedAt, date);
  return (
    api.state.work.plannedByCommitmentResidue
      .get(row.id)
      ?.get(remainder(elapsed, row.periodDays)) ?? api.parameter("zero")
  );
}

export function workData(api: CoreAPI): WorkData {
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

export function workWeekStart(date: string, api: CoreAPI): string {
  const day = weekdayOf(date);
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
  const age = ageOnDate(actor.birthDate, api.state.date);
  return (
    workData(api).activityAgeRows.find(
      (row) =>
        age >= api.parameter(row.minimumAgeParameter) &&
        (!row.maximumAgeParameter ||
          age < api.parameter(row.maximumAgeParameter)),
    )?.id ?? "below-reference-age"
  );
}
