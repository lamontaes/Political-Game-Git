import type { TraitEffectDeclaration } from "../../trait-packs";

/**
 * Initial trust is the credit a person gives reasonable claims while evidence
 * is incomplete. It bears on how someone answers an ordinary contact from
 * another person; the contact decision still owns eligibility and every other
 * reason, and trust is not knowledge of who is truthful.
 */
export const initialTrustEffects: readonly TraitEffectDeclaration[] = [
  {
    decision: "contact.answer",
    leans: [
      {
        option: "accept",
        trait: "personality-v1:initial-trust",
        pole: "high",
        explanation:
          "They give a reasonable request the benefit of the doubt without waiting for proof.",
      },
      {
        option: "counter",
        trait: "personality-v1:initial-trust",
        pole: "low",
        explanation:
          "They look for hidden motives and ask for different terms before agreeing.",
      },
    ],
  },
];
