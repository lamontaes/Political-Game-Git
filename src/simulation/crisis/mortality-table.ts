import table from "./ssa-2023-period-life-table.json" with { type: "json" };
import { fixedFromDecimal, hazardFromAnnualProbability } from "./fixed-point";

/**
 * SSA 2023 period life table, as used in the 2026 Trustees Report.
 *
 * qx is an annual probability at exact age x. It is converted once to the
 * age-year cumulative hazard H = −ln(1 − qx); the simulation never rolls qx
 * per month and never turns it into an individual death date.
 */

export const SSA_2023_TABLE_ID = table.tableId;
export const SSA_2023_SOURCE = Object.freeze({
  tableId: table.tableId,
  title: table.title,
  publisher: table.publisher,
  url: table.url,
  retrieval: table.retrieval,
  rights: table.rights,
});

/**
 * The actuarial category a hazard is computed for. `equal-mixture` is the
 * explicitly authored default for everybody whose physiological calibration
 * category is not represented: the mean of the two source hazards. It is
 * never inferred from gender identity, name or appearance.
 */
export type MortalityCalibrationCategory = "male" | "female" | "equal-mixture";

export const MORTALITY_CALIBRATION_CATEGORIES: readonly MortalityCalibrationCategory[] =
  ["male", "female", "equal-mixture"];

/** Last age the source publishes. Older ages reuse it (authored extension). */
export const SSA_2023_MAX_AGE = 119;

interface AgeHazards {
  readonly male: bigint;
  readonly female: bigint;
}

function compileHazards(): readonly AgeHazards[] {
  if (table.rows.length !== SSA_2023_MAX_AGE + 1)
    throw new Error("SSA 2023 table must publish ages 0–119.");
  return table.rows.map((row, index) => {
    if (row.age !== index)
      throw new Error(`SSA 2023 table ages are not contiguous at ${index}.`);
    return {
      male: hazardFromAnnualProbability(fixedFromDecimal(row.male)),
      female: hazardFromAnnualProbability(fixedFromDecimal(row.female)),
    };
  });
}

const HAZARDS = compileHazards();

/**
 * Twice the scaled age-year hazard for a category. Doubling keeps the
 * equal-mixture mean exact: 2·H_mix = H_male + H_female.
 */
export function doubledAgeYearHazard(
  age: number,
  category: MortalityCalibrationCategory,
): bigint {
  if (!Number.isSafeInteger(age) || age < 0)
    throw new Error("Mortality age must be a non-negative integer.");
  const hazards = HAZARDS[Math.min(age, SSA_2023_MAX_AGE)]!;
  switch (category) {
    case "male":
      return 2n * hazards.male;
    case "female":
      return 2n * hazards.female;
    case "equal-mixture":
      return hazards.male + hazards.female;
  }
}

export function ssa2023AnnualProbability(
  age: number,
  sourceCategory: "male" | "female",
): string {
  const row = table.rows[age];
  if (!row) throw new Error(`SSA 2023 table has no age ${age}.`);
  return row[sourceCategory];
}
