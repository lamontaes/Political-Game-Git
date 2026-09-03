import { describe, expect, it } from "vitest";

import {
  addDays,
  assertWorldIntegrity,
  createDemoWorld,
  createExactQuantity,
  createStableId,
  deserializeWorld,
  evaluateIncident,
  evidenceArtifactAt,
  evidenceArtifactsRelatedToEntityAt,
  evidenceDiscoveryHistory,
  hasPersonDiscoveredEvidenceAt,
  makeIsoDate,
  recordActorInitiatedIncident,
  recordEvidenceArtifact,
  recordEvidenceDiscovery,
  recordPersonDeath,
  recordWorldEvent,
  serializeWorld,
} from "./index";
import type {
  EntityId,
  EvidenceAccess,
  EvidenceArtifactRecord,
  EvidenceRecordProvenance,
  EvidenceSemanticKey,
  HistoricalCutoff,
  HistoricalEvent,
  IncidentDefinition,
  IncidentRecord,
  World,
} from "./index";

const AUTHORED = {
  kind: "authored" as const,
  note: "Run E evidence fixture.",
};

interface SourceFixture {
  readonly world: World;
  readonly sourceEvent: HistoricalEvent;
  readonly incident: IncidentRecord;
  readonly discovererId: EntityId;
  readonly otherPersonId: EntityId;
}

function cutoff(
  world: World,
  asOfDate = world.currentDate,
  historySequenceExclusive = world.history.nextSequence,
): HistoricalCutoff {
  return { asOfDate, historySequenceExclusive };
}

function civicDefinition(world: World): IncidentDefinition {
  const definition = world.incidentCatalog.definitionOrder
    .map((id) => world.incidentCatalog.definitions[id])
    .find(
      (candidate) =>
        candidate?.stableKey === "incident.actor-initiated-civic-occurrence",
    );
  if (!definition) throw new Error("Missing civic incident fixture.");
  return definition;
}

function sourceFixture(seed: string): SourceFixture {
  let world = createDemoWorld(seed);
  world = recordWorldEvent(world, {
    stableKey: "run-e:evidence-source-event",
    type: "civic.record-created",
    occurredAt: world.currentDate,
    recordedAt: world.currentDate,
    jurisdictionId: world.jurisdictionOrder[0]!,
    involvedEntityIds: [world.id, world.jurisdictionOrder[0]!],
    participants: [],
    personFactConstraints: [],
    visibility: "limited",
    tags: ["evidence.source"],
    summary: "A bounded objective source event occurred.",
    context: {
      location: null,
      socialContext: null,
      pressure: null,
      choice: null,
      motivation: null,
      immediateReaction: null,
    },
  });
  const sourceEvent = world.history.events.at(-1);
  if (!sourceEvent) throw new Error("Missing source event fixture.");

  const definition = civicDefinition(world);
  const actorPersonId = world.personOrder[2]!;
  const evaluation = evaluateIncident(world, {
    definitionId: definition.id,
    evaluationKey: "run-e:evidence-incident-evaluation",
    scope: {
      jurisdictionId: world.jurisdictionOrder[0]!,
      segmentKey: null,
    },
    evaluatedAt: world.currentDate,
    cutoff: cutoff(world),
    exposure: createExactQuantity(1, 1, "rate:share"),
    vulnerability: createExactQuantity(1, 1, "rate:share"),
    resilience: createExactQuantity(0, 1, "rate:share"),
    consequences: [],
  });
  world = recordActorInitiatedIncident(world, {
    stableKey: "run-e:evidence-incident",
    evaluation,
    actorPersonId,
    summary: "A bounded civic incident supplied objective source truth.",
    visibility: "limited",
  });
  const incident = world.history.incidents.at(-1);
  if (!incident) throw new Error("Missing incident fixture.");
  return {
    world,
    sourceEvent,
    incident,
    discovererId: world.personOrder[0]!,
    otherPersonId: world.personOrder[1]!,
  };
}

