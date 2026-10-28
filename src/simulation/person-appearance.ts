import {
  DEFAULT_APPEARANCE_RECIPE_VERSION,
  derivePersonAppearance,
} from "../core2/appearance";
import type { EntityId, Person, PersonAppearance, World } from "./types";

export type { PersonAppearance };
// The one writer of a person's look lives in the new core.
export { DEFAULT_APPEARANCE_RECIPE_VERSION, derivePersonAppearance };

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
 * Measured over sixty seeded people on the candidate cast this was written
 * against, v1 put the chosen head a median of 59 RGB from the chosen body, 43
 * of 60 more than 40 apart — a face plainly not painted in the same skin. The
 * compatibility metadata cannot prevent that, because every banked head
 * declares every banked body as compatible; the recipe reads a per-family skin
 * measurement when the library carries one. The production catalog carries
 * none, so a shipped v2 person draws as v1 draws and says so.
 *
 * Declared rather than defaulted, so it reaches exactly the people created
 * under it. An appearance is written onto a person when they are created and
 * travels with them in the save, so a person made under v1 carries v1 forever
 * and resolves exactly as they always did.
 */
export const COHERENT_APPEARANCE_RECIPE_VERSION = "appearance-recipe-v2";

/**
 * The appearance recipe and catalog pin a world already created under.
 *
 * Mixed or missing stamps fail closed to the default recipe and an unpinned
 * catalog, so a later writer cannot invent a newer look for people who were
 * never declared under it.
 */
export function appearanceLineageFromPeople(
  people: Iterable<{ readonly appearance?: PersonAppearance }>,
): {
  readonly recipeVersion: string;
  readonly catalogGeneration: number | undefined;
} {
  const recipes = new Set<string>();
  const catalogs = new Set<number>();
  for (const person of people) {
    if (person.appearance?.recipeVersion)
      recipes.add(person.appearance.recipeVersion);
    if (person.appearance?.catalogGeneration !== undefined)
      catalogs.add(person.appearance.catalogGeneration);
  }
  return {
    recipeVersion:
      recipes.size === 1 ? [...recipes][0]! : DEFAULT_APPEARANCE_RECIPE_VERSION,
    catalogGeneration: catalogs.size === 1 ? [...catalogs][0] : undefined,
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

/** Last catalog used by unpinned coherent lives, frozen at the #206 donor. */
export const LEGACY_COHERENT_CATALOG_GENERATION = 2;

/** Nondiegetic migration of person-owned lineage; preserves all other canon. */
export function migrateUnpinnedAppearanceCatalog(world: World): World {
  let changed = false;
  const people = Object.fromEntries(
    Object.entries(world.people).map(([id, person]) => {
      const appearance = person.appearance;
      if (
        !appearance ||
        appearance.catalogGeneration !== undefined ||
        appearance.recipeVersion !== COHERENT_APPEARANCE_RECIPE_VERSION
      )
        return [id, person];
      changed = true;
      // The old explicit-selection resolver used generation 1 without a pin.
      return [
        id,
        {
          ...person,
          appearance: {
            ...appearance,
            catalogGeneration: appearance.selection
              ? 1
              : LEGACY_COHERENT_CATALOG_GENERATION,
          },
        },
      ];
    }),
  );
  return changed ? { ...world, people } : world;
}
