/**
 * Federal Legislative Source Corpus - Manifest Generator Script
 *
 * Generates structured federal coverage manifest:
 * `data/source/legislative-federal/manifests/federal_coverage_manifest.json`
 */

import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  buildFederalCoverageManifest,
  type FederalCorpusBundle,
} from "../../../src/source/legislative-federal/index.js";
import { loadAndCompileCorpus } from "./compile.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const ROOT_DIR = join(__dirname, "../../..");
const CORPUS_PATH = join(
  ROOT_DIR,
  "data/source/legislative-federal/corpus/normalized_corpus.json",
);
const MANIFEST_OUTPUT_PATH = join(
  ROOT_DIR,
  "data/source/legislative-federal/manifests/federal_coverage_manifest.json",
);

export function generateManifest(): void {
  console.log("Generating Federal Legislative Coverage Manifest...");

  if (!existsSync(CORPUS_PATH)) {
    loadAndCompileCorpus();
  }

  const rawCorpus = readFileSync(CORPUS_PATH, "utf-8");
  const bundle = JSON.parse(rawCorpus) as FederalCorpusBundle;

  const manifest = buildFederalCoverageManifest(bundle);

  const outDir = dirname(MANIFEST_OUTPUT_PATH);
  if (!existsSync(outDir)) {
    mkdirSync(outDir, { recursive: true });
  }

  writeFileSync(
    MANIFEST_OUTPUT_PATH,
    JSON.stringify(manifest, null, 2),
    "utf-8",
  );
  console.log(
    `Successfully generated federal coverage manifest to ${MANIFEST_OUTPUT_PATH}`,
  );
  console.log(
    `Covered Congresses: ${manifest.congresses.map((c) => c.congressNumber).join(", ")}`,
  );
  console.log(`Total Measures: ${manifest.totalMeasures}`);
  console.log(`Total Enacted Laws: ${manifest.totalEnactedLaws}`);
  console.log(`Total Vetoes: ${manifest.totalVetoes}`);
  console.log(`Total Veto Overrides: ${manifest.totalVetoOverrides}`);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  generateManifest();
}
