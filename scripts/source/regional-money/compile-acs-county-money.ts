/** Source-only 2020-2024 ACS county housing and commute calibration. */
import { createHash } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";
import { gzipSync, gunzipSync } from "node:zlib";
import { toCanonicalJson } from "../../../src/source/core/canonical-json";

const check = process.argv.includes("--check");
const prefix = "data/source/acs-county-housing-commute";
const dataBase =
  "https://www2.census.gov/programs-surveys/acs/summary_file/2024/table-based-SF/data/5YRData/";
const documentationBase =
  "https://www2.census.gov/programs-surveys/acs/summary_file/2024/table-based-SF/documentation/";
const tables = ["B25077", "B25064", "B08303"] as const;
type TableId = (typeof tables)[number];
type Observation = { raw: string; value: number | null };
type Cell = { estimate: Observation; marginOfError: Observation };
function observed(raw: string): Observation {
  return { raw, value: /^\d+$/.test(raw) ? Number(raw) : null };
}
function digest(bytes: Buffer) {
  return createHash("sha256").update(bytes).digest("hex");
}
const artifacts = [];
const shellPath = `${prefix}/raw/ACS20245YR_Table_Shells.txt`;
const shellBytes = readFileSync(shellPath);
artifacts.push({
  localPath: shellPath,
  url: documentationBase + "ACS20245YR_Table_Shells.txt",
  vintage: "2020-2024 ACS 5-year",
  mediaType: "text/plain; delimiter=pipe",
  length: shellBytes.length,
  sha256: digest(shellBytes),
});
const labels = new Map<
  string,
  { label: string; title: string; universe: string }
>();
for (const line of shellBytes
  .toString("utf8")
  .replace(/^\uFEFF/, "")
  .trimEnd()
  .split(/\r?\n/)
  .slice(1)) {
  const [table, , , uniqueId, label, title, universe] = line.split("|");
  if (tables.includes(table as TableId) && uniqueId)
    labels.set(uniqueId, {
      label: label ?? "",
      title: title ?? "",
      universe: universe ?? "",
    });
}
const expectedLines: Record<TableId, number> = {
  B25077: 1,
  B25064: 1,
  B08303: 13,
};
for (const table of tables) {
  const count = [...labels.keys()].filter((key) =>
    key.startsWith(`${table}_`),
  ).length;
  if (count !== expectedLines[table])
    throw new Error(`Unexpected ${table} table shell: ${count}`);
}
const inputRows = new Map<
  TableId,
  Map<string, { sourceLine: number; values: Cell[] }>
>();
for (const table of tables) {
  const filename = `acsdt5y2024-${table.toLowerCase()}.dat`;
  const localPath = `${prefix}/raw/${filename}`;
  const bytes = readFileSync(localPath);
  artifacts.push({
    localPath,
    url: dataBase + filename,
    vintage: "2020-2024 ACS 5-year",
    mediaType: "text/plain; delimiter=pipe",
    length: bytes.length,
    sha256: digest(bytes),
  });
  const lines = bytes
    .toString("utf8")
    .replace(/^\uFEFF/, "")
    .trimEnd()
    .split(/\r?\n/);
  const header = lines[0]!.split("|");
  const expectedHeader = ["GEO_ID"];
  for (let index = 1; index <= expectedLines[table]; index++) {
    const code = String(index).padStart(3, "0");
    expectedHeader.push(`${table}_E${code}`, `${table}_M${code}`);
  }
  if (header.join("|") !== expectedHeader.join("|"))
    throw new Error(`Unexpected ${table} data columns`);
  const rows = new Map<string, { sourceLine: number; values: Cell[] }>();
  for (let index = 1; index < lines.length; index++) {
    const line = lines[index]!;
    if (!line.startsWith("0500000US")) continue;
    const cells = line.split("|");
    const geoId = cells[0]!;
    if (!/^0500000US\d{5}$/.test(geoId) || cells.length !== header.length)
      throw new Error(`Invalid ${table} county row at ${index + 1}`);
    const countyFips = geoId.slice(-5);
    if (rows.has(countyFips))
      throw new Error(`Duplicate ${table} county ${countyFips}`);
    const values: Cell[] = [];
    for (let column = 1; column < cells.length; column += 2)
      values.push({
        estimate: observed(cells[column]!),
        marginOfError: observed(cells[column + 1]!),
      });
    rows.set(countyFips, { sourceLine: index + 1, values });
  }
  if (rows.size !== 3222)
    throw new Error(`Unexpected ${table} county count: ${rows.size}`);
  inputRows.set(table, rows);
}
const countyCodes = [...inputRows.get("B25077")!.keys()].sort();
for (const table of tables)
  if (
    [...inputRows.get(table)!.keys()].sort().join(",") !== countyCodes.join(",")
  )
    throw new Error(`County set mismatch for ${table}`);
