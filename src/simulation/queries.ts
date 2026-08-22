import { ageOnDate } from "./dates";
import { factsForPerson } from "./people";
import type {
  ClaimRecord,
  EntityId,
  EventKnowledgeRecord,
  EventParticipantRole,
  HistoricalEvent,
  IsoDate,
  MemoryRecord,
  OccupationFact,
  PersonFact,
  RelationshipInteraction,
  World,
} from "./types";

export interface EventQuery {
  readonly personId?: EntityId;
  readonly jurisdictionId?: EntityId;
  readonly tagsAll?: readonly string[];
  readonly tagsAny?: readonly string[];
  readonly participantRoles?: readonly EventParticipantRole[];
  readonly beforeAge?: number;
  readonly throughDate?: IsoDate;
}

export function queryEvents(
  world: World,
  query: EventQuery,
): readonly HistoricalEvent[] {
  const person = query.personId ? world.people[query.personId] : undefined;
  if (query.personId && !person) {
    return [];
  }

  return world.history.events.filter((event) => {
    if (
      query.personId &&
      (!event.involvedEntityIds.includes(query.personId) ||
        (query.participantRoles &&
          !event.participants.some(
            (participant) =>
              participant.personId === query.personId &&
              query.participantRoles?.includes(participant.role),
          )))
    ) {
      return false;
    }
    if (
      query.jurisdictionId &&
      event.jurisdictionId !== query.jurisdictionId &&
      event.context.location?.jurisdictionId !== query.jurisdictionId
    ) {
      return false;
    }
    if (query.tagsAll?.some((tag) => !event.tags.includes(tag))) {
      return false;
    }
    if (
      query.tagsAny &&
      query.tagsAny.length > 0 &&
      !query.tagsAny.some((tag) => event.tags.includes(tag))
    ) {
      return false;
    }
    if (query.throughDate && event.occurredAt > query.throughDate) {
      return false;
    }
    if (
      query.beforeAge !== undefined &&
      person &&
      ageOnDate(person.birthDate, event.occurredAt) >= query.beforeAge
    ) {
      return false;
    }
    return true;
  });
}

export function hasLivedInJurisdiction(
  world: World,
  personId: EntityId,
  jurisdictionId: EntityId,
): boolean {
  const person = world.people[personId];
  return (
    !!person &&
    factsForPerson(person).some(
      (fact) =>
        fact.kind === "residence" && fact.jurisdictionId === jurisdictionId,
    )
  );
}

export function hasExperiencedTaggedEvent(
  world: World,
  personId: EntityId,
  tag: string,
): boolean {
  return (
    queryEvents(world, {
      personId,
      tagsAll: [tag],
      participantRoles: ["actor", "participant", "subject", "affected"],
    }).length > 0
  );
}

export function hasExperiencedTaggedEventBeforeAge(
  world: World,
  personId: EntityId,
  tag: string,
  age: number,
): boolean {
  if (!Number.isSafeInteger(age) || age < 0) {
    throw new Error("Query age must be a non-negative whole number.");
  }
  return (
    queryEvents(world, {
      personId,
      tagsAll: [tag],
      participantRoles: ["actor", "participant", "subject", "affected"],
      beforeAge: age,
    }).length > 0
  );
}

export function didPeoplePreviouslyWorkTogether(
  world: World,
  firstPersonId: EntityId,
  secondPersonId: EntityId,
  throughDate: IsoDate = world.currentDate,
): boolean {
  if (firstPersonId === secondPersonId) {
    return false;
  }
  if (
    relationshipHistory(world, firstPersonId, secondPersonId).some(
      (interaction) =>
        interaction.occurredAt <= throughDate &&
        (interaction.kind === "shared-work" ||
          interaction.tags.includes("relationship.shared-work")),
    )
  ) {
    return true;
  }
  const firstJobs = occupations(world, firstPersonId);
  const secondJobs = occupations(world, secondPersonId);
  return firstJobs.some((first) =>
    secondJobs.some(
      (second) =>
        normalize(first.employer) === normalize(second.employer) &&
        periodsOverlap(first, second, throughDate),
    ),
  );
}

export type RelationshipCloseness =
  "none" | "acquainted" | "close" | "estranged";

export interface DerivedRelationshipSummary {
  readonly closeness: RelationshipCloseness;
  readonly interactionCount: number;
  readonly lastInteractionAt: IsoDate | null;
}

