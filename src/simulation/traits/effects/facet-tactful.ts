import type { TraitEffectDeclaration } from "../../trait-packs";

/**
 * Tact bears on how somebody answers an invitation they cannot simply accept.
 *
 * Refusals can threaten the inviter's standing and relationship; indirect,
 * face-saving replies are consequently more common than direct refusals:
 * https://doi.org/10.3389/fcomm.2022.742283. Experimental work also finds
 * that indirect replies soften recipients' negative emotional response:
 * https://doi.org/10.3390/brainsci13071053.
 *
 * That evidence supports offering another day instead of ending the exchange
 * with a bare no. It does not support making a tactful person accept, nor does
 * it make tact universally beneficial: indirect language can impede clarity
 * in other settings. The row is therefore limited to this ordinary invitation
 * decision and remains one consideration beside availability and relationship.
 */
export const facetTactfulEffects: readonly TraitEffectDeclaration[] = [
  {
    decision: "contact.answer",
    leans: [
      {
        option: "counter",
        trait: "personality-v1:facet-tactful",
        pole: "high",
        explanation:
          "They offer another day rather than close the invitation with a bare no.",
      },
    ],
  },
];
