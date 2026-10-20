import {
  PERSONALITY_PACK,
  personalityTraitPack,
} from "../core2/personality-catalogue";
import type { TraitPack } from "../core2/trait-packs";
import { personalityTraitEffects } from "./traits/effects";

/**
 * The qualities that bear on whether somebody holding an office runs again.
 * Each reads only when the person is known for it; nobody's silence on a
 * scale is read as its opposite.
 */
const CATALOGUE_EFFECTS: TraitPack["effects"] = [
  {
    decision: "career.consider-another-term",
    leans: [
      {
        option: "seek",
        trait: `${PERSONALITY_PACK}:facet-ambitious`,
        pole: "high",
        explanation: "They want more from public life, and the seat is how.",
      },
      {
        option: "seek",
        trait: `${PERSONALITY_PACK}:facet-duty-bound`,
        pole: "high",
        explanation: "They see the office as a duty they are not done with.",
      },
      {
        option: "seek",
        trait: `${PERSONALITY_PACK}:facet-work-centered`,
        pole: "high",
        explanation: "The work has become most of their life.",
      },
      {
        option: "step-down",
        trait: `${PERSONALITY_PACK}:facet-contented`,
        pole: "high",
        explanation: "They have done what they came to do.",
      },
      {
        option: "step-down",
        trait: `${PERSONALITY_PACK}:facet-restless`,
        pole: "high",
        explanation: "Years of the same work have worn on them.",
      },
    ],
  },
  ...personalityTraitEffects(),
];

export function personalityCataloguePack(): TraitPack {
  return personalityTraitPack(CATALOGUE_EFFECTS);
}
