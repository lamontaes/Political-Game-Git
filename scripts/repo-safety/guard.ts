import { getAllTrackedFiles, getUntrackedFiles, getFileSize } from "./utils";
import { SAFETY_CONFIG } from "./config";
import path from "path";
import fs from "fs";

export function checkRepositoryState(): { valid: boolean; errors: string[] } {
  // Validate entire tracked tree + untracked instead of just staged
  const tracked = getAllTrackedFiles();
  const untracked = getUntrackedFiles();
  const allFiles = [...tracked, ...untracked].filter(
    (f) => fs.existsSync(f) && fs.statSync(f).isFile(),
  );

  const errors: string[] = [];

  for (const file of allFiles) {
    const size = getFileSize(file);
    const ext = path.extname(file).toLowerCase();

    // Ignore 0-byte placeholders here as well just to be clean
    if (size === 0) continue;

    // Check if it's a generated output, if so, is it in an allowed path?
    // A file is considered "generated output" in this check if it's unusually large and untracked.
    // However, the prompt mentions strict source-master protection and size policy globally.
    if (size > SAFETY_CONFIG.SHIPPING_ASSET_MAX_BYTES) {
      errors.push(
        `File ${file} exceeds shipping asset threshold of ${
          SAFETY_CONFIG.SHIPPING_ASSET_MAX_BYTES / 1024 / 1024
        }MB.`,
      );
    }

    // Prohibited raw master formats
    if (SAFETY_CONFIG.PROHIBITED_ARCHIVAL_EXTENSIONS.includes(ext)) {
      // Check if it's in an allowed fixture path
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

    // Explicit generated paths check:
    // If a file is in a known output path, we can skip further generic untracked alerts for it,
    // but the size limits still apply above.
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}
