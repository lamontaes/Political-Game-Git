import type {
  AppraisalRecord,
  CampaignCommitmentRecord,
  CausalProcessRecord,
  CausalRecordProvenance,
  ClaimProvenance,
  ClaimRecord,
  DecisionTraceRecord,
  EffectActivationRecord,
  EntityId,
  EventKnowledgeRecord,
  EvidenceArtifactRecord,
  EvidenceDiscoveryRecord,
  EvidenceRecordProvenance,
  FactProvenance,
  FutureDueItem,
  FutureDueItemProvenance,
  FutureDueItemStateRecord,
  GoalStateRecord,
  HistoricalEvent,
  IncidentRecord,
  IncidentStateRecord,
  KnowledgeSource,
  MemoryRecord,
  MindRecordProvenance,
  MindSourceReference,
  PerceptionRecord,
  PerceptionSource,
  Person,
  PersonFact,
  PersonalValueRecord,
  PersonalityTendencyRecord,
  PrincipleRecord,
  PrivateBeliefRecord,
  PropositionExposureProvenance,
  PropositionExposureRecord,
  PublicPositionRecord,
  RelationshipInteraction,
  SubjectKnowledgeProvenance,
  SubjectKnowledgeRecord,
  TemporaryStateRecord,
  World,
} from "../simulation";
import {
  createTraceNode,
  entityRefsFromIds,
  linksFromIds,
  optionalLink,
  type TraceEntityRef,
  type TraceLink,
  type TraceNode,
  type TraceTruthOrigin,
  type TraceUnrecordedLink,
} from "./trace-model";
import { createTraceSourceRegistry, type TraceSource } from "./trace-sources";

/**
 * One adapter per accepted record family.
 *
 * Every adapter here is a transcription. It reads the fields the family
 * already carries — `parentCausalIds`, `source.claimId`, `eventId`,
 * `supersedes*Id`, `provenance` — and turns each into an edge, an entity
 * reference, or a recorded absence. Where a field is nullable and null, the
 * adapter emits an unrecorded link saying which field was empty. Where a
 * provenance variant names an outlet, a reference string or a note instead of
 * another record, the chain genuinely ends there and the adapter says so
 * rather than reaching for the nearest plausible record.
 *
 * Nothing in this file joins records by matching dates, people, or text. That
 * is the temptation the whole tool is built to resist: a join like that would
 * produce a graph that looks causal and is not.
 */

// ---------------------------------------------------------------------------
// Shared provenance and source-reference readers
// ---------------------------------------------------------------------------

interface ProvenanceProjection {
  readonly truthOrigin: TraceTruthOrigin;
  readonly links: readonly TraceLink[];
  readonly unrecordedLinks: readonly TraceUnrecordedLink[];
  readonly entityRefs: readonly TraceEntityRef[];
  readonly note: string;
}

function readCausalProvenance(
  provenance: CausalRecordProvenance,
  role: string,
): ProvenanceProjection {
  switch (provenance.kind) {
    case "simulated":
      return {
        truthOrigin: "simulated",
        links: [],
        unrecordedLinks: [],
        entityRefs: entityRefsFromIds(
          `${role}.sourceEntityIds`,
          provenance.sourceEntityIds,
        ),
        note: "provenance=simulated",
      };
    case "initialization":
      return {
        truthOrigin: "initialization",
        links: [],
        unrecordedLinks:
          provenance.sourceReference === null
            ? [
                {
                  kind: "causal-parent",
                  role: `${role}.sourceReference`,
                  note: "Initialization provenance recorded no source reference.",
                },
              ]
            : [],
        entityRefs: [],
        note: "provenance=initialization",
      };
    case "authored":
      return {
        truthOrigin: "authored",
        links: [],
        unrecordedLinks: [
          {
            kind: "causal-parent",
            role,
            note: `Authored provenance names no parent record: ${provenance.note}`,
          },
        ],
        entityRefs: [],
        note: "provenance=authored",
      };
  }
}

/**
 * A mind source reference always names exactly one record, so this is a total
 * mapping rather than a best effort. A new variant is a compile error here,
 * which is the point.
 */
function mindSourceTarget(reference: MindSourceReference): EntityId {
  switch (reference.kind) {
    case "person-fact":
      return reference.factId;
    case "personality-tendency":
      return reference.tendencyRecordId;
    case "personal-value":
      return reference.valueRecordId;
    case "goal-state":
      return reference.goalStateId;
    case "temporary-state":
      return reference.temporaryStateId;
    case "historical-event":
      return reference.eventId;
    case "memory":
      return reference.memoryId;
    case "event-knowledge":
      return reference.knowledgeId;
    case "claim":
      return reference.claimId;
    case "relationship-interaction":
      return reference.interactionId;
    case "proposition-exposure":
      return reference.exposureId;
    case "private-belief":
      return reference.beliefId;
    case "political-principle":
      return reference.principleRecordId;
    case "subject-knowledge":
      return reference.subjectKnowledgeId;
    case "appraisal":
      return reference.appraisalId;
    case "perception":
      return reference.perceptionId;
    case "decision-trace":
      return reference.decisionTraceId;
    case "life-load-resolution":
      return reference.lifeLoadResolutionId;
    case "life-history":
      return reference.reference.recordId;
  }
}

function mindSourceLinks(
  role: string,
  references: readonly MindSourceReference[],
): readonly TraceLink[] {
  return references.map((reference, index) => ({
    kind: "source-record" as const,
    role: `${role}[${index}].${reference.kind}`,
    targetId: mindSourceTarget(reference),
  }));
}

function readMindProvenance(
  provenance: MindRecordProvenance,
  role: string,
): ProvenanceProjection {
  const links = mindSourceLinks(`${role}.sourceRefs`, provenance.sourceRefs);
  return {
    truthOrigin: provenance.kind === "authored" ? "authored" : "simulated",
    links,
    unrecordedLinks:
      links.length === 0
        ? [
            {
              kind: "source-record",
              role: `${role}.sourceRefs`,
              note: `Mind provenance (${provenance.kind}) recorded no source references.`,
            },
          ]
        : [],
    entityRefs: [],
    note: `provenance=${provenance.kind}`,
  };
}

function readFactProvenance(provenance: FactProvenance): ProvenanceProjection {
  const origin: TraceTruthOrigin =
    provenance.method === "manual"
      ? "authored"
      : provenance.method === "simulated-event"
        ? "simulated"
        : "generated";
  const projected = optionalLink(
    "causal-parent",
    "provenance.sourceEventId",
    provenance.sourceEventId,
    `Fact provenance method ${provenance.method} recorded no source event.`,
  );
  return {
    truthOrigin: origin,
    links: projected.links,
    unrecordedLinks: projected.unrecordedLinks,
    entityRefs: [],
    note: `provenance=${provenance.method}`,
  };
}

