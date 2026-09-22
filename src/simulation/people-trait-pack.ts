import {
  PEOPLE_MIND_VERSION,
  TRAIT_SHAPES,
  PEOPLE_TRAITS,
  BALANCED_TRAIT,
} from "./people-trait-definitions";
import type { TraitMovability, TraitPack, TraitScale } from "./trait-packs";

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

/**
 * How movable each of the five is, which is this pack's judgement and not the
 * engine's.
 *
 * `settled` is what a value resists once it has stood for `settlesOver` years
 * and never moved; `perMove` is added for every move already made, so each
 * change leaves somebody harder to shift than the last time they settled.
 *
 * The differences between the rows are authored on purpose. How somebody
 * thinks a decision through is more fundamental than how much they like
 * company, so deliberation settles harder and over longer. Whether somebody
 * keeps what they said is the one most obviously moved by what happens to
 * them, so reliability settles soonest. These are a first playable set, and
 * changing them is an edit to this file — no code reads a trait name to decide
 * how movable it is.
 */
const PEOPLE_TRAIT_MOVABILITY: Readonly<Record<string, TraitMovability>> = {
  sociability: { settled: 2, perMove: 1, settlesOver: 10 },
  deliberation: { settled: 3, perMove: 1.5, settlesOver: 15 },
  reliability: { settled: 2, perMove: 1, settlesOver: 8 },
  conflict: { settled: 3, perMove: 1, settlesOver: 12 },
  risk: { settled: 2, perMove: 1, settlesOver: 10 },
};

/** The floor a trait this pack forgot to judge falls back to: hard to move. */
const UNJUDGED_MOVABILITY: TraitMovability = {
  settled: 3,
  perMove: 1,
  settlesOver: 15,
};

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
        movability: PEOPLE_TRAIT_MOVABILITY[trait] ?? UNJUDGED_MOVABILITY,
      };
    }),
    /**
     * What these traits argue for, as data.
     *
     * Each row names a decision by the id that decision publishes, an option
     * that decision offers, a trait by its qualified key, and which pole
     * argues for it. Nothing here is code, and nothing in the decision names a
     * trait — the two meet at load, where a row that resolves to nothing is
     * rejected rather than quietly doing nothing.
     *
     * The explanations are the words a player reads as the reason, so they are
     * the authored text moved from the call site, not paraphrases of it.
     */
    effects: [
      {
        decision: "contact.answer",
        leans: [
          {
            option: "accept",
            trait: `${PEOPLE_MIND_VERSION}:sociability`,
            pole: "high",
            explanation: "They like seeing people.",
          },
          {
            option: "decline",
            trait: `${PEOPLE_MIND_VERSION}:sociability`,
            pole: "low",
            explanation: "They keep to themselves.",
          },
          {
            option: "counter",
            trait: `${PEOPLE_MIND_VERSION}:deliberation`,
            pole: "low",
            explanation: "They would rather sort it out now than leave it.",
          },
          {
            option: "accept",
            trait: `${PEOPLE_MIND_VERSION}:reliability`,
            pole: "high",
            explanation: "They keep the plans they make.",
          },
          // The two rows about the asker rather than the answerer. This is how
          // a character is portrayed to other people: whoever is deciding
          // weighs what this world has actually recorded about the person
          // asking, which for the played character is whatever they have
          // chosen to be. Someone nobody has observed contributes nothing,
          // here as everywhere.
          {
            option: "accept",
            about: "subject",
            trait: `${PEOPLE_MIND_VERSION}:reliability`,
            pole: "high",
            explanation: "The person asking keeps the plans they make.",
          },
          {
            option: "counter",
            about: "subject",
            trait: `${PEOPLE_MIND_VERSION}:reliability`,
            pole: "low",
            explanation: "The person asking has let plans slide before.",
          },
        ],
      },
    ],
  };
}
