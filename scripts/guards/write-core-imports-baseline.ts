/**
 * Writes tests/guards/core-imports-no-engine-baseline.json from the code as it
 * is (tests/guards/core-imports-no-engine.test.ts reads it).
 *
 *   node --import tsx scripts/guards/write-core-imports-baseline.ts
 *       write what the code does now; re-run it when a train folds in work
 *       that cuts or adds a core import, then read the diff.
 *   ... --shrink-only
 *       refuse to write a count that is higher than the file's.
 */
import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { counts, ROOT } from "./core-imports-no-engine";

const FILE = path.join(
  ROOT,
  "tests",
  "guards",
  "core-imports-no-engine-baseline.json",
);
const now = counts();
let known: Record<string, number> = {};
try {
  known = JSON.parse(readFileSync(FILE, "utf8")) as Record<string, number>;
} catch {
  known = {};
}

if (process.argv.includes("--shrink-only")) {
  const raised = Object.entries(now)
    .filter(([file, n]) => n > (known[file] ?? 0))
    .map(([file, n]) => `${file}: ${n}`);
  if (raised.length) {
    console.error(
      `The baseline only shrinks, and these rose:\n${raised.join("\n")}`,
    );
    process.exit(1);
  }
}

const sorted = Object.fromEntries(
  Object.entries(now).sort(([a], [b]) => (a < b ? -1 : 1)),
);
writeFileSync(FILE, JSON.stringify(sorted, null, 2) + "\n");
console.log(
  `core-imports-no-engine baseline: ${Object.keys(sorted).length} files, ${Object.values(sorted).reduce((a, b) => a + b, 0)} imports`,
);
