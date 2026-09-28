/** Verify locked BLS Consumer Expenditure workbooks and selected source cells. */
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { gunzipSync } from "node:zlib";

const prefix = "data/source/consumer-expenditure";
const manifest = JSON.parse(
  readFileSync(`${prefix}/regional-corpus-manifest.json`, "utf8"),
);
const lock = JSON.parse(
  readFileSync(`${prefix}/regional-artifact-lock.json`, "utf8"),
);
const canonical = gunzipSync(readFileSync(manifest.corpusPath));
if (
  createHash("sha256").update(canonical).digest("hex") !==
  manifest.canonicalSha256
)
  throw new Error("Consumer expenditure corpus mismatch");
for (const input of manifest.inputs) {
  const artifact = lock.artifacts.find(
    (entry: { localPath: string }) => entry.localPath === input.localPath,
  );
  const bytes = readFileSync(input.localPath);
  if (
    !artifact ||
    artifact.sha256 !== input.sha256 ||
    artifact.length !== bytes.length ||
    createHash("sha256").update(bytes).digest("hex") !== artifact.sha256
  )
    throw new Error(`Consumer expenditure source mismatch: ${input.localPath}`);
}
const corpus = JSON.parse(canonical.toString("utf8"));
if (
  corpus.groups.length !== 3 ||
  corpus.groups.some(
    (group: { items: unknown[] }) => group.items.length !== 101,
  )
)
  throw new Error("Unexpected consumer expenditure item coverage");
function sourceCell(
  dimension: string,
  item: string,
  cohort: string,
  metric: string,
) {
  const group = corpus.groups.find(
    (entry: { dimension: string }) => entry.dimension === dimension,
  );
  const observation = group?.items
    .find((entry: { label: string }) => entry.label === item)
    ?.observations.find((entry: { cohort: string }) => entry.cohort === cohort);
  return observation?.[metric]?.raw;
}
const anchors = [
  ["income-before-taxes", "Food", "Less than $15,000", "sharePercent", "16.5"],
  ["income-before-taxes", "Food", "$200,000 and more", "sharePercent", "10.8"],
  [
    "income-before-taxes",
    "Housing",
    "Less than $15,000",
    "sharePercent",
    "41.6",
  ],
  ["region-of-residence", "Housing", "Northeast", "sharePercent", "35.2"],
  ["consumer-unit-size", "Housing", "One person", "sharePercent", "39.0"],
] as const;
for (const [dimension, item, cohort, metric, expected] of anchors)
  if (sourceCell(dimension, item, cohort, metric) !== expected)
    throw new Error(`Unexpected ${dimension}/${item}/${cohort}/${metric}`);
type Value = { raw: string; value: number | null };
type Observation = { annualMeanUsd: Value; sharePercent: Value | null };
const missing = corpus.groups.flatMap(
  (group: { items: Array<{ observations: Observation[] }> }) =>
    group.items.flatMap((item) =>
      item.observations.flatMap((observation) =>
        [observation.annualMeanUsd, observation.sharePercent]
          .filter(
            (value): value is Value =>
              !!value && !!value.raw && value.value === null,
          )
          .map((value) => value.raw),
      ),
    ),
);
if (!missing.length || !missing.some((mark: string) => mark.endsWith("/")))
  throw new Error("Suppression marks unexpectedly absent");
console.log(
  JSON.stringify(
    {
      result: "PASS",
      dimensions: corpus.groups.map(
        (group: {
          dimension: string;
          items: unknown[];
          cohortSamples: unknown[];
        }) => ({
          name: group.dimension,
          items: group.items.length,
          cohorts: group.cohortSamples.length,
        }),
      ),
      missingMarks: [...new Set(missing)].sort(),
      anchors: anchors.length,
    },
    null,
    2,
  ),
);
