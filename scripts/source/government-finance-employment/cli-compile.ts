#!/usr/bin/env node
/**
 * CLI Compiler for Government Finance and Employment Corpus
 */

import * as fs from "node:fs";
import * as path from "node:path";
import {
  GovFinanceEmploymentCompiler,
  buildNationalCoverageManifest,
} from "../../../src/source/government-finance-employment/index.js";
import {
  assertNotSyntheticPayload,
  assertProductionInputPath,
} from "../../../src/source/production-input-guard.js";
import type {
  GovernmentEntityMetadata,
  FinanceRecord,
  EmploymentRecord,
} from "../../../src/source/government-finance-employment/index.js";

/**
 * Production inputs only. The synthetic fixtures that exercise this compiler in
 * tests live under `__synthetic_fixtures__/`, which `assertProductionInputPath`
 * refuses outright — pointing this constant at them fails loudly rather than
 * quietly producing a corpus of invented Census figures, which is what PR #56
 * shipped.
 *
 * This directory is currently empty: the real Census APEP and Annual Survey of
 * State and Local Government Finances extracts have not been obtained. An empty
 * production corpus is the correct state until they are.
 */
const PRODUCTION_INPUT_DIR = path.resolve(
  process.cwd(),
  "data/source/government-finance-employment/normalized",
);
const MANIFESTS_DIR = path.resolve(
  process.cwd(),
  "data/source/government-finance-employment/manifests",
);

export function runCompilation() {
  console.log(
    "Compiling State and Local Government Finance & Employment Corpus...",
  );

  assertProductionInputPath(PRODUCTION_INPUT_DIR);

  if (!fs.existsSync(PRODUCTION_INPUT_DIR)) {
    fs.mkdirSync(PRODUCTION_INPUT_DIR, { recursive: true });
  }

  const files = fs
    .readdirSync(PRODUCTION_INPUT_DIR)
    .filter((f) => f.endsWith(".json"));
  const governments: GovernmentEntityMetadata[] = [];
  const financeRecords: FinanceRecord[] = [];
  const employmentRecords: EmploymentRecord[] = [];
  const fileBuffers: Record<string, Buffer> = {};

  for (const file of files) {
    const filePath = path.join(PRODUCTION_INPUT_DIR, file);
    assertProductionInputPath(filePath);
    const content = fs.readFileSync(filePath);
    fileBuffers[file] = content;
    const parsed: unknown = JSON.parse(content.toString("utf-8"));
    assertNotSyntheticPayload(parsed, filePath);

    const document = parsed as {
      government?: GovernmentEntityMetadata;
      financeRecords?: FinanceRecord[];
      employmentRecords?: EmploymentRecord[];
    };

    if (document.government) {
      governments.push(document.government);
    }
    if (Array.isArray(document.financeRecords)) {
      financeRecords.push(...document.financeRecords);
    }
    if (Array.isArray(document.employmentRecords)) {
      employmentRecords.push(...document.employmentRecords);
    }
  }

  const compiler = new GovFinanceEmploymentCompiler();
  const compiled = compiler.compile({
    governments,
    financeRecords,
    employmentRecords,
  });

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

  if (files.length === 0) {
    console.log(
      "No production input documents found. The real Census APEP and government-finance " +
        "extracts remain an outstanding source acquisition; an empty corpus is correct until then.",
    );
  }

  console.log("✓ Compilation completed successfully.");
  console.log(`  Total Governments: ${compiled.governments.length}`);
  console.log(`  Total Finance Records: ${financeRecords.length}`);
  console.log(`  Total Employment Records: ${employmentRecords.length}`);
  console.log(`  Manifest saved to: ${manifestPath}`);

  return compiled;
}

if (process.argv[1] && process.argv[1].endsWith("cli-compile.ts")) {
  runCompilation();
}
