import {
  characterHistoryContextPersonId,
  createCharacterHistoryContextPerson,
} from "./character-history";
import { ageOnDate, makeIsoDate } from "./dates";
import {
  createChildAuthority,
  recordKinship,
  startHouseholdMembership,
} from "./life";
import {
  currentLifeCutoff,
  householdMembershipsAt,
  kinshipRelationshipsAt,
} from "./life-queries";
import { drawCanonicalNameForGender, personName } from "./people";
import { generatePersonIdentity } from "./person-identity";
import { recordEventKnowledge } from "./records";
import { SeededRng } from "./rng";
import type {
  EntityId,
  IsoDate,
  KinshipKind,
  LifeRecordProvenance,
  World,
} from "./types";
import { isPersonAliveAt } from "./vitality-integrity";
import { recordWorldEvent } from "./world";

/**
 * Adding someone to a family (CRUNCH46 P5).
 *
 * The world's families come from canonical generation. This is the one
 * supported way to add to one later: an explicit, dated, accepted event — a
 * birth or an adoption — with its actual participants. It is not a fertility
 * promise, it makes no claim about adoption law, and it is never called just
 * to guarantee a successor.
 *
 * Kinship, guardianship and household membership stay separate records, as
 * they are everywhere else. A birth writes a parent–child kinship for each
 * named parent, grandparent links to those parents' own recorded parents,
 * sibling links to their other children, guardianship for a minor, and a
 * household membership where a parent has one. A new person is made by the
 * common generator, from this event's own seeded stream.
 */

export const FAMILY_MEMBER_ADDED_EVENT = "life.family-member-added";
export const PEOPLE_FAMILY_VERSION = "people-family-v1";

/**
 * Authored plausibility bounds, not a biological or legal standard: a parent
 * at least this much older than their child, and an adoptive parent an adult.
 */
export const MINIMUM_PARENT_AGE_AT_BIRTH = 16;
export const MINIMUM_ADOPTIVE_PARENT_AGE = 21;
export const MINIMUM_ADOPTION_AGE_GAP = 10;

export type FamilyAdditionInput =
  | {
      readonly kind: "birth";
      readonly stableKey: string;
      /** The birth date, which is also the event date. Not after today. */
      readonly occurredAt: string;
      readonly parentPersonIds: readonly EntityId[];
      /** Optional; otherwise drawn by the common generator. */
      readonly givenName?: string;
      /** Optional; otherwise the first named parent's family name. */
      readonly familyName?: string;
    }
  | {
      readonly kind: "adoption";
      readonly stableKey: string;
      readonly occurredAt: string;
      readonly parentPersonIds: readonly EntityId[];
      /** An existing minor in the world. */
      readonly childPersonId: EntityId;
    };

export interface FamilyAdditionResult {
  readonly world: World;
  readonly childPersonId: EntityId;
  readonly eventId: EntityId;
}

function alive(world: World, personId: EntityId, on: IsoDate): boolean {
  return isPersonAliveAt(world, personId, {
    asOfDate: on,
    historySequenceExclusive: world.history.nextSequence,
  });
}

/** Who a recorded parent–child kinship names as the parent: the elder. */
export function parentsOf(world: World, personId: EntityId): EntityId[] {
  const person = world.people[personId];
  if (!person) return [];
  return kinshipRelationshipsAt(world, personId)
    .filter(
      (entry) =>
        entry.kind.startsWith("lineal:") && entry.kind.includes("parent-child"),
    )
    .map((entry) => entry.personIds.find((id) => id !== personId)!)
    .filter((other) => {
      const candidate = world.people[other];
      return candidate !== undefined && candidate.birthDate < person.birthDate;
    })
    .sort();
}

/** The recorded children of a person: the younger side of their parent links. */
export function childrenOf(world: World, personId: EntityId): EntityId[] {
  const person = world.people[personId];
  if (!person) return [];
  return kinshipRelationshipsAt(world, personId)
    .filter(
      (entry) =>
        entry.kind.startsWith("lineal:") && entry.kind.includes("parent-child"),
    )
    .map((entry) => entry.personIds.find((id) => id !== personId)!)
    .filter((other) => {
      const candidate = world.people[other];
      return candidate !== undefined && candidate.birthDate > person.birthDate;
    })
    .sort();
}

/** Recorded grandchildren, by an explicit grandparent link or through a child. */
export function grandchildrenOf(world: World, personId: EntityId): EntityId[] {
  const person = world.people[personId];
  if (!person) return [];
  const explicit = kinshipRelationshipsAt(world, personId)
    .filter((entry) => entry.kind === "lineal:grandparent-grandchild")
    .map((entry) => entry.personIds.find((id) => id !== personId)!)
    .filter((other) => world.people[other]!.birthDate > person.birthDate);
  const through = childrenOf(world, personId).flatMap((child) =>
    childrenOf(world, child),
  );
  return [...new Set([...explicit, ...through])].sort();
}

