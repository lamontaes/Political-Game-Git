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
    seriesKey: semanticKey("estimate", stableKey),
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
    expect(world.history.metricStates.at(-1)?.provenance).toStrictEqual({
      kind: "simulated",
      sourceEntityIds: [actualBaseline.id, effectIds[0]!].sort(),
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
    expect(dueItem).not.toHaveProperty("recurrence");
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
      formatVersion: 11,
      world: { schemaVersion: 12, generatorVersion: "demo-world-v12" },
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
