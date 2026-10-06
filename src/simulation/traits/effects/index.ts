import { facetMeticulousEffects } from "./facet-meticulous";
import type { TraitEffectDeclaration } from "../../trait-packs";

/**
 * Built-in personality effect readers, kept one trait per file so traits can
 * be extended independently without creating a shared registry bottleneck.
 */
export function personalityTraitEffects(): readonly TraitEffectDeclaration[] {
  return [...facetMeticulousEffects];
}
