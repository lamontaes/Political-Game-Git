import type { TraitEffectDeclaration } from "../../trait-packs";

/**
 * Hot-headedness is a quick escalation after perceived frustration, not a
 * general taste for risk or hostility. Research distinguishes reactive,
 * provoked responses from planned aggression and finds trait anger matters
 * especially under provocation:
 *
 * - https://pmc.ncbi.nlm.nih.gov/articles/PMC8790055/
 * - https://pmc.ncbi.nlm.nih.gov/articles/PMC6669806/
 *
 * These rows therefore apply only where the decision itself supplies an
 * immediate adverse event: intolerable work or a discharge. The trait is one
 * consideration beside money, relationships, evidence, and law; it does not
 * imply that the person is broadly reckless or aggressive.
 */
export const hotHeadedEffects: readonly TraitEffectDeclaration[] = [
  {
    decision: "labor.worker-quit",
    leans: [
      {
        option: "quit",
        trait: "personality-v1:facet-hot-headed",
        pole: "high",
        explanation:
          "Their frustration with the job has escalated into leaving now.",
      },
    ],
  },
  {
    decision: "civil-personnel.discharge-appeal",
    leans: [
      {
        option: "appeal",
        trait: "personality-v1:facet-hot-headed",
        pole: "high",
        explanation:
          "They react to the discharge by challenging it immediately.",
      },
    ],
  },
];
