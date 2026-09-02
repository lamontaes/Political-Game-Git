#!/usr/bin/env node
/**
 * CLI Compiler for U.S. Government-Universe
 *
 * Compiles raw source records, Census GUS inputs, and Individual State Descriptions
 * into deterministic, schema-validated normalized corpus files.
 */

import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { ALL_STATE_AUTHORITY_RECORDS } from "../../../src/source/government-universe/authority_data.js";
import { normalizeGovernmentUniverse } from "../../../src/source/government-universe/normalizer.js";
import { REPRESENTATIVE_GOVERNMENT_UNITS } from "../../../src/source/government-universe/sample_corpus.js";

async function main(): Promise<void> {
  const rootDir = process.cwd();
  const corpusDir = join(
    rootDir,
    "data",
    "source",
    "government-universe",
    "corpus",
  );
  const sourcesDir = join(
    rootDir,
    "data",
    "source",
    "government-universe",
    "sources",
  );

  await mkdir(corpusDir, { recursive: true });
  await mkdir(sourcesDir, { recursive: true });

  console.log("Compiling U.S. Government-Universe source corpus...");

  // 1. Save raw source inputs snapshot
  const rawSourcesPath = join(sourcesDir, "raw_census_gus_sample_inputs.json");
  await writeFile(
    rawSourcesPath,
    JSON.stringify(REPRESENTATIVE_GOVERNMENT_UNITS, null, 2) + "\n",
    "utf-8",
  );
  console.log(
    `Saved raw source inputs to ${rawSourcesPath} (${REPRESENTATIVE_GOVERNMENT_UNITS.length} units)`,
  );

  // 2. Normalize and compile government unit records
  const normalizedRecords = normalizeGovernmentUniverse(
    REPRESENTATIVE_GOVERNMENT_UNITS,
  );
  const normalizedPath = join(corpusDir, "normalized_government_universe.json");
  await writeFile(
    normalizedPath,
    JSON.stringify(normalizedRecords, null, 2) + "\n",
    "utf-8",
  );
  console.log(
    `Saved normalized government universe to ${normalizedPath} (${normalizedRecords.length} records)`,
  );

  // 3. Compile state authority qualitative records
  const authoritiesPath = join(corpusDir, "government_type_authorities.json");
  await writeFile(
    authoritiesPath,
    JSON.stringify(ALL_STATE_AUTHORITY_RECORDS, null, 2) + "\n",
    "utf-8",
  );
  console.log(
    `Saved state structural authorities to ${authoritiesPath} (${ALL_STATE_AUTHORITY_RECORDS.length} states)`,
  );

  console.log("\nCompilation summary:");
  console.log(
    `- Total Normalized Government Units: ${normalizedRecords.length}`,
  );
  console.log(
    `- State Structural Authority Records: ${ALL_STATE_AUTHORITY_RECORDS.length}`,
  );
  console.log("Deterministic compilation completed successfully.");
}

main().catch((err) => {
  console.error("Compilation failed:", err);
  process.exit(1);
});
