import type { TraitEffectDeclaration } from "../../trait-packs";
import { hotHeadedEffects } from "./facet-hot-headed";
import { selfConfidenceEffects } from "./self-confidence";

/**
 * The catalog's effect readers, one trait per leaf module so later additions
 * do not rewrite another trait's rows.
 */
export function personalityTraitEffects(): readonly TraitEffectDeclaration[] {
  return [
    ...hotHeadedEffects,
    ...selfConfidenceEffects,
  ];
}
