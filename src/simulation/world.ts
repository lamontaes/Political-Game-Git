import {
  addDays,
  assertSimulationMoment,
  makeIsoDate,
  makeSimulationMoment,
  simulationMomentOnLocalDate,
} from "./dates";
import {
  assertCausalEffectIntegrity,
  assertCausalMechanismCatalogIntegrity,
  causalEffectEntityAvailableAt,
  causalEffectEntityExists,
  causalEffectHistoryRecords,
  cloneCausalMechanismCatalog,
  createSyntheticCausalMechanismCatalog,
} from "./causal-effects";
import {
  assertIncidentCatalogIntegrity,
  cloneIncidentCatalog,
  createSyntheticIncidentCatalog,
} from "./incident-catalog";
import {
  assertVitalityCatalogIntegrity,
  cloneVitalityCatalog,
  createSyntheticVitalityCatalog,
} from "./vitality-catalog";
import {
  assertIncidentIntegrity,
  incidentEntityAvailableAt,
  incidentEntityExists,
  incidentHistoryRecords,
} from "./incident-integrity";
import {
  assertEvidenceIntegrity,
  evidenceEntityAvailableAt,
  evidenceEntityExists,
  evidenceHistoryRecords,
} from "./evidence-integrity";
import {
  EMPTY_FUTURE_TRANSITION_HANDLERS,
  assertFutureTransitionIntegrity,
  futureTransitionEntityAvailableAt,
  futureTransitionEntityExists,
  futureTransitionHistoryRecords,
  resolveFutureDueItemsThrough,
} from "./future-transitions";
import {
  appendHistoricalEvent,
  createHistoryStore,
  eventsInvolving,
} from "./history";
import type { HistoricalEventInput } from "./history";
import { createStableId } from "./ids";
import {
  assertLifeHistoryIntegrity,
  lifeEntityAvailableAt,
  lifeEntityExists,
  lifeHistoryRecords,
} from "./life-integrity";
import { organizationProfileAt } from "./life-queries";
import {
  assertMindCatalogIntegrity,
  cloneMindCatalog,
  createSyntheticMindCatalog,
} from "./mind-catalog";
import { validateMindHistoryIntegrity } from "./mind-integrity";
import { materializePersonRecord, personName } from "./people";
import {
  assertPolicyCatalogIntegrity,
  clonePolicyCatalog,
  createSyntheticPolicyCatalog,
} from "./policy";
import {
  assertProductionCatalogBoundary,
  createProductionCausalMechanismCatalog,
  createProductionIncidentCatalog,
  createProductionMindCatalog,
  createProductionPolicyCatalog,
  createProductionVitalityCatalog,
  createProductionWorldMetricCatalog,
} from "./production-catalog";
import {
  assertPolicySemanticsIntegrity,
  policyHistoryRecords,
  policySemanticsEntityAvailableAt,
  policySemanticsEntityExists,
} from "./policy-semantics";
import { normalizeSeed } from "./rng";
import {
  assertResourceHousingIntegrity,
  resourceHousingEntityAvailableAt,
  resourceHousingEntityExists,
  resourceHousingHistoryRecords,
} from "./resource-integrity";
import {
  assertWorldMetricCatalogIntegrity,
  assertWorldMetricIntegrity,
  cloneWorldMetricCatalog,
  createSyntheticWorldMetricCatalog,
  worldMetricEntityAvailableAt,
  worldMetricEntityExists,
  worldMetricHistoryRecords,
} from "./world-metrics";
import {
  assertVitalityIntegrity,
  vitalityEntityAvailableAt,
  vitalityEntityExists,
  vitalityHistoryRecords,
} from "./vitality-integrity";
import {
  assertTimeWorkIntegrity,
  timeWorkEntityAvailableAt,
  timeWorkEntityExists,
  timeWorkHistoryRecords,
} from "./time-work";
import {
  assertElectionContestIntegrity,
  electionContestEntityAvailableAt,
  electionContestEntityExists,
  electionContestHistoryRecords,
} from "./election-contests";
import {
  legislationEntityAvailableAt,
  legislationEntityExists,
  legislationHistoryRecords,
} from "./legislation";
import { assertLegislationIntegrity } from "./legislation-integrity";
import { assertLegislativePoliticsIntegrity } from "./legislative-politics-integrity";
import { legislativePoliticsHistoryRecords } from "./legislative-politics";
import {
  assertOpenTaxonomyKey,
  assertDottedContentKey,
  BELIEF_FORMATION_REASON_NAMESPACES,
  EVENT_PARTICIPANT_ROLE_NAMESPACES,
  FAMILY_RELATIONSHIP_NAMESPACES,
  isOpenTaxonomyKey,
  POLITICAL_CUE_NAMESPACES,
  RELATIONSHIP_INTERACTION_NAMESPACES,
} from "./taxonomy";
import type {
  BeliefFormationContext,
  ClaimRecord,
  EntityId,
  EventContext,
  HistoricalEvent,
  IsoDate,
  Jurisdiction,
  MindCatalog,
  Person,
  PersonFact,
  PersonFactKind,
  PolicyCatalog,
  SubjectKnowledgeProvenance,
  World,
  ControlState,
  FutureTransitionHandlerRegistry,
  WorldMetricCatalog,
  CausalMechanismCatalog,
  IncidentCatalog,
  VitalityCatalog,
  SimulationMoment,
  WorldGeneratorVersion,
  WorldLineage,
} from "./types";

const PERSON_FACT_KINDS: readonly PersonFactKind[] = [
  "birth-date",
  "birthplace",
  "residence",
  "family-relationship",
  "education",
  "occupation",
];
const DATA_STATUSES = [
  "placeholder",
  "candidate",
  "approved",
  "superseded",
] as const;
const EVENT_VISIBILITIES = ["private", "limited", "public"] as const;
const FACT_PROVENANCE_METHODS = [
  "procedural-placeholder",
  "simulated-event",
  "manual",
] as const;
const EDUCATION_STATUSES = [
  "attended",
  "completed",
  "ongoing",
  "withdrew",
] as const;
const OCCUPATION_STATUSES = ["ended", "ongoing"] as const;
const MEMORY_STRENGTHS = ["faint", "moderate", "strong", "defining"] as const;
const KNOWLEDGE_ACCURACIES = [
  "accurate",
  "partial",
  "inaccurate",
  "unknown",
] as const;
const KNOWLEDGE_CONFIDENCES = ["low", "medium", "high"] as const;
const CLAIM_AUDIENCES = ["private", "limited", "public"] as const;
const CLAIM_TRUTH_RELATIONS = [
  "consistent",
  "contradicts",
  "reframes",
  "unknown",
] as const;
const RELATIONSHIP_CHANGES = [
  "formed",
  "strengthened",
  "maintained",
  "strained",
  "ended",
] as const;
const RELATIONSHIP_SIGNIFICANCES = ["minor", "meaningful", "major"] as const;
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

export interface CreateWorldInput {
  readonly seed: string;
  /**
   * Which lineage is building this world. It defaults to `fixture` so that
   * every diagnostic scaffold keeps the identity and content it already has;
   * production asks for its own lineage explicitly, and gets production
   * catalogs by default rather than validation substrate.
   */
  readonly lineage?: WorldLineage;
  readonly currentDate: IsoDate;
  readonly currentMoment?: SimulationMoment;
  readonly jurisdictions: readonly Jurisdiction[];
  readonly people: readonly Person[];
  readonly policyCatalog?: PolicyCatalog;
  readonly mindCatalog?: MindCatalog;
  readonly metricCatalog?: WorldMetricCatalog;
  readonly causalMechanismCatalog?: CausalMechanismCatalog;
  readonly incidentCatalog?: IncidentCatalog;
  readonly vitalityCatalog?: VitalityCatalog;
  readonly control?: ControlState;
}

function recordById<T extends { readonly id: EntityId }>(
  entities: readonly T[],
): Record<string, T> {
  const result: Record<string, T> = {};

  for (const entity of entities) {
    if (result[entity.id]) {
      throw new Error(`Duplicate entity ID: ${entity.id}`);
    }
    result[entity.id] = entity;
  }

  return result;
}

/** The generator stamp for each lineage; also the world-id namespace. */
const LINEAGE_GENERATOR_VERSION: Readonly<
  Record<WorldLineage, WorldGeneratorVersion>
> = {
  fixture: "demo-world-v15",
  production: "production-world-v1",
};

/**
 * A world's id is namespaced by its lineage, so a production world and a
 * fixture built from the same seed are different worlds and cannot land on
 * each other's save.
 */
export function createWorldId(
  seed: string,
  lineage: WorldLineage = "fixture",
): EntityId {
  return createStableId(
    "world",
    `${LINEAGE_GENERATOR_VERSION[lineage]}:${normalizeSeed(seed)}`,
  );
}

/** The lineage a world declares through the generator that stamped it. */
export function worldLineage(world: {
  readonly generatorVersion: WorldGeneratorVersion;
}): WorldLineage {
  return world.generatorVersion === "production-world-v1"
    ? "production"
    : "fixture";
}

export function createWorld(input: CreateWorldInput): World {
  const seed = normalizeSeed(input.seed);
  const currentDate = makeIsoDate(input.currentDate);
  const currentMoment = input.currentMoment
    ? makeSimulationMoment(input.currentMoment)
    : makeSimulationMoment({
        date: currentDate,
        minuteOfDay: 0,
        timeZone: "Etc/UTC",
        utcOffsetMinutes: 0,
      });
  if (currentMoment.date !== currentDate) {
    throw new Error(
      "Initial current date must match the simulation moment date.",
    );
  }
  const lineage: WorldLineage = input.lineage ?? "fixture";
  const worldId = createWorldId(seed, lineage);
  // The default follows the lineage rather than the other way round. That is
  // the whole point: a caller who forgets to pass catalogs gets content that
  // matches the kind of world they said they were building, so production can
  // no longer inherit validation substrate by omission.
  const production = lineage === "production";
  const policyCatalog =
    input.policyCatalog ??
    (production
      ? createProductionPolicyCatalog()
      : createSyntheticPolicyCatalog());
  const mindCatalog =
    input.mindCatalog ??
    (production ? createProductionMindCatalog() : createSyntheticMindCatalog());
  const metricCatalog =
    input.metricCatalog ??
    (production
      ? createProductionWorldMetricCatalog()
      : createSyntheticWorldMetricCatalog());
  const causalMechanismCatalog =
    input.causalMechanismCatalog ??
    (production
      ? createProductionCausalMechanismCatalog()
      : createSyntheticCausalMechanismCatalog());
  const incidentCatalog =
    input.incidentCatalog ??
    (production
      ? createProductionIncidentCatalog()
      : createSyntheticIncidentCatalog());
  const vitalityCatalog =
    input.vitalityCatalog ??
    (production
      ? createProductionVitalityCatalog()
      : createSyntheticVitalityCatalog());
  const control = input.control ?? { kind: "observer" as const };

  assertJsonSafe(input.jurisdictions, "jurisdictions");
  assertJsonSafe(input.people, "people");
  assertJsonSafe(policyCatalog, "policyCatalog");
  assertJsonSafe(mindCatalog, "mindCatalog");
  assertJsonSafe(metricCatalog, "metricCatalog");
  assertJsonSafe(causalMechanismCatalog, "causalMechanismCatalog");
  assertJsonSafe(incidentCatalog, "incidentCatalog");
  assertJsonSafe(vitalityCatalog, "vitalityCatalog");
  assertJsonSafe(control, "control");
  assertPolicyCatalogIntegrity(policyCatalog);
  assertMindCatalogIntegrity(mindCatalog);
  assertWorldMetricCatalogIntegrity(metricCatalog);
  assertCausalMechanismCatalogIntegrity(causalMechanismCatalog);
  assertIncidentCatalogIntegrity(incidentCatalog);
  assertVitalityCatalogIntegrity(vitalityCatalog);

  if (input.jurisdictions.length === 0) {
    throw new Error("A world must begin with at least one jurisdiction.");
  }

  validateInitialEntities(
    worldId,
    currentDate,
    input.jurisdictions,
    input.people,
    policyCatalog,
  );
  validateControl(control, new Set(input.people.map((person) => person.id)));
  const jurisdictions = input.jurisdictions.map(cloneJurisdiction);
  const people = input.people.map(clonePerson);

  const world: World = {
    schemaVersion: 15,
    generatorVersion: LINEAGE_GENERATOR_VERSION[lineage],
    id: worldId,
    seed,
    startedAt: currentDate,
    currentDate,
    currentMoment,
    actionSequence: 0,
    jurisdictions: recordById(jurisdictions),
    jurisdictionOrder: jurisdictions.map((jurisdiction) => jurisdiction.id),
    people: recordById(people),
    personOrder: people.map((person) => person.id),
    policyCatalog: clonePolicyCatalog(policyCatalog),
    mindCatalog: cloneMindCatalog(mindCatalog),
    metricCatalog: cloneWorldMetricCatalog(metricCatalog),
    causalMechanismCatalog: cloneCausalMechanismCatalog(causalMechanismCatalog),
    incidentCatalog: cloneIncidentCatalog(incidentCatalog),
    vitalityCatalog: cloneVitalityCatalog(vitalityCatalog),
    control: { ...control },
    history: createHistoryStore(),
  };
  assertWorldIntegrity(world);
  return world;
}

