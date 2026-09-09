import type { Person } from "../simulation/types";
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

export function resolvePersonPortrait(person: Person): PersonVisual {
  if (!person.appearance)
    return { kind: "placeholder", reason: "appearance-unassigned" };
  const authored = Object.values(CHARACTER_VISUAL_RECIPES).find(
    (recipe) => recipe.appearanceSeed === person.appearance!.seed,
  );
  const asset = authored && PRODUCTION_VISUAL_LIBRARY.get(authored.assetId);
  if (asset) return { kind: "authored", asset };
  if (
    (person.appearance.catalogGeneration ?? 1) >
    PRODUCTION_CHARACTER_LIBRARY.catalogGeneration
  ) {
    return { kind: "placeholder", reason: "catalog-generation-unavailable" };
  }
  const plan = buildCharacterRenderPlan({
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
    library: PRODUCTION_CHARACTER_LIBRARY,
    visualLibrary: PRODUCTION_VISUAL_LIBRARY,
  });
  // Released procedural fixtures are regression art, not approved likenesses.
  if (
    plan.complete &&
    plan.layers.every(
      (layer) =>
        !PRODUCTION_CHARACTER_LIBRARY.components.get(layer.assetId)?.fixture,
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
