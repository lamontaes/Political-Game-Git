# Political Geography & District Boundary Source Compiler System

## 1. Overview & Purpose

The **Political Geography & District Boundary Source Compiler** is the foundational, data-driven geographic source layer for the Political Game. It provides deterministic ingestion, normalization, multi-vintage coexistence, topological derivations, point-in-district spatial constituency lookups, and integrity validation for legislative and electoral district boundaries sourced from official U.S. Census Bureau TIGER/Line products.

This system serves as the underlying geographic and constituency foundation for future:

- **Office Districts**: Mapping elective offices to their constitutional and statutory boundaries.
- **Constituency Lookup**: Resolving player, candidate, voter, and community locations `[lon, lat]` to their governing congressional and legislative districts.
- **Portability**: Supporting synthetic or real-world non-Lexington jurisdictions with identical spatial contracts.
- **District Demographic Joins**: Providing standard Census GEOIDs and crosswalk keys for joining demographic datasets (such as the American Community Survey / ACS baselines) without embedding mutable demographic stats into geometry.
- **Map & Canvas Rendering**: Generating clean GeoJSON polygons, bounding boxes, and centroids for high-performance map rendering.
- **Version-Aware Redistricting Support**: Retaining multiple redistricting vintages (e.g. 2024 119th Congress vs. 2026 120th Congress) concurrently in an append-oriented, non-destructive structure.

## 2. Architectural Boundary & Product Principles

### Boundary Contract

- **Source Layer, Not a Redistricting Simulator**: In alignment with **Game Constitution Principle 9** ("Government institutions and rules should be data-driven rather than unnecessarily hard-coded") and **Principle 15** ("Geography matters"), this system ingests, normalizes, and indexes authoritative real-world boundary evidence. It does not provide redistricting gameplay mechanics, map re-carving tools, or gerrymandering simulators.
- **Evidence, Not Mutable Save State**: In accordance with **Game Constitution Principle 25** ("Real-world starting data and simulated save-world history are distinct data domains"), source records capture official Census boundaries with explicit provenance, retrieval timestamps, effective date windows, and SHA-256 geometry hashes.
- **No Population in Geometry**: Population and demographic counts are strictly decoupled from boundary geometry and belong exclusively to demographic sources.
- **Strict Decoupling**: Pure TypeScript implementation located in `src/political_geography/` and `scripts/political-geography/`. Completely decoupled from `src/simulation/` and React UI.

## 3. Sourcing & Multi-Vintage Model

### Primary Source: U.S. Census Bureau 2026 TIGER/Line Products

The compiler ingests official 2026 Census TIGER/Line boundary products:

- **120th Congressional Districts (`cd120`)**: Sourced for the 2026 election cycle / 120th United States Congress (effective 2026-01-01 / convening 2027-01-03).
- **2026 State Legislative Districts, Upper Chamber (`sldu`)**: State Senate districts across 50 states and territories.
- **2026 State Legislative Districts, Lower Chamber (`sldl`)**: State House / Assembly / House of Delegates districts.
- **Standard Census Geographic Identifiers**: 2-digit State FIPS, 5-digit County FIPS, ANSI feature codes, and standard Census GEOIDs.

### Multi-Vintage Non-Destructive Coexistence

Districts from earlier redistricting cycles (e.g. 2024 vintage / 119th Congress) coexist alongside 2026 products in the same compiled corpus. Old district geometries are never overwritten when new vintages are introduced. Each record specifies:

- `sourceVintage`: e.g. `"2024"`, `"2026"`.
- `effectiveDateInfo.effectiveDate`: ISO start date.
- `effectiveDateInfo.validUntil`: ISO end date (or `null` if currently active).
- `effectiveDateInfo.isCurrent`: Boolean flag indicating current baseline status.

## 4. Normalized Data Models & Schemas

All normalized records adhere to strict schemas in `src/political_geography/types.ts`:

1. **`PoliticalDistrictSourceRecord`**:
   - `districtId`: Stable composite global identifier (`geo:district:<vintage>:<statePostal>:<chamberType>:<districtIdentifier>`).
   - `geoid`: Official Census GEOID (`2106`, `5600`, `21013`, `31046`, `1198`).
   - `districtIdentifier`: Chamber-level identifier (`"6"`, `"13"`, `"77"`, `"al"`, `"98"`).
   - `name`: Full display name (e.g. `"Kentucky's 6th Congressional District"`).
   - `chamberType`: `"congressional" | "state_senate" | "state_house" | "unicameral" | "non_voting_delegate" | "council_ward"`.
   - `sourceVintage`: Vintage label (`"2026"`, `"2024"`).
   - `state`: Canonical `StateIdentifier` with FIPS, postal code, state name, and ANSI code.
   - `geometrySource`: Full provenance (series, source URL, source file, retrieval date, public domain license).
   - `effectiveDateInfo`: Date validity window, cycle year, congressional session, and active flag.
   - `hierarchy`: Links to parent state FIPS, parent jurisdiction ID (`us_ky`), and overlapping county FIPS.
   - `geometry`: GeoJSON-compliant `Polygon` or `MultiPolygon` in EPSG:4326 (WGS84) coordinates.
   - `geometryHash`: Cryptographic SHA-256 hash of canonicalized coordinates (6 decimal precision).
   - `derived`: Derived metrics including `boundingBox`, `centroid`, `areaSquareKmEstimated`, and `adjacentDistrictIds`.

