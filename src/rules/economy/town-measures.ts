import { ECONOMY_RULE_PARAMETERS } from "./parameters";

export type LaborForceStatus =
  "employed" | "student" | "retired" | "parent-at-home" | "looking-for-work";

export interface ResidentLaborFacts {
  readonly status: LaborForceStatus;
  readonly holdsWork: boolean;
}

export interface TownMeasureFact {
  readonly value: number | null;
  readonly basis: number;
}

/** Calculate the unemployment share after labor status and work are selected. */
export function unemploymentRateFromFacts(
  residents: readonly ResidentLaborFacts[],
): TownMeasureFact {
  let laborForce = 0;
  let unemployed = 0;
  for (const resident of residents) {
    if (
      resident.status !== "employed" &&
      resident.status !== "looking-for-work"
    )
      continue;
    laborForce += 1;
    if (!resident.holdsWork) unemployed += 1;
  }
  return laborForce === 0
    ? { value: null, basis: 0 }
    : {
        value:
          (ECONOMY_RULE_PARAMETERS.percentPerProportion.value * unemployed) /
          laborForce,
        basis: laborForce,
      };
}

/** Median hourly pay from supplied work rates, in minor currency units. */
export function medianHourlyPayFromFacts(
  hourlyPayMinor: readonly number[],
): TownMeasureFact {
  const rates = [...hourlyPayMinor].sort((left, right) => left - right);
  if (rates.length === 0) return { value: null, basis: 0 };
  const middle = Math.floor(rates.length / 2);
  const value =
    rates.length % 2 === 1
      ? rates[middle]!
      : Math.round((rates[middle - 1]! + rates[middle]!) / 2);
  return { value, basis: rates.length };
}
