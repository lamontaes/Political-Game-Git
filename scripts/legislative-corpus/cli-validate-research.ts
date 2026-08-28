import fs from "fs";
import path from "path";
import { runCorpusCompilation } from "./cli-compile.js";
import { validateResearchEpisode } from "../../src/legislative_corpus/research_validator.js";
import type { ResearchValidationEpisode } from "../../src/legislative_corpus/types.js";

const RESEARCH_FIXTURES_DIR = path.resolve(process.cwd(), "data/legislative_source/fixtures/research_validation");

export function runResearchValidation() {
  console.log("================================================================================");
  console.log("POLITICAL GAME — RESEARCH PACK VALIDATION SEAM");
  console.log("================================================================================");

  const corpus = runCorpusCompilation();

  if (!fs.existsSync(RESEARCH_FIXTURES_DIR)) {
    console.log("No research validation fixtures found.");
    return;
  }

  const files = fs.readdirSync(RESEARCH_FIXTURES_DIR).filter((f) => f.endsWith(".json"));
  console.log(`\nEvaluating ${files.length} research validation episode(s)...`);

  let totalValid = 0;
  let totalInvalid = 0;

  for (const file of files) {
    const fullPath = path.join(RESEARCH_FIXTURES_DIR, file);
    const episode = JSON.parse(fs.readFileSync(fullPath, "utf-8")) as ResearchValidationEpisode;
    const result = validateResearchEpisode(episode, corpus);

    console.log("--------------------------------------------------------------------------------");
    console.log(`Episode ID: ${result.episodeId} (File: ${file})`);
    console.log(`Measure:    ${result.measureIdentifier}`);
    console.log(`Status:     ${result.valid ? "VALID (MATCHES CORPUS TRUTH)" : "CONTRADICTIONS DETECTED"}`);
    console.log(`Summary:    ${result.matchSummary}`);

    if (!result.valid) {
      totalInvalid++;
      console.log("Discrepancies found:");
      for (const d of result.discrepancies) {
        console.log(`  - [${d.severity.toUpperCase()}] ${d.field}:`);
        console.log(`      Claimed: ${JSON.stringify(d.claimedValue)}`);
        console.log(`      Corpus:  ${JSON.stringify(d.corpusValue)}`);
        console.log(`      Detail:  ${d.explanation}`);
      }
    } else {
      totalValid++;
    }
  }

  console.log("================================================================================");
  console.log(`RESEARCH VALIDATION COMPLETED: ${totalValid} valid episode(s), ${totalInvalid} contradiction fixture(s) accurately caught.`);
  console.log("================================================================================");
}

if (process.argv[1] && import.meta.url.endsWith(path.basename(process.argv[1]))) {
  runResearchValidation();
}
