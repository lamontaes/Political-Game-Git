import {
  householdMembershipsAt,
  scheduledActivityState,
  type EntityId,
  type World,
} from "../simulation";
import {
  DOMESTIC_SCENE_IDS,
  requireScene,
  SCENE_REGISTRY,
  type SceneRegistry,
} from "./scene-registry";
import { resolveVenueScene } from "./scene-venues";
import {
  PRODUCTION_VISUAL_LIBRARY,
  type RuntimeVisualLibrary,
} from "./visual-integration";

/** Household scene or the immediate aftermath of actual recorded attendance.
 * Household art establishes residence context, not a physical tracking claim.
 * Unknown activity locations must not borrow the household backdrop.
 */

export interface LifeSceneResolution {
  /** The registered scene to paint, or null when none is truthful. */
  readonly sceneId: string | null;
  /** Why. Developer-facing; never shown to a player. */
  readonly reason: string;
}

/**
 * Picks a domestic room for a household, stably.
 *
 * Two apartments are released and neither carries a station, so which one
 * stands for a household is arbitrary — but it must not be arbitrary twice.
 * Keying on the household's own id means one home is one room for the life of
 * the save, and two households in one world can differ.
 */
function domesticSceneFor(
  householdId: EntityId,
  scenes: SceneRegistry,
  library: RuntimeVisualLibrary,
): string | null {
  const available = DOMESTIC_SCENE_IDS.filter((sceneId) => {
    const scene = scenes.scenes.get(sceneId);
    return scene?.raster ? library.has(scene.raster.assetId) : false;
  });
  if (available.length === 0) return null;
  let accumulator = 0;
  for (const character of householdId) {
    accumulator = (accumulator * 31 + character.charCodeAt(0)) % 2_147_483_647;
  }
  return available[accumulator % available.length]!;
}

/**
 * The room this life is in right now, from the records and nothing else.
 *
 * Today that means home or nowhere, which is honest rather than partial: the
 * only ordinary-life rooms the bank has released are two apartments, and a
 * character who is somewhere else is somewhere the game cannot yet show.
 */
export function resolveLifeScene(
  world: World,
  personId: EntityId,
  scenes: SceneRegistry = SCENE_REGISTRY,
  library: RuntimeVisualLibrary = PRODUCTION_VISUAL_LIBRARY,
): LifeSceneResolution {
  const venue = resolveVenueScene(world, personId, scenes, library);
  const place = world.history.events
    .filter(
      (event) =>
        (event.type === "life.scene.arrived" ||
          event.type === "life.scene.opened") &&
        event.participants.some(
          (participant) => participant.personId === personId,
        ) &&
        event.occurredAt <= world.currentDate,
    )
    .at(-1);
  const activitySequence = venue.activityId
    ? scheduledActivityState(world, venue.activityId).sequence
    : -1;
  if (
    place &&
    place.sequence > activitySequence &&
    place.context.location?.setting !== "home"
  ) {
    return {
      sceneId: null,
      reason:
        "The recorded place has no supported released scene binding; household art is not substituted.",
    };
  }
  if (
    venue.activityId !== null &&
    (!place || place.sequence < activitySequence)
  ) {
    if (venue.sceneId) requireScene(scenes, venue.sceneId);
    return { sceneId: venue.sceneId, reason: venue.reason };
  }

  const unresolvedJourney = world.history.scheduledActivities.some(
    (activity) => {
      if (
        activity.kind !== "travel" ||
        !activity.participantPersonIds.includes(personId)
      )
        return false;
      const state = scheduledActivityState(world, activity.id);
      return (
        state.status === "completed" && state.sequence > (place?.sequence ?? -1)
      );
    },
  );
  if (unresolvedJourney)
    return {
      sceneId: null,
      reason:
        "A journey completed without a later established place; residence is not arrival evidence.",
    };

  const memberships = householdMembershipsAt(world, personId);
  const primary =
    memberships.find((entry) => entry.state.residenceRole === "primary") ??
    memberships[0];
  if (!primary) {
    return {
      sceneId: null,
      reason: "No household membership is on record for this person today.",
    };
  }
  const household = primary.household;
  const sceneId = domesticSceneFor(household.id, scenes, library);
  if (!sceneId) {
    return {
      sceneId: null,
      reason: "No released domestic plate is available to paint.",
    };
  }
  // Fails loudly if the registry and the id list ever disagree, rather than
  // painting nothing and calling it a fallback.
  requireScene(scenes, sceneId);
  return {
    sceneId,
    reason: `Household ${household.id} is on record as this person's home today.`,
  };
}
