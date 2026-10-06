/** Compatibility evaluator for explicit legacy records. Live outcomes use outcome-web. */
export {
  createCausalMechanismDefinition,
  createCausalMechanismCatalog,
  createSyntheticCausalMechanismCatalog,
  cloneCausalMechanismCatalog,
  assertCausalMechanismCatalogIntegrity,
  recordCausalProcess,
  activateEffect,
  causalProcessAt,
  effectActivationsAt,
  distinctRootCausalIds,
  causalEffectEntityExists,
  causalEffectEntityAvailableAt,
  causalEffectHistoryRecords,
  assertCausalEffectIntegrity,
} from "../effect-records";
export type {
  CausalMechanismDefinitionInput,
  CausalMechanismCatalogInput,
  RecordCausalProcessInput,
  ActivateEffectInput,
} from "../effect-records";
import {
  validateCutoff,
  effectRecordAvailable,
  assertMetricValueForDefinition,
  assertCompatibleMetricValues,
  distinctRootCausalIds,
  effectActivationsAt,
  cloneMetricValue,
  canonicalEntityIds,
} from "../effect-records";
import { addDays, daysBetween, makeIsoDate } from "../dates";
import {
  addExactQuantities,
  compareExactQuantities,
  createExactQuantity,
  multiplyExactShares,
  scaleExactQuantity,
  scaleSafeIntegerByExactShare,
  subtractExactQuantities,
} from "../quantity";
import type {
  AggregateMetricEvaluation,
  EffectActivationRecord,
  EffectContribution,
  EffectTargetBound,
  EffectThreshold,
  EntityId,
  HistoricalCutoff,
  MetricReferencePeriod,
  World,
  WorldMetricValue,
} from "../types";
import {
  recordWorldMetricState,
  requireMetricDefinition,
  sameReferencePeriod,
  validateReferencePeriod,
  worldMetricStateForPeriodAt,
} from "../world-metrics";

export interface EvaluateEffectContributionInput {
  readonly effectActivationId: EntityId;
  readonly evaluatedAt: string;
  readonly referencePeriod: MetricReferencePeriod;
  readonly cutoff: HistoricalCutoff;
  readonly baselineValue: WorldMetricValue;
}

export interface EvaluateAggregateMetricInput {
  readonly baselineStateId: EntityId;
  readonly evaluatedAt: string;
  readonly referencePeriod: MetricReferencePeriod;
  readonly cutoff: HistoricalCutoff;
}

export interface RecordEvaluatedMetricStateInput {
  readonly stableKey: string;
  readonly baselineStateId: EntityId;
  readonly evaluatedAt: string;
  readonly referencePeriod: MetricReferencePeriod;
}

