import {
  activeCareResponsibilitiesAt,
  activeChildAuthoritiesAt,
  activeEducationEnrollmentsAt,
  activeOrganizationParticipationsAt,
  activePartnershipsAt,
  activeWorkRelationshipsAt,
  ageOnDate,
  currentLifeCutoff,
  didPeopleShareEducationOrganization,
  householdMembershipsAt,
  kinshipRelationshipsAt,
  organizationProfileAt,
  peopleInHouseholdAt,
  personName,
  personPronouns,
} from "../simulation";
import type {
  EntityId,
  IsoDate,
  Person,
  PronounSet,
  ThreadAnchor,
  World,
} from "../simulation";

/**
 * Who somebody is to you, said in four words, from the record.
 *
 * The human playtest met a ten-year-old whose game said "Maya Pittman was in
 * the house every evening" and then asked whether to tell someone older about
 * her. Maya was the guardian — the world holds a parental authority record and
 * a parent-child kinship naming exactly that — and the game had the fact and
 * never said it. A player who has to work out a relationship from a shared
 * surname is being asked to guess at their own family.
 *
 * So: every player-facing person gets a label, and the label comes from
 * canonical records or does not exist.
 *
 * Three rules, and they are the whole design.
 *
 * **Read, never infer.** A shared family name is a household convention the
 * world writes down as one; it is not evidence of a relationship and is never
 * consulted here. If no record names a relation, `relationship` is null and
 * the caller says the person's name and nothing else. Saying less is always
 * available; saying something untrue is not.
 *
 * **Most specific wins.** Somebody can be on the household record, in a
 * kinship record and in a care record all at once. "Your mom" is what a person
 * would say; "someone you live with" is what a database would say, and the
 * order below prefers the first.
 *
 * **Gendered words need a gendered record.** `mom`, `sister`, `daughter` are
 * only reachable when the person's own identity says so. Everybody else is a
 * parent, a sibling, a child — accurate, and not a guess dressed up as
 * warmth. See `person-identity.ts` for why absence is preserved.
 */

export interface PersonContext {
  readonly personId: EntityId;
  /** "Maya Pittman" — what the record calls them. */
  readonly name: string;
  /** "Maya" — what a person in the room would call them. */
  readonly shortName: string;
  /**
   * "your mom", "your older sister", "in your class" — or null when the
   * record does not establish one.
   */
  readonly relationship: string | null;
  /** Why this label, read off the record. Never shown to a player. */
  readonly basis: string;
  readonly anchors: readonly ThreadAnchor[];
  readonly pronouns: PronounSet;
}

/**
 * The relationship, if any, and the record that establishes it.
 *
 * `asOfDate` exists because a relationship is a thing at a time: somebody who
 * shared a household ten years ago is not somebody you live with now, and the
 * queries this composes are all cutoff-aware for the same reason.
 */
export function describePersonContext(
  world: World,
  viewerId: EntityId,
  subjectId: EntityId,
  asOfDate: IsoDate = world.currentDate,
): PersonContext | null {
  const subject = world.people[subjectId];
  if (!subject) return null;
  const name = personName(subject);
  const base = {
    personId: subjectId,
    name,
    shortName: subject.givenName,
    pronouns: personPronouns(subject),
  };
  if (viewerId === subjectId) {
    return { ...base, relationship: null, basis: "The player.", anchors: [] };
  }

  for (const resolve of RESOLVERS) {
    const found = resolve(world, viewerId, subjectId, asOfDate);
    if (found) return { ...base, ...found };
  }
  return {
    ...base,
    relationship: null,
    basis: "No record establishes a relationship between them.",
    anchors: [],
  };
}

/** Everybody the player is currently in a room with, described. */
export function describePeopleContext(
  world: World,
  viewerId: EntityId,
  subjectIds: readonly EntityId[],
  asOfDate: IsoDate = world.currentDate,
): readonly PersonContext[] {
  return subjectIds.flatMap((id) => {
    const found = describePersonContext(world, viewerId, id, asOfDate);
    return found ? [found] : [];
  });
}

/**
 * How somebody is named the first time they matter in a scene.
 *
 * "Maya Pittman, your mom" — the full name and the relation, once. A caller
 * that has already introduced somebody uses `referToPerson` instead, because a
 * game that restates the relation on every line is reading a database aloud.
 */
