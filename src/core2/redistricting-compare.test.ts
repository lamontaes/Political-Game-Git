/**
 * The rows a plan-comparison screen reads: per plan, per district, people,
 * deviation, last vote, make-up totals and members, from real New Mexico block
 * groups, with the members paired under one plan and parted under another.
 */
import { describe, expect, it } from "vitest";
import { cvapUnits, neighborhoodUnits } from "./neighborhoods";
import { comparePlans } from "./redistricting-compare";
import { asPlanUnit, evenPlan, incumbentPlan } from "./redistricting-plans";

describe("comparing printed plans", () => {
  it("gives each district's people, deviation, vote, make-up and members, and counts members paired", async () => {
    const units = await neighborhoodUnits("NM");
    const cvap = await cvapUnits("NM");
    const ids = units.map((u) => u.geoid);
    // Two members share the first block group's neighborhood; a third lives in the last block group.
    const homes = new Map<string, string[]>([
      [ids[0]!, ["person:a", "person:b"]],
      [ids.at(-1)!, ["person:c"]],
    ]);
    const votes = new Map(
      units.map((u) => [u.geoid, { ours: u.nhWhite, theirs: u.hispanic }]),
    );
    const even = evenPlan(units.map(asPlanUnit), 3);
    const kept = incumbentPlan(
      units.map((u) => ({
        geoid: u.geoid,
        population: u.population,
        members: (homes.get(u.geoid) ?? []).length,
      })),
      3,
      "state-legislature",
    )!;
    const [a, b] = comparePlans(
      [
        { id: "even", plan: even },
        { id: "members", plan: kept },
      ],
      { votes, homes, cvap },
    );
    expect(a!.districts).toHaveLength(3);
    expect(a!.districts.reduce((n, d) => n + d.people, 0)).toBe(
      units.reduce((n, u) => n + u.population, 0),
    );
    for (const d of a!.districts) {
      expect(Math.abs(d.deviation)).toBeLessThan(0.01);
      expect(d.cvap).toBeGreaterThan(0);
      expect(d.minorityShare).toBeGreaterThan(0);
      expect(d.ours + d.theirs).toBeGreaterThan(0);
    }
    // The two members who share a block group are in one district in every plan, so one is paired in both.
    expect(a!.pairedMembers).toBe(1);
    expect(b!.pairedMembers).toBe(1);
    expect(a!.districts.flatMap((d) => d.members).sort()).toEqual([
      "person:a",
      "person:b",
      "person:c",
    ]);
  }, 120_000);
});
