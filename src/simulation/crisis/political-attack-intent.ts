import { evaluateDecision, recordDurableDecisionTrace } from "../decisions";
import type {
  DecisionConsideration,
  DecisionImportance,
  DecisionSourceType,
  EntityId,
  MindConfidence,
  World,
} from "../types";
import { isPersonAliveAt } from "../vitality";
import { personName } from "../people";
import { assertWorldIntegrity, recordWorldEvent } from "../world";
import { appendCrisisRecord, crisisRecordId } from "./records";
import type { AttackIntentFactorEvidence } from "./types";

export interface AttackIntentFactorInput {
  readonly explanation: string;
  readonly importance: DecisionImportance;
  readonly confidence: MindConfidence;
  readonly sourceEventIds: readonly EntityId[];
}

export interface RecordPoliticalAttackIntentInput {
  readonly stableKey: string;
  readonly actorPersonId: EntityId;
  readonly targetPersonId: EntityId;
  readonly threatEventId: EntityId;
  readonly actorStrain: AttackIntentFactorInput;
  readonly actorMeans: AttackIntentFactorInput;
  readonly targetSecurity: AttackIntentFactorInput;
  readonly targetExposure: AttackIntentFactorInput;
  readonly basis: string;
  /** Controlled actors need a deliberate confirmation before intent records. */
  readonly explicitConfirmation?: boolean;
}

export interface PoliticalAttackIntentResult {
  readonly world: World;
  readonly intentId: EntityId | null;
  readonly decisionTraceId: EntityId;
}

const FACTOR_KEYS = [
  "actor-strain",
  "actor-means",
  "target-security",
  "target-exposure",
] as const;

function earlierSourceEvents(
  world: World,
  sourceEventIds: readonly EntityId[],
  personId: EntityId,
  label: string,
): void {
  if (sourceEventIds.length === 0)
    throw new Error(`${label} needs recorded source events.`);
  for (const id of sourceEventIds) {
    const source = world.history.events.find((event) => event.id === id);
    if (
      !source ||
      source.occurredAt > world.currentDate ||
      !source.involvedEntityIds.includes(personId)
    )
      throw new Error(
        `${label} must cite an earlier event involving ${personId}: ${id}`,
      );
  }
}

function factorRecord(
  input: AttackIntentFactorInput,
): AttackIntentFactorEvidence {
  return {
    explanation: input.explanation,
    importance: input.importance,
    confidence: input.confidence,
    sourceEventIds: [...input.sourceEventIds],
  };
}

function consideration(
  stableKey: string,
  optionKey: "intend-attack" | "refrain",
  sourceType: DecisionSourceType,
  factor: AttackIntentFactorInput,
  direction: "supports" | "opposes",
): DecisionConsideration {
  return {
    stableKey,
    optionKey,
    sourceType,
    direction,
    importance: factor.importance,
    confidence: factor.confidence,
    explanation: factor.explanation,
    sourceRefs: factor.sourceEventIds.map((eventId) => ({
      kind: "historical-event",
      eventId,
    })),
  };
}

