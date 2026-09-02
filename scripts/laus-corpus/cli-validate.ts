/**
 * Validation CLI for BLS LAUS Source Corpus Integrity and Invariants
 */

import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import type {
  LausCompiledCorpus,
  RawSourceArtifact,
} from "../../src/laus_corpus/types.ts";

const REPO_ROOT = path.resolve(import.meta.dirname, "../..");
const RAW_DIR = path.join(REPO_ROOT, "data/laus/raw");
const COMPILED_DIR = path.join(REPO_ROOT, "data/laus/compiled");

export function validateLausCorpus(): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  // 1. Validate Raw Manifest & File Hashes
  const manifestPath = path.join(RAW_DIR, "raw-manifest.json");
  if (!fs.existsSync(manifestPath)) {
    errors.push(`Raw manifest not found at ${manifestPath}`);
  } else {
    const artifacts: RawSourceArtifact[] = JSON.parse(
      fs.readFileSync(manifestPath, "utf-8"),
    );
    for (const art of artifacts) {
      const fullPath = path.join(REPO_ROOT, art.relativeFilePath);
      if (!fs.existsSync(fullPath)) {
        errors.push(`Raw source file missing: ${art.relativeFilePath}`);
        continue;
      }
      const fileBytes = fs.readFileSync(fullPath);
      const actualHash = crypto
        .createHash("sha256")
        .update(fileBytes)
        .digest("hex");
      if (actualHash !== art.sha256Hex) {
        errors.push(
          `Hash mismatch for ${art.relativeFilePath}: expected ${art.sha256Hex}, got ${actualHash}`,
        );
      }
    }
  }

  // 2. Validate Compiled Corpus
  const compiledPath = path.join(COMPILED_DIR, "laus-compiled-corpus.json");
  if (!fs.existsSync(compiledPath)) {
    errors.push(`Compiled corpus not found at ${compiledPath}`);
  } else {
    const compiled: LausCompiledCorpus = JSON.parse(
      fs.readFileSync(compiledPath, "utf-8"),
    );

    if (compiled.manifest.corpusId !== "bls-laus-local-unemployment-v1") {
      errors.push(`Invalid corpusId: ${compiled.manifest.corpusId}`);
    }

    if (compiled.areas.length !== compiled.manifest.totalAreas) {
      errors.push(
        `Area count mismatch: manifest says ${compiled.manifest.totalAreas}, got ${compiled.areas.length}`,
      );
    }

    if (compiled.series.length !== compiled.manifest.totalSeries) {
      errors.push(
        `Series count mismatch: manifest says ${compiled.manifest.totalSeries}, got ${compiled.series.length}`,
      );
    }

    if (compiled.observations.length !== compiled.manifest.totalObservations) {
      errors.push(
        `Observation count mismatch: manifest says ${compiled.manifest.totalObservations}, got ${compiled.observations.length}`,
      );
    }

    // Invariant check: missing/suppressed observations must never have numeric zero coerced
    for (const obs of compiled.observations) {
      if (obs.status === "MISSING" || obs.status === "SUPPRESSED") {
        if (obs.value !== null) {
          errors.push(
            `Observation ${obs.seriesId} ${obs.year} ${obs.period} has status ${obs.status} but value is not null (${obs.value})`,
          );
        }
      }
    }
  }

  const valid = errors.length === 0;
  if (valid) {
    console.log("BLS LAUS Corpus Integrity Validation Passed!");
  } else {
    console.error("BLS LAUS Corpus Integrity Validation Failed:");
    for (const err of errors) {
      console.error(` - ${err}`);
    }
  }

  return { valid, errors };
}

if (
  import.meta.url.endsWith(process.argv[1]) ||
  process.argv[1]?.includes("cli-validate")
) {
  const { valid } = validateLausCorpus();
  process.exit(valid ? 0 : 1);
}
