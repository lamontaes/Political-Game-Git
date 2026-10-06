import { facetBluntEffects } from "./effects/facet-blunt";
import type { TraitEffectDeclaration } from "../trait-packs";

/**
 * Built-in, per-trait effect readers.
 *
 * Keeping each trait's rows in its own leaf module lets trait work land without
 * editing the catalogue's definitions or the decision engine.
 */
export function personalityTraitEffects(): readonly TraitEffectDeclaration[] {
  return [...facetBluntEffects];
}
