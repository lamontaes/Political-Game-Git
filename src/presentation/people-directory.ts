import { recentStrain } from "./relationship-strain";
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

/*
 * Labels only; the keys are saved view state. "family" also holds household
 * members who are not kin, and "friends" is anyone known with no other
 * category — neither is a friendship or kinship claim, so the labels say so.
 */
export const CATEGORY_LABELS: Readonly<Record<PersonCategory, string>> = {
  family: "Home and family",
  friends: "Met",
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
  /** When the last thing between you strained it, said plainly. */
  readonly strain: string | null;
}

export interface PeopleDirectory {
  readonly people: readonly DirectoryPerson[];
  readonly counts: Readonly<Record<PersonCategory | "all", number>>;
  /**
   * People you work or organize alongside in a place too big to know
   * everybody, whom this life has not met yet. They are somebody to meet,
   * not somebody known, so they are in no count and not on the web.
   */
  readonly notYetMet: readonly DirectoryPerson[];
}

/**
 * The most people a workplace or group can hold, besides you, before being in
 * it stops meaning you know them all.
 *
 * PLACEHOLDER, NOT RESEARCH: filed as `how-many-colleagues-a-person-knows`.
 * Below it, sharing a workplace is still enough to know somebody, as before.
 * Above it — a legislative chamber, a large employer — a colleague is somebody
 * you know once the two of you have something on the record.
 */
export const EVERYBODY_KNOWS_EVERYBODY_LIMIT = 20;

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

  /*
   * Who shares each of the player's organizations, gathered first so the size
   * of the place is known before anybody in it is counted as known.
   */
  const alongside = new Map<EntityId, Set<EntityId>>();
  const share = (organizationId: EntityId, otherId: EntityId) => {
    const found = alongside.get(organizationId) ?? new Set<EntityId>();
    found.add(otherId);
    alongside.set(organizationId, found);
  };
  const shared: {
    otherId: EntityId;
    organizationId: EntityId;
    category: PersonCategory;
  }[] = [];
  for (const [otherId, person] of Object.entries(world.people)) {
    if (otherId === playerId || !person) continue;
    const id = otherId as EntityId;
    for (const entry of activeWorkRelationshipsAt(world, id)) {
      const organizationId = entry.relationship.organizationId;
      if (organizationId === null) continue;
      if (workOrganizations.has(organizationId)) {
        share(organizationId, id);
        shared.push({ otherId: id, organizationId, category: "work" });
      }
      if (civicOrganizations.has(organizationId)) {
        share(organizationId, id);
        shared.push({ otherId: id, organizationId, category: "politics" });
      }
    }
    for (const participation of activeOrganizationParticipationsAt(world, id)) {
      const organizationId = participation.participation.organizationId;
      if (!civicOrganizations.has(organizationId)) continue;
      share(organizationId, id);
      shared.push({ otherId: id, organizationId, category: "politics" });
    }
  }

  const met = (otherId: EntityId) =>
    deriveRelationshipSummary(world, playerId, otherId).interactionCount > 0;
  const unmet = new Map<EntityId, Set<PersonCategory>>();
  const unmetContexts = new Map<EntityId, string>();
  for (const { otherId, organizationId, category } of shared) {
    const everybody =
      (alongside.get(organizationId)?.size ?? 0) <=
      EVERYBODY_KNOWS_EVERYBODY_LIMIT;
    const name = organizationProfileAt(world, organizationId)?.name;
    if (everybody || categories.has(otherId) || met(otherId)) {
      addCategory(categories, otherId, category);
      if (name && (category === "work" || !contexts.has(otherId))) {
        contexts.set(otherId, name);
      }
    } else {
      addCategory(unmet, otherId, category);
      if (name && !unmetContexts.has(otherId)) {
        unmetContexts.set(otherId, name);
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
      strain: recentStrain(world, playerId, personId),
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

  const notYetMet: DirectoryPerson[] = [];
  for (const [personId, set] of unmet) {
    const person = world.people[personId];
    if (!person || categories.has(personId)) continue;
    notYetMet.push({
      personId,
      name: personName(person),
      relationship: null,
      categories: [...set].sort(),
      context: unmetContexts.get(personId) ?? null,
      lastAt: null,
      strain: null,
    });
  }
  notYetMet.sort((left, right) => left.name.localeCompare(right.name));

  return { people, counts, notYetMet };
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
