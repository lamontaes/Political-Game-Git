/**
 * Districting plans over block-group units. A plan cuts a state's units, in
 * the geographic order their ids give (county, then tract, then block group),
 * into as many contiguous runs as the state has districts, each near the
 * ideal population. A district's make-up is the sum of its units, the way a
 * court weighs one under the Voting Rights Act; no person is labeled.
 *
 * This is the "even" plan. The plans for the other goals (protect sitting
 * members, most seats for the drawer's party, meet the Voting Rights Act test)
 * read recorded results and incumbents and are the next pieces of
 * gov-redistricting-plan-builder.
 */
import limits from "./data/redistricting/deviation-limits.json" with { type: "json" };
import type { CvapUnit, NeighborhoodUnit } from "./neighborhoods";

export interface PlanUnit {
  readonly geoid: string;
  readonly population: number;
}

export interface Plan {
  /** District number (1-based) of each unit, by geoid. */
  readonly districtOf: ReadonlyMap<string, number>;
  /** The units of each district, in order. */
  readonly districts: readonly (readonly PlanUnit[])[];
}

export interface DistrictStats {
  readonly district: number;
  readonly people: number;
  /** Signed share the district's population is above (or below) the ideal. */
  readonly deviation: number;
}

/**
 * The even plan: units sorted by id and cut where the running total passes
 * each district's share of the whole, so no district is off by more than
 * about one unit's people.
 */
export function evenPlan(units: readonly PlanUnit[], districts: number): Plan {
  if (!Number.isInteger(districts) || districts < 1)
    throw new Error("A plan needs at least one district.");
  const sorted = [...units].sort((a, b) => a.geoid.localeCompare(b.geoid));
  const total = sorted.reduce((n, unit) => n + unit.population, 0);
  const runs: PlanUnit[][] = Array.from({ length: districts }, () => []);
  const districtOf = new Map<string, number>();
  let before = 0;
  for (const unit of sorted) {
    // The district the unit's midpoint falls in, so a unit straddling a cut goes where most of it lies.
    const middle = before + unit.population / 2;
    const district = Math.min(
      districts,
      Math.floor((middle * districts) / Math.max(1, total)) + 1,
    );
    runs[district - 1]!.push(unit);
    districtOf.set(unit.geoid, district);
    before += unit.population;
  }
  return { districtOf, districts: runs };
}

/** Each district's people and how far it is from the ideal. */
export function planStats(plan: Plan): DistrictStats[] {
  const people = plan.districts.map((run) =>
    run.reduce((n, unit) => n + unit.population, 0),
  );
  const ideal = people.reduce((n, p) => n + p, 0) / Math.max(1, people.length);
  return people.map((p, i) => ({
    district: i + 1,
    people: p,
    deviation: ideal > 0 ? (p - ideal) / ideal : 0,
  }));
}

/** The largest gap from the ideal, either way, across the plan's districts. */
export function maxDeviation(plan: Plan): number {
  return Math.max(...planStats(plan).map((row) => Math.abs(row.deviation)));
}

/**
 * Each district's citizen voting-age people and the share of them who are not
 * White alone and not Hispanic, summed from the citizen units the plan covers.
 */
export function districtCvapMakeup(
  plan: Plan,
  cvap: readonly CvapUnit[],
): { district: number; cvap: number; minorityShare: number }[] {
  const byId = new Map(cvap.map((unit) => [unit.geoid, unit]));
  return plan.districts.map((run, i) => {
    let total = 0,
      white = 0;
    for (const unit of run) {
      const c = byId.get(unit.geoid);
      if (!c) continue;
      total += c.cvap;
      white += c.cvapNhWhite;
    }
    return {
      district: i + 1,
      cvap: total,
      minorityShare: total > 0 ? (total - white) / total : 0,
    };
  });
}

/** A neighborhood unit as a plan unit. */
export const asPlanUnit = (unit: NeighborhoodUnit): PlanUnit => ({
  geoid: unit.geoid,
  population: unit.population,
});

export type PlanLevel = "us-house" | "state-legislature" | "local";

/** The total spread (largest district over smallest, as a share of the ideal) a level's law allows. */
export function deviationLimit(level: PlanLevel): number {
  return limits.levels[level].maxTotalDeviation;
}

/** Total deviation: the gap between the largest and smallest district over the ideal. */
export function totalDeviation(plan: Plan): number {
  const people = planStats(plan).map((row) => row.people);
  const ideal = people.reduce((n, p) => n + p, 0) / Math.max(1, people.length);
  return ideal > 0 ? (Math.max(...people) - Math.min(...people)) / ideal : 0;
}

/** Whether a plan is within the population limit for the level it is drawn for. */
export function meetsDeviationLimit(plan: Plan, level: PlanLevel): boolean {
  return totalDeviation(plan) <= deviationLimit(level);
}

export interface CitizenPlanUnit extends PlanUnit {
  /** Citizen voting-age people. */
  readonly cvap: number;
  /** Of them, White alone and not Hispanic. */
  readonly cvapWhite: number;
}

/** A unit with named quantities a goal sums over a district (votes, incumbents, citizens). */
export interface FeaturedUnit extends PlanUnit {
  readonly features: readonly number[];
}

