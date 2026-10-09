/** Local CoreAPI writers for the work/time boundary. No per-act global integrity pass. */
import { addDays, makeIsoDate } from "../simulation/dates";
import { prepareWorkFinance } from "./finance-state";
import {
  activityAgeId,
  commitmentCalendar,
  discretionaryHours,
  isWorkFocus,
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

/** Admit everything before transferring; paidMinor always comes from the real transfer return. */
export function settleWorkResult(
  core: CoreState,
  api: CoreAPI,
  input: WorkResultInput,
): WorkResult {
  const p = api.parameter;
  const row = core.work.commitments.get(input.commitmentId);
  const actor = core.people.get(input.personId);
  const previous = core.work.lastResultByJob.get(input.jobId);
  if (
    !row ||
    !actor?.alive ||
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
  const balances = core.organizations.get(row.organizationId)!;
  const finance = prepareWorkFinance(
    core,
    api,
    row.organizationId,
    actor.id,
    input.requestedMinor,
    input.id,
  );
  const expectedPaid = finance.expectedPaidMinor;
  const previousTotals = core.work.totalsByJob.get(row.jobId);
  const zero = p("zero"),
    one = p("one");
  const totals = {
    plannedMinutes: (previousTotals?.plannedMinutes ?? zero) + planned,
    attendedMinutes:
      (previousTotals?.attendedMinutes ?? zero) + input.attendedMinutes,
    requestedMinor:
      (previousTotals?.requestedMinor ?? zero) + input.requestedMinor,
    paidMinor: (previousTotals?.paidMinor ?? zero) + expectedPaid,
    workedDays: (previousTotals?.workedDays ?? zero) + (attended ? one : zero),
    missedDays: (previousTotals?.missedDays ?? zero) + (absent ? one : zero),
  };
  if (
    !Number.isSafeInteger(totals.requestedMinor) ||
    !Number.isSafeInteger(totals.paidMinor)
  )
    throw new Error("Work totals overflow minor units.");
  // Resolve subsequent calendar/activity parameters while this writer is still read-only.
  const week = workWeekStart(core.date, api),
    key = `${week}:${row.jobId}`;
  activityAgeId(api, actor.id);
  const detailed = isWorkFocus(api, actor);
  api.validateAct(actor.id, decision.selected!, core.date, decision);
  if (detailed && !core.knowledgeByPerson.has(actor.id))
    throw new Error("Missing watched worker knowledge index.");
  finance.commitFunding();
  const payerCashBeforeMinor = balances.liquidMinor,
    payeeCashBeforeMinor = actor.liquidMinor;
  const paidMinor = api.transfer(
    row.organizationId,
    actor.id,
    input.requestedMinor,
  );
  const sourceActId = api.recordAct(
    actor.id,
    decision.selected!,
    core.date,
    decision,
  );
  const full: WorkResult = {
    ...input,
    paidMinor,
    sourceActId,
    shortfallMinor: input.requestedMinor - paidMinor,
    payerCashBeforeMinor,
    payerCashAfterMinor: balances.liquidMinor,
    payeeCashBeforeMinor,
    payeeCashAfterMinor: actor.liquidMinor,
    jobSource: { ...core.jobs.get(row.jobId)!.source },
    paySource: { ...row.paySource },
    employerOpeningFundsSource: { ...balances.source },
    source: {
      tag: "SOURCED",
      asOf: core.date,
      citation:
        "Actual prototype owned-job attendance decision, dated occupied minutes and transfer return; schedule/pay estimates are retained on the commitment.",
    },
  };
  const quiet = { ...full, decision: undefined };
  finance.record(full);
  core.work.lastResultByJob.set(row.jobId, detailed ? full : quiet);
  if (detailed) core.work.detailedResults.set(full.id, full);
  core.work.totalsByJob.set(row.jobId, totals);
  const time = core.work.timeByPerson.get(actor.id);
  core.work.timeByPerson.set(actor.id, {
    date: core.date,
    workMinutes:
      (time?.date === core.date ? time.workMinutes : zero) +
      input.attendedMinutes,
    discretionaryMinutes:
      time?.date === core.date ? time.discretionaryMinutes : zero,
  });
  const rollup = core.work.rollups.get(key) ?? {
    weekStartedAt: week,
    jobId: row.jobId,
    personId: actor.id,
    plannedDays: zero,
    workedDays: zero,
    missedDays: zero,
    plannedMinutes: zero,
    attendedMinutes: zero,
    requestedMinor: zero,
    paidMinor: zero,
    latestReasonKey: input.reasonKey,
  };
  rollup.plannedDays += one;
  rollup.workedDays += attended ? one : zero;
  rollup.missedDays += absent ? one : zero;
  rollup.plannedMinutes += planned;
  rollup.attendedMinutes += input.attendedMinutes;
  rollup.requestedMinor += input.requestedMinor;
  rollup.paidMinor += paidMinor;
  rollup.latestReasonKey = input.reasonKey;
  core.work.rollups.set(key, rollup);
  indexed(core.work.rollupsByWeek, week, key);
  if (detailed)
    api.observe(actor.id, {
      key: `job:${row.jobId}:latest-work-result`,
      value: JSON.stringify({
        date: core.date,
        plannedMinutes: planned,
        attendedMinutes: input.attendedMinutes,
        requestedMinor: input.requestedMinor,
        paidMinor,
        reasonKey: input.reasonKey,
      }),
      learnedAt: core.date,
      sourceId: row.id,
      access: "self",
    });
  return full;
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
