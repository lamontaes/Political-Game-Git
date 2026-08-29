/**
 * National Names V2 Validation CLI
 *
 * Verifies dataset integrity, cryptographic hash matches, schema conformity,
 * exact count reconciliations, and invariant guardrails across all shards.
 */

import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import type {
  GivenNameSourceRecord,
  NamesSourceManifest,
  NamesSummaryIndex,
  SurnameSourceRecord,
} from "./schemas";

export interface ValidationReport {
  readonly valid: boolean;
  readonly errors: string[];
  readonly totalGivenNames: number;
  readonly totalSurnames: number;
  readonly givenShardsChecked: number;
  readonly surnameShardsChecked: number;
}

export function validateNamesDataset(datasetDir: string): ValidationReport {
  const errors: string[] = [];

  const manifestPath = path.join(datasetDir, "manifest.json");
  const indexPath = path.join(datasetDir, "index.json");

  if (!fs.existsSync(manifestPath)) {
    return {
      valid: false,
      errors: [`Manifest missing at ${manifestPath}`],
      totalGivenNames: 0,
      totalSurnames: 0,
      givenShardsChecked: 0,
      surnameShardsChecked: 0,
    };
  }

  const manifest: NamesSourceManifest = JSON.parse(
    fs.readFileSync(manifestPath, "utf8"),
  );
  const index: NamesSummaryIndex = fs.existsSync(indexPath)
    ? JSON.parse(fs.readFileSync(indexPath, "utf8"))
    : null;

  if (index) {
    if (
      index.total_unique_given_names !==
      manifest.summary.total_unique_given_names
    ) {
      errors.push(
        `Index total_unique_given_names (${index.total_unique_given_names}) != manifest (${manifest.summary.total_unique_given_names})`,
      );
    }
    if (
      index.total_unique_surnames !== manifest.summary.total_unique_surnames
    ) {
      errors.push(
        `Index total_unique_surnames (${index.total_unique_surnames}) != manifest (${manifest.summary.total_unique_surnames})`,
      );
    }
  }

  let totalGivenRecords = 0;
  let givenShardsChecked = 0;

  for (const [, meta] of Object.entries(manifest.given_name_shards)) {
    const shardPath = path.join(datasetDir, meta.file);
    if (!fs.existsSync(shardPath)) {
      errors.push(`Given name shard missing: ${shardPath}`);
      continue;
    }

    const fileBuf = fs.readFileSync(shardPath);
    const actualHash = crypto
      .createHash("sha256")
      .update(fileBuf)
      .digest("hex");
    if (actualHash !== meta.sha256) {
      errors.push(
        `Given name shard ${meta.file} hash mismatch. Expected ${meta.sha256}, got ${actualHash}`,
      );
    }

    const records: GivenNameSourceRecord[] = JSON.parse(
      fileBuf.toString("utf8"),
    );
    if (records.length !== meta.record_count) {
      errors.push(
        `Given name shard ${meta.file} record count mismatch. Expected ${meta.record_count}, got ${records.length}`,
      );
    }

    totalGivenRecords += records.length;
    givenShardsChecked++;

    // Validate records
    let prevKey = "";
    for (const rec of records) {
      if (!rec.key || rec.key !== rec.key.toLowerCase()) {
        errors.push(`Invalid key "${rec.key}" in ${meta.file}`);
      }
      if (rec.key <= prevKey && prevKey !== "") {
        errors.push(
          `Unsorted record "${rec.key}" after "${prevKey}" in ${meta.file}`,
        );
      }
      prevKey = rec.key;

      if (!rec.display_name) {
        errors.push(`Missing display_name for "${rec.key}" in ${meta.file}`);
      }

      if (rec.census) {
        if (
          rec.census.male_count + rec.census.female_count !==
          rec.census.total_count
        ) {
          errors.push(
            `Census reconciliation failed for "${rec.key}": ${rec.census.male_count} + ${rec.census.female_count} != ${rec.census.total_count}`,
          );
        }
      }

      if (rec.ssa_national) {
        if (
          rec.ssa_national.total_male + rec.ssa_national.total_female !==
          rec.ssa_national.total
        ) {
          errors.push(`SSA national reconciliation failed for "${rec.key}"`);
        }
      }

      if (rec.provenance.length === 0) {
        errors.push(`Empty provenance for "${rec.key}" in ${meta.file}`);
      }
    }
  }

  let totalSurnameRecords = 0;
  let surnameShardsChecked = 0;

  for (const [, meta] of Object.entries(manifest.surname_shards)) {
    const shardPath = path.join(datasetDir, meta.file);
    if (!fs.existsSync(shardPath)) {
      errors.push(`Surname shard missing: ${shardPath}`);
      continue;
    }

    const fileBuf = fs.readFileSync(shardPath);
    const actualHash = crypto
      .createHash("sha256")
      .update(fileBuf)
      .digest("hex");
    if (actualHash !== meta.sha256) {
      errors.push(
        `Surname shard ${meta.file} hash mismatch. Expected ${meta.sha256}, got ${actualHash}`,
      );
    }

    const records: SurnameSourceRecord[] = JSON.parse(fileBuf.toString("utf8"));
    if (records.length !== meta.record_count) {
      errors.push(
        `Surname shard ${meta.file} record count mismatch. Expected ${meta.record_count}, got ${records.length}`,
      );
    }

    totalSurnameRecords += records.length;
    surnameShardsChecked++;

    let prevKey = "";
    for (const rec of records) {
      if (!rec.key || rec.key !== rec.key.toLowerCase()) {
        errors.push(`Invalid surname key "${rec.key}" in ${meta.file}`);
      }
      if (rec.key <= prevKey && prevKey !== "") {
        errors.push(
          `Unsorted surname "${rec.key}" after "${prevKey}" in ${meta.file}`,
        );
      }
      prevKey = rec.key;

      if (!rec.census || rec.census.count <= 0 || rec.census.rank <= 0) {
        errors.push(
          `Invalid Census surname record for "${rec.key}" in ${meta.file}`,
        );
      }
    }
  }

  if (totalGivenRecords !== manifest.summary.total_unique_given_names) {
    errors.push(
      `Total parsed given records (${totalGivenRecords}) != manifest summary (${manifest.summary.total_unique_given_names})`,
    );
  }

  if (totalSurnameRecords !== manifest.summary.total_unique_surnames) {
    errors.push(
      `Total parsed surname records (${totalSurnameRecords}) != manifest summary (${manifest.summary.total_unique_surnames})`,
    );
  }

  return {
    valid: errors.length === 0,
    errors,
    totalGivenNames: totalGivenRecords,
    totalSurnames: totalSurnameRecords,
    givenShardsChecked,
    surnameShardsChecked,
  };
}

