import type { TraitEffectDeclaration } from "../../trait-packs";
import { selfConfidenceEffects } from "./self-confidence";

/**
 * The catalog's effect readers, collected without putting every trait in one
 * shared data file. Each trait owns one leaf module so later additions do not
 * rewrite another trait's rows.
 */
export function personalityTraitEffects(): readonly TraitEffectDeclaration[] {
  return [...selfConfidenceEffects];
}
