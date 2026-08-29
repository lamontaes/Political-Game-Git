#!/usr/bin/env node
/* global console, process */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { compileStormCorpus } from "../../src/storm_corpus/compiler";
import type {
  RawStormEpisodeInput,
  RawStormEventInput,
} from "../../src/storm_corpus/normalizer";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, "../..");

const fixturesDir = path.join(rootDir, "data/noaa_storm_corpus/fixtures");
const corpusOutputDir = path.join(rootDir, "data/noaa_storm_corpus/corpus");
const aggregatesOutputDir = path.join(
  rootDir,
  "data/noaa_storm_corpus/aggregates",
);
const manifestsOutputDir = path.join(
  rootDir,
  "data/noaa_storm_corpus/manifests",
);

fs.mkdirSync(corpusOutputDir, { recursive: true });
fs.mkdirSync(aggregatesOutputDir, { recursive: true });
fs.mkdirSync(manifestsOutputDir, { recursive: true });

console.log("Compiling NOAA Storm Events Source Corpus...\n");

const rawEvents: RawStormEventInput[] = [];
const rawEpisodes: RawStormEpisodeInput[] = [];

if (fs.existsSync(fixturesDir)) {
  const files = fs.readdirSync(fixturesDir).filter((f) => f.endsWith(".json"));
  for (const file of files) {
    const fullPath = path.join(fixturesDir, file);
    try {
      const content = JSON.parse(fs.readFileSync(fullPath, "utf8"));
      if (Array.isArray(content)) {
        for (const item of content) {
          if (item.eventId !== undefined) {
            rawEvents.push(item);
          } else if (item.episodeId !== undefined) {
            rawEpisodes.push(item);
          }
        }
      }
      console.log(`Loaded fixture: ${file}`);
    } catch (err) {
      console.error(`Error loading fixture ${file}:`, err);
    }
  }
}

console.log(`\nTotal raw events loaded: ${rawEvents.length}`);
console.log(`Total raw episodes loaded: ${rawEpisodes.length}\n`);

const compilation = compileStormCorpus({
  rawEvents,
  rawEpisodes,
  vintage:
    "NOAA NCEI Storm Events Database 1950-2026 (Published Month: 2026-06)",
  generatedAt: "2026-08-28T00:00:00.000Z",
});

const corpusPath = path.join(corpusOutputDir, "normalized_corpus.json");
const aggregatesPath = path.join(
  aggregatesOutputDir,
  "derived_aggregates.json",
);
const manifestPath = path.join(manifestsOutputDir, "coverage_manifest.json");

fs.writeFileSync(
  corpusPath,
  JSON.stringify(compilation.corpus, null, 2) + "\n",
  "utf8",
);
fs.writeFileSync(
  aggregatesPath,
  JSON.stringify(compilation.aggregates, null, 2) + "\n",
  "utf8",
);
fs.writeFileSync(
  manifestPath,
  JSON.stringify(compilation.manifest, null, 2) + "\n",
  "utf8",
);

console.log(`Wrote normalized corpus to: ${corpusPath}`);
console.log(`Wrote derived aggregates to: ${aggregatesPath}`);
console.log(`Wrote coverage manifest to: ${manifestPath}`);

console.log("\n--- Validation Summary ---");
console.log(`Status: ${compilation.validation.valid ? "VALID" : "INVALID"}`);
console.log(`Errors: ${compilation.validation.errors.length}`);
console.log(`Warnings: ${compilation.validation.warnings.length}`);

if (compilation.validation.errors.length > 0) {
  console.error("\nErrors:");
  for (const err of compilation.validation.errors) {
    console.error(`  [${err.rule}] ${err.entityId}: ${err.message}`);
  }
  process.exit(1);
}

if (compilation.validation.warnings.length > 0) {
  console.warn("\nWarnings:");
  for (const w of compilation.validation.warnings) {
    console.warn(`  [${w.rule}] ${w.entityId}: ${w.message}`);
  }
}

console.log("\nCorpus compilation successful.\n");
