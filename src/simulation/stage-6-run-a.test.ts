import { describe, expect, it } from "vitest";

import {
  addExactQuantities,
  advanceWorld,
  assertWorldIntegrity,
  cancelFutureDueItem,
  compareExactQuantities,
  createDemoWorld,
  createExactQuantity,
  createFutureTransitionHandlerRegistry,
  createStableId,
  createWorld,
  currentHistoricalCutoff,
  deserializeWorld,
  futureDueItemStateAt,
  latestObservationForSeriesAt,
  makeIsoDate,
  money,
  mostRecentWorldMetricStateAt,
  observationVintagesForPeriodAt,
  observationsAcrossSeriesAt,
  recordEventKnowledge,
  recordWorldEvent,
  recordWorldMetricObservation,
  recordWorldMetricState,
  scheduleFutureDueItem,
  serializeWorld,
  subtractExactQuantities,
  worldMetricObservationHistory,
  worldMetricStateForPeriodAt,
  worldMetricStateHistory,
} from "./index";
import type {
  EntityId,
  ExactQuantity,
  FutureTransitionHandler,
  FutureTransitionKey,
  MetricReferencePeriod,
  MetricScope,
  Person,
  World,
  WorldMetricDefinition,
  WorldMetricStateRecord,
  WorldMetricValue,
} from "./index";

function bareWorld(seed: string): World {
  const demo = createDemoWorld(seed);
  return createWorld({
    seed,
    currentDate: demo.currentDate,
    jurisdictions: demo.jurisdictionOrder.map((id) => demo.jurisdictions[id]!),
    people: demo.personOrder.map((id) => demo.people[id] as Person),
  });
}

function metric(world: World, stableKey: string): WorldMetricDefinition {
  const definition = Object.values(world.metricCatalog.definitions).find(
    (candidate) => candidate.stableKey === stableKey,
  );
  if (!definition) throw new Error(`Missing test metric: ${stableKey}`);
  return definition;
}

function scope(
  world: World,
  segmentKey: MetricScope["segmentKey"] = null,
): MetricScope {
  return { jurisdictionId: world.jurisdictionOrder[0]!, segmentKey };
}

function quantity(
  numerator: number,
  denominator = 1,
  unit = "count:people",
): WorldMetricValue {
  return {
    kind: "quantity",
    quantity: createExactQuantity(numerator, denominator, unit),
  };
}

function point(world: World): MetricReferencePeriod {
  return { kind: "point", at: world.currentDate };
}

function interval(): MetricReferencePeriod {
  return {
    kind: "interval",
    startsAt: makeIsoDate("2026-01-01"),
    endsAt: makeIsoDate("2026-01-05"),
  };
}

function recordPopulationState(
  world: World,
  stableKey: string,
  value: number,
  supersedesStateId: EntityId | null = null,
): World {
  return recordWorldMetricState(world, {
    stableKey,
    metricId: metric(world, "population.resident-count").id,
    scope: scope(world),
    referencePeriod: point(world),
    value: quantity(value),
    recordedAt: world.currentDate,
    provenance: { kind: "authored", note: "Synthetic Stage 6 metric truth." },
    supersedesStateId,
  });
}

function observation(
  world: World,
  stableKey: string,
  sourceSeriesKey: string,
  vintageKey: string,
  value: number,
  supersedesObservationId: EntityId | null,
  underlyingStateId: EntityId | null,
): World {
  return recordWorldMetricObservation(world, {
    stableKey,
    metricId: metric(world, "population.resident-count").id,
    scope: scope(world),
    referencePeriod: point(world),
    value: quantity(value),
    sourceSeriesKey,
    sourceLabel: `Source ${sourceSeriesKey}`,
    sourceReference: {
      title: "Synthetic public statistical release",
      locator: `fixture:${stableKey}`,
    },
    methodologyKey: "method.synthetic-estimate",
    releaseDate: world.currentDate,
    recordedAt: world.currentDate,
    vintageKey,
    uncertainty: {
      kind: "margin-of-error",
      margin: quantity(25),
      confidence: createExactQuantity(19, 20, "rate:share"),
    },
    supersedesObservationId,
    underlyingStateId,
  });
}