function readEvidenceProvenance(
  provenance: EvidenceRecordProvenance,
): ProvenanceProjection {
  if (provenance.kind === "simulated") {
    return {
      truthOrigin: "simulated",
      links: [],
      unrecordedLinks: [],
      entityRefs: entityRefsFromIds(
        "provenance.sourceEntityIds",
        provenance.sourceEntityIds,
      ),
      note: "provenance=simulated",
    };
  }
  return {
    truthOrigin: "authored",
    links: [],
    unrecordedLinks: [
      {
        kind: "causal-parent",
        role: "provenance",
        note: `Authored evidence provenance names no parent record: ${provenance.note}`,
      },
    ],
    entityRefs: [],
    note: "provenance=authored",
  };
}

function readFutureProvenance(
  provenance: FutureDueItemProvenance,
): ProvenanceProjection {
  switch (provenance.kind) {
    case "simulated":
      return {
        truthOrigin: "simulated",
        links: [],
        unrecordedLinks: [],
        entityRefs: entityRefsFromIds(
          "provenance.sourceEntityIds",
          provenance.sourceEntityIds,
        ),
        note: "provenance=simulated",
      };
    case "initialization":
      return {
        truthOrigin: "initialization",
        links: [],
        unrecordedLinks: [],
        entityRefs: [],
        note: "provenance=initialization",
      };
    case "authored":
      return {
        truthOrigin: "authored",
        links: [],
        unrecordedLinks: [
          {
            kind: "causal-parent",
            role: "provenance",
            note: `Authored schedule provenance names no parent record: ${provenance.note}`,
          },
        ],
        entityRefs: [],
        note: "provenance=authored",
      };
  }
}

function readClaimProvenance(
  provenance: ClaimProvenance,
): ProvenanceProjection {
  switch (provenance.kind) {
    case "direct-record":
      return {
        truthOrigin: "simulated",
        links: [],
        unrecordedLinks: [],
        entityRefs: [],
        note: "provenance=direct-record",
      };
    case "reported-by":
      return {
        truthOrigin: "simulated",
        links: [],
        unrecordedLinks: [],
        entityRefs: [
          {
            role: "provenance.reporterPersonId",
            entityId: provenance.reporterPersonId,
          },
        ],
        note: "provenance=reported-by",
      };
    case "public-record":
      return {
        truthOrigin: "source-record",
        links: [],
        unrecordedLinks: [
          {
            kind: "source-record",
            role: "provenance.reference",
            note: `Claim cites an external public record, not a world record: ${provenance.reference}`,
          },
        ],
        entityRefs: [],
        note: "provenance=public-record",
      };
    case "media-record":
      return {
        truthOrigin: "source-record",
        links: [],
        unrecordedLinks: [
          {
            kind: "source-record",
            role: "provenance.outlet",
            note: `Claim cites media (${provenance.outlet}), not a world record.`,
          },
        ],
        entityRefs: [],
        note: "provenance=media-record",
      };
  }
}

function readKnowledgeSource(source: KnowledgeSource): ProvenanceProjection {
  switch (source.kind) {
    case "direct":
      return {
        truthOrigin: "simulated",
        links: [],
        unrecordedLinks: [],
        entityRefs: [],
        note: "source=direct",
      };
    case "told-by": {
      const claim = optionalLink(
        "source-record",
        "source.claimId",
        source.claimId,
        "Told-by knowledge recorded a source person but no specific claim.",
      );
      return {
        truthOrigin: "simulated",
        links: claim.links,
        unrecordedLinks: claim.unrecordedLinks,
        entityRefs: [
          {
            role: "source.sourcePersonId",
            entityId: source.sourcePersonId,
          },
        ],
        note: "source=told-by",
      };
    }
    case "public-record":
      return {
        truthOrigin: "source-record",
        links: [],
        unrecordedLinks: [
          {
            kind: "source-record",
            role: "source.reference",
            note: `Knowledge cites an external public record: ${source.reference}`,
          },
        ],
        entityRefs: [],
        note: "source=public-record",
      };
    case "media":
      return {
        truthOrigin: "source-record",
        links: [],
        unrecordedLinks: [
          {
            kind: "source-record",
            role: "source.outlet",
            note: `Knowledge cites media (${source.outlet}), not a world record.`,
          },
        ],
        entityRefs: [],
        note: "source=media",
      };
    case "rumor":
      return {
        truthOrigin: "simulated",
        links: [],
        unrecordedLinks: [
          {
            kind: "source-record",
            role: "source.chainDescription",
            note: "Rumor knowledge records no originating record by design.",
          },
        ],
        entityRefs:
          source.sourcePersonId === null
            ? []
            : [
                {
                  role: "source.sourcePersonId",
                  entityId: source.sourcePersonId,
                },
              ],
        note: "source=rumor",
      };
  }
}

function readPerceptionSource(source: PerceptionSource): ProvenanceProjection {
  const simulated: TraceTruthOrigin = "simulated";
  switch (source.kind) {
    case "person-fact":
      return single(simulated, "source.factId", source.factId, "person-fact");
    case "life-history":
      return single(
        simulated,
        `source.reference.${source.reference.family}`,
        source.reference.recordId,
        "life-history",
      );
    case "proposition-exposure":
      return single(
        simulated,
        "source.exposureId",
        source.exposureId,
        "proposition-exposure",
      );
    case "subject-knowledge":
      return single(
        simulated,
        "source.subjectKnowledgeId",
        source.subjectKnowledgeId,
        "subject-knowledge",
      );
    case "appraisal":
      return single(
        simulated,
        "source.appraisalId",
        source.appraisalId,
        "appraisal",
      );
    case "event-knowledge":
      return single(
        simulated,
        "source.knowledgeId",
        source.knowledgeId,
        "event-knowledge",
      );
    case "memory":
      return single(simulated, "source.memoryId", source.memoryId, "memory");
    case "heard-claim":
      return {
        truthOrigin: simulated,
        links: [
          {
            kind: "source-record",
            role: "source.claimId",
            targetId: source.claimId,
          },
          {
            kind: "source-record",
            role: "source.knowledgeId",
            targetId: source.knowledgeId,
          },
        ],
        unrecordedLinks: [],
        entityRefs: [],
        note: "source=heard-claim",
      };
    case "inference":
      return {
        truthOrigin: simulated,
        links: linksFromIds(
          "source-record",
          "source.basisPerceptionIds",
          source.basisPerceptionIds,
        ),
        unrecordedLinks: [],
        entityRefs: [],
        note: "source=inference",
      };
    case "trusted-cue":
      return {
        truthOrigin: simulated,
        links: [
          ...linksFromIds(
            "source-record",
            "source.communicationRecordIds",
            source.communicationRecordIds,
          ),
          ...linksFromIds(
            "source-record",
            "source.relationshipInteractionIds",
            source.relationshipInteractionIds,
          ),
        ],
        unrecordedLinks: [],
        entityRefs: [
          {
            role: "source.sourcePersonId",
            entityId: source.sourcePersonId,
          },
        ],
        note: "source=trusted-cue",
      };
    case "relationship-derived":
      return {
        truthOrigin: simulated,
        links: linksFromIds(
          "source-record",
          "source.relationshipInteractionIds",
          source.relationshipInteractionIds,
        ),
        unrecordedLinks: [],
        entityRefs: [
          {
            role: "source.sourcePersonId",
            entityId: source.sourcePersonId,
          },
        ],
        note: "source=relationship-derived",
      };
    case "authored":
      return {
        truthOrigin: "authored",
        links: [],
        unrecordedLinks: [
          {
            kind: "source-record",
            role: "source",
            note: `Authored perception names no source record: ${source.note}`,
          },
        ],
        entityRefs: [],
        note: "source=authored",
      };
  }
}

