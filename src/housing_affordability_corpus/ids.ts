/**
 * Deterministic Identifier Generation for Housing Corpus
 *
 * Ensures stable, collision-free, reproducible identifiers for geographies,
 * FMR records, Income Limit records, CHAS observations, and profiles.
 */

export function normalizeFips(
  fips: string | number | null | undefined,
  length: number,
): string {
  if (!fips) return "";
  const raw = String(fips).trim();
  return raw.padStart(length, "0");
}

export function createGeoId(
  stateFips: string | number,
  countyFips?: string | number | null,
  cbsaCode?: string | number | null,
): string {
  const normState = normalizeFips(stateFips, 2);
  if (countyFips) {
    const normCounty = normalizeFips(countyFips, 5);
    return `county_${normCounty}`;
  }
  if (cbsaCode) {
    const normCbsa = String(cbsaCode).trim();
    return `metro_${normCbsa}`;
  }
  return `state_${normState}`;
}

export function createFmrId(geoId: string, vintage: string): string {
  const cleanVintage = vintage.toLowerCase().replace(/[^a-z0-9]/g, "_");
  const cleanGeo = geoId.toLowerCase().replace(/[^a-z0-9]/g, "_");
  return `us_hud_fmr_${cleanGeo}_${cleanVintage}`;
}

export function createIncomeLimitId(geoId: string, vintage: string): string {
  const cleanVintage = vintage.toLowerCase().replace(/[^a-z0-9]/g, "_");
  const cleanGeo = geoId.toLowerCase().replace(/[^a-z0-9]/g, "_");
  return `us_hud_il_${cleanGeo}_${cleanVintage}`;
}

export function createChasRecordId(
  geoId: string,
  tableId: string,
  vintage: string,
  sourceVariable: string,
): string {
  const cleanVintage = vintage.toLowerCase().replace(/[^a-z0-9]/g, "_");
  const cleanGeo = geoId.toLowerCase().replace(/[^a-z0-9]/g, "_");
  const cleanTable = tableId.toLowerCase().replace(/[^a-z0-9]/g, "_");
  const cleanVar = sourceVariable.toLowerCase().replace(/[^a-z0-9]/g, "_");
  return `us_chas_${cleanTable}_${cleanGeo}_${cleanVintage}_${cleanVar}`;
}

export function createProfileId(geoId: string): string {
  const cleanGeo = geoId.toLowerCase().replace(/[^a-z0-9]/g, "_");
  return `profile_housing_${cleanGeo}`;
}
