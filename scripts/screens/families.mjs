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
const GIVES = [
  ["screens", "desktop/**"],
  ["clock-places", "src/maps/**"],
];

const map = JSON.parse(readFileSync(MAP, "utf8"));
const family = (id) => {
  const found = map.families.find((f) => f.id === id);
  if (!found) throw new Error(`No family ${id} in families.json.`);
  return found;
};

for (const [name, to] of Object.entries(TESTS)) {
  const file = `src/core2/${name}.test.ts`;
  for (const other of map.families)
    if (other.id !== to) other.paths = other.paths.filter((p) => p !== file);
  const target = family(to);
  if (!target.paths.includes(file)) target.paths.push(file);
}
for (const [id, glob] of GIVES) {
  const target = family(id);
  if (!target.paths.includes(glob)) target.paths.push(glob);
}
writeFileSync(MAP, JSON.stringify(map, null, 2) + "\n");
execFileSync("npx", ["prettier", "--write", "tests/guards/families.json"], {
  cwd: ROOT,
  stdio: "ignore",
});
execFileSync("node", ["--import", "tsx", "scripts/guards/codeowners.ts"], {
  cwd: ROOT,
  stdio: "inherit",
});
console.log(
  `families.json: ${Object.keys(TESTS).length} tests refiled, desktop/ to screens, src/maps/ to clock-places.`,
);
