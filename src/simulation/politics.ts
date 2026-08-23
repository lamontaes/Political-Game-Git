import { makeIsoDate } from "./dates";
import {
  appendCampaignCommitmentRecord,
  appendPrincipleRecord,
  appendPrivateBeliefRecord,
  appendPropositionExposureRecord,
  appendPublicPositionRecord,
  appendSubjectKnowledgeRecord,
} from "./history";
import type {
  CampaignCommitmentRecordInput,
  PrincipleRecordInput,
  PrivateBeliefRecordInput,
  PropositionExposureRecordInput,
  PublicPositionRecordInput,
  SubjectKnowledgeRecordInput,
} from "./history";
import { factsForPerson } from "./people";
import {
  assertOpenTaxonomyKey,
  BELIEF_FORMATION_REASON_NAMESPACES,
  POLITICAL_CUE_NAMESPACES,
} from "./taxonomy";
import type {
  BeliefFormationContext,
  EntityId,
  PersonFact,
  SubjectKnowledgeProvenance,
  World,
} from "./types";
import { assertWorldIntegrity } from "./world";

const BELIEF_POSITIONS = [
  "support",
  "oppose",
  "uncertain",
  "conflicted",
] as const;
const CONVICTIONS = ["tentative", "moderate", "strong", "settled"] as const;
const SALIENCES = ["low", "moderate", "high", "central"] as const;
const FLEXIBILITIES = ["open", "negotiable", "conditional", "firm"] as const;
const PUBLIC_STANCES = [
  "support",
  "oppose",
  "undecided",
  "conflicted",
  "withheld",
] as const;
const COMMITMENT_STANCES = [
  "support",
  "oppose",
  "seek-modification",
  "defer",
] as const;
const COMMITMENT_LEVELS = ["aspiration", "conditional", "pledge"] as const;
const PRINCIPLE_STANCES = ["endorses", "rejects", "conflicted"] as const;
const FAMILIARITIES = ["aware", "familiar", "deep"] as const;
const UNDERSTANDINGS = ["minimal", "working", "advanced", "expert"] as const;
const EXPERTISE_LEVELS = [
  "none",
  "basic",
  "practitioner",
  "specialist",
  "authority",
] as const;
const PRACTICAL_LEVELS = ["none", "indirect", "direct", "extensive"] as const;

export function recordPropositionExposure(
  world: World,
  input: PropositionExposureRecordInput,
): World {
  requirePerson(world, input.personId);
  requireProposition(world, input.propositionId);
  assertRecordDate(
    world,
    input.encounteredAt,
    "Proposition-exposure date",
    input.personId,
  );
  assertNonEmpty(input.summary, "Proposition-exposure summary");
  validatePropositionExposureProvenance(
    world,
    input.personId,
    input.encounteredAt,
    input.provenance,
  );
  return validateNext(world, {
    ...world,
    history: appendPropositionExposureRecord(world.history, world.id, input),
  });
}

export function recordPrivateBelief(
  world: World,
  input: PrivateBeliefRecordInput,
): World {
  requirePerson(world, input.personId);
  requireProposition(world, input.propositionId);
  assertRecordDate(
    world,
    input.formedAt,
    "Belief formation date",
    input.personId,
  );
  assertMember(BELIEF_POSITIONS, input.position, "belief position");
  assertMember(CONVICTIONS, input.conviction, "belief conviction");
  assertMember(SALIENCES, input.salience, "belief salience");
  assertMember(FLEXIBILITIES, input.flexibility, "belief flexibility");
  assertOptional(input.rationale, "Belief rationale");
  validateFormation(world, input.personId, input.formedAt, input.formation);
  for (const exposureId of input.formation.propositionExposureIds) {
    const exposure = world.history.propositionExposures.find(
      (candidate) => candidate.id === exposureId,
    );
    if (exposure?.propositionId !== input.propositionId) {
      throw new Error(
        `Belief formation references an exposure to another proposition: ${exposureId}`,
      );
    }
  }
  validateSupersession(
    world.history.privateBeliefs,
    input.supersedesBeliefId,
    input.personId,
    input.propositionId,
    input.formedAt,
    "private belief",
    (record) => record.propositionId,
    (record) => record.formedAt,
  );
  return validateNext(world, {
    ...world,
    history: appendPrivateBeliefRecord(world.history, world.id, input),
  });
}

