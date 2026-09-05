import { describe, expect, it } from "vitest";
import {
  POLICY_REALIZATION_TRANSITION_KEY,
  advanceWorld,
  assertWorldIntegrity,
  createDemoWorld,
  createExactQuantity,
  createFutureTransitionHandlerRegistry,
  createPolicyDecisionContext,
  createStableId,
  createWorld,
  deserializeWorld,
  directPolicyImplementationFactor,
  distinctRootCausalIds,
  evaluateDecision,
  latestPolicyBaselineForSeriesAt,
  makeIsoDate,
  materializePerson,
  money,
  policyBaselineAt,
  policyRealizationTransitionHandler,
  realizePolicyEstimate,
  recordEvaluatedMetricState,
  recordPolicyAlternative,
  recordPolicyAnalysisKnowledge,
  recordPolicyBaseline,
  recordPolicyEstimate,
  recordPolicyImplementationProfile,
  recordPolicyOperation,
  recordPolicyProjectionRoot,
  recordWorldMetricState,
  resourceRatioPolicyImplementationFactor,
  scheduleFutureDueItem,
  schedulePolicyEstimateRealization,
  serializeWorld,
  worldMetricDefinitionByStableKey,
} from "./index";
import type {
  EntityId,
  HistoricalCutoff,
  Jurisdiction,
  MetricReferencePeriod,
  MetricScope,
  PolicyAlternativeRecord,
  PolicyBaselineRecord,
  PolicyEstimateRecord,
  PolicyImplementationFactor,
  PolicyOperationRecord,
  PolicySemanticKey,
  QuantitativePolicyOperation,
  World,
  WorldMetricValue,
} from "./index";

const AUTHORED = {
  kind: "authored" as const,
  note: "Synthetic Stage 6 Run C behavioral fixture.",
};

function runCWorld(seed: string): World {
  return advanceWorld(createDemoWorld(seed), 370);
}

function scope(
  world: World,
  jurisdictionId = world.jurisdictionOrder[0]!,
): MetricScope {
  return { jurisdictionId, segmentKey: null };
}

function annual(year: number): MetricReferencePeriod {
  return {
    kind: "interval",
    startsAt: makeIsoDate(`${year}-01-01`),
    endsAt: makeIsoDate(`${year}-12-31`),
  };
}

function point(at: string): MetricReferencePeriod {
  return { kind: "point", at: makeIsoDate(at) };
}

function moneyValue(minorUnits: number, currency = "USD"): WorldMetricValue {
  return { kind: "money", money: money(minorUnits, currency) };
}

function quantityValue(
  numerator: number,
  denominator: number,
  unit: string,
): WorldMetricValue {
  return {
    kind: "quantity",
    quantity: createExactQuantity(numerator, denominator, unit),
  };
}

function currentCutoff(world: World): HistoricalCutoff {
  return {
    asOfDate: world.currentDate,
    historySequenceExclusive: world.history.nextSequence,
  };
}

function semanticKey(namespace: string, value: string): PolicySemanticKey {
  return `${namespace}:${value.replace(/[^a-z0-9._-]/g, ".")}` as PolicySemanticKey;
}

function metricId(world: World, stableKey: string): EntityId {
  return worldMetricDefinitionByStableKey(world, stableKey).id;
}

function recordSourceState(
  world: World,
  stableKey: string,
  metricKey: string,
  referencePeriod: MetricReferencePeriod,
  value: WorldMetricValue,
  targetScope = scope(world),
): World {
  return recordWorldMetricState(world, {
    stableKey,
    metricId: metricId(world, metricKey),
    scope: targetScope,
    referencePeriod,
    value,
    recordedAt: world.currentDate,
    provenance: AUTHORED,
    supersedesStateId: null,
  });
}

function recordBaseline(
  world: World,
  stableKey: string,
  metricKey: string,
  referencePeriod: MetricReferencePeriod,
  expectedValue: WorldMetricValue,
  sourceEntityIds: readonly EntityId[],
  targetScope = scope(world),
  supersedesBaselineId: EntityId | null = null,
  seriesKey: PolicySemanticKey = semanticKey("baseline", stableKey),
): { readonly world: World; readonly baseline: PolicyBaselineRecord } {
  const next = recordPolicyBaseline(world, {
    stableKey,
    seriesKey,
    metricId: metricId(world, metricKey),
    scope: targetScope,
    referencePeriod,
    expectedValue,
    generatedAt: world.currentDate,
    recordedAt: world.currentDate,
    sourceEntityIds,
    methodologyKey: "forecast:synthetic-v1",
    assumptionKeys: ["assumption:static-context"],
    uncertainty: { kind: "none" },
    provenance: AUTHORED,
    supersedesBaselineId,
  });
  return { world: next, baseline: next.history.policyBaselines.at(-1)! };
}

function recordAlternative(
  world: World,
  stableKey: string,
  title = stableKey,
): { readonly world: World; readonly alternative: PolicyAlternativeRecord } {
  const next = recordPolicyAlternative(world, {
    stableKey,
    alternativeKind: "proposal:public-investment",
    title,
    summary: "A quantitative public-investment alternative.",
    propositionId: null,
    proposedAt: world.currentDate,
    recordedAt: world.currentDate,
    provenance: AUTHORED,
  });
  return { world: next, alternative: next.history.policyAlternatives.at(-1)! };
}

function recordOperation(
  world: World,
  stableKey: string,
  alternativeId: EntityId,
  baseline: PolicyBaselineRecord,
  operation: QuantitativePolicyOperation,
  overrides: {
    readonly targetScope?: MetricScope;
    readonly referencePeriod?: MetricReferencePeriod;
    readonly trigger?: PolicyOperationRecord["trigger"];
    readonly startsAt?: string;
    readonly maturesAt?: string;
    readonly endsAt?: string | null;
  } = {},
): { readonly world: World; readonly operation: PolicyOperationRecord } {
  const next = recordPolicyOperation(world, {
    stableKey,
    alternativeId,
    targetMetricId: baseline.metricId,
    targetScope: overrides.targetScope ?? baseline.scope,
    targetReferencePeriod:
      overrides.referencePeriod ?? baseline.referencePeriod,
    targetBaselineId: baseline.id,
    operation,
    trigger: overrides.trigger ?? null,
    mechanismDefinitionId: world.causalMechanismCatalog.definitionOrder[0]!,
    realizationKind: "policy:quantitative-operation",
    timing: {
      startsAt: overrides.startsAt ?? "2027-02-01",
      maturesAt: overrides.maturesAt ?? "2027-03-01",
      endsAt: overrides.endsAt ?? null,
    },
    recordedAt: world.currentDate,
    provenance: AUTHORED,
  });
  return { world: next, operation: next.history.policyOperations.at(-1)! };
}

function fullFactors(
  evidenceEntityIds: readonly EntityId[],
): PolicyImplementationFactor[] {
  return [
    "authority",
    "funding",
    "administrative-capacity",
    "enforcement-compliance",
    "uptake-participation",
  ].map((kind) =>
    directPolicyImplementationFactor({
      kind: kind as PolicyImplementationFactor["kind"],
      share: createExactQuantity(1, 1, "rate:share"),
      reasonKey: `implementation:${kind}-available`,
      explanation: `${kind} is fully available in this fixture.`,
      evidenceEntityIds,
    }),
  );
}

function recordEstimate(
  world: World,
  stableKey: string,
  alternativeId: EntityId,
  operationIds: readonly EntityId[],
  factors: readonly PolicyImplementationFactor[],
  supersedesEstimateId: EntityId | null = null,
  seriesKey: PolicySemanticKey = semanticKey("estimate", stableKey),
): { readonly world: World; readonly estimate: PolicyEstimateRecord } {
  let next = recordPolicyImplementationProfile(world, {
    stableKey: `${stableKey}:profile`,
    alternativeId,
    operationIds,
    factors,
    assessedAt: world.currentDate,
    recordedAt: world.currentDate,
    provenance: AUTHORED,
  });
  const profile = next.history.policyImplementationProfiles.at(-1)!;
  next = recordPolicyProjectionRoot(next, {
    stableKey: `${stableKey}:projected-cause`,
    alternativeId,
    operationIds,
    effectiveAt: next.currentDate,
    recordedAt: next.currentDate,
  });
  const projectedCause = next.history.causalProcesses.at(-1)!;
  next = recordPolicyEstimate(next, {
    stableKey,
    seriesKey,
    alternativeId,
    operationIds,
    implementationProfileId: profile.id,
    projectedCausalProcessId: projectedCause.id,
    generatedAt: next.currentDate,
    recordedAt: next.currentDate,
    provenance: AUTHORED,
    supersedesEstimateId,
  });
  return { world: next, estimate: next.history.policyEstimates.at(-1)! };
}