export function introducePerson(context: PersonContext): string {
  return context.relationship === null
    ? context.name
    : `${context.name}, ${context.relationship}`;
}

/** What to call them afterwards. */
export function referToPerson(context: PersonContext): string {
  return context.shortName;
}

/**
 * The relation on its own, capitalised for the start of a sentence.
 *
 * Returns the name when there is no relation, so a caller never has to
 * assemble a sentence around an empty string.
 */
export function personRoleSentenceLead(context: PersonContext): string {
  if (context.relationship === null) return context.name;
  const [first, ...rest] = context.relationship;
  return `${(first ?? "").toUpperCase()}${rest.join("")}`;
}

/* -------------------------------------------------------------------------- */
/* Resolution                                                                  */
/* -------------------------------------------------------------------------- */

type Resolved = Pick<PersonContext, "relationship" | "basis" | "anchors">;
type Resolver = (
  world: World,
  viewerId: EntityId,
  subjectId: EntityId,
  asOfDate: IsoDate,
) => Resolved | null;

/**
 * Whichever of these matches first wins, so the order is the design.
 *
 * Family before household, household before school, school before work, and
 * an organization somebody merely attends last of all. That ordering is what
 * makes "your mom" beat "someone you live with" for the same person.
 */
const RESOLVERS: readonly Resolver[] = [
  resolveGuardian,
  resolveDependent,
  resolveParentByKinship,
  resolveSibling,
  resolvePartner,
  resolveOtherKin,
  resolveHousehold,
  resolveSchool,
  resolveWork,
  resolveOrganization,
];

/** The word for a parent, as specific as the record supports. */
function parentWord(person: Person): string {
  const key = person.identity?.pronouns;
  if (key === "she-her") return "your mom";
  if (key === "he-him") return "your dad";
  return "your parent";
}

function childWord(person: Person): string {
  const key = person.identity?.pronouns;
  if (key === "she-her") return "your daughter";
  if (key === "he-him") return "your son";
  return "your child";
}

function siblingWord(person: Person, older: boolean | null): string {
  const key = person.identity?.pronouns;
  const noun =
    key === "she-her" ? "sister" : key === "he-him" ? "brother" : "sibling";
  if (older === null) return `your ${noun}`;
  return `your ${older ? "older" : "younger"} ${noun}`;
}

function resolveGuardian(
  world: World,
  viewerId: EntityId,
  subjectId: EntityId,
): Resolved | null {
  const cutoff = currentLifeCutoff(world);
  for (const { authority } of activeChildAuthoritiesAt(
    world,
    viewerId,
    cutoff,
  )) {
    if (
      authority.holder.kind !== "person" ||
      authority.holder.personId !== subjectId
    ) {
      continue;
    }
    const subject = world.people[subjectId]!;
    return {
      relationship: parentWord(subject),
      basis: `A ${authority.kind} authority record over the player, held by this person.`,
      anchors: [
        {
          store: "childAuthorities",
          recordId: authority.id,
          stableKey: authority.stableKey,
          at: authority.establishedAt,
          sequence: authority.sequence,
          role: "context",
          note: "The authority record that makes them the adult responsible.",
        },
      ],
    };
  }
  return null;
}

function resolveDependent(
  world: World,
  viewerId: EntityId,
  subjectId: EntityId,
): Resolved | null {
  const cutoff = currentLifeCutoff(world);
  for (const { authority } of activeChildAuthoritiesAt(
    world,
    subjectId,
    cutoff,
  )) {
    if (
      authority.holder.kind !== "person" ||
      authority.holder.personId !== viewerId
    ) {
      continue;
    }
    return {
      relationship: childWord(world.people[subjectId]!),
      basis: `A ${authority.kind} authority record over this person, held by the player.`,
      anchors: [
        {
          store: "childAuthorities",
          recordId: authority.id,
          stableKey: authority.stableKey,
          at: authority.establishedAt,
          sequence: authority.sequence,
          role: "context",
          note: "The authority record that makes the player responsible for them.",
        },
      ],
    };
  }
  // Care without authority is still a real relation and worth naming, but it
  // is a weaker claim than a guardian's, so it says only what it knows.
  for (const { responsibility } of activeCareResponsibilitiesAt(
    world,
    viewerId,
    cutoff,
  )) {
    if (responsibility.recipientPersonId !== subjectId) continue;
    return {
      relationship: "who you look after",
      basis: `A ${responsibility.kind} care record naming the player as caregiver.`,
      anchors: [
        {
          store: "careResponsibilities",
          recordId: responsibility.id,
          stableKey: responsibility.stableKey,
          at: responsibility.startedAt,
          sequence: responsibility.sequence,
          role: "context",
          note: "The care record.",
        },
      ],
    };
  }
  return null;
}

