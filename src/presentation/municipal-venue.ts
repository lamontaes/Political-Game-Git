import {
  municipalGovernmentByKey,
  reportedReading,
} from "../simulation/municipal-government";
import type { EntityId, World } from "../simulation/types";

/** Feature-local input to ENV's resolveActivityVenueScene. The resolver must
 * still prove completed presence at the current instant and released art.
 * This is a compatible generic room, never a reconstruction of a real chamber.
 */
export function municipalVenueForActivity(world: World, activityId: EntityId) {
  const activity = world.history.scheduledActivities.find(
    (row) => row.id === activityId,
  );
  if (!activity) return null;
  const government = municipalGovernmentByKey("us-nv-carson-city");
  const report = government && reportedReading(government);
  const series = report?.meetingSeries.find(
    (row) => row.seriesKey === "regular",
  );
  if (
    activity.location.locationKey !== "municipal:us-nv-carson-city:regular" ||
    !series?.venue?.includes("Community Center")
  )
    return null;
  return {
    locationKey: activity.location.locationKey,
    sceneId: "civic-community-meeting-room",
    isJourney: false,
    reason:
      "The attributed municipal report identifies a Community Center board room. ENV may use its released generic civic meeting room after completed attendance; this does not assert an exact historical room or identify the baked audience.",
  };
}
