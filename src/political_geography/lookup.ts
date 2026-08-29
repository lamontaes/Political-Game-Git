import { pointInDistrict } from "./geometry_math.js";
import { normalizeStateIdentifier } from "./ids.js";
import type {
  BoundaryChamberType,
  GeoPoint,
  PoliticalDistrictSourceRecord,
  PoliticalGeographyCorpus,
} from "./types.js";

export interface PointLookupOptions {
  vintage?: string;
  chamberType?: BoundaryChamberType;
  statePostalOrFips?: string;
}

/**
 * Finds all districts containing the given [longitude, latitude] point.
 * Useful for resolving player, candidate, or constituency locations to their governing districts.
 */
export function findDistrictsByPoint(
  corpus: PoliticalGeographyCorpus,
  point: GeoPoint,
  options: PointLookupOptions = {},
): PoliticalDistrictSourceRecord[] {
  const targetVintage = options.vintage || "2026";
  const statePostal = options.statePostalOrFips
    ? normalizeStateIdentifier(options.statePostalOrFips).statePostal
    : null;

  return corpus.districts.filter((district) => {
    if (district.sourceVintage !== targetVintage) return false;
    if (options.chamberType && district.chamberType !== options.chamberType)
      return false;
    if (statePostal && district.state.statePostal !== statePostal) return false;

    return pointInDistrict(point, district.geometry);
  });
}

/**
 * Looks up a district record by its exact stable district ID.
 */
export function findDistrictById(
  corpus: PoliticalGeographyCorpus,
  districtId: string,
): PoliticalDistrictSourceRecord | null {
  return corpus.districts.find((d) => d.districtId === districtId) || null;
}

/**
 * Looks up a district record by its Census GEOID (with optional vintage filter, defaulting to "2026").
 */
export function findDistrictByGeoid(
  corpus: PoliticalGeographyCorpus,
  geoid: string,
  vintage: string = "2026",
): PoliticalDistrictSourceRecord | null {
  return (
    corpus.districts.find(
      (d) => d.geoid === geoid && d.sourceVintage === vintage,
    ) || null
  );
}

/**
 * Returns all districts in a given state and chamber for a specific vintage.
 */
export function findDistrictsByStateAndChamber(
  corpus: PoliticalGeographyCorpus,
  stateInput: string,
  chamberType: BoundaryChamberType,
  vintage: string = "2026",
): PoliticalDistrictSourceRecord[] {
  const state = normalizeStateIdentifier(stateInput);
  return corpus.districts.filter(
    (d) =>
      d.state.statePostal === state.statePostal &&
      d.chamberType === chamberType &&
      d.sourceVintage === vintage,
  );
}

/**
 * Returns all districts containing or overlapping a given 5-digit County FIPS.
 */
export function findDistrictsByCounty(
  corpus: PoliticalGeographyCorpus,
  countyFips: string,
  vintage: string = "2026",
): PoliticalDistrictSourceRecord[] {
  const normCounty = countyFips.trim();
  return corpus.districts.filter(
    (d) =>
      d.sourceVintage === vintage &&
      d.hierarchy.countyFipsList.includes(normCounty),
  );
}

/**
 * Returns all adjacent neighbor districts for a given district.
 */
export function findAdjacentDistricts(
  corpus: PoliticalGeographyCorpus,
  districtId: string,
): PoliticalDistrictSourceRecord[] {
  const sourceDistrict = findDistrictById(corpus, districtId);
  if (!sourceDistrict) return [];

  const adjacentIds = new Set(sourceDistrict.derived.adjacentDistrictIds);
  return corpus.districts.filter((d) => adjacentIds.has(d.districtId));
}

/**
 * Returns all historical/multi-vintage versions of a given district across all compiled vintages.
 * Demonstrates version-aware redistricting coexistence.
 */
export function findHistoricalDistrictVintages(
  corpus: PoliticalGeographyCorpus,
  stateInput: string,
  chamberType: BoundaryChamberType,
  districtIdentifier: string,
): PoliticalDistrictSourceRecord[] {
  const state = normalizeStateIdentifier(stateInput);
  const normDistrict = districtIdentifier.trim().toLowerCase();

  return corpus.districts
    .filter(
      (d) =>
        d.state.statePostal === state.statePostal &&
        d.chamberType === chamberType &&
        d.districtIdentifier.toLowerCase() === normDistrict,
    )
    .sort((a, b) => a.sourceVintage.localeCompare(b.sourceVintage));
}
