/**
 * P15 opening temperament: the owner's five temperament dimensions, spread
 * across people to match real personality norms by age and sex, with a
 * heritable share passed from parents to children.
 *
 * Each dimension is a latent standard score: an inherited part (the parents'
 * mean plus segregation), a part of the person's own, a small upbringing
 * shift, and the sourced age and sex differences of its matching NEO facet.
 * The score is cut into the owner-accepted -2..2 levels at the 10/20/40/20/10
 * spread. Every other trait in the shared trait table follows from its
 * anchor dimension (see ANCHORED). This decides who a person is at the
 * opening, never what they do.
 */
import traitTable from "../../data/content/trait-act-pulls.json" with { type: "json" };
import { OPENING_KIN } from "./opening-kin";
import { ageOnDate, makeIsoDate } from "./kernel/dates";
import { PEOPLE_MIND_VERSION } from "./people-mind";
import { SeededRng } from "./kernel/rng";
import { parameter as p } from "./parameters";
import { stopgap } from "./stopgaps";
import type { IsoDate, PersonId } from "./types";

const SPEC = OPENING_KIN.personality;
// The named constants and the correlated pairs, read once: they are static,
// and the opening draws them for every person.
const ZERO = p("zero"),
  ONE = p("one"),
  TWO = p("two");
const PAIRS = SPEC.correlatedPairs.map((pair) => ({
  first: SPEC.dimensions.findIndex((row) => row.trait === pair.first),
  second: SPEC.dimensions.findIndex((row) => row.trait === pair.second),
  rho: p(pair.parameter),
}));

/**
 * Every other trait in the shared trait table, tied to one temperament
 * dimension by a standard-score loading (OPUS-TRAITS, Oct 12): the trait is
 * the loading times that dimension plus the person's own part, so a full
 * person carries a level on every trait, low as well as high.
 */
const ANCHORED = Object.entries(
  traitTable.pulls as Record<
    string,
    { anchor?: { dimension: string; loading: number } }
  >,
)
  .filter(([id]) => !id.startsWith(`${PEOPLE_MIND_VERSION}:`))
  .map(([id, row]) => ({
    id,
    dimension: row.anchor
      ? SPEC.dimensions.findIndex(
          (dim) =>
            `${PEOPLE_MIND_VERSION}:${dim.trait}` === row.anchor!.dimension,
        )
      : -p("one"),
    loading: row.anchor?.loading ?? p("zero"),
  }));
for (const row of ANCHORED)
  if (row.loading !== p("zero") && row.dimension < p("zero"))
    throw new Error(`Trait ${row.id} is anchored to an unknown dimension.`);

export interface TemperamentSubject {
  id: PersonId;
  birthDate: IsoDate;
  gender?: string;
  /** Known biological parents; anyone missing is an unseen parent drawn fresh. */
  parents: readonly PersonId[];
  /** The canonical upbringing value on the same -2..2 scale, when one exists. */
  upbringing?: Readonly<Record<string, number>>;
}

function normal(rng: SeededRng): number {
  const u = ONE - rng.next();
  return Math.sqrt(-TWO * Math.log(u)) * Math.cos(TWO * Math.PI * rng.next());
}

/** Independent standard normals per dimension, then the registered correlated pairs. */
function draws(rng: SeededRng): number[] {
  const values = SPEC.dimensions.map((row) => normal(rng.fork(row.trait)));
  for (const { first, second, rho } of PAIRS)
    values[second] =
      rho * values[first]! + Math.sqrt(ONE - rho * rho) * values[second]!;
  return values;
}

function curve(row: (typeof SPEC.dimensions)[number], age: number): number {
  const x =
    (Math.max(age, SPEC.minimumCurveAge) - SPEC.ageCenter) / SPEC.ageUnitYears;
  return row.ageLinear * x + row.ageQuadratic * x * x;
}

function shiftFor(
  row: (typeof SPEC.dimensions)[number],
  age: number,
  gender: string | undefined,
): number {
  const ageShift =
    (curve(row, age) - curve(row, p("personalityReferenceAge"))) /
    SPEC.tScoreSd;
  const half = row.sexDMaleMinusFemale / TWO;
  const sexShift =
    gender === OPENING_KIN.genders.male
      ? half
      : gender === OPENING_KIN.genders.female
        ? -half
        : ZERO;
  return row.sign * (ageShift + sexShift);
}

/** The temperament dimensions and the traits anchored to them, for the engine that changes them over a life. */
export const PERSONALITY_DIMENSIONS = SPEC.dimensions.map((row) => ({
  traitId: `${PEOPLE_MIND_VERSION}:${row.trait}`,
  name: row.trait,
}));
export const PERSONALITY_ANCHORED = ANCHORED.filter(
  (row) => row.dimension >= p("zero") && row.loading !== p("zero"),
).map((row) => ({
  traitId: row.id,
  dimensionIndex: row.dimension,
  loading: row.loading,
}));

/**
 * One year of the same sourced age curve the opening reads: how far a
 * dimension's standard score moves in the year after `age`. Zero below the
 * curve's minimum age.
 */