/**
 * A parent-child kinship with nobody holding authority.
 *
 * This is the grown-up case: the record still says parent and child, and who
 * is which is settled by which of them was born first rather than by assuming
 * the player is the younger one.
 */
function resolveParentByKinship(
  world: World,
  viewerId: EntityId,
  subjectId: EntityId,
): Resolved | null {
  const cutoff = currentLifeCutoff(world);
  const viewer = world.people[viewerId];
  const subject = world.people[subjectId];
  if (!viewer || !subject) return null;
  for (const kinship of kinshipRelationshipsAt(world, viewerId, cutoff)) {
    if (kinship.kind !== "lineal:parent-child") continue;
    if (!kinship.personIds.includes(subjectId)) continue;
    const subjectIsOlder = subject.birthDate < viewer.birthDate;
    return {
      relationship: subjectIsOlder ? parentWord(subject) : childWord(subject),
      basis: `A ${kinship.kind} kinship record; birth dates decide which of them is which.`,
      anchors: [kinshipAnchor(kinship)],
    };
  }
  return null;
}

function resolveSibling(
  world: World,
  viewerId: EntityId,
  subjectId: EntityId,
): Resolved | null {
  const cutoff = currentLifeCutoff(world);
  const viewer = world.people[viewerId];
  const subject = world.people[subjectId];
  if (!viewer || !subject) return null;
  for (const kinship of kinshipRelationshipsAt(world, viewerId, cutoff)) {
    if (kinship.kind !== "collateral:sibling") continue;
    if (!kinship.personIds.includes(subjectId)) continue;
    const older =
      subject.birthDate === viewer.birthDate
        ? null
        : subject.birthDate < viewer.birthDate;
    return {
      relationship: siblingWord(subject, older),
      basis: `A ${kinship.kind} kinship record.`,
      anchors: [kinshipAnchor(kinship)],
    };
  }
  return null;
}

function resolvePartner(
  world: World,
  viewerId: EntityId,
  subjectId: EntityId,
): Resolved | null {
  const cutoff = currentLifeCutoff(world);
  for (const partnership of activePartnershipsAt(world, viewerId, cutoff)) {
    if (!partnership.personIds.includes(subjectId)) continue;
    return {
      relationship: "your partner",
      basis: `A ${partnership.kind} partnership record.`,
      anchors: [
        {
          store: "partnerships",
          recordId: partnership.id,
          stableKey: partnership.stableKey,
          at: partnership.startedAt,
          sequence: partnership.sequence,
          role: "context",
          note: "The partnership record.",
        },
      ],
    };
  }
  return null;
}

/**
 * Kin the record names without saying how.
 *
 * `extended:` and `custom:` kinship kinds exist and the game has no vocabulary
 * for most of them, so this says "family" rather than picking a cousin, an
 * aunt or a stepfather out of a record that says none of those things.
 */
function resolveOtherKin(
  world: World,
  viewerId: EntityId,
  subjectId: EntityId,
): Resolved | null {
  const cutoff = currentLifeCutoff(world);
  for (const kinship of kinshipRelationshipsAt(world, viewerId, cutoff)) {
    if (!kinship.personIds.includes(subjectId)) continue;
    return {
      relationship: "family",
      basis: `A ${kinship.kind} kinship record, of a kind the game has no more specific word for.`,
      anchors: [kinshipAnchor(kinship)],
    };
  }
  return null;
}

function resolveHousehold(
  world: World,
  viewerId: EntityId,
  subjectId: EntityId,
): Resolved | null {
  const cutoff = currentLifeCutoff(world);
  for (const entry of householdMembershipsAt(world, viewerId, cutoff)) {
    const residents = peopleInHouseholdAt(
      world,
      entry.membership.householdId,
      cutoff,
    );
    if (!residents.includes(subjectId)) continue;
    return {
      relationship: "who you live with",
      basis: "Resident on the same household record, with no kinship record between them.",
      anchors: [
        {
          store: "householdMemberships",
          recordId: entry.membership.id,
          stableKey: entry.membership.stableKey,
          at: entry.membership.startedAt,
          sequence: entry.membership.sequence,
          role: "context",
          note: "The household membership that puts them under one roof.",
        },
      ],
    };
  }
  return null;
}