function single(
  truthOrigin: TraceTruthOrigin,
  role: string,
  targetId: EntityId,
  note: string,
): ProvenanceProjection {
  return {
    truthOrigin,
    links: [{ kind: "source-record", role, targetId }],
    unrecordedLinks: [],
    entityRefs: [],
    note: `source=${note}`,
  };
}

function readExposureProvenance(
  provenance: PropositionExposureProvenance,
): ProvenanceProjection {
  switch (provenance.kind) {
    case "direct-experience":
      return single(
        "simulated",
        "provenance.eventId",
        provenance.eventId,
        "direct-experience",
      );
    case "told-by": {
      const claim = optionalLink(
        "source-record",
        "provenance.claimId",
        provenance.claimId,
        "Told-by exposure recorded a source person but no specific claim.",
      );
      return {
        truthOrigin: "simulated",
        links: claim.links,
        unrecordedLinks: claim.unrecordedLinks,
        entityRefs: [
          {
            role: "provenance.sourcePersonId",
            entityId: provenance.sourcePersonId,
          },
        ],
        note: "provenance=told-by",
      };
    }
    case "public-record":
    case "media":
    case "organization":
      return {
        truthOrigin: "source-record",
        links: [],
        unrecordedLinks: [
          {
            kind: "source-record",
            role: "provenance",
            note: `Exposure provenance ${provenance.kind} cites an external source, not a world record.`,
          },
        ],
        entityRefs: [],
        note: `provenance=${provenance.kind}`,
      };
    case "manual":
      return {
        truthOrigin: "authored",
        links: [],
        unrecordedLinks: [
          {
            kind: "source-record",
            role: "provenance",
            note: `Manual exposure provenance names no record: ${provenance.note}`,
          },
        ],
        entityRefs: [],
        note: "provenance=manual",
      };
  }
}

function readSubjectKnowledgeProvenance(
  provenance: SubjectKnowledgeProvenance,
): ProvenanceProjection {
  switch (provenance.kind) {
    case "person-facts":
      return {
        truthOrigin: "simulated",
        links: linksFromIds(
          "source-record",
          "provenance.factIds",
          provenance.factIds,
        ),
        unrecordedLinks: [],
        entityRefs: [],
        note: "provenance=person-facts",
      };
    case "historical-events":
      return {
        truthOrigin: "simulated",
        links: linksFromIds(
          "source-record",
          "provenance.eventIds",
          provenance.eventIds,
        ),
        unrecordedLinks: [],
        entityRefs: [],
        note: "provenance=historical-events",
      };
    case "study":
      return {
        truthOrigin: "source-record",
        links: [],
        unrecordedLinks: [
          {
            kind: "source-record",
            role: "provenance.reference",
            note: `Study provenance cites an external reference: ${provenance.reference}`,
          },
        ],
        entityRefs: [],
        note: "provenance=study",
      };
    case "trusted-report":
      return {
        truthOrigin: "simulated",
        links: [],
        unrecordedLinks: [
          {
            kind: "source-record",
            role: "provenance.reference",
            note: "Trusted-report provenance names a person but no record.",
          },
        ],
        entityRefs: [
          {
            role: "provenance.sourcePersonId",
            entityId: provenance.sourcePersonId,
          },
        ],
        note: "provenance=trusted-report",
      };
    case "manual":
      return {
        truthOrigin: "authored",
        links: [],
        unrecordedLinks: [
          {
            kind: "source-record",
            role: "provenance",
            note: `Manual subject-knowledge provenance names no record: ${provenance.note}`,
          },
        ],
        entityRefs: [],
        note: "provenance=manual",
      };
  }
}

/**
 * Belief and principle formation carries eight separate id arrays plus a cue.
 * Each array is transcribed under its own role so a trace says which kind of
 * source produced the edge, not merely that one existed.
 */
function readFormationContext(
  formation: PrivateBeliefRecord["formation"],
): ProvenanceProjection {
  const links: TraceLink[] = [
    ...linksFromIds(
      "source-record",
      "formation.relevantEventIds",
      formation.relevantEventIds,
    ),
    ...linksFromIds(
      "source-record",
      "formation.sourceFactIds",
      formation.sourceFactIds,
    ),
    ...linksFromIds(
      "source-record",
      "formation.propositionExposureIds",
      formation.propositionExposureIds,
    ),
    ...linksFromIds(
      "source-record",
      "formation.memoryIds",
      formation.memoryIds,
    ),
    ...linksFromIds(
      "source-record",
      "formation.eventKnowledgeIds",
      formation.eventKnowledgeIds,
    ),
    ...linksFromIds("source-record", "formation.claimIds", formation.claimIds),
    ...linksFromIds(
      "source-record",
      "formation.relationshipInteractionIds",
      formation.relationshipInteractionIds,
    ),
    ...linksFromIds(
      "source-record",
      "formation.subjectKnowledgeIds",
      formation.subjectKnowledgeIds,
    ),
    ...linksFromIds(
      "source-record",
      "formation.decisionTraceIds",
      formation.decisionTraceIds,
    ),
  ];
  const unrecordedLinks: TraceUnrecordedLink[] = [];
  if (links.length === 0) {
    unrecordedLinks.push({
      kind: "source-record",
      role: "formation",
      note: `Formation reason ${formation.reason} cites no source record.`,
    });
  }
  if (formation.evidenceReference !== null) {
    unrecordedLinks.push({
      kind: "source-record",
      role: "formation.evidenceReference",
      note: `Formation cites an external reference: ${formation.evidenceReference}`,
    });
  }
  return {
    truthOrigin: "simulated",
    links,
    unrecordedLinks,
    entityRefs: [],
    note: `formation=${formation.reason}`,
  };
}

// ---------------------------------------------------------------------------
// Family adapters
// ---------------------------------------------------------------------------

function eventNode(record: HistoricalEvent): TraceNode {
  return createTraceNode({
    id: record.id,
    family: "history.events",
    recordClass: "canonical-event",
    truthOrigin: "simulated",
    stableKey: record.stableKey,
    sequence: record.sequence,
    occurredAt: record.occurredAt,
    recordedAt: record.recordedAt,
    entityRefs: [
      ...(record.jurisdictionId === null
        ? []
        : [
            {
              role: "jurisdictionId",
              entityId: record.jurisdictionId,
            },
          ]),
      ...entityRefsFromIds("involvedEntityIds", record.involvedEntityIds),
      ...record.participants.map((participant, index) => ({
        role: `participants[${index}].${participant.role}`,
        entityId: participant.personId,
      })),
    ],
    links: [],
    unrecordedLinks: [
      {
        kind: "causal-parent",
        role: "history.events",
        note: "A historical event is a root record: the family carries no parent pointer.",
      },
    ],
    developmentSummary: `event type=${record.type} visibility=${record.visibility} participants=${record.participants.length} tags=${record.tags.join("|")}`,
    recordText: record.summary,
  });
}

