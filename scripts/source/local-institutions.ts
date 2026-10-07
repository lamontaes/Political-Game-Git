/** Compile place-addressed official institution names for the game. */
import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { NATIONAL_PLACES_ROWS } from "../../src/simulation/national-places.generated";
import {
  openProductionArtifacts,
  parseDelimited,
  readZipMember,
} from "../../src/source/core/index";
import type { ArtifactLock } from "../../src/source/core/index";
import type {
  LocalInstitutionRow,
  LocalInstitutionSet,
  LocalInstitutionsCorpus,
} from "../../src/simulation/local-institutions-data";

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

function main(): void {
  const text = renderLocalInstitutions();
  if (process.argv.includes("--check")) {
    const current = readFileSync(OUT, "utf8");
    if (current !== text)
      throw new Error(`${OUT} is stale; rerun export:local-institutions`);
    console.log("Local institutions output matches the committed corpus.");
    return;
  }
  mkdirSync(resolve(ROOT, "data/research/places"), { recursive: true });
  writeFileSync(OUT, text);
  const sha256 = createHash("sha256").update(text).digest("hex");
  console.log(`Wrote ${OUT} (${sha256})`);
}

if (process.argv[1]?.endsWith("local-institutions.ts")) main();
