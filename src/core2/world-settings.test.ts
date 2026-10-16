import { randomBytes } from "node:crypto";
import { describe, expect, it } from "vitest";
import { drawPlace } from "../../scripts/core2-year/place";
import { generatedOpening } from "./tooling/generated-world";
import { buildPopulation } from "./population";
import { gameStartDate } from "./game-start";
import { customPolitics } from "./electorate";
import type { CoreState } from "./types";

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
    // The population builder takes the setting as a minimum: a place larger
    // than it opens at its own size.
    expect(counted(base)).toBeGreaterThanOrEqual(1500);
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
    // The electorate reads the custom lean (the town's lean shifts by it).
    const politics = (input: typeof base) =>
      customPolitics({
        placeMetadata: input.placeMetadata ?? {},
      } as unknown as CoreState);
    expect(politics(custom).leanShift).toBe(0.2);
    expect(politics(base).leanShift).toBe(0);
  }, 600_000);

  it("opens a town at the size the setting asks, in any place", () => {
    // Oct 11 report: a custom world of 1,500 opened with 7,582 people. The
    // town's own residents are the asked size; their kin elsewhere are husks
    // (no home here, no past until met) and do not count toward it.
    const asked = 1500;
    for (const label of ["a", "b", "c", "d"]) {
      const draw = drawPlace(seed, `core2-world-settings-size-${label}`);
      const where = `${draw.name} [${draw.key}], seed ${draw.seed}`;
      const input = buildPopulation({
        seed: draw.seed,
        placeKey: draw.key,
        startedAt: gameStartDate(),
        minimumPeople: asked,
      });
      const residents = input.people.filter((row) => row.tier !== "husk");
      expect(residents.length, where).toBeGreaterThanOrEqual(asked);
      expect(residents.length, where).toBeLessThanOrEqual(asked + 200);
    }
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