const regional = JSON.parse(
  gunzipSync(
    readFileSync("data/source/cbsa-delineations/regional-corpus.json.gz"),
  ).toString("utf8"),
);
const regionalCountyCodes = regional.rows
  .map((row: { countyFips: string }) => row.countyFips)
  .sort();
if (countyCodes.join(",") !== regionalCountyCodes.join(","))
  throw new Error("ACS and BLS county-equivalent IDs differ");
const jamValues = new Map<string, number>();
function countJam(observation: Observation) {
  if (observation.value === null)
    jamValues.set(observation.raw, (jamValues.get(observation.raw) ?? 0) + 1);
}
const rows = countyCodes.map((countyFips) => {
  const value = inputRows.get("B25077")!.get(countyFips)!;
  const rent = inputRows.get("B25064")!.get(countyFips)!;
  const commute = inputRows.get("B08303")!.get(countyFips)!;
  for (const entry of [...value.values, ...rent.values, ...commute.values]) {
    countJam(entry.estimate);
    countJam(entry.marginOfError);
  }
  return {
    countyFips,
    stateFips: countyFips.slice(0, 2),
    geoId: `0500000US${countyFips}`,
    medianOwnerOccupiedHomeValue: {
      ...value.values[0],
      sourceLine: value.sourceLine,
    },
    medianGrossRent: { ...rent.values[0], sourceLine: rent.sourceLine },
    commuteTimeToWork: {
      sourceLine: commute.sourceLine,
      universe: labels.get("B08303_001")!.universe,
      bins: commute.values.map((cell, index) => ({
        code: `B08303_${String(index + 1).padStart(3, "0")}`,
        label: labels.get(`B08303_${String(index + 1).padStart(3, "0")}`)!
          .label,
        ...cell,
      })),
    },
  };
});
const corpus = {
  source: "U.S. Census Bureau, 2024 ACS 5-year Detailed Tables",
  observationPeriod: "2020-2024",
  geography: "county or county equivalent, including Puerto Rico",
  units: {
    homeValue: "median U.S. dollars for owner-occupied housing units",
    grossRent:
      "median U.S. dollars per month for renter-occupied units paying cash rent",
    commute:
      "workers age 16 and over who did not work from home, by one-way travel-time bin; not distance",
  },
  tableDefinitions: Object.fromEntries(
    tables.map((table) => [
      table,
      [...labels.entries()]
        .filter(([key]) => key.startsWith(`${table}_`))
        .map(([code, definition]) => ({ code, ...definition })),
    ]),
  ),
  rows,
};
const canonical = toCanonicalJson(corpus, 0);
const corpusPath = `${prefix}/regional-corpus.json.gz`;
const manifest = {
  asOf: "2026-09-26",
  compiler: "scripts/source/regional-money/compile-acs-county-money.ts",
  corpusPath,
  compression: "gzip",
  canonicalSha256: digest(Buffer.from(canonical)),
  recordCount: rows.length,
  inputs: artifacts.map(({ localPath, sha256 }) => ({ localPath, sha256 })),
  coverage: {
    counties: rows.length,
    statesAndTerritories: [...new Set(rows.map((row) => row.stateFips))].sort(),
    commuteBinsIncludingTotal: 13,
    jamValues: Object.fromEntries([...jamValues].sort()),
    matchedBlsCountyIds: true,
  },
};
function output(path: string, bytes: Buffer | string) {
  const target = Buffer.isBuffer(bytes) ? bytes : Buffer.from(bytes);
  if (check) {
    if (!readFileSync(path).equals(target)) throw new Error(`Stale ${path}`);
  } else writeFileSync(path, target);
  console.log(`${check ? "checked" : "wrote"} ${path}`);
}
output(corpusPath, gzipSync(Buffer.from(canonical), { level: 9 }));
output(
  `${prefix}/regional-artifact-lock.json`,
  toCanonicalJson({ asOf: "2026-09-26", artifacts }),
);
output(`${prefix}/regional-corpus-manifest.json`, toCanonicalJson(manifest));
