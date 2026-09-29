import { favorStandingBetween } from "../favors";
import { favorsGivenBy } from "./favor-refs";
import { householdMembershipsAt } from "../life-queries";
import type { EntityId, IsoDate, World } from "../types";

/**
 * What the people who owe someone do at the ballot box, and what an observer
 * can count about it (Research 1, build step 6 and spec 4).
 *
 * A household where someone owes a candidate a seat or another favor tends to
 * vote for that candidate (Erie, on the Irish machines: posts and favors
 * bought loyalty from the people helped and their families). How much each one still owes is read
 * from the favor record on the day, so a debt that has faded moves nothing.
 * Nothing here marks anyone as a boss: the counts are an observer's reading.
 */

/**
 * PLACEHOLDER (set by hand, not measured): how much a still-owed debt counts
 * toward the debtor household's vote, by the band the favor record reads.
 * Affects only a town count's support multiplier. Why: a debt felt strongly
 * holds a vote more surely than one nearly forgotten; no measured rate exists.
 */
const DEBT_VOTE_WEIGHT = { slight: 0.25, marked: 0.5, strong: 1 } as const;
/** PLACEHOLDER (set by hand): the most debts can raise one candidate's support. */
const MAX_DEBT_SHIFT = 0.5;

export interface Following {
  /** People in the town who still feel they owe this person. */
  readonly debtors: readonly EntityId[];
  /** Those debtors and everyone who lives with them. */
  readonly households: readonly EntityId[];
  /** Grown residents of the town the game has written. */
  readonly residents: number;
}

/** Who in a town owes this person today, and the households they live in. */
export function townFollowing(
  world: World,
  town: EntityId,
  personId: EntityId,
  asOf: IsoDate = world.currentDate,
): Following & { readonly weighted: number } {
  const inTown = new Set<EntityId>();
  for (const id of world.personOrder)
    if (world.people[id]?.homeJurisdictionId === town) inTown.add(id);
  const debtors = new Map<EntityId, number>();
  for (const favor of favorsGivenBy(world, personId)) {
    const receiver = favor.receiverPersonId;
    if (!inTown.has(receiver) || debtors.has(receiver)) continue;
    const owed = favorStandingBetween(
      world,
      receiver,
      personId,
      asOf,
    ).receiverDebt;
    if (owed === "none") continue;
    debtors.set(receiver, DEBT_VOTE_WEIGHT[owed]);
  }
  const households = new Map<EntityId, number>();
  for (const [debtor, weight] of debtors) {
    households.set(debtor, Math.max(households.get(debtor) ?? 0, weight));
    const homes = new Set(
      householdMembershipsAt(world, debtor).map(
        (row) => row.membership.householdId,
      ),
    );
    for (const row of world.history.householdMemberships)
      if (
        homes.has(row.householdId) &&
        inTown.has(row.personId) &&
        row.personId !== personId &&
        householdMembershipsAt(world, row.personId).some((active) =>
          homes.has(active.membership.householdId),
        )
      )
        households.set(
          row.personId,
          Math.max(households.get(row.personId) ?? 0, weight),
        );
  }
  let weighted = 0;
  for (const weight of households.values()) weighted += weight;
  return {
    debtors: [...debtors.keys()].sort(),
    households: [...households.keys()].sort(),
    residents: inTown.size,
    weighted,
  };
}

/**
 * The multiplier a candidate's debts put on their support in a town count:
 * 1 when nobody in town owes them anything.
 */
export function townSupportFromFavors(
  world: World,
  town: EntityId,
  candidateId: EntityId,
  electionDate: IsoDate,
): number {
  const following = townFollowing(world, town, candidateId, electionDate);
  if (following.residents === 0 || following.weighted === 0) return 1;
  return 1 + Math.min(MAX_DEBT_SHIFT, following.weighted / following.residents);
}
