import {
  canPersonAccess,
  controlledCommitmentsBlockingActivityPerformance,
  createCampaignElectionTransitionRegistry,
  performScheduledActivity,
  scheduledActivitiesVisibleTo,
  scheduledActivityPerformanceTiming,
  scheduledActivityState,
  type EntityId,
  type World,
} from "../simulation";
import { sceneVenueForLocationKey } from "./scene-venues";

/** A player action over existing scheduled activity truth; no separate clock. */
export function venueActivities(world: World, personId: EntityId) {
  return scheduledActivitiesVisibleTo(world, personId)
    .filter((activity) =>
      sceneVenueForLocationKey(activity.location.locationKey),
    )
    .filter(
      (activity) =>
        scheduledActivityState(world, activity.id).status === "scheduled",
    )
    .map((activity) => {
      let refusal: string | null = null;
      let elapsedMinutes: number | null = null;
      if (
        world.control.kind !== "person" ||
        world.control.personId !== personId ||
        activity.responsiblePersonId !== personId
      ) {
        refusal = "This activity is not yours to carry out.";
      } else {
        try {
          elapsedMinutes = scheduledActivityPerformanceTiming(
            world,
            activity.id,
          ).totalElapsedMinutes;
          if (
            controlledCommitmentsBlockingActivityPerformance(world, activity.id)
              .length
          )
            refusal = "An earlier commitment must be resolved first.";
        } catch (error) {
          refusal =
            error instanceof Error
              ? error.message
              : "This activity cannot be performed now.";
        }
      }
      return { activity, elapsedMinutes, refusal };
    });
}

export function performVenueActivity(
  world: World,
  personId: EntityId,
  activityId: EntityId,
): World {
  const entry = venueActivities(world, personId).find(
    ({ activity }) => activity.id === activityId,
  );
  if (
    !entry ||
    entry.refusal ||
    !canPersonAccess(entry.activity.access, personId)
  )
    return world;
  return performScheduledActivity(
    world,
    activityId,
    createCampaignElectionTransitionRegistry(),
  );
}
