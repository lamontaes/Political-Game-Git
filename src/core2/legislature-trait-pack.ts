import type { TraitMovability, TraitPack, TraitScale } from "./trait-packs";

/**
 * The legislature's own trait pack.
 *
 * It exists because the five ordinary-life traits declare `life:ordinary` and
 * only that, on purpose: whether reliability at a bargaining table is the same
 * trait as reliability in ordinary life is a real question, and the answer is
 * not for a legislative module to assume by quietly widening somebody else's
 * scope. So the legislature declares what it means in its own namespace, and
 * a person can be dependable with their friends and hard to pin down in a
 * chamber without either reading being evidence for the other.
 *
 * **Nothing is conferred yet, and that is deliberate.** The trait below is
 * `conferred-only`, so no person is born with it and no existing save gains
 * anything from this pack being loaded. Until a writer confers it, every
 * reading is `unrecorded` and every sitting decides exactly as it does today.
 * What ought to confer it — a member's own record of how they have negotiated
 * before — is modeling work with its own provenance question, and it is not
 * smuggled in here.
 */

/**
 * Two steps, matching the mind store's `moderate` and `strong`.
 *
 * `defining` is not declared, so a record carrying it reads as unrecorded and
 * says so rather than decoding as though it were `strong`. The keys are the
 * legislature's own; nothing here is shared with the people pack, because two
 * packs sharing an expression key would be two packs able to disagree about
 * what a stored expression means.
 */
export const LEGISLATURE_TRAIT_SCALE: TraitScale = {
  balancedKey: "bargains-without-a-settled-manner",
  balancedLabel: "No settled manner",
  balancedDescription: "Nothing consistent in how they answer at a table.",
  steps: [
    { magnitude: 1, strength: "moderate" },
    { magnitude: 2, strength: "strong" },
  ],
};

/**
 * How movable a bargaining manner is, which is this pack's judgment.
 *
 * Easier to move than an ordinary-life temperament and harder than a mood. A
 * member who has been burned once at a table changes how they answer, and how
 * hard that is depends on how strongly the manner is theirs rather than on how
 * many times they have already changed. It settles over four years, which is
 * roughly a term: a manner held across a whole term without moving is the one
 * everybody in the chamber can rely on.
 *
 * Experience counts on a thirty-day spacing rather than a season, because a
 * chamber deals with the same member repeatedly and a month is long enough for
 * two dealings to be two dealings. The cap is the same as ordinary life: no
 * amount of coming back to the same member moves them by itself.
 */
export const LEGISLATURE_TRAIT_MOVABILITY: TraitMovability = {
  settledByStrength: { subtle: 1, moderate: 2, strong: 3, defining: 4 },
  settlesOver: 4,
  unsettledFloor: 0.5,
  experienceSpacingDays: 30,
  pressureCap: 3,
};

export const LEGISLATURE_PACK = "legislature-v1";

export function legislatureTraitPack(): TraitPack {
  return {
    pack: LEGISLATURE_PACK,
    traits: [
      {
        key: "showing-their-hand",
        label: "Showing their hand",
        description:
          "Whether this member answers early on a bill still being written, or waits for the text to settle before saying anything that can be held against them.",
        poles: {
          low: {
            key: "keeps-it-open",
            label: "Keeps it open",
            description:
              "Will not say where they will be until the language stops moving.",
          },
          high: {
            key: "says-where-they-stand",
            label: "Says where they stand",
            description:
              "Gives an answer while the bill is still being written, and names the condition attached to it.",
          },
        },
        scopes: ["government:bargaining"],
        conferredBy: "conferred-only",
        scale: LEGISLATURE_TRAIT_SCALE,
        movability: LEGISLATURE_TRAIT_MOVABILITY,
        seed: null,
      },
    ],
    effects: [
      {
        decision: "legislation.bargaining.answer-request",
        leans: [
          {
            option: "commit",
            trait: `${LEGISLATURE_PACK}:showing-their-hand`,
            pole: "high",
            explanation:
              "This member has answered before while a bill was still moving, and is willing to again.",
          },
          {
            option: "hold-off",
            trait: `${LEGISLATURE_PACK}:showing-their-hand`,
            pole: "low",
            explanation:
              "This member does not say where they will be until the text stops changing.",
          },
          {
            option: "commit",
            trait: `${LEGISLATURE_PACK}:showing-their-hand`,
            pole: "high",
            about: "subject",
            explanation:
              "The person asking has given straight answers on moving bills before, so an answer back to them is worth something.",
          },
        ],
      },
      {
        decision: "legislation.bargaining.answer-offer",
        leans: [
          {
            option: "take-the-offer",
            trait: `${LEGISLATURE_PACK}:showing-their-hand`,
            pole: "high",
            explanation:
              "This member would rather work with language on the table than keep the question open.",
          },
          {
            option: "hold-off",
            trait: `${LEGISLATURE_PACK}:showing-their-hand`,
            pole: "low",
            explanation:
              "This member holds out rather than settle while there is still room to ask.",
          },
          {
            option: "take-the-offer",
            trait: `${LEGISLATURE_PACK}:showing-their-hand`,
            pole: "high",
            about: "subject",
            explanation:
              "The person offering this has been plain about where they stand before, which makes the offer easier to read.",
          },
        ],
      },
    ],
  };
}
