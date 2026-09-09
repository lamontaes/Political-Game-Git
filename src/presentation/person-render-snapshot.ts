import type { PersonAppearance } from "../simulation/person-appearance";
import {
  resolveCharacterRecipe,
  type CharacterComponentLibrary,
  type CharacterRecipe,
  type CharacterWardrobeContext,
} from "./character-components";

function freeze<T>(value: T): T {
  if (value && typeof value === "object") {
    for (const child of Object.values(value)) freeze(child);
    Object.freeze(value);
  }
  return value;
}

/** Ephemeral presentation state. Never serialized as canonical appearance. */
export interface PersonRenderSnapshot {
  readonly personId: string;
  readonly appearance: PersonAppearance;
  readonly wardrobe: CharacterWardrobeContext | undefined;
  readonly library: CharacterComponentLibrary;
  /** Each pose is resolved once; consumers only change its placement. */
  recipeForPose(poseFamily: string): CharacterRecipe;
}

export function createPersonRenderSnapshot(options: {
  readonly personId: string;
  readonly appearance: PersonAppearance;
  readonly wardrobe?: CharacterWardrobeContext;
  readonly library: CharacterComponentLibrary;
  readonly unresolvableRequiredSlots?: "throw" | "diagnose";
}): PersonRenderSnapshot {
  const appearance = freeze(structuredClone(options.appearance));
  const wardrobe = options.wardrobe
    ? freeze(structuredClone(options.wardrobe))
    : undefined;
  const recipes = new Map<string, CharacterRecipe>();
  const { library, unresolvableRequiredSlots } = options;
  return Object.freeze({
    personId: options.personId,
    appearance,
    wardrobe,
    library,
    recipeForPose(poseFamily: string) {
      let recipe = recipes.get(poseFamily);
      if (!recipe) {
        recipe = resolveCharacterRecipe(
          {
            appearance,
            wardrobe,
            poseFamily,
            // Legacy appearances stay pinned to the original generation.
            catalogGeneration: appearance.catalogGeneration ?? 1,
            unresolvableRequiredSlots,
          },
          library,
        );
        freeze(recipe);
        recipes.set(poseFamily, recipe);
      }
      return recipe;
    },
  });
}

/** Refuse a stale or foreign snapshot instead of rendering another person's state. */
export function recipeFromSnapshot(
  snapshot: PersonRenderSnapshot,
  personId: string,
  appearance: PersonAppearance,
  library: CharacterComponentLibrary,
  poseFamily: string,
  wardrobe?: CharacterWardrobeContext,
): CharacterRecipe {
  if (
    (wardrobe !== undefined &&
      JSON.stringify(snapshot.wardrobe) !== JSON.stringify(wardrobe)) ||
    snapshot.personId !== personId ||
    snapshot.library !== library ||
    JSON.stringify(snapshot.appearance) !== JSON.stringify(appearance)
  ) {
    throw new Error(
      "Person render snapshot does not match the requested person, appearance, library or wardrobe.",
    );
  }
  return snapshot.recipeForPose(poseFamily);
}
