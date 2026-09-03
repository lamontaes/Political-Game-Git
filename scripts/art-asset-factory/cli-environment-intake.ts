import fs from "fs";
import path from "path";

import { serializeAssetBankManifest } from "../../src/authoring/asset-bank";
import { toCanonicalJson } from "../../src/authoring/canonical-json";
import { runEnvironmentIntake } from "./environment-intake";

/**
 * Usage:
 *   cli-environment-intake.ts <intake-request.json> [--out <directory>]
 *
 * Writes `environment-intake-report.json` and `asset-bank.json` beside the
 * request, or into `--out`. Exits non-zero when any candidate is rejected, so
 * the command is usable as a gate.
 */

const args = process.argv.slice(2);
const requestPath = args[0];
if (!requestPath) {
  console.error(
    "Usage: cli-environment-intake.ts <intake-request.json> [--out <directory>]",
  );
  process.exit(2);
}

const outIndex = args.indexOf("--out");
const outputDirectory =
  outIndex >= 0 && args[outIndex + 1]
    ? path.resolve(args[outIndex + 1]!)
    : path.dirname(path.resolve(requestPath));

const repositoryRoot = process.cwd();
const result = runEnvironmentIntake(requestPath, repositoryRoot);

fs.mkdirSync(outputDirectory, { recursive: true });
const reportPath = path.join(outputDirectory, "environment-intake-report.json");
const bankPath = path.join(outputDirectory, "asset-bank.json");
fs.writeFileSync(reportPath, toCanonicalJson(result.report));
fs.writeFileSync(bankPath, serializeAssetBankManifest(result.assetBank));

const { report } = result;
console.log(
  `Intake: ${report.candidateCount} candidate(s) — ${report.productionCount} production, ${report.referenceCount} reference, ${report.rejectCount} rejected.`,
);
for (const record of report.records) {
  const errors = record.findings.filter((f) => f.severity === "error");
  const warnings = record.findings.filter((f) => f.severity === "warning");
  const detail =
    record.nativeDetailWidth === null
      ? "detail unverified"
      : record.nativeDetailWidth === record.width
        ? "native detail"
        : `${record.nativeDetailWidth}px real detail behind ${record.width}px`;
  console.log(
    `  ${record.disposition.toUpperCase().padEnd(10)} ${record.assetId} — ${record.width ?? "?"}x${record.height ?? "?"}, ${detail}`,
  );
  for (const finding of [...errors, ...warnings]) {
    console.log(`      ${finding.severity}: ${finding.message}`);
  }
}
if (result.undeclaredFiles.length > 0) {
  console.log(
    `\n${result.undeclaredFiles.length} file(s) beside the request declare no lineage and were NOT adopted:`,
  );
  for (const file of result.undeclaredFiles) console.log(`  ${file}`);
}
console.log(`\nWrote ${reportPath}`);
console.log(`Wrote ${bankPath}`);

if (report.rejectCount > 0) process.exit(1);
