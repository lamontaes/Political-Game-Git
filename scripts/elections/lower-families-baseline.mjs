/**
 * Lowers tests/guards/families-baseline.json to what the families guard counts
 * today: runs the guard, reads each "<file>: lower N to M" line it prints for a
 * count that shrank, and writes M (dropping a file that reached 0). It never
 * raises a count. Re-runnable: with nothing to lower it changes nothing.
 *
 *   node scripts/elections/lower-families-baseline.mjs
 *   node scripts/elections/lower-families-baseline.mjs --move <from> <to>
 *
 * `--move` carries a file's count to the file its imports moved to (a split
 * that funnels them there): the total does not change, and it refuses a
 * <to> that already has a count or a <from> without one.
 */

/* global process, console */
import { spawnSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";

const argv = process.argv.slice(2);
if (argv[0] === "--move") {
  const [, from, to] = argv;
  const file = "tests/guards/families-baseline.json";
  const known = JSON.parse(readFileSync(file, "utf8"));
  if (
    known.deepImports[from] === undefined ||
    known.deepImports[to] !== undefined
  )
    throw new Error("--move needs a counted <from> and an uncounted <to>");
  known.deepImports[to] = known.deepImports[from];
  delete known.deepImports[from];
  writeFileSync(file, `${JSON.stringify(known, null, 2)}\n`);
  console.log(`moved ${known.deepImports[to]} from ${from} to ${to}`);
  process.exit(0);
}
const run = spawnSync(
  "npx",
  ["vitest", "run", "tests/guards/families.test.ts"],
  { encoding: "utf8", env: { ...process.env, FORCE_COLOR: "0" } },
);
const out = `${run.stdout}\n${run.stderr}`;
const path = "tests/guards/families-baseline.json";
const baseline = JSON.parse(readFileSync(path, "utf8"));
let lowered = 0;
for (const m of out.matchAll(/"([^"]+): lower (\d+) to (\d+)",/g)) {
  const [, file, from, to] = m;
  if (baseline.deepImports[file] !== Number(from) || Number(to) >= Number(from))
    continue;
  if (Number(to) === 0) delete baseline.deepImports[file];
  else baseline.deepImports[file] = Number(to);
  lowered += 1;
}
writeFileSync(path, `${JSON.stringify(baseline, null, 2)}\n`);
console.log(`${lowered} count(s) lowered`);