export function assertWorldIntegrity(world: World): void {
  assertJsonSafe(world, "world");
  if (
    world.schemaVersion !== 15 ||
    (world.generatorVersion !== "demo-world-v15" &&
      world.generatorVersion !== "production-world-v1")
  ) {
    throw new Error("Unsupported world schema or generator version.");
  }
  const lineage = worldLineage(world);
  if (world.id !== createWorldId(world.seed, lineage)) {
    throw new Error("World ID does not match its stable seed identity.");
  }
  // A world that says it is somebody's game must not be carrying the engine's
  // validation substrate, whoever built it and however it was loaded.
  if (lineage === "production") assertProductionCatalogBoundary(world);
  const startedAt = makeIsoDate(world.startedAt);
  const currentDate = makeIsoDate(world.currentDate);
  assertSimulationMoment(world.currentMoment);
  if (world.currentMoment.date !== currentDate) {
    throw new Error(
      "World current date must match its canonical simulation moment.",
    );
  }
  if (currentDate < startedAt) {
    throw new Error("World current date cannot predate its start date.");
  }
  if (!Number.isSafeInteger(world.actionSequence) || world.actionSequence < 0) {
    throw new Error(
      "World action sequence must be a non-negative safe integer.",
    );
  }

  const jurisdictions = orderedRecords(
    world.jurisdictions,
    world.jurisdictionOrder,
    "jurisdiction",
  );
  const people = orderedRecords(world.people, world.personOrder, "person");
  assertPolicyCatalogIntegrity(world.policyCatalog);
  assertMindCatalogIntegrity(world.mindCatalog);
  assertWorldMetricCatalogIntegrity(world.metricCatalog);
  assertCausalMechanismCatalogIntegrity(world.causalMechanismCatalog);
  assertIncidentCatalogIntegrity(world.incidentCatalog);
  assertVitalityCatalogIntegrity(world.vitalityCatalog);
  validateInitialEntities(
    world.id,
    currentDate,
    jurisdictions,
    people,
    world.policyCatalog,
  );
  validateControl(world.control, new Set(world.personOrder));
  validateHistoryIntegrity(world);
}

export function recordWorldEvent(
  world: World,
  input: HistoricalEventInput,
): World {
  assertJsonSafe(input, "historicalEvent");
  const occurredAt = makeIsoDate(input.occurredAt);
  const recordedAt = makeIsoDate(input.recordedAt);

  if (recordedAt < occurredAt) {
    throw new Error(
      "A historical event cannot be recorded before it occurred.",
    );
  }

  if (occurredAt > world.currentDate || recordedAt > world.currentDate) {
    throw new Error(
      "A historical event cannot occur or be recorded after the current world date.",
    );
  }

  if (input.involvedEntityIds.length === 0) {
    throw new Error("A historical event must involve at least one entity.");
  }

  assertNonEmptyString(input.stableKey, "Historical event stable key");
  assertDottedContentKey(input.type, "Historical event type");
  assertNonEmptyString(input.summary, "Historical event summary");
  if (!EVENT_VISIBILITIES.includes(input.visibility)) {
    throw new Error(
      `Historical event has an invalid visibility: ${String(input.visibility)}`,
    );
  }
  validateTags(input.tags, "Historical event");
  validateEventContext(world, input.context);

  if (input.jurisdictionId && !world.jurisdictions[input.jurisdictionId]) {
    throw new Error(
      `Historical event references a missing jurisdiction: ${input.jurisdictionId}`,
    );
  }

  for (const entityId of input.involvedEntityIds) {
    if (
      entityId !== world.id &&
      !world.people[entityId] &&
      !world.jurisdictions[entityId] &&
      !lifeEntityExists(world, entityId) &&
      !resourceHousingEntityExists(world, entityId) &&
      !worldMetricEntityExists(world, entityId) &&
      !causalEffectEntityExists(world, entityId) &&
      !incidentEntityExists(world, entityId) &&
      !policySemanticsEntityExists(world, entityId) &&
      !vitalityEntityExists(world, entityId) &&
      !evidenceEntityExists(world, entityId) &&
      !timeWorkEntityExists(world, entityId) &&
      !futureTransitionEntityExists(world, entityId) &&
      !electionContestEntityExists(world, entityId) &&
      !legislationEntityExists(world, entityId)
    ) {
      throw new Error(
        `Historical event references a missing entity: ${entityId}`,
      );
    }
    if (
      lifeEntityExists(world, entityId) &&
      !lifeEntityAvailableAt(
        world,
        entityId,
        occurredAt,
        world.history.nextSequence,
      )
    ) {
      throw new Error(
        `Historical event references an unavailable life entity: ${entityId}`,
      );
    }
    if (
      worldMetricEntityExists(world, entityId) &&
      !worldMetricEntityAvailableAt(
        world,
        entityId,
        occurredAt,
        world.history.nextSequence,
      )
    ) {
      throw new Error(
        `Historical event references an unavailable metric entity: ${entityId}`,
      );
    }
    if (
      causalEffectEntityExists(world, entityId) &&
      !causalEffectEntityAvailableAt(
        world,
        entityId,
        occurredAt,
        world.history.nextSequence,
      )
    ) {
      throw new Error(
        `Historical event references an unavailable causal/effect entity: ${entityId}`,
      );
    }
    if (
      incidentEntityExists(world, entityId) &&
      !incidentEntityAvailableAt(
        world,
        entityId,
        occurredAt,
        world.history.nextSequence,
      )
    ) {
      throw new Error(
        `Historical event references an unavailable incident entity: ${entityId}`,
      );
    }
    if (
      policySemanticsEntityExists(world, entityId) &&
      !policySemanticsEntityAvailableAt(
        world,
        entityId,
        occurredAt,
        world.history.nextSequence,
      )
    ) {
      throw new Error(
        `Historical event references an unavailable policy entity: ${entityId}`,
      );
    }
    if (
      vitalityEntityExists(world, entityId) &&
      !vitalityEntityAvailableAt(
        world,
        entityId,
        occurredAt,
        world.history.nextSequence,
      )
    ) {
      throw new Error(
        `Historical event references an unavailable vitality entity: ${entityId}`,
      );
    }
    if (
      evidenceEntityExists(world, entityId) &&
      !evidenceEntityAvailableAt(
        world,
        entityId,
        occurredAt,
        world.history.nextSequence,
      )
    ) {
      throw new Error(
        `Historical event references an unavailable evidence entity: ${entityId}`,
      );
    }
    if (
      timeWorkEntityExists(world, entityId) &&
      !timeWorkEntityAvailableAt(
        world,
        entityId,
        occurredAt,
        world.history.nextSequence,
      )
    ) {
      throw new Error(
        `Historical event references an unavailable schedule/work entity: ${entityId}`,
      );
    }
    if (
      futureTransitionEntityExists(world, entityId) &&
      !futureTransitionEntityAvailableAt(
        world,
        entityId,
        occurredAt,
        world.history.nextSequence,
      )
    ) {
      throw new Error(
        `Historical event references an unavailable future-transition entity: ${entityId}`,
      );
    }
    if (
      legislationEntityExists(world, entityId) &&
      !legislationEntityAvailableAt(
        world,
        entityId,
        occurredAt,
        world.history.nextSequence,
      )
    ) {
      throw new Error(
        `Historical event references an unavailable legislative entity: ${entityId}`,
      );
    }
    if (
      electionContestEntityExists(world, entityId) &&
      !electionContestEntityAvailableAt(
        world,
        entityId,
        occurredAt,
        world.history.nextSequence,
      )
    ) {
      throw new Error(
        `Historical event references an unavailable election contest entity: ${entityId}`,
      );
    }
    if (
      resourceHousingEntityExists(world, entityId) &&
      !resourceHousingEntityAvailableAt(
        world,
        entityId,
        occurredAt,
        world.history.nextSequence,
      )
    ) {
      throw new Error(
        `Historical event references an unavailable resource/housing entity: ${entityId}`,
      );
    }
    const involvedPerson = world.people[entityId];
    if (involvedPerson && occurredAt < involvedPerson.birthDate) {
      throw new Error(
        `Historical event involves a person who was not yet born: ${entityId}`,
      );
    }
  }

  const participantKeys = new Set<string>();
  for (const participant of input.participants) {
    const participantPerson = world.people[participant.personId];
    if (!participantPerson) {
      throw new Error(
        `Historical event participant is missing: ${participant.personId}`,
      );
    }
    if (occurredAt < participantPerson.birthDate) {
      throw new Error(
        `Historical event participant was not yet born: ${participant.personId}`,
      );
    }
    if (!input.involvedEntityIds.includes(participant.personId)) {
      throw new Error(
        `Historical event participant is not an involved entity: ${participant.personId}`,
      );
    }
    assertOpenTaxonomyKey(
      participant.role,
      EVENT_PARTICIPANT_ROLE_NAMESPACES,
      "Historical event participant role",
    );
    if (participant.detail !== null) {
      assertNonEmptyString(participant.detail, "Event participant detail");
    }
    const participantKey = `${participant.personId}:${participant.role}`;
    if (participantKeys.has(participantKey)) {
      throw new Error(
        `Duplicate historical event participant: ${participantKey}`,
      );
    }
    participantKeys.add(participantKey);
  }

  const constraintKeys = new Set<string>();
  for (const constraint of input.personFactConstraints) {
    const person = world.people[constraint.personId];
    if (!person) {
      throw new Error(
        `Historical fact constraint references a missing person: ${constraint.personId}`,
      );
    }
    if (!input.involvedEntityIds.includes(constraint.personId)) {
      throw new Error(
        `Historical fact constraint person is not involved in the event: ${constraint.personId}`,
      );
    }
    if (!PERSON_FACT_KINDS.includes(constraint.kind)) {
      throw new Error(
        `Historical fact constraint has an invalid kind: ${String(constraint.kind)}`,
      );
    }

    const constraintKey = `${constraint.personId}:${constraint.kind}`;
    if (constraintKeys.has(constraintKey)) {
      throw new Error(`Duplicate historical fact constraint: ${constraintKey}`);
    }
    constraintKeys.add(constraintKey);

    if (
      person.detailLevel === "materialized" &&
      person.details.generatedFacts.some(
        (fact) => fact.kind === constraint.kind,
      )
    ) {
      throw new Error(
        `Historical fact constraint conflicts with materialized person detail: ${constraintKey}`,
      );
    }
  }

  return {
    ...world,
    history: appendHistoricalEvent(world.history, world.id, {
      ...input,
      occurredAt,
      recordedAt,
    }),
  };
}

