#!/usr/bin/env node
/**
 * CLI: Validate Local Economy & Labor-Market Source Corpus
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { validateCorpusPackage } from "../../src/local_economy_corpus/validator.js";
import type { NormalizedEconomyCorpusPackage } from "../../src/local_economy_corpus/types.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, "../../");

const CORPUS_PATH = path.join(
  ROOT_DIR,
  "data/local_economy_source/corpus/normalized_economy_corpus.json",
);

function runValidation() {
  console.log("=== VALIDATING LOCAL ECONOMY & LABOR-MARKET SOURCE CORPUS ===");

  if (!fs.existsSync(CORPUS_PATH)) {
    console.error(
      `Error: Corpus file not found at ${CORPUS_PATH}. Run 'npm run compile:economy' first.`,
    );
    process.exit(1);
  }

  const corpus: NormalizedEconomyCorpusPackage = JSON.parse(
    fs.readFileSync(CORPUS_PATH, "utf-8"),
  );

  const result = validateCorpusPackage(corpus);

  console.log(`Observations checked: ${result.totalObservationsChecked}`);
  console.log(`Jurisdictions checked: ${result.totalJurisdictionsChecked}`);

  if (result.warnings.length > 0) {
    console.log(`\nWarnings (${result.warnings.length}):`);
    for (const w of result.warnings) {
      console.warn(`[${w.code}] ${w.message}`);
    }
  }

  if (result.errors.length > 0) {
    console.error(`\nValidation Errors (${result.errors.length}):`);
    for (const err of result.errors) {
      console.error(`[${err.code}] ${err.message}`);
    }
    console.log("\n❌ Corpus Validation FAILED!");
    process.exit(1);
  }

  console.log(
    "\n✅ Corpus Validation PASSED! All integrity invariants verified.",
  );
  console.log("=============================================================");
}

runValidation();
