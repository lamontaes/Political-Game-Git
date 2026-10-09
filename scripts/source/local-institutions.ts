/** Compile place-addressed official institution names for the game. */
import { createHash } from "node:crypto";
import {
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  writeFileSync,
} from "node:fs";
import { createInterface } from "node:readline";
import { Readable } from "node:stream";
import { createInflateRaw } from "node:zlib";
import { resolve } from "node:path";
import { NATIONAL_PLACES_ROWS } from "../../src/simulation/national-places.generated";
import {
  countyGeoidsForPlace,
  knownCountyGeoids,
} from "../../src/simulation/government-units";
import { TERRITORY_PLACE_ROWS } from "../../src/simulation/territory-places";
import { readShapefileArchive } from "../maps/shapefile";
import {
  listZipMembers,
  openCachedProductionArtifacts,
  openProductionArtifacts,
  parseDelimited,
  readZipMember,
} from "../../src/source/core/index";
import type { ArtifactLock } from "../../src/source/core/index";
import type {
  HospitalRow,
  HospitalTuple,
  InstitutionMatchMethod,
  LocalInstitutionRow,
  LocalInstitutionSet,
  LocalInstitutionsCorpus,
  PublicSchoolRow,
  SchoolTuple,
  StateInstitutionsFile,
} from "../../src/simulation/local-institutions-data";
import {
  HOSPITAL_COLUMNS,
  SCHOOL_COLUMNS,
} from "../../src/simulation/local-institutions-data";
import type { HospitalRecord } from "../../src/source/domains/hospitals/types";
import {
  HOSPITALS_AS_OF,
  HOSPITAL_GENERAL_ARTIFACT,
  HOSPITAL_POS_SLICE_ARTIFACT,
} from "../../src/source/domains/hospitals/acquisition";
import {
  CCD_MEMBERSHIP_ARTIFACT,
  CCD_PRIOR_DIRECTORY_ARTIFACT,
  EDGE_GEOCODE_ARTIFACT,
  PLACE_BOUNDARY_ARTIFACT,
} from "../../src/source/domains/education/acquisition";

const ROOT = process.cwd();
const EDUCATION_DIR = resolve(ROOT, "public/education");
const OUT = resolve(ROOT, "data/research/places/local-institutions.json");
const AS_OF = "2025-06-30";
const CCD_ID = "ccd-2024-25-preliminary";
const CCD_SCHOOLS = "ccd_sch_029_2425_w_0a_051425.csv";
type MutableInstitutionSet = {
  -readonly [K in keyof LocalInstitutionSet]: LocalInstitutionRow[];
};
type MutableCountyInstitutionSet = {
  -readonly [K in keyof LocalInstitutionSet]?: LocalInstitutionRow[];
};

export interface LocalInstitutionPlaceInput {
  readonly geoid: string;
  readonly name: string;
  readonly state: string;
  readonly zipCodes?: readonly string[];
}
export interface LocalInstitutionEducationInput extends ReadonlyArray<unknown> {
  readonly 0: string;
  readonly 1: "school" | "district" | "postsecondary";
  readonly 2: string;
  readonly 3: string;
  readonly 4: string;
  readonly 6: string | null;
  readonly 7: string | null;
  readonly 8: string;
  readonly 12: readonly (readonly [string, string])[];
  readonly 14: string;
}
export interface LocalInstitutionSchoolSource {
  readonly level: string;
  readonly schoolType: string;
  readonly postalCode: string;
}

