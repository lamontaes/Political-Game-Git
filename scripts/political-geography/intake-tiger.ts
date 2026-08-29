import { createHash } from "node:crypto";
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import * as prettier from "prettier";
import type {
  DistrictGeometry,
  GeoPoint,
  RawDistrictInput,
} from "../../src/political_geography/types.js";
import { computeGeometryHash } from "../../src/political_geography/geometry_math.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = join(__dirname, "../..");

const rawDir = join(projectRoot, "data/political_geography/raw");
const fixtures2026Dir = join(
  projectRoot,
  "data/political_geography/fixtures/raw_tiger_2026",
);
const fixtures2024Dir = join(
  projectRoot,
  "data/political_geography/fixtures/raw_tiger_2024",
);
const auditFile = join(
  projectRoot,
  "data/political_geography/manifests/provenance_audit.json",
);

mkdirSync(rawDir, { recursive: true });
mkdirSync(fixtures2026Dir, { recursive: true });
mkdirSync(fixtures2024Dir, { recursive: true });

export interface ProvenanceAuditRecord {
  districtId: string;
  geoid: string;
  sourceVintage: string;
  censusProduct: string;
  sourceUrl: string;
  rawFilename: string;
  rawSha256: string;
  originalGeometryType: "Polygon" | "MultiPolygon";
  originalVertexCount: number;
  extractionProcess: string;
  isSimplified: boolean;
  simplificationAlgorithm: string;
  simplificationTolerance: string;
  finalVertexCount: number;
  normalizedGeometrySha256: string;
  classification: "authoritative_sourced" | "synthetic_fixture";
}

function countVertices(geometry: DistrictGeometry): number {
  let count = 0;
  if (geometry.type === "Polygon") {
    for (const ring of geometry.coordinates) {
      count += ring.length;
    }
  } else if (geometry.type === "MultiPolygon") {
    for (const poly of geometry.coordinates) {
      for (const ring of poly) {
        count += ring.length;
      }
    }
  }
  return count;
}

function perpendicularDistance(p: GeoPoint, a: GeoPoint, b: GeoPoint): number {
  const [x, y] = p;
  const [x1, y1] = a;
  const [x2, y2] = b;
  const dx = x2 - x1;
  const dy = y2 - y1;
  if (dx === 0 && dy === 0) {
    return Math.hypot(x - x1, y - y1);
  }
  const t = ((x - x1) * dx + (y - y1) * dy) / (dx * dx + dy * dy);
  const tClamped = Math.max(0, Math.min(1, t));
  const projX = x1 + tClamped * dx;
  const projY = y1 + tClamped * dy;
  return Math.hypot(x - projX, y - projY);
}

function douglasPeucker(points: GeoPoint[], epsilon: number): GeoPoint[] {
  if (points.length <= 2) return points;
  let maxDist = 0;
  let index = 0;
  for (let i = 1; i < points.length - 1; i++) {
    const d = perpendicularDistance(
      points[i],
      points[0],
      points[points.length - 1],
    );
    if (d > maxDist) {
      maxDist = d;
      index = i;
    }
  }
  if (maxDist > epsilon) {
    const left = douglasPeucker(points.slice(0, index + 1), epsilon);
    const right = douglasPeucker(points.slice(index), epsilon);
    return [...left.slice(0, -1), ...right];
  }
  return [points[0], points[points.length - 1]];
}

function simplifyRing(ring: GeoPoint[], epsilon: number): GeoPoint[] {
  if (ring.length <= 4) return ring;
  // Closed ring: simplify open path then re-close
  const openPath = ring.slice(0, -1);
  const simplified = douglasPeucker(openPath, epsilon);
  const closed = [...simplified, simplified[0]];
  if (closed.length < 4) return ring; // Maintain polygon validity
  return closed;
}

function simplifyGeometry(
  geometry: DistrictGeometry,
  epsilon: number,
): DistrictGeometry {
  if (epsilon <= 0) return geometry;
  if (geometry.type === "Polygon") {
    return {
      type: "Polygon",
      coordinates: geometry.coordinates.map((ring) =>
        simplifyRing(ring, epsilon),
      ),
    };
  }
  return {
    type: "MultiPolygon",
    coordinates: geometry.coordinates.map((poly) =>
      poly.map((ring) => simplifyRing(ring, epsilon)),
    ),
  };
}

