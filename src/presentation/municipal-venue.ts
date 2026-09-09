import { municipalGovernmentByKey } from "../simulation/municipal-government";
import { municipalRecognitionEventId } from "../simulation/municipal-public-work";
import type { EntityId, World } from "../simulation/types";
import bindings from "./municipal-venue-bindings.json";

/** Source-backed candidate only: ENV still verifies current completed presence,
 * participant/access, released art and compositor compatibility. No view grants
 * travel, a seat, authority or a roster. The table is explicitly reviewed data;
 * no runtime place-name or room-name guessing is used.
 */
export function municipalVenueForActivity(world: World, activityId: EntityId) {
  const activity = world.history.scheduledActivities.find(
    (row) => row.id === activityId,
  );
  if (!activity) return null;
  const binding = bindings.find(
    (row) =>
      activity.location.locationKey ===
      `municipal:${row.governmentKey}:${row.seriesKey}`,
  );
  if (!binding) return null;
  const anchor = municipalRecognitionEventId(world, binding.governmentKey);
  if (!anchor || !activity.sourceEntityIds.includes(anchor)) return null;
  const government = municipalGovernmentByKey(binding.governmentKey);
  const reading = government?.readings.find(
    (row) => row.evidence === binding.evidence,
  );
  const series = reading?.meetingSeries.find(
    (row) => row.seriesKey === binding.seriesKey,
  );
  if (series?.venue !== binding.venue) return null;
  return {
    locationKey: activity.location.locationKey!,
    sceneId: binding.sceneId,
    isJourney: false,
    reason: `${binding.representation} Source: ${reading!.evidence}, snapshot ${reading!.asOf}; ${binding.venue}. ENV must verify completed current-instant attendance before rendering.`,
  };
}