function resolveSchool(
  world: World,
  viewerId: EntityId,
  subjectId: EntityId,
  asOfDate: IsoDate,
): Resolved | null {
  const cutoff = currentLifeCutoff(world);
  const mine = activeEducationEnrollmentsAt(world, viewerId, cutoff);
  if (mine.length === 0) return null;
  if (!didPeopleShareEducationOrganization(world, viewerId, subjectId, cutoff)) {
    return null;
  }
  const viewer = world.people[viewerId];
  const subject = world.people[subjectId];
  const sameYear =
    viewer && subject
      ? Math.abs(
          ageOnDate(viewer.birthDate, asOfDate) -
            ageOnDate(subject.birthDate, asOfDate),
        ) <= 1
      : false;
  const enrollment = mine[0]!.enrollment;
  return {
    // A register records who attends, not who sits where. "In your class" is
    // what a child would call somebody the same age at the same school; an
    // older or younger pupil is honestly just from school.
    relationship: sameYear ? "who is in your class" : "from your school",
    basis: "Both enrolled at the same school over an overlapping period.",
    anchors: [
      {
        store: "educationEnrollments",
        recordId: enrollment.id,
        stableKey: enrollment.stableKey,
        at: enrollment.startedAt,
        sequence: enrollment.sequence,
        role: "context",
        note: "The enrollment they share a school through.",
      },
    ],
  };
}

function resolveWork(
  world: World,
  viewerId: EntityId,
  subjectId: EntityId,
): Resolved | null {
  const cutoff = currentLifeCutoff(world);
  const mine = activeWorkRelationshipsAt(world, viewerId, cutoff);
  const theirs = activeWorkRelationshipsAt(world, subjectId, cutoff);
  for (const entry of mine) {
    const organizationId = entry.relationship.organizationId;
    if (organizationId === null) continue;
    const shared = theirs.some(
      (candidate) => candidate.relationship.organizationId === organizationId,
    );
    if (!shared) continue;
    return {
      relationship: "who you work with",
      basis: "Active work relationships at the same organization.",
      anchors: [
        {
          store: "workRelationships",
          recordId: entry.relationship.id,
          stableKey: entry.relationship.stableKey,
          at: entry.relationship.startedAt,
          sequence: entry.relationship.sequence,
          role: "context",
          note: "The work relationship they share an employer through.",
        },
      ],
    };
  }
  return null;
}

function resolveOrganization(
  world: World,
  viewerId: EntityId,
  subjectId: EntityId,
): Resolved | null {
  const cutoff = currentLifeCutoff(world);
  const mine = activeOrganizationParticipationsAt(world, viewerId, cutoff);
  const theirs = activeOrganizationParticipationsAt(world, subjectId, cutoff);
  for (const entry of mine) {
    const organizationId = entry.participation.organizationId;
    const shared = theirs.some(
      (candidate) => candidate.participation.organizationId === organizationId,
    );
    if (!shared) continue;
    const profile = organizationProfileAt(world, organizationId, cutoff);
    return {
      relationship:
        profile === undefined ? "from the same group" : `from ${profile.name}`,
      basis: "Active participation in the same organization.",
      anchors: [
        {
          store: "organizationParticipations",
          recordId: entry.participation.id,
          stableKey: entry.participation.stableKey,
          at: entry.participation.startedAt,
          sequence: entry.participation.sequence,
          role: "context",
          note: "The participation they share.",
        },
      ],
    };
  }
  return null;
}

function kinshipAnchor(kinship: {
  readonly id: EntityId;
  readonly stableKey: string;
  readonly establishedAt: IsoDate;
  readonly sequence: number;
}): ThreadAnchor {
  return {
    store: "kinshipRelationships",
    recordId: kinship.id,
    stableKey: kinship.stableKey,
    at: kinship.establishedAt,
    sequence: kinship.sequence,
    role: "context",
    note: "The kinship record.",
  };
}
