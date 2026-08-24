import { describe, expect, it } from "vitest";

import {
  INCIDENT_TRANSITION_KEY,
  activeIncidentsAt,
  advanceWorld,
  assertWorldIntegrity,
  createDemoWorld,
  createExactQuantity,
  createFutureTransitionHandlerRegistry,
  createIncidentCatalog,
  createIncidentDefinition,
  createStableId,
  createWorld,
  deserializeWorld,
  distinctRootCausalIds,
  evaluateIncident,
  incidentAt,
  incidentCausalRoot,
  incidentEventHistory,
  incidentStateAt,
  incidentTransitionHandler,
  incidentsByDefinitionAt,
  makeIsoDate,
  occurIncident,
  recordActorInitiatedIncident,
  recordIncidentTransitionPlan,
  recordWorldEvent,
  recordWorldMetricState,
  scheduleFutureDueItem,
  scheduleIncidentTransition,
  serializeWorld,
  worldMetricDefinitionByStableKey,
} from "./index";
import type {
  EntityId,
  ExactQuantity,
  IncidentConsequencePlan,
  IncidentDefinition,
  MetricScope,
  World,
  WorldMetricValue,
} from "./index";

const AUTHORED = { kind: "authored" as const, note: "Run D semantic fixture." };

function scope(world: World): MetricScope {
  return { jurisdictionId: world.jurisdictionOrder[0]!, segmentKey: null };
}

function point(world: World) {
  return { kind: "point" as const, at: world.currentDate };
}

function quantity(numerator: number, unit: string): WorldMetricValue {
  return {
    kind: "quantity",
    quantity: createExactQuantity(numerator, 1, unit),
  };
}

function cutoff(world: World) {
  return {
    asOfDate: world.currentDate,
    historySequenceExclusive: world.history.nextSequence,
  };
}

function metricId(world: World, stableKey: string): EntityId {
  return worldMetricDefinitionByStableKey(world, stableKey).id;
}

function runDWorld(seed: string): {
  readonly world: World;
  readonly hazard: IncidentDefinition;
  readonly slowdown: IncidentDefinition;
  readonly outbreak: IncidentDefinition;
  readonly civic: IncidentDefinition;
} {
  const template = createDemoWorld(seed);
  const populationId = metricId(template, "population.resident-count");
  const hazard = createIncidentDefinition({
    stableKey: "incident.test-localized-hazard",
    label: "Test localized hazard",
    description: "A synthetic localized hazard for Run D semantic tests.",
    incidentKind: "incident:natural-hazard",
    occurrenceMode: "probabilistic",
    baseLikelihood: createExactQuantity(1, 1, "rate:share"),
    prerequisites: [
      {
        kind: "metric-comparison",
        stableKey: "incident:population-ready",
        metricId: populationId,
        reference: { kind: "at-evaluation" },
        comparison: "at-least",
        threshold: quantity(100, "count:people"),
        reasonKey: "incident:population-ready",
      },
    ],
    blockers: [],
    likelihoodModifiers: [
      {
        kind: "active-incident-factor",
        stableKey: "incident:outbreak-dampens-hazard",
        definitionId: createStableId(
          "incident-definition",
          "definition:incident.test-outbreak",
        ),
        factor: createExactQuantity(1, 2, "rate:share"),
        reasonKey: "incident:outbreak-dampens-hazard",
      },
    ],
    tags: ["incident.hazard", "incident.local"],
  });
  const slowdown = createIncidentDefinition({
    stableKey: "incident.test-economic-slowdown",
    label: "Test economic slowdown",
    description: "A synthetic condition with an ordinary-event blocker.",
    incidentKind: "incident:economic-slowdown",
    occurrenceMode: "probabilistic",
    baseLikelihood: createExactQuantity(1, 1, "rate:share"),
    prerequisites: [],
    blockers: [
      {
        kind: "historical-event",
        stableKey: "incident:stabilization-blocker",
        eventType: "incident.stabilized",
        eventTag: null,
        reasonKey: "incident:stabilization-blocker",
      },
    ],
    likelihoodModifiers: [],
    tags: ["incident.condition", "incident.economy"],
  });
  const outbreak = createIncidentDefinition({
    stableKey: "incident.test-outbreak",
    label: "Test bounded outbreak",
    description: "A bounded condition with no health or mortality model.",
    incidentKind: "incident:outbreak",
    occurrenceMode: "probabilistic",
    baseLikelihood: createExactQuantity(1, 1, "rate:share"),
    prerequisites: [],
    blockers: [],
    likelihoodModifiers: [],
    tags: ["incident.condition", "incident.outbreak"],
  });
  const civic = createIncidentDefinition({
    stableKey: "incident.test-civic-occurrence",
    label: "Test civic occurrence",
    description: "An actor-initiated adapter fixture.",
    incidentKind: "incident:civic-occurrence",
    occurrenceMode: "actor-initiated",
    baseLikelihood: createExactQuantity(1, 1, "rate:share"),
    prerequisites: [],
    blockers: [],
    likelihoodModifiers: [],
    tags: ["incident.civic"],
  });
  return {
    world: createWorld({
      seed,
      currentDate: template.currentDate,
      jurisdictions: template.jurisdictionOrder.map(
        (id) => template.jurisdictions[id]!,
      ),
      people: template.personOrder.map((id) => template.people[id]!),
      incidentCatalog: createIncidentCatalog({
        definitions: [hazard, slowdown, outbreak, civic],
      }),
    }),
    hazard,
    slowdown,
    outbreak,
    civic,
  };
}

