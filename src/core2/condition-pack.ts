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

export interface StartingConditionSubject {
  readonly personId: EntityId;
  readonly placeKey: string;
  readonly age: number;
  readonly category: MortalityCalibrationCategory;
  /** Unknown household income sorts after recorded incomes; it is never zero. */
  readonly monthlyHouseholdIncomeMinor: number | null;
}

/**
 * Allocate each condition evenly through the income-ranked age-sex cell.
 * Prevalence determines the count only. No seed or roll chooses a person.
 */
export function startingConditionAssignments(
  subjects: readonly StartingConditionSubject[],
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
  // A small place's single-age cells hold a few people, and rounding each
  // cell alone drops every condition whose expected count there is under a
  // half: the place would hold far fewer conditions than its prevalence says.
  // What a cell's rounding leaves over (up or down) is carried into the place's
  // next cell, in age order, so the place's total follows the prevalence.
  const carried = new Map<string, number>();
  const inOrder = (key: string) => JSON.parse(key) as [string, number, string];
  for (const [, cell] of [...cells.entries()].sort(([a], [b]) => {
    const [placeA, ageA, categoryA] = inOrder(a);
    const [placeB, ageB, categoryB] = inOrder(b);
    return (
      (placeA < placeB ? -1 : placeA > placeB ? 1 : 0) ||
      ageA - ageB ||
      (categoryA < categoryB ? -1 : categoryA > categoryB ? 1 : 0)
    );
  })) {
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
      // PLACEHOLDER(research: chronic-condition-income-gradients): the 2026 pack
      // has no condition-specific income gradient; keep even spacing until one
      // is sourced.
      const expected = cell.reduce(
        (total, person) =>
          total + conditionPrevalence(condition, person.age, person.category),
        0,
      );
      const carryKey = `${cell[0]!.placeKey}|${condition.key}`;
      const wanted = expected + (carried.get(carryKey) ?? 0);
      const count = Math.min(cell.length, Math.max(0, Math.round(wanted)));
      carried.set(carryKey, wanted - count);
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
/** The scale at which the life table's hazard counts as strain (./mortality.ts). */
export const BASE_RATE_SCALE: number = pack.baseRateScale.value;

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