function addArtifact(
  fixture: SourceFixture,
  overrides: Partial<{
    readonly stableKey: string;
    readonly evidenceKind: EvidenceSemanticKey;
    readonly createdAt: string;
    readonly recordedAt: string;
    readonly relatedEntityIds: readonly EntityId[];
    readonly access: EvidenceAccess;
    readonly description: string | null;
    readonly provenance: EvidenceRecordProvenance;
  }> = {},
): { readonly world: World; readonly artifact: EvidenceArtifactRecord } {
  const world = recordEvidenceArtifact(fixture.world, {
    stableKey: overrides.stableKey ?? "run-e:objective-artifact",
    evidenceKind: overrides.evidenceKind ?? "record:civic-log",
    createdAt: overrides.createdAt ?? fixture.world.currentDate,
    recordedAt: overrides.recordedAt ?? fixture.world.currentDate,
    relatedEntityIds: overrides.relatedEntityIds ?? [
      fixture.sourceEvent.id,
      fixture.incident.id,
    ],
    access: overrides.access ?? "public",
    description:
      overrides.description === undefined
        ? "A durable civic log entry."
        : overrides.description,
    provenance: overrides.provenance ?? {
      kind: "simulated",
      sourceEntityIds: [fixture.sourceEvent.id, fixture.incident.id],
    },
  });
  const artifact = world.history.evidenceArtifacts.at(-1);
  if (!artifact) throw new Error("Missing evidence artifact fixture.");
  return { world, artifact };
}

function addDiscovery(
  world: World,
  artifact: EvidenceArtifactRecord,
  personId: EntityId,
  stableKey = "run-e:artifact-discovery",
): World {
  return recordEvidenceDiscovery(world, {
    stableKey,
    personId,
    evidenceArtifactId: artifact.id,
    discoveredAt: world.currentDate,
    recordedAt: world.currentDate,
    methodKey: "review:direct-inspection",
    provenance: {
      kind: "simulated",
      sourceEntityIds: [artifact.id],
    },
  });
}

function serializeUnchecked(world: World): string {
  const payload = JSON.stringify(world);
  return JSON.stringify({
    format: "political-life-world",
    formatVersion: 15,
    snapshotId: createStableId("snapshot", payload),
    worldId: world.id,
    savedAtWorldDate: world.currentDate,
    world,
  });
}

function expectIntegrityFailure(world: World, pattern: RegExp): void {
  expect(() => assertWorldIntegrity(world)).toThrow(pattern);
  expect(() => deserializeWorld(serializeUnchecked(world))).toThrow(pattern);
}

