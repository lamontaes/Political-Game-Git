import {
  PEOPLE_MIND_VERSION,
  TRAIT_SHAPES,
  PEOPLE_TRAITS,
  BALANCED_TRAIT,
} from "./people-trait-definitions";
import type { TraitPack, TraitScale } from "./trait-packs";

/**
 * The five ordinary-life traits, as the first pack.
 *
 * Their content is the content that used to be a tuple and a shape record in
 * `people-trait-definitions.ts`, read from those same constants rather than
 * copied, so there is one place the words live and no chance of the pack and
 * the definitions drifting apart while both claim to be the five traits.
 *
 * The pack name is `people-mind-v1`, which is what `PEOPLE_MIND_VERSION`
 * already is, so a qualified key here is `people-mind-v1:deliberation` — the
 * stable key every existing record already carries. That is deliberate and it
 * is the whole migration story: no save is touched and nothing is converted.
 */

/**
 * The scale these five have always used: ±1 stored as moderate, ±2 as strong,
 * balanced as subtle. `defining` is not declared, so a record carrying it is
 * now rejected by name instead of quietly decoding as though it were strong.
 */
export const PEOPLE_TRAIT_SCALE: TraitScale = {
  balancedKey: BALANCED_TRAIT.key,
  balancedLabel: BALANCED_TRAIT.label,
  balancedDescription: "No marked lean either way.",
  steps: [
    { magnitude: 1, strength: "moderate" },
    { magnitude: 2, strength: "strong" },
  ],
};

/** Most people are unremarkable on a trait. Unchanged from the tuple. */
const SEED_SPREAD = [-2, -1, -1, 0, 0, 0, 0, 1, 1, 2] as const;

/**
 * Ordinary life, and only ordinary life.
 *
 * A legislature or any other room that wants to read one of these has to widen
 * this list, which is a visible edit here rather than an invisible read
 * somewhere else. Whether reliability at a bargaining table is the same trait
 * as reliability in ordinary life is a real question, and this is where
 * somebody answers it on purpose.
 */
const ORDINARY_LIFE_SCOPES = ["life:ordinary"] as const;

export function peopleTraitPack(): TraitPack {
  return {
    pack: PEOPLE_MIND_VERSION,
    traits: PEOPLE_TRAITS.map((trait) => {
      const shape = TRAIT_SHAPES[trait];
      return {
        key: trait,
        label: shape.label,
        description: `${shape.description} A fictional behavior tendency, not a measurement.`,
        poles: {
          low: {
            key: shape.low.key,
            label: shape.low.label,
            description: `Leans ${shape.low.label.toLowerCase()}.`,
          },
          high: {
            key: shape.high.key,
            label: shape.high.label,
            description: `Leans ${shape.high.label.toLowerCase()}.`,
          },
        },
        scopes: [...ORDINARY_LIFE_SCOPES],
        conferredBy: "seeded" as const,
        scale: PEOPLE_TRAIT_SCALE,
        seed: { spread: [...SEED_SPREAD] },
      };
    }),
    // Effects land here as the eleven decisions start publishing themselves.
    effects: [],
  };
}