export function advanceWorld(
  world: World,
  days: number,
  transitionHandlers: FutureTransitionHandlerRegistry = EMPTY_FUTURE_TRANSITION_HANDLERS,
): World {
  if (!Number.isSafeInteger(days) || days <= 0) {
    throw new Error(
      "Time advancement must be a positive whole number of days.",
    );
  }

  assertWorldIntegrity(world);

  const actionSequence = world.actionSequence;
  const nextDate = addDays(world.currentDate, days);
  const nextMoment = simulationMomentOnLocalDate(world.currentMoment, nextDate);
  const primaryJurisdictionId = world.jurisdictionOrder[0] ?? null;
  const transitioned = resolveFutureDueItemsThrough(
    world,
    nextDate,
    transitionHandlers,
  );
  const advanced: World = {
    ...transitioned,
    currentDate: nextDate,
    currentMoment: nextMoment,
    actionSequence: actionSequence + 1,
  };

  return recordWorldEvent(advanced, {
    stableKey: `action:${actionSequence}:time-advanced:${world.currentDate}:${days}:${nextDate}`,
    type: "simulation.time-advanced",
    occurredAt: nextDate,
    recordedAt: nextDate,
    jurisdictionId: primaryJurisdictionId,
    involvedEntityIds: primaryJurisdictionId ? [primaryJurisdictionId] : [],
    participants: [],
    personFactConstraints: [],
    visibility: "public",
    tags: ["simulation.time"],
    summary: `Simulation time advanced ${days} days to ${nextDate}.`,
    context: {
      location: primaryJurisdictionId
        ? {
            jurisdictionId: primaryJurisdictionId,
            label: "Primary simulation jurisdiction",
            setting: null,
          }
        : null,
      socialContext: "Deterministic simulation clock transition.",
      pressure: null,
      choice: null,
      motivation: null,
      immediateReaction: null,
    },
  });
}

export function materializePerson(world: World, personId: EntityId): World {
  const existing = world.people[personId];

  if (!existing) {
    throw new Error(`Cannot materialize missing person: ${personId}`);
  }

  const materialized = materializePersonRecord(
    existing,
    world.seed,
    world.startedAt,
    eventsInvolving(world.history, personId),
    world.policyCatalog.subjects,
  );

  if (materialized === existing) {
    return world;
  }

  const next = {
    ...world,
    people: {
      ...world.people,
      [personId]: materialized,
    },
  };
  assertWorldIntegrity(next);
  return next;
}

export function selectPerson(
  world: World,
  personId: EntityId,
): Person | undefined {
  return world.people[personId];
}

export function selectPersonHistory(
  world: World,
  personId: EntityId,
): readonly HistoricalEvent[] {
  return eventsInvolving(world.history, personId);
}

export function resolveEntityLabel(world: World, entityId: EntityId): string {
  const person = world.people[entityId];
  if (person) {
    return personName(person);
  }

  const jurisdiction = world.jurisdictions[entityId];
  if (jurisdiction) return jurisdiction.name;
  const organization = world.history.organizations.find(
    (candidate) => candidate.id === entityId,
  );
  if (organization) {
    return organizationProfileAt(world, organization.id)?.name ?? entityId;
  }
  const household = world.history.households.find(
    (candidate) => candidate.id === entityId,
  );
  if (household) return household.label;
  const dwelling = world.history.dwellings.find(
    (candidate) => candidate.id === entityId,
  );
  if (dwelling) return dwelling.locationLabel;
  const metricDefinition = world.metricCatalog.definitions[entityId];
  if (metricDefinition) return metricDefinition.name;
  const mechanismDefinition =
    world.causalMechanismCatalog.definitions[entityId];
  if (mechanismDefinition) return mechanismDefinition.name;
  const causalProcess = world.history.causalProcesses.find(
    (candidate) => candidate.id === entityId,
  );
  if (causalProcess) return `Causal process ${causalProcess.kind}`;
  const effectActivation = world.history.effectActivations.find(
    (candidate) => candidate.id === entityId,
  );
  if (effectActivation) {
    return `${world.metricCatalog.definitions[effectActivation.targetMetricId]?.name ?? "Metric"} effect`;
  }
  const metricObservation = world.history.metricObservations.find(
    (candidate) => candidate.id === entityId,
  );
  if (metricObservation) {
    return `${metricObservation.sourceLabel} observation`;
  }
  const metricState = world.history.metricStates.find(
    (candidate) => candidate.id === entityId,
  );
  if (metricState) {
    return `${world.metricCatalog.definitions[metricState.metricId]?.name ?? "Metric"} state`;
  }
  const dueItem = world.history.futureDueItems.find(
    (candidate) => candidate.id === entityId,
  );
  if (dueItem) return `Due transition ${dueItem.transitionKey}`;
  const policyAlternative = world.history.policyAlternatives.find(
    (candidate) => candidate.id === entityId,
  );
  if (policyAlternative) return policyAlternative.title;
  const policyBaseline = world.history.policyBaselines.find(
    (candidate) => candidate.id === entityId,
  );
  if (policyBaseline) return `Policy baseline ${policyBaseline.seriesKey}`;
  const policyOperation = world.history.policyOperations.find(
    (candidate) => candidate.id === entityId,
  );
  if (policyOperation)
    return `Policy operation ${policyOperation.operation.kind}`;
  const policyProfile = world.history.policyImplementationProfiles.find(
    (candidate) => candidate.id === entityId,
  );
  if (policyProfile) return "Policy implementation profile";
  const policyEstimate = world.history.policyEstimates.find(
    (candidate) => candidate.id === entityId,
  );
  if (policyEstimate) return `Policy estimate ${policyEstimate.seriesKey}`;
  const policyRealization = world.history.policyRealizations.find(
    (candidate) => candidate.id === entityId,
  );
  if (policyRealization)
    return `Policy realization ${policyRealization.status}`;
  return (
    world.policyCatalog.domains[entityId]?.name ??
    world.policyCatalog.issues[entityId]?.name ??
    world.policyCatalog.propositions[entityId]?.name ??
    world.policyCatalog.subjects[entityId]?.name ??
    world.policyCatalog.principles[entityId]?.name ??
    world.mindCatalog.tendencies[entityId]?.name ??
    world.mindCatalog.values[entityId]?.name ??
    entityId
  );
}

function validateControl(
  control: ControlState,
  personIds: ReadonlySet<EntityId>,
): void {
  switch (control.kind) {
    case "observer":
      return;
    case "person":
      if (!personIds.has(control.personId)) {
        throw new Error(
          `Control state references a missing person: ${control.personId}`,
        );
      }
      return;
    default:
      throw new Error(`Invalid control-state kind: ${runtimeKind(control)}`);
  }
}

