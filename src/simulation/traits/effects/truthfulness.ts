import type { TraitEffectDeclaration } from "../../trait-packs";

/**
 * Truthfulness bears on whether a charged person admits the offense or
 * maintains a denial at trial. Behavioral studies find that honesty traits
 * predict less cheating and intentional misreporting, while also showing that
 * circumstances still matter; this is therefore one argument beside the
 * evidence, sentence offer, public consequences, and the person's other
 * traits, never a claim about guilt and never a forced outcome.
 *
 * Research:
 * - https://pubmed.ncbi.nlm.nih.gov/29117784/
 * - https://pubmed.ncbi.nlm.nih.gov/36938760/
 */
export const truthfulnessEffects: readonly TraitEffectDeclaration[] = [
  {
    decision: "court.plea",
    leans: [
      {
        option: "plead",
        trait: "personality-v1:truthfulness",
        pole: "high",
        explanation: "They would rather admit what they did than deny it.",
      },
      {
        option: "trial",
        trait: "personality-v1:truthfulness",
        pole: "low",
        explanation: "They are willing to deny what they did.",
      },
    ],
  },
];