export function normalizeLocalName(value: string): string {
  return value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("en-US")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function blankSet(): MutableInstitutionSet {
  return {
    highSchools: [],
    districts: [],
    hospitals: [],
    banks: [],
    colleges: [],
    largeEmployers: [],
  };
}

function readEducationRows(): LocalInstitutionEducationInput[] {
  const manifest = JSON.parse(
    readFileSync(resolve(EDUCATION_DIR, "manifest.json"), "utf8"),
  ) as {
    chunks: {
      path: string;
      kind: string;
      sha256: string;
      recordCount: number;
    }[];
  };
  const rows: LocalInstitutionEducationInput[] = [];
  for (const chunk of manifest.chunks) {
    const bytes = readFileSync(resolve(EDUCATION_DIR, chunk.path));
    if (createHash("sha256").update(bytes).digest("hex") !== chunk.sha256)
      throw new Error(`Education catalog digest mismatch: ${chunk.path}`);
    const payload = JSON.parse(bytes.toString("utf8")) as {
      records: LocalInstitutionEducationInput[];
    };
    if (payload.records.length !== chunk.recordCount)
      throw new Error(`Education catalog row-count mismatch: ${chunk.path}`);
    rows.push(...payload.records);
  }
  return rows;
}

function readCcdSchoolSource(): ReadonlyMap<
  string,
  LocalInstitutionSchoolSource
> {
  const lock = JSON.parse(
    readFileSync(
      resolve(ROOT, "data/source/education/artifact-lock.json"),
      "utf8",
    ),
  ) as ArtifactLock;
  const input = openProductionArtifacts("education", lock, { ccd: CCD_ID });
  const parsed = parseDelimited(
    readZipMember(input.artifacts.ccd.bytes, CCD_SCHOOLS),
    {
      delimiter: ",",
      hasHeaderRow: true,
      trimFields: true,
    },
  );
  if (!parsed.header || parsed.defects.length)
    throw new Error(
      `Invalid locked CCD school directory: ${JSON.stringify(parsed.defects[0])}`,
    );
  const columns = new Map(
    parsed.header.map((header, index) => [header, index]),
  );
  for (const required of ["NCESSCH", "SCH_TYPE", "LEVEL", "LZIP"])
    if (!columns.has(required))
      throw new Error(`CCD school directory missing ${required}`);
  const source = new Map<string, LocalInstitutionSchoolSource>();
  for (const row of parsed.rows) {
    const field = (name: string) => row.fields[columns.get(name)!] ?? "";
    const id = field("NCESSCH");
    if (!id) continue;
    source.set(id, {
      level: field("LEVEL"),
      schoolType: field("SCH_TYPE"),
      postalCode: field("LZIP"),
    });
  }
  return source;
}

function institutionRow(
  row: LocalInstitutionEducationInput,
): LocalInstitutionRow {
  const institutionId = row[0].slice(row[0].indexOf(":") + 1);
  return {
    name: row[2],
    kind:
      row[1] === "school"
        ? "high-school"
        : row[1] === "district"
          ? "school-district"
          : "college",
    sourceKey: row[1] === "postsecondary" ? "IPEDS" : "NCES-CCD",
    sourceId: institutionId,
    asOf: row[1] === "postsecondary" ? `${row[14].slice(0, 4)}-06-30` : AS_OF,
    ...(row[1] === "school" || row[1] === "district"
      ? { historicalNameEstimated: true as const }
      : {}),
  };
}

/** Build the deterministic place and county index from already compiled source rows. */
export function compileLocalInstitutions(
  places: readonly LocalInstitutionPlaceInput[],
  educationRows: readonly LocalInstitutionEducationInput[],
  schoolSource?: ReadonlyMap<string, LocalInstitutionSchoolSource>,
): LocalInstitutionsCorpus {
  const candidates = new Map<string, LocalInstitutionPlaceInput[]>();
  for (const place of places) {
    const key = `${place.state}:${normalizeLocalName(place.name)}`;
    const rows = candidates.get(key) ?? [];
    rows.push(place);
    candidates.set(key, rows);
  }

  const byPlace = new Map<string, MutableInstitutionSet>();
  const counties: Record<string, MutableCountyInstitutionSet> = {};
  const ensurePlace = (geoid: string) => {
    let found = byPlace.get(geoid);
    if (!found) {
      found = blankSet();
      byPlace.set(geoid, found);
    }
    return found;
  };
  for (const place of places) ensurePlace(place.geoid);
  const ensureCounty = (geoid: string) => {
    return (counties[geoid] ??= {});
  };
  const sourceRows = [...educationRows].sort((a, b) =>
    String(a[0]).localeCompare(String(b[0])),
  );
  const highSchoolsByDistrict = new Map<string, LocalInstitutionRow[]>();
  const activeDistrictsByCity = new Map<string, LocalInstitutionRow[]>();
  for (const row of sourceRows) {
    const active =
      row[1] === "postsecondary"
        ? ["A", "N", "R"].includes(row[8])
        : row[8] === "1";
    if (!active || row[4].length !== 2) continue;
    const official = institutionRow(row);
    const targetKey =
      row[1] === "school"
        ? "highSchools"
        : row[1] === "district"
          ? "districts"
          : "colleges";
    if (row[1] === "school") {
      const source = schoolSource?.get(official.sourceId);
      if (
        schoolSource &&
        (!source || source.level !== "High" || source.schoolType !== "1")
      )
        continue;
      const grades = row[12];
      if (
        !grades.some(
          ([code, value]) => code === "G_12_OFFERED" && value === "Yes",
        )
      )
        continue;
      const districtId = row[7];
      if (districtId) {
        const districtSchools = highSchoolsByDistrict.get(districtId) ?? [];
        districtSchools.push(official);
        highSchoolsByDistrict.set(districtId, districtSchools);
      }
    }
    let placeMatches =
      candidates.get(`${row[4]}:${normalizeLocalName(row[3])}`) ?? [];
    if (placeMatches.length > 1) {
      const postalCode = schoolSource?.get(official.sourceId)?.postalCode;
      const zipMatches = placeMatches.filter((place) =>
        postalCode ? place.zipCodes?.includes(postalCode) : false,
      );
      if (zipMatches.length === 1) placeMatches = zipMatches;
    }
    // Repeated city names are not joined speculatively. If an institution row
    // carries a county GEOID, retain it as county fallback instead.
    const countyGeoid = row[6];
    if (placeMatches.length === 1) {
      const found = ensurePlace(placeMatches[0]!.geoid);
      (found[targetKey] as LocalInstitutionRow[]).push(official);
      if (targetKey === "districts") {
        found.largeEmployers.push(official);
        const districts =
          activeDistrictsByCity.get(placeMatches[0]!.geoid) ?? [];
        districts.push(official);
        activeDistrictsByCity.set(placeMatches[0]!.geoid, districts);
      }
      if (targetKey === "colleges") found.largeEmployers.push(official);
    } else if (countyGeoid && /^\d{5}$/.test(countyGeoid)) {
      const found = ensureCounty(countyGeoid);
      const rows = (found[targetKey] ??= []);
      (rows as LocalInstitutionRow[]).push(official);
      if (targetKey === "districts" || targetKey === "colleges") {
        const employers = (found.largeEmployers ??= []);
        (employers as LocalInstitutionRow[]).push(official);
      }
    }
  }

  // A place without a school of its own still knows its district's high
  // schools. The directory links each school to its LEA; the city join above
  // gives the place its LEA row, so expand the district's real schools here.
  for (const [geoid, districts] of activeDistrictsByCity) {
    const schoolRows = byPlace.get(geoid)!.highSchools;
    const seen = new Set(schoolRows.map((row) => row.sourceId));
    for (const district of districts) {
      const districtId = `nces-lea:${district.sourceId}`;
      for (const school of highSchoolsByDistrict.get(districtId) ?? []) {
        if (!seen.has(school.sourceId)) {
          schoolRows.push(school);
          seen.add(school.sourceId);
        }
      }
    }
  }

  for (const set of byPlace.values()) deduplicateSets(set);
  for (const set of Object.values(counties)) deduplicateCountySet(set);

  return {
    asOf: AS_OF,
    places: Object.fromEntries(
      [...byPlace.entries()]
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([geoid, set]) => [
          geoid,
          Object.fromEntries(
            Object.entries(set).map(([key, rows]) => [
              key,
              [...rows].sort((a, b) => a.sourceId.localeCompare(b.sourceId)),
            ]),
          ),
        ]),
    ) as unknown as LocalInstitutionsCorpus["places"],
    counties: Object.fromEntries(
      Object.entries(counties)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([geoid, set]) => [
          geoid,
          Object.fromEntries(
            Object.entries(set).map(([key, rows]) => [
              key,
              [...(rows ?? [])].sort((a, b) =>
                a.sourceId.localeCompare(b.sourceId),
              ),
            ]),
          ),
        ]),
    ) as unknown as LocalInstitutionsCorpus["counties"],
  };
}

function deduplicateRows(rows: LocalInstitutionRow[]): LocalInstitutionRow[] {
  const byIdentity = new Map<string, LocalInstitutionRow>();
  for (const row of rows) {
    const key = `${row.sourceKey}:${row.sourceId}`;
    const previous = byIdentity.get(key);
    if (!previous || row.asOf > previous.asOf) byIdentity.set(key, row);
  }
  return [...byIdentity.values()].sort((a, b) =>
    a.sourceId.localeCompare(b.sourceId),
  );
}

function deduplicateSets(set: MutableInstitutionSet): void {
  for (const key of Object.keys(set) as (keyof LocalInstitutionSet)[])
    set[key] = deduplicateRows(set[key]);
}

function deduplicateCountySet(set: MutableCountyInstitutionSet): void {
  for (const key of Object.keys(set) as (keyof LocalInstitutionSet)[])
    if (set[key]) set[key] = deduplicateRows(set[key]!);
}

/* ------------------------------------------------------------------ */
/* Public schools at every grade (NCES CCD 2024-25 + EDGE geocodes)     */
/* ------------------------------------------------------------------ */