export function recordPublicPosition(
  world: World,
  input: PublicPositionRecordInput,
): World {
  requirePerson(world, input.personId);
  requireProposition(world, input.propositionId);
  assertRecordDate(
    world,
    input.statedAt,
    "Public-position date",
    input.personId,
  );
  assertMember(PUBLIC_STANCES, input.stance, "public-position stance");
  assertNonEmpty(input.statement, "Public-position statement");
  assertOptional(input.venue, "Public-position venue");
  validateSourceEvent(
    world,
    input.sourceEventId,
    input.personId,
    input.statedAt,
  );
  validateSupersession(
    world.history.publicPositions,
    input.supersedesPublicPositionId,
    input.personId,
    input.propositionId,
    input.statedAt,
    "public position",
    (record) => record.propositionId,
    (record) => record.statedAt,
  );
  return validateNext(world, {
    ...world,
    history: appendPublicPositionRecord(world.history, world.id, input),
  });
}

export function recordCampaignCommitment(
  world: World,
  input: CampaignCommitmentRecordInput,
): World {
  requirePerson(world, input.personId);
  requireProposition(world, input.propositionId);
  assertRecordDate(
    world,
    input.madeAt,
    "Campaign-commitment date",
    input.personId,
  );
  assertMember(COMMITMENT_STANCES, input.stance, "campaign-commitment stance");
  assertMember(COMMITMENT_LEVELS, input.level, "campaign-commitment level");
  assertNonEmpty(input.statement, "Campaign-commitment statement");
  assertOptional(input.conditions, "Campaign-commitment conditions");
  validateSourceEvent(world, input.sourceEventId, input.personId, input.madeAt);
  validateSupersession(
    world.history.campaignCommitments,
    input.supersedesCommitmentId,
    input.personId,
    input.propositionId,
    input.madeAt,
    "campaign commitment",
    (record) => record.propositionId,
    (record) => record.madeAt,
  );
  return validateNext(world, {
    ...world,
    history: appendCampaignCommitmentRecord(world.history, world.id, input),
  });
}

export function recordPrinciple(
  world: World,
  input: PrincipleRecordInput,
): World {
  requirePerson(world, input.personId);
  if (!world.policyCatalog.principles[input.principleId]) {
    throw new Error(`Missing political principle: ${input.principleId}`);
  }
  assertRecordDate(
    world,
    input.formedAt,
    "Principle formation date",
    input.personId,
  );
  assertMember(PRINCIPLE_STANCES, input.stance, "principle stance");
  assertMember(CONVICTIONS, input.conviction, "principle conviction");
  assertMember(FLEXIBILITIES, input.flexibility, "principle flexibility");
  assertOptional(input.qualification, "Principle qualification");
  validateFormation(world, input.personId, input.formedAt, input.formation);
  validateSupersession(
    world.history.principles,
    input.supersedesPrincipleRecordId,
    input.personId,
    input.principleId,
    input.formedAt,
    "principle",
    (record) => record.principleId,
    (record) => record.formedAt,
  );
  return validateNext(world, {
    ...world,
    history: appendPrincipleRecord(world.history, world.id, input),
  });
}

