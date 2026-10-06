import type { TraitEffectDeclaration } from "../../trait-packs";
import { facetBrazenEffects } from "./facet-brazen";

/**
 * The built-in personality effect readers, kept one trait per file so traits
 * can be extended without making a shared effect table a merge bottleneck.
 */
export function personalityTraitEffects(): readonly TraitEffectDeclaration[] {
  return [...facetBrazenEffects];
}
