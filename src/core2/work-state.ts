/** Local CoreAPI writers for the work/time boundary. No per-act global integrity pass. */
import { addDays, makeIsoDate } from "../simulation/dates";
import { settleWorkResultJournal } from "./work-cash";
import {
  activityAgeId,
  commitmentCalendar,
  discretionaryHours,
  plannedWorkMinutesOnDate,
  workWeekStart,
} from "./modules/work";
import type {
  CoreAPI,
  CoreState,
  Source,
  WorkCommitmentInput,
  WorkResult,
  WorkResultInput,
  WorkRuntime,
} from "./types";

export function emptyWorkRuntime(): WorkRuntime {
  return {
    cashActSelections: new Map(),
    cashSources: new Map(),
    latestLegacyCashResultByPerson: new Map(),
    commitments: new Map(),
    commitmentsByPerson: new Map(),
    byPeriodResidue: new Map(),
    plannedByCommitmentResidue: new Map(),
    lastResultByJob: new Map(),
    totalsByJob: new Map(),
    rollups: new Map(),
    rollupsByWeek: new Map(),
    detailedResults: new Map(),
    timeByPerson: new Map(),
    primaryTimeTotals: new Map(),
  };
}

function indexed(map: Map<string, Set<string>>, key: string, id: string): void {
  const set = map.get(key) ?? new Set<string>();
  set.add(id);
  map.set(key, set);
}

export function admitWorkCommitment(
  core: CoreState,
  api: CoreAPI,
  row: WorkCommitmentInput,
): void {
  const p = api.parameter;
  const job = core.jobs.get(row.jobId);
  if (
    core.work.commitments.has(row.id) ||
    [...(core.work.commitmentsByPerson.get(row.personId) ?? [])].some((id) => {
      const commitment = core.work.commitments.get(id)!;
      return (
        commitment.endsAt === undefined &&
        core.people.get(row.personId)?.jobId === commitment.jobId
      );
    })
  )
    throw new Error(
      "Work commitment must be unique for the recorded primary job/person.",
    );
  if (
    !job ||
    job.personId !== row.personId ||
    job.organizationId !== row.organizationId ||
    core.people.get(row.personId)?.jobId !== row.jobId ||
    !core.organizations.has(row.organizationId)
  )
    throw new Error(
      "Work commitment requires the owned recorded job and employer.",
    );
  const start = makeIsoDate(row.startsAt),
    anchor = makeIsoDate(row.anchorDate);
  if (
    start < core.people.get(row.personId)!.birthDate ||
    (row.endsAt !== undefined && makeIsoDate(row.endsAt) < start)
  )
    throw new Error("Invalid commitment date bounds.");
  if (
    !Number.isSafeInteger(row.periodDays) ||
    row.periodDays <= p("zero") ||
    !Number.isSafeInteger(row.hourlyMinor) ||
    row.hourlyMinor < p("zero") ||
    !Number.isFinite(row.expectedWeeklyMinutes) ||
    row.expectedWeeklyMinutes <= p("zero") ||
    row.slots.length <= p("zero")
  )
    throw new Error("Invalid work commitment quantities.");
  const day = p("hoursPerDay") * p("minutesPerHour");
  for (const slot of row.slots)
    if (
      !Number.isSafeInteger(slot.offsetDays) ||
      slot.offsetDays < p("zero") ||
      slot.offsetDays >= row.periodDays ||
      !Number.isFinite(slot.startMinute) ||
      slot.startMinute < p("zero") ||
      slot.startMinute >= day ||
      !Number.isFinite(slot.minutes) ||
      slot.minutes <= p("zero") ||
      slot.minutes > day
    )
      throw new Error("Invalid periodic work slot.");
  const spans = row.slots
    .map((slot) => ({
      start: slot.offsetDays * day + slot.startMinute,
      minutes: slot.minutes,
    }))
    .sort((a, b) => a.start - b.start);
  for (const [index, span] of spans.entries()) {
    const next =
      spans[index + p("one")]?.start ??
      spans[p("zero")]!.start + row.periodDays * day;
    if (span.start + span.minutes > next)
      throw new Error("Periodic job slots overlap.");
  }
  api.stopgap("SG-P8-work-pay-terms");
  if (row.scheduleSource.tag === "ESTIMATED")
    api.stopgap("SG-P8-work-schedule-data");
  const saved = {
    ...row,
    startsAt: start,
    anchorDate: anchor,
    slots: row.slots.map((slot) => ({ ...slot })),
    scheduleSource: { ...row.scheduleSource },
    paySource: { ...row.paySource },
  };
  core.work.commitments.set(row.id, saved);
  indexed(core.work.commitmentsByPerson, row.personId, row.id);
  const residues =
    core.work.byPeriodResidue.get(row.periodDays) ??
    new Map<number, Set<string>>();
  const calendar = commitmentCalendar(saved, api);
  core.work.plannedByCommitmentResidue.set(row.id, calendar);
  for (const residue of calendar.keys()) {
    const ids = residues.get(residue) ?? new Set<string>();
    ids.add(row.id);
    residues.set(residue, ids);
  }
  core.work.byPeriodResidue.set(row.periodDays, residues);
  if (core.data.work)
    api.updateGoal(row.personId, {
      id: `work:${row.id}`,
      kind: "fulfil-work",
      urgency: p(core.data.work.commitmentUrgencyParameter),
    });
  api.observe(row.personId, {
    key: `job:${row.jobId}:commitment`,
    value: row.id,
    learnedAt: core.date,
    sourceId: row.id,
    access: "self",
  });
}

