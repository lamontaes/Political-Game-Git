import { runCorpusCompilation } from "./cli-compile.js";
import { runResearchValidation } from "./cli-validate-research.js";

export function runFullLegislativeCorpusValidation() {
  console.log(
    "================================================================================",
  );
  console.log("POLITICAL GAME — FULL LEGISLATIVE CORPUS VALIDATION SUITE");
  console.log(
    "================================================================================",
  );

  const corpus = runCorpusCompilation();

  // Validate invariants
  if (corpus.jurisdictions.length < 0) {
    throw new Error("Validation failed: No jurisdictions in compiled corpus.");
  }
  if (corpus.measures.length === 0) {
    throw new Error("Validation failed: No measures normalized.");
  }

  // Ensure all measures have valid provenance and non-empty IDs
  for (const m of corpus.measures) {
    if (!m.measureId || !m.provenance || !m.provenance.sha256) {
      throw new Error(
        `Validation failed: Measure ${m.identifier} missing ID or provenance SHA256.`,
      );
    }
  }

  // Ensure all votes link to an existing measure
  const measureIdSet = new Set(corpus.measures.map((m) => m.measureId));
  for (const v of corpus.votes) {
    if (!measureIdSet.has(v.measureId)) {
      throw new Error(
        `Validation failed: Vote ${v.voteId} references unindexed measure ${v.measureId}.`,
      );
    }
  }

  console.log("Running research pack validation seam...");
  runResearchValidation();

  console.log("\n>>> ALL LEGISLATIVE CORPUS INTEGRITY CHECKS PASSED <<<\n");
}

if (process.argv[1] && import.meta.url.endsWith("cli-validate-corpus.ts")) {
  runFullLegislativeCorpusValidation();
}
