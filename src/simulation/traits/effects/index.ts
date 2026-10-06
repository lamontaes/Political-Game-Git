import type { TraitEffectDeclaration } from "../../trait-packs";
import { playfulMannerEffects } from "./playful-manner";
import { selfConfidenceEffects } from "./self-confidence";

/**
 * The catalog's effect readers, one trait per leaf module so later additions
 * do not rewrite another trait's rows.
 */
export function personalityTraitEffects(): readonly TraitEffectDeclaration[] {
  return [
    ...playfulMannerEffects,
    ...selfConfidenceEffects,
  ];
}
