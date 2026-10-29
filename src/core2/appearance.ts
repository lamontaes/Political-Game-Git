/**
 * A person's look (the stored appearance): one writer for residents, people
 * filled in later and officials. Moved from the old engine's person-appearance.ts,
 * which re-exports it.
 */
import { stableHash } from "./kernel/ids";
import { SeededRng } from "./kernel/rng";

/** The appearance handle a renderer reads; the seed is the stored look. */
export interface StoredAppearance {
  readonly seed: string;
  readonly recipeVersion: string;
  readonly catalogGeneration?: number;
}

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
 * The recipe that keeps a person's face painted in the same skin as the body
 * carrying it, declared for the lives a player starts. A person made under it
 * carries it in their save; the character components read it (src/appearance).
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
  personId: string,
  recipeVersion = DEFAULT_APPEARANCE_RECIPE_VERSION,
  catalogGeneration?: number,
): StoredAppearance {
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
