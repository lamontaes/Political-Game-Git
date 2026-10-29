/**
 * `npm run compile:place-population` — town populations from the Census
 * Bureau's Vintage 2025 subcounty estimates (July 1, 2025).
 *
 * Reads the verified research answer to `place-population-today` (the SUMLEV
 * 162 rows of sub-est2025.csv, 50 states and D.C.), checks its SHA-256
 * against the handoff's SHA256SUMS, and writes one compact row per place,
 * keyed by 7-digit place GEOID. A place with no row stays unknown, never 0;
 * the four rows the Census Bureau itself reports as 0 are kept as 0.
 *
 * Urban Honolulu (1571550) is left out: it is a census-designated place, not
 * a place any government in the game governs. Puerto Rico has no incorporated
 * places; its 78 municipios are not government units in the game yet, so the
 * separate municipio file is not compiled here.
 *
 * The output is the JSON table the core reads
 * (`src/core2/gov-rules/place-population.ts`), committed so the browser build
 * never runs Node source code. `--check` reads without writing and fails when
 * the committed table is stale.
 */

import { createHash } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { format } from "prettier";

const ROOT = resolve(import.meta.dirname, "../..");
const HANDOFF = "docs/research/chatgpt-answers/2026-09-23-cto-handoff-2230";
const CSV = `${HANDOFF}/DATA-Census-Vintage-2025-places-50-states-DC.csv`;
const SHA256 =
  "3d2f988fe4ed2343dd3cf828dd1c70a24cd5dd26a46feb5837e3c48c5da2e591";
const OUTPUT = "data/tables/place-population.json";
const EXPECTED_ROWS = 19_483;
const EXCLUDED = new Set(["1571550"]);

function parseLine(line: string): string[] {
  const cells: string[] = [];
  let cell = "";
  let quoted = false;
  for (let i = 0; i < line.length; i += 1) {
    const ch = line[i]!;
    if (quoted) {
      if (ch === '"' && line[i + 1] === '"') {
        cell += '"';
        i += 1;
      } else if (ch === '"') quoted = false;
      else cell += ch;
    } else if (ch === '"') quoted = true;
    else if (ch === ",") {
      cells.push(cell);
      cell = "";
    } else cell += ch;
  }
  cells.push(cell);
  return cells;
}

export function placePopulationTable(bytes: Buffer) {
  const digest = createHash("sha256").update(bytes).digest("hex");
  if (digest !== SHA256) {
    throw new Error(`${CSV} has SHA-256 ${digest}, expected ${SHA256}.`);
  }
  const lines = bytes.toString("utf-8").trim().split(/\r?\n/);
  const header = parseLine(lines[0]!);
  const at = (name: string) => {
    const index = header.indexOf(name);
    if (index < 0) throw new Error(`${CSV} has no "${name}" column.`);
    return index;
  };
  const geoidAt = at("geoid7");
  const popAt = at("population_2025_07_01");
  const sumlevAt = at("source_sumlev");
  const rows: string[] = [];
  const seen = new Set<string>();
  let zeros = 0;
  for (const line of lines.slice(1)) {
    const cells = parseLine(line);
    const geoid = cells[geoidAt]!;
    const raw = cells[popAt]!;
    if (!/^\d{7}$/.test(geoid)) throw new Error(`Bad GEOID "${geoid}".`);
    if (cells[sumlevAt] !== "162")
      throw new Error(`${geoid} is not SUMLEV 162.`);
    if (!/^\d+$/.test(raw))
      throw new Error(`${geoid} has population "${raw}".`);
    if (seen.has(geoid)) throw new Error(`${geoid} appears twice.`);
    seen.add(geoid);
    if (EXCLUDED.has(geoid)) continue;
    if (Number(raw) === 0) zeros += 1;
    rows.push(`${geoid}:${Number(raw)}`);
  }
  if (seen.size !== EXPECTED_ROWS) {
    throw new Error(`Expected ${EXPECTED_ROWS} rows, read ${seen.size}.`);
  }
  rows.sort();
  return {
    PLACE_POPULATION_META: {
      source:
        "https://www2.census.gov/programs-surveys/popest/datasets/2020-2025/cities/totals/sub-est2025.csv",
      vintage: 2025,
      estimateDate: "2025-07-01",
      inputSha256: SHA256,
      places: rows.length,
      reportedZero: zeros,
      excluded: ["1571550 Urban Honolulu CDP (not a governed place)"],
    },
    /** "GEOID:population" pairs joined by ";", parsed once on first use. */
    PLACE_POPULATION_ROWS: rows.join(";"),
  };
}

if (
  process.argv[1] &&
  import.meta.url.endsWith(process.argv[1].split("/").pop()!)
) {
  const table = placePopulationTable(readFileSync(resolve(ROOT, CSV)));
  const text = await format(JSON.stringify(table), { parser: "json" });
  if (process.argv.includes("--check")) {
    if (readFileSync(resolve(ROOT, OUTPUT), "utf8") !== text)
      throw new Error(`${OUTPUT} is stale; rerun compile-place-population.`);
    console.log(`${OUTPUT} is current.`);
  } else {
    writeFileSync(resolve(ROOT, OUTPUT), text);
    console.log(`Wrote ${OUTPUT}.`);
  }
}
