import type { TraitEffectDeclaration } from "../../trait-packs";
import { slowToWarmUpEffects } from "./facet-slow-to-warm-up";
import { selfConfidenceEffects } from "./self-confidence";

/**
 * The catalog's effect readers, one trait per leaf module so later additions
 * do not rewrite another trait's rows.
 */
export function personalityTraitEffects(): readonly TraitEffectDeclaration[] {
  return [
    ...slowToWarmUpEffects,
    ...selfConfidenceEffects,
  ];
}
