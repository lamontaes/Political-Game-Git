import { randomBytes } from "node:crypto";
import { describe, expect, it } from "vitest";
import { drawPlace } from "../../scripts/core2-year/place";
import { generatedOpening } from "./tooling/generated-world";

const seed = process.env.GOLDEN_PATH_SEED ?? randomBytes(16).toString("hex");
const place = drawPlace(seed, "core2-world-settings");

describe(`custom world settings in ${place.name} (seed ${seed})`, () => {
  it("honors population, wages and outside demand, and records them", () => {
    const base = generatedOpening(place, {
      twoLevel: true,
      settings: { population: 1500 },
    });
    const custom = generatedOpening(place, {
      twoLevel: true,
      settings: {
        population: 1500,
        economy: { wages: 2, outsideDemand: 1.5 },
        politics: { leanShift: 0.2 },
      },
    });
    const counted = (input: typeof base) =>
      input.people.length +
      input.residents!.households.reduce((n, row) => n + row.people.length, 0);
    expect(counted(base)).toBeGreaterThanOrEqual(1500);
    expect(counted(base)).toBeLessThan(2000);
    const pay = new Map(base.jobs.map((row) => [row.id, row.wageDailyMinor]));
    for (const job of custom.jobs)
      expect(job.wageDailyMinor).toBe(Math.round(pay.get(job.id)! * 2));
    expect(JSON.parse(custom.placeMetadata!.worldSettings!)).toMatchObject({
      politics: { leanShift: 0.2 },
    });
    expect(custom.gaps.some((gap) => gap.startsWith("Custom world"))).toBe(
      true,
    );
    const outside = (input: typeof base) =>
      input.residents!.flows.filter((row) => row.kind === "outside-sales");
    const baseOutside = new Map(
      outside(base).map((row) => [row.id, row.amountMinor]),
    );
    for (const row of outside(custom))
      if (baseOutside.has(row.id))
        expect(row.amountMinor).toBeGreaterThan(baseOutside.get(row.id)!);
    // The counted electorate starts from the custom lean.
    const leanOf = (input: typeof base) =>
      new Map(
        (input.voterGroups ?? []).map((row) => [row.id, row.lean] as const),
      );
    const baseLean = leanOf(base);
    for (const [id, lean] of leanOf(custom))
      expect(lean).toBeCloseTo(
        Math.max(-1, Math.min(1, baseLean.get(id)! + 0.2)),
        10,
      );
  }, 600_000);

  it("refuses settings outside their range", () => {
    expect(() =>
      generatedOpening(place, { settings: { economy: { wages: 10 } } }),
    ).toThrow(/between 0.25 and 4/);
    expect(() =>
      generatedOpening(place, { settings: { population: 10 } }),
    ).toThrow(/100 to 50,000/);
  });
});
