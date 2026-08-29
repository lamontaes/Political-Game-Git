#!/usr/bin/env node
/* global console, process */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { validateStormCorpus } from "../../src/storm_corpus/validator";
import type { StormCorpus } from "../../src/storm_corpus/types";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, "../..");

const corpusPath = path.join(
  rootDir,
  "data/noaa_storm_corpus/corpus/normalized_corpus.json",
);

if (!fs.existsSync(corpusPath)) {
  console.error(`Error: Normalized corpus file not found at ${corpusPath}`);
  console.error("Run `npm run compile:storm-corpus` first.");
  process.exit(1);
}

console.log(`Validating NOAA Storm Events Corpus at: ${corpusPath}\n`);

const corpus: StormCorpus = JSON.parse(fs.readFileSync(corpusPath, "utf8"));
const result = validateStormCorpus(corpus);

console.log(`Total Events: ${corpus.totalEvents}`);
console.log(`Total Episodes: ${corpus.totalEpisodes}`);
console.log(`Validation Status: ${result.valid ? "PASSED" : "FAILED"}`);
console.log(`Errors: ${result.errors.length}`);
console.log(`Warnings: ${result.warnings.length}\n`);

if (result.errors.length > 0) {
  console.error("Validation Errors:");
  for (const err of result.errors) {
    console.error(`  [${err.rule}] ${err.entityId}: ${err.message}`);
  }
  process.exit(1);
}

if (result.warnings.length > 0) {
  console.warn("Validation Warnings:");
  for (const w of result.warnings) {
    console.warn(`  [${w.rule}] ${w.entityId}: ${w.message}`);
  }
}

console.log("All corpus integrity constraints satisfied.\n");
