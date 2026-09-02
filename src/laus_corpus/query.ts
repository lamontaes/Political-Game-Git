/**
 * Search and Query Interface for BLS LAUS Compiled Corpus
 */

import type {
  LausArea,
  LausCompiledCorpus,
  LausObservation,
  LausQueryFilter,
  LausQueryResult,
  LausReconciliation,
  SeasonalAdjustment,
} from "./types.js";

function toArray<T>(val: T | T[] | undefined): T[] | undefined {
  if (val === undefined) return undefined;
  return Array.isArray(val) ? val : [val];
}

/**
 * Queries a compiled LAUS corpus by geography, time period, measure, and status.
 */
export function queryCorpus(
  corpus: LausCompiledCorpus,
  filter: LausQueryFilter,
): LausQueryResult {
  const areaCodeList = toArray(filter.areaCode);
  const areaTypeCodeList = toArray(filter.areaTypeCode);
  const yearList = toArray(filter.year);
  const periodList = toArray(filter.period);
  const measureCodeList = toArray(filter.measureCode);
  const statusList = toArray(filter.status);

  // Index areas matching stateFips / countyFips / areaTypeCode / areaCode
  const matchingAreaCodes = new Set<string>();
  let filterAreas = false;

  if (
    filter.stateFips ||
    filter.countyFips ||
    areaTypeCodeList ||
    areaCodeList
  ) {
    filterAreas = true;
    for (const area of corpus.areas) {
      if (areaCodeList && !areaCodeList.includes(area.areaCode)) continue;
      if (areaTypeCodeList && !areaTypeCodeList.includes(area.areaTypeCode))
        continue;
      if (filter.stateFips && area.stateFips !== filter.stateFips) continue;
      if (filter.countyFips && area.countyFips !== filter.countyFips) continue;
      matchingAreaCodes.add(area.areaCode);
    }
  }

  const matchedObservations: LausObservation[] = [];
  for (const obs of corpus.observations) {
    if (filterAreas && !matchingAreaCodes.has(obs.areaCode)) continue;
    if (
      areaCodeList &&
      !matchingAreaCodes.has(obs.areaCode) &&
      !areaCodeList.includes(obs.areaCode)
    )
      continue;
    if (areaTypeCodeList && !areaTypeCodeList.includes(obs.areaTypeCode))
      continue;
    if (yearList && !yearList.includes(obs.year)) continue;
    if (periodList && !periodList.includes(obs.period)) continue;
    if (measureCodeList && !measureCodeList.includes(obs.measureCode)) continue;
    if (filter.seasonal && obs.seasonal !== filter.seasonal) continue;
    if (statusList && !statusList.includes(obs.status)) continue;

    matchedObservations.push(obs);
  }

  const matchedAreaCodeSet = new Set(
    matchedObservations.map((o: LausObservation) => o.areaCode),
  );
  const matchedAreas = corpus.areas.filter((a: LausArea) =>
    matchedAreaCodeSet.has(a.areaCode),
  );

  const matchedReconciliations = corpus.reconciliations.filter(
    (r: LausReconciliation) => {
      if (!matchedAreaCodeSet.has(r.areaCode)) return false;
      if (yearList && !yearList.includes(r.year)) return false;
      if (periodList && !periodList.includes(r.period)) return false;
      if (filter.seasonal && r.seasonal !== filter.seasonal) return false;
      return true;
    },
  );

  return {
    filter,
    totalMatchedObservations: matchedObservations.length,
    areas: matchedAreas,
    observations: matchedObservations,
    reconciliations: matchedReconciliations,
  };
}

/**
 * Gets an Area by areaCode.
 */
export function getAreaByCode(
  corpus: LausCompiledCorpus,
  areaCode: string,
): LausArea | null {
  return corpus.areas.find((a: LausArea) => a.areaCode === areaCode) || null;
}

/**
 * Gets an Area by 5-digit county FIPS or 2-digit state FIPS.
 */
export function getAreaByFips(
  corpus: LausCompiledCorpus,
  fips: string,
): LausArea | null {
  if (fips.length === 2) {
    return (
      corpus.areas.find(
        (a: LausArea) => a.stateFips === fips && a.areaTypeCode === "A",
      ) || null
    );
  }
  if (fips.length === 5) {
    return (
      corpus.areas.find(
        (a: LausArea) => a.countyFips === fips && a.areaTypeCode === "F",
      ) || null
    );
  }
  return null;
}

/**
 * Gets the most recent observation for an area and measure.
 */
export function getLatestObservation(
  corpus: LausCompiledCorpus,
  areaCode: string,
  measureCode: string,
  seasonal: SeasonalAdjustment = "U",
): LausObservation | null {
  const matches = corpus.observations.filter(
    (o: LausObservation) =>
      o.areaCode === areaCode &&
      o.measureCode === measureCode &&
      o.seasonal === seasonal,
  );

  if (matches.length === 0) return null;

  matches.sort((a: LausObservation, b: LausObservation) => {
    if (a.year !== b.year) return b.year - a.year;
    return b.period.localeCompare(a.period);
  });

  return matches[0] || null;
}