function validateInitialEntities(
  worldId: EntityId,
  currentDate: IsoDate,
  jurisdictions: readonly Jurisdiction[],
  people: readonly Person[],
  policyCatalog: PolicyCatalog,
): void {
  const entityIds = new Set<EntityId>([worldId]);
  const jurisdictionIds = new Set(
    jurisdictions.map((jurisdiction) => jurisdiction.id),
  );
  const personIds = new Set(people.map((person) => person.id));

  for (const jurisdiction of jurisdictions) {
    assertUniqueId(entityIds, jurisdiction.id);
    assertNonEmptyString(jurisdiction.slug, "Jurisdiction slug");
    assertNonEmptyString(jurisdiction.name, "Jurisdiction name");
    assertNonEmptyString(jurisdiction.kind, "Jurisdiction kind");
    if (jurisdiction.parentName !== null) {
      assertNonEmptyString(jurisdiction.parentName, "Jurisdiction parent name");
    }
    if (jurisdiction.provenance.jurisdiction !== jurisdiction.id) {
      throw new Error(
        `Jurisdiction provenance does not match its entity ID: ${jurisdiction.id}`,
      );
    }
    if (!DATA_STATUSES.includes(jurisdiction.provenance.status)) {
      throw new Error(
        `Jurisdiction provenance has an invalid status: ${String(jurisdiction.provenance.status)}`,
      );
    }
    if (jurisdiction.provenance.source !== null) {
      assertNonEmptyString(
        jurisdiction.provenance.source,
        "Jurisdiction provenance source",
      );
    }
    if (jurisdiction.provenance.asOf) {
      makeIsoDate(jurisdiction.provenance.asOf);
    }
  }

  for (const person of people) {
    assertUniqueId(entityIds, person.id);
    assertNonEmptyString(person.generationKey, "Person generation key");
    if (
      person.id !==
      createStableId("person", `${worldId}:${person.generationKey}`)
    ) {
      throw new Error(
        `Person ID does not match its stable generation key: ${person.id}`,
      );
    }
    assertNonEmptyString(person.givenName, "Person given name");
    assertNonEmptyString(person.familyName, "Person family name");
    const birthDate = makeIsoDate(person.birthDate);
    if (birthDate > currentDate) {
      throw new Error(
        `Person birth date is after the world start date: ${person.id}`,
      );
    }
    if (!jurisdictionIds.has(person.homeJurisdictionId)) {
      throw new Error(
        `Person references a missing home jurisdiction: ${person.id}`,
      );
    }
    if (person.generatorVersion !== undefined) {
      assertNonEmptyString(person.generatorVersion, "Person generator version");
    }
    if (person.corpusVersion !== undefined) {
      assertNonEmptyString(person.corpusVersion, "Person corpus version");
    }
    if (person.appearance !== undefined) {
      assertNonEmptyString(person.appearance.seed, "Person appearance seed");
      assertNonEmptyString(
        person.appearance.recipeVersion,
        "Person appearance recipe version",
      );
      const catalogGeneration = person.appearance.catalogGeneration;
      if (
        catalogGeneration !== undefined &&
        (!Number.isSafeInteger(catalogGeneration) || catalogGeneration < 1)
      ) {
        throw new Error(
          `Person appearance catalog generation must be a positive integer for ${person.id}.`,
        );
      }
    }

    const runtimeDetailLevel = (person as { readonly detailLevel?: unknown })
      .detailLevel;
    if (
      runtimeDetailLevel !== "lightweight" &&
      runtimeDetailLevel !== "materialized"
    ) {
      throw new Error(
        `Person has an invalid detail level: ${String(runtimeDetailLevel)}`,
      );
    }

    const runtimeDetails = (person as Person & { readonly details?: unknown })
      .details;
    if (person.detailLevel === "lightweight" && runtimeDetails !== undefined) {
      throw new Error(
        `Lightweight person unexpectedly contains materialized details: ${person.id}`,
      );
    }
    if (person.detailLevel === "materialized" && runtimeDetails === undefined) {
      throw new Error(`Materialized person is missing details: ${person.id}`);
    }

    const facts = [
      ...person.establishedFacts,
      ...(person.detailLevel === "materialized"
        ? person.details.generatedFacts
        : []),
    ];
    const factStableKeys = new Set<string>();
    let birthDateFactCount = 0;
    let birthplaceFactCount = 0;
    let currentResidenceCount = 0;

    for (const fact of facts) {
      assertUniqueId(entityIds, fact.id);
      assertNonEmptyString(fact.stableKey, "Person fact stable key");
      if (
        fact.id !== createStableId("fact", `${person.id}:${fact.stableKey}`)
      ) {
        throw new Error(
          `Person fact ID does not match its stable key: ${fact.id}`,
        );
      }
      if (factStableKeys.has(fact.stableKey)) {
        throw new Error(
          `Duplicate person fact stable key for ${person.id}: ${fact.stableKey}`,
        );
      }
      factStableKeys.add(fact.stableKey);
      if (!PERSON_FACT_KINDS.includes(fact.kind)) {
        throw new Error(
          `Person fact has an invalid kind: ${String(fact.kind)}`,
        );
      }
      const factDate = makeIsoDate(fact.occurredAt);
      assertNonEmptyString(fact.summary, "Person fact summary");
      if (factDate < birthDate) {
        throw new Error(`Person fact predates its person: ${fact.id}`);
      }
      if (factDate > currentDate) {
        throw new Error(
          `Person fact occurs after the world start date: ${fact.id}`,
        );
      }
      if (fact.jurisdictionId && !jurisdictionIds.has(fact.jurisdictionId)) {
        throw new Error(
          `Person fact references a missing jurisdiction: ${fact.id}`,
        );
      }
      if (fact.kind === "birth-date" && factDate !== birthDate) {
        throw new Error(
          `Birth-date fact contradicts its person's birth date: ${fact.id}`,
        );
      }
      validateFactProvenance(fact);

      switch (fact.kind) {
        case "birth-date":
          birthDateFactCount += 1;
          break;
        case "birthplace":
          birthplaceFactCount += 1;
          if (factDate !== birthDate) {
            throw new Error(
              `Birthplace fact must occur on the birth date: ${fact.id}`,
            );
          }
          break;
        case "residence":
          validateEndedAt(fact.id, factDate, fact.endedAt, currentDate);
          if (fact.endedAt === null) {
            currentResidenceCount += 1;
            if (fact.jurisdictionId !== person.homeJurisdictionId) {
              throw new Error(
                `Current residence fact contradicts its person's home: ${fact.id}`,
              );
            }
          }
          break;
        case "family-relationship":
          validateEndedAt(fact.id, factDate, fact.endedAt, currentDate);
          if (!personIds.has(fact.relatedPersonId)) {
            throw new Error(
              `Family fact references a missing person: ${fact.id}`,
            );
          }
          if (fact.relatedPersonId === person.id) {
            throw new Error(
              `A person cannot be their own family relation: ${fact.id}`,
            );
          }
          assertOpenTaxonomyKey(
            fact.relationship,
            FAMILY_RELATIONSHIP_NAMESPACES,
            "Family relationship",
          );
          break;
        case "education":
          assertNonEmptyString(fact.institution, "Education institution");
          validateOptionalString(fact.field, "Education field");
          validateOptionalString(fact.credential, "Education credential");
          validateEndedAt(fact.id, factDate, fact.endedAt, currentDate);
          if (!EDUCATION_STATUSES.includes(fact.status)) {
            throw new Error(`Education fact has an invalid status: ${fact.id}`);
          }
          if ((fact.status === "ongoing") !== (fact.endedAt === null)) {
            throw new Error(
              `Education status and end date disagree: ${fact.id}`,
            );
          }
          validateSubjectIds(fact.id, fact.subjectIds, policyCatalog);
          break;
        case "occupation":
          assertNonEmptyString(fact.employer, "Occupation employer");
          assertNonEmptyString(fact.title, "Occupation title");
          validateEndedAt(fact.id, factDate, fact.endedAt, currentDate);
          if (!OCCUPATION_STATUSES.includes(fact.status)) {
            throw new Error(
              `Occupation fact has an invalid status: ${fact.id}`,
            );
          }
          if ((fact.status === "ongoing") !== (fact.endedAt === null)) {
            throw new Error(
              `Occupation status and end date disagree: ${fact.id}`,
            );
          }
          validateSubjectIds(fact.id, fact.subjectIds, policyCatalog);
          break;
      }
    }

    if (birthDateFactCount !== 1) {
      throw new Error(
        `Person must have exactly one birth-date fact: ${person.id}`,
      );
    }
    if (birthplaceFactCount !== 1) {
      throw new Error(
        `Person must have exactly one birthplace fact: ${person.id}`,
      );
    }
    if (currentResidenceCount !== 1) {
      throw new Error(
        `Person must have exactly one current residence fact: ${person.id}`,
      );
    }

    if (person.detailLevel === "materialized") {
      if (person.details.generatorVersion !== "person-materialization-v4") {
        throw new Error(
          `Person details use an unsupported generator: ${person.id}`,
        );
      }
    }
  }
}

function validateSubjectIds(
  factId: EntityId,
  subjectIds: readonly EntityId[],
  policyCatalog: PolicyCatalog,
): void {
  if (new Set(subjectIds).size !== subjectIds.length) {
    throw new Error(
      `Person fact contains duplicate knowledge subjects: ${factId}`,
    );
  }
  for (const subjectId of subjectIds) {
    if (!policyCatalog.subjects[subjectId]) {
      throw new Error(
        `Person fact references a missing knowledge subject: ${factId}`,
      );
    }
  }
}

function validateFactProvenance(fact: PersonFact): void {
  if (!FACT_PROVENANCE_METHODS.includes(fact.provenance.method)) {
    throw new Error(`Person fact has invalid provenance: ${fact.id}`);
  }
  validateOptionalString(fact.provenance.note, "Person fact provenance note");
  if (
    fact.provenance.method === "simulated-event" &&
    fact.provenance.sourceEventId === null
  ) {
    throw new Error(
      `Simulated-event fact is missing its source event: ${fact.id}`,
    );
  }
  if (
    fact.provenance.method !== "simulated-event" &&
    fact.provenance.sourceEventId !== null
  ) {
    throw new Error(
      `Non-event fact unexpectedly references an event: ${fact.id}`,
    );
  }
}

function validateEndedAt(
  factId: EntityId,
  occurredAt: IsoDate,
  endedAt: IsoDate | null,
  currentDate: IsoDate,
): void {
  if (endedAt === null) {
    return;
  }
  const parsed = makeIsoDate(endedAt);
  if (parsed < occurredAt) {
    throw new Error(`Person fact ends before it begins: ${factId}`);
  }
  if (parsed > currentDate) {
    throw new Error(`Person fact ends after the world start date: ${factId}`);
  }
}

function validateOptionalString(value: string | null, label: string): void {
  if (value !== null) {
    assertNonEmptyString(value, label);
  }
}

function assertUniqueId(ids: Set<EntityId>, id: EntityId): void {
  assertNonEmptyString(id, "Entity ID");
  if (ids.has(id)) {
    throw new Error(`Duplicate entity ID: ${id}`);
  }
  ids.add(id);
}

function orderedRecords<T extends { readonly id: EntityId }>(
  records: Readonly<Record<string, T>>,
  order: readonly EntityId[],
  label: string,
): readonly T[] {
  if (new Set(order).size !== order.length) {
    throw new Error(`World ${label} order contains duplicate IDs.`);
  }
  const recordIds = Object.keys(records).sort();
  const orderedIds = [...order].sort();
  if (JSON.stringify(recordIds) !== JSON.stringify(orderedIds)) {
    throw new Error(`World ${label} order and record keys disagree.`);
  }
  return order.map((id) => {
    const record = records[id];
    if (!record || record.id !== id) {
      throw new Error(`World ${label} record is missing or miskeyed: ${id}`);
    }
    return record;
  });
}

