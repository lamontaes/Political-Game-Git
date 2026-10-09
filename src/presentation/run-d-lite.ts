import {
  addDays,
  assignWorkItem,
  canPersonAccess,
  controlledCommitmentsBlockingActivityPerformance,
  performScheduledActivity,
  rescheduleScheduledActivity,
  scheduledActivitiesVisibleTo,
  scheduledActivityPerformanceTiming,
  scheduledActivityState,
  simulationMinutesBetween,
  workPendingEntriesFor,
} from "../simulation";
import type {
  EntityId,
  RescheduleScheduledActivityResult,
  ScheduledActivityRecord,
  ScheduledActivityStateRecord,
  SimulationMoment,
  WorkPendingEntry,
  World,
} from "../simulation";
import type { RunCFixture } from "./run-c-working-document";
import { makeSimulationMoment } from "../simulation/dates";

export const RUN_D_LITE_TIME_ZONE = "America/New_York";
export const RUN_D_LITE_UTC_OFFSET_MINUTES = -300;

export interface RunDLiteFixtureIds {
  readonly briefingActivityId: EntityId;
  readonly flexibleActivityId: EntityId;
  readonly travelActivityId: EntityId;
  readonly meetingActivityId: EntityId;
  readonly tentativeActivityId: EntityId;
  readonly hiddenActivityId: EntityId;
  readonly documentWorkItemId: EntityId;
  readonly delegableWorkItemId: EntityId;
  readonly waitingWorkItemId: EntityId;
  readonly staffWorkItemId: EntityId;
  readonly hiddenWorkItemId: EntityId;
  readonly collinsPersonId: EntityId;
  readonly reedPersonId: EntityId;
}

export interface RunDLiteFixture extends RunCFixture {
  readonly dLite: RunDLiteFixtureIds;
}

export interface RunDAgendaEntry {
  readonly activity: ScheduledActivityRecord;
  readonly state: ScheduledActivityStateRecord;
  readonly durationMinutes: number;
  readonly execution: RunDActivityExecution | null;
}

export type RunDActivityExecutionVerb = "Work" | "Travel" | "Attend" | "Begin";

export interface RunDActivityExecution {
  readonly verb: RunDActivityExecutionVerb;
  readonly waitMinutes: number;
  readonly activityMinutes: number;
  readonly totalElapsedMinutes: number;
  readonly resultingMoment: SimulationMoment;
  readonly blockingActivityIds: readonly EntityId[];
  readonly canPerform: boolean;
}

export interface RunDLiteProjection {
  readonly currentMoment: SimulationMoment;
  readonly weekDates: readonly string[];
  readonly agenda: readonly RunDAgendaEntry[];
  readonly work: readonly WorkPendingEntry[];
  readonly nextCommitment: RunDAgendaEntry | null;
}

function executionVerb(
  activity: ScheduledActivityRecord,
): RunDActivityExecutionVerb {
  if (activity.kind === "flexible") return "Work";
  if (activity.kind === "travel") return "Travel";
  if (activity.kind === "tentative") return "Begin";
  return "Attend";
}

export function projectRunDLite(
  world: World,
  fixture: RunDLiteFixture,
): RunDLiteProjection {
  const controlledPersonId =
    world.control.kind === "person" ? world.control.personId : null;
  if (!controlledPersonId || controlledPersonId !== fixture.playerPersonId) {
    throw new Error("Run D-Lite projection requires its controlled player.");
  }
  const agenda = scheduledActivitiesVisibleTo(world, controlledPersonId).map(
    (activity) => {
      const state = scheduledActivityState(world, activity.id);
      const waitBeforeStartMinutes = simulationMinutesBetween(
        world.currentMoment,
        state.start,
      );
      const canProjectExecution =
        state.status === "scheduled" &&
        waitBeforeStartMinutes >= 0 &&
        activity.responsiblePersonId === controlledPersonId;
      const timing = canProjectExecution
        ? scheduledActivityPerformanceTiming(world, activity.id)
        : null;
      const blockingActivityIds = timing
        ? controlledCommitmentsBlockingActivityPerformance(world, activity.id)
        : [];
      return {
        activity,
        state,
        durationMinutes: simulationMinutesBetween(state.start, state.end),
        execution: timing
          ? {
              verb: executionVerb(activity),
              waitMinutes: timing.waitMinutes,
              activityMinutes: timing.activityMinutes,
              totalElapsedMinutes: timing.totalElapsedMinutes,
              resultingMoment: timing.targetMoment,
              blockingActivityIds,
              canPerform: blockingActivityIds.length === 0,
            }
          : null,
      };
    },
  );
  const nextCommitment =
    agenda.find(
      (entry) =>
        entry.state.status === "scheduled" &&
        simulationMinutesBetween(world.currentMoment, entry.state.end) > 0,
    ) ?? null;
  return {
    currentMoment: world.currentMoment,
    weekDates: Array.from({ length: 5 }, (_, index) =>
      addDays(world.currentDate, index),
    ),
    agenda,
    work: workPendingEntriesFor(world, controlledPersonId),
    nextCommitment,
  };
}

export function rescheduleRunDFlexibleBlock(
  world: World,
  fixture: RunDLiteFixture,
  choice: "valid" | "travel-conflict",
): RescheduleScheduledActivityResult {
  const date = world.currentDate;
  return rescheduleScheduledActivity(world, {
    stableKey: `run-d-lite:reschedule:flexible-block:${choice}`,
    activityId: fixture.dLite.flexibleActivityId,
    start: makeSimulationMoment({
      ...world.currentMoment,
      date,
      minuteOfDay: (choice === "valid" ? 11 : 13) * 60,
    }),
    end: makeSimulationMoment({
      ...world.currentMoment,
      date,
      minuteOfDay: (choice === "valid" ? 12 : 14) * 60,
    }),
  });
}

export function delegateRunDMeetingBrief(
  world: World,
  fixture: RunDLiteFixture,
): World {
  return assignWorkItem(world, {
    stableKey: "run-d-lite:work:meeting-brief:assigned-collins",
    workItemId: fixture.dLite.delegableWorkItemId,
    assigneePersonId: fixture.dLite.collinsPersonId,
  });
}

export function performRunDScheduledActivity(
  world: World,
  fixture: RunDLiteFixture,
  activityId: EntityId,
): World {
  const entry = projectRunDLite(world, fixture).agenda.find(
    (candidate) => candidate.activity.id === activityId,
  );
  if (!entry?.execution) {
    throw new Error(
      "The controlled player cannot perform this scheduled activity now.",
    );
  }
  return performScheduledActivity(world, activityId);
}

export function hiddenRunDStateIsFiltered(
  world: World,
  fixture: RunDLiteFixture,
): boolean {
  const hiddenActivity = world.history.scheduledActivities.find(
    (activity) => activity.id === fixture.dLite.hiddenActivityId,
  );
  const hiddenWork = world.history.workItems.find(
    (item) => item.id === fixture.dLite.hiddenWorkItemId,
  );
  return !!(
    hiddenActivity &&
    hiddenWork &&
    !canPersonAccess(hiddenActivity.access, fixture.playerPersonId) &&
    !canPersonAccess(hiddenWork.access, fixture.playerPersonId)
  );
}