describe("Stage 6 Run A exact quantities", () => {
  it("normalizes, compares, combines, and serializes exact compatible values", () => {
    const half = createExactQuantity(2, 4, "rate:share");
    const sameHalf = createExactQuantity(50, 100, "rate:share");
    expect(half).toStrictEqual({
      numerator: 1,
      denominator: 2,
      unit: "rate:share",
    });
    expect(sameHalf).toStrictEqual(half);
    expect(compareExactQuantities(half, sameHalf)).toBe(0);
    expect(addExactQuantities(half, sameHalf)).toStrictEqual(
      createExactQuantity(1, 1, "rate:share"),
    );
    expect(subtractExactQuantities(half, sameHalf)).toStrictEqual(
      createExactQuantity(0, 1, "rate:share"),
    );
    expect(JSON.parse(JSON.stringify(half))).toStrictEqual(half);
  });

  it("rejects malformed values, incompatible units, and unsafe arithmetic", () => {
    expect(() => createExactQuantity(1, 0, "rate:share")).toThrow(
      /denominator/i,
    );
    expect(() => createExactQuantity(1.5, 2, "rate:share")).toThrow(
      /safe integer/i,
    );
    expect(() => createExactQuantity(1, 2, "share")).toThrow(/namespaced/i);
    const people = createExactQuantity(1, 1, "count:people");
    const jobs = createExactQuantity(1, 1, "count:jobs");
    expect(() => addExactQuantities(people, jobs)).toThrow(/incompatible/i);
    expect(() => compareExactQuantities(people, jobs)).toThrow(/incompatible/i);
    expect(() =>
      addExactQuantities(
        createExactQuantity(Number.MAX_SAFE_INTEGER, 1, "count:people"),
        people,
      ),
    ).toThrow(/safe integer precision/i);
  });
});

