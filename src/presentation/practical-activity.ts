import {
  householdMembershipsAt,
  scheduledActivityState,
  type EntityId,
  type World,
} from "../simulation";
import {
  openingLifeLocation,
  openingNeighborhoodWalkOffer,
} from "./life-scene-flow";
import { venueActivities } from "./venue-activity";

/** Actual place and event bounds stay visible even when no scene art exists. */
export function projectPracticalActivity(world: World, personId: EntityId) {
  const home =
    householdMembershipsAt(world, personId).find(
      (item) => item.state.residenceRole === "primary",
    )?.location ?? null;
  return {
    current: openingLifeLocation(world, personId),
    home,
    returnHome: openingNeighborhoodWalkOffer(world, personId, "home"),
    returnHomeCommand: { kind: "walk" as const, destination: "home" as const },
    activities: venueActivities(world, personId).map((entry) => ({
      ...entry,
      state: scheduledActivityState(world, entry.activity.id),
      journeyState: entry.journey
        ? scheduledActivityState(world, entry.journey.activity.id)
        : null,
      command: {
        kind: "attend-activity" as const,
        activityId: entry.activity.id,
      },
      sourceMoment: world.currentMoment,
    })),
  };
}
