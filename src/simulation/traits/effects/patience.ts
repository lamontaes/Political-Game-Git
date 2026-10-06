import type { TraitEffectDeclaration } from "../../trait-packs";

/**
 * Patience bears on whether somebody preserves a viable plan through delay.
 *
 * Intertemporal-choice research consistently distinguishes a patient choice
 * (accepting a later outcome) from an impatient choice (favoring an immediate
 * outcome). The contact answer is the existing decision where that distinction
 * is literal: offering another day keeps the meeting viable despite delay,
 * while declining ends it. These rows do not claim that patience makes a
 * person sociable or obliges them to meet anyone.
 *
 * Research basis:
 * - https://pmc.ncbi.nlm.nih.gov/articles/PMC5692544/
 * - https://pmc.ncbi.nlm.nih.gov/articles/PMC7116214/
 */
export const patienceEffects: readonly TraitEffectDeclaration[] = [
  {
    decision: "contact.answer",
    leans: [
      {
        option: "counter",
        trait: "personality-v1:patience",
        pole: "high",
        explanation: "They are willing to wait for another day to meet.",
      },
      {
        option: "decline",
        trait: "personality-v1:patience",
        pole: "low",
        explanation: "They do not want to wait for another day to meet.",
      },
    ],
  },
];
