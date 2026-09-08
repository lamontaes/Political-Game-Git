import {
  householdMembershipsAt,
  type EntityId,
  type World,
} from "../simulation";
import {
  DOMESTIC_SCENE_IDS,
  requireScene,
  SCENE_REGISTRY,
  type SceneRegistry,
} from "./scene-registry";
import {
  PRODUCTION_VISUAL_LIBRARY,
  type RuntimeVisualLibrary,
} from "./visual-integration";

/**
 * Which room a life is actually in.
 *
 * The second playtest fell from an illustrated title screen into a page of
 * text. The rooms existed — an approved apartment living room has been
 * released and registered since #86 — and nothing joined the life to them.
 * #86 said so itself, in `scene-consumers.ts`: the ordinary-day surface
 * "paints no backdrop", and the seam is one component away. This is the half
 * of that seam that decides which room; the component paints whatever comes
 * back and nothing else.
 *
 * TRUTH RULES, and they are the whole design:
 *
 *   - The room comes from a canonical record. A character has a home scene
 *     because the world says they are a member of a household, not because
 *     the game would rather show a picture than a page.
 *   - No art, no room. A scene whose raster is not in the released production
 *     library resolves to null, and the surface falls back to the page it was.
 *   - Nothing is invented for an office, a school or a street. Those rooms
 *     have their own consumers or do not exist yet; guessing one from an age
 *     or a job title is exactly the universal-office substitution #86 removed.
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
