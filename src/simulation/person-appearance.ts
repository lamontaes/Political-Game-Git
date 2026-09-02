import { stableHash } from "./ids";
import { SeededRng } from "./rng";
import type { EntityId, Person, PersonAppearance } from "./types";

export type { PersonAppearance };

export const DEFAULT_APPEARANCE_RECIPE_VERSION = "appearance-recipe-v1";

/**
 * Derives a stable, person-owned appearance identity.
 *
 * Deterministically binds appearance identity to the person's unique canonical ID
 * and recipe version, rather than any scene anchor, chair, room position, name string,
 * or demographic stereotype.
 */
export function derivePersonAppearance(
  personId: EntityId | string,
  recipeVersion = DEFAULT_APPEARANCE_RECIPE_VERSION,
): PersonAppearance {
  if (personId.trim().length === 0) {
    throw new Error("Person ID must not be empty when deriving appearance.");
  }
  const appearanceRng = new SeededRng(personId).fork(
    `appearance-identity:${recipeVersion}`,
  );
  const seed = `app_${stableHash(appearanceRng.seed)}`;
  return {
    seed,
    recipeVersion,
  };
}

/**
 * Scene anchor specification representing physical space in a rendered room.
 *
 * Scene anchors own:
 * - position (coordinates)
 * - contact (floor/seat contact points)
 * - depth (render layering / z-index)
 * - occlusion (foreground obstacles, desk occlusions)
 * - scene transform (camera/perspective matrix)
 *
 * Scene anchors DO NOT own the person's body or appearance identity.
 */
export interface SceneAnchor {
  readonly anchorId: string;
  readonly position: { readonly x: number; readonly y: number };
  readonly depth: number;
  readonly contact?: string;
  readonly occlusion?: string;
  readonly sceneTransform?: string;
}

/**
 * Person placement in a scene, coupling a person-owned appearance
 * with an environmental scene anchor without conflating their ownership.
 */
export interface ScenePersonPlacement {
  readonly personId: EntityId;
  readonly appearance: PersonAppearance;
  readonly anchor: SceneAnchor;
}

export function createScenePlacement(
  person: Person,
  anchor: SceneAnchor,
): ScenePersonPlacement {
  const appearance = person.appearance ?? derivePersonAppearance(person.id);
  return {
    personId: person.id,
    appearance,
    anchor,
  };
}
