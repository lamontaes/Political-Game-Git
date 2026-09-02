import fs from "node:fs";
import path from "node:path";
import { validateCommunityBaselineDataset } from "../../src/community_baselines/integrity";
import type { CommunityBaselineDataset } from "../../src/community_baselines/types";
import type { BaselineManifest } from "./compile-baselines";

const ROOT_DIR = path.resolve(import.meta.dirname, "../..");
const DATA_DIR = path.join(ROOT_DIR, "data/community_baselines");
const MANIFEST_PATH = path.join(DATA_DIR, "manifest.json");

export function validateAllBaselines(): boolean {
  if (!fs.existsSync(MANIFEST_PATH)) {
    console.error(`Missing manifest at ${MANIFEST_PATH}`);
    return false;
  }

  const manifest = JSON.parse(
    fs.readFileSync(MANIFEST_PATH, "utf8"),
  ) as BaselineManifest;
  let allValid = true;

  console.log(
    `Validating Community Baselines Manifest (version ${manifest.manifestVersion})...`,
  );
  console.log(`Registry variable count: ${manifest.variableRegistryCount}`);
  console.log(`Datasets listed: ${manifest.datasets.length}`);

  for (const entry of manifest.datasets) {
    const filePath = path.join(DATA_DIR, entry.filename);
    if (!fs.existsSync(filePath)) {
      console.error(`Missing dataset file: ${filePath}`);
      allValid = false;
      continue;
    }

    const content = fs.readFileSync(filePath, "utf8");
    const dataset = JSON.parse(content) as CommunityBaselineDataset;

    // Check SHA256 against manifest and dataset self-hash
    if (dataset.sha256 !== entry.sha256) {
      console.error(
        `SHA256 mismatch for ${entry.filename}: manifest=${entry.sha256}, dataset=${dataset.sha256}`,
      );
      allValid = false;
    }

    // Run deep domain integrity audit
    const report = validateCommunityBaselineDataset(dataset);
    if (!report.valid) {
      console.error(`Validation errors in ${entry.filename}:`);
      for (const err of report.errors) {
        console.error(`  - [${err.rule}] ${err.message}`);
      }
      allValid = false;
    } else {
      console.log(
        `✓ ${entry.filename}: ${report.recordCount} records, ${report.geographyCount} geographies verified.`,
      );
    }
  }

  if (allValid) {
    console.log(
      "All community baseline datasets passed integrity validation cleanly.",
    );
  } else {
    console.error("Community baseline validation failed.");
  }

  return allValid;
}

if (process.argv[1] && process.argv[1].endsWith("validate-baselines.ts")) {
  const success = validateAllBaselines();
  if (!success) {
    process.exit(1);
  }
}
