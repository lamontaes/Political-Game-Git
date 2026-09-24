import {
  lifePlaceByJurisdictionId,
  stateKeyForJurisdiction,
} from "./life-places";
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
}

/** Keyed by state or territory, as `US-WY`, `US-PR`. */
export type AgeOfMajorityRules = Readonly<
  Partial<Record<string, AgeOfMajorityRule>>
>;

/**
 * The age at which a child authority ends, by state or territory.
 *
 * EMPTY, deliberately. An entry goes in only with a real, checkable source
 * (research: age-of-majority-by-state). Most states use eighteen, but
 * Alabama and Nebraska use nineteen and Mississippi twenty-one, and nobody
 * has read the statutes for this game yet. Until a state has an entry, when
 * its children's authority ends is unknown, and unknown is neither
 * permission nor a default: `catchUpComingOfAge` writes nothing for them.
 */
export const AGE_OF_MAJORITY_RULES: AgeOfMajorityRules = {};

/**
 * PLACEHOLDER(research: age-of-majority-by-state). A presentation threshold
 * only: from this age a person is not *described* as somebody's dependent
 * (see `person-context.ts`) and may leave home to buy one
 * (`home-purchase.ts`). It ends nothing in the record; only a rule in
 * `AGE_OF_MAJORITY_RULES` does that.
 */
export const GROWN_UP_PRESENTATION_AGE_PLACEHOLDER = 18;

/**
 * The state or territory a person lives in, from their home jurisdiction's
 * own record. Null when the record does not say.
 */
export function homeStateKey(world: World, personId: EntityId): string | null {
  const person = world.people[personId];
  if (!person) return null;
  const place = lifePlaceByJurisdictionId(person.homeJurisdictionId);
  if (place?.stateJurisdictionKey) return place.stateJurisdictionKey;
  const jurisdiction = world.jurisdictions[person.homeJurisdictionId];
  return jurisdiction ? stateKeyForJurisdiction(jurisdiction) : null;
}

/** The rule for where this person lives, or null when there is none. */
export function ageOfMajorityFor(
  world: World,
  personId: EntityId,
  rules: AgeOfMajorityRules = AGE_OF_MAJORITY_RULES,
): AgeOfMajorityRule | null {
  const key = homeStateKey(world, personId);
  return key === null ? null : (rules[key] ?? null);
}
