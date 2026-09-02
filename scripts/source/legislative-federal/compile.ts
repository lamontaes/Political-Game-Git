/**
 * Federal Legislative Source Corpus - Compile Script
 *
 * Compiles production source documents into a deterministic normalized corpus:
 * `data/source/legislative-federal/corpus/normalized_corpus.json`
 */

import {
  readFileSync,
  readdirSync,
  writeFileSync,
  mkdirSync,
  existsSync,
} from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  compileFederalLegislativeCorpus,
  type CongressGovBillPayload,
  type CongressGovHouseVotePayload,
  type GovInfoPackageSummary,
} from "../../../src/source/legislative-federal/index.js";
import {
  assertNotSyntheticPayload,
  assertProductionInputPath,
} from "../../../src/source/production-input-guard.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const ROOT_DIR = join(__dirname, "../../..");
/**
 * Production source documents only. Measures with placeholder identifiers
 * (H.R. 9999, S. 1234) live under `__synthetic_fixtures__/`, which
 * `assertProductionInputPath` refuses.
 */
const SOURCES_DIR = join(ROOT_DIR, "data/source/legislative-federal/sources");
const CORPUS_OUTPUT_PATH = join(
  ROOT_DIR,
  "data/source/legislative-federal/corpus/normalized_corpus.json",
);

export function loadAndCompileCorpus(): void {
  console.log("Compiling Federal Legislative Source Corpus...");

  assertProductionInputPath(SOURCES_DIR);

  // Read the directory rather than a hard-coded list, so a document added to
  // the source directory is compiled and one moved to quarantine disappears,
  // without an edit here that someone could forget to make.
  const NON_BILL_DOCUMENTS = new Set([
    "govinfo_package_sample.json",
    "house_roll_call_vote.json",
  ]);

  const billPayloads: CongressGovBillPayload[] = [];
  const billFiles = existsSync(SOURCES_DIR)
    ? readdirSync(SOURCES_DIR)
        .filter((f) => f.endsWith(".json") && !NON_BILL_DOCUMENTS.has(f))
        .sort()
    : [];

  for (const filename of billFiles) {
    const filePath = join(SOURCES_DIR, filename);
    assertProductionInputPath(filePath);
    const parsed: unknown = JSON.parse(readFileSync(filePath, "utf-8"));
    assertNotSyntheticPayload(parsed, filePath);
    billPayloads.push(parsed as CongressGovBillPayload);
  }

  const govinfoSummaries: GovInfoPackageSummary[] = [];
  const govinfoPath = join(SOURCES_DIR, "govinfo_package_sample.json");
  if (existsSync(govinfoPath)) {
    const raw = readFileSync(govinfoPath, "utf-8");
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      govinfoSummaries.push(...parsed);
    }
  }

  const houseVotePayloads: CongressGovHouseVotePayload[] = [];
  const houseVotePath = join(SOURCES_DIR, "house_roll_call_vote.json");
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
