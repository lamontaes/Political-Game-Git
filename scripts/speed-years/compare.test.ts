import { describe, expect, it } from "vitest";
import { compareYears, type SpeedReceipt } from "./compare";
const baseline: SpeedReceipt = {
  seed: "same",
  place: "same",
  stepDays: 30,
  head: "main",
  host: "one",
  exclusive: true,
  rows: [{ year: 1, seconds: 10, fingerprint: "saved", date: "2027-01-05" }],
};
describe("year speed budget", () => {
  it("admits exactly 20% and rejects any larger slowdown", () => {
    const atLimit = {
      ...baseline,
      rows: [{ ...baseline.rows[0]!, seconds: 12 }],
    };
    expect(compareYears(baseline, atLimit)).toEqual([]);
    expect(
      compareYears(baseline, {
        ...atLimit,
        rows: [{ ...atLimit.rows[0]!, seconds: 12.01 }],
      }),
    ).toHaveLength(1);
  });
  it("refuses incomparable routes and contended runs", () => {
    expect(
      compareYears(baseline, { ...baseline, seed: "other", exclusive: false }),
    ).toHaveLength(2);
    expect(compareYears(baseline, { ...baseline, rows: [] })).not.toEqual([]);
    expect(
      compareYears(baseline, {
        ...baseline,
        rows: [{ ...baseline.rows[0]!, date: "2028-01-05" }],
      }),
    ).not.toEqual([]);
  });
  it("checks world identity for an optimization but permits intended world changes", () => {
    const changed = {
      ...baseline,
      rows: [{ ...baseline.rows[0]!, fingerprint: "different" }],
    };
    expect(compareYears(baseline, changed)).toEqual([]);
    expect(compareYears(baseline, changed, true)).toEqual([
      "Year 1: saved world fingerprint differs",
    ]);
  });
  it("rejects invalid elapsed times", () => {
    expect(
      compareYears(baseline, {
        ...baseline,
        rows: [{ ...baseline.rows[0]!, seconds: Number.NaN }],
      }),
    ).toHaveLength(1);
  });
});
