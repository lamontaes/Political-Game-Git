import type { TraitEffectDeclaration } from "../../trait-packs";

/**
 * Generosity is readily sharing available resources or time. It shows up when
 * someone asks for backing: a generous person is quicker to grant a campaign's
 * request for support. The catalog marks the trait one-sided, so only its high
 * pole argues; no marked generosity says nothing about stinginess.
 */
export const facetGenerousEffects: readonly TraitEffectDeclaration[] = [
  {
    decision: "campaign.support-request",
    leans: [
      {
        option: "grant",
        trait: "personality-v1:facet-generous",
        pole: "high",
      },
    ],
  },
];
