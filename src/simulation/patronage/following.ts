import { favorStandingBetween } from "../favors";
import { favorsGivenBy, favorsReceivedBy } from "./favor-refs";
import { householdMembershipsAt } from "../life-queries";
import { ageOnDate } from "../dates";
import { campaigns } from "../campaign-queries";
import { electionContestById } from "../election-contests";
import type { EntityId, IsoDate, World } from "../types";

/**
 * What the people who owe someone do at the ballot box, and what an observer
 * can count about it (Research 1, build step 6 and spec 4).
 *
 * Debt identifies a patronage household, not a vote. Campaign help actually
 * recorded from its adult residents supplies the support count. No debt band
 * or unrecorded household loyalty is converted into a numeric vote weight.
 */

export interface Following {
  /** People in the town who still feel they owe this person. */
  readonly debtors: readonly EntityId[];
  /** Those debtors and everyone who lives with them. */
  readonly households: readonly EntityId[];
  /** Grown residents of the town the game has written. */
  readonly residents: number;
  /** Adults in those households who have actually helped this campaign. */
  readonly supporters: readonly EntityId[];
  /** Canonical favor records behind that help, not inferred votes. */
  readonly supportRecordIds: readonly EntityId[];
}

/** Who in a town owes this person today, and the households they live in. */
export function townFollowing(
  world: World,
  town: EntityId,
  personId: EntityId,
  asOf: IsoDate = world.currentDate,
): Following & { readonly weighted: number } {
  const cutoff = {
    asOfDate: asOf,
    historySequenceExclusive: world.history.nextSequence,
  };
  const inTown = new Set<EntityId>();
  for (const id of new Set(world.personOrder)) {
    const person = world.people[id];
    if (!person || id === personId || ageOnDate(person.birthDate, asOf) < 18)
      continue;
    const homes = householdMembershipsAt(world, id, cutoff).flatMap((row) =>
      row.location ? [row.location.jurisdictionId] : [],
    );
    if (
      homes.length ? homes.includes(town) : person.homeJurisdictionId === town
    )
      inTown.add(id);
  }
  const debtors = new Set<EntityId>();
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
    debtors.add(receiver);
  }
  const households = new Set<EntityId>();
  for (const debtor of debtors) {
    households.add(debtor);
    const homes = new Set(
      householdMembershipsAt(world, debtor, cutoff).map(
        (row) => row.membership.householdId,
      ),
    );
    for (const row of world.history.householdMemberships)
      if (
        homes.has(row.householdId) &&
        inTown.has(row.personId) &&
        row.personId !== personId &&
        householdMembershipsAt(world, row.personId, cutoff).some((active) =>
          homes.has(active.membership.householdId),
        )
      )
        households.add(row.personId);
  }
  const supporters = new Set<EntityId>();
  const supportRecordIds: EntityId[] = [];
  const campaignOrganizations = new Map(
    campaigns(world)
      .filter(
        (campaign) =>
          campaign.candidatePersonId === personId &&
          campaign.jurisdictionId === town &&
          campaign.filedAt <= asOf &&
          (electionContestById(world, campaign.contestId)?.electionDate ??
            "") >= asOf,
      )
      .map((campaign) => [campaign.organizationId, campaign.filedAt]),
  );
  // These are the existing campaign-life writer's three completed help acts.
  // Neither ordinary favors nor saved official views are counted again here.
  for (const record of favorsReceivedBy(world, personId)) {
    if (
      record.givenAt > asOf ||
      !households.has(record.giverPersonId) ||
      record.subject.kind !== "organization" ||
      !campaignOrganizations.has(record.subject.organizationId) ||
      record.givenAt <
        campaignOrganizations.get(record.subject.organizationId)! ||
      ![
        "political:campaign-donation",
        "political:chapter-backing",
        "political:campaign-volunteering",
      ].includes(record.kind)
    )
      continue;
    supporters.add(record.giverPersonId);
    supportRecordIds.push(record.id);
  }
  return {
    debtors: [...debtors].sort(),
    households: [...households].sort(),
    residents: inTown.size,
    supporters: [...supporters].sort(),
    supportRecordIds: supportRecordIds.sort(),
    weighted: supporters.size,
  };
}

/**
 * The recorded campaign-help share of the adult patronage cohort, spread
 * over the town's recorded adults. The existing election consumer uses this
 * as a support multiplier; these records do not prove anyone's secret vote.
 */
export function townSupportFromFavors(
  world: World,
  town: EntityId,
  candidateId: EntityId,
  electionDate: IsoDate,
): number {
  const following = townFollowing(world, town, candidateId, electionDate);
  if (following.residents === 0 || following.weighted === 0) return 1;
  return 1 + following.weighted / following.residents;
}
