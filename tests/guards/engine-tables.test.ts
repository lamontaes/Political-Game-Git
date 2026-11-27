import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { beforeAll, describe, expect, it } from "vitest";
import {
  measure,
  type Counts,
  type Measurement,
} from "../../scripts/guards/engine-tables";

/**
 * One engine does not open another engine's records (core review K8, Nov 26;
 * owner: "Every system is already built: find the engine that does it and
 * wire through it"). A file in one family may not open a module table
 * another family owns, put or remove a row in one, or write straight into a
 * state map another engine owns; it asks the owner's front door.
 *
 * What is counted and what is not is written in
 * scripts/guards/engine-tables.ts. The baseline is what the code does today
 * and only shrinks: a file may not gain a count, and a count that has fallen
 * must be lowered here. UPDATE_ENGINE_TABLES=1 rewrites the baseline after a
 * cut (it refuses to write a higher count than the file holds).
 */
const BASELINE = path.join(__dirname, "engine-tables-baseline.json");
type Baseline = Pick<Measurement, "opens" | "writes" | "mapWrites">;

/** Writes the scan could not follow from the table back to its module are reported, not held to a baseline. */
function held(measured: Measurement): Baseline {
  const writes: Counts = {};
  for (const [file, row] of Object.entries(measured.writes)) {
    const kept = Object.fromEntries(
      Object.entries(row).filter(([key]) => key !== "unplaced"),
    );
    if (Object.keys(kept).length) writes[file] = kept;
  }
  return {
    opens: measured.opens,
    writes,
    mapWrites: measured.mapWrites,
  };
}

function compare(
  kind: keyof Baseline,
  now: Counts,
  known: Counts,
): { over: string[]; stale: string[] } {
  const over: string[] = [];
  const stale: string[] = [];
  const files = new Set([...Object.keys(now), ...Object.keys(known)]);
  for (const file of [...files].sort()) {
    const keys = new Set([
      ...Object.keys(now[file] ?? {}),
      ...Object.keys(known[file] ?? {}),
    ]);
    for (const key of [...keys].sort()) {
      const have = now[file]?.[key] ?? 0;
      const allowed = known[file]?.[key] ?? 0;
      if (have > allowed)
        over.push(
          `${file} ${kind} ${key}: ${have} now, ${allowed} known. Ask the owner's front door instead.`,
        );
      if (have < allowed)
        stale.push(`${file} ${kind} ${key}: lower ${allowed} to ${have}`);
    }
  }
  return { over, stale };
}

describe("one engine does not open another engine's records", () => {
  let now: Baseline;
  beforeAll(() => {
    now = held(measure());
    if (process.env.UPDATE_ENGINE_TABLES) {
      const known = JSON.parse(readFileSync(BASELINE, "utf8")) as Baseline;
      const raised = (Object.keys(now) as (keyof Baseline)[]).flatMap(
        (kind) => compare(kind, now[kind], known[kind]).over,
      );
      if (raised.length)
        throw new Error(`The baseline only shrinks:\n${raised.join("\n")}`);
      writeFileSync(BASELINE, JSON.stringify(now, null, 2) + "\n");
    }
  }, 180_000);

  const known = JSON.parse(readFileSync(BASELINE, "utf8")) as Baseline;

  it("opens no table another family owns that it did not open before", () => {
    expect(compare("opens", now.opens, known.opens).over).toEqual([]);
  });

  it("puts or removes no row in another family's table that it did not before", () => {
    expect(compare("writes", now.writes, known.writes).over).toEqual([]);
  });

  it("writes no state map another engine owns that it did not before", () => {
    expect(compare("mapWrites", now.mapWrites, known.mapWrites).over).toEqual(
      [],
    );
  });

  it("only shrinks: lowers a count as soon as a cut lands", () => {
    const stale = (Object.keys(now) as (keyof Baseline)[]).flatMap(
      (kind) => compare(kind, now[kind], known[kind]).stale,
    );
    expect(
      stale,
      "run UPDATE_ENGINE_TABLES=1 npx vitest run tests/guards/engine-tables.test.ts",
    ).toEqual([]);
  });
});