/** Existing substantive calendar, owned-job, time, pay and shared-score assertions. */
export function validateDatedWorkResult(
  core: CoreState,
  api: CoreAPI,
  input: WorkResultInput,
): void {
  const p = api.parameter;
  const row = core.work.commitments.get(input.commitmentId);
  const actor = core.people.get(input.personId);
  const job = core.jobs.get(input.jobId);
  const previous = core.work.lastResultByJob.get(input.jobId);
  if (
    !row ||
    !actor?.alive ||
    !job ||
    job.id !== input.jobId ||
    job.personId !== input.personId ||
    job.organizationId !== input.organizationId ||
    (job.endsAt !== undefined && makeIsoDate(job.endsAt) <= core.date) ||
    row.jobId !== input.jobId ||
    row.personId !== input.personId ||
    row.organizationId !== input.organizationId ||
    actor.jobId !== row.jobId ||
    makeIsoDate(input.date) !== core.date ||
    input.id !== `work-result:${core.date}:${row.id}` ||
    (previous !== undefined && previous.date >= core.date)
  )
    throw new Error("Invalid or duplicate dated work result.");
  const planned = plannedWorkMinutesOnDate(api, row);
  const minutes = [
    input.plannedMinutes,
    input.attendedMinutes,
    input.absentMinutes,
  ];
  if (
    minutes.some((value) => !Number.isFinite(value) || value < p("zero")) ||
    planned !== input.plannedMinutes ||
    planned <= p("zero") ||
    input.attendedMinutes > planned ||
    input.absentMinutes !== planned - input.attendedMinutes ||
    input.attendedMinutes >
      discretionaryHours(api, actor.id) * p("minutesPerHour")
  )
    throw new Error("Work result does not conserve admitted time.");
  const exact =
    (previous?.payRemainderMinor ?? p("zero")) +
    (row.hourlyMinor * input.attendedMinutes) / p("minutesPerHour");
  if (
    !Number.isSafeInteger(input.requestedMinor) ||
    input.requestedMinor < p("zero") ||
    input.requestedMinor !== Math.floor(exact) ||
    input.payRemainderMinor !== exact - input.requestedMinor
  )
    throw new Error(
      "Work requested pay/remainder does not follow recorded terms.",
    );
  const decision = input.decision;
  const data = core.data.work;
  const attended =
    decision?.selected?.definition.effect === data?.attendanceAction.effect;
  const absent =
    decision?.selected?.definition.effect === data?.absenceAction.effect;
  if (
    !data ||
    !decision ||
    decision.actorId !== actor.id ||
    decision.date !== core.date ||
    decision.selected?.targetId !== row.id ||
    decision.reasonKey !== input.reasonKey ||
    (!attended && !absent) ||
    input.attendedMinutes !== (attended ? planned : p("zero"))
  )
    throw new Error(
      "Work result requires its actual shared-score attendance decision.",
    );
}

export function settleWorkResult(
  core: CoreState,
  api: CoreAPI,
  input: WorkResultInput,
): WorkResult {
  return settleWorkResultJournal(core, api, input);
}

export function recordActivityTime(
  core: CoreState,
  api: CoreAPI,
  personId: string,
  category: string,
  minutes: number,
  source: Source,
): void {
  if (
    !core.people.has(personId) ||
    !category ||
    !Number.isFinite(minutes) ||
    minutes < api.parameter("zero")
  )
    throw new Error("Invalid dated primary activity amount.");
  const age = activityAgeId(api, personId),
    key = `${age}:${category}`;
  const row = core.work.primaryTimeTotals.get(key) ?? {
    ageReferenceId: age,
    category,
    minutes: api.parameter("zero"),
    source,
  };
  row.minutes += minutes;
  core.work.primaryTimeTotals.set(key, row);
}

export function recordDiscretionaryTime(
  core: CoreState,
  api: CoreAPI,
  personId: string,
  minutes: number,
): void {
  if (
    !core.people.has(personId) ||
    !Number.isFinite(minutes) ||
    minutes < api.parameter("zero") ||
    minutes >
      discretionaryHours(api, personId) * api.parameter("minutesPerHour")
  )
    throw new Error(
      "Discretionary activity exceeds the actual remaining-time budget.",
    );
  const time = core.work.timeByPerson.get(personId);
  core.work.timeByPerson.set(personId, {
    date: core.date,
    workMinutes:
      time?.date === core.date ? time.workMinutes : api.parameter("zero"),
    discretionaryMinutes:
      (time?.date === core.date
        ? time.discretionaryMinutes
        : api.parameter("zero")) + minutes,
  });
}

/** Indexed completed weekly buckets only; full focus receipts and cumulative totals remain. */
export function compactQuietWorkResults(core: CoreState, api: CoreAPI): void {
  const data = core.data.work;
  if (!data) return;
  api.stopgap("SG-P8-work-result-retention");
  const weeks = api.parameter(data.routineRetentionWeeksParameter);
  if (!Number.isSafeInteger(weeks) || weeks <= api.parameter("zero"))
    throw new Error("Invalid work retention weeks.");
  const cutoff = addDays(
    makeIsoDate(workWeekStart(core.date, api)),
    -weeks * api.parameter("daysPerWeek"),
  );
  for (const [week, keys] of core.work.rollupsByWeek)
    if (week < cutoff) {
      for (const key of keys) core.work.rollups.delete(key);
      core.work.rollupsByWeek.delete(week);
    }
}
