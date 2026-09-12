import {
  activeOrganizationParticipationsAt,
  activeWorkRelationshipsAt,
  campaigns,
  deriveRelationshipSummary,
  electionContestById,
  describePersonContext,
  kinshipRelationshipsAt,
  organizationProfileAt,
  peopleInHouseholdAt,
  personName,
  relationshipHistory,
  type EntityId,
  type World,
} from "../simulation";
import { householdIdFor } from "./person-dossier";

/**
 * Everybody this life actually has, sorted into the categories a player thinks
 * in rather than the ones the record is stored in.
 *
 * Membership is derived and never asserted: family is a kinship or household
 * record, work is a shared work organization, politics is a shared civic or
 * political organization, and anyone the life keeps returning to with none of
 * those is simply someone they know. A person can hold more than one category —
 * a sibling who is also a colleague is both — because pretending otherwise
 * would make the directory lie to keep the filter tidy.
 *
 * There is no relationship score here, and no meter. What a row carries is the
 * relation the record establishes and how recently something happened, both of
 * which are facts. A number standing for how much somebody likes you is not.
 */

export type PersonCategory = "family" | "friends" | "work" | "politics";

export const PERSON_CATEGORIES: readonly PersonCategory[] = [
  "family",
  "friends",
  "work",
  "politics",
];

export const CATEGORY_LABELS: Readonly<Record<PersonCategory, string>> = {
  family: "Family",
  friends: "Friends",
  work: "Work",
  politics: "Politics",
};

export interface DirectoryPerson {
  readonly personId: EntityId;
  readonly name: string;
  /** "your mother", when a record establishes one. Never inferred. */
  readonly relationship: string | null;
  readonly categories: readonly PersonCategory[];
  /** Where you know them from, in one short phrase. */
  readonly context: string | null;
  /** The date of the last recorded thing between you, when there is one. */
  readonly lastAt: string | null;
}

export interface PeopleDirectory {
  readonly people: readonly DirectoryPerson[];
  readonly counts: Readonly<Record<PersonCategory | "all", number>>;
}

function addCategory(
  into: Map<EntityId, Set<PersonCategory>>,
  personId: EntityId,
  category: PersonCategory,
): void {
  const existing = into.get(personId);
  if (existing) existing.add(category);
  else into.set(personId, new Set([category]));
}

export function projectPeopleDirectory(
  world: World,
  playerId: EntityId,
): PeopleDirectory {
  const categories = new Map<EntityId, Set<PersonCategory>>();
  const contexts = new Map<EntityId, string>();

  const householdId = householdIdFor(world, playerId);
  for (const memberId of householdId === null
    ? []
    : peopleInHouseholdAt(world, householdId)) {
    if (memberId === playerId) continue;
    addCategory(categories, memberId, "family");
    contexts.set(memberId, "At home");
  }

  for (const kinship of kinshipRelationshipsAt(world, playerId)) {
    for (const otherId of kinship.personIds) {
      if (otherId === playerId) continue;
      addCategory(categories, otherId, "family");
    }
  }

  /*
   * Work and politics are the same shape of question — do the records put you
   * in one organization with them — asked of two different kinds of
   * organization. Which kind an organization is comes from its own profile, not
   * from the job title of whoever is in it.
   */
  const workOrganizations = new Set(
    activeWorkRelationshipsAt(world, playerId)
      .map((entry) => entry.relationship.organizationId)
      .filter((id): id is EntityId => id !== null),
  );
  const civicOrganizations = new Set(
    activeOrganizationParticipationsAt(world, playerId).map(
      (participation) => participation.participation.organizationId,
    ),
  );

  for (const [otherId, person] of Object.entries(world.people)) {
    if (otherId === playerId || !person) continue;
    for (const entry of activeWorkRelationshipsAt(world, otherId as EntityId)) {
      const organizationId = entry.relationship.organizationId;
      if (organizationId === null) continue;
      if (workOrganizations.has(organizationId)) {
        addCategory(categories, otherId as EntityId, "work");
        const name = organizationProfileAt(world, organizationId)?.name;
        if (name) contexts.set(otherId as EntityId, name);
      }
      if (civicOrganizations.has(organizationId)) {
        addCategory(categories, otherId as EntityId, "politics");
      }
    }
    for (const participation of activeOrganizationParticipationsAt(
      world,
      otherId as EntityId,
    )) {
      const organizationId = participation.participation.organizationId;
      if (!civicOrganizations.has(organizationId)) continue;
      addCategory(categories, otherId as EntityId, "politics");
      const name = organizationProfileAt(world, organizationId)?.name;
      if (name && !contexts.has(otherId as EntityId)) {
        contexts.set(otherId as EntityId, name);
      }
    }
  }

  /*
   * Anybody who stood in the same election as this life. The contest record
   * names its candidates, and the campaign surface already tells the player
   * who they are running against; standing against somebody is a political
   * fact about both of you, whether or not you ever spoke. Before this, an
   * opponent the player had just met on the ballot was nowhere in People —
   * the automatic rail that used to show them was removed (UI9-03), and the
   * directory had no record-backed way to hold them.
   */
  for (const campaign of campaigns(world)) {
    if (campaign.candidatePersonId !== playerId) continue;
    const contest = electionContestById(world, campaign.contestId);
    if (!contest) continue;
    for (const candidateId of contest.candidatePersonIds) {
      if (candidateId === playerId || !world.people[candidateId]) continue;
      addCategory(categories, candidateId, "politics");
      if (!contexts.has(candidateId)) {
        contexts.set(
          candidateId,
          `Ran against you for ${contest.office.title}`,
        );
      }
    }
  }

  /* Anyone the life has actually had something with, however it is classified. */
  for (const interaction of relationshipHistory(world, playerId)) {
    for (const otherId of interaction.personIds) {
      if (otherId === playerId) continue;
      if (!categories.has(otherId)) {
        addCategory(categories, otherId, "friends");
      }
    }
  }

  const people: DirectoryPerson[] = [];
  for (const [personId, set] of categories) {
    const person = world.people[personId];
    if (!person) continue;
    const summary = deriveRelationshipSummary(world, playerId, personId);
    people.push({
      personId,
      name: personName(person),
      relationship:
        describePersonContext(world, playerId, personId)?.relationship ?? null,
      categories: [...set].sort(),
      context: contexts.get(personId) ?? null,
      lastAt: summary.lastInteractionAt,
    });
  }
  people.sort((left, right) => left.name.localeCompare(right.name));

  const counts: Record<PersonCategory | "all", number> = {
    family: 0,
    friends: 0,
    work: 0,
    politics: 0,
    all: people.length,
  };
  for (const person of people) {
    for (const category of person.categories) counts[category] += 1;
  }

  return { people, counts };
}

/** Filters the directory the way the screen's controls do, and nowhere else. */
export function filterDirectory(
  directory: PeopleDirectory,
  category: PersonCategory | "all",
  query: string,
): readonly DirectoryPerson[] {
  const needle = query.trim().toLowerCase();
  return directory.people.filter((person) => {
    if (category !== "all" && !person.categories.includes(category)) {
      return false;
    }
    if (needle.length === 0) return true;
    return (
      person.name.toLowerCase().includes(needle) ||
      (person.relationship ?? "").toLowerCase().includes(needle) ||
      (person.context ?? "").toLowerCase().includes(needle)
    );
  });
}
