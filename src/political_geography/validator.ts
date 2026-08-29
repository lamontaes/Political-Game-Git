import {
  computeBoundingBox,
  computeGeometryHash,
  validateGeometryCoordinates,
} from "./geometry_math.js";
import { buildDistrictId, STATE_MASTER_TABLE } from "./ids.js";
import type {
  PoliticalDistrictSourceRecord,
  PoliticalGeographyCorpus,
  PoliticalGeographyValidationResult,
  ValidationIssue,
} from "./types.js";

/**
 * Validates structural, geometric, and cryptographic integrity of a PoliticalGeographyCorpus.
 */
export function validatePoliticalGeographyCorpus(
  corpus: PoliticalGeographyCorpus,
): PoliticalGeographyValidationResult {
  const issues: ValidationIssue[] = [];

  if (!corpus || corpus.schemaVersion !== "1.0.0") {
    issues.push({
      severity: "error",
      code: "INVALID_SCHEMA_VERSION",
      message: `Expected schemaVersion '1.0.0', found '${corpus?.schemaVersion}'`,
    });
  }

  if (!Array.isArray(corpus.districts)) {
    issues.push({
      severity: "error",
      code: "INVALID_DISTRICTS_ARRAY",
      message: "Corpus districts field must be an array",
    });
    return {
      valid: false,
      totalDistricts: 0,
      vintages: [],
      issues,
      stats: {
        polygonCount: 0,
        multiPolygonCount: 0,
        uniqueGeometryHashes: 0,
        adjacencyLinksCount: 0,
      },
    };
  }

  if (corpus.totalDistricts !== corpus.districts.length) {
    issues.push({
      severity: "error",
      code: "DISTRICT_COUNT_MISMATCH",
      message: `Declared totalDistricts ${corpus.totalDistricts} does not match actual length ${corpus.districts.length}`,
    });
  }

  const seenDistrictIds = new Set<string>();
  const seenVintageGeoid = new Set<string>();
  const districtMap = new Map<string, PoliticalDistrictSourceRecord>();
  const uniqueHashes = new Set<string>();

  let polygonCount = 0;
  let multiPolygonCount = 0;
  let totalAdjacencyLinks = 0;

  for (const district of corpus.districts) {
    const id = district.districtId;

    // 1. Uniqueness check
    if (seenDistrictIds.has(id)) {
      issues.push({
        severity: "error",
        districtId: id,
        geoid: district.geoid,
        code: "DUPLICATE_DISTRICT_ID",
        message: `District ID collision detected: ${id}`,
      });
    }
    seenDistrictIds.add(id);
    districtMap.set(id, district);

    // 2. Vintage + GEOID uniqueness check
    const vintageGeoidKey = `${district.sourceVintage}:${district.geoid}`;
    if (seenVintageGeoid.has(vintageGeoidKey)) {
      issues.push({
        severity: "error",
        districtId: id,
        geoid: district.geoid,
        code: "DUPLICATE_VINTAGE_GEOID",
        message: `Vintage + GEOID collision: ${vintageGeoidKey}`,
      });
    }
    seenVintageGeoid.add(vintageGeoidKey);

    // 3. ID format & derivation check
    const expectedId = buildDistrictId(
      district.sourceVintage,
      district.state.statePostal,
      district.chamberType,
      district.districtIdentifier,
    );
    if (district.districtId !== expectedId) {
      issues.push({
        severity: "error",
        districtId: id,
        geoid: district.geoid,
        code: "INVALID_DISTRICT_ID_FORMAT",
        message: `District ID '${district.districtId}' does not match canonical format '${expectedId}'`,
      });
    }

    // 4. State validation
    const masterState = STATE_MASTER_TABLE[district.state.statePostal];
    if (!masterState) {
      issues.push({
        severity: "error",
        districtId: id,
        code: "UNKNOWN_STATE_POSTAL",
        message: `Unknown state postal code: ${district.state.statePostal}`,
      });
    } else if (masterState.stateFips !== district.state.stateFips) {
      issues.push({
        severity: "error",
        districtId: id,
        code: "STATE_FIPS_MISMATCH",
        message: `State FIPS '${district.state.stateFips}' does not match master table '${masterState.stateFips}'`,
      });
    }

    // 5. Hierarchy link consistency
    if (district.hierarchy.stateFips !== district.state.stateFips) {
      issues.push({
        severity: "error",
        districtId: id,
        code: "HIERARCHY_FIPS_MISMATCH",
        message: `Hierarchy stateFips '${district.hierarchy.stateFips}' does not match district stateFips '${district.state.stateFips}'`,
      });
    }

    // 6. Geometry coordinate validation
    const geoValidation = validateGeometryCoordinates(district.geometry);
    if (!geoValidation.valid) {
      for (const err of geoValidation.errors) {
        issues.push({
          severity: "error",
          districtId: id,
          code: "GEOMETRY_COORDINATE_ERROR",
          message: err,
        });
      }
    }

    if (district.geometry.type === "Polygon") {
      polygonCount++;
    } else if (district.geometry.type === "MultiPolygon") {
      multiPolygonCount++;
    }

    // 7. Cryptographic geometry hash verification (SHA-256)
    const computedHash = computeGeometryHash(district.geometry);
    if (district.geometryHash !== computedHash) {
      issues.push({
        severity: "error",
        districtId: id,
        code: "GEOMETRY_HASH_MISMATCH",
        message: `Geometry hash '${district.geometryHash}' does not match recomputed SHA-256 '${computedHash}'`,
      });
    }
    uniqueHashes.add(district.geometryHash);

    // 8. Bounding box & Centroid verification
    const computedBbox = computeBoundingBox(district.geometry);
    const eps = 1e-5;
    if (
      Math.abs(district.derived.boundingBox[0] - computedBbox[0]) > eps ||
      Math.abs(district.derived.boundingBox[1] - computedBbox[1]) > eps ||
      Math.abs(district.derived.boundingBox[2] - computedBbox[2]) > eps ||
      Math.abs(district.derived.boundingBox[3] - computedBbox[3]) > eps
    ) {
      issues.push({
        severity: "error",
        districtId: id,
        code: "BOUNDING_BOX_MISMATCH",
        message: `Derived bounding box does not match computed coordinates box`,
      });
    }

    const [cLon, cLat] = district.derived.centroid;
    if (
      cLon < computedBbox[0] - eps ||
      cLon > computedBbox[2] + eps ||
      cLat < computedBbox[1] - eps ||
      cLat > computedBbox[3] + eps
    ) {
      issues.push({
        severity: "error",
        districtId: id,
        code: "CENTROID_OUTSIDE_BOUNDS",
        message: `Centroid [${cLon}, ${cLat}] falls outside bounding box [${computedBbox.join(", ")}]`,
      });
    }

    totalAdjacencyLinks += district.derived.adjacentDistrictIds.length;
  }

  // 9. Reciprocal adjacency verification
  for (const district of corpus.districts) {
    for (const neighborId of district.derived.adjacentDistrictIds) {
      const neighbor = districtMap.get(neighborId);
      if (!neighbor) {
        issues.push({
          severity: "error",
          districtId: district.districtId,
          code: "ADJACENT_NEIGHBOR_NOT_FOUND",
          message: `Adjacent neighbor '${neighborId}' not found in corpus`,
        });
      } else if (
        !neighbor.derived.adjacentDistrictIds.includes(district.districtId)
      ) {
        issues.push({
          severity: "error",
          districtId: district.districtId,
          code: "ASYMMETRIC_ADJACENCY",
          message: `Adjacency is asymmetric: '${district.districtId}' links to '${neighborId}', but '${neighborId}' does not link back`,
        });
      }
    }
  }

  const errors = issues.filter((i) => i.severity === "error");

  return {
    valid: errors.length === 0,
    totalDistricts: corpus.districts.length,
    vintages: corpus.sourceVintages,
    issues,
    stats: {
      polygonCount,
      multiPolygonCount,
      uniqueGeometryHashes: uniqueHashes.size,
      adjacencyLinksCount: totalAdjacencyLinks / 2, // Undirected edges
    },
  };
}
