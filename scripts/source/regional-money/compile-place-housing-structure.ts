/** Compile exact ACS place housing observations; no sampling or outcome logic. */
import { createHash } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";
import { gunzipSync } from "node:zlib";
import { format } from "prettier";
import { NATIONAL_PLACES_ROWS } from "../../../src/simulation/national-places.generated";

const prefix = "data/source/acs-place-housing-structure";
const output =
  "src/simulation/living-world/place-housing-structure.generated.ts";
const lock = JSON.parse(
  readFileSync(`${prefix}/artifact-lock.json`, "utf8"),
) as {
  asOf: string;
  artifacts: {
    localPath: string;
    url: string;
    vintage: string;
    sha256: string;
    compressedSha256: string;
  }[];
};
const hash = (bytes: Buffer) =>
  createHash("sha256").update(bytes).digest("hex");
function source(suffix: string): string {
  const artifact = lock.artifacts.find((row) =>
    row.localPath.endsWith(suffix),
  )!;
  const compressed = readFileSync(artifact.localPath);
  const bytes = gunzipSync(compressed);
  if (
    hash(compressed) !== artifact.compressedSha256 ||
    hash(bytes) !== artifact.sha256
  )
    throw new Error(`Source hash mismatch: ${artifact.localPath}`);
  return bytes.toString("utf8").replace(/^\uFEFF/, "");
}
const tables = ["B25034", "B25024"] as const;
const labels = new Map<string, string>();
for (const line of source("Table_Shells.txt.gz").split(/\r?\n/)) {
  const [table, , , id, label] = line.split("|");
  if (tables.includes(table as (typeof tables)[number]) && id && label)
    labels.set(id, label);
}
const bounds = {
  B25034: [
    [2020, null],
    [2010, 2019],
    [2000, 2009],
    [1990, 1999],
    [1980, 1989],
    [1970, 1979],
    [1960, 1969],
    [1950, 1959],
    [1940, 1949],
    [null, 1939],
  ],
  B25024: [
    [1, 1],
    [1, 1],
    [2, 2],
    [3, 4],
    [5, 9],
    [10, 19],
    [20, 49],
    [50, null],
    [null, null],
    [null, null],
  ],
};
const bands = Object.fromEntries(
  tables.map((table) => [
    table,
    bounds[table].map(([lower, upper], index) => {
      const variableId = `${table}_${String(index + 2).padStart(3, "0")}`;
      const label = labels.get(variableId);
      if (!label) throw new Error(`Missing source label ${variableId}`);
      return {
        variableId,
        label,
        lower,
        upper,
        kind:
          lower === null && upper === null
            ? "unknown-count"
            : lower === null
              ? "open-lower"
              : upper === null
                ? "open-upper"
                : "finite",
      };
    }),
  ]),
);
// Null preserves withheld/unavailable cells; negative Census sentinel values are not counts.
const observation = (raw: string) => (/^\d+$/.test(raw) ? Number(raw) : null);
const extracted = new Map<string, Map<string, (number | null)[]>>();
for (const table of tables) {
  const rows = new Map<string, (number | null)[]>();
  const lines = source(`acsdt5y2024-${table.toLowerCase()}.dat.gz`)
    .trimEnd()
    .split(/\r?\n/);
  const expectedHeader = [
    "GEO_ID",
    ...Array.from({ length: 11 }, (_, index) => [
      `${table}_E${String(index + 1).padStart(3, "0")}`,
      `${table}_M${String(index + 1).padStart(3, "0")}`,
    ]).flat(),
  ].join("|");
  if (lines[0] !== expectedHeader)
    throw new Error(`Unexpected header: ${table}`);
  for (const line of lines.slice(1)) {
    const [geo, ...cells] = line.split("|");
    const match = /^1600000US(\d{7})$/.exec(geo!);
    if (!match) continue;
    if (rows.has(match[1]!)) throw new Error(`Duplicate place ${match[1]}`);
    if (cells.length !== 22) throw new Error(`Unexpected cell count ${geo}`);
    const values = cells.map(observation);
    const total = values[0];
    const estimates = values.filter(
      (_, index) => index >= 2 && index % 2 === 0,
    );
    if (
      total !== null &&
      estimates.every((value) => value !== null) &&
      estimates.reduce<number>((sum, value) => sum + value!, 0) !== total
    )
      throw new Error(`Band estimates do not sum to total ${table} ${geo}`);
    rows.set(match[1]!, values);
  }
  extracted.set(table, rows);
}
const places = JSON.parse(NATIONAL_PLACES_ROWS) as [string, string, string][];
const rows = places
  .map(([geoid]) => {
    if (!/^\d{7}$/.test(geoid)) throw new Error(`Invalid place GEOID ${geoid}`);
    return [
      geoid,
      ...tables.map((table) => extracted.get(table)!.get(geoid) ?? null),
    ];
  })
  .sort((a, b) => String(a[0]).localeCompare(String(b[0])));
const missingByState: Record<string, number> = {};
for (const row of rows)
  if (row[1] === null || row[2] === null) {
    const state = String(row[0]).slice(0, 2);
    missingByState[state] = (missingByState[state] ?? 0) + 1;
  }
const meta = {
  asOf: lock.asOf,
  vintage: "2020-2024 ACS 5-year",
  source:
    "U.S. Census Bureau, B25034 Year Structure Built and B25024 Units in Structure; universe: Housing units",
  artifacts: lock.artifacts,
  placeCount: rows.length,
  missingByState,
  territoryCoverage: {
    "60": "ACS unavailable",
    "66": "ACS unavailable",
    "69": "ACS unavailable",
    "72": "ACS place observations included",
    "78": "ACS unavailable",
  },
};
const rendered = await format(
  `/** GENERATED by scripts/source/regional-money/compile-place-housing-structure.ts. */\nexport const PLACE_HOUSING_STRUCTURE_META = ${JSON.stringify(meta)} as const;\nexport const PLACE_HOUSING_STRUCTURE_BANDS = ${JSON.stringify(bands)} as const;\n/** JSON rows [sevenDigitPlaceGeoid, B25034Cells|null, B25024Cells|null]. Cells: total estimate/MOE, then each source band estimate/MOE in BANDS order. Null table means no exact place row; null cell means unavailable. Estimates count HOUSING UNITS, not buildings. Unknown-count structure bands retain source categories, never invented unit counts. */\nexport const PLACE_HOUSING_STRUCTURE_ROWS: string = ${JSON.stringify(JSON.stringify(rows))};\n`,
  { parser: "typescript" },
);
if (process.argv.includes("--check")) {
  if (readFileSync(output, "utf8") !== rendered)
    throw new Error("Stale place housing structure module");
} else writeFileSync(output, rendered);
console.log(JSON.stringify({ placeCount: rows.length, missingByState }));
