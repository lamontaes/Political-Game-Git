#!/usr/bin/env node
import * as fs from "node:fs";
import * as path from "node:path";
import { buildElectionAdminManifest } from "../../src/election_admin/manifest_builder";
import type { NormalizedElectionAdminCorpus } from "../../src/election_admin/types";

console.log("================================================================================");
console.log("POLITICAL GAME — ELECTION ADMINISTRATION MANIFEST GENERATOR");
console.log("================================================================================");

const baseDir = process.cwd();
const corpusPath = path.join(
  baseDir,
  "data/election_administration/corpus/normalized_corpus.json",
);
const manifestPath = path.join(
  baseDir,
  "data/election_administration/manifests/election_admin_manifest.json",
);

if (!fs.existsSync(corpusPath)) {
  console.error(`Error: Normalized corpus not found at ${corpusPath}. Run 'npm run compile:election-admin' first.`);
  process.exit(1);
}

const corpus: NormalizedElectionAdminCorpus = JSON.parse(
  fs.readFileSync(corpusPath, "utf8"),
);

const manifest = buildElectionAdminManifest({
  eavsRecords: corpus.eavsRecords,
  policySurveys: corpus.policySurveys,
  cpsCalibrations: corpus.cpsCalibrations,
  historicalSeries: corpus.historicalSeries,
});

fs.mkdirSync(path.dirname(manifestPath), { recursive: true });
fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2), "utf8");

console.log(`Manifest successfully generated at ${manifestPath}:`);
console.log(`- Covered Jurisdictions: ${manifest.summary.totalJurisdictionsCovered}`);
console.log(`- Total Records:         ${manifest.summary.totalEavsRecords + manifest.summary.totalPolicySurveys + manifest.summary.totalCpsCalibrations + manifest.summary.totalHistoricalSeries}`);
console.log(`- Normalized Corpus SHA: ${manifest.corpusFileHashes.normalizedCorpusSha256}`);
console.log("================================================================================");
