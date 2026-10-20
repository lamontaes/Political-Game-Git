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
