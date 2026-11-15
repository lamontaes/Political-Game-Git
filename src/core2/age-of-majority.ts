/**
 * The age at which a parent's authority ends where a person lives: the one
 * reader every engine uses for "of age" (where a person decides alone where
 * they live, who counts as an adult in a household's bills). It reads the
 * research table of ages of majority by state or territory, and where the
 * table cannot be read for a place, the age most places set. It is not the
 * voting age (`votingAge`), which a law can change without changing who is
 * an adult.
 */
import majority from "../../data/research/people/age-of-majority.json" with { type: "json" };
import { placeStateKey } from "./place-map";

/** The ages of majority the research table records, by state or territory. */
const MAJORITY = majority.places as Record<string, { age: number }>;
/** The age most places set, for a place the table cannot be read for. */
const USUAL_MAJORITY = (() => {
  const counts = new Map<number, number>();
  for (const row of Object.values(MAJORITY))
    counts.set(row.age, (counts.get(row.age) ?? 0) + 1);
  return [...counts].sort((a, b) => b[1] - a[1] || a[0] - b[0])[0]![0];
})();
const majorityByPlace = new Map<string, number>();

/** The age at which a parent's authority ends where a person lives, from the place's records. */
export function ageOfMajority(placeId: string): number {
  let age = majorityByPlace.get(placeId);
  if (age === undefined) {
    const state = placeStateKey(placeId)?.replace(/^US-/, "");
    age = (state ? MAJORITY[state]?.age : undefined) ?? USUAL_MAJORITY;
    majorityByPlace.set(placeId, age);
  }
  return age;
}
