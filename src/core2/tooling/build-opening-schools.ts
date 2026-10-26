/**
 * P15 part 3: builds src/core2/data/opening-schools.json, the only school
 * fields the deep past reads (id, name, lowest and highest grade, enrollment),
 * from the merged P12 state files (data/research/places/local-institutions/
 * <USPS>.json, NCES Common Core of Data). Tooling only; reruns reproduce it.
 *
 *   npx tsx src/core2/tooling/build-opening-schools.ts
 */
import { createHash } from "node:crypto";
import { readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { countyGeoidsForPlace } from "../reference/government-units";

/** One school row of a state's institutions file: source id, name, kind, match method, grades, enrollment, then fields this script does not read. */
type SchoolTuple = readonly [
  string,
  string,
  string,
  string,
  string,
  string,
  number,
  ...unknown[],
];

/** The school fields of a state's institutions file that this script reads. */
interface StateInstitutionsFile {
  readonly state: string;
  readonly schools: {
    readonly enrollmentYear: string;
    readonly asOfs: readonly string[];
    readonly places: Readonly<Record<string, readonly SchoolTuple[]>>;
    readonly counties: Readonly<Record<string, readonly SchoolTuple[]>>;
  };
}

const DIRECTORY = "data/research/places/local-institutions";
const OUT = "src/core2/data/opening-schools.json";

const manifest = readFileSync(join(DIRECTORY, "manifest.json"));
const byGeoid: Record<string, [string, string, string, string, number][]> = {};
const bucketsByState: Record<string, string[]> = {};
let schools = 0;
let year = "";
let asOf = "";
for (const file of readdirSync(DIRECTORY).sort()) {
  if (!file.endsWith(".json") || file === "manifest.json") continue;
  const state = JSON.parse(
    readFileSync(join(DIRECTORY, file), "utf8"),
  ) as StateInstitutionsFile;
  year = state.schools.enrollmentYear;
  asOf = state.schools.asOfs.join(", ");
  for (const buckets of [state.schools.places, state.schools.counties])
    for (const [geoid, rows] of Object.entries(buckets)) {
      (bucketsByState[state.state] ??= []).push(geoid);
      const out = (byGeoid[geoid] ??= []);
      for (const row of rows) {
        out.push([row[0], row[1], row[4], row[5], row[6]]);
        schools += 1;
      }
    }
}
// Places with schools in each county, so a place with none reads its county's.
const placesByCounty: Record<string, string[]> = {};
for (const geoid of Object.keys(byGeoid).sort())
  if (geoid.length === 7)
    for (const county of countyGeoidsForPlace(geoid))
      (placesByCounty[county] ??= []).push(geoid);
const sha = createHash("sha256").update(manifest).digest("hex");
writeFileSync(
  OUT,
  `${JSON.stringify({
    version: "p15-opening-schools-v1",
    stopgapId: "SG-P15-school-assignment",
    asOf,
    citation: `NCES Common Core of Data public school directory and ${year} membership, as matched to places and counties by P12 (${DIRECTORY}/<USPS>.json, manifest sha256 ${sha}, directory as of ${asOf}). Public schools only.`,
    columns: ["id", "name", "lowestGrade", "highestGrade", "enrollment"],
    schools,
    byGeoid,
    placesByCounty,
    bucketsByState,
  })}\n`,
);
console.log(
  `${schools} schools in ${Object.keys(byGeoid).length} places and counties`,
);
