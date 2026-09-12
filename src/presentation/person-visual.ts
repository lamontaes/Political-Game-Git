import type { PersonRenderSnapshot } from "./person-render-snapshot";
import type {
  CharacterComponentLibrary,
  CharacterWardrobeContext,
} from "./character-components";
import type { RuntimeVisualLibrary } from "./visual-integration";
import type { Person } from "../simulation/types";
import {
  LEGACY_APPEARANCE_RECIPE_VERSION,
  derivePersonAppearance,
} from "../simulation/person-appearance";
import {
  CHARACTER_VISUAL_RECIPES,
  PRODUCTION_CHARACTER_LIBRARY,
  PRODUCTION_VISUAL_LIBRARY,
  type RuntimeVisualAsset,
} from "./visual-integration";
import {
  buildCharacterRenderPlan,
  type CharacterRenderPlan,
} from "./character-render-plan";

/** PEOPLE1 person adapter v1. Canonical appearance only; no candidate imports. */
export type PersonVisual =
  | { readonly kind: "authored"; readonly asset: RuntimeVisualAsset }
  | { readonly kind: "modular"; readonly plan: CharacterRenderPlan }
  | { readonly kind: "placeholder"; readonly reason: string };

export interface PersonVisualLibraries {
  readonly characters: CharacterComponentLibrary;
  readonly visuals: RuntimeVisualLibrary;
}

/** Production defaults; isolated developer callers may supply review libraries. */
export function resolvePersonPortrait(
  person: Person,
  options?: {
    readonly snapshot?: PersonRenderSnapshot;
    readonly libraries?: PersonVisualLibraries;
    readonly wardrobe?: CharacterWardrobeContext;
  },
): PersonVisual {
  const characters =
    options?.libraries?.characters ?? PRODUCTION_CHARACTER_LIBRARY;
  const visuals = options?.libraries?.visuals ?? PRODUCTION_VISUAL_LIBRARY;
  if (!person.appearance)
    return { kind: "placeholder", reason: "appearance-unassigned" };
  /*
   * An authored likeness belongs to a PERSON, not to one version of their seed.
   *
   * The recipes below carry literal seeds computed under appearance recipe v1,
   * because that is the only version that existed when they were authored. The
   * seed itself forks on the recipe version — that fork is what makes versioning
   * safe — so the same person created under v2 hashes to a different seed and
   * would silently lose a likeness that was drawn for them specifically.
   *
   * So the person's own v1 seed is tried as well. This restores exactly the
   * prior behaviour for the characters these recipes were authored for and
   * changes nothing for anybody else: a seed is a hash of one person's id, so
   * no other person can collide into someone's authored face.
   */
  const legacySeed = derivePersonAppearance(
    person.id,
    LEGACY_APPEARANCE_RECIPE_VERSION,
  ).seed;
  const authored =
    !person.appearance.selection &&
    !options?.libraries &&
    !options?.wardrobe &&
    !options?.snapshot &&
    Object.values(CHARACTER_VISUAL_RECIPES).find(
      (recipe) =>
        recipe.appearanceSeed === person.appearance!.seed ||
        recipe.appearanceSeed === legacySeed,
    );
  const asset = authored && PRODUCTION_VISUAL_LIBRARY.get(authored.assetId);
  if (asset) return { kind: "authored", asset };
  if (
    (person.appearance.catalogGeneration ?? 1) > characters.catalogGeneration
  ) {
    return { kind: "placeholder", reason: "catalog-generation-unavailable" };
  }
  let plan: CharacterRenderPlan;
  try {
    plan = buildCharacterRenderPlan({
      personId: person.id,
      appearance: person.appearance,
      anchor: {
        id: "person-portrait",
        xPercent: 50,
        yPercent: 55,
        scale: 1,
        poseFamily: "standing-neutral",
        depth: 1,
        bodyWidthPercent: 35,
      },
      plate: { width: 100, height: 100 },
      library: characters,
      visualLibrary: visuals,
      wardrobe: options?.wardrobe,
      snapshot: options?.snapshot,
    });
  } catch (error) {
    /*
     * The planner's own message, kept.
     *
     * This was a bare `catch` returning the bare word `appearance-unresolvable`,
     * and it made the one refusal that carries a real explanation the one
     * refusal that explained nothing: a missing slot, an incompatible
     * combination and an unknown body family all arrived on screen as the same
     * two initials. The prefix is preserved so anything matching on the reason
     * still matches, and what the compositor actually said follows it.
     */
    return {
      kind: "placeholder",
      reason: `appearance-unresolvable: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
  // Released procedural fixtures are regression art, not approved likenesses.
  if (
    plan.complete &&
    plan.layers.every(
      (layer) => !characters.components.get(layer.assetId)?.fixture,
    )
  ) {
    return { kind: "modular", plan };
  }
  return {
    kind: "placeholder",
    reason: plan.complete
      ? "development-fixture-only"
      : "required-art-unavailable",
  };
}
