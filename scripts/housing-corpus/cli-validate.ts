#!/usr/bin/env node
/**
 * CLI Validation Runner for Housing Affordability Corpus
 *
 * Usage: node --import tsx scripts/housing-corpus/cli-validate.ts
 */

import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { compileHousingCorpus } from "../../src/housing_affordability_corpus/compiler.js";
import { validateHousingCorpus } from "../../src/housing_affordability_corpus/validator.js";
import type { CompiledHousingCorpus } from "../../src/housing_affordability_corpus/types.js";

async function main() {
  console.log(
    "==================================================================",
  );
  console.log("  NATIONAL HOUSING CORPUS INTEGRITY VALIDATOR");
  console.log(
    "==================================================================\n",
  );

  const corpusFile = resolve(
    process.cwd(),
    "data/housing_affordability/corpus/normalized_housing_corpus.json",
  );
  let corpus: CompiledHousingCorpus;

  if (existsSync(corpusFile)) {
    corpus = JSON.parse(
      readFileSync(corpusFile, "utf-8"),
    ) as CompiledHousingCorpus;
  } else {
    console.log("Corpus not found; compiling from raw sources...");
    corpus = compileHousingCorpus();
  }

  const report = validateHousingCorpus(corpus);

  console.log(
    `Validation Status: ${report.isValid ? "PASS [OK]" : "FAIL [CRITICAL ISSUES FOUND]"}`,
  );
  console.log(`- Critical Issues: ${report.criticalIssuesCount}`);
  console.log(`- Warnings: ${report.warningsCount}`);
  console.log(`- Validated SHA-256: ${report.corpusSha256}\n`);

  if (report.issues.length > 0) {
    console.log("Issues detected:");
    for (const issue of report.issues) {
      const tag = issue.severity === "critical" ? "[CRITICAL]" : "[WARNING]";
      console.log(
        `  ${tag} (${issue.code}) ${issue.recordId ? `[${issue.recordId}] ` : ""}${issue.message}`,
      );
    }
    console.log();
  }

  if (!report.isValid) {
    process.exit(1);
  }
}

main().catch((err) => {
  console.error("Validation runner error:", err);
  process.exit(1);
});
