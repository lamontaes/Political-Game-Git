import type { TraitEffectDeclaration } from "../../trait-packs";
import { facetComfortingEffects } from "./facet-comforting";
import { facetGentleEffects } from "./facet-gentle";
import { facetNurturingEffects } from "./facet-nurturing";
import { facetSupportiveEffects } from "./facet-supportive";
import { facetTenderHeartedEffects } from "./facet-tender-hearted";

/** Checked-in readers compiled into the personality catalog. */
export const PERSONALITY_TRAIT_EFFECTS: readonly TraitEffectDeclaration[] = [
  ...facetGentleEffects,
  ...facetSupportiveEffects,
  ...facetComfortingEffects,
  ...facetNurturingEffects,
  ...facetTenderHeartedEffects,
];