describe("Stage 6 Run A metric definitions and canonical state", () => {
  it("validates deterministic definitions, open scopes, value kinds, periods, and missing data", () => {
    const world = bareWorld("stage-6-metric-definitions");
    const population = metric(world, "population.resident-count");
    expect(population.id).toBe(
      createStableId(
        "world-metric-definition",
        `definition:${population.stableKey}`,
      ),
    );
    const segmented = scope(world, "cohort.unprompted-working-age");
    const cutoff = currentHistoricalCutoff(world);
    expect(
      worldMetricStateForPeriodAt(
        world,
        population.id,
        segmented,
        point(world),
        cutoff,
      ),
    ).toBeNull();
    expect(
      mostRecentWorldMetricStateAt(world, population.id, segmented, cutoff),
    ).toBeNull();

    expect(() =>
      recordWorldMetricState(world, {
        stableKey: "wrong-unit",
        metricId: population.id,
        scope: segmented,
        referencePeriod: point(world),
        value: quantity(1, 1, "count:jobs"),
        recordedAt: world.currentDate,
        provenance: { kind: "authored", note: "Wrong unit." },
        supersedesStateId: null,
      }),
    ).toThrow(/unit/i);
    expect(() =>
      recordWorldMetricState(world, {
        stableKey: "wrong-kind",
        metricId: population.id,
        scope: segmented,
        referencePeriod: point(world),
        value: { kind: "money", money: money(100, "USD") },
        recordedAt: world.currentDate,
        provenance: { kind: "authored", note: "Wrong kind." },
        supersedesStateId: null,
      }),
    ).toThrow(/kind/i);
    expect(() =>
      recordWorldMetricState(world, {
        stableKey: "wrong-period",
        metricId: population.id,
        scope: segmented,
        referencePeriod: interval(),
        value: quantity(1),
        recordedAt: world.currentDate,
        provenance: { kind: "authored", note: "Wrong period." },
        supersedesStateId: null,
      }),
    ).toThrow(/period/i);
    expect(() =>
      recordWorldMetricState(world, {
        stableKey: "interval-metric-wrong-point",
        metricId: metric(world, "labor.employment-rate").id,
        scope: segmented,
        referencePeriod: point(world),
        value: quantity(1, 2, "rate:share"),
        recordedAt: world.currentDate,
        provenance: { kind: "authored", note: "Wrong interval shape." },
        supersedesStateId: null,
      }),
    ).toThrow(/period/i);

    const income = metric(world, "income.aggregate-personal");
    expect(() =>
      recordWorldMetricState(world, {
        stableKey: "income-wrong-kind",
        metricId: income.id,
        scope: scope(world),
        referencePeriod: interval(),
        value: quantity(100),
        recordedAt: world.currentDate,
        provenance: { kind: "authored", note: "Wrong income kind." },
        supersedesStateId: null,
      }),
    ).toThrow(/kind/i);
    const withIncome = recordWorldMetricState(world, {
      stableKey: "income-state",
      metricId: income.id,
      scope: scope(world),
      referencePeriod: interval(),
      value: { kind: "money", money: money(9_007_199, "EUR") },
      recordedAt: world.currentDate,
      provenance: { kind: "authored", note: "Exact currency fixture." },
      supersedesStateId: null,
    });
    expect(withIncome.history.metricStates.at(-1)?.value).toStrictEqual({
      kind: "money",
      money: money(9_007_199, "EUR"),
    });
  });

  it("requires explicit correction, preserves truth, and obeys date plus exclusive sequence", () => {
    let world = bareWorld("stage-6-state-corrections");
    world = recordPopulationState(world, "population:first", 10_000);
    const first = world.history.metricStates.at(-1)!;
    const beforeCorrection = currentHistoricalCutoff(world);
    expect(() =>
      recordPopulationState(world, "population:duplicate", 10_100),
    ).toThrow(/explicitly supersede/i);
    world = recordPopulationState(
      world,
      "population:correction",
      10_050,
      first.id,
    );
    const correction = world.history.metricStates.at(-1)!;
    expect(world.history.metricStates).toHaveLength(2);
    expect(
      worldMetricStateForPeriodAt(
        world,
        first.metricId,
        first.scope,
        first.referencePeriod,
        beforeCorrection,
      )?.id,
    ).toBe(first.id);
    expect(
      worldMetricStateForPeriodAt(
        world,
        first.metricId,
        first.scope,
        first.referencePeriod,
        currentHistoricalCutoff(world),
      )?.id,
    ).toBe(correction.id);
    expect(
      worldMetricStateHistory(
        world,
        first.metricId,
        first.scope,
        currentHistoricalCutoff(world),
      ),
    ).toHaveLength(2);

    const beforeBackfill = currentHistoricalCutoff(world);
    const backfillPeriod: MetricReferencePeriod = {
      kind: "point",
      at: makeIsoDate("2020-01-01"),
    };
    const backfillScope = scope(world, "cohort.late-recorded-backfill");
    world = recordWorldMetricState(world, {
      stableKey: "population:late-backfill",
      metricId: first.metricId,
      scope: backfillScope,
      referencePeriod: backfillPeriod,
      value: quantity(9_000),
      recordedAt: world.currentDate,
      provenance: { kind: "authored", note: "Legitimate late backfill." },
      supersedesStateId: null,
    });
    expect(
      worldMetricStateForPeriodAt(
        world,
        first.metricId,
        backfillScope,
        backfillPeriod,
        beforeBackfill,
      ),
    ).toBeNull();
    expect(
      worldMetricStateForPeriodAt(
        world,
        first.metricId,
        backfillScope,
        backfillPeriod,
        currentHistoricalCutoff(world),
      )?.stableKey,
    ).toBe("population:late-backfill");

    const income = metric(world, "income.aggregate-personal");
    expect(() =>
      recordWorldMetricState(world, {
        stableKey: "population:invalid-cross-metric-correction",
        metricId: income.id,
        scope: first.scope,
        referencePeriod: interval(),
        value: { kind: "money", money: money(100, "USD") },
        recordedAt: world.currentDate,
        provenance: { kind: "authored", note: "Invalid correction." },
        supersedesStateId: first.id,
      }),
    ).toThrow(/latest matching truth/i);
    expect(() =>
      recordWorldMetricState(world, {
        stableKey: "population:bad-interval",
        metricId: metric(world, "labor.employment-rate").id,
        scope: first.scope,
        referencePeriod: {
          kind: "interval",
          startsAt: makeIsoDate("2026-01-05"),
          endsAt: makeIsoDate("2026-01-01"),
        },
        value: quantity(1, 2, "rate:share"),
        recordedAt: world.currentDate,
        provenance: { kind: "authored", note: "Invalid chronology." },
        supersedesStateId: null,
      }),
    ).toThrow(/end before/i);
  });

  it("orders the most recent truth by reference period before append sequence", () => {
    let world = bareWorld("stage-6-reference-period-ordering");
    const population = metric(world, "population.resident-count");
    const metricScope = scope(world);
    const oldPeriod: MetricReferencePeriod = {
      kind: "point",
      at: makeIsoDate("2025-01-01"),
    };
    world = recordWorldMetricState(world, {
      stableKey: "period-order:old",
      metricId: population.id,
      scope: metricScope,
      referencePeriod: oldPeriod,
      value: quantity(9_000),
      recordedAt: world.currentDate,
      provenance: { kind: "authored", note: "Older period." },
      supersedesStateId: null,
    });
    const oldState = world.history.metricStates.at(-1)!;
    world = recordWorldMetricState(world, {
      stableKey: "period-order:current",
      metricId: population.id,
      scope: metricScope,
      referencePeriod: point(world),
      value: quantity(10_000),
      recordedAt: world.currentDate,
      provenance: { kind: "authored", note: "Current period." },
      supersedesStateId: null,
    });
    const currentState = world.history.metricStates.at(-1)!;
    world = recordWorldMetricState(world, {
      stableKey: "period-order:late-old-correction",
      metricId: population.id,
      scope: metricScope,
      referencePeriod: oldPeriod,
      value: quantity(9_100),
      recordedAt: world.currentDate,
      provenance: { kind: "authored", note: "Late correction of old period." },
      supersedesStateId: oldState.id,
    });
    expect(
      mostRecentWorldMetricStateAt(
        world,
        population.id,
        metricScope,
        currentHistoricalCutoff(world),
      )?.id,
    ).toBe(currentState.id);
  });
});