export function yearlyPersonalityShift(
  dimensionIndex: number,
  age: number,
): number {
  const row = SPEC.dimensions[dimensionIndex]!;
  return (
    (row.sign * (curve(row, age + p("one")) - curve(row, age))) / SPEC.tScoreSd
  );
}

/** The -2..2 level a standard score falls in (the opening's own cut points). */
export function personalityLevel(z: number): number {
  return level(z);
}

/**
 * A standard score inside a level's band, at the place `at` (0 to 1) of the
 * band's probability: where a person carrying that level started. The place
 * is a generation fact keyed to the person (the opening kept only the level),
 * so the same person always starts at the same score.
 */
export function personalityLevelScore(value: number, at: number): number {
  const cuts = SPEC.levels.cutPoints;
  const index = SPEC.levels.values.indexOf(value);
  const low = index === p("zero") ? -Infinity : cuts[index - p("one")]!;
  const high = index === cuts.length ? Infinity : cuts[index]!;
  const cdf = (x: number) =>
    x === Infinity
      ? p("one")
      : x === -Infinity
        ? p("zero")
        : normalCdf(x, p("one"), p("two"));
  const target = cdf(low) + at * (cdf(high) - cdf(low));
  // Bisection on the normal CDF between wide bounds.
  let lo = -SPEC.levels.bisectBound;
  let hi = SPEC.levels.bisectBound;
  for (let step = 0; step < SPEC.levels.bisectSteps; step += 1) {
    const mid = (lo + hi) / p("two");
    if (cdf(mid) < target) lo = mid;
    else hi = mid;
  }
  return (lo + hi) / p("two");
}

/** Standard normal CDF (Abramowitz and Stegun 7.1.26 error function). */
function normalCdf(x: number, one: number, two: number): number {
  const t = one / (one + 0.3275911 * (Math.abs(x) / Math.sqrt(two)));
  const poly =
    ((((1.061405429 * t - 1.453152027) * t + 1.421413741) * t - 0.284496736) *
      t +
      0.254829592) *
    t;
  const erf = one - poly * Math.exp((-x * x) / two);
  return (one + (x < 0 ? -erf : erf)) / two;
}

function level(z: number): number {
  let index = ZERO;
  for (const cut of SPEC.levels.cutPoints) if (z >= cut) index += ONE;
  return SPEC.levels.values[index]!;
}

export function openingTemperaments(
  subjects: readonly TemperamentSubject[],
  options: { seed: string; startedAt: IsoDate },
): Map<PersonId, Record<string, number>> {
  stopgap("SG-P15-personality-mapping");
  const h2 = p("personalityHeritability");
  const inheritedSd = Math.sqrt(h2);
  const segregationSd = Math.sqrt(h2 / TWO);
  const ownSd = Math.sqrt(ONE - h2);
  const root = new SeededRng(options.seed).fork("p15-opening-temperament");
  const genetic = new Map<PersonId, number[]>();
  const result = new Map<PersonId, Record<string, number>>();
  // Elders first, so a parent's inherited part exists before any child's.
  const ordered = [...subjects].sort(
    (a, b) =>
      a.birthDate.localeCompare(b.birthDate) || a.id.localeCompare(b.id),
  );
  for (const subject of ordered) {
    const rng = root.fork(subject.id);
    const known = subject.parents
      .map((id) => genetic.get(id))
      .filter((row): row is number[] => row !== undefined);
    const unseen = rng.fork("unseen-parent");
    const parentGenes = [...known];
    while (parentGenes.length < TWO && known.length > ZERO)
      parentGenes.push(draws(unseen).map((value) => value * inheritedSd));
    const segregation = draws(rng.fork("segregation"));
    const genes = known.length
      ? segregation.map(
          (value, index) =>
            (parentGenes[ZERO]![index]! + parentGenes[ONE]![index]!) / TWO +
            value * segregationSd,
        )
      : segregation.map((value) => value * inheritedSd);
    genetic.set(subject.id, genes);
    const own = draws(rng.fork("own"));
    const age = ageOnDate(
      makeIsoDate(subject.birthDate),
      makeIsoDate(options.startedAt),
    );
    const traits: Record<string, number> = {};
    const scores: number[] = [];
    SPEC.dimensions.forEach((row, index) => {
      const upbringing =
        (subject.upbringing?.[row.trait] ?? ZERO) *
        p("personalityUpbringingShift");
      const z =
        genes[index]! +
        own[index]! * ownSd +
        upbringing +
        shiftFor(row, age, subject.gender);
      scores[index] = z;
      traits[`${PEOPLE_MIND_VERSION}:${row.trait}`] = level(z);
    });
    const ownTraits = rng.fork("traits");
    for (const row of ANCHORED) {
      const shared = row.dimension < ZERO ? ZERO : scores[row.dimension]!;
      traits[row.id] = level(
        row.loading * shared +
          Math.sqrt(ONE - row.loading * row.loading) * normal(ownTraits),
      );
    }
    result.set(subject.id, traits);
  }
  return result;
}
