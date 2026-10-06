import { facetStudiousEffects } from "./facet-studious";
import type { TraitEffectDeclaration } from "../../trait-packs";

/**
 * The build's catalog-trait readers. Each trait owns one leaf module so adding
 * its arguments does not make every other trait owner edit the same registry.
 */
export function personalityTraitEffects(): readonly TraitEffectDeclaration[] {
  return [...facetStudiousEffects];
}
