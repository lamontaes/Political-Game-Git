/**
 * The 2024 county vote joined to block groups: every county outside Alaska
 * and the District of Columbia is found by FIPS, and the drawer's party
 * wins more seats from a plan drawn for it than from the even plan.
 */
import { describe, expect, it } from "vitest";
import fipsData from "./data/census/county-fips.json" with { type: "json" };
import votes from "./data/county-presidential-2024.json" with { type: "json" };
import { countyVote, unitVotes } from "./county-votes";
import { neighborhoodUnits } from "./neighborhoods";
import { asPlanUnit, evenPlan, partisanPlan } from "./redistricting-plans";

describe("county votes by block group", () => {
  it("finds every county's result by FIPS except Alaska's districts and D.C.'s wards", () => {
    const fips = fipsData.fips as Record<string, string>;
    const missing = Object.keys(votes.byStateCounty).filter(
      (key) => !fips[key] && !key.startsWith("AK|") && !key.startsWith("DC|"),
    );
    expect(missing).toEqual([]);
    expect(countyVote("48201")).toBeDefined(); // Harris County, Texas
    expect(countyVote("02020")).toBeUndefined(); // Anchorage
  });

  it("gives each block group its county's share of its voting-age people", async () => {
    const units = await neighborhoodUnits("TX");
    const v = unitVotes(units, "republican");
    const harris = units.find((u) => u.geoid.startsWith("48201"))!;
    const row = v.get(harris.geoid)!;
    expect(row.ours + row.theirs).toBeCloseTo(harris.vap, 6);
    // Harris County voted Democratic in 2024.
    expect(row.ours).toBeLessThan(row.theirs);
    expect(v.size / units.length).toBeGreaterThan(0.99);
  }, 120_000);

  it("a plan drawn for a party wins it at least as many Texas districts as the even plan", async () => {
    const units = await neighborhoodUnits("TX");
    const votesById = unitVotes(units, "republican");
    const fed = units.map((u) => ({
      geoid: u.geoid,
      population: u.population,
      ours: votesById.get(u.geoid)?.ours ?? 0,
      theirs: votesById.get(u.geoid)?.theirs ?? 0,
    }));
    const wins = (plan: ReturnType<typeof evenPlan>) =>
      plan.districts.filter((run) => {
        let o = 0,
          t = 0;
        for (const u of run) {
          const x = votesById.get(u.geoid);
          if (x) {
            o += x.ours;
            t += x.theirs;
          }
        }
        return o > t;
      }).length;
    const drawn = partisanPlan(fed, 38, "state-legislature")!;
    expect(wins(drawn)).toBeGreaterThanOrEqual(
      wins(evenPlan(units.map(asPlanUnit), 38)),
    );
  }, 240_000);
});