/** The newest school membership NCES has published (2024-25 is not out). */
const MEMBERSHIP_YEAR = "2023-24";
/** CCD statuses of schools that are operating; the rest are dropped with a reason. */
const OPERATING_STATUSES: ReadonlySet<string> = new Set([
  "Open",
  "New",
  "Added",
  "Reopened",
  "Changed Boundary/Agency",
]);

type SchoolMatchMethod = InstitutionMatchMethod;

/** One school as the CCD directory publishes it. */
/**
 * Lets a name match be checked against the record's own county: a place whose
 * counties leave out the record's county is not where the record is.
 */
export interface CountyConsistency {
  readonly countiesOfPlace: (placeGeoid: string) => readonly string[];
  /** Only a county the place crosswalk knows can contradict a place. */
  readonly isKnownCounty: (countyGeoid: string) => boolean;
}

const contradicts = (
  consistency: CountyConsistency | undefined,
  placeGeoid: string,
  countyGeoid: string | null | undefined,
): boolean => {
  if (!consistency || !countyGeoid || !consistency.isKnownCounty(countyGeoid))
    return false;
  const counties = consistency.countiesOfPlace(placeGeoid);
  return counties.length > 0 && !counties.includes(countyGeoid);
};

export interface PublicSchoolInput {
  readonly id: string;
  readonly name: string;
  readonly status: string;
  readonly level: string;
  readonly lowestGrade: string;
  readonly highestGrade: string;
  readonly city: string;
  readonly state: string;
  readonly zip: string;
  /** A Census place GEOID, when the source carries one. */
  readonly placeGeoid?: string;
  /** The directory release this row comes from, when not the 2024-25 one. */
  readonly asOf?: string;
}

/** Where EDGE puts a school. */
export interface SchoolGeocode {
  readonly lat: number;
  readonly lon: number;
  readonly countyGeoid: string;
  readonly state: string;
}

/** A Census place outline, packed [lon, lat, ...] per ring. */
export interface PlaceShape {
  readonly geoid: string;
  readonly state: string;
  readonly rings: readonly Float64Array[];
}

export interface PublicSchoolCompilation {
  readonly places: Record<string, PublicSchoolRow[]>;
  readonly counties: Record<string, PublicSchoolRow[]>;
  /** Source schools by state, matched rows by state, and the reasons rows were dropped. */
  readonly perState: Record<
    string,
    {
      readonly source: number;
      readonly kept: number;
      readonly dropped: Record<string, number>;
    }
  >;
  readonly dropped: Record<string, number>;
  /** Schools that matched no place and had no county, by NCES id. */
  readonly unplaced: readonly string[];
  readonly matchMethods: Record<SchoolMatchMethod, number>;
  /** City-name matches whose point sits inside a different place's outline. */
  readonly cityNameDisagreements: number;
  /** EDGE rows whose county lies in another state than the school's own. */
  readonly ignoredGeocodes: number;
  /** Name matches set aside because the place lies in another county than the school. */
  readonly countyContradictions: number;
}

/** Is the point inside the rings (even-odd, so holes and islands work)? */
export function pointInRings(
  lon: number,
  lat: number,
  rings: readonly Float64Array[],
): boolean {
  let inside = false;
  for (const ring of rings) {
    for (let i = 0, j = ring.length - 2; i < ring.length; j = i, i += 2) {
      const xi = ring[i]!;
      const yi = ring[i + 1]!;
      const xj = ring[j]!;
      const yj = ring[j + 1]!;
      if (
        yi > lat !== yj > lat &&
        lon < ((xj - xi) * (lat - yi)) / (yj - yi) + xi
      ) {
        inside = !inside;
      }
    }
  }
  return inside;
}

interface IndexedShape {
  readonly shape: PlaceShape;
  readonly box: readonly [number, number, number, number];
  readonly area: number;
}

function indexShapes(
  shapes: readonly PlaceShape[],
): ReadonlyMap<string, readonly IndexedShape[]> {
  const byState = new Map<string, IndexedShape[]>();
  for (const shape of shapes) {
    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;
    for (const ring of shape.rings) {
      for (let i = 0; i < ring.length; i += 2) {
        minX = Math.min(minX, ring[i]!);
        maxX = Math.max(maxX, ring[i]!);
        minY = Math.min(minY, ring[i + 1]!);
        maxY = Math.max(maxY, ring[i + 1]!);
      }
    }
    const list = byState.get(shape.state) ?? [];
    list.push({
      shape,
      box: [minX, minY, maxX, maxY],
      area: (maxX - minX) * (maxY - minY),
    });
    byState.set(shape.state, list);
  }
  return byState;
}

/** The place whose outline holds the point; the smallest when outlines nest. */
function placeContaining(
  shapes: readonly IndexedShape[] | undefined,
  lon: number,
  lat: number,
): string | null {
  let best: IndexedShape | null = null;
  for (const candidate of shapes ?? []) {
    const [minX, minY, maxX, maxY] = candidate.box;
    if (lon < minX || lon > maxX || lat < minY || lat > maxY) continue;
    if (!pointInRings(lon, lat, candidate.shape.rings)) continue;
    if (
      !best ||
      candidate.area < best.area ||
      (candidate.area === best.area && candidate.shape.geoid < best.shape.geoid)
    )
      best = candidate;
  }
  return best ? best.shape.geoid : null;
}

function median(values: readonly number[]): number {
  const sorted = [...values].sort((a, b) => a - b);
  const middle = (sorted.length - 1) / 2;
  return Math.round(
    (sorted[Math.floor(middle)]! + sorted[Math.ceil(middle)]!) / 2,
  );
}

const levelKind = (level: string): string =>
  level
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-") || "not-reported";

/**
 * Match every operating public school to a place, falling back to its county.
 * Order: a place code the source carries, then city name within the state
 * (ties broken by ZIP), then the outline the school's coordinates fall in,
 * then the county. Nothing is dropped except non-operating schools, counted
 * by reason.
 */
