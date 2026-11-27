/* global process, console */
/**
 * After a split moves code, carries tests/guards/no-steering-baseline.json's
 * known steering counts and owners with it. Runs the no-steering guard, reads
 * each "<file>: N steering shapes, 0 known" line it prints for a file the
 * split made, and gives that file the count and the owner of <from>, then
 * drops <from>'s entry. The total does not change; it refuses to run when the
 * new counts do not add up to <from>'s.
 *
 *   node scripts/elections/relocate-no-steering.mjs <from>
 */
import { spawnSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";

const from = process.argv[2];
if (!from) throw new Error("usage: relocate-no-steering.mjs <from-file>");
const path = "tests/guards/no-steering-baseline.json";
const baseline = JSON.parse(readFileSync(path, "utf8"));
const was = baseline.steering[from];
if (was === undefined) throw new Error(`${from} has no known steering count`);
const run = spawnSync(
  "npx",
  ["vitest", "run", "tests/guards/no-steering.test.ts"],
  {
    encoding: "utf8",
    env: { ...process.env, FORCE_COLOR: "0" },
  },
);
const out = `${run.stdout}\n${run.stderr}`;
const found = [...out.matchAll(/"([^"]+): (\d+) steering shapes, 0 known/g)];
const total = found.reduce((n, m) => n + Number(m[2]), 0);
if (total !== was)
  throw new Error(`the guard finds ${total} new shape(s); ${from} held ${was}`);
const owner = baseline.owners[from];
delete baseline.steering[from];
delete baseline.owners[from];
for (const [, file, n] of found) {
  baseline.steering[file] = Number(n);
  baseline.owners[file] = owner;
}
const sorted = (o) =>
  Object.fromEntries(Object.entries(o).sort(([a], [b]) => a.localeCompare(b)));
baseline.steering = sorted(baseline.steering);
baseline.owners = sorted(baseline.owners);
writeFileSync(path, `${JSON.stringify(baseline, null, 2)}\n`);
console.log(
  `moved ${was} steering shape(s) from ${from} to ${found.length} file(s)`,
);
