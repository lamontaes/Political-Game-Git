/**
 * The assistance work requirement, read where the welfare line pays its
 * benefit: a household whose every member is an adult the requirement
 * covers (age 18 to 64, income under the assistance line, no child under 14,
 * working under the weekly hours) keeps the benefit for the law's time limit,
 * counted from the first month it is covered, then loses it. A household
 * with anyone the requirement does not cover (a child, an older adult, a
 * member who works the hours) keeps it. A month of work or a repeal clears
 * the household's clock.
 */
import { makeIsoDate } from "../kernel/dates";
import type { CoreAPI } from "../types";
import {
  reachParameter,
  type HouseholdFacts,
  type ResidentFacts,
} from "./group-b-people";
import { getRow, putRow } from "./group-b-store";

interface ClockRow {
  readonly id: string;
  readonly key: "workclock";
  readonly householdId: string;
  /** The first month the household was covered, or null once it is not. */
  readonly since: string | null;
}

const clockId = (householdId: string) => `workclock|${householdId}`;

/** Whole calendar months from one date to a later one. */
function monthsBetween(from: string, to: string): number {
  const a = makeIsoDate(from),
    b = makeIsoDate(to);
  return (
    (Number(b.slice(0, 4)) - Number(a.slice(0, 4))) * 12 +
    (Number(b.slice(5, 7)) - Number(a.slice(5, 7))) -
    (b.slice(8) < a.slice(8) ? 1 : 0)
  );
}

/**
 * The households that still get the benefit. `covered` are the residents the
 * work requirement covers today; `inForce` is whether the law is.
 */
export function afterWorkRequirement(
  api: CoreAPI,
  input: {
    readonly inForce: boolean;
    readonly covered: readonly ResidentFacts[];
    readonly households: ReadonlyMap<string, HouseholdFacts>;
    readonly heads: readonly ResidentFacts[];
  },
): ResidentFacts[] {
  const date = api.state.date;
  const limit = reachParameter("snapWorkTimeLimitMonths");
  const coveredBy = new Map<string, number>();
  for (const r of input.covered)
    coveredBy.set(r.householdId, (coveredBy.get(r.householdId) ?? 0) + 1);
  return input.heads.filter((head) => {
    const household = input.households.get(head.householdId);
    const clock = getRow<ClockRow>(api, "taken", clockId(head.householdId));
    const everyoneCovered =
      input.inForce &&
      !!household &&
      coveredBy.get(head.householdId) === household.size;
    if (!everyoneCovered) {
      if (clock?.since)
        putRow(api, "taken", { ...clock, since: null } satisfies ClockRow);
      return true;
    }
    if (!clock?.since) {
      putRow(api, "taken", {
        id: clockId(head.householdId),
        key: "workclock",
        householdId: head.householdId,
        since: date,
      } satisfies ClockRow);
      return true;
    }
    return monthsBetween(clock.since, date) < limit;
  });
}
