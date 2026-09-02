/**
 * Federal Legislative Source Corpus - Validation Script
 *
 * Runs full semantic, structural, and cryptographic validation on:
 * `data/federal_legislative_source/corpus/normalized_corpus.json`
 */

import { readFileSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  validateFederalCorpusBundle,
  type FederalCorpusBundle,
} from "../../src/federal_legislative_corpus/index.js";
import { loadAndCompileCorpus } from "./compile.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const ROOT_DIR = join(__dirname, "../..");
const CORPUS_PATH = join(
  ROOT_DIR,
  "data/federal_legislative_source/corpus/normalized_corpus.json",
);

export function runValidation(): boolean {
  console.log("Validating Federal Legislative Source Corpus...");

  if (!existsSync(CORPUS_PATH)) {
    loadAndCompileCorpus();
  }

  const rawCorpus = readFileSync(CORPUS_PATH, "utf-8");
  const bundle = JSON.parse(rawCorpus) as FederalCorpusBundle;

  const report = validateFederalCorpusBundle(bundle);

  console.log(`Validation Results:`);
  console.log(`- Is Valid: ${report.isValid ? "YES" : "NO"}`);
  console.log(`- Total Measures Checked: ${report.totalMeasuresChecked}`);
  console.log(`- Total House Votes Checked: ${report.totalVotesChecked}`);
  console.log(`- Errors: ${report.errorCount}`);
  console.log(`- Warnings: ${report.warningCount}`);

  if (report.issues.length > 0) {
    console.log("\nIssues Reported:");
    for (const issue of report.issues) {
      const prefix = issue.severity === "error" ? "[ERROR]" : "[WARN]";
      console.log(`${prefix} [${issue.code}] ${issue.message}`);
    }
  }

  if (!report.isValid) {
    console.error("\nFederal legislative corpus validation failed!");
    process.exit(1);
  }

  console.log("\nFederal legislative corpus validation passed cleanly.");
  return true;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  runValidation();
}