function personFactNodes(person: Person): readonly TraceNode[] {
  const facts: readonly PersonFact[] = [
    ...person.establishedFacts,
    ...(person.detailLevel === "materialized"
      ? person.details.generatedFacts
      : []),
  ];
  return facts.map((fact) => {
    const provenance = readFactProvenance(fact.provenance);
    return createTraceNode({
      id: fact.id,
      family: "people.facts",
      recordClass: "person-fact",
      truthOrigin: provenance.truthOrigin,
      stableKey: fact.stableKey,
      sequence: null,
      occurredAt: fact.occurredAt,
      recordedAt: null,
      entityRefs: [
        { role: "personId", entityId: person.id },
        ...(fact.jurisdictionId === null
          ? []
          : [{ role: "jurisdictionId", entityId: fact.jurisdictionId }]),
      ],
      links: provenance.links,
      unrecordedLinks: provenance.unrecordedLinks,
      developmentSummary: `person-fact kind=${fact.kind} ${provenance.note}`,
      recordText: fact.summary,
    });
  });
}

function causalProcessNode(record: CausalProcessRecord): TraceNode {
  const provenance = readCausalProvenance(record.provenance, "provenance");
  return createTraceNode({
    id: record.id,
    family: "history.causalProcesses",
    recordClass: "causal-process",
    truthOrigin: provenance.truthOrigin,
    stableKey: record.stableKey,
    sequence: record.sequence,
    occurredAt: record.effectiveAt,
    recordedAt: record.recordedAt,
    entityRefs: [
      ...entityRefsFromIds("sourceEntityIds", record.sourceEntityIds),
      ...provenance.entityRefs,
    ],
    links: linksFromIds(
      "causal-parent",
      "parentCausalIds",
      record.parentCausalIds,
    ),
    unrecordedLinks: [
      ...(record.parentCausalIds.length === 0
        ? [
            {
              kind: "causal-parent" as const,
              role: "parentCausalIds",
              note: "Root causal process: no parent causal record was recorded.",
            },
          ]
        : []),
      ...provenance.unrecordedLinks,
    ],
    developmentSummary: `causal-process kind=${record.kind} parents=${record.parentCausalIds.length} ${provenance.note}`,
    recordText: null,
  });
}

function effectActivationNode(record: EffectActivationRecord): TraceNode {
  return createTraceNode({
    id: record.id,
    family: "history.effectActivations",
    recordClass: "effect-activation",
    truthOrigin: "simulated",
    stableKey: record.stableKey,
    sequence: record.sequence,
    occurredAt: record.activatedAt,
    recordedAt: record.recordedAt,
    entityRefs: [
      {
        role: "mechanismDefinitionId",
        entityId: record.mechanismDefinitionId,
      },
      { role: "targetMetricId", entityId: record.targetMetricId },
      ...entityRefsFromIds("sourceEntityIds", record.sourceEntityIds),
    ],
    links: [
      {
        kind: "causal-parent",
        role: "causalProcessId",
        targetId: record.causalProcessId,
      },
    ],
    unrecordedLinks: [],
    developmentSummary: `effect-activation realization=${record.realizationKind} direction=${record.direction} onsetAt=${record.onsetAt} maturesAt=${record.maturesAt}`,
    recordText: null,
  });
}

function claimNode(record: ClaimRecord): TraceNode {
  const provenance = readClaimProvenance(record.provenance);
  return createTraceNode({
    id: record.id,
    family: "history.claims",
    recordClass: "spoken-claim",
    truthOrigin: provenance.truthOrigin,
    stableKey: record.stableKey,
    sequence: record.sequence,
    occurredAt: record.madeAt,
    recordedAt: record.madeAt,
    entityRefs: [
      { role: "speakerPersonId", entityId: record.speakerPersonId },
      ...provenance.entityRefs,
    ],
    links: [
      {
        kind: "causal-parent",
        role: "eventId",
        targetId: record.eventId,
      },
      ...provenance.links,
    ],
    unrecordedLinks: provenance.unrecordedLinks,
    developmentSummary: `spoken-claim audience=${record.audience} relationshipToTruth=${record.relationshipToTruth} ${provenance.note}`,
    recordText: record.statement,
  });
}

function knowledgeNode(record: EventKnowledgeRecord): TraceNode {
  const source = readKnowledgeSource(record.source);
  return createTraceNode({
    id: record.id,
    family: "history.knowledge",
    recordClass: "knowledge-received",
    truthOrigin: source.truthOrigin,
    stableKey: record.stableKey,
    sequence: record.sequence,
    occurredAt: record.learnedAt,
    recordedAt: record.learnedAt,
    entityRefs: [
      { role: "personId", entityId: record.personId },
      ...source.entityRefs,
    ],
    links: [
      { kind: "causal-parent", role: "eventId", targetId: record.eventId },
      ...source.links,
    ],
    unrecordedLinks: source.unrecordedLinks,
    developmentSummary: `knowledge-received accuracy=${record.accuracy} confidence=${record.confidence} ${source.note}`,
    recordText: record.believedSummary,
  });
}

function memoryNode(record: MemoryRecord): TraceNode {
  const supersedes = optionalLink(
    "supersedes",
    "supersedesMemoryId",
    record.supersedesMemoryId,
    "This memory supersedes no earlier memory.",
  );
  return createTraceNode({
    id: record.id,
    family: "history.memories",
    recordClass: "memory",
    truthOrigin: "simulated",
    stableKey: record.stableKey,
    sequence: record.sequence,
    occurredAt: record.formedAt,
    recordedAt: record.formedAt,
    entityRefs: [{ role: "personId", entityId: record.personId }],
    links: [
      { kind: "causal-parent", role: "eventId", targetId: record.eventId },
      ...supersedes.links,
    ],
    unrecordedLinks: supersedes.unrecordedLinks,
    developmentSummary: `memory strength=${record.strength} tags=${record.relevanceTags.join("|")}`,
    recordText: record.rememberedSummary,
  });
}

function perceptionNode(record: PerceptionRecord): TraceNode {
  const source = readPerceptionSource(record.source);
  const supersedes = optionalLink(
    "supersedes",
    "supersedesPerceptionId",
    record.supersedesPerceptionId,
    "This perception supersedes no earlier perception.",
  );
  return createTraceNode({
    id: record.id,
    family: "history.perceptions",
    recordClass: "perception",
    truthOrigin: source.truthOrigin,
    stableKey: record.stableKey,
    sequence: record.sequence,
    occurredAt: record.perceivedAt,
    recordedAt: record.perceivedAt,
    entityRefs: [
      { role: "personId", entityId: record.personId },
      ...(record.subjectEntityId === null
        ? []
        : [{ role: "subjectEntityId", entityId: record.subjectEntityId }]),
      ...source.entityRefs,
    ],
    links: [...source.links, ...supersedes.links],
    unrecordedLinks: [
      ...source.unrecordedLinks,
      ...supersedes.unrecordedLinks,
      ...(record.subjectEntityId === null
        ? [
            {
              kind: "source-record" as const,
              role: "subjectEntityId",
              note: "The perception subject is a key rather than an entity id.",
            },
          ]
        : []),
    ],
    developmentSummary: `perception subjectKind=${record.subjectKind} subjectKey=${record.subjectKey} confidence=${record.confidence} credibility=${record.sourceCredibility} ${source.note}`,
    recordText: record.assertion,
  });
}

