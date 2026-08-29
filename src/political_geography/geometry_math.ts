import { createHash } from "node:crypto";
import type { BoundingBox, DistrictGeometry, GeoPoint } from "./types.js";

/**
 * Validates that coordinates are within valid WGS84 ranges and rings are closed.
 */
export function validateGeometryCoordinates(geometry: DistrictGeometry): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  if (
    !geometry ||
    (geometry.type !== "Polygon" && geometry.type !== "MultiPolygon")
  ) {
    return {
      valid: false,
      errors: ["Geometry must be a Polygon or MultiPolygon"],
    };
  }

  const polygons: GeoPoint[][][] =
    geometry.type === "Polygon" ? [geometry.coordinates] : geometry.coordinates;

  if (polygons.length === 0) {
    errors.push("Geometry contains no polygon rings");
  }

  for (let pIdx = 0; pIdx < polygons.length; pIdx++) {
    const poly = polygons[pIdx];
    if (!poly || poly.length === 0) {
      errors.push(`Polygon [${pIdx}] has no linear rings`);
      continue;
    }

    for (let rIdx = 0; rIdx < poly.length; rIdx++) {
      const ring = poly[rIdx];
      if (!ring || ring.length < 4) {
        errors.push(
          `Polygon [${pIdx}] Ring [${rIdx}] must have at least 4 coordinates (closed ring)`,
        );
        continue;
      }

      // Check first and last point match (closed ring)
      const first = ring[0];
      const last = ring[ring.length - 1];
      const epsilon = 1e-7;
      if (
        Math.abs(first[0] - last[0]) > epsilon ||
        Math.abs(first[1] - last[1]) > epsilon
      ) {
        errors.push(
          `Polygon [${pIdx}] Ring [${rIdx}] is not closed (first != last)`,
        );
      }

      // Check coordinate bounds (lon: -180..180, lat: -90..90)
      for (let cIdx = 0; cIdx < ring.length; cIdx++) {
        const pt = ring[cIdx];
        if (
          !Array.isArray(pt) ||
          pt.length < 2 ||
          typeof pt[0] !== "number" ||
          typeof pt[1] !== "number"
        ) {
          errors.push(
            `Polygon [${pIdx}] Ring [${rIdx}] Point [${cIdx}] is invalid`,
          );
          continue;
        }
        const [lon, lat] = pt;
        if (isNaN(lon) || isNaN(lat)) {
          errors.push(
            `Polygon [${pIdx}] Ring [${rIdx}] Point [${cIdx}] contains NaN`,
          );
        }
        if (lon < -180 || lon > 180) {
          errors.push(`Longitude ${lon} out of WGS84 range [-180, 180]`);
        }
        if (lat < -90 || lat > 90) {
          errors.push(`Latitude ${lat} out of WGS84 range [-90, 90]`);
        }
      }
    }
  }

  return { valid: errors.length === 0, errors };
}

/**
 * Computes exact bounding box [minLon, minLat, maxLon, maxLat] across all geometry coordinates.
 */
export function computeBoundingBox(geometry: DistrictGeometry): BoundingBox {
  let minLon = Infinity;
  let minLat = Infinity;
  let maxLon = -Infinity;
  let maxLat = -Infinity;

  const polygons: GeoPoint[][][] =
    geometry.type === "Polygon" ? [geometry.coordinates] : geometry.coordinates;

  for (const poly of polygons) {
    for (const ring of poly) {
      for (const [lon, lat] of ring) {
        if (lon < minLon) minLon = lon;
        if (lat < minLat) minLat = lat;
        if (lon > maxLon) maxLon = lon;
        if (lat > maxLat) maxLat = lat;
      }
    }
  }

  if (minLon === Infinity) {
    return [0, 0, 0, 0];
  }

  return [
    roundCoordinate(minLon, 6),
    roundCoordinate(minLat, 6),
    roundCoordinate(maxLon, 6),
    roundCoordinate(maxLat, 6),
  ];
}

