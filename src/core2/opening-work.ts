/** Opening-only import of existing generated schedules. Runtime work never imports World. */
import { addDays, makeIsoDate } from "../simulation/dates";
import {
  WORK_PATTERNS,
  workSchedulesFor,
} from "../simulation/living-world/work-schedules";
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
