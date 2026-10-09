/** Opening terms and chronological scheduled work; no legacy World or tick. */
import workJson from "../data/work.json" with { type: "json" };
import {
  addDays,
  ageOnDate,
  daysBetween,
  makeIsoDate,
} from "../../simulation/dates";
import { parameter, PARAMETERS } from "../parameters";
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
  WorkData,
  WorkScheduleSlot,
} from "../types";

export const DEFAULT_WORK_DATA: WorkData = {
  ...workJson,
  patterns: workJson.patterns.map((row) => ({
    ...row,
    source: { ...row.source, tag: "ESTIMATED" as const },
  })),
};

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
    actor.id === api.state.playerId ||
    api.state.focusPersonIds.has(actor.id)
  );
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
    const actor = api.state.people.get(row.personId);
    const job = api.state.jobs.get(row.jobId);
    if (
      !actor?.alive ||
      actor.jobId !== row.jobId ||
      job?.personId !== actor.id
    )
      continue;
    const previous = api.state.work.lastResultByJob.get(row.jobId);
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
      requestedMinor: requested,
      payRemainderMinor: carry,
      reasonKey: decision.reasonKey,
      decision,
      source: {
        tag: "SOURCED" as const,
        asOf: api.state.date,
        citation:
          "Actual prototype owned-job attendance decision, occupied minutes and transfer return; fictional schedule/pay inputs carry their separate source estimates.",
      },
    };
    const committed = api.settleWorkResult(result);
    decisions += p("one");
    acts += p("one");
    api.recordActivityTime(
      actor.id,
      "paid-job-work",
      attended,
      committed.source,
    );
    for (const module of api.state.modules.values())
      module.onWorkResult?.(api, committed);
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
  onDay: runScheduledWork,
};
