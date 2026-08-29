#!/usr/bin/env node
import { runCompilationFromDisk } from "../../src/election_admin/compiler";

console.log("================================================================================");
console.log("POLITICAL GAME — ELECTION ADMINISTRATION & PARTICIPATION SOURCE COMPILER");
console.log("================================================================================");

try {
  const result = runCompilationFromDisk();
  console.log(`\nSuccessfully compiled Election Administration & Participation Corpus:`);
  console.log(`- Total EAVS Records:            ${result.corpus.eavsRecords.length} (State: ${result.corpus.manifest.summary.totalStateEavsRecords}, County: ${result.corpus.manifest.summary.totalCountyEavsRecords})`);
  console.log(`- Total Policy Surveys:          ${result.corpus.policySurveys.length}`);
  console.log(`- Total CPS Calibration Records: ${result.corpus.cpsCalibrations.length}`);
  console.log(`- Total Historical Series:       ${result.corpus.historicalSeries.length}`);
  console.log(`- Total Covered Jurisdictions:   ${result.corpus.manifest.summary.totalJurisdictionsCovered}`);
  console.log(`\nWritten Artifacts:`);
  for (const filePath of result.writtenFiles) {
    console.log(`  ✓ ${filePath}`);
  }
  console.log(`\nManifest Hash (SHA-256): ${result.corpus.manifest.corpusFileHashes.normalizedCorpusSha256}`);
  console.log("================================================================================");
} catch (error) {
  console.error("Compilation failed:", error);
  process.exit(1);
}
