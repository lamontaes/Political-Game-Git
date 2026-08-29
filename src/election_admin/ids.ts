/**
 * Stable identifier utilities for Election Administration & Participation records.
 */

export function normalizeJurisdictionId(
  stateAbbr: string,
  countyFips?: string,
): string {
  const cleanState = stateAbbr.trim().toLowerCase();
  if (!countyFips) {
    if (cleanState === "us" || cleanState === "us_fed" || cleanState === "fed") {
      return "us_fed";
    }
    return cleanState.startsWith("us_") ? cleanState : `us_${cleanState}`;
  }
  const cleanCountyFips = countyFips.trim();
  const prefix = cleanState.startsWith("us_") ? cleanState : `us_${cleanState}`;
  return `${prefix}_${cleanCountyFips}`;
}

export function makeEavsRecordId(
  vintageYear: number,
  jurisdictionId: string,
): string {
  return `eavs:${vintageYear}:${jurisdictionId}`;
}

export function makePolicySurveyRecordId(
  vintageYear: number,
  jurisdictionId: string,
): string {
  return `policy_survey:${vintageYear}:${jurisdictionId}`;
}

export function makeCpsCalibrationRecordId(
  vintageYear: number,
  jurisdictionId: string,
  categoryKey: string = "overall",
): string {
  return `cps:${vintageYear}:${jurisdictionId}:${categoryKey}`;
}

export function makeHistoricalTurnoutSeriesRecordId(
  jurisdictionId: string,
  startYear: number,
  endYear: number,
): string {
  return `historical_turnout:${jurisdictionId}:${startYear}_${endYear}`;
}

export function parseJurisdictionLevel(
  jurisdictionId: string,
  fips: string,
): "national" | "state" | "county" | "territory" {
  if (jurisdictionId === "us_fed" || fips === "00" || fips === "00000") {
    return "national";
  }
  const territoryFips = new Set(["72", "66", "78", "60", "69"]);
  const stateFips = fips.length === 5 ? fips.slice(0, 2) : fips;
  const isTerritory =
    territoryFips.has(stateFips) ||
    jurisdictionId.startsWith("us_pr") ||
    jurisdictionId.startsWith("us_gu") ||
    jurisdictionId.startsWith("us_vi") ||
    jurisdictionId.startsWith("us_as") ||
    jurisdictionId.startsWith("us_mp");

  if (fips.length === 5 && fips !== "00000") {
    return "county";
  }

  return isTerritory ? "territory" : "state";
}
