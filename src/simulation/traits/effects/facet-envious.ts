import type { TraitPack } from "../../trait-packs";

/** Decisions where a known envious tendency supplies an actor's own reason. */
export const facetEnviousEffects: TraitPack["effects"] = [
  {
    decision: "contact.answer",
    leans: [
      {
        option: "accept",
        trait: "personality-v1:facet-envious",
        pole: "high",
        explanation:
          "They want to see where they stand beside the person asking.",
      },
    ],
  },
];