export function evaluateEffectContribution(
  world: World,
  input: EvaluateEffectContributionInput,
): EffectContribution {
  validateCutoff(world, input.cutoff);
  const evaluatedAt = makeIsoDate(input.evaluatedAt);
  if (evaluatedAt > input.cutoff.asOfDate || evaluatedAt > world.currentDate) {
    throw new Error("Effect evaluation date is outside its historical cutoff.");
  }
  validateReferencePeriod(input.referencePeriod);
  if (referencePeriodEnd(input.referencePeriod) > evaluatedAt) {
    throw new Error("Effect target period is after its evaluation frontier.");
  }
  const activation = world.history.effectActivations.find(
    (candidate) => candidate.id === input.effectActivationId,
  );
  if (!activation || !effectRecordAvailable(activation, input.cutoff)) {
    throw new Error(
      `Effect activation is unavailable at cutoff: ${input.effectActivationId}`,
    );
  }
  const definition = requireMetricDefinition(world, activation.targetMetricId);
  if (definition.referencePeriodKind !== input.referencePeriod.kind) {
    throw new Error("Effect evaluation period does not match target metric.");
  }
  if (
    !effectMagnitudeMatchesReferencePeriod(activation, input.referencePeriod)
  ) {
    throw new Error(
      "Effect magnitude basis does not match the evaluation reference period.",
    );
  }
  assertMetricValueForDefinition(input.baselineValue, definition);
  assertCompatibleMetricValues(input.baselineValue, activation.magnitude);
  const roots = distinctRootCausalIds(
    world,
    [activation.causalProcessId],
    input.cutoff,
  );
  const factorResult = responseFactorAt(
    world,
    activation,
    causalPhaseDate(input.referencePeriod),
  );
  if (
    factorResult.phase !== "not-started" &&
    factorResult.phase !== "expired" &&
    activation.threshold !== null &&
    !thresholdSatisfied(input.baselineValue, activation.threshold)
  ) {
    return {
      effectActivationId: activation.id,
      causalProcessId: activation.causalProcessId,
      rootCausalIds: roots,
      phase: "threshold-not-met",
      factor: zeroShare(),
      signedValue: zeroMetricValue(activation.magnitude),
    };
  }
  let signedValue = scaleMetricValue(activation.magnitude, factorResult.factor);
  if (activation.direction === "decrease") {
    signedValue = negateMetricValue(signedValue);
  }
  if (activation.targetBound !== null) {
    const desired = addMetricValues(input.baselineValue, signedValue);
    const bounded = applyTargetBound(desired, activation.targetBound);
    signedValue = subtractMetricValues(bounded, input.baselineValue);
  }
  return {
    effectActivationId: activation.id,
    causalProcessId: activation.causalProcessId,
    rootCausalIds: roots,
    phase: factorResult.phase,
    factor: factorResult.factor,
    signedValue,
  };
}

export function evaluateAggregateMetric(
  world: World,
  input: EvaluateAggregateMetricInput,
): AggregateMetricEvaluation {
  validateCutoff(world, input.cutoff);
  const evaluatedAt = makeIsoDate(input.evaluatedAt);
  if (evaluatedAt > input.cutoff.asOfDate || evaluatedAt > world.currentDate) {
    throw new Error("Effect evaluation date is outside its historical cutoff.");
  }
  validateReferencePeriod(input.referencePeriod);
  if (referencePeriodEnd(input.referencePeriod) > evaluatedAt) {
    throw new Error("Effect target period is after its evaluation frontier.");
  }
  const baseline = world.history.metricStates.find(
    (candidate) => candidate.id === input.baselineStateId,
  );
  if (
    !baseline ||
    baseline.recordedAt > input.cutoff.asOfDate ||
    baseline.sequence >= input.cutoff.historySequenceExclusive
  ) {
    return {
      status: "unavailable",
      reasonKey: "economy:missing-baseline",
      missingMetricIds: [],
    };
  }
  if (!sameReferencePeriod(baseline.referencePeriod, input.referencePeriod)) {
    throw new Error(
      "Aggregate evaluation period does not match baseline state.",
    );
  }
  const activations = effectActivationsAt(
    world,
    baseline.metricId,
    baseline.scope,
    input.cutoff,
  ).filter((activation) =>
    effectMagnitudeMatchesReferencePeriod(activation, input.referencePeriod),
  );
  const contributions: EffectContribution[] = [];
  let resultingValue = cloneMetricValue(baseline.value);
  for (const activation of activations) {
    const contribution = evaluateEffectContribution(world, {
      effectActivationId: activation.id,
      evaluatedAt,
      referencePeriod: input.referencePeriod,
      cutoff: input.cutoff,
      baselineValue: resultingValue,
    });
    contributions.push(contribution);
    resultingValue = addMetricValues(resultingValue, contribution.signedValue);
  }
  return {
    status: "available",
    baselineStateId: baseline.id,
    metricId: baseline.metricId,
    scope: { ...baseline.scope },
    referencePeriod: { ...input.referencePeriod },
    evaluatedAt,
    baselineValue: cloneMetricValue(baseline.value),
    resultingValue,
    contributions,
    rootCausalIds: distinctRootCausalIds(
      world,
      contributions.map((contribution) => contribution.effectActivationId),
      input.cutoff,
    ),
  };
}

