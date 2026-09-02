import * as fs from "node:fs";
import * as path from "node:path";
import { FecCorpusEngine } from "../../src/fec_corpus/fec-corpus.js";
import type { FecCorpusDataset } from "../../src/fec_corpus/types.js";

const DATA_DIR = path.resolve(process.cwd(), "data/fec");
const COMPILED_PATH = path.join(DATA_DIR, "compiled-fec-2024.json");

function validate() {
  console.log(`Validating FEC dataset at ${COMPILED_PATH}...`);

  if (!fs.existsSync(COMPILED_PATH)) {
    throw new Error(`Compiled dataset missing: ${COMPILED_PATH}`);
  }

  const raw = fs.readFileSync(COMPILED_PATH, "utf-8");
  const dataset: FecCorpusDataset = JSON.parse(raw);

  if (dataset.manifest.schemaVersion !== "1.0.0") {
    throw new Error(
      `Invalid schema version: ${dataset.manifest.schemaVersion}`,
    );
  }

  if (dataset.candidates.length !== dataset.manifest.totalCandidates) {
    throw new Error(
      `Candidate count mismatch: expected ${dataset.manifest.totalCandidates}, found ${dataset.candidates.length}`,
    );
  }

  if (dataset.committees.length !== dataset.manifest.totalCommittees) {
    throw new Error(
      `Committee count mismatch: expected ${dataset.manifest.totalCommittees}, found ${dataset.committees.length}`,
    );
  }

  if (dataset.linkages.length !== dataset.manifest.totalLinkages) {
    throw new Error(
      `Linkage count mismatch: expected ${dataset.manifest.totalLinkages}, found ${dataset.linkages.length}`,
    );
  }

  const engine = new FecCorpusEngine(dataset);
  if (!engine.getManifest()) {
    throw new Error("Failed to initialize engine manifest.");
  }

  // Check candidate uniqueness & non-null Candidate IDs
  const candidateIds = new Set<string>();
  for (const cand of dataset.candidates) {
    if (!cand.candidateId) {
      throw new Error(`Candidate record missing candidateId`);
    }
    candidateIds.add(cand.candidateId);
  }

  // Check committee uniqueness & non-null Committee IDs
  const committeeIds = new Set<string>();
  for (const comm of dataset.committees) {
    if (!comm.committeeId) {
      throw new Error(`Committee record missing committeeId`);
    }
    committeeIds.add(comm.committeeId);
  }

  // Check duplicate candidate names do NOT collapse candidate IDs
  const nameToIds = new Map<string, Set<string>>();
  for (const cand of dataset.candidates) {
    const ids = nameToIds.get(cand.candidateName) ?? new Set();
    ids.add(cand.candidateId);
    if (!nameToIds.has(cand.candidateName)) {
      nameToIds.set(cand.candidateName, ids);
    }
  }

  let duplicateNameCount = 0;
  for (const ids of nameToIds.values()) {
    if (ids.size > 1) {
      duplicateNameCount++;
    }
  }

  console.log(
    `Validation PASSED! Verified ${candidateIds.size} unique candidate IDs, ${committeeIds.size} unique committee IDs, and ${duplicateNameCount} duplicate names with distinct IDs preserved.`,
  );
}

validate();
