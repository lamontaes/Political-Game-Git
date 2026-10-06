import type { TraitEffectDeclaration } from "../../trait-packs";
import { selfConfidenceEffects } from "./self-confidence";
import { truthfulnessEffects } from "./truthfulness";

/**
 * The catalog's effect readers, one trait per leaf module so later additions
 * do not rewrite another trait's rows.
 */
export function personalityTraitEffects(): readonly TraitEffectDeclaration[] {
  return [
    ...selfConfidenceEffects,
    ...truthfulnessEffects,
  ];
}