export function recordEvaluatedMetricState(
  world: World,
  input: RecordEvaluatedMetricStateInput,
): World {
  const evaluatedAt = makeIsoDate(input.evaluatedAt);
  const cutoff: HistoricalCutoff = {
    asOfDate: evaluatedAt,
    historySequenceExclusive: world.history.nextSequence,
  };
  const evaluation = evaluateAggregateMetric(world, {
    baselineStateId: input.baselineStateId,
    evaluatedAt,
    referencePeriod: input.referencePeriod,
    cutoff,
  });
  if (evaluation.status === "unavailable") {
    throw new Error(
      `Aggregate metric evaluation unavailable: ${evaluation.reasonKey}`,
    );
  }
  const contributingIds = evaluation.contributions
    .filter((contribution) => !isZeroMetricValue(contribution.signedValue))
    .map((contribution) => contribution.effectActivationId);
  if (contributingIds.length === 0) {
    throw new Error("Aggregate metric evaluation has no active contribution.");
  }
  const latest = worldMetricStateForPeriodAt(
    world,
    evaluation.metricId,
    evaluation.scope,
    evaluation.referencePeriod,
    cutoff,
  );
  if (!latest) {
    throw new Error("Aggregate metric evaluation lost its canonical baseline.");
  }
  return recordWorldMetricState(world, {
    stableKey: input.stableKey,
    metricId: evaluation.metricId,
    scope: evaluation.scope,
    referencePeriod: evaluation.referencePeriod,
    value: evaluation.resultingValue,
    recordedAt: evaluatedAt,
    provenance: {
      kind: "simulated",
      sourceEntityIds: canonicalEntityIds([
        evaluation.baselineStateId,
        ...contributingIds,
      ]),
    },
    supersedesStateId: latest.id,
  });
}

function responseFactorAt(
  world: World,
  activation: EffectActivationRecord,
  targetDate: string,
): {
  readonly phase: EffectContribution["phase"];
  readonly factor: ReturnType<typeof zeroShare>;
} {
  if (targetDate < activation.onsetAt) {
    return { phase: "not-started", factor: zeroShare() };
  }
  if (activation.endsAt !== null && targetDate >= activation.endsAt) {
    return { phase: "expired", factor: zeroShare() };
  }
  if (
    activation.maturesAt === activation.onsetAt ||
    targetDate >= activation.maturesAt
  ) {
    return { phase: "mature", factor: oneShare() };
  }
  const elapsed = daysBetween(activation.onsetAt, makeIsoDate(targetDate));
  const rampDays = daysBetween(activation.onsetAt, activation.maturesAt);
  const linear = createExactQuantity(elapsed, rampDays, "rate:share");
  const mechanism =
    world.causalMechanismCatalog.definitions[activation.mechanismDefinitionId];
  if (!mechanism)
    throw new Error("Effect mechanism disappeared during evaluation.");
  if (mechanism.responseCurve.kind === "linear") {
    return { phase: "ramping", factor: linear };
  }
  const twice = multiplyExactShares(
    linear,
    createExactQuantity(2, 1, "rate:share"),
  );
  const square = multiplyExactShares(linear, linear);
  return {
    phase: "ramping",
    factor: subtractExactQuantities(twice, square),
  };
}

function effectMagnitudeMatchesReferencePeriod(
  activation: EffectActivationRecord,
  referencePeriod: MetricReferencePeriod,
): boolean {
  return activation.magnitudeBasis.kind === "point-at-target"
    ? referencePeriod.kind === "point"
    : referencePeriod.kind === "interval" &&
        sameReferencePeriod(
          activation.magnitudeBasis.referencePeriod,
          referencePeriod,
        );
}

/**
 * Interval effects use the earlier inclusive midpoint as their one bounded,
 * deterministic representative date. This avoids a hidden duration integral
 * while keeping onset/ramp/expiry tied to the target interval, never to the
 * later date at which it is evaluated or recorded.
 */
function causalPhaseDate(referencePeriod: MetricReferencePeriod): string {
  if (referencePeriod.kind === "point") return referencePeriod.at;
  return addDays(
    referencePeriod.startsAt,
    Math.floor(
      daysBetween(referencePeriod.startsAt, referencePeriod.endsAt) / 2,
    ),
  );
}

