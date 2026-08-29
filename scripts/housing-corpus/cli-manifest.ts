#!/usr/bin/env node
/**
 * CLI Manifest Builder for Housing Affordability Coverage
 *
 * Usage: node --import tsx scripts/housing-corpus/cli-manifest.ts
 */

import { existsSync, readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { compileHousingCorpus } from "../../src/housing_affordability_corpus/compiler.js";
import { buildNationalHousingCoverageManifest } from "../../src/housing_affordability_corpus/manifest_builder.js";
import { canonicalJsonStringify } from "../../src/housing_affordability_corpus/provenance.js";
import type { CompiledHousingCorpus } from "../../src/housing_affordability_corpus/types.js";

async function main() {
  console.log(
    "==================================================================",
  );
  console.log("  NATIONAL HOUSING COVERAGE MANIFEST GENERATOR");
  console.log(
    "==================================================================\n",
  );

  const corpusFile = resolve(
    process.cwd(),
    "data/housing_affordability/corpus/normalized_housing_corpus.json",
  );
  let corpus: CompiledHousingCorpus;

  if (existsSync(corpusFile)) {
    corpus = JSON.parse(
      readFileSync(corpusFile, "utf-8"),
    ) as CompiledHousingCorpus;
  } else {
    console.log("Corpus not found; compiling from raw sources...");
    corpus = compileHousingCorpus();
  }

  const manifest = buildNationalHousingCoverageManifest(corpus);
  const manifestFile = resolve(
    process.cwd(),
    "data/housing_affordability/manifests/national_housing_coverage_manifest.json",
  );

  const manifestDir = dirname(manifestFile);
  if (!existsSync(manifestDir)) {
    mkdirSync(manifestDir, { recursive: true });
  }

  writeFileSync(manifestFile, canonicalJsonStringify(manifest) + "\n", "utf-8");

  console.log(`[OK] Generated manifest: ${manifestFile}`);
  console.log(
    `- Total Tracked Jurisdictions: ${manifest.totalJurisdictionsCount}`,
  );
  console.log(
    `- Complete Coverage (FMR + IL + CHAS): ${manifest.completeCoverageCount}`,
  );
  console.log(`- Manifest SHA-256: ${manifest.manifestSha256}\n`);

  for (const j of manifest.jurisdictions) {
    console.log(
      `  * [${j.geoId}] ${j.name} (${j.stateAbbr}) | FMR 2BR: $${j.fmr2Br ?? "N/A"} | MFI: $${j.medianFamilyIncome?.toLocaleString() ?? "N/A"} | Severe Burden Rate: ${j.severeCostBurdenRate !== null ? (j.severeCostBurdenRate * 100).toFixed(1) + "%" : "N/A"}`,
    );
  }
  console.log();
}

main().catch((err) => {
  console.error("Manifest generation error:", err);
  process.exit(1);
});
