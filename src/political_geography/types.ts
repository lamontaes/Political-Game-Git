/**
 * Types and schema definitions for the Political Geography and District Boundary Source Compiler.
 *
 * Sourced from U.S. Census Bureau TIGER/Line products:
 * - 120th Congressional Districts (CD120, vintage 2026)
 * - 2026 State Legislative Districts, Upper Chamber (SLDU, State Senate)
 * - 2026 State Legislative Districts, Lower Chamber (SLDL, State House/Assembly)
 * - Standard Census geographic identifiers (FIPS, ANSI, GEOIDs)
 *
 * Supports multi-vintage coexistence (e.g. 2024 and 2026 redistricting snapshots).
 */

export type BoundaryChamberType =
  | "congressional"
  | "state_senate"
  | "state_house"
  | "unicameral"
  | "non_voting_delegate"
  | "council_ward";

export type GeoPoint = [longitude: number, latitude: number];

/**
 * Standard WGS84 Bounding Box: [minLongitude, minLatitude, maxLongitude, maxLatitude]
 */
export type BoundingBox = [
  minLongitude: number,
  minLatitude: number,
  maxLongitude: number,
  maxLatitude: number,
];

export interface GeoPolygonGeometry {
  type: "Polygon";
  /**
   * Array of linear rings. The first ring is the exterior boundary.
   * Any subsequent rings are interior hole boundaries.
   */
  coordinates: GeoPoint[][];
}

export interface GeoMultiPolygonGeometry {
  type: "MultiPolygon";
  /**
   * Array of polygons, each containing an array of linear rings.
   */
  coordinates: GeoPoint[][][];
}

export type DistrictGeometry = GeoPolygonGeometry | GeoMultiPolygonGeometry;

export interface StateIdentifier {
  stateFips: string; // 2-digit FIPS e.g. "21"
  statePostal: string; // 2-letter uppercase e.g. "KY"
  stateName: string; // e.g. "Kentucky"
  ansiCode: string; // Census ANSI code e.g. "00257404"
}

export interface GeometrySourceReference {
  sourceName: string; // e.g. "U.S. Census Bureau 2026 TIGER/Line Shapefiles"
  series: string; // e.g. "tl_2026_us_cd120", "tl_2026_21_sldu"
  sourceUrl: string; // e.g. "https://www2.census.gov/geo/tiger/TIGER2026/CD/tl_2026_us_cd120.zip"
  sourceFile: string; // e.g. "tl_2026_us_cd120.shp" or GeoJSON filename
  retrievedAt: string; // ISO 8601 UTC timestamp
  license: string; // e.g. "U.S. Federal Government Public Domain"
}

export interface EffectiveDateInfo {
  effectiveDate: string; // ISO Date e.g. "2026-01-01" or "2027-01-03"
  validUntil: string | null; // ISO Date when superseded, or null if current
  cycleYear: number; // e.g. 2026
  congressionalSession: number | null; // e.g. 120, or null for state legislatures
  redistrictingCycle: string; // e.g. "2020s-cycle", "2020s-post-2024-remedial"
  isCurrent: boolean; // true if this is the active baseline for current elections
}

export interface GeographicHierarchyLinks {
  stateFips: string;
  parentJurisdictionId: string; // e.g. "us_ky", "us_ne", "us_tx", "us_wy", "us_dc"
  countyFipsList: string[]; // 5-digit County FIPS overlapping this district e.g. ["21067", "21049"]
  primaryCountyFips: string | null; // Largest population/area county FIPS if defined
}

export interface DerivedSpatialProperties {
  boundingBox: BoundingBox;
  centroid: GeoPoint; // Deterministic area-weighted center of mass [lon, lat]
  areaSquareKmEstimated?: number;
  adjacentDistrictIds: string[]; // Sorted list of topological neighbor district IDs
}

/**
 * Authoritative normalized source record for a single electoral/political district boundary.
 */
