import {
  activeWorkRelationshipsAt,
  workRelationshipHistoryForPerson,
  workRoleHistory,
  workStatusHistory,
} from "../life-queries";
import { daysBetween } from "../dates";
import { createWorkItem, workItemState } from "../time-work";
import type { EntityId, World, WorkItemRecord } from "../types";
import type { ReporterRoleRecord, StoryLeadRecord } from "./records";
import { reporterIsCurrent, reporterRoles } from "./outlets";
import { STORY_EFFORT_ESTIMATES } from "./story-effort-data";

const STORY_WORK_TARGET = "press.story-reporting";

export interface ReporterWorkBudget {
  readonly workdayMinutes: {
    readonly minimum: number;
    readonly maximum: number;
  };
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
    workdayMinutes: {
      minimum: weeklyMinimum / STORY_EFFORT_ESTIMATES.workdaysPerWeek,
      maximum: weeklyMaximum / STORY_EFFORT_ESTIMATES.workdaysPerWeek,
    },
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
    workdayMinutes: {
      minimum: weeklyMinutes.minimum / STORY_EFFORT_ESTIMATES.workdaysPerWeek,
      maximum: weeklyMinutes.maximum / STORY_EFFORT_ESTIMATES.workdaysPerWeek,
    },
    weeklyMinutes,
    reservedMinutes,
    availableMinutes: {
      minimum: Math.max(0, weeklyMinutes.minimum - reservedMinutes),
      maximum: Math.max(0, weeklyMinutes.maximum - reservedMinutes),
    },
  };
}

/** Recorded journalism spells only; gaps and overlapping jobs add no experience. */
export function storyEffortEstimate(
  world: World,
  lead: StoryLeadRecord,
  reporter: ReporterRoleRecord,
): { readonly requiredMinutes: number; readonly description: string } | null {
  if (!reporterWorkBudget(world, reporter)) return null;
  const intervals = workRelationshipHistoryForPerson(world, reporter.personId)
    .filter(
      (work) =>
        work.recordedAt <= world.currentDate &&
        work.startedAt <= world.currentDate,
    )
    .flatMap((work) => {
      const statuses = workStatusHistory(world, work.id);
      const roles = workRoleHistory(world, work.id);
      const boundaries = [
        ...new Set([
          work.startedAt,
          world.currentDate,
          ...statuses.map((status) => status.effectiveAt),
          ...roles.map((role) => role.effectiveAt),
        ]),
      ]
        .filter((date) => date >= work.startedAt && date <= world.currentDate)
        .sort();
      return boundaries.slice(0, -1).flatMap((start, index) => {
        const status = statuses
          .filter((entry) => entry.effectiveAt <= start)
          .at(-1);
        const role = roles.filter((entry) => entry.effectiveAt <= start).at(-1);
        return status?.status === "active" &&
          role?.occupationClassification === "profession:journalism"
          ? [{ start, end: boundaries[index + 1]! }]
          : [];
      });
    })
    .sort((a, b) => a.start.localeCompare(b.start));
  let days = 0;
  let previous: (typeof intervals)[number] | undefined;
  for (const interval of intervals) {
    if (previous && interval.start <= previous.end) {
      if (interval.end > previous.end)
        previous = { ...previous, end: interval.end };
    } else {
      if (previous) days += daysBetween(previous.start, previous.end);
      previous = interval;
    }
  }
  if (previous) days += daysBetween(previous.start, previous.end);
  // Calendar-year conversion; this is not a behavioral coefficient.
  const recordedYears = days / 365.25;
  const multiplier = STORY_EFFORT_ESTIMATES.experience.find(
    (band) => recordedYears < band.belowYears,
  )!.multiplier;
  const kind = STORY_EFFORT_ESTIMATES.families[lead.family];
  return {
    requiredMinutes: Math.ceil(
      STORY_EFFORT_ESTIMATES.minutes[kind] * multiplier,
    ),
    description: `${kind}; ${recordedYears.toFixed(2)} recorded journalism years; experience multiplier ${multiplier}; CTO-admitted estimate, not measured completion time`,
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
