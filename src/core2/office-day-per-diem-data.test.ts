/**
 * The state legislators' per diem table covers all 56 places and every row
 * cites its source (pool: office-pay-through-the-payroll-and-per-diem). A
 * place whose rate was not found is an estimate with its spread and where the
 * figure was estimated from, never missing.
 */
import { expect, it } from "vitest";
import perDiem from "./data/office-day/state-legislator-per-diem.json" with { type: "json" };
import { placeStateKeys } from "./places";
import { perDiemOf } from "./office-day-state";

interface Row {
  dailyMinor: number;
  basis: string;
  tag: "SOURCED" | "ESTIMATED";
  spreadMinor: number;
  note: string;
  source: string;
  estimatedFrom?: string;
}

it("has a cited row for every one of the 56 places", () => {
  const table = perDiem as unknown as {
    sources: Record<string, { url: string; title: string }>;
    places: Record<string, Row>;
  };
  const keys = [...placeStateKeys()].sort();
  expect(keys).toHaveLength(56);
  expect(Object.keys(table.places).sort()).toEqual(keys);
  const bases = new Set([
    "session-day",
    "calendar-day-in-session",
    "vouchered",
    "none",
  ]);
  for (const key of keys) {
    const row = table.places[key]!;
    expect(bases.has(row.basis), `${key} basis ${row.basis}`).toBe(true);
    // Every row names a source with a title and a link.
    const source = table.sources[row.source];
    expect(source, `${key} source ${row.source}`).toBeDefined();
    expect(source!.title.length, key).toBeGreaterThan(0);
    expect(source!.url.startsWith("http"), key).toBe(true);
    // An estimate says what it was estimated from and how far it may be off.
    if (row.tag === "ESTIMATED") {
      expect(
        row.estimatedFrom?.length ?? 0,
        `${key} estimatedFrom`,
      ).toBeGreaterThan(0);
      if (row.dailyMinor > 0)
        expect(row.spreadMinor, `${key} spread`).toBeGreaterThan(0);
    }
    // The reader gives the row back with its citation for a world seed.
    const read = perDiemOf(key, "per-diem-data-test");
    expect(read?.citation, key).toContain(key);
    expect(read!.dailyMinor, key).toBeGreaterThanOrEqual(0);
  }
});
