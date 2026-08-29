import {
  approximateDistrictAreaKm2,
  checkPolygonAdjacency,
  computeBoundingBox,
  computeCentroid,
  computeGeometryHash,
  validateGeometryCoordinates,
} from "./geometry_math.js";
import {
  buildDistrictGeoid,
  buildDistrictId,
  normalizeStateIdentifier,
  parentJurisdictionKey,
  sanitizeDistrictIdentifier,
} from "./ids.js";
import type {
  EffectiveDateInfo,
  GeometrySourceReference,
  PoliticalDistrictSourceRecord,
  PoliticalGeographyCorpus,
  RawDistrictInput,
} from "./types.js";

export interface CompilerOptions {
  toleranceDegreesAdjacency?: number;
  fixedCompilationTimestamp?: string;
}

/**
 * Main compiler engine that normalizes raw geographic boundaries into an authoritative,
 * version-aware PoliticalGeographyCorpus.
 */
export function compilePoliticalGeographyCorpus(
  inputs: RawDistrictInput[],
  options: CompilerOptions = {},
): PoliticalGeographyCorpus {
  const normalizedRecords: PoliticalDistrictSourceRecord[] = [];
  const seenDistrictIds = new Set<string>();

  for (const raw of inputs) {
    const geoValidation = validateGeometryCoordinates(raw.geometry);
    if (!geoValidation.valid) {
      throw new Error(
        `Invalid geometry for district ${raw.districtIdentifier} in state ${raw.stateFipsOrPostal} (vintage ${raw.sourceVintage}): ${geoValidation.errors.join(", ")}`,
      );
    }

    const state = normalizeStateIdentifier(raw.stateFipsOrPostal);
    const sanitizedDistrict = sanitizeDistrictIdentifier(
      raw.districtIdentifier,
    );
    const vintage = raw.sourceVintage.trim();
    const chamber = raw.chamberType;

    const districtId = buildDistrictId(
      vintage,
      state.statePostal,
      chamber,
      sanitizedDistrict,
    );
    if (seenDistrictIds.has(districtId)) {
      throw new Error(`Duplicate district ID detected: ${districtId}`);
    }
    seenDistrictIds.add(districtId);

    const geoid =
      raw.geoid ||
      buildDistrictGeoid(state.stateFips, chamber, sanitizedDistrict);

    const geometrySource: GeometrySourceReference = {
      sourceName:
        raw.geometrySource.sourceName ||
        "U.S. Census Bureau 2026 TIGER/Line Shapefiles",
      series:
        raw.geometrySource.series ||
        `tl_${vintage}_${state.stateFips}_${chamber}`,
      sourceUrl:
        raw.geometrySource.sourceUrl ||
        `https://www2.census.gov/geo/tiger/TIGER${vintage}/${chamber.toUpperCase()}/`,
      sourceFile:
        raw.geometrySource.sourceFile ||
        `tl_${vintage}_${state.stateFips}_${chamber}.geojson`,
      retrievedAt: raw.geometrySource.retrievedAt || "2026-08-28T00:00:00Z",
      license:
        raw.geometrySource.license || "U.S. Federal Government Public Domain",
    };

    const isCurrentVintage = vintage === "2026";
    const effectiveDateInfo: EffectiveDateInfo = {
      effectiveDate:
        raw.effectiveDateInfo?.effectiveDate ||
        (vintage === "2026" ? "2026-01-01" : `${vintage}-01-01`),
      validUntil:
        raw.effectiveDateInfo?.validUntil !== undefined
          ? raw.effectiveDateInfo.validUntil
          : isCurrentVintage
            ? null
            : "2025-12-31",
      cycleYear:
        raw.effectiveDateInfo?.cycleYear || parseInt(vintage, 10) || 2026,
      congressionalSession:
        raw.effectiveDateInfo?.congressionalSession !== undefined
          ? raw.effectiveDateInfo.congressionalSession
          : chamber === "congressional" || chamber === "non_voting_delegate"
            ? vintage === "2026"
              ? 120
              : 119
            : null,
      redistrictingCycle:
        raw.effectiveDateInfo?.redistrictingCycle || "2020s-cycle",
      isCurrent:
        raw.effectiveDateInfo?.isCurrent !== undefined
          ? raw.effectiveDateInfo.isCurrent
          : isCurrentVintage,
    };

    const hierarchy = {
      stateFips: state.stateFips,
      parentJurisdictionId: parentJurisdictionKey(state.statePostal),
      countyFipsList: (raw.countyFipsList || []).map((c) => c.trim()).sort(),
      primaryCountyFips:
        raw.primaryCountyFips ||
        (raw.countyFipsList && raw.countyFipsList.length > 0
          ? raw.countyFipsList[0]
          : null),
    };

    const boundingBox = computeBoundingBox(raw.geometry);
    const centroid = computeCentroid(raw.geometry);
    const geometryHash = computeGeometryHash(raw.geometry);
    const areaSquareKmEstimated = approximateDistrictAreaKm2(raw.geometry);

    const displayName =
      raw.name ||
      formatDefaultDistrictName(state.stateName, chamber, sanitizedDistrict);

    normalizedRecords.push({
      districtId,
      geoid,
      districtIdentifier: sanitizedDistrict,
      name: displayName,
      chamberType: chamber,
      sourceVintage: vintage,
      state,
      geometrySource,
      effectiveDateInfo,
      hierarchy,
      geometry: raw.geometry,
      geometryHash,
      derived: {
        boundingBox,
        centroid,
        areaSquareKmEstimated,
        adjacentDistrictIds: [], // Resolved in second pass
      },
    });
  }

  // Second pass: Deterministically derive topological adjacency graph
  // Group by (vintage, statePostal, chamberType)
  const grouped: Record<string, PoliticalDistrictSourceRecord[]> = {};
  for (const record of normalizedRecords) {
    const key = `${record.sourceVintage}:${record.state.statePostal}:${record.chamberType}`;
    if (!grouped[key]) grouped[key] = [];
    grouped[key].push(record);
  }

  const adjacencyTolerance = options.toleranceDegreesAdjacency || 0.005;

  for (const group of Object.values(grouped)) {
    for (let i = 0; i < group.length; i++) {
      const d1 = group[i];
      for (let j = i + 1; j < group.length; j++) {
        const d2 = group[j];
        if (
          checkPolygonAdjacency(d1.geometry, d2.geometry, adjacencyTolerance)
        ) {
          d1.derived.adjacentDistrictIds.push(d2.districtId);
          d2.derived.adjacentDistrictIds.push(d1.districtId);
        }
      }
    }
  }

  // Sort adjacent IDs for determinism
  for (const record of normalizedRecords) {
    record.derived.adjacentDistrictIds.sort();
  }

  // Deterministic sorting of all records
  normalizedRecords.sort((a, b) => {
    if (a.sourceVintage !== b.sourceVintage)
      return a.sourceVintage.localeCompare(b.sourceVintage);
    if (a.state.statePostal !== b.state.statePostal)
      return a.state.statePostal.localeCompare(b.state.statePostal);
    if (a.chamberType !== b.chamberType)
      return a.chamberType.localeCompare(b.chamberType);
    if (a.geoid !== b.geoid) return a.geoid.localeCompare(b.geoid);
    return a.districtId.localeCompare(b.districtId);
  });

  const vintages = Array.from(
    new Set(normalizedRecords.map((r) => r.sourceVintage)),
  ).sort();

  return {
    schemaVersion: "1.0.0",
    compiledAt: options.fixedCompilationTimestamp || new Date().toISOString(),
    sourceVintages: vintages,
    totalDistricts: normalizedRecords.length,
    districts: normalizedRecords,
  };
}

function formatDefaultDistrictName(
  stateName: string,
  chamber: string,
  district: string,
): string {
  if (chamber === "congressional") {
    if (district === "al" || district === "00")
      return `${stateName} At-Large Congressional District`;
    return `${stateName}'s ${formatOrdinal(district)} Congressional District`;
  }
  if (chamber === "non_voting_delegate") {
    return `${stateName} Non-Voting Delegate District`;
  }
  if (chamber === "state_senate") {
    return `${stateName} State Senate District ${district}`;
  }
  if (chamber === "state_house") {
    return `${stateName} State House District ${district}`;
  }
  if (chamber === "unicameral") {
    return `${stateName} Legislative District ${district}`;
  }
  if (chamber === "council_ward") {
    return `${stateName} Council Ward ${district}`;
  }
  return `${stateName} District ${district}`;
}

function formatOrdinal(numStr: string): string {
  const num = parseInt(numStr, 10);
  if (isNaN(num)) return numStr;
  const j = num % 10;
  const k = num % 100;
  if (j === 1 && k !== 11) return `${num}st`;
  if (j === 2 && k !== 12) return `${num}nd`;
  if (j === 3 && k !== 13) return `${num}rd`;
  return `${num}th`;
}