export function recordSubjectKnowledge(
  world: World,
  input: SubjectKnowledgeRecordInput,
): World {
  requirePerson(world, input.personId);
  if (!world.policyCatalog.subjects[input.subjectId]) {
    throw new Error(`Missing knowledge subject: ${input.subjectId}`);
  }
  assertRecordDate(
    world,
    input.recordedAt,
    "Subject-knowledge date",
    input.personId,
  );
  assertMember(FAMILIARITIES, input.familiarity, "subject familiarity");
  assertMember(UNDERSTANDINGS, input.understanding, "subject understanding");
  assertMember(EXPERTISE_LEVELS, input.expertise, "subject expertise");
  assertMember(
    PRACTICAL_LEVELS,
    input.practicalExperience,
    "practical-experience level",
  );
  validateSubjectKnowledgeProvenance(
    world,
    input.personId,
    input.subjectId,
    input.recordedAt,
    input.provenance,
  );
  validateSupersession(
    world.history.subjectKnowledge,
    input.supersedesKnowledgeId,
    input.personId,
    input.subjectId,
    input.recordedAt,
    "subject knowledge",
    (record) => record.subjectId,
    (record) => record.recordedAt,
  );
  return validateNext(world, {
    ...world,
    history: appendSubjectKnowledgeRecord(world.history, world.id, input),
  });
}

export function createFormationContext(
  reason: BeliefFormationContext["reason"],
  input: Partial<Omit<BeliefFormationContext, "reason">> = {},
): BeliefFormationContext {
  return {
    reason,
    relevantEventIds: input.relevantEventIds ?? [],
    sourceFactIds: input.sourceFactIds ?? [],
    propositionExposureIds: input.propositionExposureIds ?? [],
    memoryIds: input.memoryIds ?? [],
    eventKnowledgeIds: input.eventKnowledgeIds ?? [],
    claimIds: input.claimIds ?? [],
    relationshipInteractionIds: input.relationshipInteractionIds ?? [],
    subjectKnowledgeIds: input.subjectKnowledgeIds ?? [],
    decisionTraceIds: input.decisionTraceIds ?? [],
    cue: input.cue ?? null,
    evidenceReference: input.evidenceReference ?? null,
    note: input.note ?? null,
  };
}

