/** Opening-only import of the town's generated schedules. Runtime work never reads the draft. */
import { addDays, makeIsoDate } from "./kernel/dates";
import type { EntityId } from "./kernel/brands";
import { draftOrganizationProfiles, type OpeningDraft } from "./opening-draft";
import { townWorkplaceFor } from "./town-workplaces";
import { WORK_PATTERNS, type WorkPatternKey } from "./work-patterns";
import {
  jobShape,
  rosterKeyOf,
  scheduleOf,
  type ScheduleJob,
  type WorkSchedule,
} from "./work-schedules";
import { parameter as p } from "./parameters";
import type { OpeningSchedule } from "./modules/work";
import type { JobInput, WorkScheduleSlot } from "./types";

/**
 * Every active job's working week at the opening, by work relationship, as
 * the town schedule generator builds them: the job's pattern and place from
 * its title, occupation and workplace (`work-schedules.ts`), and staff who
 * share a rotating pattern at one employer taking turns in hiring order.
 * Ported from the old engine's `workSchedulesFor` as the opening read it.
 */
function draftSchedules(
  draft: OpeningDraft,
): ReadonlyMap<EntityId, WorkSchedule> {
  const date = draft.currentDate;
  const latestStatus = new Map<
    EntityId,
    { at: string; seq: number; status: string }
  >();
  for (const record of draft.history.workStatuses) {
    if (record.effectiveAt > date) continue;
    const prior = latestStatus.get(record.workRelationshipId);
    if (
      !prior ||
      record.effectiveAt > prior.at ||
      (record.effectiveAt === prior.at && record.sequence > prior.seq)
    )
      latestStatus.set(record.workRelationshipId, {
        at: record.effectiveAt,
        seq: record.sequence,
        status: record.status,
      });
  }
  const latestRole = new Map<
    EntityId,
    (typeof draft.history.workRoles)[number]
  >();
  for (const record of draft.history.workRoles) {
    if (record.effectiveAt > date) continue;
    const prior = latestRole.get(record.workRelationshipId);
    if (
      !prior ||
      record.effectiveAt > prior.effectiveAt ||
      (record.effectiveAt === prior.effectiveAt &&
        record.sequence > prior.sequence)
    )
      latestRole.set(record.workRelationshipId, record);
  }
  const organizationKeys = new Map(
    draft.history.organizations.map((row) => [row.id, row.stableKey]),
  );
  const profiles = draftOrganizationProfiles(draft);
  const jobs: ScheduleJob[] = [];
  const shapes = new Map<
    EntityId,
    { pattern: WorkPatternKey; place: string }
  >();
  const rosters = new Map<string, EntityId[]>();
  for (const relationship of draft.history.workRelationships) {
    if (relationship.startedAt > date) continue;
    if (latestStatus.get(relationship.id)?.status !== "active") continue;
    const role = latestRole.get(relationship.id);
    if (!role) continue;
    const organizationKey = relationship.organizationId
      ? (organizationKeys.get(relationship.organizationId) ?? "")
      : "";
    const classification = relationship.organizationId
      ? (profiles.get(relationship.organizationId)?.classification ?? null)
      : null;
    const workplace = organizationKey
      ? townWorkplaceFor(organizationKey, classification)
      : null;
    const { minimumHours, maximumHours } = role.timeDemand.expectedWeekly;
    const job: ScheduleJob = {
      id: relationship.id,
      organizationId: relationship.organizationId,
      kind: relationship.kind,
      title: role.title,
      workplaceKey: workplace?.key ?? null,
      minimumHours,
      maximumHours,
    };
    jobs.push(job);
    const shape = jobShape(job);
    shapes.set(relationship.id, shape);
    const rosterKey = rosterKeyOf(job, shape.pattern);
    const roster = rosters.get(rosterKey) ?? [];
    roster.push(relationship.id);
    rosters.set(rosterKey, roster);
  }
  return new Map(
    jobs.map((job) => [job.id, scheduleOf(job, shapes.get(job.id)!, rosters)]),
  );
}

/**
 * A rotating week shifts one weekday each week, so its full period is seven
 * weeks. The finite import samples that declared period, not day ticks.
 * Added jobs copy their already-recorded compatible role schedule. They do not
 * acquire an unobserved credential, extra employer or future attendance outcome.
 */
