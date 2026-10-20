/**
 * The neighborhood packs match the Census: every state's block groups add up
 * to its 2020 population, each unit's parts add up to its whole, and no person
 * carries race, ethnicity or language.
 */
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import apportionment from "../../data/research/apportionment/apportionment-2020.json" with { type: "json" };
import { minorityVapShare, neighborhoodUnits } from "./neighborhoods";

const dir = join(import.meta.dirname, "data/neighborhoods");

describe("neighborhood packs", () => {
  it("cover 50 states, D.C. and Puerto Rico", () => {
    expect(readdirSync(dir).filter((f) => f.endsWith(".json"))).toHaveLength(
      52,
    );
  });

  it("add up to each state's 2020 population (the apportionment count adds overseas federal staff)", async () => {
    for (const row of apportionment.states) {
      const units = await neighborhoodUnits(row.state);
      const people = units.reduce((n, u) => n + u.population, 0);
      expect(units.length, row.state).toBeGreaterThan(100);
      // The apportionment population adds federal staff overseas: at most about 1.5 percent.
      expect(people / row.apportionmentPopulation, row.state).toBeGreaterThan(
        0.98,
      );
      expect(
        people / row.apportionmentPopulation,
        row.state,
      ).toBeLessThanOrEqual(1);
    }
  }, 120_000);

  it("splits every unit into parts that sum to its whole, for all people and for voting-age people", async () => {
    for (const usps of ["WY", "DC", "VT", "NM"]) {
      for (const u of await neighborhoodUnits(usps)) {
        expect(
          u.hispanic + u.nhWhite + u.nhBlack + u.nhAIAN + u.nhAsian + u.nhOther,
          `${usps} ${u.geoid}`,
        ).toBe(u.population);
        expect(
          u.vapHispanic +
            u.vapNhWhite +
            u.vapNhBlack +
            u.vapNhAIAN +
            u.vapNhAsian +
            u.vapNhOther,
          `${usps} ${u.geoid}`,
        ).toBe(u.vap);
        expect(u.vap).toBeLessThanOrEqual(u.population);
      }
    }
  });

  it("measures a district as a sum of units, never from a person", async () => {
    const units = await neighborhoodUnits("NM");
    const share = minorityVapShare(units);
    // New Mexico's voting-age population is majority Hispanic or non-White.
    expect(share).toBeGreaterThan(0.5);
    expect(minorityVapShare([])).toBe(0);
  });

  it("keeps race, ethnicity and language off every person record", () => {
    const text = readFileSync(join(import.meta.dirname, "types.ts"), "utf8");
    const blocks = [
      ...text.matchAll(
        /export interface (Person\w*|Husk\w*)\s*\{[\s\S]*?\n\}/g,
      ),
    ];
    expect(blocks.length).toBeGreaterThan(0);
    for (const block of blocks)
      expect(block[0], block[1]).not.toMatch(
        /\b(race|ethnicity|hispanic|language)\b/i,
      );
  });
});
