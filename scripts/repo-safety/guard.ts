import { getAllTrackedFiles, getStagedFiles, getFileSize } from "./utils";
import { SAFETY_CONFIG } from "./config";
import path from "path";
import fs from "fs";

export function checkRepositoryState(): {
  valid: boolean;
  errors: string[];
  warnings: string[];
} {
  // We ONLY validate tracked and explicitly staged files to prevent failing CI
  // or local workspace checks due to unrelated user workspace files.
  const tracked = getAllTrackedFiles();
  const staged = getStagedFiles();

  // Deduplicate and filter existing files
  const surfaceFiles = Array.from(new Set([...tracked, ...staged])).filter(
    (f) => fs.existsSync(f) && fs.statSync(f).isFile(),
  );

  const errors: string[] = [];
  const warnings: string[] = [];

  for (const file of surfaceFiles) {
    const size = getFileSize(file);
    const ext = path.extname(file).toLowerCase();

    // Ignore 0-byte placeholders
    if (size === 0) continue;

    // Check size policies
    if (size > SAFETY_CONFIG.SHIPPING_ASSET_FATAL_BYTES) {
      errors.push(
        `File ${file} exceeds shipping asset fatal threshold of ${
          SAFETY_CONFIG.SHIPPING_ASSET_FATAL_BYTES / 1024 / 1024
        }MB.`,
      );
    } else if (size > SAFETY_CONFIG.SHIPPING_ASSET_WARNING_BYTES) {
      warnings.push(
        `File ${file} exceeds shipping asset warning threshold of ${
          SAFETY_CONFIG.SHIPPING_ASSET_WARNING_BYTES / 1024 / 1024
        }MB.`,
      );
    }

    // Check raw master formats (HARD BLOCK unless in fixture path)
    if (SAFETY_CONFIG.PROHIBITED_ARCHIVAL_EXTENSIONS.includes(ext)) {
      const inAllowedPath = SAFETY_CONFIG.ALLOWED_FIXTURE_PATHS.some(
        (fixturePath) =>
          file.startsWith(fixturePath + "/") ||
          file.startsWith(fixturePath + path.sep),
      );

      if (!inAllowedPath) {
        errors.push(
          `Prohibited raw/archival file ${file} found outside allowed test fixture paths.`,
        );
      }
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}