function baselineWorld(seed: string): {
  readonly world: World;
  readonly revenueStateId: EntityId;
  readonly outlayStateId: EntityId;
  readonly outputStateId: EntityId;
} {
  let world = runCWorld(seed);
  world = recordSourceState(
    world,
    `${seed}:revenue:2026`,
    "government.revenue",
    annual(2026),
    moneyValue(90_000_000_000),
  );
  const revenueStateId = world.history.metricStates.at(-1)!.id;
  world = recordSourceState(
    world,
    `${seed}:outlays:2026`,
    "government.outlays",
    annual(2026),
    moneyValue(70_000_000_000),
  );
  const outlayStateId = world.history.metricStates.at(-1)!.id;
  world = recordSourceState(
    world,
    `${seed}:output:2026`,
    "economy.output-activity",
    annual(2026),
    moneyValue(300_000_000_000),
  );
  return {
    world,
    revenueStateId,
    outlayStateId,
    outputStateId: world.history.metricStates.at(-1)!.id,
  };
}

function realizedPolicyWorld(seed: string): {
  readonly world: World;
  readonly alternative: PolicyAlternativeRecord;
  readonly operation: PolicyOperationRecord;
  readonly estimate: PolicyEstimateRecord;
} {
  const prepared = baselineWorld(seed);
  let world = prepared.world;
  const baseline = recordBaseline(
    world,
    `${seed}:outlays`,
    "government.outlays",
    annual(2027),
    moneyValue(70_000_000_000),
    [prepared.outlayStateId],
  );
  world = baseline.world;
  const alternative = recordAlternative(world, `${seed}:alternative`);
  world = alternative.world;
  const operation = recordOperation(
    world,
    `${seed}:operation`,
    alternative.alternative.id,
    baseline.baseline,
    {
      kind: "absolute-change",
      direction: "increase",
      magnitude: moneyValue(1_000_000_000),
    },
    { endsAt: "2028-01-01" },
  );
  const estimate = recordEstimate(
    operation.world,
    `${seed}:estimate`,
    alternative.alternative.id,
    [operation.operation.id],
    fullFactors([baseline.baseline.id]),
  );
  world = realizePolicyEstimate(estimate.world, {
    stableKey: `${seed}:realization`,
    estimateId: estimate.estimate.id,
    provenance: AUTHORED,
  });
  return {
    world,
    alternative: alternative.alternative,
    operation: operation.operation,
    estimate: estimate.estimate,
  };
}

function policyEstimateWorld(seed: string): {
  readonly world: World;
  readonly alternative: PolicyAlternativeRecord;
  readonly baseline: PolicyBaselineRecord;
  readonly operation: PolicyOperationRecord;
  readonly estimate: PolicyEstimateRecord;
  readonly seriesKey: PolicySemanticKey;
} {
  const prepared = baselineWorld(seed);
  let world = prepared.world;
  const baseline = recordBaseline(
    world,
    `${seed}:outlays`,
    "government.outlays",
    annual(2027),
    moneyValue(70_000_000_000),
    [prepared.outlayStateId],
  );
  world = baseline.world;
  const alternative = recordAlternative(world, `${seed}:alternative`);
  world = alternative.world;
  const operation = recordOperation(
    world,
    `${seed}:operation`,
    alternative.alternative.id,
    baseline.baseline,
    {
      kind: "absolute-change",
      direction: "increase",
      magnitude: moneyValue(1_000_000_000),
    },
    { endsAt: "2028-01-01" },
  );
  const seriesKey = semanticKey("estimate", `${seed}:series`);
  const estimate = recordEstimate(
    operation.world,
    `${seed}:e1`,
    alternative.alternative.id,
    [operation.operation.id],
    fullFactors([baseline.baseline.id]),
    null,
    seriesKey,
  );
  return {
    world: estimate.world,
    alternative: alternative.alternative,
    baseline: baseline.baseline,
    operation: operation.operation,
    estimate: estimate.estimate,
    seriesKey,
  };
}

function scheduledPolicyEstimateWorld(seed: string): {
  readonly world: World;
  readonly alternative: PolicyAlternativeRecord;
  readonly baseline: PolicyBaselineRecord;
  readonly operation: PolicyOperationRecord;
  readonly estimate: PolicyEstimateRecord;
  readonly dueItemId: EntityId;
  readonly seriesKey: PolicySemanticKey;
} {
  const prepared = policyEstimateWorld(seed);
  const world = schedulePolicyEstimateRealization(prepared.world, {
    stableKey: `${seed}:e1-due`,
    estimateId: prepared.estimate.id,
  });
  const dueItem = world.history.futureDueItems.at(-1);
  if (!dueItem) throw new Error("Expected scheduled policy due item.");
  return {
    ...prepared,
    world,
    dueItemId: dueItem.id,
  };
}

describe("Stage 6 Run C quantitative operations and frozen baselines", () => {
  it("evaluates set, absolute, relative, baseline-share, cap, floor, and triggers exactly", () => {
    const prepared = baselineWorld("run-c-operation-family");
    let world = prepared.world;
    let result = recordBaseline(
      world,
      "outlays-2027",
      "government.outlays",
      annual(2027),
      moneyValue(70_000_000_000),
      [prepared.outlayStateId],
    );
    world = result.world;
    const outlays = result.baseline;
    result = recordBaseline(
      world,
      "revenue-2027",
      "government.revenue",
      annual(2027),
      moneyValue(90_000_000_000),
      [prepared.revenueStateId],
    );
    world = result.world;
    const revenue = result.baseline;
    const cases: readonly [string, QuantitativePolicyOperation, number][] = [
      [
        "set",
        { kind: "set-level", value: moneyValue(72_000_000_000) },
        72_000_000_000,
      ],
      [
        "absolute",
        {
          kind: "absolute-change",
          direction: "increase",
          magnitude: moneyValue(2_000_000_000),
        },
        72_000_000_000,
      ],
      [
        "relative",
        {
          kind: "relative-change",
          direction: "increase",
          share: createExactQuantity(1, 10, "rate:share"),
        },
        77_000_000_000,
      ],
      [
        "share",
        {
          kind: "share-of-baseline",
          direction: "increase",
          sourceBaselineId: revenue.id,
          share: createExactQuantity(1, 10, "rate:share"),
        },
        79_000_000_000,
      ],
      [
        "cap",
        { kind: "cap", maximum: moneyValue(65_000_000_000) },
        65_000_000_000,
      ],
      [
        "floor",
        { kind: "floor", minimum: moneyValue(75_000_000_000) },
        75_000_000_000,
      ],
    ];
    for (const [key, semantics, expected] of cases) {
      const alternativeResult = recordAlternative(world, `operation-${key}`);
      world = alternativeResult.world;
      const operationResult = recordOperation(
        world,
        `operation-${key}:outlays`,
        alternativeResult.alternative.id,
        outlays,
        semantics,
      );
      world = operationResult.world;
      const estimateResult = recordEstimate(
        world,
        `operation-${key}:estimate`,
        alternativeResult.alternative.id,
        [operationResult.operation.id],
        fullFactors([outlays.id]),
      );
      world = estimateResult.world;
      expect(
        estimateResult.estimate.consequences[0]?.estimatedResult,
      ).toStrictEqual(moneyValue(expected));
    }

    const triggerAlternative = recordAlternative(world, "operation-trigger");
    world = triggerAlternative.world;
    const triggered = recordOperation(
      world,
      "operation-trigger:met",
      triggerAlternative.alternative.id,
      outlays,
      {
        kind: "absolute-change",
        direction: "increase",
        magnitude: moneyValue(1_000_000_000),
      },
      {
        trigger: {
          baselineId: revenue.id,
          comparison: "at-least",
          threshold: moneyValue(90_000_000_000),
        },
      },
    );
    world = triggered.world;
    const notTriggered = recordOperation(
      world,
      "operation-trigger:not-met",
      triggerAlternative.alternative.id,
      outlays,
      {
        kind: "absolute-change",
        direction: "increase",
        magnitude: moneyValue(1_000_000_000),
      },
      {
        trigger: {
          baselineId: revenue.id,
          comparison: "at-least",
          threshold: moneyValue(100_000_000_000),
        },
      },
    );
    world = notTriggered.world;
    const triggerEstimate = recordEstimate(
      world,
      "operation-trigger:estimate",
      triggerAlternative.alternative.id,
      [triggered.operation.id, notTriggered.operation.id],
      fullFactors([revenue.id]),
    ).estimate;
    expect(
      triggerEstimate.consequences.find(
        (item) => item.operationId === triggered.operation.id,
      )?.triggered,
    ).toBe(true);
    expect(
      triggerEstimate.consequences.find(
        (item) => item.operationId === notTriggered.operation.id,
      ),
    ).toMatchObject({ triggered: false, estimatedChange: moneyValue(0) });
  });

  it("rejects unit, currency, and reference-period mismatch rather than guessing", () => {
    const prepared = baselineWorld("run-c-operation-mismatch");
    let world = prepared.world;
    const baselineResult = recordBaseline(
      world,
      "mismatch-outlays",
      "government.outlays",
      annual(2027),
      moneyValue(70_000_000_000),
      [prepared.outlayStateId],
    );
    world = baselineResult.world;
    const alternativeResult = recordAlternative(world, "mismatch-alternative");
    world = alternativeResult.world;
    expect(() =>
      recordOperation(
        world,
        "mismatch-unit",
        alternativeResult.alternative.id,
        baselineResult.baseline,
        {
          kind: "absolute-change",
          direction: "increase",
          magnitude: quantityValue(1, 1, "count:people"),
        },
      ),
    ).toThrow(/kind|definition|compatible/i);
    expect(() =>
      recordOperation(
        world,
        "mismatch-currency",
        alternativeResult.alternative.id,
        baselineResult.baseline,
        {
          kind: "absolute-change",
          direction: "increase",
          magnitude: moneyValue(1_000, "EUR"),
        },
      ),
    ).toThrow(/currenc|compatible/i);
    expect(() =>
      recordOperation(
        world,
        "mismatch-period",
        alternativeResult.alternative.id,
        baselineResult.baseline,
        { kind: "cap", maximum: moneyValue(70_000_000_000) },
        { referencePeriod: point("2027-06-01") },
      ),
    ).toThrow(/period|baseline/i);
  });

  it("freezes historical baseline identity and excludes later reality and backfill at an earlier sequence", () => {
    const prepared = baselineWorld("run-c-baseline-history");
    let world = prepared.world;
    const first = recordBaseline(
      world,
      "historical-outlays-v1",
      "government.outlays",
      annual(2027),
      moneyValue(70_000_000_000),
      [prepared.outlayStateId],
      scope(world),
      null,
      "baseline:historical-outlays",
    );
    world = first.world;
    const cutoffBeforeBackfill = currentCutoff(world);
    world = advanceWorld(world, 370);
    world = recordSourceState(
      world,
      "actual-outlays-2027",
      "government.outlays",
      annual(2027),
      moneyValue(82_000_000_000),
    );
    expect(first.baseline.expectedValue).toStrictEqual(
      moneyValue(70_000_000_000),
    );
    world = recordPolicyBaseline(world, {
      stableKey: "historical-outlays-v2-backfill",
      seriesKey: "baseline:historical-outlays",
      metricId: first.baseline.metricId,
      scope: first.baseline.scope,
      referencePeriod: first.baseline.referencePeriod,
      expectedValue: moneyValue(74_000_000_000),
      generatedAt: makeIsoDate("2027-01-09"),
      recordedAt: world.currentDate,
      sourceEntityIds: [world.id],
      methodologyKey: "forecast:backfilled-vintage",
      assumptionKeys: ["assumption:historical-reconstruction"],
      uncertainty: { kind: "none" },
      provenance: AUTHORED,
      supersedesBaselineId: first.baseline.id,
    });
    const revised = world.history.policyBaselines.at(-1)!;
    expect(
      policyBaselineAt(world, revised.id, cutoffBeforeBackfill),
    ).toBeNull();
    expect(
      latestPolicyBaselineForSeriesAt(world, "baseline:historical-outlays", {
        asOfDate: world.currentDate,
        historySequenceExclusive: cutoffBeforeBackfill.historySequenceExclusive,
      })?.id,
    ).toBe(first.baseline.id);
    expect(
      latestPolicyBaselineForSeriesAt(
        world,
        "baseline:historical-outlays",
        currentCutoff(world),
      )?.id,
    ).toBe(revised.id);
  });
});

