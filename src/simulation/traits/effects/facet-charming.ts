import type { TraitEffectDeclaration } from "../../trait-packs";

/**
 * Charm is expressed in the manner of an interpersonal response: engaging
 * attention and responsive delivery keep a request open rather than ending
 * the exchange with a flat refusal. Research on everyday charisma separates
 * affability from influence, while political-charm research locates charm in
 * accessible, proximate interaction. This row therefore argues only for the
 * responsive counteroffer. It does not make the person agreeable, sincere, or
 * persuasive, and it does not override their schedule, relationship, or goals.
 *
 * Research boundaries:
 * - Tskhay et al. (2018), "Charisma in everyday life": everyday charisma has
 *   distinct affability and influence dimensions.
 * - Sonnevend, Lin, and Zhi (2025), "The power of charm": political charm is
 *   contextual and uses performances of accessibility and proximity.
 */
export const facetCharmingEffects: readonly TraitEffectDeclaration[] = [
  {
    decision: "contact.answer",
    leans: [
      {
        option: "counter",
        trait: "personality-v1:facet-charming",
        pole: "high",
        explanation:
          "They keep the exchange open with an attentive, responsive answer.",
      },
    ],
  },
];
