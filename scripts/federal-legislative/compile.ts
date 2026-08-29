/**
 * Federal Legislative Source Corpus - Compile Script
 *
 * Compiles raw and fixture payloads into deterministic normalized corpus:
 * `data/federal_legislative_source/corpus/normalized_corpus.json`
 */

import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  compileFederalLegislativeCorpus,
  type CongressGovBillPayload,
  type CongressGovHouseVotePayload,
  type GovInfoPackageSummary,
} from "../../src/federal_legislative_corpus/index.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const ROOT_DIR = join(__dirname, "../..");
const FIXTURES_DIR = join(ROOT_DIR, "data/federal_legislative_source/fixtures");
const CORPUS_OUTPUT_PATH = join(
  ROOT_DIR,
  "data/federal_legislative_source/corpus/normalized_corpus.json",
);

export function loadAndCompileCorpus(): void {
  console.log("Compiling Federal Legislative Source Corpus...");

  const billFixtureFiles = [
    "ordinary_enacted_law_hr5376.json",
    "veto_unoverridden_hjres30.json",
    "veto_override_enacted_hr6395.json",
    "failed_floor_vote_hr.json",
    "unresolved_session_ended_s.json",
    "amendment_fixture_hamdt.json",
    "simple_resolution_hres.json",
    "concurrent_resolution_sconres.json",
  ];

  const billPayloads: CongressGovBillPayload[] = [];
  for (const filename of billFixtureFiles) {
    const filePath = join(FIXTURES_DIR, filename);
    if (existsSync(filePath)) {
      const raw = readFileSync(filePath, "utf-8");
      billPayloads.push(JSON.parse(raw) as CongressGovBillPayload);
    }
  }

  const govinfoSummaries: GovInfoPackageSummary[] = [];
  const govinfoPath = join(FIXTURES_DIR, "govinfo_package_sample.json");
  if (existsSync(govinfoPath)) {
    const raw = readFileSync(govinfoPath, "utf-8");
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      govinfoSummaries.push(...parsed);
    }
  }

  const houseVotePayloads: CongressGovHouseVotePayload[] = [];
  const houseVotePath = join(FIXTURES_DIR, "house_roll_call_vote.json");
  if (existsSync(houseVotePath)) {
    const raw = readFileSync(houseVotePath, "utf-8");
    houseVotePayloads.push(JSON.parse(raw) as CongressGovHouseVotePayload);
  }

  const bundle = compileFederalLegislativeCorpus({
    billPayloads,
    govinfoSummaries,
    houseVotePayloads,
    generationTimestamp: "2026-08-28T00:00:00.000Z",
  });

  const outDir = dirname(CORPUS_OUTPUT_PATH);
  if (!existsSync(outDir)) {
    mkdirSync(outDir, { recursive: true });
  }

  writeFileSync(CORPUS_OUTPUT_PATH, JSON.stringify(bundle, null, 2), "utf-8");
  console.log(`Successfully compiled federal corpus to ${CORPUS_OUTPUT_PATH}`);
  console.log(`Corpus SHA-256: ${bundle.corpusSha256}`);
  console.log(`Total Measures: ${bundle.measures.length}`);
  console.log(`Total House Votes: ${bundle.houseVotes.length}`);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  loadAndCompileCorpus();
}