function serializeUnchecked(world: World): string {
  const payload = JSON.parse(
    serializeWorld(runCWorld("run-c-corrupt-envelope")),
  ) as {
    snapshotId: string;
    worldId: string;
    savedAtWorldDate: string;
    world: World;
  };
  payload.world = world;
  payload.worldId = world.id;
  payload.savedAtWorldDate = world.currentDate;
  return JSON.stringify(payload);
}

describe("Stage 6 Run C implementation, degree, causality, and time", () => {
  it("keeps projections noncanonical until explicit realization creates Run B effects and later metric truth", () => {
    const prepared = baselineWorld("run-c-projection-realization");
    let world = prepared.world;
    const outlayBaseline = recordBaseline(
      world,
      "projection-outlays",
      "government.outlays",
      annual(2027),
      moneyValue(70_000_000_000),
      [prepared.outlayStateId],
    );
    world = outlayBaseline.world;
    const outputBaseline = recordBaseline(
      world,
      "projection-output",
      "economy.output-activity",
      annual(2027),
      moneyValue(300_000_000_000),
      [prepared.outputStateId],
    );
    world = outputBaseline.world;
    const alternativeResult = recordAlternative(world, "projection-investment");
    world = alternativeResult.world;
    const outlayOperation = recordOperation(
      world,
      "projection-investment:outlays",
      alternativeResult.alternative.id,
      outlayBaseline.baseline,
      {
        kind: "absolute-change",
        direction: "increase",
        magnitude: moneyValue(9_000_000_000),
      },
    );
    world = outlayOperation.world;
    const outputOperation = recordOperation(
      world,
      "projection-investment:output",
      alternativeResult.alternative.id,
      outputBaseline.baseline,
      {
        kind: "absolute-change",
        direction: "increase",
        magnitude: moneyValue(3_000_000_000),
      },
    );
    world = outputOperation.world;
    const statesBeforeProjection = world.history.metricStates.length;
    const effectsBeforeProjection = world.history.effectActivations.length;
    const estimateResult = recordEstimate(
      world,
      "projection-investment:estimate",
      alternativeResult.alternative.id,
      [outlayOperation.operation.id, outputOperation.operation.id],
      fullFactors([outlayBaseline.baseline.id, outputBaseline.baseline.id]),
    );
    world = estimateResult.world;
    expect(world.history.metricStates).toHaveLength(statesBeforeProjection);
    expect(world.history.effectActivations).toHaveLength(
      effectsBeforeProjection,
    );
    expect(estimateResult.estimate.consequences).toHaveLength(2);

    world = realizePolicyEstimate(world, {
      stableKey: "projection-investment:realization",
      estimateId: estimateResult.estimate.id,
      provenance: AUTHORED,
    });
    const realization = world.history.policyRealizations.at(-1)!;
    expect(realization.status).toBe("full");
    expect(realization.consequences).toHaveLength(2);
    const effectIds = realization.consequences.map(
      (item) => item.effectActivationId,
    );
    expect(
      distinctRootCausalIds(world, effectIds, currentCutoff(world)),
    ).toStrictEqual([estimateResult.estimate.projectedCausalProcessId]);
    expect(
      world.history.effectActivations.find((item) => item.id === effectIds[0])
        ?.magnitudeBasis,
    ).toStrictEqual({ kind: "interval-total", referencePeriod: annual(2027) });

    world = advanceWorld(world, 370);
    world = recordSourceState(
      world,
      "projection-outlays:actual-baseline",
      "government.outlays",
      annual(2027),
      moneyValue(70_000_000_000),
    );
    const actualBaseline = world.history.metricStates.at(-1)!;
    world = recordEvaluatedMetricState(world, {
      stableKey: "projection-outlays:realized-state",
      baselineStateId: actualBaseline.id,
      evaluatedAt: world.currentDate,
      referencePeriod: annual(2027),
    });
    expect(world.history.metricStates.at(-1)?.value).toStrictEqual(
      moneyValue(79_000_000_000),
    );
    const outlayEffect = realization.consequences.find(
      (consequence) =>
        world.history.effectActivations.find(
          (effect) => effect.id === consequence.effectActivationId,
        )?.targetMetricId === metricId(world, "government.outlays"),
    );
    if (!outlayEffect) throw new Error("Expected government-outlays effect.");
    expect(world.history.metricStates.at(-1)?.provenance).toStrictEqual({
      kind: "simulated",
      sourceEntityIds: [
        actualBaseline.id,
        outlayEffect.effectActivationId,
      ].sort(),
    });
  });

  it("preserves accepted point and interval magnitude bases", () => {
    let world = runCWorld("run-c-point-interval");
    const pointBaseline = recordBaseline(
      world,
      "housing-pressure-forecast",
      "housing.availability-pressure",
      point("2027-06-01"),
      quantityValue(100, 1, "index:housing-pressure"),
      [world.id],
    );
    world = pointBaseline.world;
    const alternativeResult = recordAlternative(
      world,
      "housing-pressure-policy",
    );
    world = alternativeResult.world;
    const operationResult = recordOperation(
      world,
      "housing-pressure-policy:operation",
      alternativeResult.alternative.id,
      pointBaseline.baseline,
      {
        kind: "absolute-change",
        direction: "decrease",
        magnitude: quantityValue(10, 1, "index:housing-pressure"),
      },
    );
    world = operationResult.world;
    const estimateResult = recordEstimate(
      world,
      "housing-pressure-policy:estimate",
      alternativeResult.alternative.id,
      [operationResult.operation.id],
      fullFactors([pointBaseline.baseline.id]),
    );
    world = realizePolicyEstimate(estimateResult.world, {
      stableKey: "housing-pressure-policy:realization",
      estimateId: estimateResult.estimate.id,
      provenance: AUTHORED,
    });
    expect(
      world.history.effectActivations.at(-1)?.magnitudeBasis,
    ).toStrictEqual({
      kind: "point-at-target",
    });
  });

  it("keeps all five implementation factors inspectable and makes small, large, and absurd scale materially different", () => {
    const prepared = baselineWorld("run-c-degree");
    let world = prepared.world;
    const outlays = recordBaseline(
      world,
      "degree-outlays",
      "government.outlays",
      annual(2027),
      moneyValue(70_000_000_000),
      [prepared.outlayStateId],
    );
    world = outlays.world;
    const revenue = recordBaseline(
      world,
      "degree-revenue",
      "government.revenue",
      annual(2027),
      moneyValue(90_000_000_000),
      [prepared.revenueStateId],
    );
    world = revenue.world;
    const configurations = [
      {
        key: "small",
        share: createExactQuantity(1, 1_000, "rate:share"),
        required: moneyValue(90_000_000),
        funding: moneyValue(9_000_000_000),
        capacity: moneyValue(9_000_000_000),
      },
      {
        key: "large",
        share: createExactQuantity(1, 10, "rate:share"),
        required: moneyValue(9_000_000_000),
        funding: moneyValue(9_000_000_000),
        capacity: moneyValue(4_500_000_000),
      },
      {
        key: "absurd",
        share: createExactQuantity(3, 1, "rate:share"),
        required: moneyValue(270_000_000_000),
        funding: moneyValue(9_000_000_000),
        capacity: moneyValue(4_500_000_000),
      },
    ] as const;
    const estimates: PolicyEstimateRecord[] = [];
    for (const configuration of configurations) {
      const alternative = recordAlternative(
        world,
        `degree-${configuration.key}`,
        `${configuration.key} public investment`,
      );
      world = alternative.world;
      const operation = recordOperation(
        world,
        `degree-${configuration.key}:operation`,
        alternative.alternative.id,
        outlays.baseline,
        {
          kind: "share-of-baseline",
          direction: "increase",
          sourceBaselineId: revenue.baseline.id,
          share: configuration.share,
        },
      );
      world = operation.world;
      const factors = fullFactors([revenue.baseline.id]).map((factor) => {
        if (factor.kind === "funding") {
          return resourceRatioPolicyImplementationFactor({
            kind: "funding",
            required: configuration.required,
            available: configuration.funding,
            reasonKey: "implementation:funding-ratio",
            explanation:
              "Available fiscal resources relative to intended scale.",
            evidenceEntityIds: [revenue.baseline.id],
          });
        }
        if (factor.kind === "administrative-capacity") {
          return resourceRatioPolicyImplementationFactor({
            kind: "administrative-capacity",
            required: configuration.required,
            available: configuration.capacity,
            reasonKey: "implementation:capacity-ratio",
            explanation:
              "Available implementation capacity relative to intended scale.",
            evidenceEntityIds: [revenue.baseline.id],
          });
        }
        return factor;
      });
      const estimate = recordEstimate(
        world,
        `degree-${configuration.key}:estimate`,
        alternative.alternative.id,
        [operation.operation.id],
        factors,
      );
      world = estimate.world;
      estimates.push(estimate.estimate);
    }
    expect(
      estimates.map((estimate) => estimate.implementationStatus),
    ).toStrictEqual(["full", "partial", "partial"]);
    expect(
      world.history.policyImplementationProfiles
        .at(-1)
        ?.factors.map((factor) => factor.kind),
    ).toStrictEqual([
      "authority",
      "funding",
      "administrative-capacity",
      "enforcement-compliance",
      "uptake-participation",
    ]);
    const [small, large, absurd] = estimates.map((estimate) =>
      estimate.consequences[0]?.estimatedChange.kind === "money"
        ? estimate.consequences[0].estimatedChange.money.minorUnits
        : NaN,
    );
    expect(small).toBe(90_000_000);
    expect(large).toBe(4_500_000_000);
    expect(absurd).toBe(150_000_000);
    expect(absurd).toBeLessThan(large!);

    const blockedAlternative = recordAlternative(world, "degree-blocked");
    world = blockedAlternative.world;
    const blockedOperation = recordOperation(
      world,
      "degree-blocked:operation",
      blockedAlternative.alternative.id,
      outlays.baseline,
      {
        kind: "absolute-change",
        direction: "increase",
        magnitude: moneyValue(1_000_000_000),
      },
    );
    world = blockedOperation.world;
    const blockedFactors = fullFactors([outlays.baseline.id]).map((factor) =>
      factor.kind === "authority"
        ? directPolicyImplementationFactor({
            kind: "authority",
            share: createExactQuantity(0, 1, "rate:share"),
            reasonKey: "implementation:authority-missing",
            explanation: "The injected scenario grants no authority.",
            evidenceEntityIds: [outlays.baseline.id],
          })
        : factor,
    );
    const blockedEstimate = recordEstimate(
      world,
      "degree-blocked:estimate",
      blockedAlternative.alternative.id,
      [blockedOperation.operation.id],
      blockedFactors,
    );
    world = realizePolicyEstimate(blockedEstimate.world, {
      stableKey: "degree-blocked:realization",
      estimateId: blockedEstimate.estimate.id,
      provenance: AUTHORED,
    });
    expect(world.history.policyRealizations.at(-1)).toMatchObject({
      status: "blocked",
      actualCausalProcessId: null,
      consequences: [],
      reasonKeys: ["implementation:authority-missing"],
    });
  });

  it("uses one ordinary future due item for delayed realization", () => {
    const prepared = baselineWorld("run-c-delayed-realization");
    let world = prepared.world;
    const baseline = recordBaseline(
      world,
      "delayed-outlays",
      "government.outlays",
      annual(2027),
      moneyValue(70_000_000_000),
      [prepared.outlayStateId],
    );
    world = baseline.world;
    const alternative = recordAlternative(world, "delayed-policy");
    world = alternative.world;
    const operation = recordOperation(
      world,
      "delayed-policy:operation",
      alternative.alternative.id,
      baseline.baseline,
      {
        kind: "absolute-change",
        direction: "increase",
        magnitude: moneyValue(1_000_000_000),
      },
      { startsAt: "2027-02-01", maturesAt: "2027-04-01", endsAt: "2028-01-01" },
    );
    world = operation.world;
    const estimate = recordEstimate(
      world,
      "delayed-policy:estimate",
      alternative.alternative.id,
      [operation.operation.id],
      fullFactors([baseline.baseline.id]),
    );
    world = schedulePolicyEstimateRealization(estimate.world, {
      stableKey: "delayed-policy:due",
      estimateId: estimate.estimate.id,
    });
    const dueItem = world.history.futureDueItems.at(-1)!;
    expect(dueItem.transitionKey).toBe(POLICY_REALIZATION_TRANSITION_KEY);
    expect(dueItem.jurisdictionId).toBe(scope(world).jurisdictionId);
    expect(dueItem).not.toHaveProperty("recurrence");
    const beforeDuplicateSchedule = world;
    expect(() =>
      schedulePolicyEstimateRealization(world, {
        stableKey: "delayed-policy:duplicate-due",
        estimateId: estimate.estimate.id,
      }),
    ).toThrow(/only one policy-realization due item/i);
    expect(world).toBe(beforeDuplicateSchedule);
    const registry = createFutureTransitionHandlerRegistry([
      [POLICY_REALIZATION_TRANSITION_KEY, policyRealizationTransitionHandler],
    ]);
    world = advanceWorld(world, 22, registry);
    expect(world.history.policyRealizations.at(-1)?.realizedAt).toBe(
      "2027-02-01",
    );
    expect(
      world.history.futureDueItemStates
        .filter((state) => state.dueItemId === dueItem.id)
        .at(-1)?.status,
    ).toBe("resolved");
    expect(world.history.policyRealizations).toHaveLength(1);
    const outcomeEventId = world.history.futureDueItemStates
      .filter((state) => state.dueItemId === dueItem.id)
      .at(-1)?.outcomeEventId;
    expect(
      world.history.events.find((event) => event.id === outcomeEventId)
        ?.jurisdictionId,
    ).toBe(scope(world).jurisdictionId);
    expect(() =>
      schedulePolicyEstimateRealization(world, {
        stableKey: "delayed-policy:rescheduled",
        estimateId: estimate.estimate.id,
      }),
    ).toThrow(/realized policy estimate/i);
  });

  it("cancels an obsolete scheduled estimate without substituting its revision", () => {
    const prepared = scheduledPolicyEstimateWorld("run-c-scheduled-superseded");
    const revision = recordEstimate(
      prepared.world,
      "run-c-scheduled-superseded:e2",
      prepared.alternative.id,
      [prepared.operation.id],
      fullFactors([prepared.baseline.id]),
      prepared.estimate.id,
      prepared.seriesKey,
    );
    expect(() =>
      schedulePolicyEstimateRealization(revision.world, {
        stableKey: "run-c-scheduled-superseded:stale-due",
        estimateId: prepared.estimate.id,
      }),
    ).toThrow(/superseded policy estimate/i);
    expect(() =>
      realizePolicyEstimate(revision.world, {
        stableKey: "run-c-scheduled-superseded:stale-realization",
        estimateId: prepared.estimate.id,
        provenance: AUTHORED,
      }),
    ).toThrow(/superseded policy estimate/i);
    assertWorldIntegrity(revision.world);
    expect(deserializeWorld(serializeWorld(revision.world))).toStrictEqual(
      revision.world,
    );

    const registry = createFutureTransitionHandlerRegistry([
      [POLICY_REALIZATION_TRANSITION_KEY, policyRealizationTransitionHandler],
    ]);
    const advanced = advanceWorld(revision.world, 22, registry);
    expect(advanceWorld(revision.world, 22, registry)).toStrictEqual(advanced);
    const terminalState = advanced.history.futureDueItemStates
      .filter((state) => state.dueItemId === prepared.dueItemId)
      .at(-1);
    expect(terminalState).toMatchObject({
      status: "cancelled",
      reasonKey: "policy:superseded-estimate",
      outcomeEventId: null,
    });
    expect(
      advanced.history.policyRealizations.some(
        (record) => record.estimateId === prepared.estimate.id,
      ),
    ).toBe(false);
    expect(
      advanced.history.causalProcesses.some(
        (record) =>
          record.kind === "policy:realized-intervention" &&
          record.sourceEntityIds.includes(prepared.estimate.id),
      ),
    ).toBe(false);
    expect(
      advanced.history.effectActivations.some((record) =>
        record.sourceEntityIds.includes(prepared.estimate.id),
      ),
    ).toBe(false);
    expect(deserializeWorld(serializeWorld(advanced))).toStrictEqual(advanced);

    const implementedRevision = realizePolicyEstimate(advanced, {
      stableKey: "run-c-scheduled-superseded:e2-realization",
      estimateId: revision.estimate.id,
      provenance: AUTHORED,
    });
    expect(implementedRevision.history.policyRealizations.at(-1)).toMatchObject(
      {
        estimateId: revision.estimate.id,
        status: "full",
      },
    );
  });

  it("cancels an obsolete schedule after another estimate implements its alternative", () => {
    const prepared = scheduledPolicyEstimateWorld(
      "run-c-scheduled-alternative-realized",
    );
    const independent = recordEstimate(
      prepared.world,
      "run-c-scheduled-alternative-realized:e2",
      prepared.alternative.id,
      [prepared.operation.id],
      fullFactors([prepared.baseline.id]),
    );
    const implemented = realizePolicyEstimate(independent.world, {
      stableKey: "run-c-scheduled-alternative-realized:e2-realization",
      estimateId: independent.estimate.id,
      provenance: AUTHORED,
    });
    expect(() =>
      realizePolicyEstimate(implemented, {
        stableKey: "run-c-scheduled-alternative-realized:e1-second",
        estimateId: prepared.estimate.id,
        provenance: AUTHORED,
      }),
    ).toThrow(/only one effect-producing realization/i);
    assertWorldIntegrity(implemented);
    expect(deserializeWorld(serializeWorld(implemented))).toStrictEqual(
      implemented,
    );

    const registry = createFutureTransitionHandlerRegistry([
      [POLICY_REALIZATION_TRANSITION_KEY, policyRealizationTransitionHandler],
    ]);
    const advanced = advanceWorld(implemented, 22, registry);
    const terminalState = advanced.history.futureDueItemStates
      .filter((state) => state.dueItemId === prepared.dueItemId)
      .at(-1);
    expect(terminalState).toMatchObject({
      status: "cancelled",
      reasonKey: "policy:alternative-already-realized",
      outcomeEventId: null,
    });
    expect(advanced.history.policyRealizations).toHaveLength(1);
    expect(advanced.history.policyRealizations[0]?.estimateId).toBe(
      independent.estimate.id,
    );
    expect(
      advanced.history.causalProcesses.some(
        (record) =>
          record.kind === "policy:realized-intervention" &&
          record.sourceEntityIds.includes(prepared.estimate.id),
      ),
    ).toBe(false);
    expect(
      advanced.history.effectActivations.some((record) =>
        record.sourceEntityIds.includes(prepared.estimate.id),
      ),
    ).toBe(false);
    expect(deserializeWorld(serializeWorld(advanced))).toStrictEqual(advanced);
  });

  it("rejects a stale policy due item that was fabricated after its revision", () => {
    const prepared = policyEstimateWorld("run-c-due-created-stale");
    const revision = recordEstimate(
      prepared.world,
      "run-c-due-created-stale:e2",
      prepared.alternative.id,
      [prepared.operation.id],
      fullFactors([prepared.baseline.id]),
      prepared.estimate.id,
      prepared.seriesKey,
    );
    const inputWorld = structuredClone(revision.world);
    const genericInput = {
      stableKey: "run-c-due-created-stale:generic-due",
      dueAt: prepared.operation.timing.startsAt,
      transitionKey: POLICY_REALIZATION_TRANSITION_KEY,
      entityIds: [prepared.estimate.id],
      jurisdictionId: scope(revision.world).jurisdictionId,
      provenance: {
        kind: "simulated" as const,
        sourceEntityIds: [prepared.estimate.id],
      },
    };
    expect(() => scheduleFutureDueItem(revision.world, genericInput)).toThrow(
      /stale when scheduled/i,
    );
    expect(revision.world).toStrictEqual(inputWorld);

    const genericDue = scheduleFutureDueItem(revision.world, {
      ...genericInput,
      stableKey: "run-c-due-created-stale:generic-envelope",
      transitionKey: "test:generic-due",
    });
    const corrupted = structuredClone(genericDue);
    const dueItem = corrupted.history.futureDueItems.at(-1);
    if (!dueItem) throw new Error("Expected generic due item.");
    (dueItem as { transitionKey: string }).transitionKey =
      POLICY_REALIZATION_TRANSITION_KEY;
    expect(() => assertWorldIntegrity(corrupted)).toThrow(
      /stale when scheduled/i,
    );
    expect(() => deserializeWorld(serializeUnchecked(corrupted))).toThrow(
      /stale when scheduled/i,
    );
  });

  it("rejects a policy due item fabricated after its alternative was implemented", () => {
    const prepared = policyEstimateWorld("run-c-due-created-after-effect");
    const independent = recordEstimate(
      prepared.world,
      "run-c-due-created-after-effect:e2",
      prepared.alternative.id,
      [prepared.operation.id],
      fullFactors([prepared.baseline.id]),
    );
    const implemented = realizePolicyEstimate(independent.world, {
      stableKey: "run-c-due-created-after-effect:e2-realization",
      estimateId: independent.estimate.id,
      provenance: AUTHORED,
    });
    const inputWorld = structuredClone(implemented);
    const genericInput = {
      stableKey: "run-c-due-created-after-effect:generic-due",
      dueAt: prepared.operation.timing.startsAt,
      transitionKey: POLICY_REALIZATION_TRANSITION_KEY,
      entityIds: [prepared.estimate.id],
      jurisdictionId: scope(implemented).jurisdictionId,
      provenance: {
        kind: "simulated" as const,
        sourceEntityIds: [prepared.estimate.id],
      },
    };
    expect(() => scheduleFutureDueItem(implemented, genericInput)).toThrow(
      /created after alternative implementation/i,
    );
    expect(implemented).toStrictEqual(inputWorld);

    const genericDue = scheduleFutureDueItem(implemented, {
      ...genericInput,
      stableKey: "run-c-due-created-after-effect:generic-envelope",
      transitionKey: "test:generic-due",
    });
    const corrupted = structuredClone(genericDue);
    const dueItem = corrupted.history.futureDueItems.at(-1);
    if (!dueItem) throw new Error("Expected generic due item.");
    (dueItem as { transitionKey: string }).transitionKey =
      POLICY_REALIZATION_TRANSITION_KEY;
    expect(() => assertWorldIntegrity(corrupted)).toThrow(
      /created after alternative implementation/i,
    );
    expect(() => deserializeWorld(serializeUnchecked(corrupted))).toThrow(
      /created after alternative implementation/i,
    );
  });

  it("keeps blocked and not-triggered due scheduling aligned with the domain writer", () => {
    const prepared = policyEstimateWorld("run-c-nonproducing-due-frontier");
    const independent = recordEstimate(
      prepared.world,
      "run-c-nonproducing-due-frontier:e2",
      prepared.alternative.id,
      [prepared.operation.id],
      fullFactors([prepared.baseline.id]),
    );
    const implemented = realizePolicyEstimate(independent.world, {
      stableKey: "run-c-nonproducing-due-frontier:e2-realization",
      estimateId: independent.estimate.id,
      provenance: AUTHORED,
    });

    for (const kind of ["blocked", "not-triggered"] as const) {
      const operation =
        kind === "not-triggered"
          ? recordOperation(
              implemented,
              `run-c-nonproducing-due-frontier:${kind}:operation`,
              prepared.alternative.id,
              prepared.baseline,
              {
                kind: "absolute-change",
                direction: "increase",
                magnitude: moneyValue(1_000_000_000),
              },
              {
                trigger: {
                  baselineId: prepared.baseline.id,
                  comparison: "at-least",
                  threshold: moneyValue(80_000_000_000),
                },
              },
            )
          : { world: implemented, operation: prepared.operation };
      const factors =
        kind === "blocked"
          ? fullFactors([prepared.baseline.id]).map((factor) =>
              factor.kind === "authority"
                ? directPolicyImplementationFactor({
                    kind: "authority",
                    share: createExactQuantity(0, 1, "rate:share"),
                    reasonKey: "implementation:authority-blocked",
                    explanation: "The policy cannot be implemented.",
                    evidenceEntityIds: [prepared.baseline.id],
                  })
                : factor,
            )
          : fullFactors([prepared.baseline.id]);
      const estimate = recordEstimate(
        operation.world,
        `run-c-nonproducing-due-frontier:${kind}:estimate`,
        prepared.alternative.id,
        [operation.operation.id],
        factors,
      );
      expect(() =>
        schedulePolicyEstimateRealization(estimate.world, {
          stableKey: `run-c-nonproducing-due-frontier:${kind}:domain-due`,
          estimateId: estimate.estimate.id,
        }),
      ).not.toThrow();
      const genericDue = scheduleFutureDueItem(estimate.world, {
        stableKey: `run-c-nonproducing-due-frontier:${kind}:generic-due`,
        dueAt: operation.operation.timing.startsAt,
        transitionKey: POLICY_REALIZATION_TRANSITION_KEY,
        entityIds: [estimate.estimate.id],
        jurisdictionId: scope(estimate.world).jurisdictionId,
        provenance: {
          kind: "simulated",
          sourceEntityIds: [estimate.estimate.id],
        },
      });
      expect(() => assertWorldIntegrity(genericDue)).not.toThrow();
    }
  });
});

