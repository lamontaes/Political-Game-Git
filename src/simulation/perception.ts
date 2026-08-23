import { factsForPerson } from "./people";
import type {
  EntityId,
  HistoricalCutoff,
  IsoDate,
  MindConfidence,
  SourceCredibility,
  World,
} from "./types";

export type SubjectivePerceptionItemKind =
  | "person-fact"
  | "memory"
  | "event-knowledge"
  | "heard-claim"
  | "relationship"
  | "proposition-exposure"
  | "subject-knowledge"
  | "appraisal"
  | "perception"
  | "temporary-state";

export interface SubjectivePerceptionItem {
  readonly kind: SubjectivePerceptionItemKind;
  readonly id: EntityId;
  readonly effectiveAt: IsoDate;
  readonly summary: string;
  readonly confidence: MindConfidence | null;
  readonly sourceCredibility: SourceCredibility | null;
}

export interface SubjectivePerceptionSnapshot {
  readonly personId: EntityId;
  readonly cutoff: HistoricalCutoff;
  readonly items: readonly SubjectivePerceptionItem[];
}

export function buildSubjectivePerception(
  world: World,
  personId: EntityId,
  cutoff: HistoricalCutoff = {
    asOfDate: world.currentDate,
    historySequenceExclusive: world.history.nextSequence,
  },
): SubjectivePerceptionSnapshot {
  const person = world.people[personId];
  if (!person) throw new Error(`Missing person: ${personId}`);
  validateCutoff(world, personId, cutoff);

  const items: SubjectivePerceptionItem[] = [];

  // Person facts do not yet carry append availability. They are safe for a
  // current cutoff; historical traces freeze any fact content they used.
  if (
    cutoff.historySequenceExclusive === world.history.nextSequence &&
    cutoff.asOfDate === world.currentDate
  ) {
    for (const fact of factsForPerson(person)) {
      if (fact.occurredAt <= cutoff.asOfDate) {
        items.push({
          kind: "person-fact",
          id: fact.id,
          effectiveAt: fact.occurredAt,
          summary: fact.summary,
          confidence: null,
          sourceCredibility: null,
        });
      }
    }
  }

  for (const memory of world.history.memories) {
    if (
      memory.personId === personId &&
      available(memory.sequence, memory.formedAt, cutoff)
    ) {
      items.push({
        kind: "memory",
        id: memory.id,
        effectiveAt: memory.formedAt,
        summary: `${memory.rememberedSummary} — ${memory.interpretation}`,
        confidence: null,
        sourceCredibility: null,
      });
    }
  }

  const accessibleClaimIds = new Set<EntityId>();
  for (const knowledge of world.history.knowledge) {
    if (
      knowledge.personId === personId &&
      available(knowledge.sequence, knowledge.learnedAt, cutoff)
    ) {
      items.push({
        kind: "event-knowledge",
        id: knowledge.id,
        effectiveAt: knowledge.learnedAt,
        summary: knowledge.believedSummary,
        confidence: knowledge.confidence,
        sourceCredibility: sourceCredibilityForKnowledge(knowledge.source.kind),
      });
      if (
        knowledge.source.kind === "told-by" &&
        knowledge.source.claimId !== null
      ) {
        accessibleClaimIds.add(knowledge.source.claimId);
      }
    }
  }

  for (const claim of world.history.claims) {
    if (
      (claim.speakerPersonId === personId ||
        accessibleClaimIds.has(claim.id)) &&
      available(claim.sequence, claim.madeAt, cutoff)
    ) {
      items.push({
        kind: "heard-claim",
        id: claim.id,
        effectiveAt: claim.madeAt,
        summary: claim.statement,
        confidence: null,
        sourceCredibility: null,
      });
    }
  }

  for (const interaction of world.history.relationshipInteractions) {
    if (
      interaction.personIds.includes(personId) &&
      available(interaction.sequence, interaction.occurredAt, cutoff)
    ) {
      items.push({
        kind: "relationship",
        id: interaction.id,
        effectiveAt: interaction.occurredAt,
        summary: interaction.summary,
        confidence: null,
        sourceCredibility: null,
      });
    }
  }

  for (const exposure of world.history.propositionExposures) {
    if (
      exposure.personId === personId &&
      available(exposure.sequence, exposure.encounteredAt, cutoff)
    ) {
      items.push({
        kind: "proposition-exposure",
        id: exposure.id,
        effectiveAt: exposure.encounteredAt,
        summary: exposure.summary,
        confidence: null,
        sourceCredibility: null,
      });
    }
  }

  for (const knowledge of world.history.subjectKnowledge) {
    if (
      knowledge.personId === personId &&
      available(knowledge.sequence, knowledge.recordedAt, cutoff)
    ) {
      items.push({
        kind: "subject-knowledge",
        id: knowledge.id,
        effectiveAt: knowledge.recordedAt,
        summary: `${knowledge.familiarity} familiarity; ${knowledge.understanding} understanding; ${knowledge.expertise} expertise; ${knowledge.practicalExperience} practical experience`,
        confidence: null,
        sourceCredibility: null,
      });
    }
  }

  for (const appraisal of world.history.appraisals) {
    if (
      appraisal.personId === personId &&
      available(appraisal.sequence, appraisal.appraisedAt, cutoff)
    ) {
      items.push({
        kind: "appraisal",
        id: appraisal.id,
        effectiveAt: appraisal.appraisedAt,
        summary: appraisal.interpretation,
        confidence: appraisal.confidence,
        sourceCredibility: null,
      });
    }
  }

  for (const perception of world.history.perceptions) {
    if (
      perception.personId === personId &&
      available(perception.sequence, perception.perceivedAt, cutoff)
    ) {
      items.push({
        kind: "perception",
        id: perception.id,
        effectiveAt: perception.perceivedAt,
        summary: perception.assertion,
        confidence: perception.confidence,
        sourceCredibility: perception.sourceCredibility,
      });
    }
  }

  for (const state of world.history.temporaryStates) {
    if (
      state.personId === personId &&
      state.sequence < cutoff.historySequenceExclusive &&
      state.recordedAt <= cutoff.asOfDate &&
      state.startsAt <= cutoff.asOfDate &&
      cutoff.asOfDate < state.endsAt
    ) {
      items.push({
        kind: "temporary-state",
        id: state.id,
        effectiveAt: state.startsAt,
        summary: `${state.label} (${state.intensity})`,
        confidence: null,
        sourceCredibility: null,
      });
    }
  }

  return {
    personId,
    cutoff: { ...cutoff },
    items: items.sort(
      (left, right) =>
        left.effectiveAt.localeCompare(right.effectiveAt) ||
        left.id.localeCompare(right.id),
    ),
  };
}

export function validateCutoff(
  world: World,
  personId: EntityId,
  cutoff: HistoricalCutoff,
): void {
  const person = world.people[personId];
  if (!person) throw new Error(`Missing person: ${personId}`);
  if (
    cutoff.asOfDate < person.birthDate ||
    cutoff.asOfDate > world.currentDate
  ) {
    throw new Error("Historical cutoff date is outside the person's life.");
  }
  if (
    !Number.isSafeInteger(cutoff.historySequenceExclusive) ||
    cutoff.historySequenceExclusive < 0 ||
    cutoff.historySequenceExclusive > world.history.nextSequence
  ) {
    throw new Error("Historical cutoff sequence is outside world history.");
  }
}

function available(
  sequence: number,
  date: IsoDate,
  cutoff: HistoricalCutoff,
): boolean {
  return sequence < cutoff.historySequenceExclusive && date <= cutoff.asOfDate;
}

function sourceCredibilityForKnowledge(
  kind: World["history"]["knowledge"][number]["source"]["kind"],
): SourceCredibility {
  switch (kind) {
    case "direct":
      return "high";
    case "told-by":
    case "public-record":
    case "media":
      return "medium";
    case "rumor":
      return "low";
  }
}
