import { facetOpportunisticEffects } from "./facet-opportunistic";
import type { TraitEffectDeclaration } from "../../trait-packs";

/**
 * Effect readers owned one trait at a time. Keeping their rows behind this
 * small loader lets the personality pack consume one merged view without
 * putting unrelated traits back into a shared authoring file.
 */
export function personalityTraitEffects(): readonly TraitEffectDeclaration[] {
  return [...facetOpportunisticEffects];
}