2. **`PoliticalGeographyCorpus`**:
   - `schemaVersion`: `"1.0.0"`.
   - `compiledAt`: ISO 8601 UTC timestamp.
   - `sourceVintages`: Array of included vintages (`["2024", "2026"]`).
   - `totalDistricts`: Total count of compiled district records.
   - `districts`: Deterministically sorted array of normalized records.

3. **`PoliticalGeographyManifest`**:
   - Breakdown of supported vintages, chamber totals, state coverage summaries, and global SHA-256 digest.

## 5. Deterministic Spatial Mathematics & Derivations

All spatial operations are implemented in pure TypeScript without native C++ dependencies:

1. **Point-in-District Ray Casting (`pointInDistrict`)**:
   - Uses the Ray Casting (Even-Odd) algorithm to test if `[longitude, latitude]` lies within the polygon exterior ring while strictly excluding interior hole rings.
2. **Area-Weighted Polygon Centroid (`computeCentroid`)**:
   - Computes exact polygon center of mass using Green's Theorem / Shoelace formula:
     $$C_x = \frac{1}{6A} \sum_{i=0}^{n-1} (x_i + x_{i+1})(x_i y_{i+1} - x_{i+1} y_i)$$
     $$C_y = \frac{1}{6A} \sum_{i=0}^{n-1} (y_i + y_{i+1})(x_i y_{i+1} - x_{i+1} y_i)$$
   - For `MultiPolygon` geometries, calculates the area-weighted average centroid across all component polygons.
3. **Bounding Box (`computeBoundingBox`)**:
   - Derives exact `[minLon, minLat, maxLon, maxLat]` envelope across all linear rings.
4. **Topological Adjacency Network (`checkPolygonAdjacency`)**:
   - Evaluates neighboring districts within the same state, chamber, and vintage sharing boundary coordinates within topological tolerance ($\approx 0.005^\circ$).
5. **Canonical Geometry SHA-256 Hashing (`computeGeometryHash`)**:
   - Normalizes floating point coordinates to fixed 6-decimal precision (~0.11m resolution) to eliminate cross-platform serialization jitter.

## 6. Special Geographic Topologies

The compiler explicitly handles diverse state constitutional structures:

- **Kentucky (KY / 21)**: Full bicameral legislature (Senate SD 13, House HD 77) and Congressional delegation (CD 1-6) linked to Fayette (Lexington) and Jefferson (Louisville) counties.
- **Single-District State (Wyoming WY / 56)**: Statewide At-Large Congressional District (`5600` / `al`) spanning the entire state boundary, alongside 30 Senate and 60 House districts.
- **Unicameral Legislature (Nebraska NE / 31)**: Nonpartisan 49-district Unicameral Legislature categorized under `unicameral` (Census SLDU). SLDL lower chamber is omitted as unsupported.
- **Multi-District Large State (Texas TX / 48)**: 38 Congressional Districts (including Austin CD 37 and Houston CD 18), 31 Senate Districts, and 150 House Districts.
- **District of Columbia (DC / 11)**: Non-Voting Delegate District (`1198` / `98`) and 8 DC Council Wards (`11001` - `11008`), with no state legislative chambers.

## 7. Demographic Join Seam

Demographic data (such as ACS tables B01001, DP05, etc.) join against compiled districts via the standard Census `geoid` or compound `districtId`. Boundary geometries never embed population or demographic estimates.

## 8. CLI Tooling & Commands

| Command                      | Action                                                                                                                                  |
| :--------------------------- | :-------------------------------------------------------------------------------------------------------------------------------------- |
| `npm run intake:geography`   | Downloads authentic Census TIGER/Line and DC GIS GeoJSON and records raw SHA-256 and provenance audit metadata.                         |
| `npm run compile:geography`  | Compiles raw/fixture TIGER/Line sources into normalized corpus (`data/political_geography/corpus/normalized_political_geography.json`). |
| `npm run manifest:geography` | Generates geographic coverage and integrity manifest (`data/political_geography/manifests/political_geography_manifest.json`).          |
| `npm run validate:geography` | Executes full geometric coordinate checks, SHA-256 validation, bounding box checks, and adjacency reciprocal audits.                    |
| `npm run test:geography`     | Runs automated Vitest test suite (`tests/political_geography.test.ts`).                                                                 |
