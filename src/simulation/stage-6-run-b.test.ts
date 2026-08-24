import { describe, expect, it } from "vitest";
import {
  activateEffect,
  advanceWorld,
  createDemoWorld,
  createExactQuantity,
  deriveFiscalBalanceAt,
  deriveFiscalBalanceFromStates,
  deriveLaborMarketAt,
  derivePurchasingPowerAt,
  deserializeWorld,
  distinctRootCausalIds,
  effectActivationsAt,
  evaluateAggregateMetric,
  evaluateEffectContribution,
  makeIsoDate,
  money,
  recordCausalProcess,
  recordEvaluatedMetricState,
  recordWorldEvent,
  recordWorldMetricState,
  serializeWorld,
  worldMetricDefinitionByStableKey,
} from "./index";
import type {
  ActivateEffectInput,
  CausalProcessRecord,
  EffectActivationRecord,
  EffectMagnitudeBasis,
  EntityId,
  HistoricalCutoff,
  MetricReferencePeriod,
  MetricScope,
  World,
  WorldMetricDefinition,
  WorldMetricValue,
} from "./index";

function worldForRunB(seed: string): World {
  return advanceWorld(createDemoWorld(seed), 180);
}

function scope(world: World, segmentKey: string | null = null): MetricScope {
  const jurisdictionId = world.jurisdictionOrder[0];
  if (!jurisdictionId) throw new Error("Expected a jurisdiction fixture.");
  return {
    jurisdictionId,
    segmentKey: segmentKey as MetricScope["segmentKey"],
  };
}

function metric(world: World, stableKey: string): WorldMetricDefinition {
  return worldMetricDefinitionByStableKey(world, stableKey);
}

function cutoff(world: World, asOfDate = world.currentDate): HistoricalCutoff {
  return {
    asOfDate,
    historySequenceExclusive: world.history.nextSequence,
  };
}

function point(at: string): Extract<MetricReferencePeriod, { kind: "point" }> {
  return { kind: "point", at: at as World["currentDate"] };
}

