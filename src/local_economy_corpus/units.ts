/**
 * Economic Units and Price Basis Safety
 *
 * Enforces strict distinction between Nominal USD, Real Chained USD (by reference year),
 * Counts (Jobs, Establishments), Indices, and Percentages.
 *
 * Invariant: Never mix nominal and real dollars silently.
 */

import type { MoneyValueUnit, NonMoneyValueUnit, ValueUnit } from "./types.js";

export function createNominalDollarUnit(
  scaleMultiplier: number = 1000,
  displayUnit?: string,
): MoneyValueUnit {
  const defaultDisplay =
    scaleMultiplier === 1000
      ? "Thousands of dollars"
      : scaleMultiplier === 1000000
        ? "Millions of dollars"
        : "Dollars";

  return {
    kind: "currency",
    currency: "USD",
    priceBasis: "nominal",
    scaleMultiplier,
    displayUnit: displayUnit || defaultDisplay,
  };
}

export function createRealDollarUnit(
  referenceYear: number = 2017,
  scaleMultiplier: number = 1000,
  displayUnit?: string,
): MoneyValueUnit {
  const defaultDisplay =
    scaleMultiplier === 1000
      ? `Thousands of chained ${referenceYear} dollars`
      : scaleMultiplier === 1000000
        ? `Millions of chained ${referenceYear} dollars`
        : `Chained ${referenceYear} dollars`;

  return {
    kind: "currency",
    currency: "USD",
    priceBasis: "real",
    referenceYear,
    scaleMultiplier,
    displayUnit: displayUnit || defaultDisplay,
  };
}

export function createJobsCountUnit(): NonMoneyValueUnit {
  return {
    kind: "count",
    scaleMultiplier: 1,
    displayUnit: "Number of jobs",
  };
}

export function createEstablishmentsCountUnit(): NonMoneyValueUnit {
  return {
    kind: "count",
    scaleMultiplier: 1,
    displayUnit: "Establishments",
  };
}

export function createRatioUnit(
  displayUnit: string = "Ratio",
): NonMoneyValueUnit {
  return {
    kind: "ratio",
    scaleMultiplier: 1,
    displayUnit,
  };
}

export function createPercentageUnit(
  displayUnit: string = "Percent",
): NonMoneyValueUnit {
  return {
    kind: "percentage",
    scaleMultiplier: 0.01,
    displayUnit,
  };
}

export interface UnitCompatibilityCheck {
  compatible: boolean;
  reason?: string;
}

/**
 * Checks whether two units can be directly compared, subtracted, or aggregated.
 * Strictly blocks mixing nominal and real dollars or different reference years.
 */
export function checkUnitCompatibility(
  unitA: ValueUnit,
  unitB: ValueUnit,
): UnitCompatibilityCheck {
  if (unitA.kind !== unitB.kind) {
    return {
      compatible: false,
      reason: `Cannot combine '${unitA.kind}' unit (${unitA.displayUnit}) with '${unitB.kind}' unit (${unitB.displayUnit})`,
    };
  }

  if (unitA.kind === "currency" && unitB.kind === "currency") {
    if (unitA.currency !== unitB.currency) {
      return {
        compatible: false,
        reason: `Currency mismatch: '${unitA.currency}' vs '${unitB.currency}'`,
      };
    }

    if (unitA.priceBasis !== unitB.priceBasis) {
      return {
        compatible: false,
        reason: `Price basis mismatch: cannot mix ${unitA.priceBasis} dollars with ${unitB.priceBasis} dollars without explicit price deflator`,
      };
    }

    if (unitA.priceBasis === "real" && unitB.priceBasis === "real") {
      if (unitA.referenceYear !== unitB.referenceYear) {
        return {
          compatible: false,
          reason: `Real dollar reference year mismatch: chained ${unitA.referenceYear} vs chained ${unitB.referenceYear}`,
        };
      }
    }
  }

  return { compatible: true };
}

/**
 * Throws an Error if two units are incompatible.
 */
export function assertUnitCompatibility(
  unitA: ValueUnit,
  unitB: ValueUnit,
): void {
  const check = checkUnitCompatibility(unitA, unitB);
  if (!check.compatible) {
    throw new Error(`Economic Unit Incompatibility Error: ${check.reason}`);
  }
}

/**
 * Formats a numeric value into a readable string with its unit.
 */
export function formatValueWithUnit(
  value: number | null,
  unit: ValueUnit,
): string {
  if (value === null || value === undefined) {
    return "Suppressed/Unavailable";
  }

  if (unit.kind === "currency") {
    const formattedNum = value.toLocaleString("en-US", {
      maximumFractionDigits: 2,
    });
    if (unit.priceBasis === "nominal") {
      return `$${formattedNum} (${unit.displayUnit})`;
    } else {
      return `$${formattedNum} (${unit.displayUnit})`;
    }
  }

  if (unit.kind === "percentage") {
    return `${value.toFixed(2)}%`;
  }

  return `${value.toLocaleString("en-US")} ${unit.displayUnit}`;
}
