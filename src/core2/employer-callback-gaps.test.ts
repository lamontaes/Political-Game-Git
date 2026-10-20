/**
 * The employer callback gap table is complete: every group names its
 * reference, a ratio inside its own spread, a source and a tag, and a place's
 * spread says where it comes from (estimate, never UNKNOWN).
 */
import { describe, expect, it } from "vitest";
import table from "../../data/research/jobs/employer-callback-gaps.json" with { type: "json" };

interface Row {
  reference: string;
  callbackRatio: { value: number; low: number; high: number; tag: string };
  ratioMeaning: string;
  source: string;
  spreadAcrossPlaces: { note: string; tag: string };
}
const groups = Object.entries(table.groups) as [string, Row][];

describe("employer callback gaps", () => {
  it("has the five groups", () => {
    expect(groups.length).toBeGreaterThanOrEqual(5);
  });
  for (const [id, row] of groups)
    it(`${id}: a sourced ratio below one, inside its spread`, () => {
      const r = row.callbackRatio;
      expect(r.value).toBeGreaterThan(0);
      expect(r.value).toBeLessThan(1);
      expect(r.low).toBeLessThanOrEqual(r.value);
      expect(r.value).toBeLessThanOrEqual(r.high);
      expect(["SOURCED", "ESTIMATED"]).toContain(r.tag);
      expect(row.source).toMatch(/https:\/\//);
      expect(row.reference.length).toBeGreaterThan(0);
      expect(row.ratioMeaning.length).toBeGreaterThan(20);
      expect(["SOURCED", "ESTIMATED"]).toContain(row.spreadAcrossPlaces.tag);
    });
});