describe("Stage 6 Run C realization linkage and implementation integrity", () => {
  it("rejects every otherwise-valid mutation of a realized cause or effect", () => {
    const prepared = realizedPolicyWorld("run-c-realization-linkage");
    const realization = prepared.world.history.policyRealizations.at(-1)!;
    const effectId = realization.consequences[0]?.effectActivationId;
    const causeId = realization.actualCausalProcessId;
    if (!effectId || !causeId)
      throw new Error("Expected realized policy links.");

    const mutateEffect = (
      mutate: (effect: Record<string, unknown>) => void,
    ): World => {
      const corrupted = structuredClone(prepared.world);
      const effect = corrupted.history.effectActivations.find(
        (candidate) => candidate.id === effectId,
      );
      if (!effect) throw new Error("Expected realized policy effect.");
      mutate(effect as unknown as Record<string, unknown>);
      return corrupted;
    };
    const alternateMechanism =
      prepared.world.causalMechanismCatalog.definitionOrder.find(
        (id) => id !== prepared.operation.mechanismDefinitionId,
      );
    if (!alternateMechanism) throw new Error("Expected alternate mechanism.");

    for (const corrupted of [
      mutateEffect((effect) => {
        effect.direction = "decrease";
      }),
      mutateEffect((effect) => {
        effect.mechanismDefinitionId = alternateMechanism;
      }),
      mutateEffect((effect) => {
        effect.onsetAt = "2027-02-02";
      }),
      mutateEffect((effect) => {
        effect.maturesAt = "2027-03-02";
      }),
      mutateEffect((effect) => {
        effect.endsAt = "2028-02-01";
      }),
      mutateEffect((effect) => {
        effect.magnitudeBasis = {
          kind: "interval-total",
          referencePeriod: annual(2026),
        };
      }),
      mutateEffect((effect) => {
        effect.realizationKind = "policy:other-realization";
      }),
    ]) {
      expect(() => assertWorldIntegrity(corrupted)).toThrow(
        /mismatched Run B effect/i,
      );
    }

    const mutateCause = (
      mutate: (cause: Record<string, unknown>) => void,
    ): World => {
      const corrupted = structuredClone(prepared.world);
      const cause = corrupted.history.causalProcesses.find(
        (candidate) => candidate.id === causeId,
      );
      if (!cause) throw new Error("Expected realized policy cause.");
      mutate(cause as unknown as Record<string, unknown>);
      return corrupted;
    };
    for (const corrupted of [
      mutateCause((cause) => {
        cause.kind = "policy:projected-alternative";
      }),
      mutateCause((cause) => {
        cause.parentCausalIds = [];
      }),
      mutateCause((cause) => {
        cause.sourceEntityIds = [prepared.alternative.id];
        cause.provenance = {
          kind: "simulated",
          sourceEntityIds: [prepared.alternative.id],
        };
      }),
    ]) {
      expect(() => assertWorldIntegrity(corrupted)).toThrow(
        /invalid actual causal process/i,
      );
    }

    const jsonCorruption = mutateEffect((effect) => {
      effect.direction = "decrease";
    });
    expect(() => deserializeWorld(serializeUnchecked(jsonCorruption))).toThrow(
      /mismatched Run B effect/i,
    );
  });

  it("prevents stale or competing estimates from applying one alternative twice", () => {
    const prepared = baselineWorld("run-c-estimate-freshness");
    let world = prepared.world;
    const baseline = recordBaseline(
      world,
      "freshness-outlays",
      "government.outlays",
      annual(2027),
      moneyValue(70_000_000_000),
      [prepared.outlayStateId],
    );
    world = baseline.world;
    const alternative = recordAlternative(world, "freshness-policy");
    world = alternative.world;
    const operation = recordOperation(
      world,
      "freshness-policy:operation",
      alternative.alternative.id,
      baseline.baseline,
      {
        kind: "absolute-change",
        direction: "increase",
        magnitude: moneyValue(1_000_000_000),
      },
    );
    const seriesKey = "estimate:freshness" as PolicySemanticKey;
    const first = recordEstimate(
      operation.world,
      "freshness-policy:e1",
      alternative.alternative.id,
      [operation.operation.id],
      fullFactors([baseline.baseline.id]),
      null,
      seriesKey,
    );
    const revision = recordEstimate(
      first.world,
      "freshness-policy:e2",
      alternative.alternative.id,
      [operation.operation.id],
      fullFactors([baseline.baseline.id]),
      first.estimate.id,
      seriesKey,
    );
    expect(() =>
      schedulePolicyEstimateRealization(revision.world, {
        stableKey: "freshness-policy:e1-due",
        estimateId: first.estimate.id,
      }),
    ).toThrow(/superseded policy estimate/i);
    expect(() =>
      realizePolicyEstimate(revision.world, {
        stableKey: "freshness-policy:e1-realization",
        estimateId: first.estimate.id,
        provenance: AUTHORED,
      }),
    ).toThrow(/superseded policy estimate/i);

    let realizedFirst = realizePolicyEstimate(first.world, {
      stableKey: "freshness-policy:e1-realized-before-revision",
      estimateId: first.estimate.id,
      provenance: AUTHORED,
    });
    const historicalRevision = recordEstimate(
      realizedFirst,
      "freshness-policy:e2-after-realization",
      alternative.alternative.id,
      [operation.operation.id],
      fullFactors([baseline.baseline.id]),
      first.estimate.id,
      seriesKey,
    );
    realizedFirst = historicalRevision.world;
    expect(realizedFirst.history.policyRealizations.at(-1)?.estimateId).toBe(
      first.estimate.id,
    );
    expect(() =>
      realizePolicyEstimate(realizedFirst, {
        stableKey: "freshness-policy:e2-second-effect",
        estimateId: historicalRevision.estimate.id,
        provenance: AUTHORED,
      }),
    ).toThrow(/only one effect-producing realization/i);

    const independent = recordEstimate(
      realizedFirst,
      "freshness-policy:independent-series",
      alternative.alternative.id,
      [operation.operation.id],
      fullFactors([baseline.baseline.id]),
    );
    expect(independent.estimate.seriesKey).not.toBe(seriesKey);
    expect(() =>
      realizePolicyEstimate(independent.world, {
        stableKey: "freshness-policy:independent-second-effect",
        estimateId: independent.estimate.id,
        provenance: AUTHORED,
      }),
    ).toThrow(/only one effect-producing realization/i);
  });

  it("allows blocked or not-triggered analysis to be revised before one later effect", () => {
    for (const kind of ["blocked", "not-triggered"] as const) {
      const prepared = baselineWorld(`run-c-${kind}-revision`);
      let world = prepared.world;
      const baseline = recordBaseline(
        world,
        `${kind}:outlays`,
        "government.outlays",
        annual(2027),
        moneyValue(70_000_000_000),
        [prepared.outlayStateId],
      );
      world = baseline.world;
      const alternative = recordAlternative(world, `${kind}:policy`);
      world = alternative.world;
      const firstOperation = recordOperation(
        world,
        `${kind}:first-operation`,
        alternative.alternative.id,
        baseline.baseline,
        {
          kind: "absolute-change",
          direction: "increase",
          magnitude: moneyValue(1_000_000_000),
        },
        kind === "not-triggered"
          ? {
              trigger: {
                baselineId: baseline.baseline.id,
                comparison: "at-least",
                threshold: moneyValue(80_000_000_000),
              },
            }
          : {},
      );
      world = firstOperation.world;
      const firstFactors =
        kind === "blocked"
          ? fullFactors([baseline.baseline.id]).map((factor) =>
              factor.kind === "authority"
                ? directPolicyImplementationFactor({
                    kind: "authority",
                    share: createExactQuantity(0, 1, "rate:share"),
                    reasonKey: "implementation:authority-blocked",
                    explanation: "The first analysis has no authority.",
                    evidenceEntityIds: [baseline.baseline.id],
                  })
                : factor,
            )
          : fullFactors([baseline.baseline.id]);
      const seriesKey = `estimate:${kind}-revision` as PolicySemanticKey;
      const first = recordEstimate(
        world,
        `${kind}:e1`,
        alternative.alternative.id,
        [firstOperation.operation.id],
        firstFactors,
        null,
        seriesKey,
      );
      world = realizePolicyEstimate(first.world, {
        stableKey: `${kind}:e1-realization`,
        estimateId: first.estimate.id,
        provenance: AUTHORED,
      });
      expect(world.history.policyRealizations.at(-1)?.status).toBe(kind);
      const secondOperation =
        kind === "not-triggered"
          ? recordOperation(
              world,
              `${kind}:second-operation`,
              alternative.alternative.id,
              baseline.baseline,
              {
                kind: "absolute-change",
                direction: "increase",
                magnitude: moneyValue(1_000_000_000),
              },
            )
          : { world, operation: firstOperation.operation };
      const second = recordEstimate(
        secondOperation.world,
        `${kind}:e2`,
        alternative.alternative.id,
        [secondOperation.operation.id],
        fullFactors([baseline.baseline.id]),
        first.estimate.id,
        seriesKey,
      );
      world = realizePolicyEstimate(second.world, {
        stableKey: `${kind}:e2-realization`,
        estimateId: second.estimate.id,
        provenance: AUTHORED,
      });
      expect(world.history.policyRealizations.at(-1)?.status).toBe("full");
    }
  });

  it("rejects persisted duplicate policy due items while preserving valid domain scheduling", () => {
    const prepared = baselineWorld("run-c-policy-due-corruption");
    let world = prepared.world;
    const baseline = recordBaseline(
      world,
      "due-corruption:outlays",
      "government.outlays",
      annual(2027),
      moneyValue(70_000_000_000),
      [prepared.outlayStateId],
    );
    world = baseline.world;
    const alternative = recordAlternative(world, "due-corruption:policy");
    world = alternative.world;
    const operation = recordOperation(
      world,
      "due-corruption:operation",
      alternative.alternative.id,
      baseline.baseline,
      {
        kind: "absolute-change",
        direction: "increase",
        magnitude: moneyValue(1_000_000_000),
      },
    );
    const estimate = recordEstimate(
      operation.world,
      "due-corruption:estimate",
      alternative.alternative.id,
      [operation.operation.id],
      fullFactors([baseline.baseline.id]),
    );
    world = schedulePolicyEstimateRealization(estimate.world, {
      stableKey: "due-corruption:policy-due",
      estimateId: estimate.estimate.id,
    });
    const policyDue = world.history.futureDueItems.at(-1)!;
    world = scheduleFutureDueItem(world, {
      stableKey: "due-corruption:generic-due",
      dueAt: policyDue.dueAt,
      transitionKey: "test:generic-due",
      entityIds: [estimate.estimate.id],
      jurisdictionId: policyDue.jurisdictionId,
      provenance: {
        kind: "simulated",
        sourceEntityIds: [estimate.estimate.id],
      },
    });
    const corrupted = structuredClone(world);
    const duplicate = corrupted.history.futureDueItems.at(-1);
    if (!duplicate) throw new Error("Expected generic due item.");
    (duplicate as { transitionKey: string }).transitionKey =
      POLICY_REALIZATION_TRANSITION_KEY;
    expect(() => deserializeWorld(serializeUnchecked(corrupted))).toThrow(
      /duplicate realization due items/i,
    );

    const realized = realizedPolicyWorld("run-c-policy-due-after-realization");
    const realizedEstimate = realized.estimate;
    const lateDueWorld = scheduleFutureDueItem(realized.world, {
      stableKey: "due-corruption:late-generic-due",
      dueAt: "2027-02-01",
      transitionKey: "test:generic-due",
      entityIds: [realizedEstimate.id],
      jurisdictionId: scope(realized.world).jurisdictionId,
      provenance: {
        kind: "simulated",
        sourceEntityIds: [realizedEstimate.id],
      },
    });
    const pendingAfterRealization = structuredClone(lateDueWorld);
    const lateDue = pendingAfterRealization.history.futureDueItems.at(-1);
    if (!lateDue) throw new Error("Expected late generic due item.");
    (lateDue as { transitionKey: string }).transitionKey =
      POLICY_REALIZATION_TRANSITION_KEY;
    expect(() =>
      deserializeWorld(serializeUnchecked(pendingAfterRealization)),
    ).toThrow(/created after realization/i);
  });
});

