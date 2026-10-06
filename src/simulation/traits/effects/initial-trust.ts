import type { TraitEffectDeclaration } from "../../trait-packs";

/**
 * Initial trust bears on whether somebody accepts an ordinary invitation when
 * they do not yet have enough evidence to know the asker well. Experiments
 * operationalize generalized trust as willingness to enter an interdependent
 * exchange with a stranger, while work on unfamiliar partners finds that
 * people may extend or withhold trust under uncertainty:
 * https://pmc.ncbi.nlm.nih.gov/articles/PMC5040920/
 * https://pmc.ncbi.nlm.nih.gov/articles/PMC5816167/
 *
 * This is only an initial presumption. Recorded dealings, obligations, goals,
 * availability, and every other reason in the contact decision still bear on
 * the answer; the trait neither establishes that the asker is truthful nor
 * overrides evidence about them.
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
          "They give the invitation the benefit of the doubt while evidence is incomplete.",
      },
      {
        option: "decline",
        trait: "personality-v1:initial-trust",
        pole: "low",
        explanation:
          "They suspect a concealed motive while evidence is incomplete.",
      },
    ],
  },
];
