import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

import { buildEducationExport } from "./education-export";

/**
 * Writes the education catalogs from the locked sources.
 *
 * The compilation itself lives in `education-export.ts` so that
 * `npm run education:check` can replay exactly this producer and compare
 * against what is committed, instead of re-hashing files that are already on
 * disk. Source compilation is Node-only; the runtime fetches inert, versioned,
 * content-addressed data only when a panel opens.
 */

const DIRECTORY = "public/education";

const built = buildEducationExport();
mkdirSync(DIRECTORY, { recursive: true });
for (const chunk of built.chunks) {
  writeFileSync(join(DIRECTORY, chunk.path), chunk.data);
}
writeFileSync(join(DIRECTORY, "manifest.json"), built.manifest);

console.log(
  `Exported ${built.recordCount} institutions in ${built.chunks.length} lazy chunks`,
);