/**
 * Computes area-weighted polygon centroid using the Green's theorem center of mass formula.
 * For MultiPolygons, computes the area-weighted average centroid across all component polygons.
 */
export function computeCentroid(geometry: DistrictGeometry): GeoPoint {
  const polygons: GeoPoint[][][] =
    geometry.type === "Polygon" ? [geometry.coordinates] : geometry.coordinates;

  let totalArea = 0;
  let weightedCentroidX = 0;
  let weightedCentroidY = 0;

  for (const poly of polygons) {
    if (!poly || poly.length === 0) continue;
    const exterior = poly[0];
    if (!exterior || exterior.length < 3) continue;

    let ringArea = 0;
    let ringCx = 0;
    let ringCy = 0;

    for (let i = 0; i < exterior.length - 1; i++) {
      const p1 = exterior[i];
      const p2 = exterior[i + 1];
      const cross = p1[0] * p2[1] - p2[0] * p1[1];
      ringArea += cross;
      ringCx += (p1[0] + p2[0]) * cross;
      ringCy += (p1[1] + p2[1]) * cross;
    }

    ringArea = ringArea / 2;
    const absArea = Math.abs(ringArea);

    if (absArea > 1e-9) {
      const cx = ringCx / (6 * ringArea);
      const cy = ringCy / (6 * ringArea);
      weightedCentroidX += cx * absArea;
      weightedCentroidY += cy * absArea;
      totalArea += absArea;
    }
  }

  if (totalArea > 1e-9) {
    return [
      roundCoordinate(weightedCentroidX / totalArea, 6),
      roundCoordinate(weightedCentroidY / totalArea, 6),
    ];
  }

  // Fallback to bounding box center
  const [minLon, minLat, maxLon, maxLat] = computeBoundingBox(geometry);
  return [
    roundCoordinate((minLon + maxLon) / 2, 6),
    roundCoordinate((minLat + maxLat) / 2, 6),
  ];
}

/**
 * Computes a deterministic SHA-256 hash of canonicalized coordinates.
 * Quantizes all floats to 6 decimal places (~0.11m precision) to eliminate platform floating point jitter.
 */
export function computeGeometryHash(geometry: DistrictGeometry): string {
  const canonicalCoords = canonicalizeCoordinates(geometry);
  const payload = JSON.stringify({
    type: geometry.type,
    coordinates: canonicalCoords,
  });
  return createHash("sha256").update(payload, "utf8").digest("hex");
}

/**
 * Standard Ray-Casting Point-in-Polygon test for a single ring.
 */
function pointInRing(point: GeoPoint, ring: GeoPoint[]): boolean {
  const [px, py] = point;
  let inside = false;

  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const xi = ring[i][0];
    const yi = ring[i][1];
    const xj = ring[j][0];
    const yj = ring[j][1];

    const intersect =
      yi > py !== yj > py && px < ((xj - xi) * (py - yi)) / (yj - yi) + xi;
    if (intersect) {
      inside = !inside;
    }
  }

  return inside;
}

/**
 * Point-in-Polygon test including hole exclusions.
 */
export function pointInPolygonWithHoles(
  point: GeoPoint,
  rings: GeoPoint[][],
): boolean {
  if (rings.length === 0) return false;
  // Must be inside exterior ring
  if (!pointInRing(point, rings[0])) return false;
  // Must NOT be inside any interior hole ring
  for (let h = 1; h < rings.length; h++) {
    if (pointInRing(point, rings[h])) {
      return false;
    }
  }
  return true;
}

/**
 * Tests if a given geographic point [lon, lat] is located within a district geometry.
 */