export interface PoliticalDistrictSourceRecord {
  /**
   * Globally unique, deterministic, stable composite ID.
   * Format: `geo:district:<vintage>:<statePostal>:<chamberType>:<districtIdentifier>`
   * Example: `geo:district:2026:ky:congressional:6`
   */
  districtId: string;

  /**
   * Census GEOID.
   * For Congressional: 2-digit State FIPS + 2-digit CD code (e.g. "2106", "5600", "4837")
   * For State Senate / SLDU: 2-digit State FIPS + 3-digit SLDU code (e.g. "21013", "31046", "48014")
   * For State House / SLDL: 2-digit State FIPS + 3-digit SLDL code (e.g. "21077", "48049")
   */
  geoid: string;

  /**
   * District label / identifier within the chamber (e.g. "6", "13", "77", "00", "AL", "46")
   */
  districtIdentifier: string;

  /**
   * Full human-readable display name (e.g. "Kentucky's 6th Congressional District")
   */
  name: string;

  /**
   * Chamber / boundary type
   */
  chamberType: BoundaryChamberType;

  /**
   * Source vintage string (e.g. "2026", "2024")
   */
  sourceVintage: string;

  /**
   * State and parent jurisdiction metadata
   */
  state: StateIdentifier;

  /**
   * Authoritative source provenance and retrieval metadata
   */
  geometrySource: GeometrySourceReference;

  /**
   * Date and cycle validity window
   */
  effectiveDateInfo: EffectiveDateInfo;

  /**
   * Links to parent state and contained/overlapping counties
   */
  hierarchy: GeographicHierarchyLinks;

  /**
   * GeoJSON Polygon or MultiPolygon geometry in EPSG:4326 (WGS84) coordinates
   */
  geometry: DistrictGeometry;

  /**
   * Deterministic SHA-256 hash of canonicalized coordinates
   */
  geometryHash: string;

  /**
   * Deterministically derived spatial metrics (bounding box, centroid, adjacency)
   */
  derived: DerivedSpatialProperties;
}

/**
 * Raw input format for Census TIGER/Line GeoJSON or adapter ingestion.
 */
export interface RawDistrictInput {
  sourceVintage: string;
  stateFipsOrPostal: string;
  chamberType: BoundaryChamberType;
  districtIdentifier: string;
  name?: string;
  geoid?: string;
  geometry: DistrictGeometry;
  geometrySource: Partial<GeometrySourceReference>;
  effectiveDateInfo?: Partial<EffectiveDateInfo>;
  countyFipsList?: string[];
  primaryCountyFips?: string | null;
}

export interface PoliticalGeographyCorpus {
  schemaVersion: "1.0.0";
  compiledAt: string;
  sourceVintages: string[];
  totalDistricts: number;
  districts: PoliticalDistrictSourceRecord[];
}

export interface StateCoverageSummary {
  statePostal: string;
  stateFips: string;
  stateName: string;
  chambersPresent: BoundaryChamberType[];
  districtCount: number;
}

export interface VintageSummary {
  totalDistricts: number;
  chamberCounts: Record<BoundaryChamberType, number>;
  stateCoverage: Record<string, StateCoverageSummary>;
}

export interface PoliticalGeographyManifest {
  schemaVersion: "1.0.0";
  generatedAt: string;
  supportedVintages: string[];
  totalDistrictsAcrossAllVintages: number;
  vintages: Record<string, VintageSummary>;
  integritySummary: {
    totalDistricts: number;
    validGeometries: number;
    sha256Digest: string;
  };
}

export interface ValidationIssue {
  severity: "error" | "warning";
  districtId?: string;
  geoid?: string;
  code: string;
  message: string;
}

export interface PoliticalGeographyValidationResult {
  valid: boolean;
  totalDistricts: number;
  vintages: string[];
  issues: ValidationIssue[];
  stats: {
    polygonCount: number;
    multiPolygonCount: number;
    uniqueGeometryHashes: number;
    adjacencyLinksCount: number;
  };
}