describe("Stage 6 Run A observations, vintages, and subjective access", () => {
  it("keeps competing imperfect sources and revisions separate from canonical truth", () => {
    let world = bareWorld("stage-6-observations");
    world = recordPopulationState(world, "truth:population", 10_000);
    expect(world.history.metricObservations).toStrictEqual([]);
    const truth = world.history.metricStates.at(-1)!;
    world = observation(
      world,
      "observation:agency-a:v1",
      "series.agency-a-population",
      "vintage.initial-release",
      9_900,
      null,
      truth.id,
    );
    expect(world.history.metricStates).toHaveLength(1);
    const first = world.history.metricObservations.at(-1)!;
    const beforeRevision = currentHistoricalCutoff(world);
    world = observation(
      world,
      "observation:agency-b:v1",
      "series.private-population",
      "vintage.independent-release",
      10_120,
      null,
      null,
    );
    world = observation(
      world,
      "observation:agency-a:v2",
      "series.agency-a-population",
      "vintage.revised-release",
      9_980,
      first.id,
      truth.id,
    );
    const revision = world.history.metricObservations.at(-1)!;

    expect(
      (truth.value as { kind: "quantity"; quantity: ExactQuantity }).quantity
        .numerator,
    ).toBe(10_000);
    expect(world.history.metricStates).toHaveLength(1);
    expect(
      latestObservationForSeriesAt(
        world,
        truth.metricId,
        truth.scope,
        "series.agency-a-population",
        beforeRevision,
      )?.id,
    ).toBe(first.id);
    expect(
      latestObservationForSeriesAt(
        world,
        truth.metricId,
        truth.scope,
        "series.agency-a-population",
        currentHistoricalCutoff(world),
      )?.id,
    ).toBe(revision.id);
    expect(
      observationVintagesForPeriodAt(
        world,
        truth.metricId,
        truth.scope,
        truth.referencePeriod,
        "series.agency-a-population",
        currentHistoricalCutoff(world),
      ),
    ).toHaveLength(2);
    expect(
      new Set(
        observationsAcrossSeriesAt(
          world,
          truth.metricId,
          truth.scope,
          currentHistoricalCutoff(world),
        ).map((record) => record.sourceSeriesKey),
      ),
    ).toStrictEqual(
      new Set(["series.agency-a-population", "series.private-population"]),
    );
  });

  it("validates uncertainty and revision identity without fabricating unsupported coverage", () => {
    let world = bareWorld("stage-6-observation-validation");
    world = recordPopulationState(world, "truth:population", 10_000);
    const truth = world.history.metricStates.at(-1)!;
    world = observation(
      world,
      "observation:first",
      "series.public-population",
      "vintage.first",
      9_950,
      null,
      truth.id,
    );
    const first = world.history.metricObservations.at(-1)!;
    const malformedBase = {
      stableKey: "observation:bad-range",
      metricId: truth.metricId,
      scope: truth.scope,
      referencePeriod: truth.referencePeriod,
      value: quantity(9_950),
      sourceSeriesKey: "series.public-population",
      sourceLabel: "Public source",
      sourceReference: null,
      methodologyKey: null,
      releaseDate: world.currentDate,
      recordedAt: world.currentDate,
      vintageKey: "vintage.bad-range",
      supersedesObservationId: first.id,
      underlyingStateId: truth.id,
    };
    expect(() =>
      recordWorldMetricObservation(world, {
        ...malformedBase,
        uncertainty: {
          kind: "range",
          lower: quantity(10_000),
          upper: quantity(9_000),
        },
      }),
    ).toThrow(/reversed/i);
    expect(() =>
      recordWorldMetricObservation(world, {
        ...malformedBase,
        stableKey: "observation:bad-unit",
        vintageKey: "vintage.bad-unit",
        uncertainty: {
          kind: "margin-of-error",
          margin: quantity(1, 1, "count:jobs"),
          confidence: null,
        },
      }),
    ).toThrow(/unit/i);
    expect(() =>
      recordWorldMetricObservation(world, {
        ...malformedBase,
        stableKey: "observation:negative-margin",
        vintageKey: "vintage.negative-margin",
        uncertainty: {
          kind: "margin-of-error",
          margin: quantity(-1),
          confidence: null,
        },
      }),
    ).toThrow(/cannot be negative/i);
    const income = metric(world, "income.aggregate-personal");
    expect(() =>
      recordWorldMetricObservation(world, {
        stableKey: "observation:currency-mismatch",
        metricId: income.id,
        scope: scope(world),
        referencePeriod: interval(),
        value: { kind: "money", money: money(100_000, "USD") },
        sourceSeriesKey: "series.income-estimate",
        sourceLabel: "Income source",
        sourceReference: null,
        methodologyKey: null,
        releaseDate: world.currentDate,
        recordedAt: world.currentDate,
        vintageKey: "vintage.income-initial",
        uncertainty: {
          kind: "range",
          lower: { kind: "money", money: money(90_000, "USD") },
          upper: { kind: "money", money: money(110_000, "EUR") },
        },
        supersedesObservationId: null,
        underlyingStateId: null,
      }),
    ).toThrow(/currency/i);
    expect(() =>
      observation(
        world,
        "observation:wrong-series-revision",
        "series.another-source",
        "vintage.invalid-cross-series",
        9_980,
        first.id,
        truth.id,
      ),
    ).toThrow(/matching series/i);
    const noDataScope: MetricScope = {
      jurisdictionId: world.jurisdictionOrder[0]!,
      segmentKey: "region.unsupported-island-area",
    };
    expect(
      worldMetricObservationHistory(
        world,
        truth.metricId,
        noDataScope,
        "series.public-population",
        currentHistoricalCutoff(world),
      ),
    ).toStrictEqual([]);
  });

  it("requires an explicit ordinary release event and knowledge record for one person to learn an observation", () => {
    let world = bareWorld("stage-6-observation-knowledge");
    const awarePerson = world.personOrder[0]!;
    const unawarePerson = world.personOrder[1]!;
    const initialKnowledge = world.history.knowledge.length;
    world = recordPopulationState(world, "truth:population", 10_000);
    expect(world.history.knowledge).toHaveLength(initialKnowledge);
    const truth = world.history.metricStates.at(-1)!;
    world = observation(
      world,
      "observation:public:v1",
      "series.public-population",
      "vintage.public-release",
      9_930,
      null,
      truth.id,
    );
    expect(world.history.knowledge).toHaveLength(initialKnowledge);
    const observed = world.history.metricObservations.at(-1)!;
    const beforeRelease = currentHistoricalCutoff(world);
    world = recordWorldEvent(world, {
      stableKey: "observation:public:release-event",
      type: "statistics.public-release",
      occurredAt: world.currentDate,
      recordedAt: world.currentDate,
      jurisdictionId: world.jurisdictionOrder[0]!,
      involvedEntityIds: [observed.id],
      participants: [],
      personFactConstraints: [],
      visibility: "public",
      tags: ["statistics.release"],
      summary: "A synthetic statistical observation was released publicly.",
      context: {
        location: null,
        socialContext: "Ordinary public-record release.",
        pressure: null,
        choice: null,
        motivation: null,
        immediateReaction: null,
      },
    });
    const releaseEvent = world.history.events.at(-1)!;
    world = recordEventKnowledge(world, {
      stableKey: "knowledge:observation:public",
      personId: awarePerson,
      eventId: releaseEvent.id,
      learnedAt: world.currentDate,
      believedSummary: "The public series estimated the population at 9,930.",
      accuracy: "accurate",
      confidence: "medium",
      source: {
        kind: "public-record",
        reference: observed.sourceReference!.locator!,
      },
    });
    const knowledge = world.history.knowledge.at(-1)!;
    expect(releaseEvent.involvedEntityIds).toContain(observed.id);
    expect(
      world.history.knowledge.some((record) => record.personId === awarePerson),
    ).toBe(true);
    expect(
      world.history.knowledge.some(
        (record) => record.personId === unawarePerson,
      ),
    ).toBe(false);
    expect(knowledge.sequence).toBeGreaterThanOrEqual(
      beforeRelease.historySequenceExclusive,
    );
    expect(
      world.history.knowledge.filter(
        (record) =>
          record.personId === awarePerson &&
          record.sequence < beforeRelease.historySequenceExclusive,
      ),
    ).toStrictEqual([]);
  });
});

