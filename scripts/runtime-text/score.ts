/**
 * Scores a saved audit run against the recorded baseline without a browser.
 *
 *   node --import tsx scripts/runtime-text/score.ts <run.json> [--write-baseline]
 *
 * Causes are recomputed with the current rules, so a new cause rule can be
 * checked against a run already on disk.
 */
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import type { ClassifiedText } from "./classify";
import { causeOf } from "./causes";
import { evaluateGuard, measure, type GuardBaseline } from "./guard";

const BASELINE_FILE = "data/runtime-text/baseline.json";
const [file, flag] = process.argv.slice(2);
if (!file) throw new Error("Give the run file written by the audit.");
const run = JSON.parse(readFileSync(file, "utf8")) as {
  places: { place: string; seed: string }[];
  entries: ClassifiedText[];
};
if (run.places.length !== 1)
  throw new Error(
    `The guard scores one life; this run has ${run.places.length}. Run npm run audit:runtime-text:guard.`,
  );
const rows = run.entries.map((row) =>
  row.origin === "unresolved"
    ? { ...row, cause: causeOf(row.text, row.testid).id }
    : row,
);
if (flag === "--write-baseline") {
  mkdirSync(dirname(BASELINE_FILE), { recursive: true });
  writeFileSync(
    BASELINE_FILE,
    `${JSON.stringify({ ...run.places[0], ...measure(rows) }, null, 2)}\n`,
  );
  console.log(`baseline written to ${BASELINE_FILE}`);
} else {
  const baseline = JSON.parse(
    readFileSync(BASELINE_FILE, "utf8"),
  ) as GuardBaseline;
  const { failures, now } = evaluateGuard(rows, baseline);
  console.log(JSON.stringify({ ...now, unexplained: now.unexplained.length }));
  if (failures.length > 0) {
    console.error(failures.join("\n"));
    process.exit(1);
  }
  console.log("runtime-text guard: pass");
}