function privateBeliefNode(record: PrivateBeliefRecord): TraceNode {
  const formation = readFormationContext(record.formation);
  const supersedes = optionalLink(
    "supersedes",
    "supersedesBeliefId",
    record.supersedesBeliefId,
    "This belief supersedes no earlier belief.",
  );
  return createTraceNode({
    id: record.id,
    family: "history.privateBeliefs",
    recordClass: "private-belief",
    truthOrigin: formation.truthOrigin,
    stableKey: record.stableKey,
    sequence: record.sequence,
    occurredAt: record.formedAt,
    recordedAt: record.formedAt,
    entityRefs: [
      { role: "personId", entityId: record.personId },
      { role: "propositionId", entityId: record.propositionId },
    ],
    links: [...formation.links, ...supersedes.links],
    unrecordedLinks: [
      ...formation.unrecordedLinks,
      ...supersedes.unrecordedLinks,
    ],
    developmentSummary: `private-belief position=${record.position} conviction=${record.conviction} salience=${record.salience} ${formation.note}`,
    recordText: record.rationale,
  });
}

function principleNode(record: PrincipleRecord): TraceNode {
  const formation = readFormationContext(record.formation);
  const supersedes = optionalLink(
    "supersedes",
    "supersedesPrincipleRecordId",
    record.supersedesPrincipleRecordId,
    "This principle supersedes no earlier principle record.",
  );
  return createTraceNode({
    id: record.id,
    family: "history.principles",
    recordClass: "mind-state",
    truthOrigin: formation.truthOrigin,
    stableKey: record.stableKey,
    sequence: record.sequence,
    occurredAt: record.formedAt,
    recordedAt: record.formedAt,
    entityRefs: [
      { role: "personId", entityId: record.personId },
      { role: "principleId", entityId: record.principleId },
    ],
    links: [...formation.links, ...supersedes.links],
    unrecordedLinks: [
      ...formation.unrecordedLinks,
      ...supersedes.unrecordedLinks,
    ],
    developmentSummary: `principle stance=${record.stance} conviction=${record.conviction} ${formation.note}`,
    recordText: record.qualification,
  });
}

function publicPositionNode(record: PublicPositionRecord): TraceNode {
  const sourceEvent = optionalLink(
    "causal-parent",
    "sourceEventId",
    record.sourceEventId,
    "The stated position records no source event.",
  );
  const supersedes = optionalLink(
    "supersedes",
    "supersedesPublicPositionId",
    record.supersedesPublicPositionId,
    "This position supersedes no earlier position.",
  );
  return createTraceNode({
    id: record.id,
    family: "history.publicPositions",
    recordClass: "public-position",
    truthOrigin: "simulated",
    stableKey: record.stableKey,
    sequence: record.sequence,
    occurredAt: record.statedAt,
    recordedAt: record.statedAt,
    entityRefs: [
      { role: "personId", entityId: record.personId },
      { role: "propositionId", entityId: record.propositionId },
    ],
    links: [...sourceEvent.links, ...supersedes.links],
    unrecordedLinks: [
      ...sourceEvent.unrecordedLinks,
      ...supersedes.unrecordedLinks,
    ],
    developmentSummary: `public-position stance=${record.stance} audience=${record.audience} venue=${record.venue ?? "unrecorded"}`,
    recordText: record.statement,
  });
}

function campaignCommitmentNode(record: CampaignCommitmentRecord): TraceNode {
  const sourceEvent = optionalLink(
    "causal-parent",
    "sourceEventId",
    record.sourceEventId,
    "The commitment records no source event.",
  );
  const supersedes = optionalLink(
    "supersedes",
    "supersedesCommitmentId",
    record.supersedesCommitmentId,
    "This commitment supersedes no earlier commitment.",
  );
  return createTraceNode({
    id: record.id,
    family: "history.campaignCommitments",
    recordClass: "commitment",
    truthOrigin: "simulated",
    stableKey: record.stableKey,
    sequence: record.sequence,
    occurredAt: record.madeAt,
    recordedAt: record.madeAt,
    entityRefs: [
      { role: "personId", entityId: record.personId },
      { role: "propositionId", entityId: record.propositionId },
    ],
    links: [...sourceEvent.links, ...supersedes.links],
    unrecordedLinks: [
      ...sourceEvent.unrecordedLinks,
      ...supersedes.unrecordedLinks,
    ],
    developmentSummary: `commitment stance=${record.stance} level=${record.level}`,
    recordText: record.statement,
  });
}

function propositionExposureNode(record: PropositionExposureRecord): TraceNode {
  const provenance = readExposureProvenance(record.provenance);
  return createTraceNode({
    id: record.id,
    family: "history.propositionExposures",
    recordClass: "knowledge-received",
    truthOrigin: provenance.truthOrigin,
    stableKey: record.stableKey,
    sequence: record.sequence,
    occurredAt: record.encounteredAt,
    recordedAt: record.encounteredAt,
    entityRefs: [
      { role: "personId", entityId: record.personId },
      { role: "propositionId", entityId: record.propositionId },
      ...provenance.entityRefs,
    ],
    links: provenance.links,
    unrecordedLinks: provenance.unrecordedLinks,
    developmentSummary: `proposition-exposure ${provenance.note}`,
    recordText: record.summary,
  });
}

function subjectKnowledgeNode(record: SubjectKnowledgeRecord): TraceNode {
  const provenance = readSubjectKnowledgeProvenance(record.provenance);
  const supersedes = optionalLink(
    "supersedes",
    "supersedesKnowledgeId",
    record.supersedesKnowledgeId,
    "This subject-knowledge record supersedes no earlier record.",
  );
  return createTraceNode({
    id: record.id,
    family: "history.subjectKnowledge",
    recordClass: "mind-state",
    truthOrigin: provenance.truthOrigin,
    stableKey: record.stableKey,
    sequence: record.sequence,
    occurredAt: record.recordedAt,
    recordedAt: record.recordedAt,
    entityRefs: [
      { role: "personId", entityId: record.personId },
      { role: "subjectId", entityId: record.subjectId },
      ...provenance.entityRefs,
    ],
    links: [...provenance.links, ...supersedes.links],
    unrecordedLinks: [
      ...provenance.unrecordedLinks,
      ...supersedes.unrecordedLinks,
    ],
    developmentSummary: `subject-knowledge familiarity=${record.familiarity} expertise=${record.expertise} ${provenance.note}`,
    recordText: null,
  });
}