export function compilePublicSchools(input: {
  readonly places: readonly LocalInstitutionPlaceInput[];
  readonly shapes: readonly PlaceShape[];
  readonly schools: readonly PublicSchoolInput[];
  readonly geocodes: ReadonlyMap<string, SchoolGeocode>;
  readonly membership: ReadonlyMap<string, number>;
  readonly consistency?: CountyConsistency;
}): PublicSchoolCompilation {
  const stateByFips = fipsPrefixStates(input.places, input.geocodes);
  const byName = new Map<string, LocalInstitutionPlaceInput[]>();
  const placeIds = new Set<string>();
  for (const place of input.places) {
    placeIds.add(place.geoid);
    const key = `${place.state}:${normalizeLocalName(place.name)}`;
    const rows = byName.get(key) ?? [];
    rows.push(place);
    byName.set(key, rows);
  }
  const shapesByState = indexShapes(input.shapes);

  const dropped: Record<string, number> = {};
  const perState: Record<
    string,
    { source: number; kept: number; dropped: Record<string, number> }
  > = {};
  const unplaced: string[] = [];
  const matchMethods: Record<SchoolMatchMethod, number> = {
    "place-code": 0,
    "city-name": 0,
    zip: 0,
    "point-in-boundary": 0,
    county: 0,
  };
  let cityNameDisagreements = 0;
  let ignoredGeocodes = 0;
  let countyContradictions = 0;

  interface Pending {
    readonly school: PublicSchoolInput;
    readonly state: string;
    readonly geoid: string;
    readonly geoidKind: "place" | "county";
    readonly method: SchoolMatchMethod;
  }
  const pending: Pending[] = [];
  const ordered = [...input.schools].sort((a, b) => a.id.localeCompare(b.id));
  for (const school of ordered) {
    const published = input.geocodes.get(school.id);
    // A geocode whose county belongs to another state than the school's own
    // is a bad row (EDGE has a handful); the directory's state wins.
    const geocode =
      published &&
      (!school.state ||
        stateByFips.get(published.countyGeoid.slice(0, 2)) === school.state)
        ? published
        : undefined;
    if (published && !geocode) ignoredGeocodes += 1;
    const state = school.state || geocode?.state || "";
    const tally = (perState[state] ??= { source: 0, kept: 0, dropped: {} });
    tally.source += 1;
    const drop = (reason: string) => {
      dropped[reason] = (dropped[reason] ?? 0) + 1;
      tally.dropped[reason] = (tally.dropped[reason] ?? 0) + 1;
    };
    if (!OPERATING_STATUSES.has(school.status)) {
      drop(`not operating: ${school.status}`);
      continue;
    }

    let geoid: string | null = null;
    let method: SchoolMatchMethod | null = null;
    const hasPoint =
      geocode !== undefined &&
      Number.isFinite(geocode.lat) &&
      Number.isFinite(geocode.lon);
    const pointPlace = hasPoint
      ? placeContaining(shapesByState.get(state), geocode.lon, geocode.lat)
      : null;

    if (school.placeGeoid && placeIds.has(school.placeGeoid)) {
      geoid = school.placeGeoid;
      method = "place-code";
    } else {
      let matches =
        byName.get(`${state}:${normalizeLocalName(school.city)}`) ?? [];
      let byZip = false;
      if (matches.length > 1) {
        const zipMatches = matches.filter((place) =>
          school.zip ? place.zipCodes?.includes(school.zip) : false,
        );
        if (zipMatches.length === 1) {
          matches = zipMatches;
          byZip = true;
        }
      }
      if (
        matches.length === 1 &&
        contradicts(input.consistency, matches[0]!.geoid, geocode?.countyGeoid)
      ) {
        // The name names a place in another county than the school's own.
        countyContradictions += 1;
        matches = [];
      }
      if (matches.length === 1) {
        geoid = matches[0]!.geoid;
        method = byZip ? "zip" : "city-name";
        if (pointPlace && pointPlace !== geoid) cityNameDisagreements += 1;
      } else if (pointPlace && placeIds.has(pointPlace)) {
        geoid = pointPlace;
        method = "point-in-boundary";
      }
    }
    if (geoid) {
      pending.push({
        school,
        state,
        geoid,
        geoidKind: "place",
        method: method!,
      });
    } else if (geocode && /^\d{5}$/.test(geocode.countyGeoid)) {
      pending.push({
        school,
        state,
        geoid: geocode.countyGeoid,
        geoidKind: "county",
        method: "county",
      });
    } else {
      drop("no place, no county");
      unplaced.push(school.id);
    }
  }

  // Enrollment: the CCD membership where the school appears in it, else the
  // median of the same state and level (then the same level nationally).
  const byStateLevel = new Map<string, number[]>();
  const byLevel = new Map<string, number[]>();
  for (const { school, state } of pending) {
    const count = input.membership.get(school.id);
    if (count === undefined) continue;
    const kind = levelKind(school.level);
    for (const [map, key] of [
      [byStateLevel, `${state}:${kind}`],
      [byLevel, kind],
    ] as const) {
      const list = map.get(key) ?? [];
      list.push(count);
      map.set(key, list);
    }
  }

  const places: Record<string, PublicSchoolRow[]> = {};
  const counties: Record<string, PublicSchoolRow[]> = {};
  for (const { school, state, geoid, geoidKind, method } of pending) {
    const kind = levelKind(school.level);
    const reported = input.membership.get(school.id);
    const pool =
      byStateLevel.get(`${state}:${kind}`) ?? byLevel.get(kind) ?? [];
    const row: PublicSchoolRow = {
      sourceKey: "NCES-CCD",
      sourceId: school.id,
      name: school.name,
      kind,
      geoid,
      geoidKind,
      matchMethod: method,
      lowestGrade: school.lowestGrade,
      highestGrade: school.highestGrade,
      enrollment: reported ?? (pool.length > 0 ? median(pool) : 0),
      enrollmentBasis: reported === undefined ? "estimated" : "reported",
      status: school.status,
      asOf: school.asOf ?? AS_OF,
    };
    (geoidKind === "place" ? places : counties)[geoid] ??= [];
    (geoidKind === "place" ? places : counties)[geoid]!.push(row);
    matchMethods[method] += 1;
    perState[state]!.kept += 1;
  }
  return {
    places,
    counties,
    perState,
    dropped,
    unplaced,
    matchMethods,
    cityNameDisagreements,
    ignoredGeocodes,
    countyContradictions,
  };
}

/* ---- readers for the locked source files ---- */

function lockedEducation(roles: Record<string, string>) {
  const lock = JSON.parse(
    readFileSync(
      resolve(ROOT, "data/source/education/artifact-lock.json"),
      "utf8",
    ),
  ) as ArtifactLock;
  return openProductionArtifacts("education", lock, roles);
}

/** Open large locked files from the ignored source cache, verifying their digest. */
function cachedEducation(roles: Record<string, string>) {
  const lock = JSON.parse(
    readFileSync(
      resolve(ROOT, "data/source/education/artifact-lock.json"),
      "utf8",
    ),
  ) as ArtifactLock;
  return openCachedProductionArtifacts(
    "education",
    lock,
    Object.fromEntries(
      Object.entries(roles).map(([role, artifactId]) => [
        role,
        { artifactId, cachePath: `.source-cache/education/${artifactId}.zip` },
      ]),
    ),
  );
}

