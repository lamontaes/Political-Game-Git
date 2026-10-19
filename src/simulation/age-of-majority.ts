import ageOfMajorityData from "../../data/research/people/age-of-majority.json" with { type: "json" };
import type { EntityId, IsoDate, World } from "./types";

/** Where an age of majority was read, so anybody can check it. */
export interface AgeOfMajoritySource {
  /** The statute or official page, as a reader would cite it. */
  readonly citation: string;
  readonly url: string;
  /** The day the source was read. */
  readonly retrievedAt: IsoDate;
}

/** One state's or territory's age of majority, and where it comes from. */
export interface AgeOfMajorityRule {
  readonly age: number;
  readonly source: AgeOfMajoritySource;
  /** Present when the source does not list the place and the age is estimated. */
  readonly estimatedFrom?: string;
}

/** Keyed by state or territory, as `US-WY`, `US-PR`. */
export type AgeOfMajorityRules = Readonly<
  Partial<Record<string, AgeOfMajorityRule>>
>;

interface AgeOfMajorityCorpus {
  readonly readOn: string;
  readonly source: { readonly citation: string; readonly url: string };
  readonly places: Readonly<
    Record<string, { readonly age: number; readonly estimatedFrom?: string }>
  >;
}

function rulesFromCorpus(corpus: AgeOfMajorityCorpus): AgeOfMajorityRules {
  const source: AgeOfMajoritySource = {
    citation: corpus.source.citation,
    url: corpus.source.url,
    retrievedAt: corpus.readOn as IsoDate,
  };
  return Object.fromEntries(
    Object.entries(corpus.places).map(([usps, row]) => [
      `US-${usps}`,
      {
        age: row.age,
        source,
        ...(row.estimatedFrom ? { estimatedFrom: row.estimatedFrom } : {}),
      },
    ]),
  );
}

/**
 * The age at which a child authority ends, by state or territory, read from
 * `data/research/people/age-of-majority.json` for all 56 places. Most use
 * eighteen; Alabama and Nebraska use nineteen, and Mississippi and Puerto
 * Rico twenty-one. A territory the source table does not list carries its
 * `estimatedFrom`.
 */
export const AGE_OF_MAJORITY_RULES: AgeOfMajorityRules = rulesFromCorpus(
  ageOfMajorityData as AgeOfMajorityCorpus,
);

/**
 * ESTIMATED FROM AVERAGE (research: age-of-majority-by-state): 18, the age of
 * majority in most states. A presentation threshold
 * only: from this age a person is not *described* as somebody's dependent
 * (see `person-context.ts`) and may leave home to buy one
 * (`home-purchase.ts`). It ends nothing in the record; only a rule in
 * `AGE_OF_MAJORITY_RULES` does that.
 */
export const GROWN_UP_PRESENTATION_AGE_ESTIMATE = 18;

import { homeStateKey } from "./state-jurisdiction-id";
export { homeStateKey };

/** The rule for where this person lives, or null when there is none. */
export function ageOfMajorityFor(
  world: World,
  personId: EntityId,
  rules: AgeOfMajorityRules = AGE_OF_MAJORITY_RULES,
): AgeOfMajorityRule | null {
  const key = homeStateKey(world, personId);
  return key === null ? null : (rules[key] ?? null);
}
