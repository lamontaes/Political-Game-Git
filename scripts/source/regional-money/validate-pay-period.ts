/** Validate BLS CES published-table capture and deterministic source corpus. */
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { gunzipSync } from "node:zlib";

const prefix = "data/source/bls-pay-period";
const manifest = JSON.parse(
  readFileSync(`${prefix}/regional-corpus-manifest.json`, "utf8"),
);
const lock = JSON.parse(
  readFileSync(`${prefix}/regional-artifact-lock.json`, "utf8"),
);
const artifact = lock.artifacts[0];
const source = readFileSync(artifact.localPath);
if (
  source.length !== artifact.length ||
  createHash("sha256").update(source).digest("hex") !== artifact.sha256 ||
  manifest.inputs[0].sha256 !== artifact.sha256
)
  throw new Error("Pay-period source capture mismatch");
const canonical = gunzipSync(readFileSync(manifest.corpusPath));
if (
  createHash("sha256").update(canonical).digest("hex") !==
  manifest.canonicalSha256
)
  throw new Error("Pay-period corpus mismatch");
const corpus = JSON.parse(canonical.toString("utf8"));
if (
  corpus.rows.length !== 76 ||
  manifest.recordCount !== 76 ||
  corpus.referenceMonth !== "2023-02" ||
  !corpus.sourceKind.includes("transcribed")
)
  throw new Error("Unexpected pay-period scope or count");
function percent(dimension: string, group: string, period: string) {
  return corpus.rows.find(
    (row: { dimension: string; group: string; payPeriod: string }) =>
      row.dimension === dimension &&
      row.group === group &&
      row.payPeriod === period,
  )?.percent;
}
if (
  percent("overall", "all private establishments", "Biweekly") !== 43 ||
  percent("industry", "Construction", "Weekly") !== 65.4 ||
  percent("establishment-size", "1,000+", "Biweekly") !== 66.6
)
  throw new Error("Unexpected pay-period published anchors");
console.log(
  JSON.stringify(
    {
      result: "PASS",
      observations: corpus.rows.length,
      groups: { overall: 1, establishmentSize: 8, industry: 10 },
      sourceKind: corpus.sourceKind,
      publicSectorCovered: false,
      continuousTimeSeries: false,
    },
    null,
    2,
  ),
);