function parseCcdSchools(
  bytes: Buffer,
  member: string,
  asOf?: string,
): PublicSchoolInput[] {
  const parsed = parseDelimited(readZipMember(bytes, member), {
    delimiter: ",",
    hasHeaderRow: true,
    trimFields: true,
  });
  if (!parsed.header || parsed.defects.length)
    throw new Error(
      `Invalid locked CCD school directory ${member}: ${JSON.stringify(parsed.defects[0])}`,
    );
  const columns = new Map(parsed.header.map((name, index) => [name, index]));
  for (const required of [
    "NCESSCH",
    "SCH_NAME",
    "SY_STATUS_TEXT",
    "LEVEL",
    "GSLO",
    "GSHI",
    "LCITY",
    "LSTATE",
    "ST",
    "LZIP",
  ])
    if (!columns.has(required))
      throw new Error(`CCD school directory ${member} missing ${required}`);
  const schools: PublicSchoolInput[] = [];
  for (const row of parsed.rows) {
    const field = (name: string) => row.fields[columns.get(name)!] ?? "";
    const id = field("NCESSCH");
    if (!id) continue;
    schools.push({
      id,
      name: field("SCH_NAME"),
      status: field("SY_STATUS_TEXT"),
      level: field("LEVEL"),
      lowestGrade: field("GSLO"),
      highestGrade: field("GSHI"),
      city: field("LCITY"),
      // BIE schools are filed under "BI"; the physical state is LSTATE.
      state: field("LSTATE") || field("ST"),
      zip: field("LZIP"),
      ...(asOf ? { asOf } : {}),
    });
  }
  return schools;
}

/** The 2023-24 directory v1a data release date. */
const PRIOR_DIRECTORY_AS_OF = "2024-07-31";
const PRIOR_DIRECTORY_MEMBER = "ccd_sch_029_2324_w_1a_073124.csv";

/**
 * Every school in the 2024-25 preliminary directory. That file carries no row
 * for Alaska or Rhode Island (its Alaska submission is limited and Rhode Island
 * is absent), so those states take their schools from the 2023-24 directory,
 * kept only where EDGE still locates the school in 2024-25.
 */
export function readCcdPublicSchools(
  geocodes: ReadonlyMap<string, SchoolGeocode>,
): { schools: PublicSchoolInput[]; priorDirectoryStates: string[] } {
  const current = parseCcdSchools(
    lockedEducation({ ccd: CCD_ID }).artifacts.ccd.bytes,
    CCD_SCHOOLS,
  );
  const present = new Set(current.map((school) => school.state));
  const prior = parseCcdSchools(
    cachedEducation({ prior: CCD_PRIOR_DIRECTORY_ARTIFACT }).artifacts.prior
      .bytes,
    PRIOR_DIRECTORY_MEMBER,
    PRIOR_DIRECTORY_AS_OF,
  ).filter((school) => !present.has(school.state) && geocodes.has(school.id));
  return {
    schools: [...current, ...prior],
    priorDirectoryStates: [...new Set(prior.map((s) => s.state))].sort(),
  };
}

/** EDGE public school geocodes: pipe-delimited, no header row. */
export function readEdgeGeocodes(): Map<string, SchoolGeocode> {
  const input = cachedEducation({ edge: EDGE_GEOCODE_ARTIFACT });
  const text = readZipMember(
    input.artifacts.edge.bytes,
    "EDGE_GEOCODE_PUBLICSCH_2425.TXT",
  ).toString("utf8");
  const geocodes = new Map<string, SchoolGeocode>();
  for (const line of text.split(/\r?\n/)) {
    if (!line) continue;
    const f = line.split("|");
    if (f.length < 14 || !/^\d{12}$/.test(f[0]!)) continue;
    geocodes.set(f[0]!, {
      state: f[6]!,
      countyGeoid: f[9]!,
      lat: Number(f[12]),
      lon: Number(f[13]),
    });
  }
  return geocodes;
}

export function readPlaceShapes(): PlaceShape[] {
  const input = cachedEducation({ boundary: PLACE_BOUNDARY_ARTIFACT });
  return readShapefileArchive(input.artifacts.boundary.bytes).records.map(
    (record) => ({
      geoid: record.attributes.GEOID!,
      state: record.attributes.STUSPS!,
      rings: record.rings,
    }),
  );
}

/* ------------------------------------------------------------------ */
/* Hospitals (CMS Hospital General Information + Provider of Services)  */
/* ------------------------------------------------------------------ */

/** One hospital as CMS publishes it, with its certified beds when the POS file has it. */
export interface HospitalInput {
  readonly ccn: string;
  readonly name: string;
  readonly city: string;
  readonly state: string;
  readonly zip: string;
  readonly hospitalType: string;
  /** Five-digit county GEOID from the POS file's FIPS codes, when it lists the hospital. */
  readonly countyGeoid: string | null;
  readonly beds: number | null;
  /** A Census place GEOID, when the source carries one. */
  readonly placeGeoid?: string;
}

export interface HospitalCompilation {
  readonly places: Record<string, HospitalRow[]>;
  readonly counties: Record<string, HospitalRow[]>;
  readonly perState: Record<
    string,
    { readonly source: number; readonly kept: number }
  >;
  readonly dropped: Record<string, number>;
  readonly matchMethods: Record<InstitutionMatchMethod, number>;
  /** Name matches set aside because the place lies in another county than the hospital. */
  readonly countyContradictions: number;
}

/**
 * Match every CMS hospital to a place (city name within the state, ties broken
 * by ZIP), falling back to the county the POS file gives it. Beds come from the
 * POS file; a hospital it does not list gets the median of its state and type,
 * marked estimated.
 */