function interval(
  startsAt: string,
  endsAt: string,
): Extract<MetricReferencePeriod, { kind: "interval" }> {
  return {
    kind: "interval",
    startsAt: startsAt as World["currentDate"],
    endsAt: endsAt as World["currentDate"],
  };
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

function moneyValue(minorUnits: number, currency = "USD"): WorldMetricValue {
  return { kind: "money", money: money(minorUnits, currency) };
}

function recordState(
  world: World,
  stableKey: string,
  metricKey: string,
  referencePeriod: MetricReferencePeriod,
  value: WorldMetricValue,
  recordedAt: string,
  targetScope = scope(world),
): World {
  return recordWorldMetricState(world, {
    stableKey,
    metricId: metric(world, metricKey).id,
    scope: targetScope,
    referencePeriod,
    value,
    recordedAt,
    provenance: { kind: "authored", note: "Synthetic Run B fixture." },
    supersedesStateId: null,
  });
}

function recordRootCause(
  world: World,
  stableKey: string,
  effectiveAt = "2026-01-10",
  recordedAt = effectiveAt,
): { readonly world: World; readonly cause: CausalProcessRecord } {
  let next = recordWorldEvent(world, {
    stableKey: `event:${stableKey}`,
    type: "economy.synthetic-condition",
    occurredAt: makeIsoDate(effectiveAt),
    recordedAt: makeIsoDate(recordedAt),
    jurisdictionId: scope(world).jurisdictionId,
    involvedEntityIds: [scope(world).jurisdictionId],
    participants: [],
    personFactConstraints: [],
    visibility: "limited",
    tags: ["economy.synthetic"],
    summary: `Synthetic root occurrence ${stableKey}.`,
    context: {
      location: null,
      socialContext: "Bounded Run B causal fixture.",
      pressure: null,
      choice: null,
      motivation: null,
      immediateReaction: null,
    },
  });
  const event = next.history.events.at(-1);
  if (!event) throw new Error("Expected source event.");
  next = recordCausalProcess(next, {
    stableKey,
    kind: "economy:synthetic-root",
    effectiveAt,
    recordedAt,
    sourceEntityIds: [event.id],
    parentCausalIds: [],
    provenance: { kind: "simulated", sourceEntityIds: [event.id] },
  });
  const cause = next.history.causalProcesses.at(-1);
  if (!cause) throw new Error("Expected root causal process.");
  return { world: next, cause };
}

function activate(
  world: World,
  stableKey: string,
  causeId: EntityId,
  metricKey: string,
  magnitude: WorldMetricValue,
  overrides: Partial<ActivateEffectInput> = {},
): { readonly world: World; readonly effect: EffectActivationRecord } {
  const linear = world.causalMechanismCatalog.definitionOrder
    .map((id) => world.causalMechanismCatalog.definitions[id])
    .find(
      (definition) => definition?.stableKey === "mechanism.linear-transition",
    );
  if (!linear) throw new Error("Expected linear mechanism definition.");
  const targetMetric = metric(world, metricKey);
  const magnitudeBasis: EffectMagnitudeBasis =
    targetMetric.referencePeriodKind === "point"
      ? { kind: "point-at-target" }
      : {
          kind: "interval-total",
          referencePeriod: interval("2026-01-01", "2026-03-31"),
        };
  const next = activateEffect(world, {
    stableKey,
    mechanismDefinitionId: linear.id,
    causalProcessId: causeId,
    targetMetricId: targetMetric.id,
    targetScope: scope(world),
    direction: "increase",
    magnitude,
    magnitudeBasis,
    activatedAt: "2026-01-10",
    onsetAt: "2026-02-01",
    maturesAt: "2026-03-01",
    endsAt: "2026-05-01",
    threshold: null,
    targetBound: null,
    realizationKind: "economy:direct",
    sourceEntityIds: [],
    recordedAt: "2026-01-10",
    ...overrides,
  });
  const effect = next.history.effectActivations.at(-1);
  if (!effect) throw new Error("Expected effect activation.");
  return { world: next, effect };
}

describe("Stage 6 Run B causal provenance", () => {
  it("fans one root into multiple effects while independent and downstream roots remain distinguishable", () => {
    let world = worldForRunB("run-b-causal-roots");
    const first = recordRootCause(world, "cause:first");
    world = first.world;
    const output = activate(
      world,
      "effect:first-output",
      first.cause.id,
      "economy.output-activity",
      moneyValue(10_000),
    );
    world = output.world;
    const demand = activate(
      world,
      "effect:first-demand",
      first.cause.id,
      "economy.consumption-demand",
      moneyValue(4_000),
    );
    world = demand.world;
    const second = recordRootCause(world, "cause:second", "2026-01-12");
    world = second.world;
    const independent = activate(
      world,
      "effect:second-output",
      second.cause.id,
      "economy.output-activity",
      moneyValue(2_000),
      { activatedAt: "2026-01-12", recordedAt: "2026-01-12" },
    );
    world = independent.world;
    world = recordCausalProcess(world, {
      stableKey: "cause:first-downstream",
      kind: "economy:downstream",
      effectiveAt: "2026-01-15",
      recordedAt: "2026-01-15",
      sourceEntityIds: [output.effect.id],
      parentCausalIds: [first.cause.id],
      provenance: { kind: "simulated", sourceEntityIds: [output.effect.id] },
    });
    const child = world.history.causalProcesses.at(-1);
    if (!child) throw new Error("Expected downstream cause.");

    expect(
      distinctRootCausalIds(
        world,
        [output.effect.id, demand.effect.id, child.id],
        cutoff(world),
      ),
    ).toEqual([first.cause.id]);
    expect(
      distinctRootCausalIds(
        world,
        [output.effect.id, independent.effect.id],
        cutoff(world),
      ),
    ).toEqual([first.cause.id, second.cause.id].sort());
  });

  it("rejects unavailable parents, dangling sources, self ancestry, and corrupted cycles", () => {
    let world = worldForRunB("run-b-causal-integrity");
    const root = recordRootCause(world, "cause:root");
    world = root.world;
    expect(() =>
      recordCausalProcess(world, {
        stableKey: "cause:bad-parent",
        kind: "economy:downstream",
        effectiveAt: "2026-01-11",
        recordedAt: "2026-01-11",
        sourceEntityIds: [],
        parentCausalIds: ["missing-cause" as EntityId],
        provenance: { kind: "authored", note: "Invalid fixture." },
      }),
    ).toThrow(/unavailable parent/);
    const corrupted = structuredClone(world);
    const loadedRoot = corrupted.history.causalProcesses[0];
    if (!loadedRoot) throw new Error("Expected loaded root.");
    (loadedRoot as { parentCausalIds: readonly EntityId[] }).parentCausalIds = [
      loadedRoot.id,
    ];
    expect(() => deserializeWorld(serializeUnchecked(corrupted))).toThrow();
  });

  it("hides later-appended backfilled causal and effect records from an earlier sequence cutoff", () => {
    let world = worldForRunB("run-b-causal-backfill");
    const beforeAppend = world.history.nextSequence;
    const root = recordRootCause(
      world,
      "cause:late-backfill",
      "2026-01-05",
      "2026-06-01",
    );
    world = root.world;
    const activation = activate(
      world,
      "effect:late-backfill",
      root.cause.id,
      "housing.availability-pressure",
      quantityValue(10, 1, "index:housing-pressure"),
      {
        activatedAt: "2026-01-05",
        onsetAt: "2026-01-05",
        maturesAt: "2026-01-05",
        endsAt: null,
        recordedAt: "2026-06-01",
      },
    );
    world = activation.world;
    expect(
      effectActivationsAt(
        world,
        metric(world, "housing.availability-pressure").id,
        scope(world),
        {
          asOfDate: "2026-06-30" as World["currentDate"],
          historySequenceExclusive: beforeAppend,
        },
      ),
    ).toEqual([]);
    expect(
      effectActivationsAt(
        world,
        metric(world, "housing.availability-pressure").id,
        scope(world),
        cutoff(world),
      ),
    ).toHaveLength(1);
  });
});

describe("Stage 6 Run B effect mechanisms", () => {
  it("evaluates exact linear lag, ramp, maturity, and expiry phases", () => {
    let world = worldForRunB("run-b-linear-response");
    const root = recordRootCause(world, "cause:linear");
    world = root.world;
    const activated = activate(
      world,
      "effect:linear",
      root.cause.id,
      "housing.availability-pressure",
      quantityValue(20, 1, "index:housing-pressure"),
    );
    world = activated.world;
    const baseline = quantityValue(100, 1, "index:housing-pressure");
    const evaluate = (targetAt: string, evaluatedAt = targetAt) =>
      evaluateEffectContribution(world, {
        effectActivationId: activated.effect.id,
        evaluatedAt,
        referencePeriod: point(targetAt),
        cutoff: cutoff(world),
        baselineValue: baseline,
      });

    expect(evaluate("2026-01-31")).toMatchObject({
      phase: "not-started",
      factor: { numerator: 0, denominator: 1 },
      signedValue: { quantity: { numerator: 0 } },
    });
    expect(evaluate("2026-01-31", "2026-04-15")).toMatchObject({
      phase: "not-started",
      factor: { numerator: 0, denominator: 1 },
    });
    expect(evaluate("2026-02-01")).toMatchObject({
      phase: "ramping",
      factor: { numerator: 0, denominator: 1 },
    });
    expect(evaluate("2026-02-15")).toMatchObject({
      phase: "ramping",
      factor: { numerator: 1, denominator: 2 },
      signedValue: { quantity: { numerator: 10, denominator: 1 } },
    });
    expect(evaluate("2026-03-01")).toMatchObject({
      phase: "mature",
      factor: { numerator: 1, denominator: 1 },
      signedValue: { quantity: { numerator: 20, denominator: 1 } },
    });
    expect(evaluate("2026-05-01")).toMatchObject({
      phase: "expired",
      factor: { numerator: 0, denominator: 1 },
    });
  });

  it("uses the target interval's deterministic midpoint rather than the later evaluation date", () => {
    const world = worldForRunB("run-b-interval-phase-date");
    const root = recordRootCause(world, "cause:interval-phase-date");
    const evaluateInterval = (
      stableKey: string,
      referencePeriod: Extract<MetricReferencePeriod, { kind: "interval" }>,
    ) => {
      const activated = activate(
        root.world,
        stableKey,
        root.cause.id,
        "economy.output-activity",
        moneyValue(20_000),
        {
          magnitudeBasis: { kind: "interval-total", referencePeriod },
        },
      );
      return evaluateEffectContribution(activated.world, {
        effectActivationId: activated.effect.id,
        evaluatedAt: "2026-06-30",
        referencePeriod,
        cutoff: cutoff(activated.world),
        baselineValue: moneyValue(100_000),
      });
    };

    expect(
      evaluateInterval(
        "effect:interval-before",
        interval("2026-01-01", "2026-01-31"),
      ),
    ).toMatchObject({ phase: "not-started", factor: { numerator: 0 } });
    expect(
      evaluateInterval(
        "effect:interval-onset",
        interval("2026-01-31", "2026-02-02"),
      ),
    ).toMatchObject({ phase: "ramping", factor: { numerator: 0 } });
    expect(
      evaluateInterval(
        "effect:interval-ramp",
        interval("2026-02-14", "2026-02-16"),
      ),
    ).toMatchObject({
      phase: "ramping",
      factor: { numerator: 1, denominator: 2 },
    });
    expect(
      evaluateInterval(
        "effect:interval-mature",
        interval("2026-03-01", "2026-03-01"),
      ),
    ).toMatchObject({
      phase: "mature",
      factor: { numerator: 1, denominator: 1 },
    });
    expect(
      evaluateInterval(
        "effect:interval-spans-maturity",
        interval("2026-02-28", "2026-03-02"),
      ),
    ).toMatchObject({
      phase: "mature",
      factor: { numerator: 1, denominator: 1 },
    });
    expect(
      evaluateInterval(
        "effect:interval-expiry-overlap",
        interval("2026-04-30", "2026-05-02"),
      ),
    ).toMatchObject({ phase: "expired", factor: { numerator: 0 } });
    expect(
      evaluateInterval(
        "effect:interval-expired",
        interval("2026-05-01", "2026-05-03"),
      ),
    ).toMatchObject({ phase: "expired", factor: { numerator: 0 } });
  });

  it("requires exact interval-total bases and records only period-compatible contributions", () => {
    let world = worldForRunB("run-b-interval-magnitude-basis");
    const calibratedPeriod = interval("2026-01-01", "2026-03-31");
    const incompatiblePeriod = interval("2026-02-15", "2026-02-15");
    world = recordState(
      world,
      "state:interval-basis-baseline",
      "economy.output-activity",
      calibratedPeriod,
      moneyValue(100_000),
      "2026-03-31",
    );
    const baseline = world.history.metricStates.at(-1);
    if (!baseline) throw new Error("Expected interval-basis baseline.");
    const root = recordRootCause(world, "cause:interval-basis");
    world = root.world;
    const compatible = activate(
      world,
      "effect:interval-basis-compatible",
      root.cause.id,
      "economy.output-activity",
      moneyValue(10_000),
      {
        onsetAt: "2026-01-10",
        maturesAt: "2026-01-10",
        endsAt: null,
        magnitudeBasis: {
          kind: "interval-total",
          referencePeriod: calibratedPeriod,
        },
      },
    );
    world = compatible.world;
    const incompatible = activate(
      world,
      "effect:interval-basis-incompatible",
      root.cause.id,
      "economy.output-activity",
      moneyValue(5_000),
      {
        onsetAt: "2026-01-10",
        maturesAt: "2026-01-10",
        endsAt: null,
        magnitudeBasis: {
          kind: "interval-total",
          referencePeriod: incompatiblePeriod,
        },
      },
    );
    world = incompatible.world;

    expect(() =>
      evaluateEffectContribution(world, {
        effectActivationId: incompatible.effect.id,
        evaluatedAt: "2026-03-31",
        referencePeriod: calibratedPeriod,
        cutoff: cutoff(world),
        baselineValue: moneyValue(100_000),
      }),
    ).toThrow(/magnitude basis/);
    expect(() =>
      activate(
        world,
        "effect:interval-basis-missing",
        root.cause.id,
        "economy.output-activity",
        moneyValue(1),
        { magnitudeBasis: { kind: "point-at-target" } },
      ),
    ).toThrow(/interval-total/);

    const evaluation = evaluateAggregateMetric(world, {
      baselineStateId: baseline.id,
      evaluatedAt: "2026-03-31",
      referencePeriod: calibratedPeriod,
      cutoff: cutoff(world),
    });
    expect(evaluation).toMatchObject({
      status: "available",
      resultingValue: { money: { minorUnits: 110_000, currency: "USD" } },
      contributions: [{ effectActivationId: compatible.effect.id }],
    });

    world = recordEvaluatedMetricState(world, {
      stableKey: "state:interval-basis-evaluated",
      baselineStateId: baseline.id,
      evaluatedAt: "2026-03-31",
      referencePeriod: calibratedPeriod,
    });
    const evaluated = world.history.metricStates.at(-1);
    if (!evaluated || evaluated.provenance.kind !== "simulated") {
      throw new Error("Expected simulated interval-basis result.");
    }
    expect(evaluated.provenance.sourceEntityIds).toEqual(
      [baseline.id, compatible.effect.id].sort(),
    );
    expect(
      deserializeWorld(serializeWorld(world)).history.effectActivations,
    ).toStrictEqual(world.history.effectActivations);

    const corrupted = structuredClone(world);
    const corruptedActivation = corrupted.history.effectActivations.find(
      (activation) => activation.id === compatible.effect.id,
    );
    if (!corruptedActivation)
      throw new Error("Expected compatible activation.");
    (
      corruptedActivation as {
        magnitudeBasis: EffectMagnitudeBasis;
      }
    ).magnitudeBasis = { kind: "point-at-target" };
    expect(() => deserializeWorld(serializeUnchecked(corrupted))).toThrow(
      /interval-total/,
    );
  });

  it("evaluates a genuinely nonlinear bounded curve and exact target cap", () => {
    let world = worldForRunB("run-b-bounded-response");
    const root = recordRootCause(world, "cause:bounded");
    world = root.world;
    const boundedDefinition = world.causalMechanismCatalog.definitionOrder
      .map((id) => world.causalMechanismCatalog.definitions[id])
      .find(
        (definition) => definition?.stableKey === "mechanism.bounded-ease-out",
      );
    if (!boundedDefinition) throw new Error("Expected bounded mechanism.");
    const activated = activate(
      world,
      "effect:bounded",
      root.cause.id,
      "housing.availability-pressure",
      quantityValue(20, 1, "index:housing-pressure"),
      {
        mechanismDefinitionId: boundedDefinition.id,
        targetBound: {
          kind: "maximum",
          value: quantityValue(112, 1, "index:housing-pressure"),
        },
      },
    );
    world = activated.world;
    const contribution = evaluateEffectContribution(world, {
      effectActivationId: activated.effect.id,
      evaluatedAt: "2026-02-15",
      referencePeriod: point("2026-02-15"),
      cutoff: cutoff(world),
      baselineValue: quantityValue(100, 1, "index:housing-pressure"),
    });
    expect(contribution.factor).toEqual(
      createExactQuantity(3, 4, "rate:share"),
    );
    expect(contribution.signedValue).toEqual(
      quantityValue(12, 1, "index:housing-pressure"),
    );
  });

  it("enforces thresholds, target units/value kinds, exact money phases, and timing", () => {
    let world = worldForRunB("run-b-effect-guards");
    const root = recordRootCause(world, "cause:guards");
    world = root.world;
    expect(() =>
      activate(
        world,
        "effect:wrong-kind",
        root.cause.id,
        "economy.output-activity",
        quantityValue(1, 1, "count:people"),
      ),
    ).toThrow(/kind/);
    expect(() =>
      activate(
        world,
        "effect:bad-timing",
        root.cause.id,
        "economy.output-activity",
        moneyValue(10_000),
        { onsetAt: "2026-03-01", maturesAt: "2026-02-01" },
      ),
    ).toThrow(/timing/);
    const thresholded = activate(
      world,
      "effect:thresholded",
      root.cause.id,
      "economy.output-activity",
      moneyValue(10_000),
      {
        threshold: {
          kind: "target-at-least",
          value: moneyValue(100_000),
        },
      },
    );
    world = thresholded.world;
    expect(
      evaluateEffectContribution(world, {
        effectActivationId: thresholded.effect.id,
        evaluatedAt: "2026-03-31",
        referencePeriod: interval("2026-01-01", "2026-03-31"),
        cutoff: cutoff(world),
        baselineValue: moneyValue(90_000),
      }),
    ).toMatchObject({
      phase: "threshold-not-met",
      signedValue: { money: { minorUnits: 0 } },
    });

    const fractionalMoney = activate(
      world,
      "effect:fractional-money",
      root.cause.id,
      "economy.output-activity",
      moneyValue(1),
      {
        magnitudeBasis: {
          kind: "interval-total",
          referencePeriod: interval("2026-02-15", "2026-02-15"),
        },
      },
    );
    expect(() =>
      evaluateEffectContribution(fractionalMoney.world, {
        effectActivationId: fractionalMoney.effect.id,
        evaluatedAt: "2026-02-15",
        referencePeriod: interval("2026-02-15", "2026-02-15"),
        cutoff: cutoff(fractionalMoney.world),
        baselineValue: moneyValue(90_000),
      }),
    ).toThrow(/fractional unit/);
  });

  it("combines independent effects explicitly and writes canonical state with inspectable provenance", () => {
    let world = worldForRunB("run-b-explicit-evaluation");
    const period = interval("2026-01-01", "2026-03-31");
    world = recordState(
      world,
      "state:output-baseline",
      "economy.output-activity",
      period,
      moneyValue(100_000),
      "2026-03-31",
    );
    const baseline = world.history.metricStates.at(-1);
    if (!baseline) throw new Error("Expected output baseline.");
    const first = recordRootCause(world, "cause:output-first");
    world = first.world;
    const firstEffect = activate(
      world,
      "effect:output-first",
      first.cause.id,
      "economy.output-activity",
      moneyValue(10_000),
      { onsetAt: "2026-01-10", maturesAt: "2026-01-10", endsAt: null },
    );
    world = firstEffect.world;
    const second = recordRootCause(world, "cause:output-second", "2026-01-11");
    world = second.world;
    const secondEffect = activate(
      world,
      "effect:output-second",
      second.cause.id,
      "economy.output-activity",
      moneyValue(5_000),
      {
        activatedAt: "2026-01-11",
        onsetAt: "2026-01-11",
        maturesAt: "2026-01-11",
        endsAt: null,
        recordedAt: "2026-01-11",
      },
    );
    world = secondEffect.world;
    const beforeEvaluation = world.history.metricStates;
    const evaluation = evaluateAggregateMetric(world, {
      baselineStateId: baseline.id,
      evaluatedAt: "2026-03-31",
      referencePeriod: period,
      cutoff: cutoff(world),
    });
    expect(evaluation).toMatchObject({
      status: "available",
      resultingValue: { money: { minorUnits: 115_000, currency: "USD" } },
      rootCausalIds: [first.cause.id, second.cause.id].sort(),
    });
    expect(world.history.metricStates).toBe(beforeEvaluation);

    world = recordEvaluatedMetricState(world, {
      stableKey: "state:output-evaluated",
      baselineStateId: baseline.id,
      evaluatedAt: "2026-03-31",
      referencePeriod: period,
    });
    const resulting = world.history.metricStates.at(-1);
    expect(resulting).toMatchObject({
      value: { money: { minorUnits: 115_000, currency: "USD" } },
      provenance: { kind: "simulated" },
      supersedesStateId: baseline.id,
    });
    if (!resulting || resulting.provenance.kind !== "simulated") {
      throw new Error("Expected simulated resulting state.");
    }
    expect(resulting.provenance.sourceEntityIds).toEqual(
      [baseline.id, firstEffect.effect.id, secondEffect.effect.id].sort(),
    );
  });

  it("uses append sequence as deterministic same-date effect order", () => {
    let world = worldForRunB("run-b-same-date-order");
    const period = interval("2026-01-01", "2026-03-31");
    world = recordState(
      world,
      "state:ordered-baseline",
      "economy.output-activity",
      period,
      moneyValue(100_000),
      "2026-03-31",
    );
    const baseline = world.history.metricStates.at(-1)!;
    const first = recordRootCause(world, "cause:ordered-first");
    world = first.world;
    const firstEffect = activate(
      world,
      "effect:ordered-first",
      first.cause.id,
      "economy.output-activity",
      moneyValue(10_000),
      { onsetAt: "2026-01-10", maturesAt: "2026-01-10", endsAt: null },
    );
    world = firstEffect.world;
    const second = recordRootCause(world, "cause:ordered-second");
    world = second.world;
    const secondEffect = activate(
      world,
      "effect:ordered-second",
      second.cause.id,
      "economy.output-activity",
      moneyValue(10_000),
      {
        onsetAt: "2026-01-10",
        maturesAt: "2026-01-10",
        endsAt: null,
        targetBound: { kind: "maximum", value: moneyValue(105_000) },
      },
    );
    world = secondEffect.world;
    const evaluation = evaluateAggregateMetric(world, {
      baselineStateId: baseline.id,
      evaluatedAt: "2026-03-31",
      referencePeriod: period,
      cutoff: cutoff(world),
    });
    expect(
      effectActivationsAt(
        world,
        metric(world, "economy.output-activity").id,
        scope(world),
        cutoff(world),
      ).map((activation) => activation.id),
    ).toEqual([firstEffect.effect.id, secondEffect.effect.id]);
    expect(evaluation).toMatchObject({
      status: "available",
      resultingValue: { money: { minorUnits: 105_000 } },
    });
  });
});

describe("Stage 6 Run B lightweight economy and fiscal continuity", () => {
  it("derives coherent unemployment count/rate and rejects missing or impossible labor identities", () => {
    let world = worldForRunB("run-b-labor");
    const laborPeriod = point("2026-03-31");
    world = recordState(
      world,
      "state:residents",
      "population.resident-count",
      laborPeriod,
      quantityValue(1_000, 1, "count:people"),
      "2026-03-31",
    );
    world = recordState(
      world,
      "state:labor-force",
      "labor.force-count",
      laborPeriod,
      quantityValue(600, 1, "count:people"),
      "2026-03-31",
    );
    expect(
      deriveLaborMarketAt(world, {
        scope: scope(world),
        referencePeriod: laborPeriod as Extract<
          MetricReferencePeriod,
          { kind: "point" }
        >,
        cutoff: cutoff(world),
      }),
    ).toMatchObject({
      status: "unavailable",
      reasonKey: "economy:missing-labor-input",
    });
    world = recordState(
      world,
      "state:employed",
      "labor.employed-count",
      laborPeriod,
      quantityValue(540, 1, "count:people"),
      "2026-03-31",
    );
    expect(
      deriveLaborMarketAt(world, {
        scope: scope(world),
        referencePeriod: laborPeriod as Extract<
          MetricReferencePeriod,
          { kind: "point" }
        >,
        cutoff: cutoff(world),
      }),
    ).toMatchObject({
      status: "available",
      unemployedPopulation: { numerator: 60, denominator: 1 },
      unemploymentRate: { numerator: 1, denominator: 10 },
    });
    expect(() =>
      recordState(
        world,
        "state:fake-unemployment-rate",
        "labor.unemployment-rate",
        laborPeriod,
        quantityValue(1, 10, "rate:share"),
        "2026-03-31",
      ),
    ).toThrow(/Derived metric/);

    let impossible = worldForRunB("run-b-impossible-labor");
    impossible = recordState(
      impossible,
      "state:impossible-residents",
      "population.resident-count",
      laborPeriod,
      quantityValue(500, 1, "count:people"),
      "2026-03-31",
    );
    impossible = recordState(
      impossible,
      "state:impossible-force",
      "labor.force-count",
      laborPeriod,
      quantityValue(600, 1, "count:people"),
      "2026-03-31",
    );
    impossible = recordState(
      impossible,
      "state:impossible-employed",
      "labor.employed-count",
      laborPeriod,
      quantityValue(550, 1, "count:people"),
      "2026-03-31",
    );
    expect(() =>
      deriveLaborMarketAt(impossible, {
        scope: scope(impossible),
        referencePeriod: laborPeriod as Extract<
          MetricReferencePeriod,
          { kind: "point" }
        >,
        cutoff: cutoff(impossible),
      }),
    ).toThrow(/labor force cannot exceed/i);
  });

  it("changes exact real purchasing power when cost changes without mutating nominal income", () => {
    let world = worldForRunB("run-b-purchasing-power");
    const incomePeriod = interval("2026-01-01", "2026-03-31");
    world = recordState(
      world,
      "state:nominal-income",
      "income.aggregate-personal",
      incomePeriod,
      moneyValue(1_000_000),
      "2026-03-31",
    );
    world = recordState(
      world,
      "state:cost-100",
      "prices.cost-level",
      point("2026-03-31"),
      quantityValue(100, 1, "index:cost-level"),
      "2026-03-31",
    );
    world = recordState(
      world,
      "state:cost-125",
      "prices.cost-level",
      point("2026-04-30"),
      quantityValue(125, 1, "index:cost-level"),
      "2026-04-30",
    );
    const incomeHistoryBefore = world.history.metricStates.filter(
      (state) =>
        state.metricId === metric(world, "income.aggregate-personal").id,
    );
    const at100 = derivePurchasingPowerAt(world, {
      scope: scope(world),
      nominalIncomePeriod: incomePeriod as Extract<
        MetricReferencePeriod,
        { kind: "interval" }
      >,
      costLevelPeriod: point("2026-03-31") as Extract<
        MetricReferencePeriod,
        { kind: "point" }
      >,
      cutoff: cutoff(world),
    });
    const at125 = derivePurchasingPowerAt(world, {
      scope: scope(world),
      nominalIncomePeriod: incomePeriod as Extract<
        MetricReferencePeriod,
        { kind: "interval" }
      >,
      costLevelPeriod: point("2026-04-30") as Extract<
        MetricReferencePeriod,
        { kind: "point" }
      >,
      cutoff: cutoff(world),
    });
    expect(at100).toMatchObject({
      status: "available",
      value: { numerator: 10_000, denominator: 1 },
    });
    expect(at125).toMatchObject({
      status: "available",
      value: { numerator: 8_000, denominator: 1 },
    });
    expect(
      world.history.metricStates.filter(
        (state) =>
          state.metricId === metric(world, "income.aggregate-personal").id,
      ),
    ).toEqual(incomeHistoryBefore);
  });

  it("keeps consumption, output, labor-income, and housing proxies aggregate and typed", () => {
    let world = worldForRunB("run-b-aggregate-proxies");
    const peopleBefore = world.personOrder;
    const organizationsBefore = world.history.organizations;
    const flowPeriod = interval("2026-01-01", "2026-03-31");
    for (const [key, metricKey, value] of [
      ["consumption", "economy.consumption-demand", moneyValue(400_000)],
      ["output", "economy.output-activity", moneyValue(500_000)],
      ["labor-income", "labor.aggregate-income", moneyValue(300_000)],
    ] as const) {
      world = recordState(
        world,
        `state:${key}`,
        metricKey,
        flowPeriod,
        value,
        "2026-03-31",
      );
    }
    world = recordState(
      world,
      "state:housing-pressure",
      "housing.availability-pressure",
      point("2026-03-31"),
      quantityValue(107, 1, "index:housing-pressure"),
      "2026-03-31",
    );
    expect(world.personOrder).toEqual(peopleBefore);
    expect(world.history.organizations).toEqual(organizationsBefore);
    expect(world.history.metricStates).toHaveLength(4);
    const statesBeforeAdvance = world.history.metricStates;
    const causalBeforeAdvance = world.history.causalProcesses;
    world = advanceWorld(world, 1);
    expect(world.history.metricStates).toEqual(statesBeforeAdvance);
    expect(world.history.causalProcesses).toEqual(causalBeforeAdvance);
  });

  it("derives fiscal balance from exact matching revenue/outlays while debt remains separate", () => {
    let world = worldForRunB("run-b-fiscal");
    const fiscalPeriod = interval("2026-01-01", "2026-03-31");
    world = recordState(
      world,
      "state:revenue",
      "government.revenue",
      fiscalPeriod,
      moneyValue(900_000),
      "2026-03-31",
    );
    const revenue = world.history.metricStates.at(-1);
    world = recordState(
      world,
      "state:outlays",
      "government.outlays",
      fiscalPeriod,
      moneyValue(1_000_000),
      "2026-03-31",
    );
    const outlays = world.history.metricStates.at(-1);
    world = recordState(
      world,
      "state:debt",
      "government.debt",
      point("2026-03-31"),
      moneyValue(5_000_000),
      "2026-03-31",
    );
    if (!revenue || !outlays) throw new Error("Expected fiscal states.");
    expect(
      deriveFiscalBalanceAt(world, {
        scope: scope(world),
        referencePeriod: fiscalPeriod as Extract<
          MetricReferencePeriod,
          { kind: "interval" }
        >,
        cutoff: cutoff(world),
      }),
    ).toEqual({
      status: "available",
      balance: { minorUnits: -100_000, currency: money(0, "USD").currency },
      revenueStateId: revenue.id,
      outlaysStateId: outlays.id,
    });
    expect(() =>
      recordState(
        world,
        "state:fake-fiscal-balance",
        "government.fiscal-balance",
        fiscalPeriod,
        {
          kind: "money",
          money: {
            minorUnits: -100_000,
            currency: money(0, "USD").currency,
          },
        },
        "2026-03-31",
      ),
    ).toThrow(/Derived metric/);

    let incompatible = worldForRunB("run-b-fiscal-incompatible");
    incompatible = recordState(
      incompatible,
      "state:revenue-usd",
      "government.revenue",
      fiscalPeriod,
      moneyValue(10_000, "USD"),
      "2026-03-31",
    );
    const revenueUsd = incompatible.history.metricStates.at(-1);
    incompatible = recordState(
      incompatible,
      "state:outlays-eur",
      "government.outlays",
      fiscalPeriod,
      moneyValue(9_000, "EUR"),
      "2026-03-31",
    );
    const outlaysEur = incompatible.history.metricStates.at(-1);
    if (!revenueUsd || !outlaysEur) throw new Error("Expected fiscal states.");
    expect(() =>
      deriveFiscalBalanceFromStates(incompatible, {
        revenueStateId: revenueUsd.id,
        outlaysStateId: outlaysEur.id,
        cutoff: cutoff(incompatible),
      }),
    ).toThrow(/one currency/);

    incompatible = recordState(
      incompatible,
      "state:outlays-other-period",
      "government.outlays",
      interval("2026-01-01", "2026-02-28"),
      moneyValue(9_000, "USD"),
      "2026-03-31",
    );
    const otherPeriodOutlays = incompatible.history.metricStates.at(-1)!;
    expect(() =>
      deriveFiscalBalanceFromStates(incompatible, {
        revenueStateId: revenueUsd.id,
        outlaysStateId: otherPeriodOutlays.id,
        cutoff: cutoff(incompatible),
      }),
    ).toThrow(/scope and interval/);
    incompatible = recordState(
      incompatible,
      "state:outlays-other-scope",
      "government.outlays",
      fiscalPeriod,
      moneyValue(9_000, "USD"),
      "2026-03-31",
      scope(incompatible, "sector.other"),
    );
    const otherScopeOutlays = incompatible.history.metricStates.at(-1)!;
    expect(() =>
      deriveFiscalBalanceFromStates(incompatible, {
        revenueStateId: revenueUsd.id,
        outlaysStateId: otherScopeOutlays.id,
        cutoff: cutoff(incompatible),
      }),
    ).toThrow(/scope and interval/);
  });

  it("keeps causal/economic truth non-omniscient and exact through JSON persistence", () => {
    let world = worldForRunB("run-b-persistence-boundary");
    const knowledgeBefore = world.history.knowledge;
    const period = interval("2026-01-01", "2026-03-31");
    world = recordState(
      world,
      "state:persisted-output",
      "economy.output-activity",
      period,
      moneyValue(200_000),
      "2026-03-31",
    );
    const root = recordRootCause(world, "cause:persisted");
    world = root.world;
    const effect = activate(
      world,
      "effect:persisted",
      root.cause.id,
      "economy.output-activity",
      moneyValue(20_000),
      { onsetAt: "2026-01-10", maturesAt: "2026-01-10", endsAt: null },
    );
    world = effect.world;
    expect(world.history.knowledge).toEqual(knowledgeBefore);
    const payload = serializeWorld(world);
    const loaded = deserializeWorld(payload);
    expect(loaded).toStrictEqual(world);
    expect(serializeWorld(loaded)).toBe(payload);
    expect(loaded.schemaVersion).toBe(11);
    expect(loaded.generatorVersion).toBe("demo-world-v11");
    expect(JSON.parse(payload).formatVersion).toBe(10);
    expect(loaded.causalMechanismCatalog).toStrictEqual(
      world.causalMechanismCatalog,
    );
  });
});

function serializeUnchecked(world: World): string {
  const payload = JSON.parse(
    serializeWorld(worldForRunB("run-b-envelope")),
  ) as {
    snapshotId: string;
    worldId: string;
    savedAtWorldDate: string;
    world: World;
  };
  payload.world = world;
  payload.worldId = world.id;
  payload.savedAtWorldDate = world.currentDate;
  // The integrity check happens before metadata comparison, so a placeholder
  // snapshot ID is sufficient for corrupted-load assertions.
  payload.snapshotId = "snapshot_corrupted";
  return JSON.stringify(payload);
}
