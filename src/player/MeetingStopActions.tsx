import {
  compareSimulationMoments,
  scheduledActivityState,
  type EntityId,
  type World,
} from "../simulation";
import { PUBLIC_MEETING_KEY } from "../simulation/life-opportunities";
import { declineCalendarActivity } from "../presentation/calendar-time-control";
import type {
  TimeCommandReport,
  TimeCommandRunner,
} from "./time-command-runner";

/** The same saved incoming journey choice offered in Calendar and Places. */
export function MeetingStopActions({
  world,
  personId,
  runner,
  onReport,
}: {
  readonly world: World;
  readonly personId: EntityId;
  readonly runner: TimeCommandRunner;
  readonly onReport: (report: TimeCommandReport) => void;
}) {
  const journey = world.history.scheduledActivities.find((activity) => {
    if (
      activity.kind !== "travel" ||
      activity.location.locationKey !== "ordinary-life:to-meeting-room" ||
      activity.responsiblePersonId !== personId
    )
      return false;
    const state = scheduledActivityState(world, activity.id);
    return (
      state.status === "scheduled" &&
      compareSimulationMoments(world.currentMoment, state.start) === 0
    );
  });
  const meeting =
    journey &&
    world.history.scheduledActivities.find(
      (activity) =>
        activity.stableKey === PUBLIC_MEETING_KEY + ":activity" &&
        journey.sourceEntityIds.includes(activity.id) &&
        scheduledActivityState(world, activity.id).status === "scheduled",
    );
  if (!meeting) return null;
  return (
    <div
      className="game-choices life-hud-note"
      role="group"
      aria-label="Public meeting"
      data-testid="meeting-stop-actions"
      data-activity-id={meeting.id}
    >
      <button
        type="button"
        className="ui-action"
        disabled={runner.pending}
        data-testid="meeting-stop-go"
        onClick={() => {
          if (!runner.pending)
            runner.submit(
              { kind: "attend-activity", activityId: meeting.id },
              onReport,
            );
        }}
      >
        Go to meeting
      </button>
      <button
        type="button"
        className="ui-action"
        disabled={runner.pending}
        data-testid="meeting-stop-stay-home"
        onClick={() => {
          if (!runner.pending)
            runner.perform(
              (current) =>
                declineCalendarActivity(current, personId, meeting.id),
              onReport,
            );
        }}
      >
        Stay home
      </button>
    </div>
  );
}