/**
 * The best way to cut the units, in id order, into districts within the
 * level's population limit: the one whose districts score highest in total,
 * where a district's score comes from the sums of its units' features, ties to
 * the plan nearest equal population. Every goal (a majority-minority district,
 * a seat for the drawer's party, a district with one sitting member) is a
 * score function over those sums. Returns undefined if no cut meets the limit.
 */
export function scoredPlan(
  units: readonly FeaturedUnit[],
  districts: number,
  level: PlanLevel,
  score: (sums: readonly number[]) => number,
): Plan | undefined {
  const sorted = [...units].sort((a, b) => a.geoid.localeCompare(b.geoid));
  const n = sorted.length;
  const width = sorted[0]?.features.length ?? 0;
  const total = sorted.reduce((s, u) => s + u.population, 0);
  const ideal = total / districts;
  // Each district may be half the total spread above or below the ideal.
  const half = deviationLimit(level) / 2;
  const low = ideal * (1 - half),
    high = ideal * (1 + half);
  const pop = new Float64Array(n + 1);
  const prefix = Array.from({ length: width }, () => new Float64Array(n + 1));
  sorted.forEach((u, i) => {
    pop[i + 1] = pop[i]! + u.population;
    for (let f = 0; f < width; f += 1)
      prefix[f]![i + 1] = prefix[f]![i]! + u.features[f]!;
  });
  type Cell = { value: number; miss: number; from: number };
  const best: (Cell | undefined)[][] = Array.from(
    { length: districts + 1 },
    () => new Array<Cell | undefined>(n + 1),
  );
  best[0]![0] = { value: 0, miss: 0, from: -1 };
  const sums = new Array<number>(width).fill(0);
  for (let j = 1; j <= districts; j += 1) {
    let start = 0;
    for (let i = j; i <= n; i += 1) {
      // Starts whose district population lies in [low, high], moving forward as i does.
      while (start < i && pop[i]! - pop[start]! > high) start += 1;
      for (let from = start; from < i; from += 1) {
        const people = pop[i]! - pop[from]!;
        if (people < low) break;
        const prev = best[j - 1]![from];
        if (!prev) continue;
        for (let f = 0; f < width; f += 1)
          sums[f] = prefix[f]![i]! - prefix[f]![from]!;
        const value = prev.value + score(sums);
        const miss = prev.miss + ((people - ideal) / ideal) ** 2;
        const here = best[j]![i];
        if (
          !here ||
          value > here.value ||
          (value === here.value && miss < here.miss)
        )
          best[j]![i] = { value, miss, from };
      }
    }
  }
  if (!best[districts]![n]) return undefined;
  const cuts: number[] = [];
  for (let j = districts, i = n; j >= 1; j -= 1) {
    cuts.unshift(i);
    i = best[j]![i]!.from;
  }
  const runs: PlanUnit[][] = [];
  const districtOf = new Map<string, number>();
  let from = 0;
  cuts.forEach((to, index) => {
    const run = sorted.slice(from, to).map((u) => ({
      geoid: u.geoid,
      population: u.population,
    }));
    runs.push(run);
    for (const u of run) districtOf.set(u.geoid, index + 1);
    from = to;
  });
  return { districtOf, districts: runs };
}

/**
 * The plan that meets the Voting Rights Act test: the most districts whose
 * citizen voting-age people are a majority not White-alone-non-Hispanic (the
 * Gingles first condition, measured from the units).
 */
export function vraPlan(
  units: readonly CitizenPlanUnit[],
  districts: number,
  level: PlanLevel,
): Plan | undefined {
  return scoredPlan(
    units.map((u) => ({
      geoid: u.geoid,
      population: u.population,
      features: [u.cvap, u.cvapWhite],
    })),
    districts,
    level,
    ([cvap, white]) => (cvap! > 0 && (cvap! - white!) / cvap! > 0.5 ? 1 : 0),
  );
}

export interface VotingPlanUnit extends PlanUnit {
  /** Votes the drawer's party won in the unit at the last election, and the votes it lost. */
  readonly ours: number;
  readonly theirs: number;
}

/** The plan with the most seats for the drawer's party, from the units' recorded votes. */
export function partisanPlan(
  units: readonly VotingPlanUnit[],
  districts: number,
  level: PlanLevel,
): Plan | undefined {
  return scoredPlan(
    units.map((u) => ({
      geoid: u.geoid,
      population: u.population,
      features: [u.ours, u.theirs],
    })),
    districts,
    level,
    ([ours, theirs]) => (ours! > theirs! ? 1 : 0),
  );
}

export interface HomedPlanUnit extends PlanUnit {
  /** Sitting members who live in the unit. */
  readonly members: number;
}

/**
 * The plan that protects sitting members: the most districts holding exactly
 * one of them, so none is paired with another and none is left out of a
 * district of their own.
 */
export function incumbentPlan(
  units: readonly HomedPlanUnit[],
  districts: number,
  level: PlanLevel,
): Plan | undefined {
  return scoredPlan(
    units.map((u) => ({
      geoid: u.geoid,
      population: u.population,
      features: [u.members],
    })),
    districts,
    level,
    ([members]) => (members === 1 ? 1 : 0),
  );
}

/** The sitting members a district holds, by the units they live in. */
export function membersIn(
  plan: Plan,
  homes: ReadonlyMap<string, number>,
): number[] {
  return plan.districts.map((run) =>
    run.reduce((n, unit) => n + (homes.get(unit.geoid) ?? 0), 0),
  );
}
