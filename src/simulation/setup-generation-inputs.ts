import { questionnaireItem, questionnaireOption } from "./setup-questionnaire";
import type { SetupPriorStore } from "./types";

/**
 * The one seam through which a setup answer may reach world generation.
 *
 * WHAT CHANGED, AND WHY IT IS NOT A RETREAT FROM THE OLD RULE.
 *
 * Until Packet 77 the answer was flatly no: `worldSeedFor` took the world half
 * of a setup and nothing else, and a comment in `new-game-identity.ts` said
 * that a political answer must never manufacture a correlated family. The
 * concern behind that rule was real and is unchanged — a player who says
 * something about tax must not thereby be handed a family that agrees with
 * them, and no answer may write a canonical fact.
 *
 * What the human owner asked for in Packet 77 is different from what that rule
 * forbade. A normal start GENERATES the parents, the household and the
 * background; the player does not author them. Letting the calibration shape
 * that generation is the difference between a questionnaire that decides what
 * the game asks you next and one that also decides something about the life it
 * builds. So the rule is narrowed rather than dropped, and this module is where
 * the narrowing is written down:
 *
 *   1. The ONLY thing about a player's answers that reaches world generation is
 *      the two bounded integers below. Not the answers, not the question keys,
 *      not the choice ids, not a digest of any of them.
 *   2. Both are quantized to [-2, +2]. They are leans, not facts.
 *   3. Neither names a person, a date, a place or an event. Every canonical
 *      record is still written by the generator from its own RNG; these only
 *      move the range it draws from.
 *   4. No answers at all encodes to `null`, and a world built from a setup that
 *      answered nothing is byte-identical to one built before this seam
 *      existed.
 *
 * That is what makes "answers may shape the family, and may never author it"
 * checkable instead of assertable: to break it you would have to add a field
 * here, and the tests count them.
 */

export const SETUP_GENERATION_INPUT_VERSION = 1;

/** The widest a lean may move a generated range, in either direction. */
export const GENERATION_LEAN_LIMIT = 2;

export interface SetupGenerationInputs {
  readonly version: number;
  /**
   * A canonical string standing for exactly the influence below.
   *
   * It joins the build seed, so the same answers rebuild the same household and
   * materially different answers build a different one. Two answer sets that
   * lean the same way produce the same string on purpose: the seam's promise is
   * that the declared leans are the whole of the influence, and an encoding
   * that also carried the answers' identity would quietly make that false.
   */
  readonly encoding: string;
  /**
   * How settled the household reads, from `security-stability`.
   *
   * Positive is "protecting what is steady" and shifts the guardian's age band
   * later; negative is "openness to disruption" and shifts it earlier. It moves
   * a range the generator draws from and decides nothing on its own.
   */
  readonly guardianAgeLean: number;
  /**
   * Who is carried, from `care-obligation`.
   *
   * Positive is "carrying what others cannot" and tilts a sibling younger;
   * negative is "naming your own limits" and tilts them older. It narrows a
   * list of candidate age gaps; the generator still picks from it.
   */
  readonly siblingAgeLean: number;
}

/**
 * How much summed nudge is worth one step of lean.
 *
 * An authored nudge is on [-1, +1] per answer, and this band is [-2, +2]. At
 * this scale one clearly-leaning answer is worth a step and two saturate the
 * band, which is the resolution a five-question short path can actually
 * support: measured against the authored bank, a short path sums to roughly
 * half a point on an axis it touches, so a coarser scale would leave the seam
 * inert for every player who did not take the long calibration.
 */
const STEPS_PER_POINT = 2;

function quantize(total: number): number {
  const rounded = Math.round(total * STEPS_PER_POINT);
  if (rounded > GENERATION_LEAN_LIMIT) return GENERATION_LEAN_LIMIT;
  if (rounded < -GENERATION_LEAN_LIMIT) return -GENERATION_LEAN_LIMIT;
  // `-0` and `0` encode differently in JSON and would make one setup two
  // setups, so the sign is normalized away here rather than at every use.
  return rounded === 0 ? 0 : rounded;
}

/**
 * Sums the nudges an answered choice declared on one axis.
 *
 * An answer naming a question or a choice the bank no longer offers
 * contributes nothing rather than throwing: a save written before an item was
 * withdrawn still names it, and reading it back must not fail.
 */
function leanOn(priors: SetupPriorStore, dimension: string): number {
  let total = 0;
  for (const answer of priors.answers) {
    if (answer.choiceId === null) continue;
    const item = questionnaireItem(answer.questionKey);
    if (!item) continue;
    const option = questionnaireOption(item, answer.choiceId);
    if (!option) continue;
    for (const nudge of option.nudges) {
      if (nudge.dimension === dimension) total += nudge.magnitude;
    }
  }
  return total;
}

/**
 * The generation inputs a set of answers justifies, or null when there are
 * none.
 *
 * Null is the important return. It is what keeps every world built before this
 * seam existed exactly as it was, and it is why a player who skips the
 * calibration is not quietly playing a different game from the one the earlier
 * tests pinned.
 */
export function generationInputsFor(
  priors: SetupPriorStore,
): SetupGenerationInputs | null {
  const answered = priors.answers.filter(
    (answer) => answer.choiceId !== null,
  ).length;
  if (answered === 0) return null;
  const guardianAgeLean = quantize(leanOn(priors, "security-stability"));
  const siblingAgeLean = quantize(leanOn(priors, "care-obligation"));
  return {
    version: SETUP_GENERATION_INPUT_VERSION,
    encoding: `gen-v${SETUP_GENERATION_INPUT_VERSION}:${guardianAgeLean}:${siblingAgeLean}`,
    guardianAgeLean,
    siblingAgeLean,
  };
}

/**
 * The guardian's age band, in years before the child, after the lean.
 *
 * The unleant band is 24 to 41, which is the band the generator has always
 * drawn from. A lean moves both ends by two years per step and never widens or
 * inverts it, so the strongest possible answer set moves a guardian by four
 * years — enough to read as a different household, nowhere near enough to be a
 * biography the player wrote.
 */
export function guardianAgeBand(
  inputs: SetupGenerationInputs | null,
): readonly [number, number] {
  const shift = (inputs?.guardianAgeLean ?? 0) * 2;
  return [24 + shift, 41 + shift] as const;
}

/**
 * Candidate sibling age gaps, in years, after the lean.
 *
 * Positive is an older sibling, negative a younger one, and zero is absent
 * throughout because two children in one household sharing a birthday makes
 * "older" and "younger" unanswerable from the record.
 *
 * A weak lean tilts the list; a strong one narrows it to one side. The
 * generator still picks, which is the difference between shaping and writing.
 */
export function siblingAgeGaps(
  inputs: SetupGenerationInputs | null,
): readonly number[] {
  switch (inputs?.siblingAgeLean ?? 0) {
    case 2:
      return [-4, -3, -2];
    case 1:
      return [-4, -3, -2, 2];
    case -1:
      return [-2, 2, 3, 4];
    case -2:
      return [2, 3, 4];
    default:
      return [-4, -3, -2, 2, 3, 4];
  }
}
