import { describe, expect, it } from "vitest";
import baseline from "./no-steering-baseline.json";
import {
  ROLES,
  parameterRows,
  steeringCount,
  stepCounts,
  unlabeledCounts,
} from "./no-steering-scan";

/**
 * No steering (owner, Nov 8: real ranges are not targets; the simulation is
 * not pulled toward a published figure). Nothing in the code that runs every
 * day or month may pull a measure back toward a level, a researched figure or
 * a higher place's value, or clamp an outcome to keep it in a range. A
 * measure moves because something in the world caused it.
 *
 * Two checks, both with a baseline that may only shrink (as kit-only-ui):
 *
 * 1. Every numeric parameter row carries a role: coefficient (a rate or weight
 *    the world's causes are multiplied by), level (where a measure starts),
 *    opening (a figure that seeds the opening world), or law (a rule the law
 *    sets). A row with no role is counted by file; the count may not rise.
 * 2. Step code is scanned for the shapes of steering (L + k*(x - L),
 *    L - gap/k, k*(target - own), a clamp on an outcome). Each file's count
 *    may not rise; a lower count must be written into the baseline.
 *
 * The behavior test that backs this (push a value off in one of two identical
 * worlds, run a year, fail if the gap closes with no recorded cause) is
 * src/core2/no-steering-behavior.test.ts. Identities (money balances,
 * counts add up) are not steering and are not matched.
 */

const known = baseline as {
  steering: Record<string, number>;
  unlabeledRows: Record<string, number>;
  owners: Record<string, string>;
};

describe("no steering", () => {
  const steering = stepCounts();
  const unlabeled = unlabeledCounts();

  it("adds no step code that pulls a measure toward a level or clamps an outcome", () => {
    const over = [...steering]
      .filter(([file, n]) => n > (known.steering[file] ?? 0))
      .map(
        ([file, n]) =>
          `${file}: ${n} steering shapes, ${known.steering[file] ?? 0} known. Let the measure move by its causes (SHAPES in tests/guards/no-steering.test.ts says which shapes).`,
      );
    expect(over).toEqual([]);
  });

  it("lowers a known steering count as soon as the code stops steering", () => {
    const stale = Object.entries(known.steering)
      .filter(([file, n]) => (steering.get(file) ?? 0) < n)
      .map(
        ([file, n]) =>
          `${file}: lower ${n} to ${steering.get(file) ?? 0} in tests/guards/no-steering-baseline.json`,
      );
    expect(stale).toEqual([]);
  });

  it("adds no parameter row without a role (coefficient, level, opening or law)", () => {
    const over = [...unlabeled]
      .filter(([file, n]) => n > (known.unlabeledRows[file] ?? 0))
      .map(
        ([file, n]) =>
          `${file}: ${n} rows without a role, ${known.unlabeledRows[file] ?? 0} known. Give each new row "role": one of ${ROLES.join(", ")}.`,
      );
    expect(over).toEqual([]);
  });

  it("lowers a known unlabeled count as soon as rows are labeled", () => {
    const stale = Object.entries(known.unlabeledRows)
      .filter(([file, n]) => (unlabeled.get(file) ?? 0) < n)
      .map(
        ([file, n]) =>
          `${file}: lower ${n} to ${unlabeled.get(file) ?? 0} in tests/guards/no-steering-baseline.json`,
      );
    expect(stale).toEqual([]);
  });

  it("names the session that owns every file in the baseline", () => {
    const files = [
      ...Object.keys(known.steering),
      ...Object.keys(known.unlabeledRows),
    ];
    expect(files.filter((file) => !known.owners[file])).toEqual([]);
  });

  it("catches each shape and leaves identities alone", () => {
    for (const source of [
      "next = level + 0.1 * (current - level);",
      "const unemployment = unemployment - gap / 12;",
      "adjust = 0.2 * (target - own);",
      "const inflation = Math.max(0, Math.min(10, inflation));",
    ])
      expect(steeringCount(source), source).toBeGreaterThan(0);
    for (const source of [
      "const total = a + b * (c - d);",
      "balance = balance - payment;",
      "const share = Math.min(1, count / people);",
      "// level + 0.1 * (current - level)",
    ])
      expect(steeringCount(source), source).toBe(0);
  });

  it("counts a numeric row with a valid role as labeled", () => {
    const rows = parameterRows({
      a: { value: 1, tag: "SOURCED", role: "coefficient" },
      b: { value: 2, tag: "TUNABLE" },
      c: { value: 3, tag: "ESTIMATED", role: "nonsense" },
    });
    expect(rows.map((row) => row.labeled)).toEqual([true, false, false]);
  });
});
