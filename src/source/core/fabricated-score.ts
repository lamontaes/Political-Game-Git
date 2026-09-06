/**
 * The fabricated-score prohibition, as runtime machinery rather than a comment.
 *
 * A statistical agency publishes measured quantities: a dollar amount for a
 * named revenue item, a headcount for a named government function. It does not
 * publish a verdict. The moment a corpus carries a "fiscal health index", an
 * "agency efficiency score" or an "overall capacity rating", it has stopped
 * transcribing a source and started asserting a judgement the source never
 * made — and because that judgement arrives wearing a number, nothing
 * downstream can tell it apart from a measurement.
 *
 * The type systems of the finance and employment domains already make a score
 * unrepresentable: there is no field to put one in. This module is the second
 * line, for the case the type system cannot see — a fabricated metric smuggled
 * in as the *name* of an item or a function, so that the record looks like a
 * transcription and reads like a verdict.
 *
 * The hard part is not catching scores; it is not catching the source. Census
 * publishes an expenditure function literally called "Health", another called
 * "Health and hospitals", and ASPEP staffs a government function called
 * "Health". A guard that rejected the word "health" would reject the Bureau's
 * own vocabulary, and whoever hit it would learn to route around the guard.
 * So the vocabulary is graded:
 *
 *   - METRIC tokens name a measurement *shape* — score, rating, index,
 *     percentile. No Census revenue item, expenditure function or government
 *     function is called any of these. Their presence is decisive on its own.
 *   - JUDGEMENT tokens name an evaluative quality — efficiency, competence,
 *     solvency. Likewise never a published item name, likewise decisive.
 *   - DOMAIN tokens are the ambiguous middle — health, quality, capacity,
 *     performance. These are, or could plausibly be, the Bureau's own words,
 *     so they are decisive only in the company of a COMPOSITE qualifier
 *     ("overall", "weighted", "derived"), which is what turns a subject into a
 *     summary of itself.
 *
 * The consequence is that "Health and hospitals" passes and "Overall fiscal
 * health" does not, which is the distinction that actually matters.
 */

/**
 * Words that name a measurement shape rather than a measured thing.
 *
 * Decisive on their own: the Bureau does not publish an item, a function or a
 * category whose name contains any of these.
 */
export const SCORE_METRIC_TOKENS: readonly string[] = [
  "score",
  "scores",
  "scoring",
  "scorecard",
  "rating",
  "ratings",
  "rank",
  "ranks",
  "ranking",
  "rankings",
  "grade",
  "grades",
  "grading",
  "index",
  "indexes",
  "indices",
  "percentile",
  "percentiles",
  "quartile",
  "quartiles",
  "decile",
  "deciles",
  "composite",
  "z-score",
  "zscore",
];

/**
 * Words that name an evaluative quality rather than an observation.
 *
 * Also decisive on their own. A government's "efficiency" or "competence" is
 * not a line the Census Bureau collects; it is a conclusion somebody drew.
 */
export const SCORE_JUDGEMENT_TOKENS: readonly string[] = [
  "efficiency",
  "efficiencies",
  "inefficiency",
  "effectiveness",
  "competence",
  "competency",
  "incompetence",
  "productivity",
  "solvency",
  "insolvency",
  "creditworthiness",
  "adequacy",
  "inadequacy",
  "soundness",
  "distress",
  "resilience",
  "wellbeing",
  "well-being",
];

/**
 * Words the source itself legitimately uses, which a qualifier can turn into a
 * verdict.
 *
 * "Health" is a Census expenditure function and an ASPEP government function.
 * "Overall fiscal health" is not. Membership here is never decisive alone.
 */
export const SCORE_DOMAIN_TOKENS: readonly string[] = [
  "health",
  "quality",
  "capacity",
  "capability",
  "performance",
  "condition",
  "strength",
];

/**
 * Qualifiers that mark a value as summarised, derived or rolled up.
 *
 * These are what convert a `SCORE_DOMAIN_TOKENS` subject into a claim about
 * that subject as a whole.
 */
export const SCORE_COMPOSITE_QUALIFIERS: readonly string[] = [
  "overall",
  "aggregate",
  "aggregated",
  "weighted",
  "normalized",
  "normalised",
  "synthetic",
  "derived",
  "composite",
];

/** Why a piece of text reads as a fabricated score. */
export interface FabricatedScoreMatch {
  /** The token that decided it. */
  readonly token: string;
  /** For a qualified domain word, the qualifier that made it a verdict. */
  readonly qualifier?: string;
  /** A sentence naming the defect, suitable for a validation finding. */
  readonly reason: string;
}

/** Whole-word, case-insensitive. "upgrade" does not contain "grade". */
function containsWord(haystack: string, token: string): boolean {
  const escaped = token.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(`(?<![\\w-])${escaped}(?![\\w-])`, "i").test(haystack);
}

/**
 * Report the first fabricated-score signal in a piece of source text, if any.
 *
 * `text` is whatever names the value — a category, an item code, an item
 * description, a function label — joined however the caller likes. Returns
 * `null` when the text reads as a source's own vocabulary.
 */
export function findFabricatedScore(text: string): FabricatedScoreMatch | null {
  for (const token of SCORE_METRIC_TOKENS) {
    if (containsWord(text, token)) {
      return {
        token,
        reason: `names "${token}", which describes a measurement shape rather than a published amount. The source publishes observations, not a composite ${token}.`,
      };
    }
  }
  for (const token of SCORE_JUDGEMENT_TOKENS) {
    if (containsWord(text, token)) {
      return {
        token,
        reason: `names "${token}", which is an evaluative judgement rather than anything the source collects.`,
      };
    }
  }
  for (const token of SCORE_DOMAIN_TOKENS) {
    if (!containsWord(text, token)) continue;
    for (const qualifier of SCORE_COMPOSITE_QUALIFIERS) {
      if (containsWord(text, qualifier)) {
        return {
          token,
          qualifier,
          reason: `pairs "${qualifier}" with "${token}". The source may publish ${token} as a subject, but "${qualifier} ${token}" is a roll-up of it into a verdict the source never made.`,
        };
      }
    }
  }
  return null;
}