function withPopulation(world: World, stableKey: string, value = 1_000): World {
  return recordWorldMetricState(world, {
    stableKey,
    metricId: metricId(world, "population.resident-count"),
    scope: scope(world),
    referencePeriod: point(world),
    value: quantity(value, "count:people"),
    recordedAt: world.currentDate,
    provenance: AUTHORED,
    supersedesStateId: null,
  });
}

function consequence(
  world: World,
  stableKey = "incident:housing-pressure",
): IncidentConsequencePlan {
  return {
    stableKey: stableKey as IncidentConsequencePlan["stableKey"],
    targetMetricId: metricId(world, "housing.availability-pressure"),
    targetScope: scope(world),
    referencePeriod: point(world),
    direction: "increase",
    baseMagnitude: quantity(8, "index:housing-pressure"),
    magnitudeBasis: { kind: "point-at-target" },
    mechanismDefinitionId: world.causalMechanismCatalog.definitionOrder[0]!,
    onsetAt: world.currentDate,
    maturesAt: world.currentDate,
    endsAt: null,
    realizationKind: "incident:direct-impact",
  };
}

function evaluate(
  world: World,
  definition: IncidentDefinition,
  evaluationKey: string,
  consequences: readonly IncidentConsequencePlan[] = [consequence(world)],
  shares = {
    exposure: createExactQuantity(1, 1, "rate:share"),
    vulnerability: createExactQuantity(1, 1, "rate:share"),
    resilience: createExactQuantity(0, 1, "rate:share"),
  },
) {
  return evaluateIncident(world, {
    definitionId: definition.id,
    evaluationKey,
    scope: scope(world),
    evaluatedAt: world.currentDate,
    cutoff: cutoff(world),
    ...shares,
    consequences,
  });
}

function occurHazard(
  world: World,
  hazard: IncidentDefinition,
  stableKey = "incident:hazard",
  consequences: readonly IncidentConsequencePlan[] = [consequence(world)],
) {
  const evaluation = evaluate(
    world,
    hazard,
    `${stableKey}:evaluation`,
    consequences,
  );
  expect(evaluation.occurred).toBe(true);
  const next = occurIncident(world, {
    stableKey,
    evaluation,
    summary: "A test localized hazard occurred.",
    visibility: "public",
  });
  const incident = next.history.incidents.at(-1);
  if (!incident) throw new Error("Expected incident.");
  return { world: next, incident, evaluation };
}

function serializeUnchecked(world: World): string {
  const payload = JSON.stringify(world);
  return JSON.stringify({
    format: "political-life-world",
    formatVersion: 12,
    snapshotId: createStableId("snapshot", payload),
    worldId: world.id,
    savedAtWorldDate: world.currentDate,
    world,
  });
}