export function pointInDistrict(
  point: GeoPoint,
  geometry: DistrictGeometry,
): boolean {
  const [lon, lat] = point;
  const bbox = computeBoundingBox(geometry);

  // Fast bounding box rejection with tiny epsilon
  const eps = 1e-6;
  if (
    lon < bbox[0] - eps ||
    lat < bbox[1] - eps ||
    lon > bbox[2] + eps ||
    lat > bbox[3] + eps
  ) {
    return false;
  }

  if (geometry.type === "Polygon") {
    return pointInPolygonWithHoles(point, geometry.coordinates);
  }

  if (geometry.type === "MultiPolygon") {
    for (const poly of geometry.coordinates) {
      if (pointInPolygonWithHoles(point, poly)) {
        return true;
      }
    }
  }

  return false;
}

/**
 * Determines whether two bounding boxes overlap or touch.
 */
export function boundingBoxesIntersect(
  b1: BoundingBox,
  b2: BoundingBox,
  margin: number = 0.0001,
): boolean {
  return !(
    b1[2] < b2[0] - margin ||
    b1[0] > b2[2] + margin ||
    b1[3] < b2[1] - margin ||
    b1[1] > b2[3] + margin
  );
}

/**
 * Checks if two district geometries are topologically adjacent (share boundary vertices or edges).
 */
export function checkPolygonAdjacency(
  g1: DistrictGeometry,
  g2: DistrictGeometry,
  toleranceDegrees: number = 0.005, // ~500m tolerance for boundary proximity
): boolean {
  const bbox1 = computeBoundingBox(g1);
  const bbox2 = computeBoundingBox(g2);

  if (!boundingBoxesIntersect(bbox1, bbox2, toleranceDegrees)) {
    return false;
  }

  const polys1: GeoPoint[][][] =
    g1.type === "Polygon" ? [g1.coordinates] : g1.coordinates;
  const polys2: GeoPoint[][][] =
    g2.type === "Polygon" ? [g2.coordinates] : g2.coordinates;

  for (const p1 of polys1) {
    const ext1 = p1[0];
    for (const p2 of polys2) {
      const ext2 = p2[0];
      for (const pt1 of ext1) {
        for (const pt2 of ext2) {
          const dLon = pt1[0] - pt2[0];
          const dLat = pt1[1] - pt2[1];
          const distSq = dLon * dLon + dLat * dLat;
          if (distSq <= toleranceDegrees * toleranceDegrees) {
            return true;
          }
        }
      }
    }
  }

  return false;
}

/**
 * Estimates approximate surface area in square kilometers using spherical projection.
 */
export function approximateDistrictAreaKm2(geometry: DistrictGeometry): number {
  const polygons: GeoPoint[][][] =
    geometry.type === "Polygon" ? [geometry.coordinates] : geometry.coordinates;

  let totalAreaSqDegrees = 0;
  const [, cLat] = computeCentroid(geometry);
  const latRad = (cLat * Math.PI) / 180;
  const kmPerDegLat = 111.0;
  const kmPerDegLon = 111.0 * Math.cos(latRad);

  for (const poly of polygons) {
    if (!poly || poly.length === 0) continue;
    const ext = poly[0];
    let ringArea = 0;
    for (let i = 0; i < ext.length - 1; i++) {
      ringArea += ext[i][0] * ext[i + 1][1] - ext[i + 1][0] * ext[i][1];
    }
    totalAreaSqDegrees += Math.abs(ringArea / 2);
  }

  const areaKm2 = totalAreaSqDegrees * kmPerDegLat * kmPerDegLon;
  return roundCoordinate(areaKm2, 2);
}

function roundCoordinate(val: number, decimals: number): number {
  const factor = Math.pow(10, decimals);
  return Math.round(val * factor) / factor;
}

function canonicalizeCoordinates(geometry: DistrictGeometry): unknown {
  if (geometry.type === "Polygon") {
    return geometry.coordinates.map((ring) =>
      ring.map(([lon, lat]) => [
        roundCoordinate(lon, 6),
        roundCoordinate(lat, 6),
      ]),
    );
  }
  return geometry.coordinates.map((poly) =>
    poly.map((ring) =>
      ring.map(([lon, lat]) => [
        roundCoordinate(lon, 6),
        roundCoordinate(lat, 6),
      ]),
    ),
  );
}
