/**
 * The categories of minor offense the case flow models, and each one's real
 * 2024 arrest rate in a state: disorderly conduct, drunkenness, liquor law
 * violations, curfew and loitering violations, vagrancy and drug possession
 * (FBI Crime Data Explorer, data/research/justice/low-level-arrests-2024.json).
 *
 * The outcome web keeps one measure for them, `justice.low-level-arrests`,
 * whose starting level in a state is the six rates added together, and the
 * police-to-low-level-arrests link moves it with the officers per 1,000. The
 * case flow splits what the web says the month holds across the categories
 * by each one's own rate, so a state that arrests mostly for drug possession
 * has mostly those cases. A place the source holds no arrests for (American
 * Samoa, the Northern Mariana Islands, Puerto Rico, the Virgin Islands)
 * starts from the national rate of each category, marked ESTIMATED. Drug
 * possession is ESTIMATED everywhere: the FBI has no single series for it,
 * so it is the sum of five (see the file's `source.drugPossession`).
 */
import research from "../../data/research/justice/low-level-arrests-2024.json" with { type: "json" };

export type LowLevelTag = "SOURCED" | "ESTIMATED";

export interface LowLevelCategory {
  /** The case row's `category`. */
  readonly key: string;
  /** The research file's name for the category (its `byOffense` key). */
  readonly label: string;
  readonly codes: readonly string[];
  /** How the category's rate is known where its state reports it. */
  readonly tag: LowLevelTag;
}

export const LOW_LEVEL_CATEGORIES =
  research.categories as readonly LowLevelCategory[];

interface RateRow {
  readonly ratePer100k: number;
}
interface PlaceRow {
  readonly reported: boolean;
  readonly byOffense: Readonly<Record<string, RateRow>>;
}
const PLACES = research.places as unknown as Readonly<
  Record<string, PlaceRow | undefined>
>;
const NATIONAL = research.national.byOffense as Readonly<
  Record<string, RateRow>
>;

export interface LowLevelRate {
  readonly category: LowLevelCategory;
  /** Arrests a year per 1,000 residents. */
  readonly ratePer1000: number;
  /** SOURCED only where the state reports and the category is the FBI's own series; the national fallback is always ESTIMATED. */
  readonly tag: LowLevelTag;
  readonly fromNational: boolean;
}

/** Each category's real 2024 rate in a state (its key like "US-AK"), or the national rate where the state has none. */
export function lowLevelRates(stateKey: string): readonly LowLevelRate[] {
  const own = PLACES[stateKey];
  const reports = own?.reported === true;
  return LOW_LEVEL_CATEGORIES.map((category) => {
    const row = reports
      ? own!.byOffense[category.label]
      : NATIONAL[category.label];
    if (!row)
      throw new Error(
        `No ${category.label} rate for ${stateKey} or nationally.`,
      );
    return {
      category,
      ratePer1000: row.ratePer100k / 100,
      tag: reports ? category.tag : "ESTIMATED",
      fromNational: !reports,
    };
  });
}