describe("Stage 6 Run A future due items and authoritative time", () => {
  function schedule(
    world: World,
    key: string,
    dueAt: string,
    transitionKey: FutureTransitionKey = "custom:synthetic-transition",
  ): World {
    return scheduleFutureDueItem(world, {
      stableKey: key,
      dueAt,
      transitionKey,
      entityIds: [world.jurisdictionOrder[0]!],
      jurisdictionId: world.jurisdictionOrder[0]!,
      provenance: { kind: "authored", note: "Synthetic future transition." },
    });
  }

  function eventHandler(invocations?: string[]): FutureTransitionHandler {
    return (world, item) => {
      invocations?.push(item.stableKey);
      const next = recordWorldEvent(world, {
        stableKey: `${item.stableKey}:outcome-event`,
        type: "simulation.synthetic-transition-resolved",
        occurredAt: item.dueAt,
        recordedAt: item.dueAt,
        jurisdictionId: item.jurisdictionId,
        involvedEntityIds: [item.id, ...item.entityIds].sort(),
        participants: [],
        personFactConstraints: [],
        visibility: "public",
        tags: ["simulation.future-transition"],
        summary: `Resolved ${item.stableKey}.`,
        context: {
          location: null,
          socialContext: "Synthetic deterministic due-item handler.",
          pressure: null,
          choice: null,
          motivation: null,
          immediateReaction: null,
        },
      });
      return {
        world: next,
        status: "resolved",
        reasonKey: null,
        context: "Synthetic handler completed.",
        outcomeEventId: next.history.events.at(-1)!.id,
      };
    };
  }

  it("schedules, waits, resolves once through advanceWorld, and links ordinary history", () => {
    let world = bareWorld("stage-6-due-resolution");
    const dueAt = makeIsoDate("2026-01-15");
    world = schedule(world, "due:one", dueAt);
    const item = world.history.futureDueItems.at(-1)!;
    expect(item).not.toHaveProperty("payload");
    expect(item).not.toHaveProperty("recurrence");
    expect(
      futureDueItemStateAt(world, item.id, currentHistoricalCutoff(world))
        ?.status,
    ).toBe("scheduled");
    const beforeDue = advanceWorld(world, 5);
    expect(
      futureDueItemStateAt(
        beforeDue,
        item.id,
        currentHistoricalCutoff(beforeDue),
      )?.status,
    ).toBe("scheduled");
    const calls: string[] = [];
    const registry = createFutureTransitionHandlerRegistry([
      ["custom:synthetic-transition", eventHandler(calls)],
    ]);
    const resolved = advanceWorld(beforeDue, 5, registry);
    const state = futureDueItemStateAt(
      resolved,
      item.id,
      currentHistoricalCutoff(resolved),
    );
    expect(state).toMatchObject({ status: "resolved", effectiveAt: dueAt });
    expect(
      resolved.history.events.some(
        (event) => event.id === state?.outcomeEventId,
      ),
    ).toBe(true);
    expect(calls).toStrictEqual(["due:one"]);
    const later = advanceWorld(resolved, 7, registry);
    expect(calls).toStrictEqual(["due:one"]);
    expect(
      later.history.futureDueItemStates.filter(
        (candidate) => candidate.dueItemId === item.id,
      ),
    ).toHaveLength(2);
  });

  it("orders multiple dates and same-date items by creation sequence", () => {
    let world = bareWorld("stage-6-due-order");
    world = schedule(world, "due:later", "2026-01-20");
    world = schedule(world, "due:same-first", "2026-01-15");
    world = schedule(world, "due:same-second", "2026-01-15");
    const order: string[] = [];
    const registry = createFutureTransitionHandlerRegistry([
      ["custom:synthetic-transition", eventHandler(order)],
    ]);
    const advanced = advanceWorld(world, 20, registry);
    expect(order).toStrictEqual([
      "due:same-first",
      "due:same-second",
      "due:later",
    ]);
    expect(
      advanced.history.futureDueItemStates.filter(
        (state) => state.status === "resolved",
      ),
    ).toHaveLength(3);
  });

  it("treats cancelled and blocked items as terminal without reruns", () => {
    let cancelled = bareWorld("stage-6-due-cancelled");
    cancelled = schedule(cancelled, "due:cancelled", "2026-01-15");
    const cancelledItem = cancelled.history.futureDueItems.at(-1)!;
    cancelled = cancelFutureDueItem(cancelled, {
      stableKey: "due:cancelled:state:cancelled",
      dueItemId: cancelledItem.id,
      effectiveAt: cancelled.currentDate,
      reasonKey: "custom:withdrawn",
      context: "Explicitly withdrawn before its due date.",
    });
    const calls: string[] = [];
    const registry = createFutureTransitionHandlerRegistry([
      ["custom:synthetic-transition", eventHandler(calls)],
      [
        "custom:block-transition",
        (world) => ({
          world,
          status: "blocked",
          reasonKey: "custom:test-block",
          context: "Synthetic block.",
          outcomeEventId: null,
        }),
      ],
    ]);
    cancelled = advanceWorld(cancelled, 20, registry);
    expect(calls).toStrictEqual([]);

    let blocked = bareWorld("stage-6-due-blocked");
    blocked = schedule(
      blocked,
      "due:blocked",
      "2026-01-15",
      "custom:block-transition",
    );
    const blockedItem = blocked.history.futureDueItems.at(-1)!;
    blocked = advanceWorld(blocked, 10, registry);
    expect(
      futureDueItemStateAt(
        blocked,
        blockedItem.id,
        currentHistoricalCutoff(blocked),
      )?.status,
    ).toBe("blocked");
    blocked = advanceWorld(blocked, 10, registry);
    expect(
      blocked.history.futureDueItemStates.filter(
        (state) => state.dueItemId === blockedItem.id,
      ),
    ).toHaveLength(2);
  });

  it("rejects impossible scheduling and makes missing/failed handlers atomic", () => {
    const world = bareWorld("stage-6-due-atomicity");
    expect(() => schedule(world, "due:past", "2026-01-01")).toThrow(
      /after its scheduling/i,
    );
    expect(() =>
      scheduleFutureDueItem(world, {
        stableKey: "due:missing-ref",
        dueAt: "2026-01-15",
        transitionKey: "custom:synthetic-transition",
        entityIds: [createStableId("person", "missing")],
        jurisdictionId: null,
        provenance: { kind: "authored", note: "Missing reference." },
      }),
    ).toThrow(/unavailable entity/i);
    const scheduled = schedule(world, "due:atomic", "2026-01-15");
    const before = structuredClone(scheduled);
    expect(() => advanceWorld(scheduled, 10)).toThrow(
      /missing future-transition handler/i,
    );
    expect(scheduled).toStrictEqual(before);
    const failing = createFutureTransitionHandlerRegistry([
      [
        "custom:synthetic-transition",
        () => {
          throw new Error("Synthetic handler failure.");
        },
      ],
    ]);
    expect(() => advanceWorld(scheduled, 10, failing)).toThrow(
      /handler failure/i,
    );
    expect(scheduled).toStrictEqual(before);
  });

  it("preserves legacy time behavior when there are no pending due items", () => {
    const world = bareWorld("stage-6-no-due-items");
    const advanced = advanceWorld(world, 3);
    expect(advanced.currentDate).toBe("2026-01-08");
    expect(advanced.history.futureDueItems).toStrictEqual([]);
    expect(advanced.history.events.at(-1)?.type).toBe(
      "simulation.time-advanced",
    );
  });
});

