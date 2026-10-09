import { ECONOMY_RULE_PARAMETERS as parameters } from "./parameters";

export function roundMacro(value: number): number {
  if (!Number.isFinite(value)) {
    throw new Error("Macro values must be finite numbers.");
  }
  const scale = 10 ** parameters.macroPrecisionDecimalPlaces.value;
  const rounded = Math.round(value * scale) / scale;
  return Object.is(rounded, -0) ? 0 : rounded;
}

/** Published quarterly real-output growth from recorded quarterly indexes. */
export function annualizedQuarterlyGrowthPct(
  quarterIndex: number,
  previousQuarterIndex: number,
): number {
  if (!(quarterIndex > 0) || !(previousQuarterIndex > 0)) {
    throw new Error("Quarterly output indexes must be positive.");
  }
  return roundMacro(100 * ((quarterIndex / previousQuarterIndex) ** 4 - 1));
}

/** Published 12-month change from recorded price-index levels. */
export function twelveMonthChangePct(
  indexNow: number,
  indexTwelveMonthsEarlier: number,
): number {
  if (!(indexNow > 0) || !(indexTwelveMonthsEarlier > 0)) {
    throw new Error("Price indexes must be positive.");
  }
  return roundMacro(100 * (indexNow / indexTwelveMonthsEarlier - 1));
}