async function main() {
  const repoRoot = process.cwd();
  const datasetDir = path.join(repoRoot, "data/names-v2");

  console.log(`Validating National Names V2 dataset at: ${datasetDir}`);
  const report = validateNamesDataset(datasetDir);

  if (!report.valid) {
    console.error(`\nValidation FAILED with ${report.errors.length} errors:`);
    for (const err of report.errors.slice(0, 20)) {
      console.error(`  - ${err}`);
    }
    if (report.errors.length > 20) {
      console.error(`  ... and ${report.errors.length - 20} more errors.`);
    }
    process.exit(1);
  }

  console.log("\n=== VALIDATION SUCCESSFUL ===");
  console.log(
    `- Given Name Records: ${report.totalGivenNames.toLocaleString()}`,
  );
  console.log(`- Surname Records: ${report.totalSurnames.toLocaleString()}`);
  console.log(`- Given Shards Verified: ${report.givenShardsChecked}`);
  console.log(`- Surname Shards Verified: ${report.surnameShardsChecked}`);
  console.log(`- Cryptographic Hashes: All match manifest`);
  console.log("=============================\n");
}

if (
  process.argv[1]?.endsWith("cli-validate.ts") ||
  process.argv[1]?.endsWith("cli-validate")
) {
  main().catch((err) => {
    console.error("Validation execution failed:", err);
    process.exit(1);
  });
}
