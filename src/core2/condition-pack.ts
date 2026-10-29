import pack from "../../data/research/health/chronic-condition-pack-2026.json" with { type: "json" };
import { stableHash } from "./kernel/ids";
import { MULTIPLIER_ONE } from "./health-hazard";
import type { MortalityCalibrationCategory } from "./health-mortality-table";

/**
 * The installed condition pack (Ruling 38): chronic conditions a person's
 * health record can hold, how common each is by age, and how heavily each
 * weighs on mortality strain. One sourced data file holds every number:
 * data/research/health/chronic-condition-pack-2026.json. A person's starting
 * conditions are allocated evenly through the income-ranked age and sex
 * cell, so the exact prevalence decides the count and no seed or roll picks
 * a person.
 */

type EntityId = string;

interface PrevalenceBand {
  readonly fromAge: number;
  readonly toAge: number;
  readonly percent: number;
}

interface PackCondition {
  readonly key: string;
  readonly label: string;
  readonly infant?: boolean;
  /** A condition of childhood: held at its one band's ages only. */
  readonly childhood?: boolean;
  /** A condition that takes no severity grade or age factor. */
  readonly ungraded?: boolean;
  readonly prevalence: readonly PrevalenceBand[];
  readonly bySex?: { readonly male: number; readonly female: number };
  readonly mortalityWeight: { readonly value: number; readonly status: string };
  /** Read only by the old engine's condition onsets; goes with src/simulation. */
  readonly onsetScale: {
    readonly value: number;
    readonly status: string;
  } | null;
}

export const CONDITION_PACK_KEY = pack.packKey;
export const CONDITION_PACK: readonly PackCondition[] =
  pack.conditions as readonly PackCondition[];

/** Stable severity grading remains tied to the person's condition record. */
function selectionPlace(seed: string, personId: EntityId, key: string): number {
  const hex = stableHash(
    JSON.stringify([CONDITION_PACK_KEY, seed, personId, key]),
  ).slice(0, 12);
  return parseInt(hex, 16) / 16 ** 12;
}

export function packCondition(key: string): PackCondition | null {
  return CONDITION_PACK.find((condition) => condition.key === key) ?? null;
}

/** The plain words a person's record uses for a pack condition. */
export function conditionLabel(key: string): string | null {
  return packCondition(key)?.label ?? null;
}

/**
 * The share (0 to 1) of people of this exact age holding the condition. Each
 * band's figure sits at the band's middle; between middles it slides in a
 * straight line, below the first it slides to zero at the band's start, and
 * past the last it holds. The infant row covers the first year of life only.
 */
export function conditionPrevalence(
  condition: PackCondition,
  age: number,
  category: MortalityCalibrationCategory,
  /** The world's chronic-condition factor (world-base-rates.ts); one is the published table. */
  worldFactor = 1,
): number {
  return Math.min(
    1,
    conditionPublished(condition, age, category) * worldFactor,
  );
}

function conditionPublished(
  condition: PackCondition,
  age: number,
  category: MortalityCalibrationCategory,
): number {
  const sex =
    condition.bySex && category !== "equal-mixture"
      ? condition.bySex[category]
      : 1;
  if (condition.infant)
    return age < 1 ? (condition.prevalence[0]!.percent / 100) * sex : 0;
  if (condition.childhood) {
    const band = condition.prevalence[0]!;
    return age >= band.fromAge && age < band.toAge + 1
      ? (band.percent / 100) * sex
      : 0;
  }
  const points = condition.prevalence.map((band) => ({
    age: (band.fromAge + band.toAge + 1) / 2,
    share: band.percent / 100,
  }));
  const first = condition.prevalence[0]!;
  if (age < first.fromAge) return 0;
  let share: number;
  if (age <= points[0]!.age)
    share =
      (points[0]!.share * (age - first.fromAge)) /
      (points[0]!.age - first.fromAge);
  else if (age >= points.at(-1)!.age) share = points.at(-1)!.share;
  else {
    const upper = points.findIndex((point) => point.age >= age);
    const low = points[upper - 1]!;
    const high = points[upper]!;
    share =
      low.share +
      ((high.share - low.share) * (age - low.age)) / (high.age - low.age);
  }
  return share * sex;
}

/** The search bounds and steps for the place's shift in `personalityShares`: log odds far past any level's reach, halved to well under a millionth. */
const SHIFT_BOUND = 40;
const SHIFT_STEPS = 60;

