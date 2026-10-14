/**
 * Ported from the old engine's `given-name-cohorts.ts`.
 */
import SSA_DECADES from "../data/names/given-names-by-decade.json" with { type: "json" };
import type { SeededRng } from "../kernel/rng";

/**
 * Given names by the year a person was born.
 *
 * ChatGPT's DEPTH1 answer to `given-name-fashion-by-birth-year` is a method:
 * draw a person's given name from what people born in their year were actually
 * called, smooth between neighboring years rather than cut hard at a decade,
 * and never make a historically rare name impossible. The data here is the
 * SSA's own Top 100 per sex per decade, 1920s to 2020s, with SSA's counts,
 * copied from `docs/research/evidence/ssa-given-names-by-decade.json`. The
 * per-name, per-year files the answer prefers are still not compiled (the
 * environment cannot reach ssa.gov), so this works at decade resolution:
 *
 *   - Each decade stands at its middle year. A person born between two middles
 *     draws from both decades, weighted by how near they are, so there is no
 *     step at 1950.
 *   - Before the 1920s and after the 2020s the nearest decade holds. The SSA
 *     says its coverage before 1937 is incomplete; a birth after the 2020s is a
 *     projection, and holding the latest decade is the game's projection, not a
 *     forecast.
 *
 * Direction, as with gender: birth year is an input to the draw. A name is
 * never read backwards to decide anybody's age.
 */

type Sex = "male" | "female";
type DecadeTable = Readonly<
  Record<string, Readonly<Record<Sex, readonly (readonly [string, number])[]>>>
>;

const TABLE = SSA_DECADES.decades as unknown as DecadeTable;
const DECADE_STARTS: readonly number[] = Object.keys(TABLE)
  .map((key) => Number.parseInt(key, 10))
  .sort((left, right) => left - right);

function decadeKey(start: number): string {
  return `${start}s`;
}

/**
 * The decades a birth year draws from, and how much each counts. Weights sum
 * to one.
 */
export function birthYearDecadeWeights(
  birthYear: number,
): readonly (readonly [string, number])[] {
  const middles = DECADE_STARTS.map((start) => start + 5);
  const first = middles[0]!;
  const last = middles[middles.length - 1]!;
  if (birthYear <= first) return [[decadeKey(DECADE_STARTS[0]!), 1]];
  if (birthYear >= last) {
    return [[decadeKey(DECADE_STARTS[DECADE_STARTS.length - 1]!), 1]];
  }
  const index = Math.floor((birthYear - first) / 10);
  const toward = (birthYear - middles[index]!) / 10;
  const weights: (readonly [string, number])[] = [
    [decadeKey(DECADE_STARTS[index]!), 1 - toward],
  ];
  if (toward > 0) weights.push([decadeKey(DECADE_STARTS[index + 1]!), toward]);
  return weights;
}

/**
 * A name weighted by how many people born in this year carried it, skipping
 * names already taken where it can. Null when every candidate is taken.
 */
export function drawCohortGivenName(
  rng: SeededRng,
  sex: Sex,
  birthYear: number,
  takenGivenNames: readonly string[] = [],
): string | null {
  const weights = new Map<string, number>();
  for (const [decade, share] of birthYearDecadeWeights(birthYear)) {
    for (const [name, count] of TABLE[decade]![sex]) {
      weights.set(name, (weights.get(name) ?? 0) + share * count);
    }
  }
  const taken = new Set(takenGivenNames);
  const names = [...weights.keys()].filter((name) => !taken.has(name));
  if (names.length === 0) return null;
  const total = names.reduce((sum, name) => sum + weights.get(name)!, 0);
  let point = rng.next() * total;
  for (const name of names) {
    point -= weights.get(name)!;
    if (point < 0) return name;
  }
  return names[names.length - 1]!;
}