export function compileHospitals(input: {
  readonly places: readonly LocalInstitutionPlaceInput[];
  readonly hospitals: readonly HospitalInput[];
  readonly asOf: string;
  readonly consistency?: CountyConsistency;
}): HospitalCompilation {
  const byName = new Map<string, LocalInstitutionPlaceInput[]>();
  const placeIds = new Set<string>();
  for (const place of input.places) {
    placeIds.add(place.geoid);
    const key = `${place.state}:${normalizeLocalName(place.name)}`;
    const rows = byName.get(key) ?? [];
    rows.push(place);
    byName.set(key, rows);
  }
  const bedsByStateType = new Map<string, number[]>();
  const bedsByType = new Map<string, number[]>();
  for (const hospital of input.hospitals) {
    if (hospital.beds === null) continue;
    for (const [map, key] of [
      [bedsByStateType, `${hospital.state}:${hospital.hospitalType}`],
      [bedsByType, hospital.hospitalType],
    ] as const) {
      const list = map.get(key) ?? [];
      list.push(hospital.beds);
      map.set(key, list);
    }
  }

  const places: Record<string, HospitalRow[]> = {};
  const counties: Record<string, HospitalRow[]> = {};
  let countyContradictions = 0;
  const perState: Record<string, { source: number; kept: number }> = {};
  const dropped: Record<string, number> = {};
  const matchMethods: Record<InstitutionMatchMethod, number> = {
    "place-code": 0,
    "city-name": 0,
    zip: 0,
    "point-in-boundary": 0,
    county: 0,
  };
  const ordered = [...input.hospitals].sort((a, b) =>
    a.ccn.localeCompare(b.ccn),
  );
  for (const hospital of ordered) {
    const tally = (perState[hospital.state] ??= { source: 0, kept: 0 });
    tally.source += 1;
    let geoid: string | null = null;
    let method: InstitutionMatchMethod | null = null;
    if (hospital.placeGeoid && placeIds.has(hospital.placeGeoid)) {
      geoid = hospital.placeGeoid;
      method = "place-code";
    } else {
      let matches =
        byName.get(`${hospital.state}:${normalizeLocalName(hospital.city)}`) ??
        [];
      let byZip = false;
      if (matches.length > 1) {
        const zipMatches = matches.filter((place) =>
          hospital.zip ? place.zipCodes?.includes(hospital.zip) : false,
        );
        if (zipMatches.length === 1) {
          matches = zipMatches;
          byZip = true;
        }
      }
      if (
        matches.length === 1 &&
        contradicts(input.consistency, matches[0]!.geoid, hospital.countyGeoid)
      ) {
        countyContradictions += 1;
        matches = [];
      }
      if (matches.length === 1) {
        geoid = matches[0]!.geoid;
        method = byZip ? "zip" : "city-name";
      }
    }
    const geoidKind: "place" | "county" = geoid ? "place" : "county";
    if (!geoid) {
      if (hospital.countyGeoid && /^\d{5}$/.test(hospital.countyGeoid)) {
        geoid = hospital.countyGeoid;
        method = "county";
      } else {
        dropped["no place, no county"] =
          (dropped["no place, no county"] ?? 0) + 1;
        continue;
      }
    }
    const pool =
      bedsByStateType.get(`${hospital.state}:${hospital.hospitalType}`) ??
      bedsByType.get(hospital.hospitalType) ??
      [];
    const row: HospitalRow = {
      sourceKey: "CMS-HOSPITAL",
      sourceId: hospital.ccn,
      name: hospital.name,
      kind: "hospital",
      geoid,
      geoidKind,
      matchMethod: method!,
      hospitalType: hospital.hospitalType,
      beds: hospital.beds ?? (pool.length > 0 ? median(pool) : 0),
      bedsBasis: hospital.beds === null ? "estimated" : "reported",
      asOf: input.asOf,
    };
    const target = geoidKind === "place" ? places : counties;
    (target[geoid] ??= []).push(row);
    matchMethods[method!] += 1;
    tally.kept += 1;
  }
  return {
    places,
    counties,
    perState,
    dropped,
    matchMethods,
    countyContradictions,
  };
}

/** The compiled hospitals corpus, with a county GEOID for rows the POS file lacks. */
export function readHospitalInputs(): HospitalInput[] {
  const records = JSON.parse(
    readFileSync(resolve(ROOT, "data/source/hospitals/corpus.json"), "utf8"),
  ) as HospitalRecord[];
  const counties = JSON.parse(
    readFileSync(resolve(ROOT, "data/source/counties/corpus.json"), "utf8"),
  ) as { geoid: string; displayName: string; stateUsps: string }[];
  const countyByName = new Map<string, string[]>();
  for (const county of counties) {
    const key = `${county.stateUsps}:${normalizeLocalName(county.displayName)}`;
    countyByName.set(key, [...(countyByName.get(key) ?? []), county.geoid]);
  }
  return records.map((record) => {
    const named = countyByName.get(
      `${record.state}:${normalizeLocalName(record.countyName)}`,
    );
    return {
      ccn: record.ccn,
      name: record.name,
      city: record.city,
      state: record.state,
      zip: record.zip,
      hospitalType: record.hospitalType,
      countyGeoid:
        record.countyGeoid ?? (named?.length === 1 ? named[0]! : null),
      beds: record.certifiedBeds,
    };
  });
}

/** Split one CSV line, honoring quotes; the membership file has quoted names. */
function splitCsvLine(line: string): string[] {
  const fields: string[] = [];
  let current = "";
  let quoted = false;
  for (let index = 0; index < line.length; index += 1) {
    const character = line[index]!;
    if (quoted) {
      if (character === '"') {
        if (line[index + 1] === '"') {
          current += '"';
          index += 1;
        } else quoted = false;
      } else current += character;
    } else if (character === '"') quoted = true;
    else if (character === ",") {
      fields.push(current);
      current = "";
    } else current += character;
  }
  fields.push(current);
  return fields;
}

const MEMBERSHIP_TOTAL =
  "Derived - Education Unit Total minus Adult Education Count";

/**
 * Total membership per school from the CCD school membership file. The file is
 * 2.3 GB uncompressed, so it is inflated as a stream and only the one total row
 * per school is parsed. A negative count is a CCD missing-data code, not a count.
 */
export async function readMembershipTotals(): Promise<Map<string, number>> {
  const input = cachedEducation({ membership: CCD_MEMBERSHIP_ARTIFACT });
  const archive = input.artifacts.membership.bytes;
  const member = listZipMembers(archive).find((entry) =>
    entry.path.endsWith(".csv"),
  );
  if (!member || member.method !== 8)
    throw new Error("The CCD membership archive has no deflated CSV member.");
  const header = archive.readUInt32LE(member.localHeaderOffset);
  if (header !== 0x04034b50) throw new Error("Bad ZIP local header.");
  const start =
    member.localHeaderOffset +
    30 +
    archive.readUInt16LE(member.localHeaderOffset + 26) +
    archive.readUInt16LE(member.localHeaderOffset + 28);
  const lines = createInterface({
    input: Readable.from([
      archive.subarray(start, start + member.compressedSize),
    ]).pipe(createInflateRaw()),
    crlfDelay: Infinity,
  });
  const totals = new Map<string, number>();
  let columns: Map<string, number> | null = null;
  for await (const line of lines) {
    if (!columns) {
      columns = new Map(splitCsvLine(line).map((name, i) => [name, i]));
      for (const required of ["NCESSCH", "STUDENT_COUNT", "TOTAL_INDICATOR"])
        if (!columns.has(required))
          throw new Error(`CCD membership missing ${required}`);
      continue;
    }
    if (!line.includes(MEMBERSHIP_TOTAL)) continue;
    const fields = splitCsvLine(line);
    if (fields[columns.get("TOTAL_INDICATOR")!] !== MEMBERSHIP_TOTAL) continue;
    const count = Number(fields[columns.get("STUDENT_COUNT")!]);
    if (Number.isInteger(count) && count >= 0)
      totals.set(fields[columns.get("NCESSCH")!]!, count);
  }
  return totals;
}

/* ---- per-state output ---- */

const STATE_DIR = resolve(ROOT, "data/research/places/local-institutions");
const STATE_MANIFEST = resolve(STATE_DIR, "manifest.json");