/**
 * Each person's chance of a behavior-driven condition: their age's prevalence
 * on the log-odds scale, moved by their personality's log odds and by one
 * shift for the whole place, chosen so the chances add up to `expected` (the
 * place's count at the published prevalence). A prevalence of zero or one
 * stays as it is.
 */
export function personalityShares(
  shares: readonly number[],
  logOdds: readonly number[],
  expected: number,
): number[] {
  const at = (shift: number) =>
    shares.map((share, i) =>
      share <= 0 || share >= 1
        ? share
        : 1 /
          (1 +
            Math.exp(-(Math.log(share / (1 - share)) + logOdds[i]! - shift))),
    );
  const sum = (list: readonly number[]) => list.reduce((a, b) => a + b, 0);
  // The sum falls as the shift grows, so halving the interval finds it.
  let low = -SHIFT_BOUND;
  let high = SHIFT_BOUND;
  for (let step = 0; step < SHIFT_STEPS; step += 1) {
    const middle = (low + high) / 2;
    if (sum(at(middle)) > expected) low = middle;
    else high = middle;
  }
  return at((low + high) / 2);
}
export interface StartingConditionSubject {
  readonly personId: EntityId;
  readonly placeKey: string;
  readonly age: number;
  readonly category: MortalityCalibrationCategory;
  /** Unknown household income sorts after recorded incomes; it is never zero. */
  readonly monthlyHouseholdIncomeMinor: number | null;
  /** The person's conscientiousness level (-2..2); absent for a person who carries none. */
  readonly conscientiousness?: number;
}

/**
 * Allocate each condition evenly through the income-ranked age-sex cell.
 * Prevalence determines the count only. No seed or roll chooses a person.
 */
export function startingConditionAssignments(
  subjects: readonly StartingConditionSubject[],
  /**
   * Log odds per conscientiousness level for behavior-driven conditions
   * (smoking, drug use): their holders are spread across each place's people
   * by each person's chance, their age's prevalence moved on the log-odds
   * scale by slope times level, so the count is the prevalence's and
   * personality decides only who.
   */
  behaviorSlopes: ReadonlyMap<string, number> = new Map(),
  /** The world's chronic-condition factor (world-base-rates.ts). */
  worldFactor = 1,
): ReadonlyMap<EntityId, readonly string[]> {
  const assignments = new Map<EntityId, string[]>(
    subjects.map(({ personId }) => [personId, []]),
  );
  const cells = new Map<string, StartingConditionSubject[]>();
  for (const subject of subjects) {
    const cellKey = JSON.stringify([
      subject.placeKey,
      Math.floor(subject.age),
      subject.category,
    ]);
    const cell = cells.get(cellKey) ?? [];
    cell.push(subject);
    cells.set(cellKey, cell);
  }
  const conditionCount = CONDITION_PACK.length;
  // A rare condition's expected count in one small cell is a fraction of a
  // person; rounding each cell alone drops it everywhere a set is small (the
  // full people of a town). The fraction carries to the next cell, in a fixed
  // cell order, so the set holds the condition at its prevalence in total.
  const carried = new Map<string, number>();
  const ordered = [...cells].sort((a, b) => a[0].localeCompare(b[0]));
  for (const [, cell] of ordered) {
    cell.sort((left, right) => {
      const leftIncome = left.monthlyHouseholdIncomeMinor;
      const rightIncome = right.monthlyHouseholdIncomeMinor;
      if (leftIncome === null && rightIncome !== null) return 1;
      if (leftIncome !== null && rightIncome === null) return -1;
      if (
        leftIncome !== null &&
        rightIncome !== null &&
        leftIncome !== rightIncome
      )
        return leftIncome - rightIncome;
      return left.personId < right.personId
        ? -1
        : left.personId > right.personId
          ? 1
          : 0;
    });
    for (const [conditionIndex, condition] of CONDITION_PACK.entries()) {
      // Behavior-driven conditions are spread across the place, below.
      if (behaviorSlopes.has(condition.key)) continue;
      // PLACEHOLDER(research: chronic-condition-income-gradients): the 2026 pack
      // has no condition-specific income gradient; keep even spacing until one
      // is sourced.
      const expected = cell.reduce(
        (total, person) =>
          total +
          conditionPrevalence(
            condition,
            person.age,
            person.category,
            worldFactor,
          ),
        0,
      );
      const owed = expected + (carried.get(condition.key) ?? 0);
      const count = Math.min(cell.length, Math.max(0, Math.round(owed)));
      carried.set(condition.key, owed - count);
      if (count === 0) continue;
      if (count === cell.length) {
        for (const person of cell)
          assignments.get(person.personId)!.push(condition.key);
        continue;
      }
      const offset = conditionIndex / conditionCount;
      for (let index = 0; index < count; index += 1) {
        const position = Math.min(
          cell.length - 1,
          Math.round(((index + offset) * cell.length) / count),
        );
        assignments.get(cell[position]!.personId)!.push(condition.key);
      }
    }
  }
  // A behavior-driven condition is spread across each place's people, not
  // within one age cell: a town's full people make cells of one or two, where
  // personality has no one to choose between (traits-health-test: the median
  // cell held one person). Each person's share is their age's prevalence on
  // the log-odds scale moved by slope times level (`personalityShares`); the
  // place's count is the prevalence's, with the fraction carried to the next
  // place, and a person holds the condition where the running share of that
  // count passes a whole number.
  const places = new Map<string, StartingConditionSubject[]>();
  for (const [, cell] of ordered)
    for (const person of cell) {
      const list = places.get(person.placeKey) ?? [];
      list.push(person);
      places.set(person.placeKey, list);
    }
  for (const [conditionIndex, condition] of CONDITION_PACK.entries()) {
    const slope = behaviorSlopes.get(condition.key);
    if (slope === undefined) continue;
    const offset = conditionIndex / conditionCount;
    let carry = 0;
    for (const [, people] of places) {
      const shares = people.map((person) =>
        conditionPrevalence(
          condition,
          person.age,
          person.category,
          worldFactor,
        ),
      );
      const expected = shares.reduce((sum, share) => sum + share, 0);
      const owed = expected + carry;
      const count = Math.min(people.length, Math.max(0, Math.round(owed)));
      carry = owed - count;
      if (count === 0) continue;
      const weights = personalityShares(
        shares,
        people.map((person) => slope * (person.conscientiousness ?? 0)),
        expected,
      );
      const total = weights.reduce((sum, weight) => sum + weight, 0);
      if (total <= 0) continue;
      let running = offset;
      for (const [position, person] of people.entries()) {
        const before = Math.floor(running);
        running += (count * weights[position]!) / total;
        if (Math.floor(running) > before)
          assignments.get(person.personId)!.push(condition.key);
      }
    }
  }
  return assignments;
}

