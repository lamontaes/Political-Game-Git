/**
 * Official U.S. Census Bureau Political Districts Geography Corpus
 * Query Utilities & Accessors
 */

import type {
  PoliticalDistrictCorpusData,
  PoliticalDistrictRecord,
  GeographyType,
} from "./types.js";

export * from "./types.js";

/**
 * Filter political district records by state/territory USPS postal abbreviation.
 */
export function getDistrictsByState(
  corpus: PoliticalDistrictCorpusData,
  usps: string,
): PoliticalDistrictRecord[] {
  const normalized = usps.toUpperCase().trim();
  return corpus.records.filter((r) => r.usps === normalized);
}

/**
 * Filter political district records by geography type ('cd', 'sldl', 'sldu').
 */
export function getDistrictsByType(
  corpus: PoliticalDistrictCorpusData,
  geographyType: GeographyType,
): PoliticalDistrictRecord[] {
  return corpus.records.filter((r) => r.geographyType === geographyType);
}

/**
 * Filter political district records by state and geography type.
 */
export function getDistrictsByStateAndType(
  corpus: PoliticalDistrictCorpusData,
  usps: string,
  geographyType: GeographyType,
): PoliticalDistrictRecord[] {
  const normalized = usps.toUpperCase().trim();
  return corpus.records.filter(
    (r) => r.usps === normalized && r.geographyType === geographyType,
  );
}

/**
 * Find a single district by exact Census GEOID (e.g., '0101', '01001', '0200A').
 */
export function getDistrictByGeoid(
  corpus: PoliticalDistrictCorpusData,
  geoid: string,
): PoliticalDistrictRecord | undefined {
  const normalized = geoid.trim();
  return corpus.records.find((r) => r.geoid === normalized);
}

/**
 * Find a single district by exact Census GEOIDFQ (e.g., '5001900US0101', '620L900US01001').
 */
export function getDistrictByGeoidfq(
  corpus: PoliticalDistrictCorpusData,
  geoidfq: string,
): PoliticalDistrictRecord | undefined {
  const normalized = geoidfq.trim();
  return corpus.records.find((r) => r.geoidfq === normalized);
}

/**
 * Find a specific district record by USPS state, geography type, and district code.
 */
export function findDistrict(
  corpus: PoliticalDistrictCorpusData,
  usps: string,
  geographyType: GeographyType,
  districtCode: string,
): PoliticalDistrictRecord | undefined {
  const normState = usps.toUpperCase().trim();
  const normCode = districtCode.trim();
  return corpus.records.find(
    (r) =>
      r.usps === normState &&
      r.geographyType === geographyType &&
      r.districtCode === normCode,
  );
}
