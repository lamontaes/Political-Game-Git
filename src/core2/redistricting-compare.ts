/**
 * The rows a plan-comparison screen shows for a player who sits where maps are
 * drawn: for each printed plan, each district's people, how far it is from
 * equal, how the last election would have gone in it, its neighborhood make-up
 * as district totals, and which sitting members share it. Record data only;
 * the screen supplies the words. Neighborhood make-up is a total over a
 * district's units, never a mark on a person.
 */
import type { CvapUnit } from "./neighborhoods";
import {
  districtCvapMakeup,
  planStats,
  type Plan,
} from "./redistricting-plans";

export interface DistrictRow {
  readonly district: number;
  readonly people: number;
  /** Signed share above (or below) the ideal. */
  readonly deviation: number;
  /** Votes at the last election, in the units now drawn together. */
  readonly ours: number;
  readonly theirs: number;
  readonly cvap: number;
  /** Share of citizen voting-age people who are not White alone and not Hispanic. */
  readonly minorityShare: number;
  /** Sitting members whose homes are in the district (by person id). */
  readonly members: readonly string[];
}

export interface PlanRows {
  readonly id: string;
  readonly districts: readonly DistrictRow[];
  /** Extra members beyond the first in any district. */
  readonly pairedMembers: number;
}

export interface PlanInputs {
  readonly votes: ReadonlyMap<string, { ours: number; theirs: number }>;
  readonly homes: ReadonlyMap<string, readonly string[]>;
  readonly cvap: readonly CvapUnit[];
}

/** The rows for one printed plan. */
export function planRows(id: string, plan: Plan, input: PlanInputs): PlanRows {
  const stats = planStats(plan);
  const make = districtCvapMakeup(plan, input.cvap);
  const districts = plan.districts.map((run, i) => {
    let ours = 0,
      theirs = 0;
    const members: string[] = [];
    for (const unit of run) {
      const v = input.votes.get(unit.geoid);
      if (v) {
        ours += v.ours;
        theirs += v.theirs;
      }
      members.push(...(input.homes.get(unit.geoid) ?? []));
    }
    return {
      district: i + 1,
      people: stats[i]!.people,
      deviation: stats[i]!.deviation,
      ours,
      theirs,
      cvap: make[i]!.cvap,
      minorityShare: make[i]!.minorityShare,
      members,
    };
  });
  return {
    id,
    districts,
    pairedMembers: districts.reduce(
      (n, d) => n + Math.max(0, d.members.length - 1),
      0,
    ),
  };
}

/** The rows for every printed plan, side by side. */
export function comparePlans(
  plans: readonly { id: string; plan: Plan }[],
  input: PlanInputs,
): PlanRows[] {
  return plans.map((p) => planRows(p.id, p.plan, input));
}
