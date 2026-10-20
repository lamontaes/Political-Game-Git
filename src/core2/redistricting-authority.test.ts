/**
 * Who draws follows the independent-redistricting law in force, and the body
 * that draws chooses among printed plans for reasons it can state: a
 * commission takes the even, Voting Rights Act plan, a legislature the plan
 * that keeps its members apart and wins its party seats. Changing the law
 * changes who draws, in a played world in a drawn place.
 */
import { randomBytes } from "node:crypto";
import { describe, expect, it } from "vitest";
import { buildBenchWorld } from "../bench/world";
import { drawPlace } from "../../scripts/core2-year/place";
import { setBookkeeping } from "./bookkeeping";
import { gameStartDate } from "./game-start";
import { addDays, makeIsoDate } from "./kernel/dates";
import { advanceCore } from "./life";
import { enactLaw, lawChain } from "./modules/laws";
import {
  INDEPENDENT_REDISTRICTING,
  choosePlan,
  whoDrawsIn,
  type PlanFacts,
} from "./redistricting-authority";
import { coreAPI } from "./state";

const plans: PlanFacts[] = [
  {
    id: "even",
    totalDeviation: 0.002,
    deviationLimit: 0.1,
    majorityMinorityDistricts: 3,
    pairedMembers: 2,
    drawerSeats: 4,
    districts: 10,
  },
  {
    id: "members",
    totalDeviation: 0.02,
    deviationLimit: 0.1,
    majorityMinorityDistricts: 2,
    pairedMembers: 0,
    drawerSeats: 5,
    districts: 10,
  },
  {
    id: "party",
    totalDeviation: 0.09,
    deviationLimit: 0.1,
    majorityMinorityDistricts: 1,
    pairedMembers: 1,
    drawerSeats: 8,
    districts: 10,
  },
  {
    id: "vra",
    totalDeviation: 0.01,
    deviationLimit: 0.1,
    majorityMinorityDistricts: 5,
    pairedMembers: 1,
    drawerSeats: 4,
    districts: 10,
  },
  {
    id: "over",
    totalDeviation: 0.2,
    deviationLimit: 0.1,
    majorityMinorityDistricts: 6,
    pairedMembers: 0,
    drawerSeats: 9,
    districts: 10,
  },
];

describe("choosing among printed plans", () => {
  it("a commission takes the plan that is nearly equal and meets the Voting Rights Act test", () => {
    const choice = choosePlan("commission", plans);
    expect(choice.chosen).toBe("vra");
  });

  it("a legislature takes the plan that wins its party seats within the limit, not the one over it", () => {
    const choice = choosePlan("legislature", plans);
    expect(choice.chosen).toBe("party");
    // The plan over the population limit is scored down by the breach however many seats it wins.
    const over = choice.scored.find((s) => s.id === "over")!;
    expect(
      over.reasons.find((r) => r.fact === "limitBreach")!.contribution,
    ).toBeLessThan(0);
    expect(over.score).toBeLessThan(
      choice.scored.find((s) => s.id === "party")!.score,
    );
  });

  it("states a reason for every fact, and a commission gives party seats no weight", () => {
    const choice = choosePlan("commission", plans);
    for (const row of choice.scored) {
      expect(row.reasons.map((r) => r.fact)).toEqual([
        "evenness",
        "majorityMinorityDistricts",
        "pairedMembers",
        "drawerSeats",
        "limitBreach",
      ]);
      expect(
        row.reasons.find((r) => r.fact === "drawerSeats")!.contribution,
      ).toBe(0);
    }
  });

  it("breaks a tie by plan id, never at random", () => {
    const twin = { ...plans[0]!, id: "a" };
    const other = { ...plans[0]!, id: "b" };
    expect(choosePlan("legislature", [other, twin]).chosen).toBe("a");
  });
});

describe("who holds the pen", () => {
  it("follows the independent-redistricting law at the state level, and changes when the law does", () => {
    setBookkeeping(false);
    const seed =
      process.env.GOLDEN_PATH_SEED ?? randomBytes(20).toString("hex");
    const place = drawPlace(seed, "redistricting-authority");
    const where = `seed ${seed}, ${place.name} (${place.key})`;
    const { core } = buildBenchWorld(place.seed, gameStartDate(), {
      twoLevel: true,
      placeKey: place.key,
    });
    const api = coreAPI(core);
    const set = (value: number) => {
      for (const level of lawChain(api).levels)
        if (level.level === "state")
          enactLaw(api, {
            jurisdiction: level.jurisdiction,
            level: level.level,
            series: INDEPENDENT_REDISTRICTING,
            value,
            effectiveDate: core.date,
            measureId: `fixture:redistricting-authority:${value}`,
            citation:
              "Controlled law case for the redistricting authority test.",
          });
      advanceCore(core, addDays(makeIsoDate(core.date), 2));
    };
    set(0);
    expect(whoDrawsIn(api, "state").drawer, where).toBe("legislature");
    set(1);
    const commission = whoDrawsIn(api, "state");
    expect(commission.drawer, where).toBe("commission");
    expect(commission.lawRowId, where).toBeTruthy();
    set(0);
    expect(whoDrawsIn(api, "state").drawer, where).toBe("legislature");
  }, 900_000);
});
