/**
 * Every running link carries its spread (a range that brackets its size)
 * and every phase-in carries the words that justify it.
 */
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

interface Row {
  key: string;
  size: number | null;
  range?: [number, number];
  rangeSource?: string;
  phaseInMonths?: number;
  phaseInSource?: string;
}

const links = (
  JSON.parse(readFileSync("data/research/outcome-web/links.json", "utf8")) as {
    links: Row[];
  }
).links;
const wired = (
  JSON.parse(
    readFileSync("src/core2/data/outcome-web/coverage.json", "utf8"),
  ) as { wired: string[] }
).wired;
const byKey = new Map(links.map((row) => [row.key, row]));

describe("the outcome web's spreads and timing", () => {
  it("gives every running link a range that brackets its size, with a source", () => {
    expect(wired.length).toBeGreaterThan(0);
    for (const key of wired) {
      const row = byKey.get(key)!;
      expect(row, key).toBeDefined();
      if (row.size === null) continue;
      expect(row.range, key).toBeDefined();
      const [low, high] = row.range!;
      expect(low <= row.size && row.size <= high, key).toBe(true);
    }
  });

  it("names where each new spread came from", () => {
    for (const row of links.filter((r) => r.rangeSource !== undefined))
      expect(row.rangeSource!.length, row.key).toBeGreaterThan(40);
  });

  it("quotes a source for every phase-in", () => {
    for (const row of links.filter((r) => r.phaseInMonths !== undefined)) {
      expect(row.phaseInMonths!, row.key).toBeGreaterThan(0);
      expect(row.phaseInSource?.length ?? 0, row.key).toBeGreaterThan(20);
    }
  });
});