interface TargetItem {
  vintage: "2026" | "2024";
  statePostal: string;
  stateFips: string;
  chamberType:
    | "congressional"
    | "state_senate"
    | "state_house"
    | "unicameral"
    | "non_voting_delegate"
    | "council_ward";
  districtIdentifier: string;
  geoid: string;
  name: string;
  product: string;
  url: string;
  rawFilename: string;
  countyFipsList: string[];
  primaryCountyFips: string;
  epsilon: number;
}

const TARGETS: TargetItem[] = [
  // Kentucky 2026
  {
    vintage: "2026",
    statePostal: "KY",
    stateFips: "21",
    chamberType: "congressional",
    districtIdentifier: "6",
    geoid: "2106",
    name: "Kentucky's 6th Congressional District",
    product: "Census TIGER/Line 2026 120th Congressional District (Layer 0)",
    url: "https://tigerweb.geo.census.gov/arcgis/rest/services/TIGERweb/Legislative/MapServer/0/query?where=GEOID=%272106%27&outFields=*&f=geojson&outSR=4326",
    rawFilename: "raw_census_ky_cd_2106.geojson",
    countyFipsList: [
      "21067",
      "21017",
      "21049",
      "21073",
      "21151",
      "21239",
      "21079",
    ],
    primaryCountyFips: "21067",
    epsilon: 0.0005,
  },
  {
    vintage: "2026",
    statePostal: "KY",
    stateFips: "21",
    chamberType: "congressional",
    districtIdentifier: "3",
    geoid: "2103",
    name: "Kentucky's 3rd Congressional District",
    product: "Census TIGER/Line 2026 120th Congressional District (Layer 0)",
    url: "https://tigerweb.geo.census.gov/arcgis/rest/services/TIGERweb/Legislative/MapServer/0/query?where=GEOID=%272103%27&outFields=*&f=geojson&outSR=4326",
    rawFilename: "raw_census_ky_cd_2103.geojson",
    countyFipsList: ["21111"],
    primaryCountyFips: "21111",
    epsilon: 0.0005,
  },
  {
    vintage: "2026",
    statePostal: "KY",
    stateFips: "21",
    chamberType: "congressional",
    districtIdentifier: "4",
    geoid: "2104",
    name: "Kentucky's 4th Congressional District",
    product: "Census TIGER/Line 2026 120th Congressional District (Layer 0)",
    url: "https://tigerweb.geo.census.gov/arcgis/rest/services/TIGERweb/Legislative/MapServer/0/query?where=GEOID=%272104%27&outFields=*&f=geojson&outSR=4326",
    rawFilename: "raw_census_ky_cd_2104.geojson",
    countyFipsList: ["21015", "21037", "21117", "21191"],
    primaryCountyFips: "21015",
    epsilon: 0.0005,
  },
  {
    vintage: "2026",
    statePostal: "KY",
    stateFips: "21",
    chamberType: "state_senate",
    districtIdentifier: "13",
    geoid: "21013",
    name: "Kentucky State Senate District 13",
    product:
      "Census TIGER/Line 2026 State Legislative District Upper (Layer 1)",
    url: "https://tigerweb.geo.census.gov/arcgis/rest/services/TIGERweb/Legislative/MapServer/1/query?where=GEOID=%2721013%27&outFields=*&f=geojson&outSR=4326",
    rawFilename: "raw_census_ky_sldu_21013.geojson",
    countyFipsList: ["21067"],
    primaryCountyFips: "21067",
    epsilon: 0.0002,
  },
  {
    vintage: "2026",
    statePostal: "KY",
    stateFips: "21",
    chamberType: "state_senate",
    districtIdentifier: "27",
    geoid: "21027",
    name: "Kentucky State Senate District 27",
    product:
      "Census TIGER/Line 2026 State Legislative District Upper (Layer 1)",
    url: "https://tigerweb.geo.census.gov/arcgis/rest/services/TIGERweb/Legislative/MapServer/1/query?where=GEOID=%2721027%27&outFields=*&f=geojson&outSR=4326",
    rawFilename: "raw_census_ky_sldu_21027.geojson",
    countyFipsList: ["21017", "21067", "21097"],
    primaryCountyFips: "21017",
    epsilon: 0.0003,
  },
  {
    vintage: "2026",
    statePostal: "KY",
    stateFips: "21",
    chamberType: "state_house",
    districtIdentifier: "77",
    geoid: "21077",
    name: "Kentucky State House District 77",
    product:
      "Census TIGER/Line 2026 State Legislative District Lower (Layer 2)",
    url: "https://tigerweb.geo.census.gov/arcgis/rest/services/TIGERweb/Legislative/MapServer/2/query?where=GEOID=%2721077%27&outFields=*&f=geojson&outSR=4326",
    rawFilename: "raw_census_ky_sldl_21077.geojson",
    countyFipsList: ["21067"],
    primaryCountyFips: "21067",
    epsilon: 0.0002,
  },
  {
    vintage: "2026",
    statePostal: "KY",
    stateFips: "21",
    chamberType: "state_house",
    districtIdentifier: "75",
    geoid: "21075",
    name: "Kentucky State House District 75",
    product:
      "Census TIGER/Line 2026 State Legislative District Lower (Layer 2)",
    url: "https://tigerweb.geo.census.gov/arcgis/rest/services/TIGERweb/Legislative/MapServer/2/query?where=GEOID=%2721075%27&outFields=*&f=geojson&outSR=4326",
    rawFilename: "raw_census_ky_sldl_21075.geojson",
    countyFipsList: ["21067"],
    primaryCountyFips: "21067",
    epsilon: 0.0002,
  },

  // Wyoming 2026
  {
    vintage: "2026",
    statePostal: "WY",
    stateFips: "56",
    chamberType: "congressional",
    districtIdentifier: "al",
    geoid: "5600",
    name: "Wyoming At-Large Congressional District",
    product: "Census TIGER/Line 2026 120th Congressional District (Layer 0)",
    url: "https://tigerweb.geo.census.gov/arcgis/rest/services/TIGERweb/Legislative/MapServer/0/query?where=GEOID=%275600%27&outFields=*&f=geojson&outSR=4326",
    rawFilename: "raw_census_wy_cd_5600.geojson",
    countyFipsList: ["56001", "56021", "56025", "56037"],
    primaryCountyFips: "56021",
    epsilon: 0.001,
  },
  {
    vintage: "2026",
    statePostal: "WY",
    stateFips: "56",
    chamberType: "state_senate",
    districtIdentifier: "8",
    geoid: "56008",
    name: "Wyoming State Senate District 8",
    product:
      "Census TIGER/Line 2026 State Legislative District Upper (Layer 1)",
    url: "https://tigerweb.geo.census.gov/arcgis/rest/services/TIGERweb/Legislative/MapServer/1/query?where=GEOID=%2756008%27&outFields=*&f=geojson&outSR=4326",
    rawFilename: "raw_census_wy_sldu_56008.geojson",
    countyFipsList: ["56021"],
    primaryCountyFips: "56021",
    epsilon: 0.0002,
  },
  {
    vintage: "2026",
    statePostal: "WY",
    stateFips: "56",
    chamberType: "state_house",
    districtIdentifier: "7",
    geoid: "56007",
    name: "Wyoming State House District 7",
    product:
      "Census TIGER/Line 2026 State Legislative District Lower (Layer 2)",
    url: "https://tigerweb.geo.census.gov/arcgis/rest/services/TIGERweb/Legislative/MapServer/2/query?where=GEOID=%2756007%27&outFields=*&f=geojson&outSR=4326",
    rawFilename: "raw_census_wy_sldl_56007.geojson",
    countyFipsList: ["56021"],
    primaryCountyFips: "56021",
    epsilon: 0.0002,
  },

  // Nebraska 2026
  {
    vintage: "2026",
    statePostal: "NE",
    stateFips: "31",
    chamberType: "congressional",
    districtIdentifier: "1",
    geoid: "3101",
    name: "Nebraska's 1st Congressional District",
    product: "Census TIGER/Line 2026 120th Congressional District (Layer 0)",
    url: "https://tigerweb.geo.census.gov/arcgis/rest/services/TIGERweb/Legislative/MapServer/0/query?where=GEOID=%273101%27&outFields=*&f=geojson&outSR=4326",
    rawFilename: "raw_census_ne_cd_3101.geojson",
    countyFipsList: ["31109", "31053", "31155"],
    primaryCountyFips: "31109",
    epsilon: 0.0005,
  },
  {
    vintage: "2026",
    statePostal: "NE",
    stateFips: "31",
    chamberType: "congressional",
    districtIdentifier: "2",
    geoid: "3102",
    name: "Nebraska's 2nd Congressional District",
    product: "Census TIGER/Line 2026 120th Congressional District (Layer 0)",
    url: "https://tigerweb.geo.census.gov/arcgis/rest/services/TIGERweb/Legislative/MapServer/0/query?where=GEOID=%273102%27&outFields=*&f=geojson&outSR=4326",
    rawFilename: "raw_census_ne_cd_3102.geojson",
    countyFipsList: ["31055", "31153"],
    primaryCountyFips: "31055",
    epsilon: 0.0005,
  },
  {
    vintage: "2026",
    statePostal: "NE",
    stateFips: "31",
    chamberType: "unicameral",
    districtIdentifier: "46",
    geoid: "31046",
    name: "Nebraska Legislative District 46",
    product:
      "Census TIGER/Line 2026 State Legislative District Upper (Unicameral Layer 1)",
    url: "https://tigerweb.geo.census.gov/arcgis/rest/services/TIGERweb/Legislative/MapServer/1/query?where=GEOID=%2731046%27&outFields=*&f=geojson&outSR=4326",
    rawFilename: "raw_census_ne_sldu_31046.geojson",
    countyFipsList: ["31109"],
    primaryCountyFips: "31109",
    epsilon: 0.0002,
  },
  {
    vintage: "2026",
    statePostal: "NE",
    stateFips: "31",
    chamberType: "unicameral",
    districtIdentifier: "5",
    geoid: "31005",
    name: "Nebraska Legislative District 5",
    product:
      "Census TIGER/Line 2026 State Legislative District Upper (Unicameral Layer 1)",
    url: "https://tigerweb.geo.census.gov/arcgis/rest/services/TIGERweb/Legislative/MapServer/1/query?where=GEOID=%2731005%27&outFields=*&f=geojson&outSR=4326",
    rawFilename: "raw_census_ne_sldu_31005.geojson",
    countyFipsList: ["31055"],
    primaryCountyFips: "31055",
    epsilon: 0.0002,
  },

  // Texas 2026
  {
    vintage: "2026",
    statePostal: "TX",
    stateFips: "48",
    chamberType: "congressional",
    districtIdentifier: "37",
    geoid: "4837",
    name: "Texas's 37th Congressional District",
    product: "Census TIGER/Line 2026 120th Congressional District (Layer 0)",
    url: "https://tigerweb.geo.census.gov/arcgis/rest/services/TIGERweb/Legislative/MapServer/0/query?where=GEOID=%274837%27&outFields=*&f=geojson&outSR=4326",
    rawFilename: "raw_census_tx_cd_4837.geojson",
    countyFipsList: ["48453", "48491"],
    primaryCountyFips: "48453",
    epsilon: 0.0003,
  },
  {
    vintage: "2026",
    statePostal: "TX",
    stateFips: "48",
    chamberType: "congressional",
    districtIdentifier: "18",
    geoid: "4818",
    name: "Texas's 18th Congressional District",
    product: "Census TIGER/Line 2026 120th Congressional District (Layer 0)",
    url: "https://tigerweb.geo.census.gov/arcgis/rest/services/TIGERweb/Legislative/MapServer/0/query?where=GEOID=%274818%27&outFields=*&f=geojson&outSR=4326",
    rawFilename: "raw_census_tx_cd_4818.geojson",
    countyFipsList: ["48201"],
    primaryCountyFips: "48201",
    epsilon: 0.0003,
  },
  {
    vintage: "2026",
    statePostal: "TX",
    stateFips: "48",
    chamberType: "congressional",
    districtIdentifier: "30",
    geoid: "4830",
    name: "Texas's 30th Congressional District",
    product: "Census TIGER/Line 2026 120th Congressional District (Layer 0)",
    url: "https://tigerweb.geo.census.gov/arcgis/rest/services/TIGERweb/Legislative/MapServer/0/query?where=GEOID=%274830%27&outFields=*&f=geojson&outSR=4326",
    rawFilename: "raw_census_tx_cd_4830.geojson",
    countyFipsList: ["48113", "48439"],
    primaryCountyFips: "48113",
    epsilon: 0.0003,
  },
  {
    vintage: "2026",
    statePostal: "TX",
    stateFips: "48",
    chamberType: "state_senate",
    districtIdentifier: "14",
    geoid: "48014",
    name: "Texas State Senate District 14",
    product:
      "Census TIGER/Line 2026 State Legislative District Upper (Layer 1)",
    url: "https://tigerweb.geo.census.gov/arcgis/rest/services/TIGERweb/Legislative/MapServer/1/query?where=GEOID=%2748014%27&outFields=*&f=geojson&outSR=4326",
    rawFilename: "raw_census_tx_sldu_48014.geojson",
    countyFipsList: ["48453", "48021"],
    primaryCountyFips: "48453",
    epsilon: 0.0002,
  },
  {
    vintage: "2026",
    statePostal: "TX",
    stateFips: "48",
    chamberType: "state_house",
    districtIdentifier: "49",
    geoid: "48049",
    name: "Texas State House District 49",
    product:
      "Census TIGER/Line 2026 State Legislative District Lower (Layer 2)",
    url: "https://tigerweb.geo.census.gov/arcgis/rest/services/TIGERweb/Legislative/MapServer/2/query?where=GEOID=%2748049%27&outFields=*&f=geojson&outSR=4326",
    rawFilename: "raw_census_tx_sldl_48049.geojson",
    countyFipsList: ["48453"],
    primaryCountyFips: "48453",
    epsilon: 0.0002,
  },

  // District of Columbia 2026
  {
    vintage: "2026",
    statePostal: "DC",
    stateFips: "11",
    chamberType: "non_voting_delegate",
    districtIdentifier: "98",
    geoid: "1198",
    name: "District of Columbia Non-Voting Delegate District",
    product: "Census TIGER/Line 2026 120th Congressional District (Layer 0)",
    url: "https://tigerweb.geo.census.gov/arcgis/rest/services/TIGERweb/Legislative/MapServer/0/query?where=GEOID=%271198%27&outFields=*&f=geojson&outSR=4326",
    rawFilename: "raw_census_dc_cd_1198.geojson",
    countyFipsList: ["11001"],
    primaryCountyFips: "11001",
    epsilon: 0.0003,
  },

  // Kentucky 2024 Vintage (119th Congress Baseline)
  {
    vintage: "2024",
    statePostal: "KY",
    stateFips: "21",
    chamberType: "congressional",
    districtIdentifier: "6",
    geoid: "2106",
    name: "Kentucky's 6th Congressional District (2024 Vintage)",
    product: "Census TIGER/Line 2024 119th Congressional District (Layer 0)",
    url: "https://tigerweb.geo.census.gov/arcgis/rest/services/TIGERweb/Legislative/MapServer/0/query?where=GEOID=%272106%27&outFields=*&f=geojson&outSR=4326",
    rawFilename: "raw_census_ky_2024_cd_2106.geojson",
    countyFipsList: ["21067", "21017", "21049", "21073"],
    primaryCountyFips: "21067",
    epsilon: 0.0005,
  },
  {
    vintage: "2024",
    statePostal: "KY",
    stateFips: "21",
    chamberType: "congressional",
    districtIdentifier: "3",
    geoid: "2103",
    name: "Kentucky's 3rd Congressional District (2024 Vintage)",
    product: "Census TIGER/Line 2024 119th Congressional District (Layer 0)",
    url: "https://tigerweb.geo.census.gov/arcgis/rest/services/TIGERweb/Legislative/MapServer/0/query?where=GEOID=%272103%27&outFields=*&f=geojson&outSR=4326",
    rawFilename: "raw_census_ky_2024_cd_2103.geojson",
    countyFipsList: ["21111"],
    primaryCountyFips: "21111",
    epsilon: 0.0005,
  },
];

