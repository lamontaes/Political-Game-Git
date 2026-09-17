import { proseDate } from "../presentation/prose-dates";
import type { LifePathDefinition } from "../simulation/life-paths2-catalog";
import {
  studyProgressSummary,
  studyUsesPeriodModel,
  totalStudyPeriods,
  studyTuitionStatus,
  minimumStudyElapsedDays,
} from "../simulation/education-study-progression";
import { educationEnrollmentStateAt } from "../simulation/life-queries";
import { enrollmentStudyModel } from "../simulation/life-paths2";
import type { EntityId, World } from "../simulation/types";

function dollars(minor: number): string {
  return `$${(minor / 100).toFixed(2)}`;
}

export function studyProgramCostLabel(path: LifePathDefinition): string {
  if (studyUsesPeriodModel(path)) {
    const total = totalStudyPeriods(path) * (path.periodCostMinor ?? 0);
    const years = path.academicYears ?? 0;
    const per = path.periodCostMinor ?? 0;
    const periods = totalStudyPeriods(path);
    return `${years} academic year${years === 1 ? "" : "s"}, ${periods} period${periods === 1 ? "" : "s"}, at least ${minimumStudyElapsedDays(path)} simulated days, ${dollars(per)} per period (${dollars(total)} total, game-authored).`;
  }
  if (path.requiredSessions && path.sessionCostMinor > 0)
    return `${path.requiredSessions} sessions at ${dollars(path.sessionCostMinor)} each (${dollars(path.requiredSessions * path.sessionCostMinor)} total, game-authored).`;
  return "Game-authored terms.";
}

export function studyEnrollmentProgressLabel(
  world: World,
  enrollmentId: EntityId,
  path: LifePathDefinition,
): string {
  const status = educationEnrollmentStateAt(world, enrollmentId)?.status;
  const progress = studyProgressSummary(world, enrollmentId, path);
  if (progress.model === "periods") {
    const label =
      status === "temporarily-inactive"
        ? "Interrupted"
        : status === "completed"
          ? "Completed"
          : status === "withdrawn"
            ? "Withdrawn"
            : "In progress";
    const tuition = studyTuitionStatus(world, enrollmentId, path);
    const due =
      progress.nextDueDate && status === "active" && !tuition
        ? ` Next tuition due ${proseDate(progress.nextDueDate)} (${dollars(progress.periodCostMinor)}).`
        : "";
    return `${label}. Year ${progress.academicYear}, period ${progress.periodInYear} of ${progress.total}.${due}`;
  }
  const sessions = progress.completed;
  const label =
    status === "temporarily-inactive"
      ? "Interrupted"
      : status === "completed"
        ? "Completed"
        : "active";
  return `${label}. ${sessions} attended sessions.`;
}

export function studyUsesPeriodUi(
  world: World,
  enrollmentId: EntityId,
  path: LifePathDefinition,
): boolean {
  return enrollmentStudyModel(world, enrollmentId, path) === "periods";
}
