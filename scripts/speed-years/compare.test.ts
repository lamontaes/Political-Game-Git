import { readFileSync } from "node:fs";
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
      "Year 1: a receipt has no records proof; rerun main with this run.ts",
    ]);
  });
  it("names the tables whose records differ", () => {
    const table = (digest: string) => ({ rows: 1, digest });
    const proved = {
      ...baseline,
      rows: [
        {
          ...baseline.rows[0]!,
          tables: { "core.people": table("a"), "core.jobs": table("b") },
        },
      ],
    };
    const changed = {
      ...proved,
      rows: [
        {
          ...proved.rows[0]!,
          fingerprint: "different",
          tables: { "core.people": table("a"), "core.jobs": table("c") },
        },
      ],
    };
    expect(compareYears(proved, changed, true)).toEqual([
      "Year 1: records differ in core.jobs",
    ]);
    expect(compareYears(proved, { ...changed, seed: "other" }, true)).toEqual([
      "seed differs",
    ]);
  });
  it("accepts explicitly coordinated coexistence without claiming exclusivity", () => {
    const coordinated = { ...baseline, exclusive: false, coordinated: true };
    expect(compareYears(baseline, coordinated, true)).toEqual([]);
    expect(
      compareYears(coordinated, { ...coordinated, coordinated: false }),
    ).toHaveLength(1);
  });
  it("rejects invalid elapsed times", () => {
    expect(
      compareYears(baseline, {
        ...baseline,
        rows: [{ ...baseline.rows[0]!, seconds: Number.NaN }],
      }),
    ).toHaveLength(1);
  });
  it("measures a year at the young-generation size play and the guards use", () => {
    const json = (path: string) =>
      JSON.parse(readFileSync(new URL(path, import.meta.url), "utf8"));
    const policy = json("../core2-guard/policies.json").nodeSemiSpaceMiB;
    expect(json("../../package.json").scripts["speed:year"]).toContain(
      `--max-semi-space-size=${policy} `,
    );
  });
});
