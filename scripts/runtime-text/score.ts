/**
 * Scores saved audit runs against the recorded baseline without a browser.
 *
 *   node --import tsx scripts/runtime-text/score.ts <run.json>
 *   node --import tsx scripts/runtime-text/score.ts <run.json>... --write-baseline
 *
 * Causes are recomputed with the current rules, so a new cause rule can be
 * checked against runs already on disk. Writing a baseline takes the union of
 * every run given, which is how a baseline absorbs run-to-run variation.
 */
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { format } from "prettier";
import { dirname } from "node:path";
import type { ClassifiedText } from "./classify";
import { causeOf } from "./causes";
import {
  buildLiteralIndex,
  resolveJoined,
  resolveLiteral,
} from "./literal-index";
import { evaluateGuard, measure, union, type GuardBaseline } from "./guard";

const BASELINE_FILE = "data/runtime-text/baseline.json";
const args = process.argv.slice(2);
const write = args.includes("--write-baseline");
const files = args.filter((arg) => !arg.startsWith("--"));
if (files.length === 0)
  throw new Error("Give the run file written by the audit.");

interface Run {
  places: { place: string; seed: string }[];
  entries: ClassifiedText[];
}
const index = buildLiteralIndex("src");
const sourceOf = (row: ClassifiedText): string | null => {
  if (row.origin === "literal-joined") {
    const joined = resolveJoined(index, row.text);
    return joined ? `${joined.file}|${joined.id}` : row.source;
  }
  const hit = resolveLiteral(index, row.text)[0];
  return hit ? `${hit.file}|${hit.id}` : row.source;
};
const runs = files.map((file) => {
  const run = JSON.parse(readFileSync(file, "utf8")) as Run;
  if (run.places.length !== 1)
    throw new Error(
      `The guard scores one life; ${file} has ${run.places.length}. Run npm run audit:runtime-text:guard.`,
    );
  // Causes and sources are recomputed against today's rules and source files.
  const rows = run.entries.map((row) =>
    row.origin === "unresolved"
      ? { ...row, cause: causeOf(row.text, row.testid).id }
      : ["literal", "literal-template", "literal-joined"].includes(row.origin)
        ? { ...row, source: sourceOf(row) }
        : row,
  );
  return { place: run.places[0]!, rows };
});

if (write) {
  const first = runs[0]!.place;
  if (runs.some((run) => run.place.seed !== first.seed))
    throw new Error("Every run in one baseline must be the same life.");
  mkdirSync(dirname(BASELINE_FILE), { recursive: true });
  const merged = union(runs.map((run) => measure(run.rows)));
  writeFileSync(
    BASELINE_FILE,
    await format(
      JSON.stringify({ place: first.place, seed: first.seed, ...merged }),
      { parser: "json" },
    ),
  );
  console.log(
    `baseline written to ${BASELINE_FILE}: ${merged.fixedSources.length} pieces of fixed text, ${merged.engineBanks.length} banks, ${merged.unexplained.length} unexplained`,
  );
} else {
  const baseline = JSON.parse(
    readFileSync(BASELINE_FILE, "utf8"),
  ) as GuardBaseline;
  let failed = false;
  for (const run of runs) {
    const { failures, now } = evaluateGuard(run.rows, baseline);
    console.log(
      JSON.stringify({
        fixedText: now.fixedSources.length,
        banks: now.engineBanks.length,
        unexplained: now.unexplained.length,
      }),
    );
    if (failures.length > 0) {
      console.error(failures.join("\n"));
      failed = true;
    }
  }
  if (failed) process.exit(1);
  console.log("runtime-text guard: pass");
}
