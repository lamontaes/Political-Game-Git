import { addDays } from "./dates";
import { assertLifeHistorySourceAvailable } from "./life-sources";
import {
  createMindProvenance,
  recordAppraisal,
  recordTemporaryState,
} from "./mind";
import { recordEventKnowledge } from "./records";
import { recordWorldEvent } from "./world";
import type {
  EntityId,
  MindStrength,
  ResourceTransferOutcome,
  World,
} from "./types";

export interface RecordResourcePressureInput {
  readonly stableKey: string;
  readonly personId: EntityId;
  readonly resourceTransferOutcomeId: EntityId;
  readonly temporaryStateIntensity: MindStrength;
  readonly durationDays: number;
  readonly interpretation: string;
}

export interface ResourcePressureResult {
  readonly world: World;
  readonly eventId: EntityId;
  readonly knowledgeId: EntityId;
  readonly appraisalId: EntityId;
  readonly temporaryStateId: EntityId;
}

/**
 * Turns a concrete failed/partial major transfer into explicit subjective
 * evidence. It does not write a financial-stress field or universal score.
 */
export function recordResourcePressure(
  world: World,
  input: RecordResourcePressureInput,
): ResourcePressureResult {
  if (!Number.isSafeInteger(input.durationDays) || input.durationDays <= 0) {
    throw new Error("Resource-pressure duration must be positive whole days.");
  }
  const outcome = requireOutcome(world, input.resourceTransferOutcomeId);
  if (outcome.status === "completed") {
    throw new Error(
      "Resource pressure requires a partial, missed, or blocked outcome.",
    );
  }
  const reference = {
    family: "resource-transfer-outcome" as const,
    recordId: outcome.id,
  };
  assertLifeHistorySourceAvailable(
    world,
    input.personId,
    {
      asOfDate: outcome.occurredAt,
      historySequenceExclusive: world.history.nextSequence,
    },
    reference,
  );
  const flow = world.history.resourceFlows.find(
    (record) => record.id === outcome.resourceFlowId,
  );
  if (!flow) throw new Error("Resource pressure has a dangling flow.");
  let next = recordWorldEvent(world, {
    stableKey: `${input.stableKey}:event`,
    type: "life.resource-pressure",
    occurredAt: outcome.occurredAt,
    recordedAt: world.currentDate,
    jurisdictionId: flow.jurisdictionId,
    involvedEntityIds: [input.personId, flow.id],
    participants: [
      { personId: input.personId, role: "impact:affected", detail: null },
    ],
    personFactConstraints: [],
    visibility: "private",
    tags: ["life.resources", "life.pressure"],
    summary: `A major resource transfer was ${outcome.status}.`,
    context: {
      location: null,
      socialContext: flow.basisKind,
      pressure:
        "The unresolved material obligation constrained immediate choices.",
      choice: null,
      motivation: null,
      immediateReaction: input.interpretation,
    },
  });
  const event = next.history.events.at(-1)!;
  next = recordEventKnowledge(next, {
    stableKey: `${input.stableKey}:knowledge`,
    personId: input.personId,
    eventId: event.id,
    learnedAt: outcome.occurredAt,
    believedSummary: event.summary,
    accuracy: "accurate",
    confidence: "high",
    source: { kind: "direct" },
  });
  const knowledge = next.history.knowledge.at(-1)!;
  next = recordAppraisal(next, {
    stableKey: `${input.stableKey}:appraisal`,
    personId: input.personId,
    eventId: event.id,
    memoryId: null,
    eventKnowledgeId: knowledge.id,
    appraisedAt: outcome.occurredAt,
    meanings: [
      {
        key: "material-pressure",
        label: "Material pressure",
        valence: "negative",
        intensity: input.temporaryStateIntensity,
      },
    ],
    interpretation: input.interpretation,
    confidence: "high",
    involvedPersonIds: [],
    provenance: createMindProvenance("reflection", {
      sourceRefs: [
        { kind: "historical-event", eventId: event.id },
        { kind: "life-history", reference },
      ],
    }),
    supersedesAppraisalId: null,
  });
  const appraisal = next.history.appraisals.at(-1)!;
  next = recordTemporaryState(next, {
    stableKey: `${input.stableKey}:temporary-state`,
    personId: input.personId,
    stateKey: "life:resource-pressure",
    label: "Pressure from an unresolved material obligation",
    recordedAt: outcome.occurredAt,
    startsAt: outcome.occurredAt,
    endsAt: addDays(outcome.occurredAt, input.durationDays),
    intensity: input.temporaryStateIntensity,
    decisionTags: ["life.resources", "life.housing", "life.capacity"],
    provenance: createMindProvenance("reflection", {
      sourceRefs: [
        { kind: "life-history", reference },
        { kind: "appraisal", appraisalId: appraisal.id },
      ],
    }),
  });
  return {
    world: next,
    eventId: event.id,
    knowledgeId: knowledge.id,
    appraisalId: appraisal.id,
    temporaryStateId: next.history.temporaryStates.at(-1)!.id,
  };
}

function requireOutcome(world: World, id: EntityId): ResourceTransferOutcome {
  const outcome = world.history.resourceTransferOutcomes.find(
    (record) => record.id === id,
  );
  if (!outcome) throw new Error(`Missing resource transfer outcome: ${id}`);
  return outcome;
}
