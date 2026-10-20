/**
 * What a court measures of a challenged map, on real block groups: equal
 * population against the level's limit, and the first Voting Rights Act
 * condition for each protected group, from citizen voting-age counts.
 */
import { describe, expect, it } from "vitest";
import { cvapUnits, neighborhoodUnits } from "./neighborhoods";
import {
  gingles1,
  groupMajorityDistricts,
  populationFinding,
} from "./redistricting-challenge";
import { asPlanUnit, evenPlan } from "./redistricting-plans";

describe("a map challenge's measured findings", () => {
  it("finds a plan over the population limit, and one within it", async () => {
    const units = (await neighborhoodUnits("NM")).map(asPlanUnit);
    const plan = evenPlan(units, 3);
    expect(populationFinding(plan, "state-legislature").overLimit).toBe(false);
    // A plan with all but a sliver in one district is far over the limit.
    const lopsided = evenPlan(units.slice(0, 20), 2);
    const skewed = {
      ...lopsided,
      districts: [units.slice(0, 19), units.slice(19, 20)],
    };
    expect(populationFinding(skewed, "state-legislature").overLimit).toBe(true);
  });

  it("measures the first condition for Hispanic citizens in New Mexico consistently with the plan's own count", async () => {
    const units = (await neighborhoodUnits("NM")).map(asPlanUnit);
    const cvap = await cvapUnits("NM");
    const plan = evenPlan(units, 3);
    const finding = gingles1(
      plan,
      units,
      cvap,
      "hispanic",
      "state-legislature",
    );
    expect(finding.achievable).toBeGreaterThanOrEqual(finding.inPlan);
    expect(finding.inPlan).toBe(groupMajorityDistricts(plan, cvap, "hispanic"));
    // Id order is a stand-in for adjacency; New Mexico's Hispanic counties are not a run of ids, so the search may find none.
    expect(finding.met).toBe(finding.achievable > finding.inPlan);
  }, 120_000);

  it("finds a group that cannot form a majority anywhere to fail the first condition", async () => {
    const units = (await neighborhoodUnits("VT")).map(asPlanUnit);
    const cvap = await cvapUnits("VT");
    const finding = gingles1(
      evenPlan(units, 2),
      units,
      cvap,
      "black",
      "state-legislature",
    );
    expect(finding.achievable).toBe(0);
    expect(finding.met).toBe(false);
  });

  it("finds Hispanic citizens in Texas could fill more majority districts than an even plan gives them", async () => {
    const units = (await neighborhoodUnits("TX")).map(asPlanUnit);
    const cvap = await cvapUnits("TX");
    const finding = gingles1(
      evenPlan(units, 38),
      units,
      cvap,
      "hispanic",
      "state-legislature",
    );
    expect(finding.achievable).toBeGreaterThan(finding.inPlan);
    expect(finding.met).toBe(true);
  }, 240_000);
});
