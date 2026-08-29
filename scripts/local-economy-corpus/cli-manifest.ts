#!/usr/bin/env node
/**
 * CLI: Generate Manifest for Local Economy & Labor-Market Source Corpus
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { buildLocalEconomyManifest } from "../../src/local_economy_corpus/manifest_builder.js";
import type { NormalizedEconomyCorpusPackage } from "../../src/local_economy_corpus/types.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, "../../");

const CORPUS_PATH = path.join(
  ROOT_DIR,
  "data/local_economy_source/corpus/normalized_economy_corpus.json",
);
const MANIFEST_OUTPUT_PATH = path.join(
  ROOT_DIR,
  "data/local_economy_source/manifests/local_economy_manifest.json",
);

function runManifestGeneration() {
  console.log("=== GENERATING LOCAL ECONOMY MANIFEST ===");

  if (!fs.existsSync(CORPUS_PATH)) {
    console.error(
      `Error: Corpus file not found at ${CORPUS_PATH}. Run 'npm run compile:economy' first.`,
    );
    process.exit(1);
  }

  const corpus: NormalizedEconomyCorpusPackage = JSON.parse(
    fs.readFileSync(CORPUS_PATH, "utf-8"),
  );

  const manifest = buildLocalEconomyManifest(
    corpus.observations,
    corpus.vintages,
    "2026-08-28T00:00:00.000Z",
  );

  const outDir = path.dirname(MANIFEST_OUTPUT_PATH);
  if (!fs.existsSync(outDir)) {
    fs.mkdirSync(outDir, { recursive: true });
  }

  fs.writeFileSync(
    MANIFEST_OUTPUT_PATH,
    JSON.stringify(manifest, null, 2),
    "utf-8",
  );

  console.log(`Manifest Generated at: ${MANIFEST_OUTPUT_PATH}`);
  console.log(`Total Jurisdictions: ${manifest.totalJurisdictions}`);
  console.log(`Total Observations: ${manifest.totalObservations}`);
  console.log(`Manifest SHA-256: ${manifest.sha256}`);
  console.log("=========================================");
}

runManifestGeneration();
