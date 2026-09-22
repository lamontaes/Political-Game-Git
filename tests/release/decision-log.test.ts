import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

/**
 * The decision log has no index, and no gate has ever read a decision number.
 *
 * On 2026-09-22 two lanes both wrote D-090 within the same hour, because
 * nothing between them could see the other's append. It surfaced only as a
 * merge conflict in this one file, which is the wrong instrument: a conflict
 * reports that two people edited the same lines, not that the repository now
 * holds two different decisions under one name. A citation of "D-090"
 * elsewhere would then point at either of them.
 *
 * So the numbers are checked here, where a branch finds out before it merges.
 */
const LOG = "docs/decisions/DECISION-LOG.md";
const HEADING = /^## D-(\d+)\s+—\s+\S/gm;

function decisionNumbers(): readonly number[] {
  const text = readFileSync(LOG, "utf8");
  return [...text.matchAll(HEADING)].map((match) => Number(match[1]));
}

describe("the decision log's numbering", () => {
  it("reads at least one decision, so the rest of this file can fail", () => {
    // Without this, a heading format change would empty every list below and
    // leave three green assertions that looked at nothing.
    expect(decisionNumbers().length).toBeGreaterThan(80);
  });

  it("gives every decision its own number", () => {
    const numbers = decisionNumbers();
    const seen = new Map<number, number>();
    for (const value of numbers) seen.set(value, (seen.get(value) ?? 0) + 1);
    const repeated = [...seen.entries()]
      .filter(([, count]) => count > 1)
      .map(([value, count]) => `D-${String(value).padStart(3, "0")} x${count}`);
    expect(repeated, "two decisions share a number").toEqual([]);
  });

  it("keeps them in order and without a gap", () => {
    const numbers = decisionNumbers();
    expect(numbers, "decisions are out of order").toEqual(
      [...numbers].sort((a, b) => a - b),
    );
    // A gap is how a collision usually looks after someone renumbers half of
    // it: the duplicate goes away and a number nobody used is left behind.
    const expected = Array.from(
      { length: numbers[numbers.length - 1]! - numbers[0]! + 1 },
      (_, index) => numbers[0]! + index,
    );
    expect(numbers, "a decision number is missing").toEqual(expected);
  });
});
