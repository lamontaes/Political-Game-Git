import { ageOnDate } from "./dates";
import { factsForPerson } from "./people";
import type {
  CampaignCommitmentRecord,
  ClaimRecord,
  EntityId,
  EventKnowledgeRecord,
  EventParticipantRole,
  HistoricalEvent,
  IsoDate,
  MemoryRecord,
  OccupationFact,
  PersonFact,
  PrincipleRecord,
  PrivateBeliefRecord,
  PropositionExposureRecord,
  PublicPositionRecord,
  RelationshipInteraction,
  SubjectExpertise,
  SubjectFamiliarity,
  SubjectKnowledgeRecord,
  SubjectUnderstanding,
  PracticalExperience,
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

export function privateBeliefHistory(
  world: World,
  personId: EntityId,
  propositionId?: EntityId,
): readonly PrivateBeliefRecord[] {
  return world.history.privateBeliefs
    .filter(
      (belief) =>
        belief.personId === personId &&
        (propositionId === undefined || belief.propositionId === propositionId),
    )
    .sort(byDateThenSequence);
}

export function propositionExposureHistory(
  world: World,
  personId: EntityId,
  propositionId?: EntityId,
): readonly PropositionExposureRecord[] {
  return world.history.propositionExposures
    .filter(
      (exposure) =>
        exposure.personId === personId &&
        (propositionId === undefined ||
          exposure.propositionId === propositionId),
    )
    .sort(byDateThenSequence);
}

export function hasEncounteredProposition(
  world: World,
  personId: EntityId,
  propositionId: EntityId,
  throughDate: IsoDate = world.currentDate,
): boolean {
  return (
    latestPrivateBelief(world, personId, propositionId, throughDate) !==
      undefined ||
    latestPropositionEncounterEvidence(
      world,
      personId,
      propositionId,
      throughDate,
    ) !== undefined
  );
}

export type PropositionEncounterEvidence =
  | {
      readonly kind: "proposition-exposure";
      readonly record: PropositionExposureRecord;
    }
  | {
      readonly kind: "public-position";
      readonly record: PublicPositionRecord;
    }
  | {
      readonly kind: "campaign-commitment";
      readonly record: CampaignCommitmentRecord;
    };

export type PrivateOpinionState =
  | { readonly kind: "never-encountered" }
  | {
      readonly kind: "encountered-no-formed-view";
      readonly evidence: PropositionEncounterEvidence;
    }
  | {
      readonly kind: "formed-belief";
      readonly belief: PrivateBeliefRecord;
      readonly latestExposure: PropositionExposureRecord | undefined;
    };

export function privateOpinionState(
  world: World,
  personId: EntityId,
  propositionId: EntityId,
  throughDate: IsoDate = world.currentDate,
): PrivateOpinionState {
  const belief = latestPrivateBelief(
    world,
    personId,
    propositionId,
    throughDate,
  );
  const evidence = latestPropositionEncounterEvidence(
    world,
    personId,
    propositionId,
    throughDate,
  );
  const latestExposure = propositionExposureHistory(
    world,
    personId,
    propositionId,
  )
    .filter((exposure) => exposure.encounteredAt <= throughDate)
    .at(-1);
  if (belief) return { kind: "formed-belief", belief, latestExposure };
  return evidence
    ? { kind: "encountered-no-formed-view", evidence }
    : { kind: "never-encountered" };
}

function latestPropositionEncounterEvidence(
  world: World,
  personId: EntityId,
  propositionId: EntityId,
  throughDate: IsoDate,
): PropositionEncounterEvidence | undefined {
  const evidence: PropositionEncounterEvidence[] = [
    ...propositionExposureHistory(world, personId, propositionId)
      .filter((record) => record.encounteredAt <= throughDate)
      .map((record) => ({ kind: "proposition-exposure" as const, record })),
    ...publicPositionHistory(world, personId, propositionId)
      .filter((record) => record.statedAt <= throughDate)
      .map((record) => ({ kind: "public-position" as const, record })),
    ...campaignCommitmentHistory(world, personId, propositionId)
      .filter((record) => record.madeAt <= throughDate)
      .map((record) => ({ kind: "campaign-commitment" as const, record })),
  ];
  return evidence
    .sort(
      (left, right) =>
        propositionEncounterEvidenceDate(left).localeCompare(
          propositionEncounterEvidenceDate(right),
        ) || left.record.sequence - right.record.sequence,
    )
    .at(-1);
}

function propositionEncounterEvidenceDate(
  evidence: PropositionEncounterEvidence,
): IsoDate {
  switch (evidence.kind) {
    case "proposition-exposure":
      return evidence.record.encounteredAt;
    case "public-position":
      return evidence.record.statedAt;
    case "campaign-commitment":
      return evidence.record.madeAt;
  }
}

export function latestPrivateBelief(
  world: World,
  personId: EntityId,
  propositionId: EntityId,
  throughDate: IsoDate = world.currentDate,
): PrivateBeliefRecord | undefined {
  return privateBeliefHistory(world, personId, propositionId)
    .filter((belief) => belief.formedAt <= throughDate)
    .at(-1);
}

export function privatelySupportsProposition(
  world: World,
  personId: EntityId,
  propositionId: EntityId,
  throughDate: IsoDate = world.currentDate,
): boolean {
  return (
    latestPrivateBelief(world, personId, propositionId, throughDate)
      ?.position === "support"
  );
}

export function privatePositionAtDate(
  world: World,
  personId: EntityId,
  propositionId: EntityId,
  throughDate: IsoDate,
): PrivateBeliefRecord["position"] | undefined {
  return latestPrivateBelief(world, personId, propositionId, throughDate)
    ?.position;
}

export function privatePositionChanges(
  world: World,
  personId: EntityId,
  propositionId: EntityId,
): readonly PrivateBeliefRecord[] {
  const history = privateBeliefHistory(world, personId, propositionId);
  return history.filter(
    (belief, index) =>
      index > 0 && belief.position !== history[index - 1]?.position,
  );
}

export function privatePositionChangeDates(
  world: World,
  personId: EntityId,
  propositionId: EntityId,
): readonly IsoDate[] {
  return privatePositionChanges(world, personId, propositionId).map(
    (belief) => belief.formedAt,
  );
}

export function hasChangedPrivatePosition(
  world: World,
  personId: EntityId,
  propositionId: EntityId,
): boolean {
  return (
    new Set(
      privateBeliefHistory(world, personId, propositionId).map(
        (belief) => belief.position,
      ),
    ).size > 1
  );
}

export function publicPositionHistory(
  world: World,
  personId: EntityId,
  propositionId?: EntityId,
): readonly PublicPositionRecord[] {
  return world.history.publicPositions
    .filter(
      (position) =>
        position.personId === personId &&
        (propositionId === undefined ||
          position.propositionId === propositionId),
    )
    .sort(byDateThenSequence);
}

export function publicPositionAtDate(
  world: World,
  personId: EntityId,
  propositionId: EntityId,
  throughDate: IsoDate,
): PublicPositionRecord | undefined {
  return publicPositionHistory(world, personId, propositionId)
    .filter((position) => position.statedAt <= throughDate)
    .at(-1);
}

export function campaignCommitmentHistory(
  world: World,
  personId: EntityId,
  propositionId?: EntityId,
): readonly CampaignCommitmentRecord[] {
  return world.history.campaignCommitments
    .filter(
      (commitment) =>
        commitment.personId === personId &&
        (propositionId === undefined ||
          commitment.propositionId === propositionId),
    )
    .sort(byDateThenSequence);
}

export function latestCampaignCommitment(
  world: World,
  personId: EntityId,
  propositionId: EntityId,
): CampaignCommitmentRecord | undefined {
  return campaignCommitmentHistory(world, personId, propositionId).at(-1);
}

export function hasCampaignCommitment(
  world: World,
  personId: EntityId,
  propositionId: EntityId,
): boolean {
  return latestCampaignCommitment(world, personId, propositionId) !== undefined;
}

export function principleHistory(
  world: World,
  personId: EntityId,
  principleId?: EntityId,
): readonly PrincipleRecord[] {
  return world.history.principles
    .filter(
      (principle) =>
        principle.personId === personId &&
        (principleId === undefined || principle.principleId === principleId),
    )
    .sort(byDateThenSequence);
}

export function latestPrinciple(
  world: World,
  personId: EntityId,
  principleId: EntityId,
): PrincipleRecord | undefined {
  return principleHistory(world, personId, principleId).at(-1);
}

export function personHoldsPrinciple(
  world: World,
  personId: EntityId,
  principleId: EntityId,
): boolean {
  return latestPrinciple(world, personId, principleId)?.stance === "endorses";
}

export function formedBeliefsInDomain(
  world: World,
  personId: EntityId,
  domainId: EntityId,
): readonly PrivateBeliefRecord[] {
  const latestByProposition = new Map<EntityId, PrivateBeliefRecord>();
  for (const belief of privateBeliefHistory(world, personId)) {
    const proposition = world.policyCatalog.propositions[belief.propositionId];
    if (
      proposition &&
      world.policyCatalog.issues[proposition.issueId]?.domainId === domainId
    ) {
      latestByProposition.set(belief.propositionId, belief);
    }
  }
  return [...latestByProposition.values()].sort(byDateThenSequence);
}

export interface ResolvedBeliefFormationProvenance {
  readonly events: readonly HistoricalEvent[];
  readonly facts: readonly PersonFact[];
  readonly propositionExposures: readonly PropositionExposureRecord[];
  readonly memories: readonly MemoryRecord[];
  readonly eventKnowledge: readonly EventKnowledgeRecord[];
  readonly claims: readonly ClaimRecord[];
  readonly relationshipInteractions: readonly RelationshipInteraction[];
  readonly subjectKnowledge: readonly SubjectKnowledgeRecord[];
}

export function resolvedFormationProvenanceForBelief(
  world: World,
  beliefId: EntityId,
): ResolvedBeliefFormationProvenance | undefined {
  const belief = world.history.privateBeliefs.find(
    (candidate) => candidate.id === beliefId,
  );
  if (!belief) return undefined;
  const formation = belief.formation;
  const select = <T extends { readonly id: EntityId }>(
    records: readonly T[],
    ids: readonly EntityId[],
  ): readonly T[] => {
    const wanted = new Set(ids);
    return records.filter((record) => wanted.has(record.id));
  };
  const person = world.people[belief.personId];
  return {
    events: select(world.history.events, formation.relevantEventIds),
    facts: person
      ? select(factsForPerson(person), formation.sourceFactIds)
      : [],
    propositionExposures: select(
      world.history.propositionExposures,
      formation.propositionExposureIds,
    ),
    memories: select(world.history.memories, formation.memoryIds),
    eventKnowledge: select(
      world.history.knowledge,
      formation.eventKnowledgeIds,
    ),
    claims: select(world.history.claims, formation.claimIds),
    relationshipInteractions: select(
      world.history.relationshipInteractions,
      formation.relationshipInteractionIds,
    ),
    subjectKnowledge: select(
      world.history.subjectKnowledge,
      formation.subjectKnowledgeIds,
    ),
  };
}

export function relevantExperiencesForBelief(
  world: World,
  beliefId: EntityId,
): readonly HistoricalEvent[] {
  return resolvedFormationProvenanceForBelief(world, beliefId)?.events ?? [];
}

export function subjectKnowledgeHistory(
  world: World,
  personId: EntityId,
  subjectId?: EntityId,
): readonly SubjectKnowledgeRecord[] {
  return world.history.subjectKnowledge
    .filter(
      (knowledge) =>
        knowledge.personId === personId &&
        (subjectId === undefined || knowledge.subjectId === subjectId),
    )
    .sort(byDateThenSequence);
}

export function latestSubjectKnowledge(
  world: World,
  personId: EntityId,
  subjectId: EntityId,
): SubjectKnowledgeRecord | undefined {
  return subjectKnowledgeHistory(world, personId, subjectId).at(-1);
}

export interface SubjectKnowledgeProfile {
  readonly subjectId: EntityId;
  readonly familiarity: SubjectFamiliarity;
  readonly understanding: SubjectUnderstanding;
  readonly expertise: SubjectExpertise;
  readonly practicalExperience: PracticalExperience;
  readonly explicitRecordId: EntityId | null;
  readonly supportingFactIds: readonly EntityId[];
}

export function subjectKnowledgeProfile(
  world: World,
  personId: EntityId,
  subjectId: EntityId,
): SubjectKnowledgeProfile | undefined {
  if (!world.policyCatalog.subjects[subjectId]) return undefined;
  const person = world.people[personId];
  if (!person) return undefined;
  const supportingFacts = factsForPerson(person).filter(
    (fact) =>
      (fact.kind === "education" || fact.kind === "occupation") &&
      fact.subjectIds.includes(subjectId),
  );
  const explicit = latestSubjectKnowledge(world, personId, subjectId);
  if (!explicit && supportingFacts.length === 0) return undefined;

  if (explicit) {
    return {
      subjectId,
      familiarity: explicit.familiarity,
      understanding: explicit.understanding,
      expertise: explicit.expertise,
      practicalExperience: explicit.practicalExperience,
      explicitRecordId: explicit.id,
      supportingFactIds: supportingFacts.map((fact) => fact.id).sort(),
    };
  }

  let familiarity: SubjectFamiliarity = "aware";
  let understanding: SubjectUnderstanding = "minimal";
  let expertise: SubjectExpertise = "none";
  let practicalExperience: PracticalExperience = "none";
  for (const fact of supportingFacts) {
    if (fact.kind === "occupation") {
      familiarity = maxCategory(FAMILIARITY_ORDER, familiarity, "deep");
      understanding = maxCategory(
        UNDERSTANDING_ORDER,
        understanding,
        "advanced",
      );
      expertise = maxCategory(EXPERTISE_ORDER, expertise, "practitioner");
      practicalExperience = maxCategory(
        PRACTICAL_ORDER,
        practicalExperience,
        "direct",
      );
    } else {
      familiarity = maxCategory(FAMILIARITY_ORDER, familiarity, "familiar");
      understanding = maxCategory(
        UNDERSTANDING_ORDER,
        understanding,
        "working",
      );
      expertise = maxCategory(EXPERTISE_ORDER, expertise, "basic");
      practicalExperience = maxCategory(
        PRACTICAL_ORDER,
        practicalExperience,
        "indirect",
      );
    }
  }
  return {
    subjectId,
    familiarity,
    understanding,
    expertise,
    practicalExperience,
    explicitRecordId: null,
    supportingFactIds: supportingFacts.map((fact) => fact.id).sort(),
  };
}

export function subjectKnowledgeProfilesForDomain(
  world: World,
  personId: EntityId,
  domainId: EntityId,
): readonly SubjectKnowledgeProfile[] {
  return knowledgeSubjectIdsForPerson(world, personId).flatMap((subjectId) => {
    const subject = world.policyCatalog.subjects[subjectId];
    const belongsToDomain =
      subject?.scope === "domain"
        ? subject.referenceId === domainId
        : subject?.scope === "issue"
          ? !!subject.referenceId &&
            world.policyCatalog.issues[subject.referenceId]?.domainId ===
              domainId
          : subject?.scope === "proposition"
            ? propositionDomainId(world, subject.referenceId) === domainId
            : false;
    const profile = belongsToDomain
      ? subjectKnowledgeProfile(world, personId, subjectId)
      : undefined;
    return profile ? [profile] : [];
  });
}

export function subjectKnowledgeProfilesForPerson(
  world: World,
  personId: EntityId,
): readonly SubjectKnowledgeProfile[] {
  return knowledgeSubjectIdsForPerson(world, personId).flatMap((subjectId) => {
    const profile = subjectKnowledgeProfile(world, personId, subjectId);
    return profile ? [profile] : [];
  });
}

export function hasPracticalExperienceForSubject(
  world: World,
  personId: EntityId,
  subjectId: EntityId,
): boolean {
  const experience = subjectKnowledgeProfile(
    world,
    personId,
    subjectId,
  )?.practicalExperience;
  return experience === "direct" || experience === "extensive";
}

function occupations(world: World, personId: EntityId): OccupationFact[] {
  const person = world.people[personId];
  return person
    ? factsForPerson(person).filter(
        (fact): fact is OccupationFact => fact.kind === "occupation",
      )
    : [];
}

function knowledgeSubjectIdsForPerson(
  world: World,
  personId: EntityId,
): readonly EntityId[] {
  const person = world.people[personId];
  if (!person) return [];
  const subjectIds = new Set<EntityId>();
  for (const fact of factsForPerson(person)) {
    if (fact.kind === "education" || fact.kind === "occupation") {
      for (const subjectId of fact.subjectIds) subjectIds.add(subjectId);
    }
  }
  for (const record of world.history.subjectKnowledge) {
    if (record.personId === personId) subjectIds.add(record.subjectId);
  }
  return [...subjectIds].sort();
}

const FAMILIARITY_ORDER = ["aware", "familiar", "deep"] as const;
const UNDERSTANDING_ORDER = [
  "minimal",
  "working",
  "advanced",
  "expert",
] as const;
const EXPERTISE_ORDER = [
  "none",
  "basic",
  "practitioner",
  "specialist",
  "authority",
] as const;
const PRACTICAL_ORDER = ["none", "indirect", "direct", "extensive"] as const;

function maxCategory<T extends string>(
  order: readonly T[],
  left: T,
  right: T,
): T {
  return order.indexOf(left) >= order.indexOf(right) ? left : right;
}

function propositionDomainId(
  world: World,
  propositionId: EntityId | null,
): EntityId | undefined {
  if (propositionId === null) return undefined;
  const proposition = world.policyCatalog.propositions[propositionId];
  return proposition
    ? world.policyCatalog.issues[proposition.issueId]?.domainId
    : undefined;
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
    readonly statedAt?: IsoDate;
    readonly recordedAt?: IsoDate;
    readonly encounteredAt?: IsoDate;
    readonly sequence: number;
  },
>(left: T, right: T): number {
  const leftDate =
    left.occurredAt ??
    left.formedAt ??
    left.learnedAt ??
    left.madeAt ??
    left.statedAt ??
    left.recordedAt ??
    left.encounteredAt;
  const rightDate =
    right.occurredAt ??
    right.formedAt ??
    right.learnedAt ??
    right.madeAt ??
    right.statedAt ??
    right.recordedAt ??
    right.encounteredAt;
  return (
    (leftDate?.localeCompare(rightDate ?? "") ?? 0) ||
    left.sequence - right.sequence
  );
}
