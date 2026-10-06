import type { TraitEffectDeclaration } from "../../trait-packs";
import { facetZealousEffects } from "./facet-zealous";

/**
 * The personality catalog's independently owned effect readers.
 *
 * Keep the merge here: trait files own only their rows, while the catalog pack
 * remains the single pack namespace and the registry continues to validate
 * every decision and option at load time.
 */
export function personalityTraitEffects(): readonly TraitEffectDeclaration[] {
  return [...facetZealousEffects];
}