function validateHistoryIntegrity(world: World): void {
  const history = world.history;
  if (!Number.isSafeInteger(history.nextSequence) || history.nextSequence < 0) {
    throw new Error(
      "History next sequence must be a non-negative safe integer.",
    );
  }
  const records = [
    ...lifeHistoryRecords(world),
    ...resourceHousingHistoryRecords(world),
    ...worldMetricHistoryRecords(world),
    ...causalEffectHistoryRecords(world),
    ...policyHistoryRecords(world),
    ...incidentHistoryRecords(world),
    ...vitalityHistoryRecords(world),
    ...evidenceHistoryRecords(world),
    ...timeWorkHistoryRecords(world),
    ...electionContestHistoryRecords(world),
    ...legislationHistoryRecords(world),
    ...legislativePoliticsHistoryRecords(world),
    ...futureTransitionHistoryRecords(world),
    ...history.events,
    ...history.memories,
    ...history.knowledge,
    ...history.claims,
    ...history.relationshipInteractions,
    ...history.propositionExposures,
    ...history.privateBeliefs,
    ...history.publicPositions,
    ...history.campaignCommitments,
    ...history.principles,
    ...history.subjectKnowledge,
    ...history.personalityTendencies,
    ...history.personalValues,
    ...history.goalStates,
    ...history.appraisals,
    ...history.perceptions,
    ...history.temporaryStates,
    ...history.decisionTraces,
  ];
  const sequences = records
    .map((record) => record.sequence)
    .sort((a, b) => a - b);
  if (
    history.nextSequence !== records.length ||
    sequences.some((sequence, index) => sequence !== index)
  ) {
    throw new Error("History sequence is not contiguous and append-oriented.");
  }
  assertSequenceOrdered(history.events, "event");
  assertSequenceOrdered(history.memories, "memory");
  assertSequenceOrdered(history.knowledge, "knowledge");
  assertSequenceOrdered(history.claims, "claim");
  assertSequenceOrdered(history.relationshipInteractions, "relationship");
  assertSequenceOrdered(history.propositionExposures, "proposition exposure");
  assertSequenceOrdered(history.privateBeliefs, "private belief");
  assertSequenceOrdered(history.publicPositions, "public position");
  assertSequenceOrdered(history.campaignCommitments, "campaign commitment");
  assertSequenceOrdered(history.principles, "principle record");
  assertSequenceOrdered(history.subjectKnowledge, "subject knowledge");
  assertSequenceOrdered(history.personalityTendencies, "personality tendency");
  assertSequenceOrdered(history.personalValues, "personal value");
  assertSequenceOrdered(history.goalStates, "goal state");
  assertSequenceOrdered(history.appraisals, "appraisal");
  assertSequenceOrdered(history.perceptions, "perception");
  assertSequenceOrdered(history.temporaryStates, "temporary state");
  assertSequenceOrdered(history.decisionTraces, "decision trace");
  assertSequenceOrdered(history.electionContests ?? [], "election contest");
  assertSequenceOrdered(
    history.electionContestResults ?? [],
    "election contest result",
  );
  assertSequenceOrdered(
    history.legislativeMeasures ?? [],
    "legislative measure",
  );
  assertSequenceOrdered(history.legislativeActions ?? [], "legislative action");
  assertSequenceOrdered(history.committeeReferrals ?? [], "committee referral");
  assertSequenceOrdered(history.committeeActions ?? [], "committee action");
  assertSequenceOrdered(history.legislativeAmendments ?? [], "amendment");
  assertSequenceOrdered(
    history.legislativeProvisions ?? [],
    "legislative provision",
  );
  assertSequenceOrdered(
    history.legislativeCommitments ?? [],
    "legislative commitment",
  );
  assertSequenceOrdered(
    history.legislativeNegotiations ?? [],
    "legislative negotiation",
  );
  assertSequenceOrdered(history.legislativeVotes ?? [], "legislative vote");
  assertSequenceOrdered(
    history.executiveDispositions ?? [],
    "executive disposition",
  );
  assertSequenceOrdered(history.legislativeEnactments ?? [], "enactment");
  const ids = new Set<EntityId>([
    world.id,
    ...world.jurisdictionOrder,
    ...world.personOrder,
    ...world.personOrder.flatMap((personId) => {
      const person = world.people[personId];
      if (!person) return [];
      return [
        ...person.establishedFacts.map((fact) => fact.id),
        ...(person.detailLevel === "materialized"
          ? person.details.generatedFacts.map((fact) => fact.id)
          : []),
      ];
    }),
  ]);
  assertLifeHistoryIntegrity(world, ids);
  assertResourceHousingIntegrity(world, ids);
  assertWorldMetricIntegrity(world, ids);
  assertCausalEffectIntegrity(world, ids);
  assertPolicySemanticsIntegrity(world, ids);
  assertIncidentIntegrity(world, ids);
  assertVitalityIntegrity(world, ids);
  assertEvidenceIntegrity(world, ids);
  assertTimeWorkIntegrity(world, ids);
  assertElectionContestIntegrity(world, ids);
  assertLegislationIntegrity(world, ids);
  assertLegislativePoliticsIntegrity(world, ids);
  assertFutureTransitionIntegrity(world, ids);
  assertUniqueStableKeys(history.events, "event");
  assertUniqueStableKeys(history.memories, "memory");
  assertUniqueStableKeys(history.knowledge, "knowledge");
  assertUniqueStableKeys(history.claims, "claim");
  assertUniqueStableKeys(history.relationshipInteractions, "relationship");
  assertUniqueStableKeys(history.propositionExposures, "proposition exposure");
  assertUniqueStableKeys(history.privateBeliefs, "private belief");
  assertUniqueStableKeys(history.publicPositions, "public position");
  assertUniqueStableKeys(history.campaignCommitments, "campaign commitment");
  assertUniqueStableKeys(history.electionContests ?? [], "election contest");
  assertUniqueStableKeys(
    history.electionContestResults ?? [],
    "election contest result",
  );
  assertUniqueStableKeys(
    history.legislativeMeasures ?? [],
    "legislative measure",
  );
  assertUniqueStableKeys(
    history.legislativeActions ?? [],
    "legislative action",
  );
  assertUniqueStableKeys(
    history.committeeReferrals ?? [],
    "committee referral",
  );
  assertUniqueStableKeys(history.committeeActions ?? [], "committee action");
  assertUniqueStableKeys(history.legislativeAmendments ?? [], "amendment");
  assertUniqueStableKeys(
    history.legislativeProvisions ?? [],
    "legislative provision",
  );
  assertUniqueStableKeys(
    history.legislativeCommitments ?? [],
    "legislative commitment",
  );
  assertUniqueStableKeys(
    history.legislativeNegotiations ?? [],
    "legislative negotiation",
  );
  assertUniqueStableKeys(history.legislativeVotes ?? [], "legislative vote");
  assertUniqueStableKeys(
    history.executiveDispositions ?? [],
    "executive disposition",
  );
  assertUniqueStableKeys(history.legislativeEnactments ?? [], "enactment");
  assertUniqueStableKeys(history.principles, "principle record");
  assertUniqueStableKeys(history.subjectKnowledge, "subject knowledge");

  const eventIds = new Set(history.events.map((event) => event.id));
  const claimIds = new Set(history.claims.map((claim) => claim.id));
  const memoryIds = new Set(history.memories.map((memory) => memory.id));
  const exposureIds = new Set(
    history.propositionExposures.map((exposure) => exposure.id),
  );
  const personIds = new Set(world.personOrder);
  const factById = new Map<
    EntityId,
    { readonly personId: EntityId; readonly fact: PersonFact }
  >();
  for (const personId of world.personOrder) {
    const person = world.people[personId];
    if (!person) continue;
    for (const fact of [
      ...person.establishedFacts,
      ...(person.detailLevel === "materialized"
        ? person.details.generatedFacts
        : []),
    ]) {
      factById.set(fact.id, { personId, fact });
    }
  }
  const eventById = new Map(history.events.map((event) => [event.id, event]));
  const claimById = new Map(history.claims.map((claim) => [claim.id, claim]));
  const memoryById = new Map(
    history.memories.map((memory) => [memory.id, memory]),
  );
  for (const event of history.events) {
    assertHistoryIdentity(ids, world, event, "event");
    makeIsoDate(event.occurredAt);
    makeIsoDate(event.recordedAt);
    if (
      event.occurredAt > event.recordedAt ||
      event.recordedAt > world.currentDate
    ) {
      throw new Error(`Historical event has invalid chronology: ${event.id}`);
    }
    assertDottedContentKey(event.type, "Historical event type");
    assertNonEmptyString(event.summary, "Historical event summary");
    if (!EVENT_VISIBILITIES.includes(event.visibility)) {
      throw new Error(`Historical event has invalid visibility: ${event.id}`);
    }
    validateTags(event.tags, "Historical event");
    validateEventContext(world, event.context);
    if (
      event.jurisdictionId !== null &&
      !world.jurisdictions[event.jurisdictionId]
    ) {
      throw new Error(
        `Historical event references a missing jurisdiction: ${event.id}`,
      );
    }
    for (const involvedId of event.involvedEntityIds) {
      if (
        involvedId !== world.id &&
        !world.people[involvedId] &&
        !world.jurisdictions[involvedId] &&
        !lifeEntityExists(world, involvedId) &&
        !resourceHousingEntityExists(world, involvedId) &&
        !worldMetricEntityExists(world, involvedId) &&
        !causalEffectEntityExists(world, involvedId) &&
        !incidentEntityExists(world, involvedId) &&
        !policySemanticsEntityExists(world, involvedId) &&
        !vitalityEntityExists(world, involvedId) &&
        !evidenceEntityExists(world, involvedId) &&
        !timeWorkEntityExists(world, involvedId) &&
        !futureTransitionEntityExists(world, involvedId) &&
        !electionContestEntityExists(world, involvedId) &&
        !legislationEntityExists(world, involvedId)
      ) {
        throw new Error(
          `Historical event references a missing involved entity: ${event.id}`,
        );
      }
      if (
        resourceHousingEntityExists(world, involvedId) &&
        !resourceHousingEntityAvailableAt(
          world,
          involvedId,
          event.occurredAt,
          event.sequence,
        )
      ) {
        throw new Error(
          `Historical event references an unavailable resource/housing entity: ${event.id}`,
        );
      }
      if (
        worldMetricEntityExists(world, involvedId) &&
        !worldMetricEntityAvailableAt(
          world,
          involvedId,
          event.occurredAt,
          event.sequence,
        )
      ) {
        throw new Error(
          `Historical event references an unavailable metric entity: ${event.id}`,
        );
      }
      if (
        causalEffectEntityExists(world, involvedId) &&
        !causalEffectEntityAvailableAt(
          world,
          involvedId,
          event.occurredAt,
          event.sequence,
        )
      ) {
        throw new Error(
          `Historical event references an unavailable causal/effect entity: ${event.id}`,
        );
      }
      if (
        incidentEntityExists(world, involvedId) &&
        !incidentEntityAvailableAt(
          world,
          involvedId,
          event.occurredAt,
          event.sequence,
        )
      ) {
        throw new Error(
          `Historical event references an unavailable incident entity: ${event.id}`,
        );
      }
      if (
        policySemanticsEntityExists(world, involvedId) &&
        !policySemanticsEntityAvailableAt(
          world,
          involvedId,
          event.occurredAt,
          event.sequence,
        )
      ) {
        throw new Error(
          `Historical event references an unavailable policy entity: ${event.id}`,
        );
      }
      if (
        vitalityEntityExists(world, involvedId) &&
        !vitalityEntityAvailableAt(
          world,
          involvedId,
          event.occurredAt,
          event.sequence,
        )
      ) {
        throw new Error(
          `Historical event references an unavailable vitality entity: ${event.id}`,
        );
      }
      if (
        evidenceEntityExists(world, involvedId) &&
        !evidenceEntityAvailableAt(
          world,
          involvedId,
          event.occurredAt,
          event.sequence,
        )
      ) {
        throw new Error(
          `Historical event references an unavailable evidence entity: ${event.id}`,
        );
      }
      if (
        timeWorkEntityExists(world, involvedId) &&
        !timeWorkEntityAvailableAt(
          world,
          involvedId,
          event.occurredAt,
          event.sequence,
        )
      ) {
        throw new Error(
          `Historical event references an unavailable schedule/work entity: ${event.id}`,
        );
      }
      if (
        futureTransitionEntityExists(world, involvedId) &&
        !futureTransitionEntityAvailableAt(
          world,
          involvedId,
          event.occurredAt,
          event.sequence,
        )
      ) {
        throw new Error(
          `Historical event references an unavailable future-transition entity: ${event.id}`,
        );
      }
      if (
        legislationEntityExists(world, involvedId) &&
        !legislationEntityAvailableAt(
          world,
          involvedId,
          event.occurredAt,
          event.sequence,
        )
      ) {
        throw new Error(
          `Historical event references an unavailable legislative entity: ${event.id}`,
        );
      }
      if (
        electionContestEntityExists(world, involvedId) &&
        !electionContestEntityAvailableAt(
          world,
          involvedId,
          event.occurredAt,
          event.sequence,
        )
      ) {
        throw new Error(
          `Historical event references an unavailable election contest entity: ${event.id}`,
        );
      }
      if (
        lifeEntityExists(world, involvedId) &&
        !lifeEntityAvailableAt(
          world,
          involvedId,
          event.occurredAt,
          event.sequence,
        )
      ) {
        throw new Error(
          `Historical event references an unavailable life entity: ${event.id}`,
        );
      }
      const involvedPerson = world.people[involvedId];
      if (involvedPerson && event.occurredAt < involvedPerson.birthDate) {
        throw new Error(
          `Historical event involves a person before birth: ${event.id}`,
        );
      }
    }
    const participantKeys = new Set<string>();
    for (const participant of event.participants) {
      const person = world.people[participant.personId];
      if (!person || !event.involvedEntityIds.includes(participant.personId)) {
        throw new Error(
          `Historical event contains an invalid participant: ${event.id}`,
        );
      }
      if (
        !isOpenTaxonomyKey(
          participant.role,
          EVENT_PARTICIPANT_ROLE_NAMESPACES,
        ) ||
        event.occurredAt < person.birthDate
      ) {
        throw new Error(
          `Historical event contains an impossible participant: ${event.id}`,
        );
      }
      validateOptionalString(participant.detail, "Event participant detail");
      const participantKey = `${participant.personId}:${participant.role}`;
      if (participantKeys.has(participantKey)) {
        throw new Error(
          `Historical event contains a duplicate participant: ${event.id}`,
        );
      }
      participantKeys.add(participantKey);
    }
    for (const constraint of event.personFactConstraints) {
      if (
        !personIds.has(constraint.personId) ||
        !event.involvedEntityIds.includes(constraint.personId) ||
        !PERSON_FACT_KINDS.includes(constraint.kind)
      ) {
        throw new Error(
          `Historical event has an invalid biography constraint: ${event.id}`,
        );
      }
    }
  }
  for (const person of world.personOrder.map((id) => world.people[id])) {
    if (!person) continue;
    for (const fact of [
      ...person.establishedFacts,
      ...(person.detailLevel === "materialized"
        ? person.details.generatedFacts
        : []),
    ]) {
      if (
        fact.provenance.sourceEventId !== null &&
        !eventIds.has(fact.provenance.sourceEventId)
      ) {
        throw new Error(
          `Person fact references a missing source event: ${fact.id}`,
        );
      }
    }
  }
  for (const memory of history.memories) {
    assertHistoryIdentity(ids, world, memory, "memory");
    if (!personIds.has(memory.personId) || !eventIds.has(memory.eventId)) {
      throw new Error(
        `Memory references a missing person or event: ${memory.id}`,
      );
    }
    if (
      memory.supersedesMemoryId !== null &&
      !memoryIds.has(memory.supersedesMemoryId)
    ) {
      throw new Error(`Memory references a missing prior memory: ${memory.id}`);
    }
    const event = eventById.get(memory.eventId);
    const person = world.people[memory.personId];
    const prior =
      memory.supersedesMemoryId === null
        ? undefined
        : memoryById.get(memory.supersedesMemoryId);
    if (
      !event ||
      !person ||
      makeIsoDate(memory.formedAt) < event.occurredAt ||
      event.sequence >= memory.sequence ||
      memory.formedAt < person.birthDate ||
      memory.formedAt > world.currentDate ||
      (prior &&
        (prior.sequence >= memory.sequence ||
          prior.personId !== memory.personId ||
          prior.eventId !== memory.eventId ||
          prior.formedAt > memory.formedAt))
    ) {
      throw new Error(
        `Memory has invalid chronology or supersession: ${memory.id}`,
      );
    }
    const hasEventAccess =
      event.involvedEntityIds.includes(memory.personId) ||
      history.knowledge.some(
        (knowledge) =>
          knowledge.personId === memory.personId &&
          knowledge.eventId === memory.eventId &&
          knowledge.sequence < memory.sequence &&
          knowledge.learnedAt <= memory.formedAt,
      );
    if (!hasEventAccess) {
      throw new Error(
        `Memory lacks direct involvement or prior event knowledge: ${memory.id}`,
      );
    }
    assertMember(MEMORY_STRENGTHS, memory.strength, "memory strength");
    assertNonEmptyString(memory.rememberedSummary, "Remembered summary");
    assertNonEmptyString(memory.interpretation, "Memory interpretation");
    validateTags(memory.relevanceTags, "Memory relevance");
  }
  for (const knowledge of history.knowledge) {
    assertHistoryIdentity(ids, world, knowledge, "knowledge");
    if (
      !personIds.has(knowledge.personId) ||
      !eventIds.has(knowledge.eventId)
    ) {
      throw new Error(
        `Knowledge references a missing person or event: ${knowledge.id}`,
      );
    }
    const event = eventById.get(knowledge.eventId);
    const person = world.people[knowledge.personId];
    if (
      !event ||
      !person ||
      makeIsoDate(knowledge.learnedAt) < event.occurredAt ||
      knowledge.learnedAt < person.birthDate ||
      knowledge.learnedAt > world.currentDate ||
      event.sequence >= knowledge.sequence
    ) {
      throw new Error(
        `Knowledge has invalid chronology or source: ${knowledge.id}`,
      );
    }
    assertMember(
      KNOWLEDGE_ACCURACIES,
      knowledge.accuracy,
      "knowledge accuracy",
    );
    assertMember(
      KNOWLEDGE_CONFIDENCES,
      knowledge.confidence,
      "knowledge confidence",
    );
    switch (knowledge.source.kind) {
      case "direct":
        if (!event.involvedEntityIds.includes(knowledge.personId)) {
          throw new Error(
            `Direct knowledge lacks event involvement: ${knowledge.id}`,
          );
        }
        break;
      case "told-by": {
        const sourcePerson = world.people[knowledge.source.sourcePersonId];
        if (
          knowledge.source.sourcePersonId === knowledge.personId ||
          !personIds.has(knowledge.source.sourcePersonId) ||
          !sourcePerson ||
          sourcePerson.birthDate > knowledge.learnedAt
        ) {
          throw new Error(
            `Knowledge references a missing source person: ${knowledge.id}`,
          );
        }
        if (
          knowledge.source.claimId !== null &&
          !claimIds.has(knowledge.source.claimId)
        ) {
          throw new Error(
            `Knowledge references a missing source claim: ${knowledge.id}`,
          );
        }
        const sourceClaim =
          knowledge.source.claimId === null
            ? undefined
            : claimById.get(knowledge.source.claimId);
        if (
          sourceClaim &&
          (sourceClaim.speakerPersonId !== knowledge.source.sourcePersonId ||
            sourceClaim.eventId !== knowledge.eventId ||
            sourceClaim.sequence >= knowledge.sequence ||
            sourceClaim.madeAt > knowledge.learnedAt)
        ) {
          throw new Error(
            `Knowledge references an incompatible source claim: ${knowledge.id}`,
          );
        }
        break;
      }
      case "public-record":
        assertNonEmptyString(
          knowledge.source.reference,
          "Knowledge public-record reference",
        );
        break;
      case "media":
        assertNonEmptyString(knowledge.source.outlet, "Knowledge media outlet");
        validateOptionalString(
          knowledge.source.reference,
          "Knowledge media reference",
        );
        break;
      case "rumor":
        if (
          knowledge.source.sourcePersonId !== null &&
          (!personIds.has(knowledge.source.sourcePersonId) ||
            !world.people[knowledge.source.sourcePersonId] ||
            world.people[knowledge.source.sourcePersonId]!.birthDate >
              knowledge.learnedAt)
        ) {
          throw new Error(
            `Knowledge rumor references a missing person: ${knowledge.id}`,
          );
        }
        validateOptionalString(
          knowledge.source.chainDescription,
          "Knowledge rumor chain",
        );
        break;
      default:
        throw new Error(
          `Invalid knowledge source kind: ${runtimeKind(knowledge.source)}`,
        );
    }
    assertNonEmptyString(knowledge.believedSummary, "Believed summary");
  }
  for (const claim of history.claims) {
    assertHistoryIdentity(ids, world, claim, "claim");
    if (!personIds.has(claim.speakerPersonId) || !eventIds.has(claim.eventId)) {
      throw new Error(
        `Claim references a missing person or event: ${claim.id}`,
      );
    }
    const event = eventById.get(claim.eventId);
    const speaker = world.people[claim.speakerPersonId];
    if (
      !event ||
      !speaker ||
      makeIsoDate(claim.madeAt) < event.occurredAt ||
      claim.madeAt < speaker.birthDate ||
      claim.madeAt > world.currentDate ||
      event.sequence >= claim.sequence
    ) {
      throw new Error(`Claim has invalid chronology: ${claim.id}`);
    }
    assertMember(CLAIM_AUDIENCES, claim.audience, "claim audience");
    assertMember(
      CLAIM_TRUTH_RELATIONS,
      claim.relationshipToTruth,
      "claim truth relationship",
    );
    switch (claim.provenance.kind) {
      case "direct-record":
        break;
      case "reported-by":
        if (
          claim.provenance.reporterPersonId === claim.speakerPersonId ||
          !personIds.has(claim.provenance.reporterPersonId) ||
          !world.people[claim.provenance.reporterPersonId] ||
          world.people[claim.provenance.reporterPersonId]!.birthDate >
            claim.madeAt
        ) {
          throw new Error(`Claim references a missing reporter: ${claim.id}`);
        }
        break;
      case "public-record":
        assertNonEmptyString(
          claim.provenance.reference,
          "Claim public-record reference",
        );
        break;
      case "media-record":
        assertNonEmptyString(claim.provenance.outlet, "Claim media outlet");
        validateOptionalString(
          claim.provenance.reference,
          "Claim media reference",
        );
        break;
      default:
        throw new Error(
          `Invalid claim provenance kind: ${runtimeKind(claim.provenance)}`,
        );
    }
    assertNonEmptyString(claim.statement, "Claim statement");
  }
  for (const interaction of history.relationshipInteractions) {
    assertHistoryIdentity(ids, world, interaction, "relationship");
    if (
      interaction.personIds[0] === interaction.personIds[1] ||
      interaction.personIds.some((id) => !personIds.has(id)) ||
      (interaction.eventId !== null && !eventIds.has(interaction.eventId))
    ) {
      throw new Error(
        `Relationship interaction has invalid references: ${interaction.id}`,
      );
    }
    if (
      interaction.personIds[0] > interaction.personIds[1] ||
      makeIsoDate(interaction.occurredAt) > world.currentDate ||
      interaction.personIds.some((personId) => {
        const person = world.people[personId];
        return !person || interaction.occurredAt < person.birthDate;
      })
    ) {
      throw new Error(
        `Relationship interaction is not canonical: ${interaction.id}`,
      );
    }
    if (interaction.eventId !== null) {
      const event = eventById.get(interaction.eventId);
      if (
        !event ||
        event.sequence >= interaction.sequence ||
        event.occurredAt !== interaction.occurredAt ||
        interaction.personIds.some(
          (personId) => !event.involvedEntityIds.includes(personId),
        )
      ) {
        throw new Error(
          `Relationship interaction has an incompatible event: ${interaction.id}`,
        );
      }
    }
    assertOpenTaxonomyKey(
      interaction.kind,
      RELATIONSHIP_INTERACTION_NAMESPACES,
      "Relationship interaction kind",
    );
    assertMember(
      RELATIONSHIP_CHANGES,
      interaction.change,
      "relationship interaction change",
    );
    assertMember(
      RELATIONSHIP_SIGNIFICANCES,
      interaction.significance,
      "relationship interaction significance",
    );
    assertNonEmptyString(
      interaction.summary,
      "Relationship interaction summary",
    );
    validateTags(interaction.tags, "Relationship interaction");
  }

  for (const exposure of history.propositionExposures) {
    assertHistoryIdentity(ids, world, exposure, "proposition-exposure");
    validatePoliticalRecordCore(
      world,
      personIds,
      exposure.personId,
      exposure.encounteredAt,
      exposure.id,
    );
    if (!world.policyCatalog.propositions[exposure.propositionId]) {
      throw new Error(
        `Proposition exposure references a missing proposition: ${exposure.id}`,
      );
    }
    assertNonEmptyString(exposure.summary, "Proposition-exposure summary");
    validatePropositionExposureProvenance(
      world,
      exposure.personId,
      exposure.encounteredAt,
      exposure.sequence,
      exposure.provenance,
      eventById,
      claimById,
      personIds,
    );
  }

  validatePoliticalHistory(
    world,
    ids,
    eventById,
    factById,
    personIds,
    exposureIds,
  );
  validateMindHistoryIntegrity(world, ids);
}

