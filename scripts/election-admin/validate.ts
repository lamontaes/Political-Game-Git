#!/usr/bin/env node
import * as fs from "node:fs";
import * as path from "node:path";
import type { NormalizedElectionAdminCorpus } from "../../src/election_admin/types";
import { validateElectionAdminCorpus } from "../../src/election_admin/validator";

console.log("================================================================================");
console.log("POLITICAL GAME — ELECTION ADMINISTRATION INTEGRITY VALIDATOR");
console.log("================================================================================");

const baseDir = process.cwd();
const corpusPath = path.join(
  baseDir,
  "data/election_administration/corpus/normalized_corpus.json",
);

if (!fs.existsSync(corpusPath)) {
  console.error(`Error: Normalized corpus not found at ${corpusPath}. Run 'npm run compile:election-admin' first.`);
  process.exit(1);
}

const corpus: NormalizedElectionAdminCorpus = JSON.parse(
  fs.readFileSync(corpusPath, "utf8"),
);

const validation = validateElectionAdminCorpus(corpus);

console.log(`\nValidation Summary:`);
console.log(`- Status:         ${validation.valid ? "PASSED (VALID)" : "FAILED (INVALID)"}`);
console.log(`- Total Errors:   ${validation.totalErrors}`);
console.log(`- Total Warnings: ${validation.totalWarnings}`);

if (validation.issues.length > 0) {
  console.log(`\nDiagnostics:`);
  for (const issue of validation.issues) {
    const icon = issue.severity === "error" ? "❌ ERROR" : "⚠️ WARN";
    console.log(`  ${icon} [${issue.rule}] ${issue.recordId}: ${issue.message}`);
  }
}

if (!validation.valid) {
  console.error("\nIntegrity validation failed.");
  process.exit(1);
} else {
  console.log("\nAll integrity and semantic isolation invariants successfully verified.");
  console.log("================================================================================");
}