export interface StateInstitutionFiles {
  /** Serialized file text by USPS code, ready to write. */
  readonly files: ReadonlyMap<string, string>;
  readonly report: {
    readonly schools: Omit<PublicSchoolCompilation, "places" | "counties">;
    readonly hospitals: Omit<HospitalCompilation, "places" | "counties">;
    readonly statesWithNoSchools: readonly string[];
    readonly statesWithNoHospitals: readonly string[];
    readonly priorDirectoryStates: readonly string[];
    readonly inputs: readonly {
      domain: string;
      artifactId: string;
      sha256: string;
    }[];
  };
}

/**
 * The state each two-digit FIPS prefix belongs to. Places are authoritative;
 * a prefix no place carries (the island areas, whose places are placeholders)
 * takes the state most EDGE rows give it, because a handful of EDGE rows name
 * the wrong state.
 */
export function fipsPrefixStates(
  places: readonly LocalInstitutionPlaceInput[],
  geocodes: ReadonlyMap<string, SchoolGeocode>,
): ReadonlyMap<string, string> {
  const byFips = new Map<string, string>();
  for (const place of places) {
    if (/^\d{7}$/.test(place.geoid))
      byFips.set(place.geoid.slice(0, 2), place.state);
  }
  const votes = new Map<string, Map<string, number>>();
  for (const geocode of geocodes.values()) {
    if (!/^\d{5}$/.test(geocode.countyGeoid)) continue;
    const prefix = geocode.countyGeoid.slice(0, 2);
    if (byFips.has(prefix)) continue;
    const tally = votes.get(prefix) ?? new Map<string, number>();
    tally.set(geocode.state, (tally.get(geocode.state) ?? 0) + 1);
    votes.set(prefix, tally);
  }
  for (const [prefix, tally] of votes) {
    const [state] = [...tally].sort(
      (a, b) => b[1] - a[1] || a[0].localeCompare(b[0]),
    )[0]!;
    byFips.set(prefix, state);
  }
  return byFips;
}

function stateLookup(
  places: readonly LocalInstitutionPlaceInput[],
  geocodes: ReadonlyMap<string, SchoolGeocode>,
): (geoid: string) => string | null {
  const byFips = fipsPrefixStates(places, geocodes);
  return (geoid) => {
    if (geoid.startsWith("territory:")) return geoid.split(":")[1] ?? null;
    return byFips.get(geoid.slice(0, 2)) ?? null;
  };
}

const schoolTuple = (row: PublicSchoolRow, asOfs: string[]): SchoolTuple => {
  let asOf = asOfs.indexOf(row.asOf);
  if (asOf < 0) asOf = asOfs.push(row.asOf) - 1;
  return [
    row.sourceId,
    row.name,
    row.kind,
    row.matchMethod,
    row.lowestGrade,
    row.highestGrade,
    row.enrollment,
    row.enrollmentBasis,
    row.status,
    asOf,
  ];
};

const hospitalTuple = (row: HospitalRow): HospitalTuple => [
  row.sourceId,
  row.name,
  row.hospitalType,
  row.matchMethod,
  row.beds,
  row.bedsBasis,
];

export function buildStateFiles(input: {
  readonly places: readonly LocalInstitutionPlaceInput[];
  readonly schools: PublicSchoolCompilation;
  readonly hospitals: HospitalCompilation;
  readonly geocodes: ReadonlyMap<string, SchoolGeocode>;
}): Map<string, StateInstitutionsFile> {
  const stateOf = stateLookup(input.places, input.geocodes);
  const states = new Map<
    string,
    {
      asOfs: string[];
      schools: {
        places: Record<string, SchoolTuple[]>;
        counties: Record<string, SchoolTuple[]>;
      };
      hospitals: {
        places: Record<string, HospitalTuple[]>;
        counties: Record<string, HospitalTuple[]>;
      };
    }
  >();
  const stateFor = (geoid: string) => {
    const usps = stateOf(geoid);
    if (!usps) throw new Error(`No state for bucket ${geoid}.`);
    let state = states.get(usps);
    if (!state) {
      state = {
        asOfs: [AS_OF],
        schools: { places: {}, counties: {} },
        hospitals: { places: {}, counties: {} },
      };
      states.set(usps, state);
    }
    return { usps, state };
  };
  for (const [bucket, key] of [
    [input.schools.places, "places"],
    [input.schools.counties, "counties"],
  ] as const) {
    for (const geoid of Object.keys(bucket).sort()) {
      const { state } = stateFor(geoid);
      state.schools[key][geoid] = bucket[geoid]!.slice()
        .sort((a, b) => a.sourceId.localeCompare(b.sourceId))
        .map((row) => schoolTuple(row, state.asOfs));
    }
  }
  for (const [bucket, key] of [
    [input.hospitals.places, "places"],
    [input.hospitals.counties, "counties"],
  ] as const) {
    for (const geoid of Object.keys(bucket).sort()) {
      const { state } = stateFor(geoid);
      state.hospitals[key][geoid] = bucket[geoid]!.slice()
        .sort((a, b) => a.sourceId.localeCompare(b.sourceId))
        .map(hospitalTuple);
    }
  }
  const files = new Map<string, StateInstitutionsFile>();
  for (const [usps, state] of states) {
    files.set(usps, {
      state: usps,
      schools: {
        source: "NCES-CCD",
        enrollmentYear: MEMBERSHIP_YEAR,
        asOfs: state.asOfs,
        columns: SCHOOL_COLUMNS,
        ...state.schools,
      },
      hospitals: {
        source: "CMS-HOSPITAL",
        asOf: HOSPITALS_AS_OF,
        columns: HOSPITAL_COLUMNS,
        ...state.hospitals,
      },
    });
  }
  return files;
}

