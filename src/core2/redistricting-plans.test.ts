/**
 * The even plan over real block groups: contiguous runs near the ideal
 * population for the districts a state really has, and district make-up summed
 * from units. New Mexico (3 House districts) and Washington (10) are drawn
 * from their 2020 block groups.
 */
import { describe, expect, it } from "vitest";
import { cvapUnits, neighborhoodUnits } from "./neighborhoods";
import {
  asPlanUnit,
  deviationLimit,
  districtCvapMakeup,
  evenPlan,
  maxDeviation,
  meetsDeviationLimit,
  incumbentPlan,
  membersIn,
  partisanPlan,
  planStats,
  totalDeviation,
  vraPlan,
  type CitizenPlanUnit,
} from "./redistricting-plans";

describe("the even plan", () => {
  it("cuts New Mexico's block groups into 3 districts within half a percent of equal", async () => {
    const units = (await neighborhoodUnits("NM")).map(asPlanUnit);
    const plan = evenPlan(units, 3);
    const stats = planStats(plan);
    expect(stats).toHaveLength(3);
    expect(stats.reduce((n, s) => n + s.people, 0)).toBe(
      units.reduce((n, u) => n + u.population, 0),
    );
    expect(maxDeviation(plan)).toBeLessThan(0.005);
    // Every unit is in exactly one district.
    expect(plan.districtOf.size).toBe(units.length);
  });

  it("cuts Washington's block groups into 10 districts within half a percent", async () => {
    const units = (await neighborhoodUnits("WA")).map(asPlanUnit);
    expect(maxDeviation(evenPlan(units, 10))).toBeLessThan(0.005);
  });

  it("keeps each district a run of ids, so a district never skips back across the state", async () => {
    const units = (await neighborhoodUnits("NM")).map(asPlanUnit);
    const plan = evenPlan(units, 3);
    const ends = plan.districts.map((run) => [
      run[0]!.geoid,
      run.at(-1)!.geoid,
    ]);
    for (let i = 1; i < ends.length; i++)
      expect(ends[i]![0]! > ends[i - 1]![1]!).toBe(true);
  });

  it("sums a district's citizen voting-age make-up from its units", async () => {
    const units = (await neighborhoodUnits("NM")).map(asPlanUnit);
    const cvap = await cvapUnits("NM");
    const make = districtCvapMakeup(evenPlan(units, 3), cvap);
    expect(make).toHaveLength(3);
    for (const row of make) {
      expect(row.cvap).toBeGreaterThan(300_000);
      expect(row.minorityShare).toBeGreaterThan(0.3);
      expect(row.minorityShare).toBeLessThan(0.8);
    }
  });

  it("refuses a plan with no districts", () => {
    expect(() => evenPlan([], 0)).toThrow();
  });
});

describe("the population limit and the Voting Rights Act plan", () => {
  it("reads each level's limit from data and holds the even plan to it", async () => {
    const units = (await neighborhoodUnits("NM")).map(asPlanUnit);
    const plan = evenPlan(units, 3);
    expect(deviationLimit("us-house")).toBe(0.001);
    expect(deviationLimit("state-legislature")).toBe(0.1);
    expect(meetsDeviationLimit(plan, "state-legislature")).toBe(true);
    // Block groups are too coarse for the strict congressional limit without splitting one.
    expect(totalDeviation(plan)).toBeGreaterThan(0);
  });

  it("draws New Mexico's 3 districts for a majority-minority citizen voting-age count where one can be made", async () => {
    const units = await neighborhoodUnits("NM");
    const cit = new Map((await cvapUnits("NM")).map((c) => [c.geoid, c]));
    const citizens: CitizenPlanUnit[] = units.map((u) => ({
      geoid: u.geoid,
      population: u.population,
      cvap: cit.get(u.geoid)?.cvap ?? 0,
      cvapWhite: cit.get(u.geoid)?.cvapNhWhite ?? 0,
    }));
    const plan = vraPlan(citizens, 3, "state-legislature");
    expect(plan).toBeDefined();
    expect(meetsDeviationLimit(plan!, "state-legislature")).toBe(true);
    const make = districtCvapMakeup(plan!, await cvapUnits("NM"));
    const even = districtCvapMakeup(
      evenPlan(units.map(asPlanUnit), 3),
      await cvapUnits("NM"),
    );
    const majorities = (rows: typeof make) =>
      rows.filter((r) => r.minorityShare > 0.5).length;
    // Never fewer majority-minority districts than the even plan, and every unit is placed.
    expect(majorities(make)).toBeGreaterThanOrEqual(majorities(even));
    expect(plan!.districtOf.size).toBe(units.length);
  }, 120_000);

  it("returns nothing when no cut can meet the limit", async () => {
    const units: CitizenPlanUnit[] = [
      { geoid: "1", population: 1000, cvap: 800, cvapWhite: 100 },
      { geoid: "2", population: 10, cvap: 8, cvapWhite: 1 },
    ];
    expect(vraPlan(units, 2, "us-house")).toBeUndefined();
  });
});

describe("the other goals' plans", () => {
  it("draws the most seats for a party from recorded votes, and no more than the votes allow", async () => {
    const units = await neighborhoodUnits("NM");
    // Votes follow the citizens' make-up, a stand-in for recorded results: our party wins where minority citizens are a majority.
    const cit = new Map((await cvapUnits("NM")).map((c) => [c.geoid, c]));
    const voting = units.map((u) => {
      const c = cit.get(u.geoid);
      const minority = c ? c.cvap - c.cvapNhWhite : 0;
      return {
        geoid: u.geoid,
        population: u.population,
        ours: minority,
        theirs: c ? c.cvapNhWhite : 0,
      };
    });
    const best = partisanPlan(voting, 3, "state-legislature");
    expect(best).toBeDefined();
    const seatsOf = (plan: NonNullable<typeof best>) =>
      plan.districts.filter((run) => {
        let o = 0,
          t = 0;
        for (const u of run) {
          const v = voting.find((x) => x.geoid === u.geoid)!;
          o += v.ours;
          t += v.theirs;
        }
        return o > t;
      }).length;
    expect(seatsOf(best!)).toBeGreaterThanOrEqual(
      seatsOf(evenPlan(units.map(asPlanUnit), 3)),
    );
  }, 120_000);

  it("keeps sitting members apart when it can: 3 members, 3 districts, one each", async () => {
    const units = await neighborhoodUnits("NM");
    // Three members live in the first, a middle and the last block group by id.
    const ids = units.map((u) => u.geoid);
    const homes = new Map([
      [ids[0]!, 1],
      [ids[Math.floor(ids.length / 2)]!, 1],
      [ids.at(-1)!, 1],
    ]);
    const homed = units.map((u) => ({
      geoid: u.geoid,
      population: u.population,
      members: homes.get(u.geoid) ?? 0,
    }));
    const plan = incumbentPlan(homed, 3, "state-legislature");
    expect(plan).toBeDefined();
    expect(membersIn(plan!, homes)).toEqual([1, 1, 1]);
    // Two members in one unit cannot be parted: the plan holds them in one district.
    const together = new Map([[ids[0]!, 2]]);
    const pair = incumbentPlan(
      units.map((u) => ({
        geoid: u.geoid,
        population: u.population,
        members: together.get(u.geoid) ?? 0,
      })),
      3,
      "state-legislature",
    );
    expect(membersIn(pair!, together).filter((n) => n === 2)).toHaveLength(1);
  });
});
