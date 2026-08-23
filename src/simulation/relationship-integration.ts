import { recordWorldEvent } from "./world";
import {
  recordEventKnowledge,
  recordMemory,
  recordRelationshipInteraction,
} from "./records";
import { createMindProvenance, recordAppraisal } from "./mind";
import { recordLifeCommitment } from "./life";
import { makeIsoDate } from "./dates";
import type {
  AppraisalMeaning,
  EntityId,
  EventContext,
  EventType,
  EventVisibility,
  HistoricalCutoff,
  IsoDate,
  MemoryStrength,
  MindConfidence,
  RelationshipChange,
  RelationshipInteractionKind,
  RelationshipSignificance,
  TimeDemandProfile,
  World,
} from "./types";

export interface RelationshipMomentSubjectiveInput {
  readonly personId: EntityId;
  readonly rememberedSummary: string;
  readonly interpretation: string;
  readonly memoryStrength: MemoryStrength;
  readonly appraisalMeanings: readonly AppraisalMeaning[];
  readonly appraisalConfidence: MindConfidence;
}

export interface RecordRelationshipMomentInput {
  readonly stableKey: string;
  readonly personIds: readonly [EntityId, EntityId];
  readonly occurredAt: IsoDate;
  readonly eventType: EventType;
  readonly jurisdictionId: EntityId | null;
  readonly visibility: EventVisibility;
  readonly interactionKind: RelationshipInteractionKind;
  readonly change: RelationshipChange;
  readonly significance: RelationshipSignificance;
  readonly summary: string;
  readonly tags: readonly string[];
  readonly context: EventContext;
  readonly subjective: readonly RelationshipMomentSubjectiveInput[];
  readonly timeUse: {
    readonly personId: EntityId;
    readonly endsAt: IsoDate;
    readonly label: string;
    readonly timeDemand: TimeDemandProfile;
  } | null;
}

export interface RelationshipMomentResult {
  readonly world: World;
  readonly eventId: EntityId;
  readonly interactionId: EntityId;
  readonly knowledgeIds: readonly EntityId[];
  readonly memoryIds: readonly EntityId[];
  readonly appraisalIds: readonly EntityId[];
}

/**
 * Commits one consequential social moment through ordinary event, interaction,
 * knowledge, memory, appraisal, and optional time-demand writers. It owns no
 * relationship score or inactivity timer.
 */
export function recordRelationshipMoment(
  world: World,
  input: RecordRelationshipMomentInput,
): RelationshipMomentResult {
  const [firstId, secondId] = input.personIds;
  if (firstId === secondId)
    throw new Error("A relationship moment requires two people.");
  let next = recordWorldEvent(world, {
    stableKey: `${input.stableKey}:event`,
    type: input.eventType,
    occurredAt: input.occurredAt,
    recordedAt: input.occurredAt,
    jurisdictionId: input.jurisdictionId,
    involvedEntityIds: [firstId, secondId],
    participants: [
      { personId: firstId, role: "agency:participant", detail: null },
      { personId: secondId, role: "presence:participant", detail: null },
    ],
    personFactConstraints: [],
    visibility: input.visibility,
    tags: input.tags,
    summary: input.summary,
    context: input.context,
  });
  const event = next.history.events.at(-1);
  if (!event) throw new Error("Relationship moment failed to create an event.");
  next = recordRelationshipInteraction(next, {
    stableKey: `${input.stableKey}:interaction`,
    personIds: input.personIds,
    eventId: event.id,
    occurredAt: input.occurredAt,
    kind: input.interactionKind,
    change: input.change,
    significance: input.significance,
    summary: input.summary,
    tags: input.tags,
  });
  const interaction = next.history.relationshipInteractions.at(-1);
  if (!interaction)
    throw new Error("Relationship moment failed to create an interaction.");

  const knowledgeIds: EntityId[] = [];
  const memoryIds: EntityId[] = [];
  const appraisalIds: EntityId[] = [];
  for (const personId of input.personIds) {
    next = recordEventKnowledge(next, {
      stableKey: `${input.stableKey}:knowledge:${personId}`,
      personId,
      eventId: event.id,
      learnedAt: input.occurredAt,
      believedSummary: input.summary,
      accuracy: "accurate",
      confidence: "high",
      source: { kind: "direct" },
    });
    knowledgeIds.push(next.history.knowledge.at(-1)!.id);
  }

  for (const subjective of input.subjective) {
    if (!input.personIds.includes(subjective.personId)) {
      throw new Error(
        "Relationship-moment subjective history must belong to a participant.",
      );
    }
    const knowledge = next.history.knowledge.find(
      (record) =>
        record.eventId === event.id && record.personId === subjective.personId,
    );
    if (!knowledge) throw new Error("Missing relationship-moment knowledge.");
    next = recordMemory(next, {
      stableKey: `${input.stableKey}:memory:${subjective.personId}`,
      personId: subjective.personId,
      eventId: event.id,
      formedAt: input.occurredAt,
      rememberedSummary: subjective.rememberedSummary,
      interpretation: subjective.interpretation,
      strength: subjective.memoryStrength,
      relevanceTags: input.tags,
      supersedesMemoryId: null,
    });
    const memory = next.history.memories.at(-1)!;
    memoryIds.push(memory.id);
    next = recordAppraisal(next, {
      stableKey: `${input.stableKey}:appraisal:${subjective.personId}`,
      personId: subjective.personId,
      eventId: event.id,
      memoryId: memory.id,
      eventKnowledgeId: knowledge.id,
      appraisedAt: input.occurredAt,
      meanings: subjective.appraisalMeanings,
      interpretation: subjective.interpretation,
      confidence: subjective.appraisalConfidence,
      involvedPersonIds: input.personIds.filter(
        (id) => id !== subjective.personId,
      ),
      provenance: createMindProvenance("reflection", {
        sourceRefs: [
          { kind: "historical-event", eventId: event.id },
          { kind: "relationship-interaction", interactionId: interaction.id },
          { kind: "memory", memoryId: memory.id },
        ],
      }),
      supersedesAppraisalId: null,
    });
    appraisalIds.push(next.history.appraisals.at(-1)!.id);
  }

  if (input.timeUse) {
    next = recordLifeCommitment(next, {
      stableKey: `${input.stableKey}:time-use`,
      personId: input.timeUse.personId,
      startsAt: input.occurredAt,
      endsAt: input.timeUse.endsAt,
      kind: "personal:relationship-time",
      label: input.timeUse.label,
      timeDemand: input.timeUse.timeDemand,
      provenance: { kind: "simulated-event", eventId: event.id },
    });
  }

  return {
    world: next,
    eventId: event.id,
    interactionId: interaction.id,
    knowledgeIds,
    memoryIds,
    appraisalIds,
  };
}