function validatePoliticalHistory(
  world: World,
  ids: Set<EntityId>,
  eventById: ReadonlyMap<EntityId, HistoricalEvent>,
  factById: ReadonlyMap<
    EntityId,
    { readonly personId: EntityId; readonly fact: PersonFact }
  >,
  personIds: ReadonlySet<EntityId>,
  exposureIds: ReadonlySet<EntityId>,
): void {
  const beliefsById = new Map(
    world.history.privateBeliefs.map((record) => [record.id, record]),
  );
  const positionsById = new Map(
    world.history.publicPositions.map((record) => [record.id, record]),
  );
  const commitmentsById = new Map(
    world.history.campaignCommitments.map((record) => [record.id, record]),
  );
  const principlesById = new Map(
    world.history.principles.map((record) => [record.id, record]),
  );
  const subjectKnowledgeById = new Map(
    world.history.subjectKnowledge.map((record) => [record.id, record]),
  );

  for (const belief of world.history.privateBeliefs) {
    assertHistoryIdentity(ids, world, belief, "belief");
    validatePoliticalRecordCore(
      world,
      personIds,
      belief.personId,
      belief.formedAt,
      belief.id,
    );
    if (!world.policyCatalog.propositions[belief.propositionId]) {
      throw new Error(
        `Private belief references a missing proposition: ${belief.id}`,
      );
    }
    assertMember(BELIEF_POSITIONS, belief.position, "belief position");
    assertMember(CONVICTIONS, belief.conviction, "belief conviction");
    assertMember(SALIENCES, belief.salience, "belief salience");
    assertMember(FLEXIBILITIES, belief.flexibility, "belief flexibility");
    validateOptionalString(belief.rationale, "Belief rationale");
    validateFormationContext(
      world,
      belief.personId,
      belief.formedAt,
      belief.sequence,
      belief.formation,
      eventById,
      factById,
      exposureIds,
    );
    for (const exposureId of belief.formation.propositionExposureIds) {
      const exposure = world.history.propositionExposures.find(
        (candidate) => candidate.id === exposureId,
      );
      if (exposure?.propositionId !== belief.propositionId) {
        throw new Error(
          `Belief formation references an exposure to another proposition: ${exposureId}`,
        );
      }
    }
    validatePoliticalSupersession(
      belief,
      belief.supersedesBeliefId,
      beliefsById,
      (record) => record.propositionId,
      (record) => record.formedAt,
      "private belief",
    );
  }

  for (const position of world.history.publicPositions) {
    assertHistoryIdentity(ids, world, position, "public-position");
    validatePoliticalRecordCore(
      world,
      personIds,
      position.personId,
      position.statedAt,
      position.id,
    );
    if (!world.policyCatalog.propositions[position.propositionId]) {
      throw new Error(
        `Public position references a missing proposition: ${position.id}`,
      );
    }
    assertMember(PUBLIC_STANCES, position.stance, "public-position stance");
    if (position.audience !== "limited" && position.audience !== "public") {
      throw new Error(
        `Public position has an invalid audience: ${position.id}`,
      );
    }
    assertNonEmptyString(position.statement, "Public-position statement");
    validateOptionalString(position.venue, "Public-position venue");
    validatePoliticalSourceEvent(
      position.sourceEventId,
      position.personId,
      position.statedAt,
      position.sequence,
      position.id,
      eventById,
    );
    validatePoliticalSupersession(
      position,
      position.supersedesPublicPositionId,
      positionsById,
      (record) => record.propositionId,
      (record) => record.statedAt,
      "public position",
    );
  }

  for (const commitment of world.history.campaignCommitments) {
    assertHistoryIdentity(ids, world, commitment, "commitment");
    validatePoliticalRecordCore(
      world,
      personIds,
      commitment.personId,
      commitment.madeAt,
      commitment.id,
    );
    if (!world.policyCatalog.propositions[commitment.propositionId]) {
      throw new Error(
        `Campaign commitment references a missing proposition: ${commitment.id}`,
      );
    }
    assertMember(
      COMMITMENT_STANCES,
      commitment.stance,
      "campaign-commitment stance",
    );
    assertMember(
      COMMITMENT_LEVELS,
      commitment.level,
      "campaign-commitment level",
    );
    assertNonEmptyString(commitment.statement, "Campaign-commitment statement");
    validateOptionalString(commitment.conditions, "Campaign conditions");
    validatePoliticalSourceEvent(
      commitment.sourceEventId,
      commitment.personId,
      commitment.madeAt,
      commitment.sequence,
      commitment.id,
      eventById,
    );
    validatePoliticalSupersession(
      commitment,
      commitment.supersedesCommitmentId,
      commitmentsById,
      (record) => record.propositionId,
      (record) => record.madeAt,
      "campaign commitment",
    );
  }

  for (const principle of world.history.principles) {
    assertHistoryIdentity(ids, world, principle, "principle");
    validatePoliticalRecordCore(
      world,
      personIds,
      principle.personId,
      principle.formedAt,
      principle.id,
    );
    if (!world.policyCatalog.principles[principle.principleId]) {
      throw new Error(
        `Principle record references a missing principle: ${principle.id}`,
      );
    }
    assertMember(PRINCIPLE_STANCES, principle.stance, "principle stance");
    assertMember(CONVICTIONS, principle.conviction, "principle conviction");
    assertMember(FLEXIBILITIES, principle.flexibility, "principle flexibility");
    validateOptionalString(principle.qualification, "Principle qualification");
    validateFormationContext(
      world,
      principle.personId,
      principle.formedAt,
      principle.sequence,
      principle.formation,
      eventById,
      factById,
      exposureIds,
    );
    validatePoliticalSupersession(
      principle,
      principle.supersedesPrincipleRecordId,
      principlesById,
      (record) => record.principleId,
      (record) => record.formedAt,
      "principle",
    );
  }

  for (const knowledge of world.history.subjectKnowledge) {
    assertHistoryIdentity(ids, world, knowledge, "subject-knowledge");
    validatePoliticalRecordCore(
      world,
      personIds,
      knowledge.personId,
      knowledge.recordedAt,
      knowledge.id,
    );
    if (!world.policyCatalog.subjects[knowledge.subjectId]) {
      throw new Error(
        `Subject knowledge references a missing subject: ${knowledge.id}`,
      );
    }
    assertMember(FAMILIARITIES, knowledge.familiarity, "subject familiarity");
    assertMember(
      UNDERSTANDINGS,
      knowledge.understanding,
      "subject understanding",
    );
    assertMember(EXPERTISE_LEVELS, knowledge.expertise, "subject expertise");
    assertMember(
      PRACTICAL_LEVELS,
      knowledge.practicalExperience,
      "practical-experience level",
    );
    validateSubjectKnowledgeProvenance(
      world,
      knowledge.personId,
      knowledge.subjectId,
      knowledge.recordedAt,
      knowledge.sequence,
      knowledge.provenance,
      eventById,
      factById,
      personIds,
    );
    validatePoliticalSupersession(
      knowledge,
      knowledge.supersedesKnowledgeId,
      subjectKnowledgeById,
      (record) => record.subjectId,
      (record) => record.recordedAt,
      "subject knowledge",
    );
  }
}