function validateFormation(
  world: World,
  personId: EntityId,
  formedAt: string,
  formation: BeliefFormationContext,
): void {
  assertOpenTaxonomyKey(
    formation.reason,
    BELIEF_FORMATION_REASON_NAMESPACES,
    "Belief-formation reason",
  );
  const referencedMemories = formation.memoryIds.map((memoryId) => {
    const memory = world.history.memories.find(
      (candidate) => candidate.id === memoryId,
    );
    if (!memory || memory.personId !== personId || memory.formedAt > formedAt) {
      throw new Error(
        `Formation references an unavailable memory: ${memoryId}`,
      );
    }
    return memory;
  });
  const referencedKnowledge = formation.eventKnowledgeIds.map((knowledgeId) => {
    const knowledge = world.history.knowledge.find(
      (candidate) => candidate.id === knowledgeId,
    );
    if (
      !knowledge ||
      knowledge.personId !== personId ||
      knowledge.learnedAt > formedAt
    ) {
      throw new Error(
        `Formation references unavailable event knowledge: ${knowledgeId}`,
      );
    }
    return knowledge;
  });
  const knownEventIds = new Set([
    ...referencedMemories.map((memory) => memory.eventId),
    ...referencedKnowledge.map((knowledge) => knowledge.eventId),
  ]);
  for (const eventId of formation.relevantEventIds) {
    const event = world.history.events.find(
      (candidate) => candidate.id === eventId,
    );
    if (
      !event ||
      event.occurredAt > formedAt ||
      (!event.involvedEntityIds.includes(personId) &&
        !knownEventIds.has(eventId))
    ) {
      throw new Error(`Formation references an unavailable event: ${eventId}`);
    }
  }
  const facts = new Map(
    factsForPerson(requirePerson(world, personId)).map((fact) => [
      fact.id,
      fact,
    ]),
  );
  for (const factId of formation.sourceFactIds) {
    const fact = facts.get(factId);
    if (!fact || fact.occurredAt > formedAt) {
      throw new Error(
        `Formation references an unavailable person fact: ${factId}`,
      );
    }
  }
  for (const exposureId of formation.propositionExposureIds) {
    const exposure = world.history.propositionExposures.find(
      (candidate) => candidate.id === exposureId,
    );
    if (
      !exposure ||
      exposure.personId !== personId ||
      exposure.encounteredAt > formedAt
    ) {
      throw new Error(
        `Formation references an unavailable proposition exposure: ${exposureId}`,
      );
    }
  }
  for (const claimId of formation.claimIds) {
    const claim = world.history.claims.find(
      (candidate) => candidate.id === claimId,
    );
    const knownThroughClaim = referencedKnowledge.some(
      (knowledge) =>
        knowledge.source.kind === "told-by" &&
        knowledge.source.claimId === claimId,
    );
    if (
      !claim ||
      claim.madeAt > formedAt ||
      (claim.speakerPersonId !== personId && !knownThroughClaim)
    ) {
      throw new Error(`Formation references an unavailable claim: ${claimId}`);
    }
  }
  for (const interactionId of formation.relationshipInteractionIds) {
    const interaction = world.history.relationshipInteractions.find(
      (candidate) => candidate.id === interactionId,
    );
    if (
      !interaction ||
      !interaction.personIds.includes(personId) ||
      interaction.occurredAt > formedAt
    ) {
      throw new Error(
        `Formation references an unavailable relationship interaction: ${interactionId}`,
      );
    }
  }
  for (const knowledgeId of formation.subjectKnowledgeIds) {
    const knowledge = world.history.subjectKnowledge.find(
      (candidate) => candidate.id === knowledgeId,
    );
    if (
      !knowledge ||
      knowledge.personId !== personId ||
      knowledge.recordedAt > formedAt
    ) {
      throw new Error(
        `Formation references unavailable subject knowledge: ${knowledgeId}`,
      );
    }
  }
  for (const traceId of formation.decisionTraceIds) {
    const trace = world.history.decisionTraces.find(
      (candidate) => candidate.id === traceId,
    );
    if (
      !trace ||
      trace.context.actorPersonId !== personId ||
      trace.recordedAt > formedAt
    ) {
      throw new Error(
        `Formation references an unavailable decision trace: ${traceId}`,
      );
    }
  }
  if (formation.cue) {
    const cueSource =
      formation.cue.sourcePersonId === null
        ? undefined
        : world.people[formation.cue.sourcePersonId];
    assertOpenTaxonomyKey(
      formation.cue.kind,
      POLITICAL_CUE_NAMESPACES,
      "Political cue kind",
    );
    assertNonEmpty(formation.cue.sourceLabel, "Political cue source label");
    if (formation.cue.sourcePersonId !== null && !cueSource) {
      throw new Error(
        `Political cue references a missing person: ${formation.cue.sourcePersonId}`,
      );
    }
    if (formation.cue.sourcePersonId === personId) {
      throw new Error("A trusted political cue must come from another person.");
    }
    if (cueSource && cueSource.birthDate > formedAt) {
      throw new Error(
        "A political cue source must be born by the formation date.",
      );
    }
  }
  if (formation.reason.startsWith("cue:") !== (formation.cue !== null)) {
    throw new Error(
      "Cue-based formation reasons and political cues must be supplied together.",
    );
  }
  if (formation.cue) validateCueConsistency(formation.cue);
  assertOptional(formation.evidenceReference, "Formation evidence reference");
  assertOptional(formation.note, "Formation note");
}

