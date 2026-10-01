import { childrenOf } from "./people-family";
import { currentLifeCutoff, householdMembershipsAt } from "./life-queries";
import { recordByStableKey } from "./history-index";
import { futureDueItemStateAt } from "./future-transitions";
import { PUBLIC_SERVICE_ATTENDANCE } from "./law-consequences/service-delivered-data";
import {
  scheduledActivitiesVisibleTo,
  scheduledActivityState,
} from "./time-work";
import type {
  EntityId,
  FutureDueItemStatus,
  IsoDate,
  ScheduledActivityStatus,
  SimulationMoment,
  World,
} from "./types";

export interface HouseholdChildServiceSession {
  readonly childPersonId: EntityId;
  readonly activityId: EntityId;
  readonly title: string;
  readonly start: SimulationMoment;
  readonly end: SimulationMoment;
  readonly activityStatus: ScheduledActivityStatus;
  readonly attendanceDueItemId: EntityId;
  readonly attendanceDueAt: IsoDate;
  readonly attendanceStatus: FutureDueItemStatus;
}

/** A recorded parent's household can read its children's service sessions.
 * The activity supplies the session time; its existing attendance due item
 * supplies the clock-processing date and status. Reading writes nothing.
 */
export function householdChildServiceSchedule(
  world: World,
  parentId: EntityId,
): readonly HouseholdChildServiceSession[] {
  const cutoff = currentLifeCutoff(world);
  const homes = new Set(
    householdMembershipsAt(world, parentId, cutoff).map(
      (row) => row.household.id,
    ),
  );
  if (homes.size === 0) return [];
  return childrenOf(world, parentId)
    .filter((childId) =>
      householdMembershipsAt(world, childId, cutoff).some((row) =>
        homes.has(row.household.id),
      ),
    )
    .flatMap((childId) =>
      scheduledActivitiesVisibleTo(world, childId).flatMap((activity) => {
        const due = recordByStableKey(
          world.history.futureDueItems,
          `${activity.stableKey}:attendance`,
        );
        if (
          !due ||
          due.transitionKey !== PUBLIC_SERVICE_ATTENDANCE ||
          !due.entityIds.includes(childId)
        )
          return [];
        const attendance = futureDueItemStateAt(world, due.id, cutoff);
        if (!attendance) return [];
        const state = scheduledActivityState(world, activity.id);
        return [
          {
            childPersonId: childId,
            activityId: activity.id,
            title: activity.title,
            start: state.start,
            end: state.end,
            activityStatus: state.status,
            attendanceDueItemId: due.id,
            attendanceDueAt: due.dueAt,
            attendanceStatus: attendance.status,
          },
        ];
      }),
    )
    .sort(
      (left, right) =>
        left.start.date.localeCompare(right.start.date) ||
        left.start.minuteOfDay - right.start.minuteOfDay ||
        left.childPersonId.localeCompare(right.childPersonId) ||
        left.activityId.localeCompare(right.activityId),
    );
}
