import path from "path";
import { SAFETY_CONFIG } from "./config";
import {
  getAllTrackedFiles,
  getUntrackedFiles,
  getFileSize,
  getFileHash,
} from "./utils";
import fs from "fs";

export interface InventoryReport {
  duplicateHashes: Record<string, string[]>;
  hygieneAnomalies: string[];
}

export function runInventory(): InventoryReport {
  const tracked = getAllTrackedFiles();
  const untracked = getUntrackedFiles();

  const allFiles = [...tracked, ...untracked].filter(
    (f) => fs.existsSync(f) && fs.statSync(f).isFile(),
  );

  const hygieneAnomalies: string[] = [];
  const hashToFiles: Record<string, string[]> = {};

  for (const file of allFiles) {
    const size = getFileSize(file);

    // Check Hygiene
    for (const pattern of SAFETY_CONFIG.TEMP_FILE_PATTERNS) {
      if (pattern.test(path.basename(file)) || pattern.test(file)) {
        hygieneAnomalies.push(file);
        break;
      }
    }

    // Explicitly exclude 0-byte placeholders (like .gitkeep) from duplication checks
    if (size > 0) {
      const hash = getFileHash(file);
      if (hash) {
        if (!hashToFiles[hash]) {
          hashToFiles[hash] = [];
        }
        hashToFiles[hash].push(file);
      }
    }
  }

  const duplicateHashes: Record<string, string[]> = {};
  for (const [hash, files] of Object.entries(hashToFiles)) {
    if (files.length > 1) {
      duplicateHashes[hash] = files;
    }
  }

  return {
    duplicateHashes,
    hygieneAnomalies,
  };
}

export function printInventoryReport(report: InventoryReport) {
  console.log("=== Repository Safety Inventory Report ===");
  console.log(
    `Hygiene Anomalies (Temp/Scratch files):`,
    report.hygieneAnomalies.length ? report.hygieneAnomalies : "None",
  );

  const dupCount = Object.keys(report.duplicateHashes).length;
  console.log(
    `Duplicate File Contents: ${dupCount} distinct duplicates found (excluding 0-byte files).`,
  );
  if (dupCount > 0) {
    for (const [hash, files] of Object.entries(report.duplicateHashes)) {
      console.log(`  Hash ${hash.substring(0, 8)}...: ${files.join(", ")}`);
    }
  }
}