function expectSnapshotIntegrityFailure(world: World): void {
  expect(() => assertWorldIntegrity(world)).toThrow(
    /canonical evaluation|malformed occurrence snapshot/i,
  );
  expect(() => deserializeWorld(serializeUnchecked(world))).toThrow(
    /canonical evaluation|malformed occurrence snapshot/i,
  );
}

describe("Stage 6 Run D generalized incident substrate", () => {
  it("reports unavailable prerequisites, blocks matching conditions, and preserves exact likelihood evidence", () => {
    const prepared = runDWorld("run-d-eligibility");
    const missing = evaluate(prepared.world, prepared.hazard, "missing");
    expect(missing.occurred).toBe(false);
    expect(missing.prerequisiteResults[0]?.status).toBe("unavailable");
    expect(() =>
      occurIncident(prepared.world, {
        stableKey: "missing-incident",
        evaluation: missing,
        summary: "An unavailable incident must not occur.",
        visibility: "public",
      }),
    ).toThrow(/eligible exact evaluation/i);

    let world = withPopulation(prepared.world, "population");
    world = recordWorldEvent(world, {
      stableKey: "stabilized",
      type: "incident.stabilized",
      occurredAt: world.currentDate,
      recordedAt: world.currentDate,
      jurisdictionId: scope(world).jurisdictionId,
      involvedEntityIds: [scope(world).jurisdictionId],
      participants: [],
      personFactConstraints: [],
      visibility: "public",
      tags: ["incident.stabilized"],
      summary: "A stabilizing event occurred.",
      context: {
        location: null,
        socialContext: null,
        pressure: null,
        choice: null,
        motivation: null,
        immediateReaction: null,
      },
    });
    const blocked = evaluate(world, prepared.slowdown, "blocked", []);
    expect(blocked.blockerResults[0]?.status).toBe("satisfied");
    expect(blocked.occurred).toBe(false);
  });

  it("uses keyed exact RNG independently of unrelated RNG work and evaluation keys", () => {
    const prepared = runDWorld("run-d-rng");
    const world = withPopulation(prepared.world, "population");
    const first = evaluate(world, prepared.hazard, "same-key");
    const unrelated = createDemoWorld("unrelated-rng-work");
    expect(unrelated.seed).toBe("unrelated-rng-work");
    const replay = evaluate(world, prepared.hazard, "same-key");
    const other = evaluate(world, prepared.hazard, "other-key");
    expect(replay.rng).toStrictEqual(first.rng);
    expect(replay.occurred).toBe(first.occurred);
    expect(other.rng?.key).not.toBe(first.rng?.key);
    expect(first.likelihood).toStrictEqual(
      createExactQuantity(1, 1, "rate:share"),
    );
  });

  it("reconstructs every persisted probabilistic occurrence snapshot at its stored cutoff", () => {
    const prepared = runDWorld("run-d-snapshot-integrity");
    const valid = occurHazard(
      withPopulation(prepared.world, "population"),
      prepared.hazard,
    ).world;
    expect(deserializeWorld(serializeWorld(valid))).toStrictEqual(valid);

    const baseLikelihood = structuredClone(valid);
    (
      baseLikelihood.history.incidents[0]!.occurrence as {
        baseLikelihood: ExactQuantity;
      }
    ).baseLikelihood = createExactQuantity(1, 2, "rate:share");
    expectSnapshotIntegrityFailure(baseLikelihood);

    const finalLikelihood = structuredClone(valid);
    (
      finalLikelihood.history.incidents[0]!.occurrence as {
        likelihood: ExactQuantity;
      }
    ).likelihood = createExactQuantity(1, 2, "rate:share");
    expectSnapshotIntegrityFailure(finalLikelihood);

    const prerequisite = structuredClone(valid);
    (
      prerequisite.history.incidents[0]!.occurrence.prerequisiteResults[0] as {
        status: string;
      }
    ).status = "unsatisfied";
    expectSnapshotIntegrityFailure(prerequisite);

    const modifier = structuredClone(valid);
    (
      modifier.history.incidents[0]!.occurrence
        .appliedLikelihoodModifiers[0] as unknown as {
        applied: boolean;
        sourceEntityIds: EntityId[];
      }
    ).applied = true;
    expectSnapshotIntegrityFailure(modifier);

    const modifierFactor = structuredClone(valid);
    (
      modifierFactor.history.incidents[0]!.occurrence
        .appliedLikelihoodModifiers[0] as unknown as {
        factor: ExactQuantity;
      }
    ).factor = createExactQuantity(1, 3, "rate:share");
    expectSnapshotIntegrityFailure(modifierFactor);

    const modifierSource = structuredClone(valid);
    (
      modifierSource.history.incidents[0]!.occurrence
        .appliedLikelihoodModifiers[0] as unknown as {
        sourceEntityIds: EntityId[];
      }
    ).sourceEntityIds = [createStableId("incident", "corrupt:modifier-source")];
    expectSnapshotIntegrityFailure(modifierSource);

    const rngKey = structuredClone(valid);
    (rngKey.history.incidents[0]!.occurrence.rng as { key: string }).key =
      "fabricated-incident-rng-key";
    expectSnapshotIntegrityFailure(rngKey);

    const rngDraw = structuredClone(valid);
    const draw = rngDraw.history.incidents[0]!.occurrence.rng!;
    (draw as { draw: number }).draw = (draw.draw + 1) % 4_294_967_296;
    expectSnapshotIntegrityFailure(rngDraw);

    const rngResult = structuredClone(valid);
    (
      rngResult.history.incidents[0]!.occurrence.rng as { occurred: boolean }
    ).occurred = false;
    expectSnapshotIntegrityFailure(rngResult);

    const unavailableAtClaimedFrontier = structuredClone(valid);
    (
      unavailableAtClaimedFrontier.history.incidents[0]!.occurrence.cutoff as {
        historySequenceExclusive: number;
      }
    ).historySequenceExclusive = 0;
    expectSnapshotIntegrityFailure(unavailableAtClaimedFrontier);

    const blockerWorld = occurIncident(prepared.world, {
      stableKey: "snapshot:blocker",
      evaluation: evaluate(
        prepared.world,
        prepared.slowdown,
        "snapshot:blocker",
        [],
      ),
      summary: "A non-blocked economic condition occurred.",
      visibility: "public",
    });
    const blocker = structuredClone(blockerWorld);
    (
      blocker.history.incidents[0]!.occurrence.blockerResults[0] as {
        status: string;
      }
    ).status = "satisfied";
    expectSnapshotIntegrityFailure(blocker);
  });

  it("keeps likelihood modifiers separate from consequence risk factors", () => {
    const prepared = runDWorld("run-d-risk-separation");
    let world = withPopulation(prepared.world, "population");
    const before = evaluate(world, prepared.hazard, "before");
    const outbreak = occurIncident(world, {
      stableKey: "outbreak",
      evaluation: evaluate(world, prepared.outbreak, "outbreak", []),
      summary: "A bounded outbreak condition occurred.",
      visibility: "public",
    });
    world = outbreak;
    const after = evaluate(world, prepared.hazard, "after");
    expect(after.likelihood).toStrictEqual(
      createExactQuantity(1, 2, "rate:share"),
    );
    expect(after.appliedLikelihoodModifiers[0]?.applied).toBe(true);
    expect(before.impactShare).toStrictEqual(after.impactShare);

    const exposure = evaluate(
      world,
      prepared.hazard,
      "exposure",
      [consequence(world)],
      {
        exposure: createExactQuantity(1, 2, "rate:share"),
        vulnerability: createExactQuantity(1, 1, "rate:share"),
        resilience: createExactQuantity(0, 1, "rate:share"),
      },
    );
    const vulnerability = evaluate(
      world,
      prepared.hazard,
      "vulnerability",
      [consequence(world)],
      {
        exposure: createExactQuantity(1, 1, "rate:share"),
        vulnerability: createExactQuantity(1, 2, "rate:share"),
        resilience: createExactQuantity(0, 1, "rate:share"),
      },
    );
    const resilience = evaluate(
      world,
      prepared.hazard,
      "resilience",
      [consequence(world)],
      {
        exposure: createExactQuantity(1, 1, "rate:share"),
        vulnerability: createExactQuantity(1, 1, "rate:share"),
        resilience: createExactQuantity(1, 2, "rate:share"),
      },
    );
    expect(exposure.impactShare).toStrictEqual(
      createExactQuantity(1, 2, "rate:share"),
    );
    expect(vulnerability.impactShare).toStrictEqual(
      createExactQuantity(1, 2, "rate:share"),
    );
    expect(resilience.impactShare).toStrictEqual(
      createExactQuantity(1, 2, "rate:share"),
    );
    expect(exposure.likelihood).toStrictEqual(after.likelihood);
    expect(exposure.consequences[0]?.scaledMagnitude).toStrictEqual(
      quantity(4, "index:housing-pressure"),
    );
  });

  it("commits an ordinary onset and phase history with one incident root and multiple Run B effects", () => {
    const prepared = runDWorld("run-d-onset");
    const world = withPopulation(prepared.world, "population");
    const result = occurHazard(world, prepared.hazard, "hazard", [
      consequence(world),
      consequence(world, "incident:housing-pressure-secondary"),
    ]);
    expect(
      result.world.history.events.some(
        (event) => event.id === result.incident.onsetEventId,
      ),
    ).toBe(true);
    expect(result.world.history.incidentStates).toHaveLength(1);
    expect(result.world.history.effectActivations).toHaveLength(2);
    expect(result.world.history.incidentStates[0]?.phaseKey).toBe(
      "incident:onset",
    );
    expect(
      incidentStateAt(result.world, result.incident.id, cutoff(result.world))
        ?.status,
    ).toBe("active");
    expect(
      incidentEventHistory(
        result.world,
        result.incident.id,
        cutoff(result.world),
      ),
    ).toHaveLength(2);
    expect(
      incidentCausalRoot(result.world, result.incident.id, cutoff(result.world))
        ?.id,
    ).toBe(result.incident.rootCausalProcessId);
    expect(
      distinctRootCausalIds(
        result.world,
        result.world.history.effectActivations.map((effect) => effect.id),
        cutoff(result.world),
      ),
    ).toStrictEqual([result.incident.rootCausalProcessId]);
    expect(result.world.history.knowledge).toHaveLength(0);
  });

  it("uses one valid Run A transition plan, resolves it exactly once, and preserves history after resolution", () => {
    const prepared = runDWorld("run-d-follow-on");
    const occurred = occurHazard(
      withPopulation(prepared.world, "population"),
      prepared.hazard,
    );
    let world = recordIncidentTransitionPlan(occurred.world, {
      stableKey: "hazard:recovery-plan",
      incidentId: occurred.incident.id,
      dueAt: makeIsoDate("2026-01-07"),
      targetStatus: "resolved",
      phaseKey: "incident:ended",
      reasonKey: "incident:recovered",
      context: "The localized hazard ended after recovery.",
      consequences: [
        {
          ...consequence(occurred.world, "incident:recovery-output"),
          onsetAt: makeIsoDate("2026-01-07"),
          maturesAt: makeIsoDate("2026-01-07"),
        },
      ],
    });
    const plan = world.history.incidentTransitionPlans.at(-1);
    if (!plan) throw new Error("Expected transition plan.");
    world = scheduleIncidentTransition(world, {
      stableKey: "hazard:recovery-due",
      transitionPlanId: plan.id,
    });
    const beforeEnd = cutoff(world);
    expect(() =>
      scheduleIncidentTransition(world, {
        stableKey: "hazard:recovery-due-duplicate",
        transitionPlanId: plan.id,
      }),
    ).toThrow(/duplicate/i);
    const registry = createFutureTransitionHandlerRegistry([
      [INCIDENT_TRANSITION_KEY, incidentTransitionHandler],
    ]);
    world = advanceWorld(world, 2, registry);
    expect(
      incidentStateAt(world, occurred.incident.id, beforeEnd)?.status,
    ).toBe("active");
    expect(
      incidentStateAt(world, occurred.incident.id, cutoff(world))?.status,
    ).toBe("resolved");
    expect(world.history.futureDueItemStates.at(-1)?.status).toBe("resolved");
    expect(
      incidentEventHistory(world, occurred.incident.id, cutoff(world)),
    ).toHaveLength(3);
    expect(world.history.effectActivations.at(-1)).toMatchObject({
      causalProcessId: occurred.incident.rootCausalProcessId,
      sourceEntityIds: [
        world.history.futureDueItemStates.at(-1)?.outcomeEventId,
      ],
      realizationKind: "incident:direct-impact",
    });
    expect(activeIncidentsAt(world, cutoff(world))).toHaveLength(0);
    expect(incidentAt(world, occurred.incident.id, cutoff(world))?.id).toBe(
      occurred.incident.id,
    );
  });

  it("rejects corrupted generic incident due items while normal follow-ons resolve", () => {
    const prepared = runDWorld("run-d-due-integrity");
    const occurred = occurHazard(
      withPopulation(prepared.world, "population"),
      prepared.hazard,
    );
    let world = recordIncidentTransitionPlan(occurred.world, {
      stableKey: "hazard:obsolete-plan",
      incidentId: occurred.incident.id,
      dueAt: makeIsoDate("2026-01-07"),
      targetStatus: "resolved",
      phaseKey: "incident:ended",
      reasonKey: "incident:recovered",
      context: null,
      consequences: [],
    });
    const plan = world.history.incidentTransitionPlans.at(-1)!;
    expect(() =>
      scheduleFutureDueItem(world, {
        stableKey: "corrupt:incident-due",
        dueAt: makeIsoDate("2026-01-08"),
        transitionKey: INCIDENT_TRANSITION_KEY,
        entityIds: [plan.id],
        jurisdictionId: scope(world).jurisdictionId,
        provenance: { kind: "simulated", sourceEntityIds: [plan.id] },
      }),
    ).toThrow(/invalid transition plan/i);
    world = scheduleIncidentTransition(world, {
      stableKey: "hazard:obsolete-due",
      transitionPlanId: plan.id,
    });
    const corrupted = structuredClone(world);
    const due = corrupted.history.futureDueItems.at(-1)!;
    (due as { dueAt: string }).dueAt = makeIsoDate("2026-01-08");
    expect(() => assertWorldIntegrity(corrupted)).toThrow(
      /invalid transition plan/i,
    );
    expect(() => deserializeWorld(serializeUnchecked(corrupted))).toThrow(
      /invalid transition plan/i,
    );

    expect(corrupted.history.incidentStates.at(-1)?.status).toBe("active");
    const registry = createFutureTransitionHandlerRegistry([
      [INCIDENT_TRANSITION_KEY, incidentTransitionHandler],
    ]);
    const advanced = advanceWorld(world, 2, registry);
    expect(advanced.history.futureDueItemStates.at(-1)?.status).toBe(
      "resolved",
    );
  });

  it("terminally cancels a follow-on made obsolete by later incident history", () => {
    const prepared = runDWorld("run-d-obsolete-follow-on");
    const occurred = occurHazard(
      withPopulation(prepared.world, "population"),
      prepared.hazard,
    );
    let world = recordIncidentTransitionPlan(occurred.world, {
      stableKey: "hazard:later-plan",
      incidentId: occurred.incident.id,
      dueAt: makeIsoDate("2026-01-08"),
      targetStatus: "resolved",
      phaseKey: "incident:ended",
      reasonKey: "incident:recovered",
      context: null,
      consequences: [],
    });
    const laterPlan = world.history.incidentTransitionPlans.at(-1)!;
    world = scheduleIncidentTransition(world, {
      stableKey: "hazard:later-due",
      transitionPlanId: laterPlan.id,
    });
    world = recordIncidentTransitionPlan(world, {
      stableKey: "hazard:earlier-plan",
      incidentId: occurred.incident.id,
      dueAt: makeIsoDate("2026-01-07"),
      targetStatus: "resolved",
      phaseKey: "incident:ended",
      reasonKey: "incident:recovered",
      context: null,
      consequences: [],
    });
    world = scheduleIncidentTransition(world, {
      stableKey: "hazard:earlier-due",
      transitionPlanId: world.history.incidentTransitionPlans.at(-1)!.id,
    });
    world = advanceWorld(
      world,
      3,
      createFutureTransitionHandlerRegistry([
        [INCIDENT_TRANSITION_KEY, incidentTransitionHandler],
      ]),
    );
    const terminalStates = world.history.futureDueItemStates.filter(
      (state) => state.status !== "scheduled",
    );
    expect(terminalStates.map((state) => state.status).sort()).toStrictEqual([
      "cancelled",
      "resolved",
    ]);
    expect(
      terminalStates.find((state) => state.status === "cancelled")?.reasonKey,
    ).toBe("incident:already-resolved");
  });

  it("requires a transition plan source state to still be current when it is scheduled", () => {
    const prepared = runDWorld("run-d-due-creation-frontier");
    const occurred = occurHazard(
      withPopulation(prepared.world, "population"),
      prepared.hazard,
    );
    let world = recordIncidentTransitionPlan(occurred.world, {
      stableKey: "hazard:old-plan",
      incidentId: occurred.incident.id,
      dueAt: makeIsoDate("2026-01-08"),
      targetStatus: "resolved",
      phaseKey: "incident:ended",
      reasonKey: "incident:recovered",
      context: null,
      consequences: [],
    });
    const oldPlan = world.history.incidentTransitionPlans.at(-1)!;
    world = recordIncidentTransitionPlan(world, {
      stableKey: "hazard:response-plan",
      incidentId: occurred.incident.id,
      dueAt: makeIsoDate("2026-01-07"),
      targetStatus: "active",
      phaseKey: "incident:response",
      reasonKey: "incident:response-recorded",
      context: null,
      consequences: [],
    });
    const responsePlan = world.history.incidentTransitionPlans.at(-1)!;
    world = scheduleIncidentTransition(world, {
      stableKey: "hazard:response-due",
      transitionPlanId: responsePlan.id,
    });
    world = advanceWorld(
      world,
      2,
      createFutureTransitionHandlerRegistry([
        [INCIDENT_TRANSITION_KEY, incidentTransitionHandler],
      ]),
    );
    const beforeRejectedWriter = structuredClone(world);
    expect(() =>
      scheduleIncidentTransition(world, {
        stableKey: "hazard:old-plan-due",
        transitionPlanId: oldPlan.id,
      }),
    ).toThrow(/no longer current/i);
    expect(world).toStrictEqual(beforeRejectedWriter);

    expect(() =>
      scheduleFutureDueItem(world, {
        stableKey: "hazard:old-plan-generic-due",
        dueAt: oldPlan.dueAt,
        transitionKey: INCIDENT_TRANSITION_KEY,
        entityIds: [oldPlan.id],
        jurisdictionId: scope(world).jurisdictionId,
        provenance: { kind: "simulated", sourceEntityIds: [oldPlan.id] },
      }),
    ).toThrow(/invalid when scheduled/i);
    expect(world).toStrictEqual(beforeRejectedWriter);

    const source = structuredClone(world);
    const dueStableKey = "hazard:old-plan-corrupt-due";
    const dueSequence = source.history.nextSequence;
    const dueId = createStableId(
      "future-due-item",
      `${source.id}:${dueStableKey}`,
    );
    const corrupted: World = {
      ...source,
      history: {
        ...source.history,
        nextSequence: dueSequence + 2,
        futureDueItems: [
          ...source.history.futureDueItems,
          {
            id: dueId,
            stableKey: dueStableKey,
            sequence: dueSequence,
            scheduledAt: source.currentDate,
            dueAt: oldPlan.dueAt,
            transitionKey: INCIDENT_TRANSITION_KEY,
            entityIds: [oldPlan.id],
            jurisdictionId: scope(source).jurisdictionId,
            provenance: { kind: "simulated", sourceEntityIds: [oldPlan.id] },
          },
        ],
        futureDueItemStates: [
          ...source.history.futureDueItemStates,
          {
            id: createStableId(
              "future-due-item-state",
              `${source.id}:${dueStableKey}:state:scheduled`,
            ),
            stableKey: `${dueStableKey}:state:scheduled`,
            sequence: dueSequence + 1,
            dueItemId: dueId,
            effectiveAt: source.currentDate,
            status: "scheduled",
            reasonKey: null,
            context: null,
            outcomeEventId: null,
            supersedesStateId: null,
          },
        ],
      },
    };
    expect(() => assertWorldIntegrity(corrupted)).toThrow(
      /invalid when scheduled/i,
    );
    expect(() => deserializeWorld(serializeUnchecked(corrupted))).toThrow(
      /invalid when scheduled/i,
    );

    world = recordIncidentTransitionPlan(world, {
      stableKey: "hazard:terminal-plan",
      incidentId: occurred.incident.id,
      dueAt: makeIsoDate("2026-01-08"),
      targetStatus: "resolved",
      phaseKey: "incident:ended",
      reasonKey: "incident:recovered",
      context: null,
      consequences: [],
    });
    const terminalPlan = world.history.incidentTransitionPlans.at(-1)!;
    world = scheduleIncidentTransition(world, {
      stableKey: "hazard:terminal-due",
      transitionPlanId: terminalPlan.id,
    });
    world = advanceWorld(
      world,
      1,
      createFutureTransitionHandlerRegistry([
        [INCIDENT_TRANSITION_KEY, incidentTransitionHandler],
      ]),
    );
    expect(() =>
      scheduleIncidentTransition(world, {
        stableKey: "hazard:terminal-old-plan-due",
        transitionPlanId: oldPlan.id,
      }),
    ).toThrow(/terminal incident/i);
  });

  it("persists exact incident history and supports actor-initiated ordinary truth", () => {
    const prepared = runDWorld("run-d-json");
    const world = recordActorInitiatedIncident(prepared.world, {
      stableKey: "civic",
      evaluation: evaluate(prepared.world, prepared.civic, "civic", []),
      actorPersonId: prepared.world.personOrder[0]!,
      summary: "An actor initiated a civic occurrence.",
      visibility: "public",
    });
    expect(
      world.history.events.some((event) => event.type === "incident.occurred"),
    ).toBe(true);
    expect(world.history.events.at(-2)?.participants).toStrictEqual([
      {
        personId: prepared.world.personOrder[0]!,
        role: "agency:actor",
        detail: "Initiated this incident occurrence.",
      },
    ]);
    expect(
      incidentsByDefinitionAt(world, prepared.civic.id, cutoff(world)),
    ).toHaveLength(1);
    const payload = serializeWorld(world);
    expect(world.history.incidents[0]?.occurrence.rng).toBeNull();
    expect(deserializeWorld(payload)).toStrictEqual(world);
  });

  it("rejects persisted incident records with a wrong root or Run B effect linkage", () => {
    const prepared = runDWorld("run-d-corrupt-linkage");
    const occurred = occurHazard(
      withPopulation(prepared.world, "population"),
      prepared.hazard,
    );
    const wrongRoot = structuredClone(occurred.world);
    (
      wrongRoot.history.incidents[0] as { rootCausalProcessId: EntityId }
    ).rootCausalProcessId = createStableId("causal-process", "corrupt:root");
    expect(() => assertWorldIntegrity(wrongRoot)).toThrow(
      /wrong root\/event linkage/i,
    );
    expect(() => deserializeWorld(serializeUnchecked(wrongRoot))).toThrow(
      /wrong root\/event linkage/i,
    );

    const wrongEffect = structuredClone(occurred.world);
    (
      wrongEffect.history.effectActivations[0] as { causalProcessId: EntityId }
    ).causalProcessId = createStableId("causal-process", "corrupt:effect-root");
    expect(() => assertWorldIntegrity(wrongEffect)).toThrow(
      /unavailable causal process/i,
    );
  });
});
