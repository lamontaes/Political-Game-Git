/** Opening-only import of existing generated schedules. Runtime work never imports World. */
import { addDays, makeIsoDate } from "./kernel/dates";
import { workSchedulesFor } from "../simulation/living-world/work-schedules";
import { WORK_PATTERNS, type WorkPatternKey } from "./work-patterns";
import type { EntityId, World } from "../simulation/types";
import { parameter as p } from "./parameters";
import type { OpeningSchedule } from "./modules/work";
import type { JobInput, WorkScheduleSlot } from "./types";

/**
 * A rotating legacy week shifts one weekday each week, so its full period is
 * seven weeks. The finite import samples that declared period, not day ticks.
 * Added jobs copy their already-recorded compatible role schedule. They do not
 * acquire an unobserved credential, extra employer or future attendance outcome.
 */
export function canonicalOpeningSchedules(
  world: World,
  jobs: readonly JobInput[],
  templateJobIdByJob: ReadonlyMap<string, string>,
): ReadonlyMap<string, OpeningSchedule> {
  const originals = new Map(
    world.history.workRelationships.map((row) => [row.id, row]),
  );
  const cached = new Map<string, OpeningSchedule>();
  const patternByTemplate = new Map<string, WorkPatternKey>();
  const result = new Map<string, OpeningSchedule>();
  for (const job of jobs) {
    const templateId = templateJobIdByJob.get(job.id) ?? job.id;
    let imported = cached.get(templateId);
    if (!imported) {
      const original = originals.get(templateId as EntityId);
      if (!original || original.compensation !== "paid") continue;
      const schedule = workSchedulesFor(
        world,
        original.personId,
        world.currentDate,
      ).find((row) => row.workRelationshipId === original.id);
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
        const date = addDays(makeIsoDate(world.currentDate), offset);
        if (schedule.worksOn(date))
          slots.push({
            offsetDays: offset,
            startMinute: schedule.shift.startMinute,
            minutes: schedule.shift.minutes,
          });
      }
      imported = {
        periodDays,
        anchorDate: world.currentDate,
        slots,
        expectedWeeklyMinutes: schedule.weeklyHours * p("minutesPerHour"),
        templateJobId: original.id,
        source: {
          tag: "ESTIMATED",
          asOf: world.currentDate,
          citation:
            "Existing generated work schedule from workSchedulesFor and WORK_PATTERNS in src/simulation/living-world/work-schedules.ts; its header explicitly marks every timetable as GAME ASSUMPTION.",
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
        world.currentDate,
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
