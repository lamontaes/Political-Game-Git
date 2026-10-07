import { describe, expect, it } from "vitest";
import matrix from "../../data/research/money/minimum-wage-dated-matrix-2026.json" with { type: "json" };

const PLACES = [
  "US-AL",
  "US-AK",
  "US-AZ",
  "US-AR",
  "US-CA",
  "US-CO",
  "US-CT",
  "US-DE",
  "US-DC",
  "US-FL",
  "US-GA",
  "US-HI",
  "US-ID",
  "US-IL",
  "US-IN",
  "US-IA",
  "US-KS",
  "US-KY",
  "US-LA",
  "US-ME",
  "US-MD",
  "US-MA",
  "US-MI",
  "US-MN",
  "US-MS",
  "US-MO",
  "US-MT",
  "US-NE",
  "US-NV",
  "US-NH",
  "US-NJ",
  "US-NM",
  "US-NY",
  "US-NC",
  "US-ND",
  "US-OH",
  "US-OK",
  "US-OR",
  "US-PA",
  "US-RI",
  "US-SC",
  "US-SD",
  "US-TN",
  "US-TX",
  "US-UT",
  "US-VT",
  "US-VA",
  "US-WA",
  "US-WV",
  "US-WI",
  "US-WY",
  "US-AS",
  "US-GU",
  "US-MP",
  "US-PR",
  "US-VI",
];

type Row = {
  tier: string;
  value: number;
  unit: string;
  operativeAt: string;
  operativeBasis: string;
  status: string;
  source: string;
  quote: string;
};

const places = matrix.places as Record<string, { rows: Row[] }>;
const ISO = /^\d{4}-\d{2}-\d{2}$/;

describe("dated minimum-wage research matrix", () => {
  it("covers all 56 places and nothing else", () => {
    expect(Object.keys(places).sort()).toEqual([...PLACES].sort());
  });

  it("gives every place at least one row in force on the as-of date", () => {
    for (const key of PLACES) {
      const inForce = places[key]!.rows.filter(
        (row) => row.operativeAt <= matrix.asOf,
      );
      expect(inForce.length, key).toBeGreaterThan(0);
    }
  });

  it("gives every tier of every place a row in force when the game opens", () => {
    const opening = "2026-01-05";
    for (const key of PLACES) {
      const earliest = new Map<string, string>();
      for (const row of places[key]!.rows) {
        const seen = earliest.get(row.tier);
        if (seen === undefined || row.operativeAt < seen) {
          earliest.set(row.tier, row.operativeAt);
        }
      }
      for (const [tier, date] of earliest) {
        expect(date <= opening, `${key} ${tier} starts ${date}`).toBe(true);
      }
    }
  });

  it("gives every row a source, a quote, a date and a positive rate", () => {
    for (const key of PLACES) {
      for (const row of places[key]!.rows) {
        const label = `${key} ${row.operativeAt}`;
        expect(row.source, label).toMatch(/^https:\/\//);
        expect(row.quote.trim().length, label).toBeGreaterThan(0);
        expect(row.operativeAt, label).toMatch(ISO);
        expect(Object.keys(matrix.conventions.operativeBasis), label).toContain(
          row.operativeBasis,
        );
        expect(row.status, label).toBe(
          row.operativeAt > matrix.asOf ? "scheduled" : "in-force",
        );
        expect(row.unit, label).toBe("minor/hour");
        expect(Number.isInteger(row.value) && row.value > 0, label).toBe(true);
      }
    }
  });

  it("keeps Connecticut on the approved terms", () => {
    const ct = places["US-CT"]!.rows.map((row) => [row.operativeAt, row.value]);
    expect(ct).toEqual([
      ["2026-01-01", 1694],
      ["2027-01-01", 1748],
    ]);
  });
});