export type RelationshipContinuity =
  "recent-contact" | "long-gap" | "reconnected" | "tension-context";

export interface RelationshipContinuityAssessment {
  readonly personIds: readonly [EntityId, EntityId];
  readonly cutoff: HistoricalCutoff;
  readonly continuity: RelationshipContinuity;
  readonly lastMeaningfulContactAt: IsoDate | null;
  readonly priorInteractionIds: readonly EntityId[];
  readonly explanation: string;
}

export function assessRelationshipContinuity(
  world: World,
  personIds: readonly [EntityId, EntityId],
  cutoff: HistoricalCutoff,
): RelationshipContinuityAssessment {
  const pair = [...personIds].sort() as [EntityId, EntityId];
  const history = world.history.relationshipInteractions.filter(
    (record) =>
      record.personIds[0] === pair[0] &&
      record.personIds[1] === pair[1] &&
      record.occurredAt <= cutoff.asOfDate &&
      record.sequence < cutoff.historySequenceExclusive &&
      record.significance !== "minor",
  );
  const latest = history.at(-1);
  const previous = history.at(-2);
  let continuity: RelationshipContinuity = "long-gap";
  let explanation =
    "No recent meaningful contact is recorded; earlier history remains intact.";
  if (
    latest?.change === "strengthened" &&
    previous !== undefined &&
    hasLongGap(previous.occurredAt, latest.occurredAt)
  ) {
    continuity = "reconnected";
    explanation = "A new reconnection follows the earlier shared history.";
  } else if (
    latest &&
    (latest.change === "strained" ||
      latest.change === "ended" ||
      latest.kind.startsWith("conflict:"))
  ) {
    continuity = "tension-context";
    explanation =
      "The latest meaningful evidence carries conflict or a missed opportunity.";
  } else if (latest && !hasLongGap(latest.occurredAt, cutoff.asOfDate)) {
    continuity = "recent-contact";
    explanation = "Meaningful contact is present in the recent history.";
  }
  return {
    personIds: pair,
    cutoff: { ...cutoff },
    continuity,
    lastMeaningfulContactAt: latest?.occurredAt ?? null,
    priorInteractionIds: history.map((record) => record.id),
    explanation,
  };
}

function hasLongGap(left: IsoDate, right: IsoDate): boolean {
  const leftYear = Number(makeIsoDate(left).slice(0, 4));
  const rightYear = Number(makeIsoDate(right).slice(0, 4));
  return rightYear - leftYear >= 2;
}
