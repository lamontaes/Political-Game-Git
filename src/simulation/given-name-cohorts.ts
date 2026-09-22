import SSA_DECADES from "./given-names-by-decade.json";
import { SeededRng } from "./rng";
import type { GenderIdentityKey, IsoDate } from "./types";

/**
 * Given names by the year a person was born.
 *
 * ChatGPT's DEPTH1 answer to `given-name-fashion-by-birth-year` is a method:
 * draw a person's given name from what people born in their year were actually
 * called, smooth between neighbouring years rather than cut hard at a decade,
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
 *   - Only COHORT_GIVEN_NAME_SHARE of people take a cohort name. The rest keep
 *     the name the ordinary draw gave them, from the whole name list, because a
 *     name outside a decade's top 100 was still somebody's name. That share is
 *     authored, not measured. The real share is how many births in a decade
 *     the top 100 accounts for, which varies by decade and sex; the SSA decade
 *     pages publish it and it is not in the evidence file yet.
 *
 * Direction, as with gender: birth year is an input to the draw. A name is
 * never read backwards to decide anybody's age.
 */
export const COHORT_GIVEN_NAME_SHARE = 0.6;

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

/** Every name the cohort draw can give a person of this sex. */
export function cohortGivenNames(sex: Sex): ReadonlySet<string> {
  return new Set(
    Object.values(TABLE).flatMap((decade) => decade[sex].map(([name]) => name)),
  );
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

/**
 * The given name a generated person carries once their birth year is known.
 *
 * Applied after the ordinary draw, on a stream forked from the world seed and
 * the person's own stable key, so no other draw in the world moves: a route that draws
 * a name and then a birth date keeps both streams exactly where they were, and
 * only the given name can change. A person whose gender the world does not
 * state keeps the name they were given, because the cohort tables are by sex.
 */
export function birthCohortGivenName(
  worldSeed: string,
  personKey: string,
  person: {
    readonly givenName: string;
    readonly familyName: string;
    readonly birthDate: IsoDate;
    readonly gender: GenderIdentityKey | undefined;
  },
  takenGivenNames: readonly string[] = [],
): string {
  const sex = person.gender;
  if (sex !== "male" && sex !== "female") return person.givenName;
  const rng = new SeededRng(worldSeed).fork(
    `given-name-cohort-v1:${personKey}`,
  );
  if (rng.next() >= COHORT_GIVEN_NAME_SHARE) return person.givenName;
  return (
    drawCohortGivenName(
      rng,
      sex,
      Number(person.birthDate.slice(0, 4)),
      takenGivenNames,
    ) ?? person.givenName
  );
}
