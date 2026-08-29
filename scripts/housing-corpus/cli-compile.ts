#!/usr/bin/env node
/**
 * CLI Compiler for Housing Affordability Corpus
 *
 * Usage: node --import tsx scripts/housing-corpus/cli-compile.ts
 */

import { compileHousingCorpus } from "../../src/housing_affordability_corpus/compiler.js";

async function main() {
  console.log(
    "==================================================================",
  );
  console.log("  NATIONAL HOUSING & AFFORDABILITY SOURCE CORPUS COMPILER");
  console.log(
    "==================================================================\n",
  );

  const startTime = Date.now();
  const corpus = compileHousingCorpus();
  const duration = Date.now() - startTime;

  console.log(`[OK] Compilation finished in ${duration}ms`);
  console.log(
    `- Geographic Coverage: ${corpus.geographicCoverage.length} jurisdictions`,
  );
  console.log(`- Fair Market Rent Records: ${corpus.fmrRecords.length}`);
  console.log(`- Income Limit Records: ${corpus.incomeLimitRecords.length}`);
  console.log(`- CHAS Affordability Cells: ${corpus.chasRecords.length}`);
  console.log(`- Calibration Profiles: ${corpus.calibrationProfiles.length}`);
  console.log(`- Corpus SHA-256: ${corpus.corpusSha256}`);
  console.log(
    `- Output: data/housing_affordability/corpus/normalized_housing_corpus.json\n`,
  );
}

main().catch((err) => {
  console.error("Compilation error:", err);
  process.exit(1);
});
