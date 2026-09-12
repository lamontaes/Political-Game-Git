import { stableHash } from "./ids";
import { SeededRng } from "./rng";
import type { EntityId, Person, PersonAppearance } from "./types";

export type { PersonAppearance };

/**
 * What a person gets when no version is declared for them. It does not move.
 *
 * The tempting shape for a new appearance recipe is to advance this constant
 * and let everything new pick it up. That is wrong here, twice over.
 *
 * Every render site reads `person.appearance ?? derivePersonAppearance(id)`,
 * so a legacy person — saved before appearances were written down — has no
 * version of their own and takes whatever this default happens to be. Moving
 * it silently repaints every one of them in an upgrade they never opted into.
 *
 * And it is not only saves. Constructors with accepted serialized bytes —
 * `createDemoWorld`, `createGeneratedWorld`, the demo replay — build their
 * people through the same writer, so a moving default rewrites accepted
 * content and the byte fixtures in `world.test.ts` have to be re-blessed to
 * absorb it. Those fixtures exist precisely to stop that.
 *
 * So this stays at v1 permanently, and a newer recipe is DECLARED by the
 * caller that wants it — see `COHERENT_APPEARANCE_RECIPE_VERSION` below and
 * `buildProductionWorld`, which declares it for the lives a player starts.
 */
export const DEFAULT_APPEARANCE_RECIPE_VERSION = "appearance-recipe-v1";

/**
 * The same value, named for what it means at a fallback site.
 *
 * A render site resolving a person who has no stored appearance is not
 * choosing a recipe — it is drawing somebody the way they were already being
 * drawn. Spelling that out at the call site keeps the two ideas from being
 * confused again if a future default ever does move.
 */
export const LEGACY_APPEARANCE_RECIPE_VERSION =
  DEFAULT_APPEARANCE_RECIPE_VERSION;

/**
 * The recipe a newly started life declares for the people it creates.
 *
 * v2 keeps a person's face painted in the same skin as the body carrying it.
 * Measured over sixty seeded people, v1 put the chosen head a median of 59 RGB
 * from the chosen body, 43 of 60 more than 40 apart — a face plainly not
 * painted in the same skin. The compatibility metadata cannot prevent that,
 * because every banked head declares every banked body as compatible; the
 * measurement it needs is in `character_candidate_visual4_tone.json`.
 *
 * Declared rather than defaulted, so it reaches exactly the people created
 * under it. An appearance is written onto a person when they are created and
 * travels with them in the save, so a person made under v1 carries v1 forever
 * and resolves exactly as they always did.
 */
export const COHERENT_APPEARANCE_RECIPE_VERSION = "appearance-recipe-v2";

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
  catalogGeneration?: number,
): PersonAppearance {
  if (personId.trim().length === 0) {
    throw new Error("Person ID must not be empty when deriving appearance.");
  }
  if (
    catalogGeneration !== undefined &&
    (!Number.isSafeInteger(catalogGeneration) || catalogGeneration < 1)
  ) {
    throw new Error(
      "Appearance catalog generation must be a positive integer when provided.",
    );
  }
  const appearanceRng = new SeededRng(personId).fork(
    `appearance-identity:${recipeVersion}`,
  );
  const seed = `app_${stableHash(appearanceRng.seed)}`;
  return {
    seed,
    recipeVersion,
    ...(catalogGeneration === undefined ? {} : { catalogGeneration }),
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
  const appearance =
    person.appearance ??
    derivePersonAppearance(person.id, LEGACY_APPEARANCE_RECIPE_VERSION);
  return {
    personId: person.id,
    appearance,
    anchor,
  };
}
