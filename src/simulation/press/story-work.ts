import { activeWorkRelationshipsAt } from "../life-queries";
import { createWorkItem, workItemState } from "../time-work";
import type { EntityId, World, WorkItemRecord } from "../types";
import type { ReporterRoleRecord, StoryLeadRecord } from "./records";
import { reporterIsCurrent, reporterRoles } from "./outlets";

const STORY_WORK_TARGET = "press.story-reporting";

export interface ReporterWorkBudget {
  readonly weeklyMinutes: {
    readonly minimum: number;
    readonly maximum: number;
  };
  readonly reservedMinutes: number;
  readonly availableMinutes: {
    readonly minimum: number;
    readonly maximum: number;
  };
}

/** Minutes, not a count of stories: each actual assignment supplies its own effort. */
export function outletReportingWorkBudget(
  world: World,
  outletId: EntityId,
): ReporterWorkBudget | null {
  let weeklyMinimum = 0;
  let weeklyMaximum = 0;
  let reservedMinutes = 0;
  let availableMinimum = 0;
  let availableMaximum = 0;
  const counted = new Set<EntityId>();
  for (const reporter of reporterRoles(world, outletId)) {
    if (!reporterIsCurrent(world, reporter)) continue;
    // Duplicate staff bindings cannot supply the same person's time twice.
    if (counted.has(reporter.personId)) return null;
    counted.add(reporter.personId);
    const budget = reporterWorkBudget(world, reporter);
    if (!budget) return null;
    weeklyMinimum += budget.weeklyMinutes.minimum;
    weeklyMaximum += budget.weeklyMinutes.maximum;
    reservedMinutes += budget.reservedMinutes;
    availableMinimum += budget.availableMinutes.minimum;
    availableMaximum += budget.availableMinutes.maximum;
  }
  return {
    weeklyMinutes: { minimum: weeklyMinimum, maximum: weeklyMaximum },
    reservedMinutes,
    availableMinutes: { minimum: availableMinimum, maximum: availableMaximum },
  };
}

/** Saved job demand is a range; it is never silently turned into a free-time estimate. */
export function reporterWorkBudget(
  world: World,
  reporter: ReporterRoleRecord | null,
): ReporterWorkBudget | null {
  if (!reporter) return null;
  const employment = activeWorkRelationshipsAt(world, reporter.personId).find(
    ({ relationship, role }) =>
      relationship.id === reporter.workRelationshipId &&
      role.id === reporter.workRoleId,
  );
  if (!employment) return null;
  const hours = employment.role.timeDemand.expectedWeekly;
  const weeklyMinutes = {
    minimum: hours.minimumHours * 60,
    maximum: hours.maximumHours * 60,
  };
  if (
    !Number.isFinite(weeklyMinutes.minimum) ||
    !Number.isFinite(weeklyMinutes.maximum) ||
    weeklyMinutes.minimum < 0 ||
    weeklyMinutes.maximum < weeklyMinutes.minimum
  )
    return null;
  let reservedMinutes = 0;
  for (const item of world.history.workItems) {
    const state = workItemState(world, item.id);
    if (
      (state.status !== "active" && state.status !== "ready-for-review") ||
      !state.assignedPersonIds.includes(reporter.personId)
    )
      continue;
    // An existing assignment without recorded effort is unknown, not zero work.
    if (!item.effort) return null;
    reservedMinutes += Math.max(
      0,
      item.effort.requiredMinutes - state.completedEffortMinutes,
    );
  }
  return {
    weeklyMinutes,
    reservedMinutes,
    availableMinutes: {
      minimum: Math.max(0, weeklyMinutes.minimum - reservedMinutes),
      maximum: Math.max(0, weeklyMinutes.maximum - reservedMinutes),
    },
  };
}

/** The canonical work item's focus is the saved lead-to-work join. */
export function storyWorkItem(
  world: World,
  leadId: EntityId,
): WorkItemRecord | null {
  return (
    world.history.workItems.find(
      (item) =>
        item.focus.kind === "other" &&
        item.focus.targetKey === STORY_WORK_TARGET &&
        item.focus.sourceEntityId === leadId,
    ) ?? null
  );
}

/** Estimates are supplied by the admitted story-effort reader, not drawn here. */
export function createStoryWorkItem(
  world: World,
  lead: StoryLeadRecord,
  reporter: ReporterRoleRecord,
  estimate: { readonly requiredMinutes: number; readonly description: string },
): World {
  const existing = storyWorkItem(world, lead.id);
  if (existing) return world;
  if (
    reporter.outletId !== lead.outletId ||
    !reporterWorkBudget(world, reporter)
  )
    return world;
  if (!estimate.description.trim())
    throw new Error("Reporting effort requires its estimate basis.");
  return createWorkItem(world, {
    stableKey: `${lead.stableKey}:reporting-work`,
    title: "Report the story",
    summary: `Estimated reporting effort: ${estimate.description}`,
    jurisdictionId: lead.jurisdictionId,
    sourceEntityIds: [
      lead.id,
      reporter.id,
      reporter.workRelationshipId,
      ...lead.basisEventIds,
    ],
    focus: {
      kind: "other",
      targetKey: STORY_WORK_TARGET,
      sourceEntityId: lead.id,
    },
    effort: {
      kind: "authored-duration",
      requiredMinutes: estimate.requiredMinutes,
    },
    access: { kind: "private", personIds: [reporter.personId] },
    assignedPersonIds: [reporter.personId],
    playerRequirement: "none",
    waitingOnPersonIds: [],
    blocker: null,
    scheduledActivityId: null,
  });
}
