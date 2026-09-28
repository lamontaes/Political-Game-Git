/** Normalize a bounded capture of official BLS CES February 2023 page tables. */
import { createHash } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";
import { gzipSync } from "node:zlib";
import { toCanonicalJson } from "../../../src/source/core/canonical-json";

const check = process.argv.includes("--check");
const prefix = "data/source/bls-pay-period";
const sourcePath = `${prefix}/raw/ces-february-2023-page-tables.json`;
const rawBytes = readFileSync(sourcePath);
const raw = JSON.parse(rawBytes.toString("utf8"));
if (
  raw.sourceUrl !==
    "https://www.bls.gov/ces/publications/length-pay-period.htm" ||
  raw.referenceMonth !== "2023-02" ||
  !raw.captureMethod?.includes("browser DOM") ||
  !raw.validationLimit?.includes("HTTP 403") ||
  raw.tables.length !== 3
)
  throw new Error("Unexpected BLS CES pay-period capture identity");
const periods = ["Weekly", "Biweekly", "Semimonthly", "Monthly"];
const expectedCounts = {
  overall: 4,
  "establishment-size": 8,
  industry: 10,
} as const;
const rows = [];
for (const table of raw.tables) {
  const dimension = table.dimension as keyof typeof expectedCounts;
  if (
    !(dimension in expectedCounts) ||
    table.rows.length !== expectedCounts[dimension]
  )
    throw new Error(`Unexpected rows in ${table.dimension}`);
  if (dimension !== "overall" && table.columns.join(",") !== periods.join(","))
    throw new Error(`Unexpected pay-period columns in ${dimension}`);
  if (
    dimension === "overall" &&
    table.columns.join(",") !== "Length of pay period,Percentage"
  )
    throw new Error("Unexpected overall pay-period headings");
  if (
    dimension === "overall" &&
    table.rows.map((row: string[]) => row[0]).join(",") !== periods.join(",")
  )
    throw new Error("Unexpected overall pay-period rows");
  const byGroup = new Map<string, number>();
  for (const [index, row] of table.rows.entries()) {
    const group =
      dimension === "overall" ? "all private establishments" : row[0];
    const cells =
      dimension === "overall"
        ? [[row[0], row[1]]]
        : periods.map((period, i) => [period, row[i + 1]]);
    for (const [period, text] of cells) {
      if (!/^\d+\.\d+%?$/.test(text))
        throw new Error(`Invalid BLS percentage ${text}`);
      const percent = Number(text.replace(/%$/, ""));
      rows.push({
        dimension,
        group,
        payPeriod: period,
        percent,
        rawPercent: text,
        evidence: {
          tableId: table.tableId,
          row: index + 1,
          column: dimension === "overall" ? 2 : periods.indexOf(period) + 2,
        },
      });
      byGroup.set(group, (byGroup.get(group) ?? 0) + percent);
    }
  }
  for (const [group, sum] of byGroup)
    if (sum < 99.8 || sum > 100.2)
      throw new Error(
        `Unexpected rounded pay-period sum ${dimension}/${group}: ${sum}`,
      );
}
if (rows.length !== 76)
  throw new Error(`Unexpected pay-period observation count ${rows.length}`);
const corpus = {
  provider:
    "U.S. Bureau of Labor Statistics, Current Employment Statistics survey",
  sourceUrl: raw.sourceUrl,
  referenceMonth: raw.referenceMonth,
  scope: raw.scope,
  sourceKind:
    "transcribed published HTML tables; not original publisher file bytes",
  units: "weighted percent of private establishments",
  rows,
};
const canonical = toCanonicalJson(corpus, 0);
const corpusPath = `${prefix}/regional-corpus.json.gz`;
const artifact = {
  localPath: sourcePath,
  url: raw.sourceUrl,
  vintage: "February 2023",
  mediaType: "application/json; source table capture",
  length: rawBytes.length,
  sha256: createHash("sha256").update(rawBytes).digest("hex"),
  limitation:
    "BLS HTML response was browser-readable but direct nonbrowser fetch returned 403; the capture is reviewed table text, not publisher-distributed original bytes",
};
const manifest = {
  asOf: "2026-09-26",
  compiler: "scripts/source/regional-money/compile-pay-period.ts",
  corpusPath,
  compression: "gzip",
  canonicalSha256: createHash("sha256").update(canonical).digest("hex"),
  recordCount: rows.length,
  inputs: [{ localPath: sourcePath, sha256: artifact.sha256 }],
  coverage: {
    overall: 4,
    establishmentSize: 8,
    industry: 10,
    payPeriodCategories: periods,
    sourceKind: corpus.sourceKind,
    publicSectorCovered: false,
    continuousTimeSeries: false,
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
  toCanonicalJson({ asOf: "2026-09-26", artifacts: [artifact] }),
);
output(`${prefix}/regional-corpus-manifest.json`, toCanonicalJson(manifest));