function validateCueConsistency(cue: BeliefFormationContext["cue"]): void {
  if (!cue) return;
  const namespace = cue.kind.slice(0, cue.kind.indexOf(":"));
  const requiresPerson = namespace === "person";
  const forbidsPerson = [
    "information",
    "organization",
    "media",
    "community",
  ].includes(namespace);
  if (
    (requiresPerson && cue.sourcePersonId === null) ||
    (forbidsPerson && cue.sourcePersonId !== null)
  ) {
    throw new Error(
      `Political cue has inconsistent person provenance: ${cue.kind}`,
    );
  }
}

function validatePropositionExposureProvenance(
  world: World,
  personId: EntityId,
  encounteredAt: string,
  provenance: PropositionExposureRecordInput["provenance"],
): void {
  switch (provenance.kind) {
    case "direct-experience": {
      const event = world.history.events.find(
        (candidate) => candidate.id === provenance.eventId,
      );
      if (
        !event ||
        event.occurredAt > encounteredAt ||
        !event.involvedEntityIds.includes(personId)
      ) {
        throw new Error(
          `Proposition exposure references an incompatible event: ${provenance.eventId}`,
        );
      }
      return;
    }
    case "told-by": {
      const sourcePerson = requirePerson(world, provenance.sourcePersonId);
      if (provenance.sourcePersonId === personId) {
        throw new Error(
          "A told-by proposition exposure requires another person as source.",
        );
      }
      if (sourcePerson.birthDate > encounteredAt) {
        throw new Error(
          "A proposition-exposure source must be born by the encounter date.",
        );
      }
      if (provenance.claimId !== null) {
        const claim = world.history.claims.find(
          (candidate) => candidate.id === provenance.claimId,
        );
        if (
          !claim ||
          claim.speakerPersonId !== provenance.sourcePersonId ||
          claim.madeAt > encounteredAt
        ) {
          throw new Error(
            `Proposition exposure references an incompatible claim: ${provenance.claimId}`,
          );
        }
      }
      return;
    }
    case "public-record":
      assertNonEmpty(provenance.reference, "Exposure public-record reference");
      return;
    case "media":
      assertNonEmpty(provenance.outlet, "Exposure media outlet");
      assertOptional(provenance.reference, "Exposure media reference");
      return;
    case "organization":
      assertNonEmpty(
        provenance.organizationLabel,
        "Exposure organization label",
      );
      assertOptional(provenance.reference, "Exposure organization reference");
      return;
    case "manual":
      assertNonEmpty(provenance.note, "Exposure manual note");
      return;
    default:
      throw new Error(
        `Invalid proposition-exposure provenance kind: ${runtimeKind(provenance)}`,
      );
  }
}

function validateSubjectKnowledgeProvenance(
  world: World,
  personId: EntityId,
  subjectId: EntityId,
  recordedAt: string,
  provenance: SubjectKnowledgeProvenance,
): void {
  switch (provenance.kind) {
    case "person-facts": {
      if (provenance.factIds.length === 0) {
        throw new Error("Fact-derived expertise requires at least one fact.");
      }
      const facts = new Map(
        factsForPerson(requirePerson(world, personId)).map((fact) => [
          fact.id,
          fact,
        ]),
      );
      for (const factId of provenance.factIds) {
        const fact = facts.get(factId);
        if (
          !factSupportsSubject(fact, subjectId) ||
          fact.occurredAt > recordedAt
        ) {
          throw new Error(
            `Subject knowledge references an incompatible person fact: ${factId}`,
          );
        }
      }
      break;
    }
    case "historical-events":
      if (provenance.eventIds.length === 0) {
        throw new Error("Event-derived knowledge requires at least one event.");
      }
      for (const eventId of provenance.eventIds) {
        const event = world.history.events.find(
          (candidate) => candidate.id === eventId,
        );
        if (
          !event ||
          event.occurredAt > recordedAt ||
          !event.involvedEntityIds.includes(personId)
        ) {
          throw new Error(
            `Subject knowledge references an incompatible event: ${eventId}`,
          );
        }
      }
      break;
    case "study":
      assertNonEmpty(provenance.reference, "Study reference");
      break;
    case "trusted-report":
      if (provenance.sourcePersonId === personId) {
        throw new Error(
          "A trusted subject-knowledge report must come from another person.",
        );
      }
      if (
        requirePerson(world, provenance.sourcePersonId).birthDate > recordedAt
      ) {
        throw new Error(
          "A trusted-report source must be born by the knowledge date.",
        );
      }
      assertOptional(provenance.reference, "Trusted-report reference");
      break;
    case "manual":
      assertNonEmpty(provenance.note, "Manual knowledge note");
      break;
    default:
      throw new Error(
        `Invalid subject-knowledge provenance kind: ${runtimeKind(provenance)}`,
      );
  }
}