function personalityTendencyNode(record: PersonalityTendencyRecord): TraceNode {
  const provenance = readMindProvenance(record.provenance, "provenance");
  const supersedes = optionalLink(
    "supersedes",
    "supersedesTendencyId",
    record.supersedesTendencyId,
    "This tendency record supersedes no earlier record.",
  );
  return createTraceNode({
    id: record.id,
    family: "history.personalityTendencies",
    recordClass: "mind-state",
    truthOrigin: provenance.truthOrigin,
    stableKey: record.stableKey,
    sequence: record.sequence,
    occurredAt: record.recordedAt,
    recordedAt: record.recordedAt,
    entityRefs: [
      { role: "personId", entityId: record.personId },
      { role: "tendencyId", entityId: record.tendencyId },
    ],
    links: [...provenance.links, ...supersedes.links],
    unrecordedLinks: [
      ...provenance.unrecordedLinks,
      ...supersedes.unrecordedLinks,
    ],
    developmentSummary: `personality-tendency expression=${record.expressionKey} strength=${record.strength} ${provenance.note}`,
    recordText: null,
  });
}

function personalValueNode(record: PersonalValueRecord): TraceNode {
  const provenance = readMindProvenance(record.provenance, "provenance");
  const supersedes = optionalLink(
    "supersedes",
    "supersedesValueId",
    record.supersedesValueId,
    "This value record supersedes no earlier record.",
  );
  return createTraceNode({
    id: record.id,
    family: "history.personalValues",
    recordClass: "mind-state",
    truthOrigin: provenance.truthOrigin,
    stableKey: record.stableKey,
    sequence: record.sequence,
    occurredAt: record.recordedAt,
    recordedAt: record.recordedAt,
    entityRefs: [
      { role: "personId", entityId: record.personId },
      { role: "valueId", entityId: record.valueId },
    ],
    links: [...provenance.links, ...supersedes.links],
    unrecordedLinks: [
      ...provenance.unrecordedLinks,
      ...supersedes.unrecordedLinks,
    ],
    developmentSummary: `personal-value orientation=${record.orientation} strength=${record.strength} ${provenance.note}`,
    recordText: record.qualification,
  });
}

function goalStateNode(record: GoalStateRecord): TraceNode {
  const provenance = readMindProvenance(record.provenance, "provenance");
  const supersedes = optionalLink(
    "supersedes",
    "replacesGoalId",
    record.replacesGoalId,
    "This goal state replaces no earlier goal.",
  );
  return createTraceNode({
    id: record.id,
    family: "history.goalStates",
    recordClass: "mind-state",
    truthOrigin: provenance.truthOrigin,
    stableKey: record.stableKey,
    sequence: record.sequence,
    occurredAt: record.createdAt,
    recordedAt: record.recordedAt,
    entityRefs: [
      { role: "personId", entityId: record.personId },
      { role: "goalId", entityId: record.goalId },
      ...(record.targetEntityId === null
        ? []
        : [{ role: "targetEntityId", entityId: record.targetEntityId }]),
    ],
    links: [...provenance.links, ...supersedes.links],
    unrecordedLinks: [
      ...provenance.unrecordedLinks,
      ...supersedes.unrecordedLinks,
    ],
    developmentSummary: `goal-state status=${record.status} priority=${record.priority} goalKey=${record.goalKey} ${provenance.note}`,
    recordText: record.objective,
  });
}

function appraisalNode(record: AppraisalRecord): TraceNode {
  const provenance = readMindProvenance(record.provenance, "provenance");
  const memory = optionalLink(
    "source-record",
    "memoryId",
    record.memoryId,
    "The appraisal records no memory it worked from.",
  );
  const knowledge = optionalLink(
    "source-record",
    "eventKnowledgeId",
    record.eventKnowledgeId,
    "The appraisal records no event-knowledge record it worked from.",
  );
  const supersedes = optionalLink(
    "supersedes",
    "supersedesAppraisalId",
    record.supersedesAppraisalId,
    "This appraisal supersedes no earlier appraisal.",
  );
  return createTraceNode({
    id: record.id,
    family: "history.appraisals",
    recordClass: "mind-state",
    truthOrigin: provenance.truthOrigin,
    stableKey: record.stableKey,
    sequence: record.sequence,
    occurredAt: record.appraisedAt,
    recordedAt: record.appraisedAt,
    entityRefs: [
      { role: "personId", entityId: record.personId },
      ...entityRefsFromIds("involvedPersonIds", record.involvedPersonIds),
    ],
    links: [
      { kind: "causal-parent", role: "eventId", targetId: record.eventId },
      ...memory.links,
      ...knowledge.links,
      ...provenance.links,
      ...supersedes.links,
    ],
    unrecordedLinks: [
      ...memory.unrecordedLinks,
      ...knowledge.unrecordedLinks,
      ...provenance.unrecordedLinks,
      ...supersedes.unrecordedLinks,
    ],
    developmentSummary: `appraisal meanings=${record.meanings.length} confidence=${record.confidence} ${provenance.note}`,
    recordText: record.interpretation,
  });
}

function temporaryStateNode(record: TemporaryStateRecord): TraceNode {
  const provenance = readMindProvenance(record.provenance, "provenance");
  return createTraceNode({
    id: record.id,
    family: "history.temporaryStates",
    recordClass: "mind-state",
    truthOrigin: provenance.truthOrigin,
    stableKey: record.stableKey,
    sequence: record.sequence,
    occurredAt: record.startsAt,
    recordedAt: record.recordedAt,
    entityRefs: [{ role: "personId", entityId: record.personId }],
    links: provenance.links,
    unrecordedLinks: provenance.unrecordedLinks,
    developmentSummary: `temporary-state key=${record.stateKey} intensity=${record.intensity} endsAt=${record.endsAt} ${provenance.note}`,
    recordText: record.label,
  });
}

function relationshipInteractionNode(
  record: RelationshipInteraction,
): TraceNode {
  const sourceEvent = optionalLink(
    "causal-parent",
    "eventId",
    record.eventId,
    "The interaction was recorded without a source event.",
  );
  return createTraceNode({
    id: record.id,
    family: "history.relationshipInteractions",
    recordClass: "relationship-change",
    truthOrigin: "simulated",
    stableKey: record.stableKey,
    sequence: record.sequence,
    occurredAt: record.occurredAt,
    recordedAt: record.occurredAt,
    entityRefs: entityRefsFromIds("personIds", record.personIds),
    links: sourceEvent.links,
    unrecordedLinks: sourceEvent.unrecordedLinks,
    developmentSummary: `relationship-change kind=${record.kind} change=${record.change} significance=${record.significance}`,
    recordText: record.summary,
  });
}

/**
 * A decision trace carries two different kinds of link and they are worth
 * keeping apart: the perceptions the decision was allowed to consult, and the
 * snapshots of whatever each consideration actually cited. Collapsing them
 * would lose the distinction between what was available and what was used.
 */
