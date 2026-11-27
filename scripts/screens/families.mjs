/* global console */
/**
 * Screens' one edit to tests/guards/families.json (SC6 and SC7 of docs/coordination/refactor/screens-2026-11-27.md),
 * re-runnable on any state of the file: it moves each core2 test the screens family was holding to the family that
 * answers for its failing, gives the app shell (desktop/) to screens and the generated maps (src/maps/) to
 * clock-places, then writes .github/CODEOWNERS from the result.
 *
 *   node scripts/screens/families.mjs
 *
 * The word files (SC3) are Story's to move, so this script never lists them.
 */
import { execFileSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
  "..",
);
const MAP = path.join(ROOT, "tests", "guards", "families.json");
const BASELINE = path.join(ROOT, "tests", "guards", "families-baseline.json");

// Each test is filed with the engine its pool item or its first line names.
const TESTS = {
  "ask-waits-for-the-chair": "bodies",
  "bargaining-price": "bodies",
  "closure-credit-line": "jobs-businesses",
  "day-zero": "past",
  "election-winner-names": "elections",
  "fill-in-pooled-flows": "people",
  "floor-every-bill": "bodies",
  "journal-fold": "people",
  "medical-payer-parts": "people",
  "moves-minors": "people",
  "pre-start-government": "past",
  "public-hire-authority": "jobs-businesses",
  "record-vote-per-question": "bodies",
  "relatives-elsewhere-past": "past",
  "rerate-counted-job": "people",
  "second-chamber-own-day": "bodies",
  "sitting-focus": "bodies",
  "staff-dismissal-after-attendance": "executive",
  "staff-player-clock": "executive",
  succession: "executive",
  "whole-past": "past",
};
// A family another session renames or splits is followed by its first successor that exists
// (Offices splits executive into offices and governing); with none, the test stays where it is.
const SUCCESSORS = { executive: ["governing", "offices"] };
// A family's entry the screens now import through (the door Screens asked for): the file is
// already in the family's paths; the guard counts an import of a non-entry file as a deep import.
const ENTRIES = [["jobs-businesses", "src/core2/modules/credit.ts"]];
// The baseline only shrinks: making credit.ts an entry turns these files' imports of it from deep to front-door.
const LOWER = {
  "src/core2/modules/housing.ts": 4,
  "src/core2/modules/world.ts": 2,
};
const GIVES = [
  ["screens", "desktop/**"],
  ["clock-places", "src/maps/**"],
];

const map = JSON.parse(readFileSync(MAP, "utf8"));
const family = (id) =>
  [id, ...(SUCCESSORS[id] ?? [])]
    .map((candidate) => map.families.find((f) => f.id === candidate))
    .find(Boolean);

for (const [name, to] of Object.entries(TESTS)) {
  const file = `src/core2/${name}.test.ts`;
  const target = family(to);
  if (!target) {
    console.log(`No family for ${to}: ${file} stays where it is.`);
    continue;
  }
  for (const other of map.families)
    if (other !== target) other.paths = other.paths.filter((p) => p !== file);
  if (!target.paths.includes(file)) target.paths.push(file);
}
for (const [id, file] of ENTRIES) {
  const target = family(id);
  if (!target) console.log(`No family ${id}: ${file} is not made an entry.`);
  else if (!target.entry.includes(file)) target.entry.push(file);
}
for (const [id, glob] of GIVES) {
  const target = family(id);
  if (!target) console.log(`No family ${id}: ${glob} is not given.`);
  else if (!target.paths.includes(glob)) target.paths.push(glob);
}
writeFileSync(MAP, JSON.stringify(map, null, 2) + "\n");
const baseline = JSON.parse(readFileSync(BASELINE, "utf8"));
for (const [file, count] of Object.entries(LOWER))
  if (baseline.deepImports[file] > count) baseline.deepImports[file] = count;
writeFileSync(BASELINE, JSON.stringify(baseline, null, 2) + "\n");
execFileSync(
  "npx",
  [
    "prettier",
    "--write",
    "tests/guards/families.json",
    "tests/guards/families-baseline.json",
  ],
  {
    cwd: ROOT,
    stdio: "ignore",
  },
);
execFileSync("node", ["--import", "tsx", "scripts/guards/codeowners.ts"], {
  cwd: ROOT,
  stdio: "inherit",
});
console.log(
  `families.json: ${Object.keys(TESTS).length} tests refiled, desktop/ to screens, src/maps/ to clock-places.`,
);
