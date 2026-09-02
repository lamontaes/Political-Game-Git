#!/usr/bin/env node
/**
 * CLI Tool to generate or verify National Coverage Manifest
 */

import * as fs from "node:fs";
import * as path from "node:path";
import { buildNationalCoverageManifest } from "../../src/government_finance_employment/index.js";
import type {
  GovernmentEntityMetadata,
  FinanceRecord,
  EmploymentRecord,
} from "../../src/government_finance_employment/index.js";

const FIXTURES_DIR = path.resolve(
  process.cwd(),
  "data/government_finance_employment/fixtures",
);
const MANIFESTS_DIR = path.resolve(
  process.cwd(),
  "data/government_finance_employment/manifests",
);

export function runManifestGeneration() {
  console.log("Generating National Coverage Manifest...");

  const files = fs.readdirSync(FIXTURES_DIR).filter((f) => f.endsWith(".json"));
  const governments: GovernmentEntityMetadata[] = [];
  const financeRecords: FinanceRecord[] = [];
  const employmentRecords: EmploymentRecord[] = [];
  const fileBuffers: Record<string, Buffer> = {};

  for (const file of files) {
    const filePath = path.join(FIXTURES_DIR, file);
    const content = fs.readFileSync(filePath);
    fileBuffers[file] = content;
    const parsed = JSON.parse(content.toString("utf-8"));

    if (parsed.government) {
      governments.push(parsed.government);
    }
    if (Array.isArray(parsed.financeRecords)) {
      financeRecords.push(...parsed.financeRecords);
    }
    if (Array.isArray(parsed.employmentRecords)) {
      employmentRecords.push(...parsed.employmentRecords);
    }
  }

  const manifest = buildNationalCoverageManifest({
    governments,
    financeRecords,
    employmentRecords,
    rawFileBuffers: fileBuffers,
  });

  if (!fs.existsSync(MANIFESTS_DIR)) {
    fs.mkdirSync(MANIFESTS_DIR, { recursive: true });
  }

  const manifestPath = path.join(
    MANIFESTS_DIR,
    "national_coverage_manifest.json",
  );
  fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2) + "\n");

  console.log("✓ Manifest updated at:", manifestPath);
  console.log(JSON.stringify(manifest.coverage, null, 2));
}

if (process.argv[1] && process.argv[1].endsWith("cli-manifest.ts")) {
  runManifestGeneration();
}
