/**
 * Writes tests/guards/engine-tables-baseline.json from the code as it is
 * (tests/guards/engine-tables.test.ts reads it).
 *
 *   node --import tsx scripts/guards/write-engine-tables-baseline.ts
 *       write what the code does now; re-run it when a train folds in
 *       work that moves files between families, then read the diff.
 *       It never writes a rise: a count higher than the file's is refused
 *       (exit 1) and nothing is written. A baseline only goes down.
 */
import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  baselineOf,
  measure,
  type Baseline,
  type Counts,
} from "./engine-tables";

const FILE = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
  "..",
  "tests",
  "guards",
  "engine-tables-baseline.json",
);
const total = (counts: Counts) =>
  Object.values(counts ?? {}).reduce(
    (sum, row) => sum + Object.values(row).reduce((a, b) => a + b, 0),
    0,
  );

const now = baselineOf(measure());
let known: Baseline | null = null;
try {
  known = JSON.parse(readFileSync(FILE, "utf8")) as Baseline;
} catch {
  known = null;
}

if (known) {
  const raised: string[] = [];
  for (const kind of Object.keys(now) as (keyof Baseline)[])
    for (const [file, row] of Object.entries(now[kind]))
      for (const [key, count] of Object.entries(row))
        if (count > (known[kind][file]?.[key] ?? 0))
          raised.push(`${kind} ${file} ${key}: ${count}`);
  if (raised.length) {
    console.error(
      `The baseline only shrinks, and these rose:\n${raised.join("\n")}`,
    );
    process.exit(1);
  }
}

writeFileSync(FILE, JSON.stringify(now, null, 2) + "\n");
for (const kind of Object.keys(now) as (keyof Baseline)[])
  console.log(
    `${kind}: ${known ? total(known[kind]) : "none"} -> ${total(now[kind])}`,
  );
