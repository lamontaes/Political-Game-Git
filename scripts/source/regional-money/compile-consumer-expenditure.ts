/** Read-only 2024 BLS Consumer Expenditure Survey source normalization. */
import { createHash } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";
import { gzipSync } from "node:zlib";
import { readXlsxSheet } from "../../../src/source/core/archive/xlsx";
import { toCanonicalJson } from "../../../src/source/core/canonical-json";

const check = process.argv.includes("--check");
const prefix = "data/source/consumer-expenditure";
const sourceBase =
  "https://www.bls.gov/cex/tables/calendar-year/mean-item-share-average-standard-error/";
const specs = [
  {
    dimension: "income-before-taxes",
    file: "cu-income-before-taxes-2024.xlsx",
    sheet: "Table 1203",
    cohorts: [
      "All consumer units",
      "Less than $15,000",
      "$15,000 to $29,999",
      "$30,000 to $39,999",
      "$40,000 to $49,999",
      "$50,000 to $69,999",
      "$70,000 to $99,999",
      "$100,000 to $149,999",
      "$150,000 to $199,999",
      "$200,000 and more",
    ],
  },
  {
    dimension: "region-of-residence",
    file: "cu-region-1-year-average-2024.xlsx",
    sheet: "Table 1800",
    cohorts: ["All consumer units", "Northeast", "Midwest", "South", "West"],
  },
  {
    dimension: "consumer-unit-size",
    file: "cu-size-2024.xlsx",
    sheet: "Table 1400",
    cohorts: [
      "All consumer units",
      "One person",
      "Two or more people total",
      "Two people",
      "Three people",
      "Four people",
      "Five or more people",
    ],
  },
] as const;
function observed(raw: string) {
  const trimmed = raw.trim();
  return {
    raw: trimmed,
    value: /^-?\d+(?:\.\d+)?$/.test(trimmed) ? Number(trimmed) : null,
  };
}
const artifacts = [];
const groups = [];
for (const spec of specs) {
  const localPath = `${prefix}/raw/${spec.file}`;
  const bytes = readFileSync(localPath);
  artifacts.push({
    localPath,
    url: sourceBase + spec.file,
    vintage: "calendar year 2024",
    mediaType:
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    length: bytes.length,
    sha256: createHash("sha256").update(bytes).digest("hex"),
    sheet: spec.sheet,
  });
  const rows = readXlsxSheet(bytes, spec.sheet).rows;
  if (
    !rows[0]?.[0]?.includes("2024") ||
    rows[0]?.[0]?.includes(spec.sheet) === false
  )
    throw new Error(`Unexpected title for ${spec.file}`);
  const start = rows.findIndex(
    (row) => row[0] === "Average annual expenditures",
  );
  const end = rows.findIndex((row) => row[0] === "Sources of pretax income:");
  if (start < 0 || end <= start)
    throw new Error(`Missing expenditure bounds in ${spec.file}`);
  const cohortCount = spec.cohorts.length;
  const normalized = (value: string) => value.replace(/\s+/g, " ").trim();
  const headings = rows[1]!.slice(1).map(normalized);
  if (spec.dimension === "consumer-unit-size") {
    const secondHeadings = rows[2]!.slice(1).map(normalized);
    if (
      headings.join("|") !==
        "All consumer units|One person|Two or more people||||" ||
      secondHeadings.join("|") !==
        "||Total|Two people|Three people|Four people|Five or more people"
    )
      throw new Error(`Unexpected consumer-unit size headings in ${spec.file}`);
  } else if (headings.join("|") !== spec.cohorts.join("|"))
    throw new Error(`Unexpected cohort headings in ${spec.file}`);
  const sampleRow = rows.find((row) =>
    row[0]?.startsWith("Number of consumer units"),
  );
  if (!sampleRow || sampleRow.length !== cohortCount + 1)
    throw new Error(`Unexpected consumer-unit columns in ${spec.file}`);
  const samples = spec.cohorts.map((label, index) => ({
    label,
    consumerUnitsThousands: observed(sampleRow[index + 1] ?? ""),
  }));
  const items = [];
  for (let index = start; index < end; index++) {
    const label = rows[index]?.[0]?.trim() ?? "";
    if (!label || rows[index + 1]?.[0] !== "Mean") continue;
    const mean = rows[index + 1]!;
    const share =
      rows[index + 2]?.[0] === "Share" ? rows[index + 2]! : undefined;
    const standardError =
      rows[index + (share ? 3 : 2)]?.[0] === "SE"
        ? rows[index + (share ? 3 : 2)]!
        : undefined;
    const relativeStandardError =
      rows[index + (share ? 4 : 3)]?.[0] === "RSE"
        ? rows[index + (share ? 4 : 3)]!
        : undefined;
    if (!standardError || !relativeStandardError)
      throw new Error(
        `Missing uncertainty rows after ${label} in ${spec.file}`,
      );
    for (const metric of [mean, share, standardError, relativeStandardError])
      if (metric && metric.length !== cohortCount + 1)
        throw new Error(`Column count mismatch at ${label} in ${spec.file}`);
    items.push({
      label,
      sourceRow: index + 1,
      observations: spec.cohorts.map((cohort, cohortIndex) => ({
        cohort,
        annualMeanUsd: observed(mean[cohortIndex + 1] ?? ""),
        sharePercent: share ? observed(share[cohortIndex + 1] ?? "") : null,
        standardErrorUsd: observed(standardError[cohortIndex + 1] ?? ""),
        relativeStandardErrorPercent: observed(
          relativeStandardError[cohortIndex + 1] ?? "",
        ),
      })),
    });
  }
  if (items.length < 80 || items[0]?.label !== "Average annual expenditures")
    throw new Error(
      `Unexpected expenditure items in ${spec.file}: ${items.length}`,
    );
  groups.push({
    dimension: spec.dimension,
    sheet: spec.sheet,
    cohortSamples: samples,
    items,
  });
}
const corpus = {
  source: "BLS Consumer Expenditure Surveys",
  vintage: "calendar year 2024",
  units: {
    annualMeanUsd: "U.S. dollars per consumer unit per year",
    sharePercent: "percent of annual expenditures",
    consumerUnitsThousands: "thousands of consumer units",
  },
  groups,
};
const canonical = toCanonicalJson(corpus, 0);
const corpusPath = `${prefix}/regional-corpus.json.gz`;
const manifest = {
  asOf: "2026-09-26",
  compiler: "scripts/source/regional-money/compile-consumer-expenditure.ts",
  corpusPath,
  compression: "gzip",
  canonicalSha256: createHash("sha256").update(canonical).digest("hex"),
  inputs: artifacts.map(({ localPath, sha256 }) => ({ localPath, sha256 })),
  coverage: groups.map((group) => ({
    dimension: group.dimension,
    cohorts: group.cohortSamples.length,
    expenditureItems: group.items.length,
  })),
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