/** Evaluate and record one named person's own attack intent, or their refusal. */
export function recordPoliticalAttackIntent(
  world: World,
  input: RecordPoliticalAttackIntentInput,
): PoliticalAttackIntentResult {
  const actor = world.people[input.actorPersonId];
  const target = world.people[input.targetPersonId];
  if (!actor) throw new Error("Unknown attack-intent actor.");
  if (!target || target.id === actor.id)
    throw new Error("Attack intent needs a different, known target.");
  if (!input.basis.trim())
    throw new Error("Attack intent needs a stated basis.");
  const aliveAtCurrentDate = (personId: EntityId) =>
    isPersonAliveAt(world, personId, {
      asOfDate: world.currentDate,
      historySequenceExclusive: world.history.nextSequence,
    });
  if (!aliveAtCurrentDate(actor.id) || !aliveAtCurrentDate(target.id))
    throw new Error("Attack intent needs living people.");
  earlierSourceEvents(world, [input.threatEventId], target.id, "The threat");
  earlierSourceEvents(
    world,
    input.actorStrain.sourceEventIds,
    actor.id,
    "Actor strain",
  );
  earlierSourceEvents(
    world,
    input.actorMeans.sourceEventIds,
    actor.id,
    "Actor means",
  );
  earlierSourceEvents(
    world,
    input.targetSecurity.sourceEventIds,
    target.id,
    "Target security",
  );
  earlierSourceEvents(
    world,
    input.targetExposure.sourceEventIds,
    target.id,
    "Target exposure",
  );
  for (const [label, factor] of Object.entries({
    actorStrain: input.actorStrain,
    actorMeans: input.actorMeans,
    targetSecurity: input.targetSecurity,
    targetExposure: input.targetExposure,
  }))
    if (!factor.explanation.trim())
      throw new Error(`${label} needs a recorded explanation.`);

  const considerations = [
    consideration(
      `${input.stableKey}:${FACTOR_KEYS[0]}`,
      "intend-attack",
      `context:${FACTOR_KEYS[0]}`,
      input.actorStrain,
      "supports",
    ),
    consideration(
      `${input.stableKey}:${FACTOR_KEYS[1]}`,
      "intend-attack",
      `context:${FACTOR_KEYS[1]}`,
      input.actorMeans,
      "supports",
    ),
    consideration(
      `${input.stableKey}:${FACTOR_KEYS[2]}`,
      "refrain",
      `context:${FACTOR_KEYS[2]}`,
      input.targetSecurity,
      "supports",
    ),
    consideration(
      `${input.stableKey}:${FACTOR_KEYS[3]}`,
      "intend-attack",
      `context:${FACTOR_KEYS[3]}`,
      input.targetExposure,
      "supports",
    ),
  ];
  const isControlled =
    world.control.kind === "person" && world.control.personId === actor.id;
  if (isControlled && input.explicitConfirmation)
    considerations.push({
      stableKey: `${input.stableKey}:deliberate-confirmation`,
      optionKey: "intend-attack",
      sourceType: "context:explicit-player-confirmation",
      direction: "supports",
      importance: "decisive",
      confidence: "high",
      explanation: "The controlled person explicitly confirmed this intent.",
      sourceRefs: [],
    });

  const evaluation = evaluateDecision(world, {
    stableKey: input.stableKey,
    decisionType: "crisis.political-attack-intent",
    actorPersonId: actor.id,
    cutoff: {
      asOfDate: world.currentDate,
      historySequenceExclusive: world.history.nextSequence,
    },
    subject: {
      kind: "context:domain",
      key: "political-attack-intent",
      entityId: target.id,
    },
    options: [
      {
        key: "intend-attack",
        label: "Intend an attack",
        description: "Choose an attack after weighing the recorded factors.",
      },
      {
        key: "refrain",
        label: "Refrain",
        description: "Do not form an attack intent.",
      },
    ],
    constraints: [],
    considerations,
    perceptionIds: [],
    randomness: "none",
    retention: "durable",
  });
  let next = recordDurableDecisionTrace(world, evaluation);
  const decisionTraceId = next.history.decisionTraces.at(-1)!.id;
  if (
    evaluation.outcomeKind !== "selected" ||
    evaluation.selectedOptionKey !== "intend-attack" ||
    (isControlled && !input.explicitConfirmation)
  )
    return {
      world: next,
      intentId: null,
      decisionTraceId,
    };

  const eventKey = `crisis:attack-intent:${input.stableKey}`;
  const sourceEventIds = [
    input.threatEventId,
    ...input.actorStrain.sourceEventIds,
    ...input.actorMeans.sourceEventIds,
    ...input.targetSecurity.sourceEventIds,
    ...input.targetExposure.sourceEventIds,
  ];
  const event = recordWorldEvent(next, {
    stableKey: `${eventKey}:event`,
    type: "crisis.political-attack-intent",
    occurredAt: next.currentDate,
    recordedAt: next.currentDate,
    jurisdictionId: target.homeJurisdictionId,
    involvedEntityIds: [actor.id, target.id],
    participants: [
      { personId: actor.id, role: "agency:decision-maker", detail: null },
      { personId: target.id, role: "impact:threatened", detail: null },
    ],
    personFactConstraints: [],
    visibility: "limited",
    tags: ["crisis", "crisis.political-attack-intent"],
    summary: `${personName(actor)} formed a recorded intent to attack ${personName(target)}.`,
    context: {
      location: null,
      socialContext: null,
      pressure: null,
      choice: null,
      motivation: input.basis,
      immediateReaction: null,
    },
  });
  next = appendCrisisRecord(event, {
    kind: "political-attack-intent",
    stableKey: eventKey,
    effectiveAt: next.currentDate,
    causalParentIds: sourceEventIds,
    visibility: "limited",
    eventId: event.history.events.at(-1)!.id,
    actorPersonId: actor.id,
    targetPersonId: target.id,
    threatEventId: input.threatEventId,
    decisionTraceId,
    actorStrain: factorRecord(input.actorStrain),
    actorMeans: factorRecord(input.actorMeans),
    targetSecurity: factorRecord(input.targetSecurity),
    targetExposure: factorRecord(input.targetExposure),
    basis: input.basis,
  });
  assertWorldIntegrity(next);
  return {
    world: next,
    intentId: crisisRecordId(next, eventKey),
    decisionTraceId: evaluation.decisionId,
  };
}