export function canonicalOpeningSchedules(
  draft: OpeningDraft,
  jobs: readonly JobInput[],
  templateJobIdByJob: ReadonlyMap<string, string>,
): ReadonlyMap<string, OpeningSchedule> {
  const originals = new Map(
    draft.history.workRelationships.map((row) => [row.id, row]),
  );
  const schedules = draftSchedules(draft);
  const cached = new Map<string, OpeningSchedule>();
  const patternByTemplate = new Map<string, WorkPatternKey>();
  const result = new Map<string, OpeningSchedule>();
  for (const job of jobs) {
    const templateId = templateJobIdByJob.get(job.id) ?? job.id;
    let imported = cached.get(templateId);
    if (!imported) {
      const original = originals.get(templateId as EntityId);
      if (!original || original.compensation !== "paid") continue;
      const schedule = schedules.get(original.id);
      if (!schedule) continue;
      const shape = WORK_PATTERNS[schedule.pattern];
      const periodDays =
        shape.kind === "cycle"
          ? shape.cycleDays!
          : shape.kind === "rotating"
            ? p("daysPerWeek") * p("daysPerWeek")
            : p("daysPerWeek");
      const slots: WorkScheduleSlot[] = [];
      for (let offset = p("zero"); offset < periodDays; offset += p("one")) {
        const date = addDays(makeIsoDate(draft.currentDate), offset);
        if (schedule.worksOn(date))
          slots.push({
            offsetDays: offset,
            startMinute: schedule.shift.startMinute,
            minutes: schedule.shift.minutes,
          });
      }
      imported = {
        periodDays,
        anchorDate: draft.currentDate,
        slots,
        expectedWeeklyMinutes: schedule.weeklyHours * p("minutesPerHour"),
        templateJobId: original.id,
        source: {
          tag: "ESTIMATED",
          asOf: draft.currentDate,
          citation:
            "Generated work schedule from the town schedule generator and WORK_PATTERNS in src/core2/work-schedules.ts and src/core2/work-patterns.ts; their headers mark every timetable as GAME ASSUMPTION.",
          estimatedFrom: `Pattern ${schedule.pattern}, recorded role ${original.id}; full declared period imported without world advancement. Its planned weekly hours ${schedule.weeklyHours} may differ from the role's expected-hour range; that inherited discrepancy is retained, not hidden. Timings, roster phase, part-time shortening and holiday omission remain uncalibrated assumptions.`,
        },
      };
      cached.set(templateId, imported);
      patternByTemplate.set(templateId, schedule.pattern);
    }
    // A copy whose hours differ from its recorded role's (full-time from a
    // part-time hire, or the reverse) works the role's pattern at those hours.
    const fullLine = p("fullTimeWeeklyHours") * p("minutesPerHour");
    const wantsFull =
      job.hoursDaily * p("daysPerWeek") >= p("fullTimeWeeklyHours");
    if (wantsFull !== imported.expectedWeeklyMinutes >= fullLine) {
      const rebuilt = scheduleAtHours(
        patternByTemplate.get(templateId)!,
        imported,
        draft.currentDate,
        !wantsFull,
      );
      if (rebuilt) imported = rebuilt;
    }
    result.set(job.id, {
      ...imported,
      slots: imported.slots.map((slot) => ({ ...slot })),
      source: {
        ...imported.source,
        estimatedFrom: `${imported.source.estimatedFrom} ${job.id === templateId ? "Preserved opening job timetable." : "Added fictional opening worker copies this supported recorded role timetable; additional roster staggering and firm capacity are not observed."}`,
      },
    });
  }
  return result;
}

/**
 * The role's pattern at full-time or part-time hours, as the town schedule
 * generator builds them: full-time works every pattern weekday (or enough
 * consecutive rotation days) at the full shift; part-time works fewer days at
 * a shift cut to five and a half hours. A cycle keeps its days. Undefined when
 * the pattern has nothing to build.
 */
function scheduleAtHours(
  key: WorkPatternKey,
  template: OpeningSchedule,
  openedAt: string,
  partTime: boolean,
): OpeningSchedule | undefined {
  const pattern = WORK_PATTERNS[key];
  const base = pattern.shifts[p("zero")];
  if (!base || base.minutes <= p("zero")) return undefined;
  const shiftMinutes =
    partTime && base.minutes > p("openingPartTimeShiftMinutes")
      ? p("openingPartTimeShiftMinutes")
      : base.minutes;
  const target =
    (partTime
      ? p("openingPartTimeWeeklyHours")
      : p("openingFullTimeWeeklyHours")) * p("minutesPerHour");
  const days = Math.max(
    p("one"),
    Math.min(p("daysPerWeek"), Math.round(target / shiftMinutes)),
  );
  const weekday = (offset: number) =>
    new Date(`${addDays(makeIsoDate(openedAt), offset)}T12:00:00Z`).getUTCDay();
  const slot = (offsetDays: number): WorkScheduleSlot => ({
    offsetDays,
    startMinute: base.startMinute,
    minutes: shiftMinutes,
  });
  let periodDays = p("daysPerWeek");
  const slots: WorkScheduleSlot[] = [];
  if (pattern.kind === "cycle") {
    periodDays = template.periodDays;
    for (const row of template.slots) slots.push(slot(row.offsetDays));
  } else if (pattern.kind === "week") {
    const weekdays = pattern.weekdays ?? [];
    const worked = new Set<number>(
      partTime ? weekdays.slice(p("zero"), days) : weekdays,
    );
    for (let offset = p("zero"); offset < periodDays; offset += p("one"))
      if (worked.has(weekday(offset))) slots.push(slot(offset));
  } else
    for (let offset = p("zero"); offset < days; offset += p("one"))
      slots.push(slot(offset));
  if (!slots.length) return undefined;
  const minutes = slots.reduce((n, row) => n + row.minutes, p("zero"));
  return {
    ...template,
    periodDays,
    slots,
    expectedWeeklyMinutes: (minutes * p("daysPerWeek")) / periodDays,
    source: {
      ...template.source,
      estimatedFrom: `${template.source.estimatedFrom} Copied at ${partTime ? "part-time" : "full-time"} hours: the role's ${key} pattern rebuilt as the town schedule generator builds it (no recorded hire with those hours to copy).`,
    },
  };
}