describe("Stage 6 Run E objective evidence and explicit discovery", () => {
  it("persists a public objective artifact related to event and incident truth without granting knowledge", () => {
    const fixture = sourceFixture("run-e-objective-artifact");
    const eventCount = fixture.world.history.events.length;
    const knowledgeCount = fixture.world.history.knowledge.length;
    const { world, artifact } = addArtifact(fixture);

    expect(world.history.events).toHaveLength(eventCount);
    expect(world.history.knowledge).toHaveLength(knowledgeCount);
    expect(world.history.evidenceDiscoveries).toHaveLength(0);
    expect(artifact.access).toBe("public");
    expect(artifact.relatedEntityIds).toStrictEqual(
      [fixture.sourceEvent.id, fixture.incident.id].sort(),
    );
    expect(evidenceArtifactAt(world, artifact.id, cutoff(world))).toStrictEqual(
      artifact,
    );
    expect(
      evidenceArtifactsRelatedToEntityAt(
        world,
        fixture.sourceEvent.id,
        cutoff(world),
      ).map((record) => record.id),
    ).toStrictEqual([artifact.id]);
    expect(
      evidenceArtifactsRelatedToEntityAt(
        world,
        fixture.incident.id,
        cutoff(world),
      ).map((record) => record.id),
    ).toStrictEqual([artifact.id]);

    const restored = deserializeWorld(serializeWorld(world));
    expect(restored).toStrictEqual(world);
    expect(restored.history.evidenceArtifacts[0]?.access).toBe("public");
  });

  it("creates one ordinary discovery event and one exact direct knowledge record for only the discoverer", () => {
    const fixture = sourceFixture("run-e-explicit-discovery");
    const added = addArtifact(fixture);
    const beforeKnowledge = added.world.history.knowledge.length;
    const world = addDiscovery(
      added.world,
      added.artifact,
      fixture.discovererId,
    );
    const discovery = world.history.evidenceDiscoveries.at(-1)!;
    const event = world.history.events.find(
      (candidate) => candidate.id === discovery.discoveryEventId,
    )!;
    const eventKnowledge = world.history.knowledge.filter(
      (knowledge) => knowledge.eventId === event.id,
    );

    expect(event.type).toBe("evidence.discovered");
    expect(event.involvedEntityIds).toStrictEqual(
      [fixture.discovererId, added.artifact.id].sort(),
    );
    expect(event.sequence + 1).toBe(discovery.sequence);
    expect(eventKnowledge).toHaveLength(1);
    expect(world.history.knowledge).toHaveLength(beforeKnowledge + 1);
    expect(eventKnowledge[0]).toMatchObject({
      stableKey: `${discovery.stableKey}:knowledge`,
      sequence: discovery.sequence + 1,
      personId: fixture.discovererId,
      eventId: event.id,
      learnedAt: discovery.discoveredAt,
      accuracy: "accurate",
      confidence: "high",
      source: { kind: "direct" },
    });
    expect(
      eventKnowledge.some(
        (knowledge) => knowledge.personId === fixture.otherPersonId,
      ),
    ).toBe(false);
    expect(
      world.history.knowledge.some(
        (knowledge) =>
          knowledge.personId === fixture.discovererId &&
          (knowledge.eventId === fixture.sourceEvent.id ||
            knowledge.eventId === fixture.incident.onsetEventId),
      ),
    ).toBe(false);
    expect(
      hasPersonDiscoveredEvidenceAt(
        world,
        fixture.discovererId,
        added.artifact.id,
        cutoff(world),
      ),
    ).toBe(true);
    expect(
      hasPersonDiscoveredEvidenceAt(
        world,
        fixture.otherPersonId,
        added.artifact.id,
        cutoff(world),
      ),
    ).toBe(false);
    expect(
      evidenceDiscoveryHistory(
        world,
        {
          personId: fixture.discovererId,
          evidenceArtifactId: added.artifact.id,
        },
        cutoff(world),
      ),
    ).toStrictEqual([discovery]);
    expect(deserializeWorld(serializeWorld(world))).toStrictEqual(world);
  });

  it("uses created/discovered date and exclusive sequence to prevent backfilled artifact and discovery leakage", () => {
    let world = createDemoWorld("run-e-backfill-cutoff");
    const sourceDate = makeIsoDate("2025-04-01");
    const artifactDate = makeIsoDate("2025-04-02");
    const discoveryDate = makeIsoDate("2025-04-03");
    world = recordWorldEvent(world, {
      stableKey: "run-e:backfill-source",
      type: "record.created",
      occurredAt: sourceDate,
      recordedAt: sourceDate,
      jurisdictionId: world.jurisdictionOrder[0]!,
      involvedEntityIds: [world.jurisdictionOrder[0]!],
      participants: [],
      personFactConstraints: [],
      visibility: "limited",
      tags: ["evidence.source"],
      summary: "A backfilled source event.",
      context: {
        location: null,
        socialContext: null,
        pressure: null,
        choice: null,
        motivation: null,
        immediateReaction: null,
      },
    });
    const sourceEvent = world.history.events.at(-1)!;
    const artifactSequence = world.history.nextSequence;
    world = recordEvidenceArtifact(world, {
      stableKey: "run-e:backfilled-artifact",
      evidenceKind: "record:archival-note",
      createdAt: artifactDate,
      recordedAt: artifactDate,
      relatedEntityIds: [sourceEvent.id],
      access: "restricted",
      description: null,
      provenance: { kind: "simulated", sourceEntityIds: [sourceEvent.id] },
    });
    const artifact = world.history.evidenceArtifacts.at(-1)!;
    const discoveryEventSequence = world.history.nextSequence;
    world = recordEvidenceDiscovery(world, {
      stableKey: "run-e:backfilled-discovery",
      personId: world.personOrder[0]!,
      evidenceArtifactId: artifact.id,
      discoveredAt: discoveryDate,
      recordedAt: world.currentDate,
      methodKey: "review:archive",
      provenance: { kind: "simulated", sourceEntityIds: [artifact.id] },
    });
    const discovery = world.history.evidenceDiscoveries.at(-1)!;

    expect(
      evidenceArtifactAt(
        world,
        artifact.id,
        cutoff(world, world.currentDate, artifactSequence),
      ),
    ).toBeNull();
    expect(
      evidenceArtifactAt(
        world,
        artifact.id,
        cutoff(world, artifactDate, artifact.sequence + 1),
      )?.id,
    ).toBe(artifact.id);
    expect(
      hasPersonDiscoveredEvidenceAt(
        world,
        world.personOrder[0]!,
        artifact.id,
        cutoff(world, world.currentDate, discovery.sequence),
      ),
    ).toBe(false);
    expect(discoveryEventSequence + 1).toBe(discovery.sequence);
    expect(
      hasPersonDiscoveredEvidenceAt(
        world,
        world.personOrder[0]!,
        artifact.id,
        cutoff(world, discoveryDate, world.history.nextSequence),
      ),
    ).toBe(true);
    expect(
      hasPersonDiscoveredEvidenceAt(
        world,
        world.personOrder[0]!,
        artifact.id,
        cutoff(world),
      ),
    ).toBe(true);
  });

  it("rejects malformed artifact classifications, provenance, source identity, chronology, and duplicate keys", () => {
    const fixture = sourceFixture("run-e-invalid-artifacts");
    const valid = {
      stableKey: "run-e:invalid-artifact",
      evidenceKind: "record:test" as EvidenceSemanticKey,
      createdAt: fixture.world.currentDate,
      recordedAt: fixture.world.currentDate,
      relatedEntityIds: [fixture.sourceEvent.id],
      access: "private" as EvidenceAccess,
      description: "Fixture.",
      provenance: {
        kind: "simulated" as const,
        sourceEntityIds: [fixture.sourceEvent.id],
      },
    };

    expect(() =>
      recordEvidenceArtifact(fixture.world, {
        ...valid,
        access: "classified" as EvidenceAccess,
      }),
    ).toThrow(/access/i);
    expect(() =>
      recordEvidenceArtifact(fixture.world, {
        ...valid,
        evidenceKind: "not-namespaced" as EvidenceSemanticKey,
      }),
    ).toThrow(/semantic key|kind/i);
    expect(() =>
      recordEvidenceArtifact(fixture.world, {
        ...valid,
        provenance: {
          kind: "simulated",
          sourceEntityIds: [],
        },
      }),
    ).toThrow(/provenance.*source/i);
    expect(() =>
      recordEvidenceArtifact(fixture.world, {
        ...valid,
        provenance: {
          kind: "forged",
        } as unknown as EvidenceRecordProvenance,
      }),
    ).toThrow(/provenance|non-json-safe/i);
    expect(() =>
      recordEvidenceArtifact(fixture.world, {
        ...valid,
        provenance: {
          kind: "simulated",
          sourceEntityIds: [fixture.incident.id],
        },
      }),
    ).toThrow(/unavailable or unrelated/i);
    expect(() =>
      recordEvidenceArtifact(fixture.world, {
        ...valid,
        relatedEntityIds: [createStableId("event", "missing-evidence-source")],
        provenance: AUTHORED,
      }),
    ).toThrow(/related entity.*unavailable/i);
    expect(() =>
      recordEvidenceArtifact(fixture.world, {
        ...valid,
        relatedEntityIds: [fixture.discovererId],
        provenance: AUTHORED,
      }),
    ).toThrow(/related entity.*unavailable/i);
    expect(() =>
      recordEvidenceArtifact(fixture.world, {
        ...valid,
        createdAt: makeIsoDate("2025-12-31"),
        provenance: AUTHORED,
      }),
    ).toThrow(/related entity.*unavailable/i);

    const once = recordEvidenceArtifact(fixture.world, valid);
    expect(() => recordEvidenceArtifact(once, valid)).toThrow(/duplicate/i);
  });

  it("rejects discovery before artifact availability, duplicate identity, and missing, pre-birth, or deceased discoverers", () => {
    const fixture = sourceFixture("run-e-invalid-discovery");
    const added = addArtifact(fixture);
    const missingPersonId = createStableId("person", "missing-discoverer");
    const invalidInput = {
      stableKey: "run-e:invalid-discovery",
      personId: fixture.discovererId,
      evidenceArtifactId: added.artifact.id,
      discoveredAt: added.world.currentDate,
      recordedAt: added.world.currentDate,
      methodKey: "review:inspection" as EvidenceSemanticKey,
      provenance: {
        kind: "simulated" as const,
        sourceEntityIds: [added.artifact.id],
      },
    };

    expect(() =>
      recordEvidenceDiscovery(added.world, {
        ...invalidInput,
        personId: missingPersonId,
      }),
    ).toThrow(/missing evidence discoverer/i);
    expect(() =>
      recordEvidenceDiscovery(added.world, {
        ...invalidInput,
        discoveredAt: makeIsoDate("2025-12-31"),
      }),
    ).toThrow(/unavailable at discovery/i);

    let historical = createDemoWorld("run-e-prebirth-discovery");
    const personId = historical.personOrder[0]!;
    const birthDate = historical.people[personId]!.birthDate;
    const prebirthDate = addDays(birthDate, -1);
    historical = recordWorldEvent(historical, {
      stableKey: "run-e:prebirth-source",
      type: "record.created",
      occurredAt: prebirthDate,
      recordedAt: prebirthDate,
      jurisdictionId: historical.jurisdictionOrder[0]!,
      involvedEntityIds: [historical.jurisdictionOrder[0]!],
      participants: [],
      personFactConstraints: [],
      visibility: "private",
      tags: ["evidence.source"],
      summary: "A source predating the discoverer.",
      context: {
        location: null,
        socialContext: null,
        pressure: null,
        choice: null,
        motivation: null,
        immediateReaction: null,
      },
    });
    const historicalSource = historical.history.events.at(-1)!;
    historical = recordEvidenceArtifact(historical, {
      stableKey: "run-e:prebirth-artifact",
      evidenceKind: "record:old-note",
      createdAt: prebirthDate,
      recordedAt: prebirthDate,
      relatedEntityIds: [historicalSource.id],
      access: "private",
      description: null,
      provenance: {
        kind: "simulated",
        sourceEntityIds: [historicalSource.id],
      },
    });
    const historicalArtifact = historical.history.evidenceArtifacts.at(-1)!;
    expect(() =>
      recordEvidenceDiscovery(historical, {
        stableKey: "run-e:prebirth-discovery",
        personId,
        evidenceArtifactId: historicalArtifact.id,
        discoveredAt: prebirthDate,
        recordedAt: historical.currentDate,
        methodKey: "review:archive",
        provenance: {
          kind: "simulated",
          sourceEntityIds: [historicalArtifact.id],
        },
      }),
    ).toThrow(/not alive/i);

    let deceased = recordPersonDeath(added.world, {
      stableKey: "run-e:deceased-discoverer",
      personId: fixture.otherPersonId,
      diedAt: added.world.currentDate,
      causeKey: "cause:fixture",
      sourceEntityIds: [fixture.incident.id],
      summary: "The fixture person died.",
      provenance: {
        kind: "simulated",
        sourceEntityIds: [fixture.incident.id],
      },
    });
    expect(() =>
      recordEvidenceDiscovery(deceased, {
        ...invalidInput,
        stableKey: "run-e:post-death-discovery",
        personId: fixture.otherPersonId,
      }),
    ).toThrow(/not alive/i);

    deceased = addDiscovery(added.world, added.artifact, fixture.discovererId);
    expect(() =>
      addDiscovery(
        deceased,
        added.artifact,
        fixture.discovererId,
        "run-e:second-discovery-key",
      ),
    ).toThrow(/already exists/i);
    expect(() =>
      recordEvidenceDiscovery(deceased, {
        ...invalidInput,
        stableKey: "run-e:artifact-discovery",
        personId: fixture.otherPersonId,
      }),
    ).toThrow(/already exists/i);
  });

  it("rejects malformed discovery record, event, and derived knowledge cross-links on integrity and load", () => {
    const fixture = sourceFixture("run-e-corrupt-discovery");
    const added = addArtifact(fixture);
    const world = addDiscovery(
      added.world,
      added.artifact,
      fixture.discovererId,
    );
    const discovery = world.history.evidenceDiscoveries.at(-1)!;
    const event = world.history.events.find(
      (candidate) => candidate.id === discovery.discoveryEventId,
    )!;
    const knowledge = world.history.knowledge.find(
      (candidate) => candidate.stableKey === `${discovery.stableKey}:knowledge`,
    )!;

    const wrongDiscoveryLink: World = {
      ...world,
      history: {
        ...world.history,
        evidenceDiscoveries: world.history.evidenceDiscoveries.map((record) =>
          record.id === discovery.id
            ? {
                ...record,
                discoveryEventId: createStableId(
                  "event",
                  "wrong-discovery-event",
                ),
              }
            : record,
        ),
      },
    };
    expectIntegrityFailure(wrongDiscoveryLink, /discovery event/i);

    const wrongEvent: World = {
      ...world,
      history: {
        ...world.history,
        events: world.history.events.map((record) =>
          record.id === event.id
            ? { ...record, visibility: "public" as const }
            : record,
        ),
      },
    };
    expectIntegrityFailure(wrongEvent, /discovery event/i);

    const wrongKnowledge: World = {
      ...world,
      history: {
        ...world.history,
        knowledge: world.history.knowledge.map((record) =>
          record.id === knowledge.id
            ? { ...record, believedSummary: "A forged interpretation." }
            : record,
        ),
      },
    };
    expectIntegrityFailure(wrongKnowledge, /discovery knowledge/i);

    const wrongProvenance: World = {
      ...world,
      history: {
        ...world.history,
        evidenceDiscoveries: world.history.evidenceDiscoveries.map((record) =>
          record.id === discovery.id
            ? {
                ...record,
                provenance: {
                  kind: "simulated" as const,
                  sourceEntityIds: [fixture.sourceEvent.id],
                },
              }
            : record,
        ),
      },
    };
    expectIntegrityFailure(wrongProvenance, /must include its artifact/i);
  });

  it("rejects a generic reserved discovery event without its discovery and knowledge records", () => {
    const fixture = sourceFixture("run-e-orphan-discovery-event");
    const added = addArtifact(fixture);
    const orphan = recordWorldEvent(added.world, {
      stableKey: "run-e:orphan-discovery:event",
      type: "evidence.discovered",
      occurredAt: added.world.currentDate,
      recordedAt: added.world.currentDate,
      jurisdictionId: null,
      involvedEntityIds: [fixture.discovererId, added.artifact.id],
      participants: [
        {
          personId: fixture.discovererId,
          role: "observation:evidence-discovery",
          detail: null,
        },
      ],
      personFactConstraints: [],
      visibility: "private",
      tags: ["evidence.discovery"],
      summary: "A generic writer cannot forge canonical evidence discovery.",
      context: {
        location: null,
        socialContext: null,
        pressure: null,
        choice: null,
        motivation: null,
        immediateReaction: null,
      },
    });
    expectIntegrityFailure(orphan, /reserved evidence-discovery event/i);
  });
});