describe("Stage 6 Run A persistence and loaded-world integrity", () => {
  it("round-trips the complete metric, observation, uncertainty, and due graph exactly", () => {
    let world = bareWorld("stage-6-persistence");
    world = recordPopulationState(world, "truth:population", 10_000);
    const truth = world.history.metricStates.at(-1)!;
    world = observation(
      world,
      "observation:persistence",
      "series.persistence-fixture",
      "vintage.persistence-fixture",
      9_990,
      null,
      truth.id,
    );
    world = scheduleFutureDueItem(world, {
      stableKey: "due:persistence",
      dueAt: "2026-02-01",
      transitionKey: "custom:persistence-fixture",
      entityIds: [truth.id],
      jurisdictionId: world.jurisdictionOrder[0]!,
      provenance: { kind: "simulated", sourceEntityIds: [truth.id] },
    });
    const payload = serializeWorld(world);
    const loaded = deserializeWorld(payload);
    expect(loaded).toStrictEqual(world);
    expect(serializeWorld(loaded)).toBe(payload);
    expect(loaded.schemaVersion).toBe(10);
    expect(loaded.generatorVersion).toBe("demo-world-v10");
    expect(JSON.parse(payload).formatVersion).toBe(9);
  });

  it("rejects corrupted persisted supersession and due-reference histories", () => {
    let world = bareWorld("stage-6-corrupt-persistence");
    world = recordPopulationState(world, "truth:population", 10_000);
    const first = world.history.metricStates.at(-1)!;
    world = recordPopulationState(
      world,
      "truth:population:correction",
      10_050,
      first.id,
    );
    world = scheduleFutureDueItem(world, {
      stableKey: "due:corruption",
      dueAt: "2026-02-01",
      transitionKey: "custom:corruption",
      entityIds: [first.id],
      jurisdictionId: world.jurisdictionOrder[0]!,
      provenance: { kind: "simulated", sourceEntityIds: [first.id] },
    });
    const brokenCorrection = structuredClone(world);
    const correction = brokenCorrection.history
      .metricStates[1] as WorldMetricStateRecord;
    (correction as { supersedesStateId: EntityId | null }).supersedesStateId =
      null;
    expect(() => assertWorldIntegrity(brokenCorrection)).toThrow(
      /explicitly supersede/i,
    );

    const parsed = JSON.parse(serializeWorld(world)) as {
      snapshotId: EntityId;
      world: World;
    };
    const due = parsed.world.history.futureDueItems[0]!;
    (due as unknown as { entityIds: EntityId[] }).entityIds = [
      createStableId("person", "missing"),
    ];
    parsed.snapshotId = createStableId(
      "snapshot",
      JSON.stringify(parsed.world),
    );
    expect(() => deserializeWorld(JSON.stringify(parsed))).toThrow(
      /unavailable entity/i,
    );
  });
});
