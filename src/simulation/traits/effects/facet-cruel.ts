import type { TraitEffectDeclaration } from "../../trait-packs";

/**
 * A cruel person sometimes uses humiliation or suffering as a means or an end.
 * In criminal proceedings, that can be a reason to favor holding, punishment,
 * and continuing a sentence. These are arguments, not rules: the law, evidence,
 * and every other recorded reason remain in each decision.
 */
export const facetCruelEffects: readonly TraitEffectDeclaration[] = [
  {
    decision: "justice.pretrial-detention",
    leans: [
      {
        option: "court:hold-before-trial",
        trait: "personality-v1:facet-cruel",
        pole: "high",
        explanation:
          "They want the defendant to suffer the restriction of jail.",
      },
    ],
  },
  {
    decision: "justice.sentence",
    leans: [
      {
        option: "court:jail",
        trait: "personality-v1:facet-cruel",
        pole: "high",
        explanation: "They want the defendant to bear a painful punishment.",
      },
    ],
  },
  {
    decision: "justice.clemency-decision",
    leans: [
      {
        option: "clemency:deny",
        trait: "personality-v1:facet-cruel",
        pole: "high",
        explanation: "They want the person to continue suffering the sentence.",
      },
    ],
  },
  {
    decision: "court.jury-vote",
    leans: [
      {
        option: "convict",
        trait: "personality-v1:facet-cruel",
        pole: "high",
        explanation: "They want to see the defendant made to pay.",
      },
    ],
  },
];
