import { ageOnDate } from "./dates";
import { spreadOf, type Spread } from "./sample-spread";
import type { EntityId, World } from "./types";
import { SeededRng } from "./rng";

/*
 * The family a grown-up player grew up in, drawn from real shares instead of
 * one fixed template.
 */

/**
 * MEASURED. Children under 18 by who they live with, U.S. Census Bureau,
 * Current Population Survey ASEC 2025, table CH-1 (thousands): 72,734 in all;
 * two parents 51,202; mother only 15,308; father only 3,340; other relatives
 * 2,323; non-relatives 562. Read September 29, 2026.
 *
 * The game records the first parent before this draw, so a child raised by a
 * relative or someone else is carried as a one-parent home here; the other
 * parent is simply not recorded, never invented.
 */
export const TWO_PARENT_SHARE = 51_202 / 72_734;

/**
 * ESTIMATED FROM AVERAGE: each world moves the two-parent share by up to three
 * points either way, so worlds differ the way places and decades do. The
 * source of the average is CH-1 above; the width is a game assumption.
 */
const WORLD_SPREAD_POINTS = 3;

/**
 * MEASURED, then weighted from the child's side. Women 45 to 50 by children
 * ever born, U.S. Census Bureau, Fertility of Women in the United States:
 * 2022, table 1: one 19.3%, two 35.7%, three 17.3%, four 6.8%, five or more
 * 4.4%. A child is k times as likely to come from a family of k children, so
 * the chance of n brothers and sisters is (n + 1) times the share of families
 * with n + 1 children, renormalized. Five or more is counted as five.
 */
const SIBLING_COUNT_WEIGHTS: readonly number[] = [
  1 * 19.3,
  2 * 35.7,
  3 * 17.3,
  4 * 6.8,
  5 * 4.4,
];

/**
 * ESTIMATED FROM AVERAGE: one to five years between one child and the next.
 * Source of the average: the National Survey of Family Growth (NCHS), where
 * the typical interval between births is two to three years.
 */
const BIRTH_SPACING_YEARS = [1, 6] as const;

/**
 * ESTIMATED FROM AVERAGE: the second parent is drawn two years older than a
 * mother on average, from two years younger to six years older. Source of the
 * average: U.S. Census Bureau, America's Families and Living Arrangements,
 * table FG3 (husbands are about two years older than wives on average).
 */
const PARENT_AGE_GAP_YEARS = [-2, 7] as const;

/**
 * ESTIMATED FROM AVERAGE: a grandparent was 20 to 35 at the parent's birth.
 * Source of the average: NCHS natality data, where the mean age of a mother
 * at a birth rose from about 25 to about 27 between 1960 and 1990.
 */
const GRANDPARENT_AGE_AT_BIRTH = [20, 36] as const;

export interface DrawnFamilyShape {
  /** Whether a second parent raised the child alongside the first. */
  readonly secondParent: boolean;
  /** Years the second parent is older than a mother (negative: younger). */
  readonly parentAgeGapYears: number;
  /**
   * Each brother or sister, by years older than the player (negative is
   * younger), in birth order from the oldest.
   */
  readonly siblingOffsetsYears: readonly number[];
  /** Age of each grandparent at their child's birth: [first side, second side]. */
  readonly grandparentAgesAtBirth: readonly [
    readonly [number, number],
    readonly [number, number],
  ];
}

function weightedIndex(rng: SeededRng, weights: readonly number[]): number {
  const total = weights.reduce((sum, weight) => sum + weight, 0);
  let roll = rng.next() * total;
  for (const [index, weight] of weights.entries()) {
    if (roll < weight) return index;
    roll -= weight;
  }
  return weights.length - 1;
}

/** The two-parent share this world starts from. */
export function worldTwoParentShare(worldSeed: string): number {
  const points = new SeededRng(worldSeed)
    .fork("family-shape-v2:world-spread")
    .integer(-WORLD_SPREAD_POINTS, WORLD_SPREAD_POINTS + 1);
  return TWO_PARENT_SHARE + points / 100;
}

/**
 * One rule for every place. The same world seed and person key always draw
 * the same family.
 */
export function drawFamilyShape(
  worldSeed: string,
  personKey: string,
): DrawnFamilyShape {
  const rng = new SeededRng(worldSeed).fork(`family-shape-v2:${personKey}`);
  const secondParent =
    rng.fork("second-parent").next() < worldTwoParentShare(worldSeed);
  const parentAgeGapYears = rng
    .fork("parent-age-gap")
    .integer(PARENT_AGE_GAP_YEARS[0], PARENT_AGE_GAP_YEARS[1]);
  const siblingCount = weightedIndex(
    rng.fork("sibling-count"),
    SIBLING_COUNT_WEIGHTS,
  );
  // Where the player falls among the children, then the gap between each
  // child and the next.
  const playerPosition = rng.fork("birth-order").integer(0, siblingCount + 1);
  const spacing = rng.fork("spacing");
  const births: number[] = [0];
  for (let index = 0; index < siblingCount; index += 1)
    births.push(
      births.at(-1)! +
        spacing.integer(BIRTH_SPACING_YEARS[0], BIRTH_SPACING_YEARS[1]),
    );
  const playerBirth = births[playerPosition]!;
  const siblingOffsetsYears = births
    .filter((_, index) => index !== playerPosition)
    .map((birth) => playerBirth - birth);
  const grandparent = rng.fork("grandparents");
  const age = () =>
    grandparent.integer(
      GRANDPARENT_AGE_AT_BIRTH[0],
      GRANDPARENT_AGE_AT_BIRTH[1],
    );
  return {
    secondParent,
    parentAgeGapYears,
    siblingOffsetsYears,
    grandparentAgesAtBirth: [
      [age(), age()],
      [age(), age()],
    ],
  };
}