function linked(world: World, left: EntityId, right: EntityId): boolean {
  return world.history.kinshipRelationships.some(
    (entry) =>
      entry.personIds.includes(left) &&
      entry.personIds.includes(right) &&
      entry.kind.startsWith("lineal:"),
  );
}

export function recordFamilyAddition(
  world: World,
  input: FamilyAdditionInput,
): FamilyAdditionResult {
  const occurredAt = makeIsoDate(input.occurredAt);
  if (occurredAt > world.currentDate) {
    throw new Error("A family addition cannot be dated in the future.");
  }
  if (input.parentPersonIds.length < 1 || input.parentPersonIds.length > 2) {
    throw new Error("A family addition names one or two parents.");
  }
  if (new Set(input.parentPersonIds).size !== input.parentPersonIds.length) {
    throw new Error("A parent cannot be named twice.");
  }
  if (
    world.history.events.some(
      (event) => event.stableKey === `${input.stableKey}:event`,
    )
  ) {
    throw new Error("This family addition was already recorded.");
  }
  const parents = input.parentPersonIds.map((id) => {
    const parent = world.people[id];
    if (!parent) throw new Error(`A named parent does not exist: ${id}`);
    if (!alive(world, id, occurredAt)) {
      throw new Error(`${personName(parent)} was not living on ${occurredAt}.`);
    }
    return parent;
  });

  let next = world;
  let childId: EntityId;
  if (input.kind === "birth") {
    for (const parent of parents) {
      if (
        ageOnDate(parent.birthDate, occurredAt) < MINIMUM_PARENT_AGE_AT_BIRTH
      ) {
        throw new Error(
          `${personName(parent)} would be under ${MINIMUM_PARENT_AGE_AT_BIRTH} at the birth.`,
        );
      }
    }
    const rng = new SeededRng(world.seed).fork(
      `${PEOPLE_FAMILY_VERSION}:birth:${input.stableKey}`,
    );
    const identity = generatePersonIdentity(rng.fork("identity"));
    const drawn = drawCanonicalNameForGender(rng.fork("name"), identity.gender);
    const givenName = input.givenName ?? drawn.givenName;
    const familyName = input.familyName ?? parents[0]!.familyName;
    // No duplicate child: the same parents cannot have the same-named child
    // on the same day twice.
    const siblings = childrenOf(world, parents[0]!.id);
    if (
      siblings.some((id) => {
        const sibling = world.people[id]!;
        return (
          sibling.birthDate === occurredAt && sibling.givenName === givenName
        );
      })
    ) {
      throw new Error("That child is already recorded.");
    }
    const personKey = `${input.stableKey}:person`;
    next = createCharacterHistoryContextPerson(next, {
      stableKey: personKey,
      givenName,
      familyName,
      birthDate: occurredAt,
      homeJurisdictionId: parents[0]!.homeJurisdictionId,
      identity,
    });
    childId = characterHistoryContextPersonId(next, personKey);
  } else {
    const child = world.people[input.childPersonId];
    if (!child) throw new Error("The child being adopted does not exist.");
    if (!alive(world, child.id, occurredAt)) {
      throw new Error("The child being adopted was not living then.");
    }
    if (ageOnDate(child.birthDate, occurredAt) >= 18) {
      throw new Error("Adoption here is of a minor.");
    }
    for (const parent of parents) {
      if (parent.id === child.id)
        throw new Error("A person cannot adopt themselves.");
      if (
        ageOnDate(parent.birthDate, occurredAt) < MINIMUM_ADOPTIVE_PARENT_AGE
      ) {
        throw new Error(`${personName(parent)} is too young to adopt.`);
      }
      if (
        ageOnDate(parent.birthDate, occurredAt) -
          ageOnDate(child.birthDate, occurredAt) <
        MINIMUM_ADOPTION_AGE_GAP
      ) {
        throw new Error(`${personName(parent)} is too close in age to adopt.`);
      }
      if (linked(world, parent.id, child.id)) {
        throw new Error(`${personName(parent)} is already recorded as family.`);
      }
    }
    childId = child.id;
  }

  const child = next.people[childId]!;
  const parentNames = parents.map(personName).join(" and ");
  next = recordWorldEvent(next, {
    stableKey: `${input.stableKey}:event`,
    type: FAMILY_MEMBER_ADDED_EVENT,
    occurredAt,
    recordedAt: next.currentDate,
    jurisdictionId: parents[0]!.homeJurisdictionId,
    involvedEntityIds: [childId, ...parents.map((parent) => parent.id)],
    participants: [
      ...parents.map((parent) => ({
        personId: parent.id,
        role: "agency:parent" as const,
        detail:
          input.kind === "birth" ? "Parent at the birth" : "Adoptive parent",
      })),
      {
        personId: childId,
        role: "focus:subject" as const,
        detail: input.kind === "birth" ? "Was born" : "Was adopted",
      },
    ],
    personFactConstraints: [],
    visibility: "limited",
    tags: [`family.${input.kind}`, `${PEOPLE_FAMILY_VERSION}`],
    summary:
      input.kind === "birth"
        ? `${personName(child)} was born to ${parentNames}.`
        : `${parentNames} adopted ${personName(child)}.`,
    context: {
      location: null,
      socialContext: "A family grew.",
      pressure: null,
      choice: null,
      motivation: null,
      immediateReaction: null,
    },
  });
  const event = next.history.events.at(-1)!;
  const provenance: LifeRecordProvenance = {
    kind: "simulated-event",
    eventId: event.id,
  };
  const parentKind: KinshipKind =
    input.kind === "birth"
      ? "lineal:biological-parent-child"
      : "lineal:adoptive-parent-child";

  for (const parent of parents) {
    next = recordKinship(next, {
      stableKey: `${input.stableKey}:kinship:${parent.id}`,
      personIds: [parent.id, childId],
      establishedAt: occurredAt,
      kind: parentKind,
      provenance,
    });
    for (const grandparent of parentsOf(next, parent.id)) {
      if (linked(next, grandparent, childId)) continue;
      if (!alive(next, grandparent, occurredAt)) continue;
      next = recordKinship(next, {
        stableKey: `${input.stableKey}:kinship:grandparent:${grandparent}`,
        personIds: [grandparent, childId],
        establishedAt: occurredAt,
        kind: "lineal:grandparent-grandchild",
        provenance,
      });
    }
    if (ageOnDate(child.birthDate, occurredAt) < 18) {
      next = createChildAuthority(next, {
        stableKey: `${input.stableKey}:authority:${parent.id}`,
        childPersonId: childId,
        holder: { kind: "person", personId: parent.id },
        establishedAt: occurredAt,
        kind: parents.length > 1 ? "parental:shared" : "parental:primary",
        basisKind:
          input.kind === "birth" ? "custom:birth" : "custom:adoption-recorded",
        context: null,
        provenance,
      });
    }
  }
  const siblingIds = [
    ...new Set(parents.flatMap((parent) => childrenOf(next, parent.id))),
  ].filter(
    (id) =>
      id !== childId &&
      !next.history.kinshipRelationships.some(
        (entry) =>
          entry.personIds.includes(id) &&
          entry.personIds.includes(childId) &&
          entry.kind === "collateral:sibling",
      ),
  );
  for (const siblingId of siblingIds.sort()) {
    next = recordKinship(next, {
      stableKey: `${input.stableKey}:kinship:sibling:${siblingId}`,
      personIds: [siblingId, childId],
      establishedAt: occurredAt,
      kind: "collateral:sibling",
      provenance,
    });
  }

  // Where a parent lives now is where a newborn or newly adopted child lives.
  const home = householdMembershipsAt(
    next,
    parents[0]!.id,
    currentLifeCutoff(next),
  )[0];
  const householdPeople: EntityId[] = [];
  if (
    home &&
    !householdMembershipsAt(next, childId, currentLifeCutoff(next)).some(
      (entry) => entry.membership.householdId === home.membership.householdId,
    )
  ) {
    next = startHouseholdMembership(next, {
      stableKey: `${input.stableKey}:membership`,
      personId: childId,
      householdId: home.membership.householdId,
      startedAt: laterOf(occurredAt, home.membership.startedAt),
      residenceRole: "primary",
      kind: "resident:child",
      provenance,
    });
    for (const personId of next.personOrder) {
      if (personId === childId) continue;
      if (
        householdMembershipsAt(next, personId, currentLifeCutoff(next)).some(
          (entry) =>
            entry.membership.householdId === home.membership.householdId,
        )
      ) {
        householdPeople.push(personId);
      }
    }
  }

  // The parents, and whoever lives with them, know it happened. Nobody else
  // learns of it from this record.
  const informed = [
    ...new Set([...parents.map((parent) => parent.id), ...householdPeople]),
  ].filter((id) => next.people[id] && alive(next, id, next.currentDate));
  for (const personId of informed.sort()) {
    next = recordEventKnowledge(next, {
      stableKey: `${input.stableKey}:knowledge:${personId}`,
      personId,
      eventId: event.id,
      learnedAt: next.currentDate,
      believedSummary: event.summary,
      accuracy: "accurate",
      confidence: "high",
      source: event.involvedEntityIds.includes(personId)
        ? { kind: "direct" }
        : { kind: "told-by", sourcePersonId: parents[0]!.id, claimId: null },
    });
  }
  return { world: next, childPersonId: childId, eventId: event.id };
}

function laterOf<T extends string>(left: T, right: T): T {
  return left > right ? left : right;
}
