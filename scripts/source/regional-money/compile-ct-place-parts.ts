/** Dated Connecticut place-to-planning-region parts from Census ACS geography. */
import { createHash } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";
import { gzipSync } from "node:zlib";
import { toCanonicalJson } from "../../../src/source/core/canonical-json";

const check = process.argv.includes("--check");
const prefix = "data/source/cbsa-delineations";
const sourcePath = `${prefix}/raw/acs-2023-geos-5yr.txt`;
const corpusPath = `${prefix}/ct-place-county-2023.json.gz`;
const lockPath = `${prefix}/ct-place-county-2023-artifact-lock.json`;
const manifestPath = `${prefix}/ct-place-county-2023-manifest.json`;
const source = readFileSync(sourcePath);
const sourceSha256 = createHash("sha256").update(source).digest("hex");
const lines = source
  .toString("utf8")
  .replace(/^\uFEFF/, "")
  .trimEnd()
  .split(/\r?\n/);
const columns = lines[0]!.split("|");
const positions = new Map(columns.map((name, index) => [name, index]));
for (const name of [
  "SUMLEVEL",
  "COMPONENT",
  "STATE",
  "COUNTY",
  "PLACE",
  "GEO_ID",
  "NAME",
  "TL_GEO_ID",
])
  if (!positions.has(name)) throw new Error(`Missing ${name}`);
const field = (cells: string[], name: string) =>
  cells[positions.get(name)!] ?? "";
type Part = {
  placeGeoid: string;
  countyGeoid: string;
  sourceGeoId: string;
  sourceLine: number;
  name: string;
};
const parts: Part[] = [];
const places = new Set<string>();
const counties = new Set<string>();
const wholePlaces = new Set<string>();
for (let index = 1; index < lines.length; index++) {
  const cells = lines[index]!.split("|");
  if (field(cells, "STATE") !== "09" || field(cells, "COMPONENT") !== "00")
    continue;
  const level = field(cells, "SUMLEVEL");
  if (level === "160") wholePlaces.add(`09${field(cells, "PLACE")}`);
  if (level === "050") counties.add(`09${field(cells, "COUNTY")}`);
  if (level !== "155") continue;
  const placeGeoid = `09${field(cells, "PLACE")}`;
  const countyGeoid = `09${field(cells, "COUNTY")}`;
  const combined = `${placeGeoid}${field(cells, "COUNTY")}`;
  const sourceGeoId = field(cells, "GEO_ID");
  if (
    !/^09\d{5}$/.test(placeGeoid) ||
    !/^09\d{3}$/.test(countyGeoid) ||
    sourceGeoId !== `1550000US${combined}` ||
    (field(cells, "TL_GEO_ID") && field(cells, "TL_GEO_ID") !== combined)
  )
    throw new Error(
      `Invalid CT place/county identifiers at source line ${index + 1}`,
    );
  if (parts.some((part) => part.sourceGeoId === sourceGeoId))
    throw new Error(`Duplicate CT place/county part ${sourceGeoId}`);
  places.add(placeGeoid);
  parts.push({
    placeGeoid,
    countyGeoid,
    sourceGeoId,
    sourceLine: index + 1,
    name: field(cells, "NAME"),
  });
}
parts.sort((a, b) => a.sourceGeoId.localeCompare(b.sourceGeoId));
if (
  parts.length !== 215 ||
  places.size !== 215 ||
  [...places].some((place) => !wholePlaces.has(place)) ||
  parts.some((part) => !counties.has(part.countyGeoid))
)
  throw new Error("Unexpected Connecticut 2023 place/county-part coverage");
const corpus = { vintage: "ACS 2023 5-year geography", rows: parts };
const canonical = toCanonicalJson(corpus, 0);
const compressed = gzipSync(Buffer.from(canonical), { level: 9 });
const digest = createHash("sha256").update(canonical).digest("hex");
const lock = {
  asOf: "2026-09-26",
  artifacts: [
    {
      localPath: sourcePath,
      url: "https://www2.census.gov/programs-surveys/acs/summary_file/2023/table-based-SF/documentation/Geos20235YR.txt",
      vintage: "ACS 2023 5-year geography",
      mediaType: "text/plain; delimiter=pipe; charset=utf-8",
      length: source.length,
      sha256: sourceSha256,
    },
  ],
};
const manifest = {
  asOf: "2026-09-26",
  compiler: "scripts/source/regional-money/compile-ct-place-parts.ts",
  corpusPath,
  compression: "gzip",
  canonicalSha256: digest,
  recordCount: parts.length,
  inputs: [{ localPath: sourcePath, sha256: sourceSha256 }],
  coverage: {
    stateFips: "09",
    placeCount: places.size,
    countyPartCount: parts.length,
    countyEquivalents: [
      ...new Set(parts.map((part) => part.countyGeoid)),
    ].sort(),
    scope:
      "Connecticut only; 2023 place IDs and planning-region county equivalents",
  },
};
function output(path: string, bytes: Buffer | string) {
  const target = Buffer.isBuffer(bytes) ? bytes : Buffer.from(bytes);
  if (check) {
    if (!readFileSync(path).equals(target)) throw new Error(`Stale ${path}`);
  } else writeFileSync(path, target);
  console.log(`${check ? "checked" : "wrote"} ${path}`);
}
output(corpusPath, compressed);
output(lockPath, toCanonicalJson(lock));
output(manifestPath, toCanonicalJson(manifest));