export function deriveRelationshipSummary(
  world: World,
  firstPersonId: EntityId,
  secondPersonId: EntityId,
): DerivedRelationshipSummary {
  const history = relationshipHistory(world, firstPersonId, secondPersonId);
  let hiddenScore = 0;
  for (const interaction of history) {
    const magnitude =
      interaction.significance === "major"
        ? 3
        : interaction.significance === "meaningful"
          ? 2
          : 1;
    hiddenScore +=
      interaction.change === "ended" ||
      interaction.change === "strained" ||
      interaction.kind === "betrayal" ||
      interaction.kind === "conflict"
        ? -magnitude
        : magnitude;
  }
  return {
    closeness:
      history.length === 0
        ? "none"
        : hiddenScore < 0
          ? "estranged"
          : hiddenScore >= 3
            ? "close"
            : "acquainted",
    interactionCount: history.length,
    lastInteractionAt: history.at(-1)?.occurredAt ?? null,
  };
}

export function hasCloseRelationshipWithPersonAffectedByEvent(
  world: World,
  personId: EntityId,
  eventId: EntityId,
): boolean {
  const event = world.history.events.find(
    (candidate) => candidate.id === eventId,
  );
  if (!event) {
    return false;
  }
  const affectedPeople = event.participants
    .filter(
      (participant) =>
        participant.role === "affected" || participant.role === "subject",
    )
    .map((participant) => participant.personId);
  return affectedPeople.some(
    (affectedPersonId) =>
      affectedPersonId !== personId &&
      deriveRelationshipSummary(world, personId, affectedPersonId).closeness ===
        "close",
  );
}

export function relationshipHistory(
  world: World,
  firstPersonId: EntityId,
  secondPersonId?: EntityId,
): readonly RelationshipInteraction[] {
  return world.history.relationshipInteractions
    .filter(
      (interaction) =>
        interaction.personIds.includes(firstPersonId) &&
        (secondPersonId === undefined ||
          interaction.personIds.includes(secondPersonId)),
    )
    .sort(byDateThenSequence);
}

export function memoriesForPerson(
  world: World,
  personId: EntityId,
): readonly MemoryRecord[] {
  return world.history.memories
    .filter((memory) => memory.personId === personId)
    .sort(byDateThenSequence);
}

export function knowledgeForEvent(
  world: World,
  eventId: EntityId,
): readonly EventKnowledgeRecord[] {
  return world.history.knowledge
    .filter((knowledge) => knowledge.eventId === eventId)
    .sort(byDateThenSequence);
}

export function claimsForEvent(
  world: World,
  eventId: EntityId,
): readonly ClaimRecord[] {
  return world.history.claims
    .filter((claim) => claim.eventId === eventId)
    .sort(byDateThenSequence);
}

export function factsNewestFirst(
  world: World,
  personId: EntityId,
): readonly PersonFact[] {
  const person = world.people[personId];
  return person
    ? [...factsForPerson(person)].sort((left, right) =>
        right.occurredAt.localeCompare(left.occurredAt),
      )
    : [];
}

function occupations(world: World, personId: EntityId): OccupationFact[] {
  const person = world.people[personId];
  return person
    ? factsForPerson(person).filter(
        (fact): fact is OccupationFact => fact.kind === "occupation",
      )
    : [];
}

function periodsOverlap(
  first: OccupationFact,
  second: OccupationFact,
  throughDate: IsoDate,
): boolean {
  const firstEnd = first.endedAt ?? throughDate;
  const secondEnd = second.endedAt ?? throughDate;
  return first.occurredAt <= secondEnd && second.occurredAt <= firstEnd;
}

function normalize(value: string): string {
  return value.trim().toLocaleLowerCase();
}

function byDateThenSequence<
  T extends {
    readonly occurredAt?: IsoDate;
    readonly formedAt?: IsoDate;
    readonly learnedAt?: IsoDate;
    readonly madeAt?: IsoDate;
    readonly sequence: number;
  },
>(left: T, right: T): number {
  const leftDate =
    left.occurredAt ?? left.formedAt ?? left.learnedAt ?? left.madeAt;
  const rightDate =
    right.occurredAt ?? right.formedAt ?? right.learnedAt ?? right.madeAt;
  return (
    (leftDate?.localeCompare(rightDate ?? "") ?? 0) ||
    left.sequence - right.sequence
  );
}
