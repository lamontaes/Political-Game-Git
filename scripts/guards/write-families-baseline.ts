/**
 * Writes tests/guards/families-baseline.json from the code as it is
 * (tests/guards/families.test.ts reads it): the files in no family, and each
 * file's imports that reach inside another family.
 *
 *   node --import tsx scripts/guards/write-families-baseline.ts
 *
 * It never writes a rise: if any file's count is higher than the baseline's
 * at HEAD (the committed one, so a merge in progress is judged against the
 * side being merged into), or a file is newly unassigned, it prints each and
 * exits 1 without writing. A baseline only goes down.
 */
import { execFileSync } from "node:child_process";
import { writeFileSync } from "node:fs";
import path from "node:path";
import { familyOf } from "../../tests/guards/family-map";
import { ROOT, deepImports, sources } from "./families-measure";

const FILE = path.join(ROOT, "tests", "guards", "families-baseline.json");
const files = sources();
const deepMap = deepImports();
const deep: Record<string, number> = {};
for (const [file, reached] of deepMap) deep[file] = reached.length;
const unassigned = files.filter((f) => familyOf(f) === null);

let known: { unassigned: string[]; deepImports: Record<string, number> };
try {
  known = JSON.parse(
    execFileSync("git", ["show", "HEAD:tests/guards/families-baseline.json"], {
      cwd: ROOT,
      encoding: "utf8",
    }),
  );
} catch {
  known = { unassigned: [], deepImports: {} };
}
const raised = [
  ...Object.entries(deep)
    .filter(([f, n]) => n > (known.deepImports[f] ?? 0))
    .map(([f, n]) => `${f}: ${n}, ${known.deepImports[f] ?? 0} known`),
  ...unassigned
    .filter((f) => !known.unassigned.includes(f))
    .map((f) => `${f}: in no family`),
];
if (raised.length) {
  console.error(
    `The baseline only goes down, and these would rise:\n${raised.join("\n")}`,
  );
  process.exit(1);
}
const sorted = Object.fromEntries(
  Object.entries(deep).sort(([a], [b]) => (a < b ? -1 : 1)),
);
writeFileSync(
  FILE,
  JSON.stringify({ unassigned, deepImports: sorted }, null, 2) + "\n",
);
console.log(
  `families baseline: ${Object.keys(sorted).length} files, ${Object.values(sorted).reduce((a, b) => a + b, 0)} imports, ${unassigned.length} unassigned`,
);
