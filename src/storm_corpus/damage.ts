/**
 * Damage String Parser and Qualifier Classifier for NOAA Storm Events
 *
 * Preserves the critical distinction between verified zero ($0) and missing/unspecified data.
 * Faithfully preserves raw damage strings (e.g. "25.00K", "1.50M", "5.00B", "0.00K")
 * and computes safe numeric dollar estimates while tagging explicit qualifiers.
 */

import type {
  StormDamage,
  StormDamageItem,
  StormDamageQualifier,
} from "./types";

export interface RawDamageInput {
  readonly damageProperty?: string | number | null;
  readonly damageCrops?: string | number | null;
}

/**
 * Parses raw property or crop damage into a typed StormDamageItem.
 */
export function parseDamageItem(
  raw: string | number | null | undefined,
): StormDamageItem {
  if (raw === null || raw === undefined) {
    return {
      raw: null,
      estimatedDollars: null,
      qualifier: "missing",
    };
  }

  const rawStr = String(raw).trim();
  if (
    rawStr === "" ||
    rawStr.toLowerCase() === "null" ||
    rawStr.toLowerCase() === "unknown"
  ) {
    return {
      raw: rawStr === "" ? null : rawStr,
      estimatedDollars: null,
      qualifier: "missing",
    };
  }

  // Check for suffix: K (thousands), M (millions), B (billions), T (trillions)
  const match = rawStr.match(/^([\d.]+)\s*([KkMmBbTt])?$/);
  if (match && match[1] !== undefined) {
    const baseNumber = parseFloat(match[1]);
    if (!Number.isFinite(baseNumber)) {
      return {
        raw: rawStr,
        estimatedDollars: null,
        qualifier: "unspecified",
      };
    }

    const suffix = (match[2] ?? "").toUpperCase();
    let multiplier = 1;
    let qualifier: StormDamageQualifier = "exact";

    if (suffix === "K") {
      multiplier = 1_000;
      qualifier = "kilo";
    } else if (suffix === "M") {
      multiplier = 1_000_000;
      qualifier = "mega";
    } else if (suffix === "B") {
      multiplier = 1_000_000_000;
      qualifier = "giga";
    } else if (suffix === "T") {
      multiplier = 1_000_000_000_000;
      qualifier = "giga";
    }

    const estimatedDollars = Math.round(baseNumber * multiplier);
    return {
      raw: rawStr,
      estimatedDollars,
      qualifier,
    };
  }

  // If numeric parse fails
  const fallbackNum = parseFloat(rawStr.replace(/[^0-9.]/g, ""));
  if (Number.isFinite(fallbackNum)) {
    return {
      raw: rawStr,
      estimatedDollars: Math.round(fallbackNum),
      qualifier: "exact",
    };
  }

  return {
    raw: rawStr,
    estimatedDollars: null,
    qualifier: "unspecified",
  };
}

/**
 * Parses both property and crop damage and aggregates total estimated damage dollars.
 */
export function parseStormDamage(input: RawDamageInput): StormDamage {
  const property = parseDamageItem(input.damageProperty);
  const crops = parseDamageItem(input.damageCrops);

  let totalEstimatedDollars: number | null = null;
  if (property.estimatedDollars !== null || crops.estimatedDollars !== null) {
    totalEstimatedDollars =
      (property.estimatedDollars ?? 0) + (crops.estimatedDollars ?? 0);
  }

  return {
    property,
    crops,
    totalEstimatedDollars,
  };
}
