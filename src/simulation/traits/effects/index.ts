import type { TraitEffectDeclaration } from "../../trait-packs";
import { facetCuriousEffects } from "./facet-curious";
import { actionDespiteFearEffects } from "./action-despite-fear";
import { bondLoyaltyEffects } from "./bond-loyalty";
import { concernForDistressEffects } from "./concern-for-distress";
import { facetArgumentativeEffects } from "./facet-argumentative";
import { facetAssertiveEffects } from "./facet-assertive";
import { facetBluntEffects } from "./facet-blunt";
import { facetBrazenEffects } from "./facet-brazen";
import { facetCockyEffects } from "./facet-cocky";
import { facetComfortingEffects } from "./facet-comforting";
import { facetCompetitiveEffects } from "./facet-competitive";
import { facetCruelEffects } from "./facet-cruel";
import { facetDefensiveEffects } from "./facet-defensive";
import { facetDutyBoundEffects } from "./facet-duty-bound";
import { facetEnviousEffects } from "./facet-envious";
import { facetForgivingEffects } from "./facet-forgiving";
import { facetFriendlyEffects } from "./facet-friendly";
import { facetGenerousEffects } from "./facet-generous";
import { facetGentleEffects } from "./facet-gentle";
import { facetIndependentEffects } from "./facet-independent";
import { facetHostileEffects } from "./facet-hostile";
import { facetHumbleEffects } from "./facet-humble";
import { facetMeticulousEffects } from "./facet-meticulous";
import { facetNurturingEffects } from "./facet-nurturing";
import { facetOpenMindedEffects } from "./facet-open-minded";
import { facetOpportunisticEffects } from "./facet-opportunistic";
import { facetPersistentEffects } from "./facet-persistent";
import { facetPhilanthropicEffects } from "./facet-philanthropic";
import { facetProudEffects } from "./facet-proud";
import { facetSelfConsciousEffects } from "./facet-self-conscious";
import { facetSkepticalEffects } from "./facet-skeptical";
import { facetStudiousEffects } from "./facet-studious";
import { facetSupportiveEffects } from "./facet-supportive";
import { facetTenderHeartedEffects } from "./facet-tender-hearted";
import { facetWorkCenteredEffects } from "./facet-work-centered";
import { facetZealousEffects } from "./facet-zealous";
import { initialTrustEffects } from "./initial-trust";
import { methodRevisionEffects } from "./method-revision";
import { outwardEmotionalDisplayEffects } from "./outward-emotional-display";
import { patienceEffects } from "./patience";
import { selfConfidenceEffects } from "./self-confidence";
import { uncertainOutlookEffects } from "./uncertain-outlook";
import { voluntaryEffortEffects } from "./voluntary-effort";

/**
 * The catalog's effect readers, one trait per leaf module so later additions
 * do not rewrite another trait's rows.
 */
export function personalityTraitEffects(): readonly TraitEffectDeclaration[] {
  return [
    ...actionDespiteFearEffects,
    ...bondLoyaltyEffects,
    ...concernForDistressEffects,
    ...facetArgumentativeEffects,
    ...facetAssertiveEffects,
    ...facetBluntEffects,
    ...facetBrazenEffects,
    ...facetCockyEffects,
    ...facetComfortingEffects,
    ...facetCompetitiveEffects,
    ...facetCruelEffects,
    ...facetDefensiveEffects,
    ...facetDutyBoundEffects,
    ...facetEnviousEffects,
    ...facetForgivingEffects,
    ...facetFriendlyEffects,
    ...facetGenerousEffects,
    ...facetGentleEffects,
    ...facetHostileEffects,
    ...facetHumbleEffects,
    ...facetIndependentEffects,
    ...facetMeticulousEffects,
    ...facetNurturingEffects,
    ...facetOpenMindedEffects,
    ...facetOpportunisticEffects,
    ...facetPersistentEffects,
    ...facetPhilanthropicEffects,
    ...facetProudEffects,
    ...facetSelfConsciousEffects,
    ...facetSkepticalEffects,
    ...facetStudiousEffects,
    ...facetSupportiveEffects,
    ...facetTenderHeartedEffects,
    ...facetWorkCenteredEffects,
    ...facetZealousEffects,
    ...initialTrustEffects,
    ...methodRevisionEffects,
    ...outwardEmotionalDisplayEffects,
    ...patienceEffects,
    ...selfConfidenceEffects,
    ...uncertainOutlookEffects,
    ...facetCuriousEffects,
    ...voluntaryEffortEffects,
  ];
}