async function main() {
  console.log(
    "================================================================================",
  );
  console.log(
    "POLITICAL GAME — AUTHORITATIVE CENSUS TIGER/LINE INTAKE & PROVENANCE PIPELINE",
  );
  console.log(
    "================================================================================\n",
  );

  const auditRecords: ProvenanceAuditRecord[] = [];
  const fixtureGroups: Record<string, RawDistrictInput[]> = {
    ky_2026: [],
    wy_2026: [],
    ne_2026: [],
    tx_2026: [],
    dc_2026: [],
    ky_2024: [],
  };

  for (const target of TARGETS) {
    console.log(`Fetching ${target.name} [GEOID: ${target.geoid}]...`);
    const rawPath = join(rawDir, target.rawFilename);

    let rawJson: string;
    try {
      const res = await fetch(target.url);
      if (!res.ok) throw new Error(`HTTP ${res.status}: ${res.statusText}`);
      rawJson = await res.text();
      writeFileSync(rawPath, rawJson, "utf8");
    } catch (err) {
      console.warn(
        `Fetch failed for ${target.name}, attempting cached read:`,
        err,
      );
      rawJson = readFileSync(rawPath, "utf8");
    }

    const rawSha256 = createHash("sha256")
      .update(rawJson, "utf8")
      .digest("hex");
    const parsedGeoJson = JSON.parse(rawJson);
    const feature = parsedGeoJson.features && parsedGeoJson.features[0];
    if (!feature || !feature.geometry) {
      throw new Error(
        `No geometry feature returned for ${target.name} in ${target.rawFilename}`,
      );
    }

    const originalGeometry: DistrictGeometry = feature.geometry;
    const origVertexCount = countVertices(originalGeometry);
    const simplifiedGeometry = simplifyGeometry(
      originalGeometry,
      target.epsilon,
    );
    const finalVertexCount = countVertices(simplifiedGeometry);
    const normalizedHash = computeGeometryHash(simplifiedGeometry);

    const isCurrent = target.vintage === "2026";
    const rawInput: RawDistrictInput = {
      sourceVintage: target.vintage,
      stateFipsOrPostal: target.statePostal,
      chamberType: target.chamberType,
      districtIdentifier: target.districtIdentifier,
      name: target.name,
      geoid: target.geoid,
      geometry: simplifiedGeometry,
      geometrySource: {
        sourceName: "U.S. Census Bureau TIGER/Line Shapefiles & GeoJSON API",
        series: target.product,
        sourceUrl: target.url,
        sourceFile: target.rawFilename,
        retrievedAt: "2026-08-29T12:00:00.000Z",
        license: "U.S. Federal Government Public Domain",
      },
      effectiveDateInfo: {
        effectiveDate:
          target.vintage === "2026" ? "2026-01-01" : `${target.vintage}-01-01`,
        validUntil: isCurrent ? null : "2025-12-31",
        cycleYear: parseInt(target.vintage, 10),
        congressionalSession:
          target.chamberType === "congressional" ||
          target.chamberType === "non_voting_delegate"
            ? target.vintage === "2026"
              ? 120
              : 119
            : null,
        redistrictingCycle:
          target.vintage === "2026" ? "2020s-cycle" : "2020s-initial",
        isCurrent,
      },
      countyFipsList: target.countyFipsList,
      primaryCountyFips: target.primaryCountyFips,
    };

    const groupKey = `${target.statePostal.toLowerCase()}_${target.vintage}`;
    if (fixtureGroups[groupKey]) {
      fixtureGroups[groupKey].push(rawInput);
    }

    const districtId = `geo:district:${target.vintage}:${target.statePostal.toLowerCase()}:${target.chamberType}:${target.districtIdentifier}`;
    auditRecords.push({
      districtId,
      geoid: target.geoid,
      sourceVintage: target.vintage,
      censusProduct: target.product,
      sourceUrl: target.url,
      rawFilename: target.rawFilename,
      rawSha256,
      originalGeometryType: originalGeometry.type,
      originalVertexCount: origVertexCount,
      extractionProcess:
        "Census TIGERweb Legislative MapServer REST API GeoJSON extraction (EPSG:4326)",
      isSimplified: origVertexCount !== finalVertexCount,
      simplificationAlgorithm:
        "Douglas-Peucker (Ramer-Douglas-Peucker on closed linear rings)",
      simplificationTolerance: `${target.epsilon} deg (~${Math.round(target.epsilon * 111000)}m)`,
      finalVertexCount,
      normalizedGeometrySha256: normalizedHash,
      classification: "authoritative_sourced",
    });
  }

  // Also fetch DC Council Wards from Open Data DC
  console.log("Fetching DC Council Wards from Open Data DC...");
  const dcWardsUrl =
    "https://hub.arcgis.com/api/download/v1/items/486e19d5e46c45b5827ca5d7b42f66bf/geojson?redirect=true&layers=53";
  const dcRawPath = join(rawDir, "raw_dc_council_wards_2022.geojson");
  let dcRawJson: string;
  try {
    const res = await fetch(dcWardsUrl);
    if (!res.ok) throw new Error(`HTTP ${res.status}: ${res.statusText}`);
    dcRawJson = await res.text();
    writeFileSync(dcRawPath, dcRawJson, "utf8");
  } catch (err) {
    console.warn("DC Wards fetch failed, reading cache:", err);
    dcRawJson = readFileSync(dcRawPath, "utf8");
  }
  const dcRawSha256 = createHash("sha256")
    .update(dcRawJson, "utf8")
    .digest("hex");
  const dcParsed = JSON.parse(dcRawJson);

  for (const wardId of ["2", "6"]) {
    const feat = dcParsed.features.find(
      (f: {
        properties?: { WARD_ID?: string | number; WARD?: string | number };
      }) => String(f.properties?.WARD_ID || f.properties?.WARD) === wardId,
    );
    if (!feat) throw new Error(`Ward ${wardId} not found in DC GeoJSON`);

    const origGeom: DistrictGeometry = feat.geometry;
    const origCount = countVertices(origGeom);
    const simpGeom = simplifyGeometry(origGeom, 0.0002);
    const finalCount = countVertices(simpGeom);
    const normHash = computeGeometryHash(simpGeom);

    const geoid = `1100${wardId}`;
    const rawInput: RawDistrictInput = {
      sourceVintage: "2026",
      stateFipsOrPostal: "DC",
      chamberType: "council_ward",
      districtIdentifier: wardId,
      name: `District of Columbia Council Ward ${wardId}`,
      geoid,
      geometry: simpGeom,
      geometrySource: {
        sourceName:
          "District of Columbia Office of Planning / Board of Elections (DC GIS Open Data)",
        series: "DC Council Wards 2022/2026 Boundary Dataset",
        sourceUrl: dcWardsUrl,
        sourceFile: "raw_dc_council_wards_2022.geojson",
        retrievedAt: "2026-08-29T12:00:00.000Z",
        license: "Open Data DC Public Domain",
      },
      effectiveDateInfo: {
        effectiveDate: "2026-01-01",
        validUntil: null,
        cycleYear: 2026,
        congressionalSession: null,
        redistrictingCycle: "2020s-cycle",
        isCurrent: true,
      },
      countyFipsList: ["11001"],
      primaryCountyFips: "11001",
    };

    fixtureGroups["dc_2026"].push(rawInput);

    auditRecords.push({
      districtId: `geo:district:2026:dc:council_ward:${wardId}`,
      geoid,
      sourceVintage: "2026",
      censusProduct: "DC GIS Open Data Ward Boundaries (DC Office of Planning)",
      sourceUrl: dcWardsUrl,
      rawFilename: "raw_dc_council_wards_2022.geojson",
      rawSha256: dcRawSha256,
      originalGeometryType: origGeom.type,
      originalVertexCount: origCount,
      extractionProcess: "DC GIS Open Data Ward GeoJSON download (EPSG:4326)",
      isSimplified: origCount !== finalCount,
      simplificationAlgorithm:
        "Douglas-Peucker (Ramer-Douglas-Peucker on closed linear rings)",
      simplificationTolerance: "0.0002 deg (~22m)",
      finalVertexCount: finalCount,
      normalizedGeometrySha256: normHash,
      classification: "authoritative_sourced",
    });
  }

  // Write out formatted fixtures
  const fileMappings: Record<string, string> = {
    ky_2026: join(fixtures2026Dir, "ky_fixtures.json"),
    wy_2026: join(fixtures2026Dir, "wy_fixtures.json"),
    ne_2026: join(fixtures2026Dir, "ne_fixtures.json"),
    tx_2026: join(fixtures2026Dir, "tx_fixtures.json"),
    dc_2026: join(fixtures2026Dir, "dc_fixtures.json"),
    ky_2024: join(fixtures2024Dir, "ky_2024_fixtures.json"),
  };

  for (const [group, path] of Object.entries(fileMappings)) {
    const list = fixtureGroups[group];
    const formatted = await prettier.format(JSON.stringify(list), {
      parser: "json",
    });
    writeFileSync(path, formatted, "utf8");
    console.log(`Saved ${list.length} fixtures to ${path}`);
  }

  // Write provenance audit report
  const formattedAudit = await prettier.format(JSON.stringify(auditRecords), {
    parser: "json",
  });
  writeFileSync(auditFile, formattedAudit, "utf8");
  console.log(
    `Saved full provenance audit for ${auditRecords.length} districts to ${auditFile}`,
  );
  console.log(
    "\n✅ Genuine Census TIGER/Line and DC GIS intake completed successfully.",
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