function decisionTraceNode(record: DecisionTraceRecord): TraceNode {
  const considerationLinks = record.context.considerations.flatMap(
    (consideration, index) =>
      mindSourceLinks(
        `context.considerations[${index}].sourceRefs`,
        consideration.sourceRefs,
      ),
  );
  const constraintLinks = record.context.constraints.flatMap(
    (constraint, index) =>
      mindSourceLinks(
        `context.constraints[${index}].sourceRefs`,
        constraint.sourceRefs,
      ),
  );
  const snapshotLinks = record.sourceSnapshots.map((snapshot, index) => ({
    kind: "source-record" as const,
    role: `sourceSnapshots[${index}].${snapshot.reference.kind}`,
    targetId: mindSourceTarget(snapshot.reference),
  }));
  const perceptionLinks = linksFromIds(
    "source-record",
    "context.perceptionIds",
    record.context.perceptionIds,
  );
  const unrecordedLinks: TraceUnrecordedLink[] = [];
  if (record.context.perceptionIds.length === 0) {
    unrecordedLinks.push({
      kind: "source-record",
      role: "context.perceptionIds",
      note: "The decision context consulted no perception ids.",
    });
  }
  if (record.sourceSnapshots.length === 0) {
    unrecordedLinks.push({
      kind: "source-record",
      role: "sourceSnapshots",
      note: "No consideration or constraint cited a source record.",
    });
  }
  return createTraceNode({
    id: record.id,
    family: "history.decisionTraces",
    recordClass: "decision-trace",
    truthOrigin: "simulated",
    stableKey: record.stableKey,
    sequence: record.sequence,
    occurredAt: record.context.cutoff.asOfDate,
    recordedAt: record.recordedAt,
    entityRefs: [
      { role: "context.actorPersonId", entityId: record.context.actorPersonId },
      { role: "decisionId", entityId: record.decisionId },
      ...(record.context.subject.entityId === null
        ? []
        : [
            {
              role: "context.subject.entityId",
              entityId: record.context.subject.entityId,
            },
          ]),
    ],
    links: [
      ...perceptionLinks,
      ...considerationLinks,
      ...constraintLinks,
      ...snapshotLinks,
    ],
    unrecordedLinks,
    developmentSummary: `decision-trace type=${record.context.decisionType} outcome=${record.outcomeKind} selected=${record.selectedOptionKey ?? "none"} cutoffSequence=${record.context.cutoff.historySequenceExclusive}`,
    recordText: null,
  });
}

function incidentNode(record: IncidentRecord): TraceNode {
  const provenance = readCausalProvenance(record.provenance, "provenance");
  return createTraceNode({
    id: record.id,
    family: "history.incidents",
    recordClass: "incident",
    truthOrigin: provenance.truthOrigin,
    stableKey: record.stableKey,
    sequence: record.sequence,
    occurredAt: record.onsetAt,
    recordedAt: record.recordedAt,
    entityRefs: [
      { role: "definitionId", entityId: record.definitionId },
      ...provenance.entityRefs,
    ],
    links: [
      {
        kind: "causal-parent",
        role: "rootCausalProcessId",
        targetId: record.rootCausalProcessId,
      },
      {
        kind: "causal-parent",
        role: "onsetEventId",
        targetId: record.onsetEventId,
      },
      ...provenance.links,
    ],
    unrecordedLinks: provenance.unrecordedLinks,
    developmentSummary: `incident kind=${record.incidentKind} ${provenance.note}`,
    recordText: null,
  });
}

function incidentStateNode(record: IncidentStateRecord): TraceNode {
  const provenance = readCausalProvenance(record.provenance, "provenance");
  const supersedes = optionalLink(
    "supersedes",
    "supersedesStateId",
    record.supersedesStateId,
    "This incident state supersedes no earlier state.",
  );
  return createTraceNode({
    id: record.id,
    family: "history.incidentStates",
    recordClass: "incident-state",
    truthOrigin: provenance.truthOrigin,
    stableKey: record.stableKey,
    sequence: record.sequence,
    occurredAt: record.effectiveAt,
    recordedAt: record.effectiveAt,
    entityRefs: provenance.entityRefs,
    links: [
      {
        kind: "causal-parent",
        role: "incidentId",
        targetId: record.incidentId,
      },
      { kind: "causal-parent", role: "eventId", targetId: record.eventId },
      ...provenance.links,
      ...supersedes.links,
    ],
    unrecordedLinks: [
      ...provenance.unrecordedLinks,
      ...supersedes.unrecordedLinks,
    ],
    developmentSummary: `incident-state status=${record.status} phase=${record.phaseKey} reason=${record.reasonKey ?? "unrecorded"} ${provenance.note}`,
    recordText: record.context,
  });
}

function evidenceArtifactNode(record: EvidenceArtifactRecord): TraceNode {
  const provenance = readEvidenceProvenance(record.provenance);
  return createTraceNode({
    id: record.id,
    family: "history.evidenceArtifacts",
    recordClass: "evidence-artifact",
    truthOrigin: provenance.truthOrigin,
    stableKey: record.stableKey,
    sequence: record.sequence,
    occurredAt: record.createdAt,
    recordedAt: record.recordedAt,
    entityRefs: [
      ...entityRefsFromIds("relatedEntityIds", record.relatedEntityIds),
      ...provenance.entityRefs,
    ],
    links: provenance.links,
    unrecordedLinks: provenance.unrecordedLinks,
    developmentSummary: `evidence-artifact kind=${record.evidenceKind} access=${record.access} ${provenance.note}`,
    recordText: record.description,
  });
}

function evidenceDiscoveryNode(record: EvidenceDiscoveryRecord): TraceNode {
  const provenance = readEvidenceProvenance(record.provenance);
  return createTraceNode({
    id: record.id,
    family: "history.evidenceDiscoveries",
    recordClass: "evidence-discovery",
    truthOrigin: provenance.truthOrigin,
    stableKey: record.stableKey,
    sequence: record.sequence,
    occurredAt: record.discoveredAt,
    recordedAt: record.recordedAt,
    entityRefs: [
      { role: "personId", entityId: record.personId },
      ...provenance.entityRefs,
    ],
    links: [
      {
        kind: "causal-parent",
        role: "evidenceArtifactId",
        targetId: record.evidenceArtifactId,
      },
      {
        kind: "causal-parent",
        role: "discoveryEventId",
        targetId: record.discoveryEventId,
      },
      ...provenance.links,
    ],
    unrecordedLinks: provenance.unrecordedLinks,
    developmentSummary: `evidence-discovery method=${record.methodKey} ${provenance.note}`,
    recordText: null,
  });
}

function futureDueItemNode(record: FutureDueItem): TraceNode {
  const provenance = readFutureProvenance(record.provenance);
  return createTraceNode({
    id: record.id,
    family: "history.futureDueItems",
    recordClass: "scheduled-transition",
    truthOrigin: provenance.truthOrigin,
    stableKey: record.stableKey,
    sequence: record.sequence,
    occurredAt: record.scheduledAt,
    recordedAt: record.scheduledAt,
    entityRefs: [
      ...entityRefsFromIds("entityIds", record.entityIds),
      ...(record.jurisdictionId === null
        ? []
        : [{ role: "jurisdictionId", entityId: record.jurisdictionId }]),
      ...provenance.entityRefs,
    ],
    links: provenance.links,
    unrecordedLinks: provenance.unrecordedLinks,
    developmentSummary: `scheduled-transition transitionKey=${record.transitionKey} dueAt=${record.dueAt} ${provenance.note}`,
    recordText: null,
  });
}