describe("Stage 6 Run C scope, subjective access, persistence, and integrity", () => {
  it("represents multiple jurisdictions as explicit scoped operations without a 50-state assumption", () => {
    const template = createDemoWorld("run-c-multi-scope-template");
    const first = template.jurisdictions[template.jurisdictionOrder[0]!]!;
    const secondId = createStableId(
      "jurisdiction",
      "run-c:open-territory-compatible",
    );
    const second: Jurisdiction = {
      ...first,
      id: secondId,
      slug: "us-open-territory-compatible-placeholder",
      name: "Open Territory-Compatible Placeholder",
      kind: "territory-compatible-placeholder",
      provenance: { ...first.provenance, jurisdiction: secondId },
    };
    let world = advanceWorld(
      createWorld({
        seed: "run-c-multi-scope",
        currentDate: makeIsoDate("2026-01-05"),
        jurisdictions: [first, second],
        people: [],
      }),
      370,
    );
    const firstBaseline = recordBaseline(
      world,
      "multi-scope:first",
      "government.outlays",
      annual(2027),
      moneyValue(1_000_000_000),
      [world.id],
      scope(world, first.id),
    );
    world = firstBaseline.world;
    const secondBaseline = recordBaseline(
      world,
      "multi-scope:second",
      "government.outlays",
      annual(2027),
      moneyValue(2_000_000_000),
      [world.id],
      scope(world, second.id),
    );
    world = secondBaseline.world;
    const alternative = recordAlternative(world, "multi-scope-policy");
    world = alternative.world;
    const firstOperation = recordOperation(
      world,
      "multi-scope-policy:first",
      alternative.alternative.id,
      firstBaseline.baseline,
      {
        kind: "absolute-change",
        direction: "increase",
        magnitude: moneyValue(100_000_000),
      },
    );
    world = firstOperation.world;
    const secondOperation = recordOperation(
      world,
      "multi-scope-policy:second",
      alternative.alternative.id,
      secondBaseline.baseline,
      {
        kind: "absolute-change",
        direction: "increase",
        magnitude: moneyValue(200_000_000),
      },
    );
    world = secondOperation.world;
    const estimate = recordEstimate(
      world,
      "multi-scope-policy:estimate",
      alternative.alternative.id,
      [firstOperation.operation.id, secondOperation.operation.id],
      fullFactors([firstBaseline.baseline.id, secondBaseline.baseline.id]),
    );
    expect(estimate.estimate.consequences).toHaveLength(2);
    expect(
      estimate.world.history.policyOperations
        .slice(-2)
        .map((operation) => operation.targetScope.jurisdictionId),
    ).toStrictEqual([first.id, second.id]);
    world = schedulePolicyEstimateRealization(estimate.world, {
      stableKey: "multi-scope-policy:due",
      estimateId: estimate.estimate.id,
    });
    const dueItem = world.history.futureDueItems.at(-1)!;
    expect(dueItem.jurisdictionId).toBeNull();
    const registry = createFutureTransitionHandlerRegistry([
      [POLICY_REALIZATION_TRANSITION_KEY, policyRealizationTransitionHandler],
    ]);
    world = advanceWorld(world, 22, registry);
    const outcomeEventId = world.history.futureDueItemStates
      .filter((state) => state.dueItemId === dueItem.id)
      .at(-1)?.outcomeEventId;
    expect(
      world.history.events.find((event) => event.id === outcomeEventId)
        ?.jurisdictionId,
    ).toBeNull();
  });

  it("requires explicit person knowledge and lets one stable actor assess policy magnitudes differently", () => {
    const prepared = baselineWorld("run-c-actor-policy");
    let world = prepared.world;
    const outlays = recordBaseline(
      world,
      "actor-outlays",
      "government.outlays",
      annual(2027),
      moneyValue(70_000_000_000),
      [prepared.outlayStateId],
    );
    world = outlays.world;
    const estimates: PolicyEstimateRecord[] = [];
    for (const [key, amount] of [
      ["small", 100_000_000],
      ["large", 20_000_000_000],
    ] as const) {
      const alternative = recordAlternative(
        world,
        `actor-${key}`,
        `${key} investment`,
      );
      world = alternative.world;
      const operation = recordOperation(
        world,
        `actor-${key}:operation`,
        alternative.alternative.id,
        outlays.baseline,
        {
          kind: "absolute-change",
          direction: "increase",
          magnitude: moneyValue(amount),
        },
      );
      world = operation.world;
      const estimate = recordEstimate(
        world,
        `actor-${key}:estimate`,
        alternative.alternative.id,
        [operation.operation.id],
        fullFactors([outlays.baseline.id]),
      );
      world = estimate.world;
      estimates.push(estimate.estimate);
    }
    const actorId = world.personOrder[0]!;
    const otherId = world.personOrder[1]!;
    const actorBefore = world.people[actorId];
    const knowledgeIds: EntityId[] = [];
    for (const estimate of estimates) {
      world = recordPolicyAnalysisKnowledge(world, {
        stableKey: `actor-analysis:${estimate.stableKey}`,
        personId: actorId,
        estimateId: estimate.id,
        summary: "The actor reviewed a private fiscal estimate.",
        believedSummary:
          "The proposal has the stated projected fiscal magnitude.",
        accuracy: "accurate",
        confidence: "high",
        visibility: "private",
      });
      knowledgeIds.push(world.history.knowledge.at(-1)!.id);
    }
    const context = createPolicyDecisionContext(world, {
      stableKey: "actor-policy-choice",
      decisionType: "choose-investment-scale",
      actorPersonId: actorId,
      options: [
        {
          optionKey: "small",
          estimateId: estimates[0]!.id,
          knowledgeId: knowledgeIds[0]!,
          assessment: {
            direction: "supports",
            importance: "strong",
            confidence: "high",
            explanation:
              "The known small investment fits the actor's goal and fiscal concern.",
          },
        },
        {
          optionKey: "large",
          estimateId: estimates[1]!.id,
          knowledgeId: knowledgeIds[1]!,
          assessment: {
            direction: "supports",
            importance: "moderate",
            confidence: "high",
            explanation:
              "The actor values the direction of the larger proposal.",
          },
          feasibilityConcern: {
            direction: "opposes",
            importance: "decisive",
            confidence: "high",
            explanation:
              "The known fiscal magnitude conflicts with the actor's capacity concern.",
          },
        },
      ],
      randomness: "none",
      retention: "durable",
    });
    const evaluation = evaluateDecision(world, context);
    expect(evaluation.selectedOptionKey).toBe("small");
    expect(world.people[actorId]).toStrictEqual(actorBefore);
    expect(
      world.history.knowledge.some(
        (knowledge) => knowledge.personId === otherId,
      ),
    ).toBe(false);
    expect(() =>
      createPolicyDecisionContext(world, {
        ...context,
        actorPersonId: otherId,
        options: [
          {
            optionKey: "small",
            estimateId: estimates[0]!.id,
            knowledgeId: knowledgeIds[0]!,
            assessment: {
              direction: "supports",
              importance: "moderate",
              confidence: "medium",
              explanation: "Should not be reachable without knowledge.",
            },
          },
          {
            optionKey: "large",
            estimateId: estimates[1]!.id,
            knowledgeId: knowledgeIds[1]!,
            assessment: {
              direction: "supports",
              importance: "moderate",
              confidence: "medium",
              explanation: "Should not be reachable without knowledge.",
            },
          },
        ],
      }),
    ).toThrow(/explicit knowledge/i);
  });

  it("round-trips every policy family exactly and preserves nondiegetic materialization", () => {
    const prepared = baselineWorld("run-c-json-persistence");
    let world = prepared.world;
    const baseline = recordBaseline(
      world,
      "json-outlays",
      "government.outlays",
      annual(2027),
      moneyValue(70_000_000_000),
      [prepared.outlayStateId],
    );
    world = baseline.world;
    const alternative = recordAlternative(world, "json-open-key");
    world = alternative.world;
    const operation = recordOperation(
      world,
      "json-open-key:operation",
      alternative.alternative.id,
      baseline.baseline,
      {
        kind: "absolute-change",
        direction: "increase",
        magnitude: moneyValue(1_000_000_000),
      },
    );
    world = operation.world;
    const estimate = recordEstimate(
      world,
      "json-open-key:estimate",
      alternative.alternative.id,
      [operation.operation.id],
      fullFactors([baseline.baseline.id]),
    );
    world = realizePolicyEstimate(estimate.world, {
      stableKey: "json-open-key:realization",
      estimateId: estimate.estimate.id,
      provenance: AUTHORED,
    });
    const payload = serializeWorld(world);
    expect(deserializeWorld(payload)).toStrictEqual(world);
    expect(JSON.parse(payload)).toMatchObject({
      formatVersion: 15,
      world: { schemaVersion: 15, generatorVersion: "demo-world-v15" },
    });
    const beforeSequence = world.history.nextSequence;
    const policyBefore = JSON.stringify({
      alternatives: world.history.policyAlternatives,
      baselines: world.history.policyBaselines,
      operations: world.history.policyOperations,
      profiles: world.history.policyImplementationProfiles,
      estimates: world.history.policyEstimates,
      realizations: world.history.policyRealizations,
    });
    world = materializePerson(world, world.personOrder.at(-1)!);
    expect(world.history.nextSequence).toBe(beforeSequence);
    expect(
      JSON.stringify({
        alternatives: world.history.policyAlternatives,
        baselines: world.history.policyBaselines,
        operations: world.history.policyOperations,
        profiles: world.history.policyImplementationProfiles,
        estimates: world.history.policyEstimates,
        realizations: world.history.policyRealizations,
      }),
    ).toBe(policyBefore);
  });

  it("accepts open semantic keys and rejects malformed keys or corrupted policy graphs", () => {
    let world = runCWorld("run-c-policy-integrity");
    world = recordPolicyAlternative(world, {
      stableKey: "unprompted-solar-shade",
      alternativeKind: "scenario:orbital-sunshade-study",
      title: "Unprompted open-key study",
      summary: "An open semantic key, not a named engine branch.",
      propositionId: null,
      proposedAt: world.currentDate,
      recordedAt: world.currentDate,
      provenance: AUTHORED,
    });
    expect(world.history.policyAlternatives.at(-1)?.alternativeKind).toBe(
      "scenario:orbital-sunshade-study",
    );
    expect(() =>
      recordPolicyAlternative(world, {
        stableKey: "malformed-key",
        alternativeKind: "not-namespaced" as never,
        title: "Malformed",
        summary: "Must fail.",
        propositionId: null,
        proposedAt: world.currentDate,
        recordedAt: world.currentDate,
        provenance: AUTHORED,
      }),
    ).toThrow(/namespaced semantic key/i);

    const prepared = baselineWorld("run-c-corruption");
    const baseline = recordBaseline(
      prepared.world,
      "corrupt-outlays",
      "government.outlays",
      annual(2027),
      moneyValue(70_000_000_000),
      [prepared.outlayStateId],
    );
    const alternative = recordAlternative(baseline.world, "corrupt-policy");
    const operation = recordOperation(
      alternative.world,
      "corrupt-policy:operation",
      alternative.alternative.id,
      baseline.baseline,
      {
        kind: "absolute-change",
        direction: "increase",
        magnitude: moneyValue(1_000_000_000),
      },
    );
    const estimate = recordEstimate(
      operation.world,
      "corrupt-policy:estimate",
      alternative.alternative.id,
      [operation.operation.id],
      fullFactors([baseline.baseline.id]),
    );
    const malformedOperation = structuredClone(estimate.world) as unknown as {
      history: { policyOperations: Array<{ operation: { kind: string } }> };
    };
    malformedOperation.history.policyOperations[0]!.operation.kind =
      "formula-language";
    expect(() =>
      assertWorldIntegrity(malformedOperation as unknown as World),
    ).toThrow(/malformed quantitative policy operation/i);
    const malformedFactor = structuredClone(estimate.world) as unknown as {
      history: {
        policyImplementationProfiles: Array<{
          factors: Array<{ share: { numerator: number } }>;
        }>;
      };
    };
    malformedFactor.history.policyImplementationProfiles[0]!.factors[0]!.share.numerator = 2;
    expect(() =>
      assertWorldIntegrity(malformedFactor as unknown as World),
    ).toThrow(/must not exceed one/i);
  });
});