function referencePeriodEnd(referencePeriod: MetricReferencePeriod): string {
  return referencePeriod.kind === "point"
    ? referencePeriod.at
    : referencePeriod.endsAt;
}

function thresholdSatisfied(
  baseline: WorldMetricValue,
  threshold: EffectThreshold,
): boolean {
  const comparison = compareMetricValues(baseline, threshold.value);
  return threshold.kind === "target-at-least"
    ? comparison >= 0
    : comparison <= 0;
}

function applyTargetBound(
  desired: WorldMetricValue,
  bound: EffectTargetBound,
): WorldMetricValue {
  const comparison = compareMetricValues(desired, bound.value);
  if (
    (bound.kind === "maximum" && comparison > 0) ||
    (bound.kind === "minimum" && comparison < 0)
  ) {
    return cloneMetricValue(bound.value);
  }
  return desired;
}

function addMetricValues(
  left: WorldMetricValue,
  right: WorldMetricValue,
): WorldMetricValue {
  assertCompatibleMetricValues(left, right);
  if (left.kind === "quantity" && right.kind === "quantity") {
    return {
      kind: "quantity",
      quantity: addExactQuantities(left.quantity, right.quantity),
    };
  }
  if (left.kind === "money" && right.kind === "money") {
    const minorUnits = left.money.minorUnits + right.money.minorUnits;
    if (!Number.isSafeInteger(minorUnits)) {
      throw new Error("Metric money addition exceeds safe integer precision.");
    }
    return {
      kind: "money",
      money: { minorUnits, currency: left.money.currency },
    };
  }
  throw new Error("Metric values are incompatible.");
}

function subtractMetricValues(
  left: WorldMetricValue,
  right: WorldMetricValue,
): WorldMetricValue {
  return addMetricValues(left, negateMetricValue(right));
}

function negateMetricValue(value: WorldMetricValue): WorldMetricValue {
  if (value.kind === "quantity") {
    return {
      kind: "quantity",
      quantity: createExactQuantity(
        -value.quantity.numerator,
        value.quantity.denominator,
        value.quantity.unit,
      ),
    };
  }
  if (value.money.minorUnits === Number.MIN_SAFE_INTEGER) {
    throw new Error("Metric money negation exceeds safe integer precision.");
  }
  return {
    kind: "money",
    money: {
      minorUnits: -value.money.minorUnits,
      currency: value.money.currency,
    },
  };
}

function scaleMetricValue(
  value: WorldMetricValue,
  factor: ReturnType<typeof zeroShare>,
): WorldMetricValue {
  if (value.kind === "quantity") {
    return {
      kind: "quantity",
      quantity: scaleExactQuantity(value.quantity, factor),
    };
  }
  return {
    kind: "money",
    money: {
      minorUnits: scaleSafeIntegerByExactShare(value.money.minorUnits, factor),
      currency: value.money.currency,
    },
  };
}

function compareMetricValues(
  left: WorldMetricValue,
  right: WorldMetricValue,
): number {
  assertCompatibleMetricValues(left, right);
  if (left.kind === "quantity" && right.kind === "quantity") {
    return compareExactQuantities(left.quantity, right.quantity);
  }
  if (left.kind === "money" && right.kind === "money") {
    return left.money.minorUnits < right.money.minorUnits
      ? -1
      : left.money.minorUnits > right.money.minorUnits
        ? 1
        : 0;
  }
  throw new Error("Metric values are incompatible.");
}

function zeroMetricValue(value: WorldMetricValue): WorldMetricValue {
  return value.kind === "quantity"
    ? {
        kind: "quantity",
        quantity: createExactQuantity(0, 1, value.quantity.unit),
      }
    : {
        kind: "money",
        money: { minorUnits: 0, currency: value.money.currency },
      };
}

function isZeroMetricValue(value: WorldMetricValue): boolean {
  return value.kind === "quantity"
    ? value.quantity.numerator === 0
    : value.money.minorUnits === 0;
}

function zeroShare() {
  return createExactQuantity(0, 1, "rate:share");
}

function oneShare() {
  return createExactQuantity(1, 1, "rate:share");
}