export async function renderStateInstitutions(): Promise<StateInstitutionFiles> {
  const nationalPlaces = JSON.parse(NATIONAL_PLACES_ROWS) as [
    string,
    string,
    string,
  ][];
  const places: LocalInstitutionPlaceInput[] = [
    ...nationalPlaces.map(([geoid, name, state]) => ({ geoid, name, state })),
    ...TERRITORY_PLACE_ROWS.map(([geoid, name, state]) => ({
      geoid,
      name,
      state,
    })),
  ];
  const geocodes = readEdgeGeocodes();
  const knownCounties = knownCountyGeoids();
  const directory = readCcdPublicSchools(geocodes);
  const consistency: CountyConsistency = {
    countiesOfPlace: countyGeoidsForPlace,
    isKnownCounty: (geoid) => knownCounties.has(geoid),
  };
  const schools = compilePublicSchools({
    consistency,
    places,
    shapes: readPlaceShapes(),
    schools: directory.schools,
    geocodes,
    membership: await readMembershipTotals(),
  });
  const hospitals = compileHospitals({
    consistency,
    places,
    hospitals: readHospitalInputs(),
    asOf: HOSPITALS_AS_OF,
  });
  const built = buildStateFiles({ places, schools, hospitals, geocodes });
  const files = new Map<string, string>();
  for (const [usps, file] of [...built].sort(([a], [b]) => a.localeCompare(b)))
    files.set(usps, `${JSON.stringify(file)}\n`);
  const lockOf = (domain: string) =>
    JSON.parse(
      readFileSync(
        resolve(ROOT, `data/source/${domain}/artifact-lock.json`),
        "utf8",
      ),
    ) as ArtifactLock;
  const inputs = [
    ...[
      CCD_ID,
      CCD_PRIOR_DIRECTORY_ARTIFACT,
      EDGE_GEOCODE_ARTIFACT,
      PLACE_BOUNDARY_ARTIFACT,
      CCD_MEMBERSHIP_ARTIFACT,
    ].map((artifactId) => ({ domain: "education", artifactId })),
    ...[HOSPITAL_GENERAL_ARTIFACT, HOSPITAL_POS_SLICE_ARTIFACT].map(
      (artifactId) => ({
        domain: "hospitals",
        artifactId,
      }),
    ),
  ].map(({ domain, artifactId }) => ({
    domain,
    artifactId,
    sha256: lockOf(domain).artifacts.find((a) => a.artifactId === artifactId)!
      .bytes.sha256,
  }));
  const { places: _sp, counties: _sc, ...schoolReport } = schools;
  const { places: _hp, counties: _hc, ...hospitalReport } = hospitals;
  void [_sp, _sc, _hp, _hc];
  const allStates = new Set(places.map((place) => place.state));
  const missing = (kind: "schools" | "hospitals") =>
    [...allStates]
      .filter(
        (state) =>
          !built.has(state) ||
          Object.keys(built.get(state)![kind].places).length +
            Object.keys(built.get(state)![kind].counties).length ===
            0,
      )
      .sort();
  return {
    files,
    report: {
      schools: schoolReport,
      hospitals: hospitalReport,
      statesWithNoSchools: missing("schools"),
      statesWithNoHospitals: missing("hospitals"),
      priorDirectoryStates: directory.priorDirectoryStates,
      inputs,
    },
  };
}

const sha256Of = (text: string) =>
  createHash("sha256").update(text).digest("hex");

function writeStateFiles(result: StateInstitutionFiles): void {
  mkdirSync(STATE_DIR, { recursive: true });
  const manifestFiles: Record<string, { bytes: number; sha256: string }> = {};
  for (const [usps, text] of result.files) {
    writeFileSync(resolve(STATE_DIR, `${usps}.json`), text);
    manifestFiles[usps] = {
      bytes: Buffer.byteLength(text),
      sha256: sha256Of(text),
    };
  }
  writeFileSync(
    STATE_MANIFEST,
    `${JSON.stringify({ asOf: AS_OF, inputs: result.report.inputs, report: { schools: result.report.schools, hospitals: result.report.hospitals }, statesWithNoSchools: result.report.statesWithNoSchools, statesWithNoHospitals: result.report.statesWithNoHospitals, priorDirectoryStates: result.report.priorDirectoryStates, files: manifestFiles }, null, 2)}\n`,
  );
}

export function renderLocalInstitutions(): string {
  const places = JSON.parse(NATIONAL_PLACES_ROWS) as [string, string, string][];
  const corpus = compileLocalInstitutions(
    places.map(([geoid, name, state]) => ({ geoid, name, state })),
    readEducationRows(),
    readCcdSchoolSource(),
  );
  const placesWithRows = Object.fromEntries(
    Object.entries(corpus.places).filter(([, rows]) =>
      Object.values(rows).some((institutions) => institutions.length > 0),
    ),
  );
  return `${JSON.stringify({ ...corpus, places: placesWithRows })}\n`;
}

async function main(): Promise<void> {
  const text = renderLocalInstitutions();
  const states = process.argv.includes("--states");
  if (process.argv.includes("--check")) {
    const current = readFileSync(OUT, "utf8");
    if (current !== text)
      throw new Error(`${OUT} is stale; rerun export:local-institutions`);
    checkStateFiles();
    console.log("Local institutions output matches the committed corpus.");
    return;
  }
  mkdirSync(resolve(ROOT, "data/research/places"), { recursive: true });
  writeFileSync(OUT, text);
  const sha256 = createHash("sha256").update(text).digest("hex");
  console.log(`Wrote ${OUT} (${sha256})`);
  if (states) {
    const result = await renderStateInstitutions();
    writeStateFiles(result);
    console.log(
      `Wrote ${result.files.size} state files in ${STATE_DIR}; states with no schools: ${result.report.statesWithNoSchools.join(", ") || "none"}; with no hospitals: ${result.report.statesWithNoHospitals.join(", ") || "none"}`,
    );
  }
}

/**
 * The state files must match their manifest and the manifest the locked
 * inputs. A full rebuild (which needs the ignored source cache) runs with
 * `--rebuild-check`.
 */
function checkStateFiles(): void {
  if (!existsSync(STATE_MANIFEST)) return;
  const manifest = JSON.parse(readFileSync(STATE_MANIFEST, "utf8")) as {
    inputs: { domain: string; artifactId: string; sha256: string }[];
    files: Record<string, { bytes: number; sha256: string }>;
  };
  for (const input of manifest.inputs) {
    const lock = JSON.parse(
      readFileSync(
        resolve(ROOT, `data/source/${input.domain}/artifact-lock.json`),
        "utf8",
      ),
    ) as ArtifactLock;
    const locked = lock.artifacts.find(
      (a) => a.artifactId === input.artifactId,
    );
    if (locked?.bytes.sha256 !== input.sha256)
      throw new Error(
        `State institution files were built from ${input.artifactId} ${input.sha256}, but the lock pins ${locked?.bytes.sha256}.`,
      );
  }
  const onDisk = new Set(
    readdirSync(STATE_DIR).filter(
      (name) => name.endsWith(".json") && name !== "manifest.json",
    ),
  );
  for (const [usps, expected] of Object.entries(manifest.files)) {
    const name = `${usps}.json`;
    if (!onDisk.delete(name))
      throw new Error(`State institution file ${name} is missing.`);
    const text = readFileSync(resolve(STATE_DIR, name), "utf8");
    if (sha256Of(text) !== expected.sha256)
      throw new Error(
        `State institution file ${name} does not match its manifest digest; rerun export:local-institutions -- --states.`,
      );
  }
  if (onDisk.size > 0)
    throw new Error(
      `State institution files not in the manifest: ${[...onDisk].join(", ")}`,
    );
}

if (process.argv[1]?.endsWith("local-institutions.ts")) await main();