function factSupportsSubject(
  fact: PersonFact | undefined,
  subjectId: EntityId,
): fact is PersonFact & { readonly subjectIds: readonly EntityId[] } {
  return (
    !!fact &&
    (fact.kind === "education" || fact.kind === "occupation") &&
    fact.subjectIds.includes(subjectId)
  );
}

function validateSourceEvent(
  world: World,
  eventId: EntityId | null,
  personId: EntityId,
  recordDate: string,
): void {
  if (eventId === null) return;
  const event = world.history.events.find(
    (candidate) => candidate.id === eventId,
  );
  if (
    !event ||
    event.occurredAt !== recordDate ||
    !event.involvedEntityIds.includes(personId)
  ) {
    throw new Error(
      `Political record references an unavailable event: ${eventId}`,
    );
  }
}

function validateSupersession<
  T extends { readonly id: EntityId; readonly personId: EntityId },
>(
  records: readonly T[],
  priorId: EntityId | null,
  personId: EntityId,
  subjectId: EntityId,
  recordDate: string,
  label: string,
  selectSubjectId: (record: T) => EntityId,
  selectDate: (record: T) => string,
): void {
  const prior =
    priorId === null
      ? undefined
      : records.find((record) => record.id === priorId);
  const current = records
    .filter(
      (record) =>
        record.personId === personId && selectSubjectId(record) === subjectId,
    )
    .at(-1);
  if (
    (current === undefined && priorId !== null) ||
    (current !== undefined && priorId !== current.id) ||
    (priorId !== null && !prior) ||
    (prior !== undefined &&
      (prior.personId !== personId ||
        selectSubjectId(prior) !== subjectId ||
        selectDate(prior) > recordDate))
  ) {
    throw new Error(`Invalid ${label} supersession reference: ${priorId}`);
  }
}

function requirePerson(world: World, personId: EntityId) {
  const person = world.people[personId];
  if (!person) throw new Error(`Missing person: ${personId}`);
  return person;
}

function requireProposition(world: World, propositionId: EntityId): void {
  if (!world.policyCatalog.propositions[propositionId]) {
    throw new Error(`Missing policy proposition: ${propositionId}`);
  }
}

function assertRecordDate(
  world: World,
  value: string,
  label: string,
  personId: EntityId,
): void {
  const date = makeIsoDate(value);
  const person = requirePerson(world, personId);
  if (date < person.birthDate || date > world.currentDate) {
    throw new Error(`${label} must be within the person's lived history.`);
  }
}

function assertMember<T extends string>(
  values: readonly T[],
  value: T,
  label: string,
): void {
  if (!values.includes(value)) {
    throw new Error(`Invalid ${label}: ${String(value)}`);
  }
}

function assertNonEmpty(
  value: unknown,
  label: string,
): asserts value is string {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new Error(`${label} must be a non-empty string.`);
  }
}

function assertOptional(value: string | null, label: string): void {
  if (value !== null) assertNonEmpty(value, label);
}

function runtimeKind(value: never): string {
  return String((value as { readonly kind?: unknown }).kind);
}

function validateNext(_previous: World, next: World): World {
  assertWorldIntegrity(next);
  return next;
}
