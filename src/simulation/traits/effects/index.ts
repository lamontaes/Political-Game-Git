import type { TraitEffectDeclaration } from "../../trait-packs";
import { facetBluntEffects } from "./facet-blunt";
import { facetBrazenEffects } from "./facet-brazen";
import { facetComfortingEffects } from "./facet-comforting";
import { facetEnviousEffects } from "./facet-envious";
import { facetGentleEffects } from "./facet-gentle";
import { facetMeticulousEffects } from "./facet-meticulous";
import { facetNurturingEffects } from "./facet-nurturing";
import { facetOpportunisticEffects } from "./facet-opportunistic";
import { facetStudiousEffects } from "./facet-studious";
import { facetSupportiveEffects } from "./facet-supportive";
import { facetTenderHeartedEffects } from "./facet-tender-hearted";
import { facetZealousEffects } from "./facet-zealous";
import { selfConfidenceEffects } from "./self-confidence";

/**
 * The catalog's effect readers, one trait per leaf module so later additions
 * do not rewrite another trait's rows.
 */
export function personalityTraitEffects(): readonly TraitEffectDeclaration[] {
  return [
    ...facetBluntEffects,
    ...facetBrazenEffects,
    ...facetComfortingEffects,
    ...facetEnviousEffects,
    ...facetGentleEffects,
    ...facetMeticulousEffects,
    ...facetNurturingEffects,
    ...facetOpportunisticEffects,
    ...facetStudiousEffects,
    ...facetSupportiveEffects,
    ...facetTenderHeartedEffects,
    ...facetZealousEffects,
    ...selfConfidenceEffects,
  ];
}
