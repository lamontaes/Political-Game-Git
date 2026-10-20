/**
 * What a court measures when a map is challenged, from the units and never
 * from a person: equal population (the total deviation against the level's
 * limit) and the first Voting Rights Act condition (Thornburg v. Gingles, 478
 * U.S. 30 (1986)), whether a compact district, drawn within the population
 * limit, could hold a citizen voting-age majority of one protected group, and
 * whether the plan under challenge holds fewer such districts than that. The
 * second and third conditions (the group votes together; bloc voting by the
 * majority defeats its choices) read precinct results by neighborhood make-up
 * and the judges' votes belong to the court engine, which is not built.
 */
import {
  deviationLimit,
  meetsDeviationLimit,
  scoredPlan,
  totalDeviation,
  type Plan,
  type PlanLevel,
} from "./redistricting-plans";
import type { CvapUnit } from "./neighborhoods";

/** A protected group, as the citizen voting-age tabulation counts it. */
export type ProtectedGroup = "hispanic" | "black" | "asian" | "aian";

const groupField: Record<ProtectedGroup, keyof CvapUnit> = {
  hispanic: "cvapHispanic",
  black: "cvapNhBlack",
  asian: "cvapNhAsian",
  aian: "cvapNhAIAN",
};

export interface PopulationFinding {
  readonly totalDeviation: number;
  readonly limit: number;
  /** Over the limit: the state must justify the plan. */
  readonly overLimit: boolean;
}

/** Equal population: the plan's total deviation against the level's limit. */
export function populationFinding(
  plan: Plan,
  level: PlanLevel,
): PopulationFinding {
  return {
    totalDeviation: totalDeviation(plan),
    limit: deviationLimit(level),
    overLimit: !meetsDeviationLimit(plan, level),
  };
}

/** Districts of a plan where the group is a majority of citizen voting-age people. */
export function groupMajorityDistricts(
  plan: Plan,
  cvap: readonly CvapUnit[],
  group: ProtectedGroup,
): number {
  const byId = new Map(cvap.map((u) => [u.geoid, u]));
  const field = groupField[group];
  return plan.districts.filter((run) => {
    let total = 0,
      part = 0;
    for (const unit of run) {
      const c = byId.get(unit.geoid);
      if (!c) continue;
      total += c.cvap;
      part += Number(c[field]);
    }
    return total > 0 && part / total > 0.5;
  }).length;
}

export interface Gingles1Finding {
  readonly group: ProtectedGroup;
  /** The most districts, within the limit, that could hold a majority of the group. */
  readonly achievable: number;
  /** How many the plan under challenge holds. */
  readonly inPlan: number;
  /** A compact majority district could be drawn that the plan does not draw. */
  readonly met: boolean;
}

/**
 * The first condition for one group: of all the ways to cut the units into the
 * state's districts within the limit, the most that could hold a citizen
 * voting-age majority of the group, against the number the plan holds.
 */
export function gingles1(
  plan: Plan,
  units: readonly { geoid: string; population: number }[],
  cvap: readonly CvapUnit[],
  group: ProtectedGroup,
  level: PlanLevel,
): Gingles1Finding {
  const byId = new Map(cvap.map((u) => [u.geoid, u]));
  const field = groupField[group];
  const best = scoredPlan(
    units.map((u) => {
      const c = byId.get(u.geoid);
      return {
        geoid: u.geoid,
        population: u.population,
        features: [c?.cvap ?? 0, c ? Number(c[field]) : 0],
      };
    }),
    plan.districts.length,
    level,
    ([total, part]) => (total! > 0 && part! / total! > 0.5 ? 1 : 0),
  );
  const achievable = best ? groupMajorityDistricts(best, cvap, group) : 0;
  const inPlan = groupMajorityDistricts(plan, cvap, group);
  return { group, achievable, inPlan, met: achievable > inPlan };
}
