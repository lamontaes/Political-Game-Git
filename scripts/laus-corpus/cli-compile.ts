/**
 * Compiler CLI for BLS LAUS Source Corpus
 */

import fs from "node:fs";
import path from "node:path";
import { compileCorpus } from "../../src/laus_corpus/compiler.ts";
import type { RawSourceArtifact } from "../../src/laus_corpus/types.ts";

const REPO_ROOT = path.resolve(import.meta.dirname, "../..");
const RAW_DIR = path.join(REPO_ROOT, "data/laus/raw");
const COMPILED_DIR = path.join(REPO_ROOT, "data/laus/compiled");

export function runCompile(): string {
  const manifestPath = path.join(RAW_DIR, "raw-manifest.json");
  let artifacts: RawSourceArtifact[] = [];
  if (fs.existsSync(manifestPath)) {
    artifacts = JSON.parse(fs.readFileSync(manifestPath, "utf-8"));
  }

  const readRaw = (filename: string): string | undefined => {
    const full = path.join(RAW_DIR, filename);
    return fs.existsSync(full) ? fs.readFileSync(full, "utf-8") : undefined;
  };

  const rawFiles = {
    areaType: readRaw("la.area_type"),
    measure: readRaw("la.measure"),
    footnote: readRaw("la.footnote"),
    area: readRaw("la.area"),
    series: readRaw("la.series"),
    data: readRaw("la.data.sample"),
  };

  console.log("Compiling BLS LAUS corpus...");
  const compiled = compileCorpus(rawFiles, {
    blsReleaseVintage: "2026-08",
    sourceArtifacts: artifacts,
  });

  fs.mkdirSync(COMPILED_DIR, { recursive: true });
  const compiledPath = path.join(COMPILED_DIR, "laus-compiled-corpus.json");
  const jsonStr = JSON.stringify(compiled, null, 2);
  fs.writeFileSync(compiledPath, jsonStr, "utf-8");

  console.log(`Compiled corpus saved to ${compiledPath}`);
  console.log(`Areas: ${compiled.manifest.totalAreas}`);
  console.log(`Series: ${compiled.manifest.totalSeries}`);
  console.log(`Observations: ${compiled.manifest.totalObservations}`);
  console.log(`Reconciliations: ${compiled.manifest.reconciliationSummary.totalPeriodsChecked} (${compiled.manifest.reconciliationSummary.reconciledCount} reconciled)`);

  return compiledPath;
}

if (import.meta.url.endsWith(process.argv[1]) || process.argv[1]?.includes("cli-compile")) {
  runCompile();
}