function futureDueItemStateNode(record: FutureDueItemStateRecord): TraceNode {
  const outcome = optionalLink(
    "outcome",
    "outcomeEventId",
    record.outcomeEventId,
    "This schedule state records no outcome event.",
  );
  const supersedes = optionalLink(
    "supersedes",
    "supersedesStateId",
    record.supersedesStateId,
    "This schedule state supersedes no earlier state.",
  );
  return createTraceNode({
    id: record.id,
    family: "history.futureDueItemStates",
    recordClass: "scheduled-transition-state",
    truthOrigin: "simulated",
    stableKey: record.stableKey,
    sequence: record.sequence,
    occurredAt: record.effectiveAt,
    recordedAt: record.effectiveAt,
    entityRefs: [],
    links: [
      { kind: "causal-parent", role: "dueItemId", targetId: record.dueItemId },
      ...outcome.links,
      ...supersedes.links,
    ],
    unrecordedLinks: [
      ...outcome.unrecordedLinks,
      ...supersedes.unrecordedLinks,
    ],
    developmentSummary: `scheduled-transition-state status=${record.status} reason=${record.reasonKey ?? "unrecorded"}`,
    recordText: record.context,
  });
}

// ---------------------------------------------------------------------------
// The built-in registry
// ---------------------------------------------------------------------------

function source<T>(
  key: string,
  family: string,
  declaredClass: TraceSource["declaredClass"],
  read: (world: World) => readonly T[],
  project: (record: T) => TraceNode,
): TraceSource {
  return {
    key,
    family,
    declaredClass,
    collect: (world) => read(world).map(project),
  };
}

/**
 * Every record family the accepted architecture already links.
 *
 * Families that carry no cross-record references at all are deliberately left
 * out rather than added as isolated nodes: an inspector full of records that
 * can never appear in a trace makes the ones that can harder to find. A later
 * packet that needs one registers it.
 */
export const BUILT_IN_TRACE_SOURCES: readonly TraceSource[] = [
  source(
    "history.events",
    "history.events",
    "canonical-event",
    (world) => world.history.events,
    eventNode,
  ),
  {
    key: "people.facts",
    family: "people.facts",
    declaredClass: "person-fact",
    collect: (world) =>
      world.personOrder.flatMap((personId) => {
        const person = world.people[personId];
        return person ? personFactNodes(person) : [];
      }),
  },
  source(
    "history.causalProcesses",
    "history.causalProcesses",
    "causal-process",
    (world) => world.history.causalProcesses,
    causalProcessNode,
  ),
  source(
    "history.effectActivations",
    "history.effectActivations",
    "effect-activation",
    (world) => world.history.effectActivations,
    effectActivationNode,
  ),
  source(
    "history.claims",
    "history.claims",
    "spoken-claim",
    (world) => world.history.claims,
    claimNode,
  ),
  source(
    "history.knowledge",
    "history.knowledge",
    "knowledge-received",
    (world) => world.history.knowledge,
    knowledgeNode,
  ),
  source(
    "history.memories",
    "history.memories",
    "memory",
    (world) => world.history.memories,
    memoryNode,
  ),
  source(
    "history.perceptions",
    "history.perceptions",
    "perception",
    (world) => world.history.perceptions,
    perceptionNode,
  ),
  source(
    "history.privateBeliefs",
    "history.privateBeliefs",
    "private-belief",
    (world) => world.history.privateBeliefs,
    privateBeliefNode,
  ),
  source(
    "history.principles",
    "history.principles",
    "mind-state",
    (world) => world.history.principles,
    principleNode,
  ),
  source(
    "history.publicPositions",
    "history.publicPositions",
    "public-position",
    (world) => world.history.publicPositions,
    publicPositionNode,
  ),
  source(
    "history.campaignCommitments",
    "history.campaignCommitments",
    "commitment",
    (world) => world.history.campaignCommitments,
    campaignCommitmentNode,
  ),
  source(
    "history.propositionExposures",
    "history.propositionExposures",
    "knowledge-received",
    (world) => world.history.propositionExposures,
    propositionExposureNode,
  ),
  source(
    "history.subjectKnowledge",
    "history.subjectKnowledge",
    "mind-state",
    (world) => world.history.subjectKnowledge,
    subjectKnowledgeNode,
  ),
  source(
    "history.personalityTendencies",
    "history.personalityTendencies",
    "mind-state",
    (world) => world.history.personalityTendencies,
    personalityTendencyNode,
  ),
  source(
    "history.personalValues",
    "history.personalValues",
    "mind-state",
    (world) => world.history.personalValues,
    personalValueNode,
  ),
  source(
    "history.goalStates",
    "history.goalStates",
    "mind-state",
    (world) => world.history.goalStates,
    goalStateNode,
  ),
  source(
    "history.appraisals",
    "history.appraisals",
    "mind-state",
    (world) => world.history.appraisals,
    appraisalNode,
  ),
  source(
    "history.temporaryStates",
    "history.temporaryStates",
    "mind-state",
    (world) => world.history.temporaryStates,
    temporaryStateNode,
  ),
  source(
    "history.relationshipInteractions",
    "history.relationshipInteractions",
    "relationship-change",
    (world) => world.history.relationshipInteractions,
    relationshipInteractionNode,
  ),
  source(
    "history.decisionTraces",
    "history.decisionTraces",
    "decision-trace",
    (world) => world.history.decisionTraces,
    decisionTraceNode,
  ),
  source(
    "history.incidents",
    "history.incidents",
    "incident",
    (world) => world.history.incidents,
    incidentNode,
  ),
  source(
    "history.incidentStates",
    "history.incidentStates",
    "incident-state",
    (world) => world.history.incidentStates,
    incidentStateNode,
  ),
  source(
    "history.evidenceArtifacts",
    "history.evidenceArtifacts",
    "evidence-artifact",
    (world) => world.history.evidenceArtifacts,
    evidenceArtifactNode,
  ),
  source(
    "history.evidenceDiscoveries",
    "history.evidenceDiscoveries",
    "evidence-discovery",
    (world) => world.history.evidenceDiscoveries,
    evidenceDiscoveryNode,
  ),
  source(
    "history.futureDueItems",
    "history.futureDueItems",
    "scheduled-transition",
    (world) => world.history.futureDueItems,
    futureDueItemNode,
  ),
  source(
    "history.futureDueItemStates",
    "history.futureDueItemStates",
    "scheduled-transition-state",
    (world) => world.history.futureDueItemStates,
    futureDueItemStateNode,
  ),
];

export function defaultTraceSourceRegistry() {
  return createTraceSourceRegistry(BUILT_IN_TRACE_SOURCES);
}

/**
 * Exported for tests that assert the mind-source mapping stays total: every
 * reference variant the simulation can record has to resolve to exactly one
 * record id here, or a whole class of links would silently vanish from traces.
 */
export { mindSourceTarget };
