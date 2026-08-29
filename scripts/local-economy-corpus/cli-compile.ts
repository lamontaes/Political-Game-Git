#!/usr/bin/env node
/**
 * CLI: Compile Local Economy & Labor-Market Source Corpus
 *
 * Ingests BEA Regional and BLS QCEW source fixtures and outputs
 * a deterministic, normalized, checksummed corpus package.
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { LocalEconomyCorpusCompiler } from "../../src/local_economy_corpus/compiler.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, "../../");

const FIXTURES_DIR = path.join(ROOT_DIR, "data/local_economy_source/fixtures");
const CORPUS_OUTPUT_PATH = path.join(
  ROOT_DIR,
  "data/local_economy_source/corpus/normalized_economy_corpus.json",
);

function runCompilation() {
  console.log("=== COMPILING LOCAL ECONOMY & LABOR-MARKET SOURCE CORPUS ===");
  const compiler = new LocalEconomyCorpusCompiler();

  // 1. Ingest BEA fixtures
  const beaDir = path.join(FIXTURES_DIR, "bea");
  if (fs.existsSync(beaDir)) {
    const files = fs.readdirSync(beaDir).filter((f) => f.endsWith(".json"));
    for (const file of files) {
      const filePath = path.join(beaDir, file);
      const raw = JSON.parse(fs.readFileSync(filePath, "utf-8"));
      const count = compiler.ingest({
        provider: "bea_regional",
        raw: raw.data || raw,
      });
      console.log(`[BEA] Ingested ${count} observations from ${file}`);
    }
  }

  // 2. Ingest QCEW fixtures
  const qcewDir = path.join(FIXTURES_DIR, "qcew");
  if (fs.existsSync(qcewDir)) {
    const files = fs.readdirSync(qcewDir).filter((f) => f.endsWith(".json"));
    for (const file of files) {
      const filePath = path.join(qcewDir, file);
      const raw = JSON.parse(fs.readFileSync(filePath, "utf-8"));
      const count = compiler.ingest({
        provider: "bls_qcew",
        raw: raw.data || raw,
      });
      console.log(`[QCEW] Ingested ${count} observations from ${file}`);
    }
  }

  // 3. Compile Package (using deterministic timestamp for reproducible builds)
  const timestamp = "2026-08-28T00:00:00.000Z";
  const corpus = compiler.compile(timestamp);

  // Ensure output directory exists
  const outDir = path.dirname(CORPUS_OUTPUT_PATH);
  if (!fs.existsSync(outDir)) {
    fs.mkdirSync(outDir, { recursive: true });
  }

  fs.writeFileSync(
    CORPUS_OUTPUT_PATH,
    JSON.stringify(corpus, null, 2),
    "utf-8",
  );

  console.log("\nCompilation Succeeded!");
  console.log(`Output File: ${CORPUS_OUTPUT_PATH}`);
  console.log(`Total Observations: ${corpus.manifest.totalObservations}`);
  console.log(`Total Series: ${corpus.manifest.totalSeries}`);
  console.log(`Total Jurisdictions: ${corpus.manifest.totalJurisdictions}`);
  console.log(`Package Checksum: ${corpus.buildMetadata.checksum}`);
  console.log("============================================================");
}

runCompilation();