/** A recorded family sample; dates belong to these saved people, never new births. */
export interface RecordedFamilySample {
  readonly personId: EntityId;
  readonly birthDate: World["currentDate"];
  readonly parentBirthDates: readonly World["currentDate"][];
  readonly siblingBirthDates: readonly World["currentDate"][];
  readonly parentIds: readonly EntityId[];
  readonly siblingIds: readonly EntityId[];
  readonly kinshipIds: readonly EntityId[];
  readonly secondParent: number;
  readonly siblingCount: number;
  readonly siblingOffsetsYears: readonly number[];
  readonly parentAgesAtChildBirth: readonly number[];
  readonly parentAgeGapYears: number | null;
}

/**
 * Current-game comparable families. Parent/child pairs are unordered in the
 * canonical record: the older saved person supplies the parent side. Samples
 * without any recorded parent are not evidence of a zero-parent family.
 */
export function recordedFamilyEstimates(world: World): {
  readonly asOf: World["currentDate"];
  readonly note: string;
  readonly samples: readonly RecordedFamilySample[];
  readonly secondParent: Spread | null;
  readonly siblingCount: Spread | null;
  readonly parentAgeGapYears: Spread | null;
  readonly parentAgeAtChildBirth: Spread | null;
  readonly siblingSpacingYears: Spread | null;
} {
  const parents = new Map<EntityId, Set<EntityId>>();
  const siblings = new Map<EntityId, Set<EntityId>>();
  const evidence = new Map<EntityId, Set<EntityId>>();
  const add = (
    map: Map<EntityId, Set<EntityId>>,
    key: EntityId,
    id: EntityId,
  ) => {
    const values = map.get(key) ?? new Set<EntityId>();
    values.add(id);
    map.set(key, values);
  };
  for (const row of world.history.kinshipRelationships) {
    if (row.establishedAt > world.currentDate) continue;
    const [a, b] = row.personIds.map((id) => world.people[id]);
    if (
      !a ||
      !b ||
      a.birthDate > world.currentDate ||
      b.birthDate > world.currentDate
    )
      continue;
    if (row.kind === "lineal:parent-child" && a.birthDate !== b.birthDate) {
      const [parent, child] = a.birthDate < b.birthDate ? [a, b] : [b, a];
      add(parents, child.id, parent.id);
      add(evidence, child.id, row.id);
    } else if (row.kind === "collateral:sibling") {
      add(siblings, a.id, b.id);
      add(siblings, b.id, a.id);
      add(evidence, a.id, row.id);
      add(evidence, b.id, row.id);
    }
  }
  const samples = [...parents.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([personId, ids]) => {
      const parentIds = [...ids].sort();
      const siblingIds = [...(siblings.get(personId) ?? [])].sort();
      const ages = parentIds.map((id) =>
        ageOnDate(world.people[id]!.birthDate, world.currentDate),
      );
      return {
        personId,
        birthDate: world.people[personId]!.birthDate,
        parentBirthDates: parentIds.map((id) => world.people[id]!.birthDate),
        siblingBirthDates: siblingIds.map((id) => world.people[id]!.birthDate),
        parentIds,
        siblingIds,
        kinshipIds: [...(evidence.get(personId) ?? [])].sort(),
        secondParent: parentIds.length > 1 ? 1 : 0,
        siblingCount: siblingIds.length,
        siblingOffsetsYears: siblingIds.map((id) => {
          const birth = world.people[id]!.birthDate;
          const ownBirth = world.people[personId]!.birthDate;
          return birth <= ownBirth
            ? ageOnDate(birth, ownBirth)
            : -ageOnDate(ownBirth, birth);
        }),
        parentAgesAtChildBirth: parentIds.map((id) =>
          ageOnDate(
            world.people[id]!.birthDate,
            world.people[personId]!.birthDate,
          ),
        ),
        parentAgeGapYears:
          ages.length > 1 ? Math.max(...ages) - Math.min(...ages) : null,
      };
    });
  const gaps = samples.flatMap((row) =>
    row.parentAgeGapYears === null ? [] : [row.parentAgeGapYears],
  );
  const parentAges = samples.flatMap((row) => row.parentAgesAtChildBirth);
  const spacing = samples.flatMap((row) =>
    row.siblingOffsetsYears.map(Math.abs),
  );
  return {
    asOf: world.currentDate,
    note: "ESTIMATED: averaged from this game's recorded families, with their current game spread. Unrecorded relatives are not inferred absent; no birth dates are created.",
    samples,
    secondParent: samples.length
      ? spreadOf(samples.map((row) => row.secondParent))
      : null,
    siblingCount: samples.length
      ? spreadOf(samples.map((row) => row.siblingCount))
      : null,
    parentAgeGapYears: gaps.length ? spreadOf(gaps) : null,
    parentAgeAtChildBirth: parentAges.length ? spreadOf(parentAges) : null,
    siblingSpacingYears: spacing.length ? spreadOf(spacing) : null,
  };
}
