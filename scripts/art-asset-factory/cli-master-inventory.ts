import fs from "fs";
import path from "path";

import { inventoryMasters } from "./master-inventory";

/**
 * Measures a folder of candidate masters before intake.
 *
 *   npm run inventory:masters -- <folder> [report.json]
 *
 * Source files are never modified. Exits non-zero when any candidate fails its
 * master contract, so a batch cannot be waved through by habit.
 */

const directory = process.argv[2];
if (!directory) {
  console.error(
    "Usage: npm run inventory:masters -- <folder-of-candidate-masters> [report.json]",
  );
  process.exit(2);
}

const report = inventoryMasters(path.resolve(directory));
const serialized = `${JSON.stringify(report, null, 2)}\n`;

const outputPath = process.argv[3];
if (outputPath) {
  fs.mkdirSync(path.dirname(path.resolve(outputPath)), { recursive: true });
  fs.writeFileSync(path.resolve(outputPath), serialized, "utf-8");
}

for (const entry of report.entries) {
  const size =
    entry.width !== null ? `${entry.width}x${entry.height}` : "unmeasured";
  const alpha =
    entry.hasVaryingAlpha === null
      ? "alpha?"
      : entry.hasVaryingAlpha
        ? "true-alpha"
        : "no-alpha";
  console.log(
    `${entry.verdict.padEnd(10)} ${size.padEnd(12)} ${alpha.padEnd(11)} ${entry.assumedKind ?? "unknown-kind"}  ${entry.file}`,
  );
  for (const reason of entry.reasons) console.log(`             - ${reason}`);
}

console.log(
  `\n${report.fileCount} candidates: ${report.passCount} pass, ${report.failCount} fail, ${report.unmeasuredCount} unmeasured.`,
);

if (report.failCount > 0) process.exit(1);
