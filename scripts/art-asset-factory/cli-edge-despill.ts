import fs from "fs";
import path from "path";
import crypto from "crypto";
import { PNG } from "pngjs";

import {
  classifyDespill,
  despillGreenEdge,
  DEFAULT_DESPILL_OPTIONS,
  type DespillReport,
} from "./edge-despill";

/**
 * Runs the edge despill over the banked body candidates and writes the proof.
 *
 * `npm run despill:edges` — deterministic, and re-running it over already
 * cleaned output is a no-op, so the JSON it writes is a stable artifact rather
 * than a run log.
 */

const REPOSITORY_ROOT = path.resolve(process.cwd());
const SOURCE_DIR = path.join(
  REPOSITORY_ROOT,
  "art/generated/candidates/ocd-p71/bodies",
);
const OUTPUT_DIR = path.join(
  REPOSITORY_ROOT,
  "art/generated/candidates/ocd-p76/bodies-despilled",
);
const REPORT_PATH = path.join(
  REPOSITORY_ROOT,
  "art/qa/p76/edge_despill_report.json",
);

interface FileEntry {
  readonly assetId: string;
  readonly source: string;
  readonly output: string;
  readonly sourceSha256: string;
  readonly outputSha256: string;
  readonly disposition: string;
  readonly report: DespillReport;
}

function sha256(file: string): string {
  return crypto
    .createHash("sha256")
    .update(fs.readFileSync(file))
    .digest("hex");
}

function main(): void {
  if (!fs.existsSync(SOURCE_DIR)) {
    throw new Error(`No banked bodies at ${SOURCE_DIR}`);
  }
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  fs.mkdirSync(path.dirname(REPORT_PATH), { recursive: true });

  const files = fs
    .readdirSync(SOURCE_DIR)
    .filter((name) => name.endsWith(".png"))
    .sort();

  const entries: FileEntry[] = [];
  for (const name of files) {
    const sourcePath = path.join(SOURCE_DIR, name);
    const png = PNG.sync.read(fs.readFileSync(sourcePath));
    const { png: cleaned, report } = despillGreenEdge(png);
    const outputPath = path.join(OUTPUT_DIR, name);
    fs.writeFileSync(outputPath, PNG.sync.write(cleaned));
    entries.push({
      assetId: name.replace(/\.png$/, ""),
      source: path.relative(REPOSITORY_ROOT, sourcePath),
      output: path.relative(REPOSITORY_ROOT, outputPath),
      sourceSha256: sha256(sourcePath),
      outputSha256: sha256(outputPath),
      disposition: classifyDespill(report),
      report,
    });
    const verdict = classifyDespill(report);
    process.stdout.write(
      `${name.padEnd(52)} ${report.softEdgeGreenPercentBefore.toFixed(1)}% -> ${report.softEdgeGreenPercentAfter.toFixed(2)}%  ` +
        `alpha ${report.alphaSha256Before === report.alphaSha256After ? "IDENTICAL" : "CHANGED"}  ${verdict}\n`,
    );
  }

  const document = {
    tool: "p76-edge-despill-v1",
    measured_on: "2026-09-04",
    note: "Deterministic green-edge despill over the Packet 71 body candidates. Alpha is never written, so the silhouette digest before and after must match; interior pixels at alpha >= 250 are never read as targets because the measurement found zero contamination there. Regenerate with `npm run despill:edges`.",
    options: DEFAULT_DESPILL_OPTIONS,
    entries,
  };
  fs.writeFileSync(REPORT_PATH, `${JSON.stringify(document, null, 2)}\n`);
  process.stdout.write(
    `\nWrote ${path.relative(REPOSITORY_ROOT, REPORT_PATH)} for ${entries.length} bodies.\n`,
  );
}

main();
