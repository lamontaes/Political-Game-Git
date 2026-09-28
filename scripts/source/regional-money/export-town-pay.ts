/**
 * Export what each town job pays, by state, from the BLS May 2025 OEWS state
 * tables.
 *
 * Reads the locked regional occupation corpus merged in #701
 * (`data/source/career-occupations/regional-corpus.json.gz`) and the national
 * occupation corpus (`data/source/career-occupations/corpus.json`), and writes
 * `src/simulation/living-world/town-pay.generated.ts`:
 *
 * - For every SOC code a town job is classified under (`TOWN_JOB_SOC` in
 *   `town-job-soc.ts`), the annual median wage in every state, D.C. and territory
 *   the state tables publish, in the fixed state order of `states`.
 * - The same code's national annual median, where the national table
 *   publishes one for that exact code.
 *
 * A cell BLS withheld (`*` or `#`) stays missing (an empty field), never zero.
 * Run with `node --import tsx scripts/source/regional-money/export-town-pay.ts`.
 * The output is committed so the browser build never reads the corpora.
 */

import { readFileSync, writeFileSync } from "node:fs";
import { gunzipSync } from "node:zlib";
import { TOWN_JOB_SOC } from "../../../src/simulation/living-world/town-job-soc";

export const TOWN_PAY_OUTPUT_PATH =
  "src/simulation/living-world/town-pay.generated.ts";

interface RegionalRow {
  readonly scope: string;
  readonly areaCode: string;
  readonly occupationCode: string;
  readonly annualMedianUsd?: unknown;
}

const manifest = JSON.parse(
  readFileSync(
    "data/source/career-occupations/regional-corpus-manifest.json",
    "utf8",
  ),
) as { corpusPath: string; canonicalSha256: string; asOf: string };
const regional = JSON.parse(
  gunzipSync(readFileSync(manifest.corpusPath)).toString("utf8"),
) as { rows: RegionalRow[] };
const national = JSON.parse(
  readFileSync("data/source/career-occupations/corpus.json", "utf8"),
) as {
  soc: string;
  wage?: { annualMedian?: string | null } | null;
}[];

const codes = [...new Set(Object.values(TOWN_JOB_SOC))].sort();
const wanted = new Set(codes);
const states = [
  ...new Set(
    regional.rows
      .filter((row) => row.scope === "state")
      .map((row) => row.areaCode),
  ),
].sort();
const byState = new Map<string, Map<string, number>>();
for (const row of regional.rows) {
  if (row.scope !== "state" || !wanted.has(row.occupationCode)) continue;
  const value = row.annualMedianUsd;
  if (typeof value !== "number" || !Number.isFinite(value)) continue;
  let codesOf = byState.get(row.occupationCode);
  if (!codesOf) byState.set(row.occupationCode, (codesOf = new Map()));
  codesOf.set(row.areaCode, value);
}
const nationalOf = new Map<string, number>();
for (const row of national) {
  const text = row.wage?.annualMedian?.trim() ?? "";
  if (wanted.has(row.soc) && /^\d+(\.\d+)?$/.test(text))
    nationalOf.set(row.soc, Number(text));
}

const table = codes
  .map(
    (code) =>
      `${code}:${nationalOf.get(code) ?? ""}:${states.map((state) => byState.get(code)?.get(state) ?? "").join(",")}`,
  )
  .join(";");

const output = `/**
 * GENERATED — do not edit by hand.
 *
 * Written by \`scripts/source/regional-money/export-town-pay.ts\` from the
 * locked occupation corpora. An empty field is a figure BLS withheld or did
 * not publish, never zero.
 */

export const TOWN_PAY_META = ${JSON.stringify(
  {
    source:
      "BLS Occupational Employment and Wage Statistics, May 2025: state tables and the national cross-industry table, annual median wage by occupation.",
    corpusSha256: manifest.canonicalSha256,
    asOf: manifest.asOf,
  },
  null,
  2,
)} as const;

/** State FIPS codes, in the order each row lists its state medians. */
export const TOWN_PAY_STATES = ${JSON.stringify(states)} as const;

/**
 * One row per SOC code: \`code:nationalAnnualMedian:stateMedian,...\`, rows
 * separated by \`;\`, dollars a year.
 */
export const TOWN_PAY_MEDIANS = ${JSON.stringify(table)};
`;
writeFileSync(TOWN_PAY_OUTPUT_PATH, output);
console.log(
  `Wrote ${codes.length} occupations across ${states.length} states to ${TOWN_PAY_OUTPUT_PATH}.`,
);
