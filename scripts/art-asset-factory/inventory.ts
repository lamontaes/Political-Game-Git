import fs from "fs";
import path from "path";
import { hashArtFile } from "./content-hash";

export interface InventoryItem {
  filePath: string;
  hash: string;
}

export function generateInventory(baseDir: string): InventoryItem[] {
  const items: InventoryItem[] = [];

  function walk(currentDir: string) {
    const entries = fs.readdirSync(currentDir, { withFileTypes: true });
    // Sort entries to guarantee determinism
    entries.sort((a, b) => a.name.localeCompare(b.name));

    for (const entry of entries) {
      if (entry.name.startsWith(".")) continue; // skip hidden/gitkeep
      const fullPath = path.join(currentDir, entry.name);

      if (entry.isDirectory()) {
        walk(fullPath);
      } else if (entry.isFile()) {
        const ext = path.extname(entry.name).toLowerCase();
        // Only inventory media files
        if ([".png", ".jpg", ".jpeg", ".webp"].includes(ext)) {
          // Store relative path for stable reports
          items.push({
            filePath: path.relative(baseDir, fullPath).replace(/\\/g, "/"),
            hash: hashArtFile(fullPath),
          });
        }
      }
    }
  }

  if (fs.existsSync(baseDir)) {
    walk(baseDir);
  }

  return items;
}

export function detectDuplicateHashes(items: InventoryItem[]): string[] {
  const hashToPath = new Map<string, string[]>();
  for (const item of items) {
    if (!hashToPath.has(item.hash)) {
      hashToPath.set(item.hash, []);
    }
    hashToPath.get(item.hash)!.push(item.filePath);
  }

  const duplicates: string[] = [];
  for (const [hash, paths] of hashToPath.entries()) {
    if (paths.length > 1) {
      duplicates.push(`Duplicate hash ${hash} shared by: ${paths.join(", ")}`);
    }
  }

  return duplicates;
}