function validatePoliticalRecordCore(
  world: World,
  personIds: ReadonlySet<EntityId>,
  personId: EntityId,
  date: IsoDate,
  recordId: EntityId,
): void {
  const parsed = makeIsoDate(date);
  const person = world.people[personId];
  if (!personIds.has(personId) || !person) {
    throw new Error(
      `Political record references a missing person: ${recordId}`,
    );
  }
  if (parsed < person.birthDate || parsed > world.currentDate) {
    throw new Error(`Political record has invalid chronology: ${recordId}`);
  }
}

function validateFormationContext(
  world: World,
  personId: EntityId,
  formedAt: IsoDate,
  formationSequence: number,
  formation: BeliefFormationContext,
  eventById: ReadonlyMap<EntityId, HistoricalEvent>,
  factById: ReadonlyMap<
    EntityId,
    { readonly personId: EntityId; readonly fact: PersonFact }
  >,
  exposureIds: ReadonlySet<EntityId>,
): void {
  assertOpenTaxonomyKey(
    formation.reason,
    BELIEF_FORMATION_REASON_NAMESPACES,
    "Belief-formation reason",
  );
  assertCanonicalEntityIds(formation.relevantEventIds, "formation events");
  assertCanonicalEntityIds(formation.sourceFactIds, "formation facts");
  assertCanonicalEntityIds(
    formation.propositionExposureIds,
    "formation proposition exposures",
  );
  assertCanonicalEntityIds(formation.memoryIds, "formation memories");
  assertCanonicalEntityIds(
    formation.eventKnowledgeIds,
    "formation event knowledge",
  );
  assertCanonicalEntityIds(formation.claimIds, "formation claims");
  assertCanonicalEntityIds(
    formation.relationshipInteractionIds,
    "formation relationship interactions",
  );
  assertCanonicalEntityIds(
    formation.subjectKnowledgeIds,
    "formation subject knowledge",
  );
  assertCanonicalEntityIds(
    formation.decisionTraceIds,
    "formation decision traces",
  );
  const referencedMemories = formation.memoryIds.map((memoryId) => {
    const memory = world.history.memories.find(
      (candidate) => candidate.id === memoryId,
    );
    if (
      !memory ||
      memory.personId !== personId ||
      memory.formedAt > formedAt ||
      memory.sequence >= formationSequence
    ) {
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
      knowledge.learnedAt > formedAt ||
      knowledge.sequence >= formationSequence
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
    const event = eventById.get(eventId);
    if (
      !event ||
      event.occurredAt > formedAt ||
      event.sequence >= formationSequence ||
      (!event.involvedEntityIds.includes(personId) &&
        !knownEventIds.has(eventId))
    ) {
      throw new Error(`Formation references an unavailable event: ${eventId}`);
    }
  }
  for (const factId of formation.sourceFactIds) {
    const factRecord = factById.get(factId);
    if (
      !factRecord ||
      factRecord.personId !== personId ||
      factRecord.fact.occurredAt > formedAt
    ) {
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
      !exposureIds.has(exposureId) ||
      !exposure ||
      exposure.personId !== personId ||
      exposure.encounteredAt > formedAt ||
      exposure.sequence >= formationSequence
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
      claim.sequence >= formationSequence ||
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
      interaction.occurredAt > formedAt ||
      interaction.sequence >= formationSequence
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
      knowledge.recordedAt > formedAt ||
      knowledge.sequence >= formationSequence
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
      trace.recordedAt > formedAt ||
      trace.sequence >= formationSequence
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
    assertNonEmptyString(
      formation.cue.sourceLabel,
      "Political cue source label",
    );
    if (formation.cue.sourcePersonId !== null && !cueSource) {
      throw new Error(
        `Political cue references a missing person: ${formation.cue.sourcePersonId}`,
      );
    }
    if (formation.cue.sourcePersonId === personId) {
      throw new Error("A trusted political cue must come from another person.");
    }
    if (cueSource && cueSource.birthDate > formedAt) {
      throw new Error("A political cue source predates their birth.");
    }
  }
  if (formation.reason.startsWith("cue:") !== (formation.cue !== null)) {
    throw new Error(
      "Cue-based formation reasons and political cues must be supplied together.",
    );
  }
  if (formation.cue) validatePoliticalCueConsistency(formation.cue);
  validateOptionalString(
    formation.evidenceReference,
    "Formation evidence reference",
  );
  validateOptionalString(formation.note, "Formation note");
}

function validatePoliticalCueConsistency(
  cue: NonNullable<BeliefFormationContext["cue"]>,
): void {
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
  encounteredAt: IsoDate,
  exposureSequence: number,
  provenance: World["history"]["propositionExposures"][number]["provenance"],
  eventById: ReadonlyMap<EntityId, HistoricalEvent>,
  claimById: ReadonlyMap<EntityId, ClaimRecord>,
  personIds: ReadonlySet<EntityId>,
): void {
  switch (provenance.kind) {
    case "direct-experience": {
      const event = eventById.get(provenance.eventId);
      if (
        !event ||
        event.occurredAt > encounteredAt ||
        event.sequence >= exposureSequence ||
        !event.involvedEntityIds.includes(personId)
      ) {
        throw new Error(
          `Proposition exposure references an incompatible event: ${provenance.eventId}`,
        );
      }
      return;
    }
    case "told-by": {
      const sourcePerson = world.people[provenance.sourcePersonId];
      if (
        provenance.sourcePersonId === personId ||
        !personIds.has(provenance.sourcePersonId) ||
        !sourcePerson ||
        sourcePerson.birthDate > encounteredAt
      ) {
        throw new Error(
          `Proposition exposure references an unavailable source person: ${provenance.sourcePersonId}`,
        );
      }
      if (provenance.claimId !== null) {
        const claim = claimById.get(provenance.claimId);
        if (
          !claim ||
          claim.speakerPersonId !== provenance.sourcePersonId ||
          claim.madeAt > encounteredAt ||
          claim.sequence >= exposureSequence
        ) {
          throw new Error(
            `Proposition exposure references an incompatible claim: ${provenance.claimId}`,
          );
        }
      }
      return;
    }
    case "public-record":
      assertNonEmptyString(
        provenance.reference,
        "Exposure public-record reference",
      );
      return;
    case "media":
      assertNonEmptyString(provenance.outlet, "Exposure media outlet");
      validateOptionalString(provenance.reference, "Exposure media reference");
      return;
    case "organization":
      assertNonEmptyString(
        provenance.organizationLabel,
        "Exposure organization label",
      );
      validateOptionalString(
        provenance.reference,
        "Exposure organization reference",
      );
      return;
    case "manual":
      assertNonEmptyString(provenance.note, "Exposure manual note");
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
  recordedAt: IsoDate,
  knowledgeSequence: number,
  provenance: SubjectKnowledgeProvenance,
  eventById: ReadonlyMap<EntityId, HistoricalEvent>,
  factById: ReadonlyMap<
    EntityId,
    { readonly personId: EntityId; readonly fact: PersonFact }
  >,
  personIds: ReadonlySet<EntityId>,
): void {
  switch (provenance.kind) {
    case "person-facts":
      if (provenance.factIds.length === 0) {
        throw new Error("Fact-derived expertise requires at least one fact.");
      }
      assertCanonicalEntityIds(provenance.factIds, "knowledge facts");
      for (const factId of provenance.factIds) {
        const record = factById.get(factId);
        const fact = record?.fact;
        if (
          record?.personId !== personId ||
          !fact ||
          (fact.kind !== "education" && fact.kind !== "occupation") ||
          !fact.subjectIds.includes(subjectId) ||
          fact.occurredAt > recordedAt
        ) {
          throw new Error(
            `Subject knowledge references an incompatible person fact: ${factId}`,
          );
        }
      }
      return;
    case "historical-events":
      if (provenance.eventIds.length === 0) {
        throw new Error("Event-derived knowledge requires at least one event.");
      }
      assertCanonicalEntityIds(provenance.eventIds, "knowledge events");
      for (const eventId of provenance.eventIds) {
        const event = eventById.get(eventId);
        if (
          !event ||
          event.occurredAt > recordedAt ||
          event.sequence >= knowledgeSequence ||
          !event.involvedEntityIds.includes(personId)
        ) {
          throw new Error(
            `Subject knowledge references an incompatible event: ${eventId}`,
          );
        }
      }
      return;
    case "study":
      assertNonEmptyString(provenance.reference, "Study reference");
      return;
    case "trusted-report":
      if (
        provenance.sourcePersonId === personId ||
        !personIds.has(provenance.sourcePersonId) ||
        !world.people[provenance.sourcePersonId] ||
        world.people[provenance.sourcePersonId]!.birthDate > recordedAt
      ) {
        throw new Error(
          `Subject knowledge references an unavailable source person: ${provenance.sourcePersonId}`,
        );
      }
      validateOptionalString(provenance.reference, "Trusted-report reference");
      return;
    case "manual":
      assertNonEmptyString(provenance.note, "Manual knowledge note");
      return;
    default:
      throw new Error(
        `Invalid subject-knowledge provenance kind: ${runtimeKind(provenance)}`,
      );
  }
}

function validatePoliticalSourceEvent(
  sourceEventId: EntityId | null,
  personId: EntityId,
  recordDate: IsoDate,
  recordSequence: number,
  recordId: EntityId,
  eventById: ReadonlyMap<EntityId, HistoricalEvent>,
): void {
  if (sourceEventId === null) return;
  const event = eventById.get(sourceEventId);
  if (
    !event ||
    event.occurredAt !== recordDate ||
    !event.involvedEntityIds.includes(personId) ||
    event.sequence >= recordSequence
  ) {
    throw new Error(
      `Political record has an invalid source event: ${recordId}`,
    );
  }
}

function validatePoliticalSupersession<
  T extends {
    readonly id: EntityId;
    readonly personId: EntityId;
    readonly sequence: number;
  },
>(
  record: T,
  priorId: EntityId | null,
  recordsById: ReadonlyMap<EntityId, T>,
  selectSubject: (candidate: T) => EntityId,
  selectDate: (candidate: T) => IsoDate,
  label: string,
): void {
  const previous = [...recordsById.values()]
    .filter(
      (candidate) =>
        candidate.personId === record.personId &&
        selectSubject(candidate) === selectSubject(record) &&
        candidate.sequence < record.sequence,
    )
    .sort((left, right) => left.sequence - right.sequence)
    .at(-1);
  const prior = priorId === null ? undefined : recordsById.get(priorId);
  if (
    (previous === undefined && priorId !== null) ||
    (previous !== undefined && priorId !== previous.id) ||
    (priorId !== null && !prior) ||
    (prior !== undefined &&
      (prior.personId !== record.personId ||
        selectSubject(prior) !== selectSubject(record) ||
        prior.sequence >= record.sequence ||
        selectDate(prior) > selectDate(record)))
  ) {
    throw new Error(`Invalid ${label} supersession reference: ${priorId}`);
  }
}

function assertCanonicalEntityIds(
  ids: readonly EntityId[],
  label: string,
): void {
  const canonical = [...new Set(ids)].sort();
  if (JSON.stringify(ids) !== JSON.stringify(canonical)) {
    throw new Error(`${label} must contain sorted unique IDs.`);
  }
}

function assertHistoryIdentity(
  ids: Set<EntityId>,
  world: World,
  record: { readonly id: EntityId; readonly stableKey: string },
  kind:
    | "event"
    | "memory"
    | "knowledge"
    | "claim"
    | "relationship"
    | "proposition-exposure"
    | "belief"
    | "public-position"
    | "commitment"
    | "principle"
    | "subject-knowledge",
): void {
  assertUniqueId(ids, record.id);
  assertNonEmptyString(record.stableKey, "History stable key");
  if (record.id !== createStableId(kind, `${world.id}:${record.stableKey}`)) {
    throw new Error(`${kind} ID does not match its stable key: ${record.id}`);
  }
}

function assertUniqueStableKeys(
  records: readonly { readonly stableKey: string }[],
  label: string,
): void {
  const keys = new Set<string>();
  for (const record of records) {
    if (keys.has(record.stableKey)) {
      throw new Error(`Duplicate ${label} stable key: ${record.stableKey}`);
    }
    keys.add(record.stableKey);
  }
}

function assertSequenceOrdered(
  records: readonly { readonly sequence: number }[],
  label: string,
): void {
  if (
    records.some(
      (record, index) =>
        index > 0 && record.sequence <= (records[index - 1]?.sequence ?? -1),
    )
  ) {
    throw new Error(`${label} history is not stored in append-sequence order.`);
  }
}

function assertNonEmptyString(
  value: unknown,
  label: string,
): asserts value is string {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new Error(`${label} must be a non-empty string.`);
  }
}

function runtimeKind(value: never): string {
  return String((value as { readonly kind?: unknown }).kind);
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

function validateTags(tags: readonly string[], label: string): void {
  const seen = new Set<string>();
  for (const tag of tags) {
    assertNonEmptyString(tag, `${label} tag`);
    if (seen.has(tag)) {
      throw new Error(`${label} contains a duplicate tag: ${tag}`);
    }
    seen.add(tag);
  }
}

function validateEventContext(world: World, context: EventContext): void {
  if (context.location) {
    assertNonEmptyString(context.location.label, "Event location label");
    if (
      context.location.jurisdictionId &&
      !world.jurisdictions[context.location.jurisdictionId]
    ) {
      throw new Error(
        `Event context references a missing jurisdiction: ${context.location.jurisdictionId}`,
      );
    }
    if (context.location.setting !== null) {
      assertNonEmptyString(context.location.setting, "Event setting");
    }
  }
  for (const [field, value] of Object.entries(context)) {
    if (field !== "location" && value !== null) {
      assertNonEmptyString(value, `Event context ${field}`);
    }
  }
}

function assertJsonSafe(
  value: unknown,
  path: string,
  ancestors: Set<object> = new Set(),
): void {
  if (
    value === null ||
    typeof value === "string" ||
    typeof value === "boolean"
  ) {
    return;
  }
  if (typeof value === "number") {
    if (!Number.isFinite(value)) {
      throw new Error(`Non-finite number is not JSON-safe at ${path}.`);
    }
    return;
  }
  if (typeof value !== "object") {
    throw new Error(`Non-JSON-safe value at ${path}.`);
  }
  if (ancestors.has(value)) {
    throw new Error(`Cyclic value is not JSON-safe at ${path}.`);
  }

  const prototype = Object.getPrototypeOf(value);
  if (
    !Array.isArray(value) &&
    prototype !== Object.prototype &&
    prototype !== null
  ) {
    throw new Error(`Non-plain object is not JSON-safe at ${path}.`);
  }

  ancestors.add(value);
  if (Array.isArray(value)) {
    value.forEach((entry, index) =>
      assertJsonSafe(entry, `${path}[${index}]`, ancestors),
    );
  } else {
    for (const [key, entry] of Object.entries(value)) {
      assertJsonSafe(entry, `${path}.${key}`, ancestors);
    }
  }
  ancestors.delete(value);
}

function cloneFact(fact: PersonFact): PersonFact {
  if (fact.kind === "education" || fact.kind === "occupation") {
    return {
      ...fact,
      provenance: { ...fact.provenance },
      subjectIds: [...fact.subjectIds],
    };
  }
  return { ...fact, provenance: { ...fact.provenance } };
}

function cloneJurisdiction(jurisdiction: Jurisdiction): Jurisdiction {
  return {
    ...jurisdiction,
    provenance: { ...jurisdiction.provenance },
  };
}

function clonePerson(person: Person): Person {
  const core = {
    ...person,
    establishedFacts: person.establishedFacts.map(cloneFact),
  };

  if (person.detailLevel === "lightweight") {
    return core;
  }

  return {
    ...core,
    detailLevel: "materialized",
    details: {
      ...person.details,
      generatedFacts: person.details.generatedFacts.map(cloneFact),
    },
  };
}