interface SeverityGrade {
  readonly key: string;
  readonly share: number;
  readonly weight: number;
}

/** The severity grades a held condition can carry, most severe first. */
export const SEVERITY_GRADES: readonly SeverityGrade[] =
  pack.severityGrades.grades;
const AGE_FACTOR = pack.ageFactor;

/**
 * The grade this person holds a condition at: their seeded place among the
 * people holding it, against the grades' shares, chosen once when the
 * condition is recorded. A condition of birth or childhood carries no grade.
 */
export function conditionGrade(
  seed: string,
  personId: EntityId,
  key: string,
): SeverityGrade | null {
  const condition = packCondition(key);
  if (condition?.infant || condition?.childhood || condition?.ungraded)
    return null;
  const place = selectionPlace(seed, personId, `${key}:severity`);
  let below = 0;
  for (const grade of SEVERITY_GRADES) {
    below += grade.share;
    if (place < below) return grade;
  }
  return SEVERITY_GRADES.at(-1)!;
}

/**
 * How much more a condition weighs when it is recorded at `age`: smoothly
 * from the young factor down to one, read once at recording.
 */
export function conditionAgeFactor(age: number): number {
  return (
    1 +
    (AGE_FACTOR.youngFactor - 1) /
      (1 + Math.exp((age - AGE_FACTOR.turnAge) / AGE_FACTOR.widthYears))
  );
}

/**
 * The weight and basis a condition is recorded with: its own weight, times
 * its grade's weight and the factor for the age it is recorded at.
 */
export function conditionHazard(
  seed: string,
  personId: EntityId,
  key: string,
  age: number,
): { readonly micros: number; readonly basis: string } {
  const condition = packCondition(key)!;
  const grade = conditionGrade(seed, personId, key);
  const factor = grade ? grade.weight * conditionAgeFactor(age) : 1;
  const weight = condition.mortalityWeight.value * factor;
  return {
    micros: Math.round(weight * MULTIPLIER_ONE),
    basis: grade
      ? `${CONDITION_PACK_KEY}: ${condition.label}, ${grade.key}, recorded at age ${Math.floor(age)}, multiplies mortality strain by ${weight.toFixed(2)} (PLACEHOLDER).`
      : `${CONDITION_PACK_KEY}: ${condition.label} multiplies mortality strain by ${weight} (${condition.mortalityWeight.status}).`,
  };
}
