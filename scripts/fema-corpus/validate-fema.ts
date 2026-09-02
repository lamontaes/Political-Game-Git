import fs from "fs";
import path from "path";
import crypto from "crypto";
import { fileURLToPath } from "url";
import type { FemaCorpusDataset } from "../../src/fema_disasters/types";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const REPO_ROOT = path.resolve(__dirname, "../..");
const COMPILED_PATH = path.join(
  REPO_ROOT,
  "data/fema-disasters/compiled-fema-disasters.json",
);
const PINNED_RAW_PATH = path.join(
  REPO_ROOT,
  "data/fema-disasters/raw/fema-disaster-declarations-pinned.json",
);

const FORBIDDEN_FIELD_PATTERNS = [
  /rate/i,
  /probability/i,
  /risk/i,
  /severity/i,
  /casualty/i,
  /occurrence/i,
];

const FORBIDDEN_PR62_PATH_1 = ["src", "source"].join("/");
const FORBIDDEN_PR62_PATH_2 = ["data", "source"].join("/");

export interface ValidationResult {
  valid: boolean;
  errors: string[];
}

export function validateFemaCorpus(
  compiledPath = COMPILED_PATH,
  rawPath = PINNED_RAW_PATH,
): ValidationResult {
  const errors: string[] = [];

  if (!fs.existsSync(compiledPath)) {
    return { valid: false, errors: [`Compiled file missing: ${compiledPath}`] };
  }
  if (!fs.existsSync(rawPath)) {
    return { valid: false, errors: [`Raw pinned file missing: ${rawPath}`] };
  }

  const rawBytes = fs.readFileSync(rawPath);
  const calculatedRawSha256 = crypto
    .createHash("sha256")
    .update(rawBytes)
    .digest("hex");

  let dataset: FemaCorpusDataset;
  try {
    dataset = JSON.parse(fs.readFileSync(compiledPath, "utf-8"));
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return {
      valid: false,
      errors: [`Failed to parse compiled JSON: ${message}`],
    };
  }

  // 1. Schema Invariants
  if (dataset.schemaVersion !== "1.0.0") {
    errors.push(
      `Invalid schemaVersion: expected '1.0.0', got '${dataset.schemaVersion}'`,
    );
  }
  if (!dataset.provenance) {
    errors.push("Dataset missing required provenance object");
  } else {
    if (dataset.provenance.rawSourceSha256 !== calculatedRawSha256) {
      errors.push(
        `Raw source SHA-256 mismatch: provenance has '${dataset.provenance.rawSourceSha256}', calculated '${calculatedRawSha256}'`,
      );
    }
    if (dataset.provenance.recordCount !== dataset.records.length) {
      errors.push(
        `Record count mismatch: provenance has ${dataset.provenance.recordCount}, records array has ${dataset.records.length}`,
      );
    }
  }

  // 2. Record Field Checks & Forbidden Probability/Rate Fields
  if (!Array.isArray(dataset.records) || dataset.records.length === 0) {
    errors.push("Dataset records array is empty or not an array");
  } else {
    dataset.records.forEach((record, index) => {
      // Check for forbidden gameplay/probability/rate fields
      const keys = Object.keys(record);
      for (const key of keys) {
        for (const pattern of FORBIDDEN_FIELD_PATTERNS) {
          if (pattern.test(key)) {
            errors.push(
              `Record index ${index} contains forbidden gameplay/probability field '${key}'`,
            );
          }
        }
      }

      // Truthfulness checks
      if (!record.declarationId || typeof record.declarationId !== "string") {
        errors.push(`Record index ${index} missing valid declarationId`);
      }
      if (typeof record.disasterNumber !== "number") {
        errors.push(`Record index ${index} missing disasterNumber`);
      }
      if (!record.state || record.state.length !== 2) {
        errors.push(
          `Record index ${index} has invalid state code: '${record.state}'`,
        );
      }
      if (!record.underlying_physical_hazard) {
        errors.push(`Record index ${index} missing underlying_physical_hazard`);
      }
      if (!record.administrative_declaration_or_response) {
        errors.push(
          `Record index ${index} missing administrative_declaration_or_response`,
        );
      }

      // Check missing != zero / missing date preservation
      if (record.incidentEndDate === "") {
        errors.push(
          `Record index ${index} converted missing incidentEndDate to empty string instead of null`,
        );
      }
    });
  }

  // 3. Disjointness from PR #62
  const femaDir = path.join(REPO_ROOT, "src/fema_disasters");
  if (fs.existsSync(femaDir)) {
    const files = fs.readdirSync(femaDir);
    for (const file of files) {
      const content = fs.readFileSync(path.join(femaDir, file), "utf-8");
      if (
        content.includes(FORBIDDEN_PR62_PATH_1) ||
        content.includes(FORBIDDEN_PR62_PATH_2)
      ) {
        errors.push(
          `File ${file} in src/fema_disasters illegally references PR #62 paths (${FORBIDDEN_PR62_PATH_1} or ${FORBIDDEN_PR62_PATH_2})`,
        );
      }
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

if (
  process.argv[1] &&
  fileURLToPath(import.meta.url) === path.resolve(process.argv[1])
) {
  const result = validateFemaCorpus();
  if (result.valid) {
    console.log("FEMA Disaster Declarations Corpus validation PASSED cleanly.");
  } else {
    console.error("FEMA Disaster Declarations Corpus validation FAILED:");
    result.errors.forEach((e) => console.error(`  - ${e}`));
    process.exit(1);
  }
}
