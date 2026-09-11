import {
  activeCampaignForCandidate,
  activeEducationEnrollmentsAt,
  activeWorkRelationshipsAt,
  ageOnDate,
  campaignTreasuryPosition,
  describePersonContext,
  educationEnrollmentHistoryForPerson,
  householdLocationAt,
  organizationProfileAt,
  peopleInHouseholdAt,
  personName,
  resourcePositionAt,
  workRelationshipHistoryForPerson,
  workRoleAt,
  type EntityId,
  type MoneyAmount,
  type ResourcePositionOwner,
  type World,
} from "../simulation";
import { householdIdFor } from "./person-dossier";

/**
 * Who the player is, and what they have.
 *
 * Progressive disclosure by construction: identity first, then the household,
 * then what they have done, then money. Nothing here is a meter, a score or an
 * always-visible attribute wall, and no number is invented — a life whose
 * records hold no balance says so rather than showing a confident zero.
 *
 * The three kinds of money are kept apart because the world already keeps them
 * apart. A person's balance, a household's balance and a campaign committee's
 * treasury are separate positions with separate owners in the canonical record;
 * presenting them as one "funds" line would be a false statement about who owns
 * what, and the campaign case is the one that makes it a legal statement too.
 * The owner's broader Personal redesign is deliberately not attempted here.
 */

export interface PersonalIdentity {
  readonly personId: EntityId;
  readonly name: string;
  readonly age: number;
  readonly birthDate: string;
  readonly placeName: string | null;
}

export interface HouseholdMemberLine {
  readonly personId: EntityId;
  readonly name: string;
  readonly relationship: string | null;
}

export interface HistoryLine {
  readonly key: string;
  readonly text: string;
}

export type PurseKind = "personal" | "household" | "campaign";

export interface PurseLine {
  readonly kind: PurseKind;
  /** What the player calls it. */
  readonly label: string;
  /** Who owns it, said plainly, because ownership is the point. */
  readonly ownerNote: string;
  readonly balance: MoneyAmount | null;
  /** Present only when there is no position, and then it says why. */
  readonly absence: string | null;
}

export interface PersonalRecord {
  readonly identity: PersonalIdentity;
  readonly household: readonly HouseholdMemberLine[];
  readonly education: readonly HistoryLine[];
  readonly work: readonly HistoryLine[];
  readonly purses: readonly PurseLine[];
}

/** The balance on the first position this owner holds, in its own currency. */
function balanceFor(
  world: World,
  owner: ResourcePositionOwner,
): MoneyAmount | null {
  const position = world.history.resourcePositions.find((record) => {
    if (record.owner.kind !== owner.kind) return false;
    if (record.owner.kind === "person" && owner.kind === "person") {
      return record.owner.personId === owner.personId;
    }
    if (record.owner.kind === "household" && owner.kind === "household") {
      return record.owner.householdId === owner.householdId;
    }
    if (record.owner.kind === "organization" && owner.kind === "organization") {
      return record.owner.organizationId === owner.organizationId;
    }
    return false;
  });
  if (!position) return null;
  const snapshot = resourcePositionAt(
    world,
    owner,
    position.openingBalance.currency,
  );
  return snapshot?.liquidBalance ?? null;
}

function buildPurses(world: World, personId: EntityId): readonly PurseLine[] {
  const purses: PurseLine[] = [];

  const own = balanceFor(world, { kind: "person", personId });
  purses.push({
    kind: "personal",
    label: "Your own money",
    ownerNote: "Yours. Nobody else can spend it.",
    balance: own,
    absence: own ? null : "This life has no personal balance on record yet.",
  });

  const householdId = householdIdFor(world, personId);
  if (householdId) {
    const shared = balanceFor(world, { kind: "household", householdId });
    purses.push({
      kind: "household",
      label: "The household",
      ownerNote: "Shared with everyone who lives here.",
      balance: shared,
      absence: shared ? null : "The household keeps no balance on record yet.",
    });
  }

  /*
   * A committee's money is the committee's. It is reported as the committee's,
   * and it does not become the candidate's because the candidate signs for it —
   * which is why it appears as its own purse with its own owner note rather
   * than being added to anything above.
   */
  const campaign = activeCampaignForCandidate(world, personId);
  if (campaign) {
    const treasury = campaignTreasuryPosition(world, campaign);
    const organizationName =
      organizationProfileAt(world, campaign.organizationId)?.name ??
      "your campaign committee";
    const balance = treasury
      ? (resourcePositionAt(
          world,
          { kind: "organization", organizationId: campaign.organizationId },
          campaign.treasuryCurrency,
        )?.liquidBalance ?? null)
      : null;
    purses.push({
      kind: "campaign",
      label: "Campaign funds",
      ownerNote: `Held by ${organizationName}, not by you.`,
      balance,
      absence: balance ? null : "The committee has no treasury on record yet.",
    });
  }

  return purses;
}

/** Where the household record says this life is, or null when it says nothing. */
function placeNameFor(
  world: World,
  householdId: EntityId | null,
): string | null {
  if (householdId === null) return null;
  const location = householdLocationAt(world, householdId);
  if (!location) return null;
  return world.jurisdictions[location.jurisdictionId]?.name ?? null;
}

export function projectPersonalRecord(
  world: World,
  personId: EntityId,
): PersonalRecord | null {
  const person = world.people[personId];
  if (!person) return null;

  const householdId = householdIdFor(world, personId);
  const household: HouseholdMemberLine[] = [];
  for (const memberId of householdId === null
    ? []
    : peopleInHouseholdAt(world, householdId)) {
    if (memberId === personId) continue;
    const member = world.people[memberId];
    if (!member) continue;
    household.push({
      personId: memberId,
      name: personName(member),
      relationship:
        describePersonContext(world, personId, memberId)?.relationship ?? null,
    });
  }

  const education: HistoryLine[] = [];
  const ongoing = new Set(
    activeEducationEnrollmentsAt(world, personId).map(
      (enrollment) => enrollment.enrollment.id,
    ),
  );
  for (const enrollment of educationEnrollmentHistoryForPerson(
    world,
    personId,
  )) {
    const name = organizationProfileAt(world, enrollment.organizationId)?.name;
    if (!name) continue;
    education.push({
      key: enrollment.id,
      text: ongoing.has(enrollment.id)
        ? `${name}, since ${enrollment.startedAt.slice(0, 4)}.`
        : `${name}, from ${enrollment.startedAt.slice(0, 4)}.`,
    });
  }

  const work: HistoryLine[] = [];
  const current = new Set(
    activeWorkRelationshipsAt(world, personId).map(
      (entry) => entry.relationship.id,
    ),
  );
  for (const relationship of workRelationshipHistoryForPerson(
    world,
    personId,
  )) {
    const employer =
      relationship.organizationId === null
        ? null
        : (organizationProfileAt(world, relationship.organizationId)?.name ??
          null);
    if (!employer) continue;
    const role = workRoleAt(world, relationship.id)?.title ?? null;
    const held = role ? `${role} at ${employer}` : employer;
    work.push({
      key: relationship.id,
      text: current.has(relationship.id)
        ? `${held}, since ${relationship.startedAt.slice(0, 4)}.`
        : `${held}, from ${relationship.startedAt.slice(0, 4)}.`,
    });
  }

  return {
    identity: {
      personId,
      name: personName(person),
      age: ageOnDate(person.birthDate, world.currentDate),
      birthDate: person.birthDate,
      placeName: placeNameFor(world, householdId),
    },
    household,
    education,
    work,
    purses: buildPurses(world, personId),
  };
}
