import type { TraitPack } from "../../trait-packs";
import { facetEnviousEffects } from "./facet-envious";

/**
 * Built-in personality effect readers, kept one trait per file so additions do
 * not make every trait assignment edit the catalogue pack itself.
 */
export function personalityTraitEffects(): TraitPack["effects"] {
  return [...facetEnviousEffects];
}
