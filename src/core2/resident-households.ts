/**
 * The counted households' writers: a household regrouped when its members
 * change, an empty group written off, the cash a departing household takes, the
 * flows scheduled for a date, and the opening's unplaced workers. They are the
 * residents engine's own writers, moved here as written; modules/residents.ts
 * re-exports each one. They import only the residents and money reads, the
 * flows and the kernel, none of them in a ring.
 */
import { withdrawSavings } from "./accounts";
import { type CountedHousehold, ageOn } from "./counted-groups";
import { countedDeposits, moveShare } from "./counted-money-moves";
import {
  savingClaim,
  claimsInGroup,
  claimMoved,
  fundOf,
  fundBalance,
  peopleInGroup,
} from "./counted-money-reads";
import { outsideLaborForce } from "./gov-rules/place-population";
import { DAYS_PER_YEAR } from "./household-income";
import type { ResidentsRuntime } from "./modules/residents";
import { type ResidentsInput, unplacedPoolOf } from "./residents";
import {
  type FlowState,
  groupKeyOf,
  countedParameter,
} from "./residents-reads";
import type { CoreState } from "./types";

export function schedule(rt: ResidentsRuntime, flow: FlowState): void {
  const ids = rt.due.get(flow.nextAt) ?? new Set<string>();
  ids.add(flow.id);
  rt.due.set(flow.nextAt, ids);
}

/** Put a household in the group its facts key it to today. */
export function regroupHousehold(
  rt: ResidentsRuntime,
  h: CountedHousehold,
  date: string,
): void {
  const before = h.group;
  const key = groupKeyOf(rt, h, date);
  // Its claim on the old group's money, and all the claims there, before it
  // leaves. The old group's claims are read only when the household leaves
  // it: most regroups keep the household where it is (a share of away work
  // lost each month).
  const leaving = before >= 0 && rt.store.group(key).index !== before;
  const claim = rt.api ? savingClaim(rt, h) : 0;
  const groupBefore = rt.api && leaving ? claimsInGroup(rt, before) : 0;
  // And its share of the old group's bank savings, for every household of the record.
  const banked =
    rt.api && leaving
      ? countedDeposits(rt.api, rt, h, rt.store.weightedCount(h))
      : 0;
  rt.store.regroup(h, key);
  if (rt.api) claimMoved(rt, before, h.group, claim);
  // Its share of the old group's money goes with it.
  if (rt.api && before !== h.group) {
    moveShare(rt.api, rt, before, h.group, claim, groupBefore);
    // Its savings leave the old group's deposits for the new group's account,
    // whose next bank review banks them with the rest of its savings.
    if (banked > 0)
      withdrawSavings(rt.api.state as CoreState, rt.api, {
        id: `counted-regroup-savings:${h.id}:${date}:${rt.moneyCache.serial++}`,
        holderId: fundOf(rt.api, rt, before),
        customerAccountId: fundOf(rt.api, rt, h.group),
        amountMinor: banked,
        source: rt.input.source,
      });
  }
  // A group left with no people owes nothing: its creditors write it off.
  if (before >= 0 && before !== h.group)
    writeOffEmptyGroup(rt, before, h.placeId);
}

/**
 * What a counted record takes with it when it leaves: its group's fund per
 * person times the people the record stands for (`weightedCount`), rounded
 * down. A retired record is the whole record, so a weight of three takes three
 * households' share and a weight of one half takes half of one.
 */
export function departingCash(
  rt: ResidentsRuntime,
  h: CountedHousehold,
): number {
  if (!rt.api || !rt.funded || h.group < 0) return 0;
  const claims = claimsInGroup(rt, h.group);
  if (claims <= 0) return 0;
  return Math.floor(
    (fundBalance(rt.api, rt, h.group) * savingClaim(rt, h)) / claims,
  );
}

/** A group with no people left owes no living cost: what it still owed is written off. */
function writeOffEmptyGroup(
  rt: ResidentsRuntime,
  group: number,
  placeId: string,
): void {
  const owed = rt.livingArrears.get(group) ?? 0;
  if (owed <= 0 || peopleInGroup(rt, group) > 0) return;
  rt.livingArrears.set(group, 0);
  const flow = rt.flows.get(`residents:outside-living:counted:${placeId}`);
  if (flow) flow.writtenOffMinor = (flow.writtenOffMinor ?? 0) + owed;
}

/**
 * The place's unplaced workers shared by its counted households (the
 * opening's employment target less recorded jobs, shared by working-age
 * members without a job, a record counting for as many households as its
 * weight says) and what one such worker is paid a year, by pool. The one
 * computation the counted households' incomes and housing's rents both read.
 */
export function openingUnplaced(
  input: Pick<ResidentsInput, "households" | "flows" | "weights">,
  date: string,
): { workers: Map<string, number>; payByPool: Map<string, number> } {
  const pools = new Map<string, { workers: number; yearMinor: number }>();
  for (const row of input.flows) {
    if (row.financeKind !== "work.unplaced-residents") continue;
    const perYear =
      row.cadence.kind === "days"
        ? DAYS_PER_YEAR / row.cadence.every
        : 12 / row.cadence.every;
    const pool = unplacedPoolOf(row.placeId, !!row.quarters);
    const prior = pools.get(pool) ?? { workers: 0, yearMinor: 0 };
    pools.set(pool, {
      workers: prior.workers + (row.unplacedWorkers ?? 0),
      yearMinor: prior.yearMinor + row.amountMinor * perYear,
    });
  }
  const from = countedParameter("countedWorkingAgeFrom"),
    below = countedParameter("countedWorkingAgeBelow");
  const open = new Map<string, number>();
  const eligible = new Map<string, number>();
  for (const record of input.households) {
    const quarters = !!record.household.quarters;
    // Residents of institutions and military quarters seek no civilian work.
    let n = 0;
    if (!outsideLaborForce(record.household.quarters)) {
      const working = new Set(
        record.jobs
          .filter((job) => job.endsAt === undefined)
          .map((job) => job.personId),
      );
      for (const person of record.people) {
        const age = ageOn(person.birthDate, date);
        if (age >= from && age < below && !working.has(person.id)) n++;
      }
    }
    open.set(record.household.id, n);
    const key = unplacedPoolOf(record.household.placeId, quarters);
    eligible.set(
      key,
      (eligible.get(key) ?? 0) +
        n *
          (record.household.weight ??
            input.weights?.[record.household.placeId] ??
            1),
    );
  }
  const workers = new Map<string, number>();
  const payByPool = new Map<string, number>();
  for (const [key, row] of pools) {
    const pool = eligible.get(key) ?? 0;
    const placed = row.workers > 0 ? Math.min(row.workers, pool) : pool;
    if (placed > 0) payByPool.set(key, row.yearMinor / placed);
    const share = pool > 0 ? placed / pool : 0;
    for (const record of input.households)
      if (
        unplacedPoolOf(
          record.household.placeId,
          !!record.household.quarters,
        ) === key
      )
        workers.set(
          record.household.id,
          open.get(record.household.id)! * share,
        );
  }
  return { workers, payByPool };
}
