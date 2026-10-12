/** KEEP metric/effect closure. Writer validation remains a caller protocol; this shelf owns the complete arithmetic and canonical-effect predicates. */
import type {
  EntityId,
  EffectActivationRecord,
  PolicyOperationRecord,
  WorldMetricValue,
  PolicyEstimatedConsequence,
  PolicyEstimateRecord,
  CausalProcessRecord,
  PolicyRealizationRecord,
  PolicyImplementationProfileRecord,
  PolicySemanticKey,
  ExactQuantity,
  HistoricalCutoff,
  PolicyBaselineRecord,
  PolicyImplementationStatus,
  PolicyImplementationFactor,
  MetricObservationUncertainty,
  PolicyAlternativeRecord,
  PolicyOperationTrigger,
} from "../../simulation/types";
import {
  createExactQuantity,
  assertExactQuantity,
  compareExactQuantities,
  addExactQuantities,
  divideExactQuantities,
  multiplyExactShares,
  scaleExactQuantity,
  scaleSafeIntegerByExactShare,
} from "./exact-quantity";
import { sameMetricScope, sameReferencePeriod } from "./metric-identity";
import type {
  DirectPolicyImplementationFactorInput,
  ResourceRatioPolicyImplementationFactorInput,
} from "../../simulation/policy-semantics";
export interface PolicyMathFacts {
  readonly baselines: readonly PolicyBaselineRecord[];
  readonly operations: readonly PolicyOperationRecord[];
}
function requirePolicyBaseline(facts: PolicyMathFacts, id: EntityId) {
  const row = facts.baselines.find((r) => r.id === id);
  if (!row) throw Error("Missing policy baseline: " + id);
  return row;
}
function requirePolicyOperation(facts: PolicyMathFacts, id: EntityId) {
  const row = facts.operations.find((r) => r.id === id);
  if (!row) throw Error("Missing policy operation: " + id);
  return row;
}
const SEMANTIC_KEY = /^[a-z][a-z0-9-]*:[a-z0-9][a-z0-9._-]*$/;

export function directPolicyImplementationFactor(
  input: DirectPolicyImplementationFactorInput,
): PolicyImplementationFactor {
  return {
    kind: input.kind,
    share: { ...input.share },
    basis: { kind: "direct" },
    reasonKey: input.reasonKey,
    explanation: input.explanation,
    evidenceEntityIds: canonicalEntityIds(input.evidenceEntityIds ?? []),
  };
}

export function resourceRatioPolicyImplementationFactor(
  input: ResourceRatioPolicyImplementationFactorInput,
): PolicyImplementationFactor {
  return {
    kind: input.kind,
    share: coverageShare(input.required, input.available),
    basis: {
      kind: "resource-ratio",
      required: cloneMetricValue(input.required),
      available: cloneMetricValue(input.available),
    },
    reasonKey: input.reasonKey,
    explanation: input.explanation,
    evidenceEntityIds: canonicalEntityIds(input.evidenceEntityIds),
  };
}

// stopgapId: "laws.policy-multiplicative-implementation"
export function implementationShare(
  profile: PolicyImplementationProfileRecord,
): ExactQuantity {
  return profile.factors.reduce(
    (product, factor) => multiplyExactShares(product, factor.share),
    createExactQuantity(1, 1, "rate:share"),
  );
}

export function implementationStatus(
  profile: PolicyImplementationProfileRecord,
): PolicyImplementationStatus {
  const share = implementationShare(profile);
  return share.numerator === 0
    ? "blocked"
    : compareExactQuantities(share, createExactQuantity(1, 1, "rate:share")) ===
        0
      ? "full"
      : "partial";
}

type PolicyHistoryRecord =
  | PolicyAlternativeRecord
  | PolicyBaselineRecord
  | PolicyOperationRecord
  | PolicyImplementationProfileRecord
  | PolicyEstimateRecord
  | PolicyRealizationRecord;

export function computePolicyConsequences(
  facts: PolicyMathFacts,
  operationIds: readonly EntityId[],
  profile: PolicyImplementationProfileRecord,
): readonly PolicyEstimatedConsequence[] {
  if (operationIds.length === 0) {
    throw new Error("A policy estimate requires at least one operation.");
  }
  if (JSON.stringify(operationIds) !== JSON.stringify(profile.operationIds)) {
    throw new Error(
      "Policy estimate operations must match its implementation profile.",
    );
  }
  const share = implementationShare(profile);
  return operationIds.map((operationId) => {
    const operation = requirePolicyOperation(facts, operationId);
    const baseline = requirePolicyBaseline(facts, operation.targetBaselineId);
    const triggered =
      operation.trigger === null || triggerSatisfied(facts, operation.trigger);
    const intendedResult = triggered
      ? operationResult(facts, operation, baseline.expectedValue)
      : cloneMetricValue(baseline.expectedValue);
    const intendedChange = subtractMetricValues(
      intendedResult,
      baseline.expectedValue,
    );
    const estimatedChange = triggered
      ? scaleMetricValue(intendedChange, share)
      : zeroMetricValue(baseline.expectedValue);
    return {
      operationId: operation.id,
      baselineId: baseline.id,
      triggered,
      baselineValue: cloneMetricValue(baseline.expectedValue),
      intendedChange,
      intendedResult,
      implementationShare: { ...share },
      estimatedChange,
      estimatedResult: addMetricValues(baseline.expectedValue, estimatedChange),
      uncertainty: cloneUncertainty(baseline.uncertainty),
    };
  });
}

function operationResult(
  facts: PolicyMathFacts,
  operation: PolicyOperationRecord,
  baselineValue: WorldMetricValue,
): WorldMetricValue {
  const semantics = operation.operation;
  switch (semantics.kind) {
    case "set-level":
      return cloneMetricValue(semantics.value);
    case "absolute-change": {
      const signed =
        semantics.direction === "increase"
          ? semantics.magnitude
          : negateMetricValue(semantics.magnitude);
      return addMetricValues(baselineValue, signed);
    }
    case "relative-change": {
      const magnitude = scaleMetricValue(baselineValue, semantics.share);
      return addMetricValues(
        baselineValue,
        semantics.direction === "increase"
          ? magnitude
          : negateMetricValue(magnitude),
      );
    }
    case "share-of-baseline": {
      const source = requirePolicyBaseline(facts, semantics.sourceBaselineId);
      const magnitude = scaleMetricValue(source.expectedValue, semantics.share);
      return addMetricValues(
        baselineValue,
        semantics.direction === "increase"
          ? magnitude
          : negateMetricValue(magnitude),
      );
    }
    case "cap":
      return compareMetricValues(baselineValue, semantics.maximum) > 0
        ? cloneMetricValue(semantics.maximum)
        : cloneMetricValue(baselineValue);
    case "floor":
      return compareMetricValues(baselineValue, semantics.minimum) < 0
        ? cloneMetricValue(semantics.minimum)
        : cloneMetricValue(baselineValue);
  }
}

function triggerSatisfied(
  facts: PolicyMathFacts,
  trigger: PolicyOperationTrigger,
): boolean {
  const baseline = requirePolicyBaseline(facts, trigger.baselineId);
  const comparison = compareMetricValues(
    baseline.expectedValue,
    trigger.threshold,
  );
  return trigger.comparison === "at-least" ? comparison >= 0 : comparison <= 0;
}

export function isCanonicalRealizedPolicyEffect(
  effect: EffectActivationRecord,
  operation: PolicyOperationRecord,
  expected: PolicyEstimatedConsequence,
  estimate: PolicyEstimateRecord,
  cause: CausalProcessRecord,
  realization: PolicyRealizationRecord,
): boolean {
  const direction =
    metricValueSign(expected.estimatedChange) < 0 ? "decrease" : "increase";
  return (
    effect.sequence < realization.sequence &&
    effect.causalProcessId === cause.id &&
    effect.targetMetricId === operation.targetMetricId &&
    sameMetricScope(effect.targetScope, operation.targetScope) &&
    effect.direction === direction &&
    JSON.stringify(effect.magnitude) ===
      JSON.stringify(absoluteMetricValue(expected.estimatedChange)) &&
    effectMagnitudeBasisMatchesOperation(effect, operation) &&
    effect.mechanismDefinitionId === operation.mechanismDefinitionId &&
    effect.activatedAt === realization.realizedAt &&
    effect.onsetAt === operation.timing.startsAt &&
    effect.maturesAt === operation.timing.maturesAt &&
    effect.endsAt === operation.timing.endsAt &&
    effect.threshold === null &&
    effect.targetBound === null &&
    effect.realizationKind === operation.realizationKind &&
    sameEntityIds(effect.sourceEntityIds, [estimate.id]) &&
    effect.recordedAt === realization.recordedAt
  );
}

function effectMagnitudeBasisMatchesOperation(
  effect: EffectActivationRecord,
  operation: PolicyOperationRecord,
): boolean {
  return operation.targetReferencePeriod.kind === "point"
    ? effect.magnitudeBasis.kind === "point-at-target"
    : effect.magnitudeBasis.kind === "interval-total" &&
        sameReferencePeriod(
          effect.magnitudeBasis.referencePeriod,
          operation.targetReferencePeriod,
        );
}

export function constrainedFactorReasonKeys(
  profile: PolicyImplementationProfileRecord,
): PolicySemanticKey[] {
  const one = createExactQuantity(1, 1, "rate:share");
  return canonicalSemanticKeys(
    profile.factors
      .filter((factor) => compareExactQuantities(factor.share, one) < 0)
      .map((factor) => factor.reasonKey),
  );
}

function coverageShare(
  required: WorldMetricValue,
  available: WorldMetricValue,
): ExactQuantity {
  assertCompatibleMetricValues(required, available);
  assertNonnegativeMetricValue(required, "Required policy resource");
  assertNonnegativeMetricValue(available, "Available policy resource");
  if (isZeroMetricValue(required))
    return createExactQuantity(1, 1, "rate:share");
  if (compareMetricValues(available, required) >= 0) {
    return createExactQuantity(1, 1, "rate:share");
  }
  return required.kind === "quantity" && available.kind === "quantity"
    ? divideExactQuantities(available.quantity, required.quantity, "rate:share")
    : required.kind === "money" && available.kind === "money"
      ? createExactQuantity(
          available.money.minorUnits,
          required.money.minorUnits,
          "rate:share",
        )
      : (() => {
          throw new Error("Policy resources are incompatible.");
        })();
}

function assertNonnegativeMetricValue(
  value: WorldMetricValue,
  label: string,
): void {
  if (metricValueSign(value) < 0)
    throw new Error(`${label} cannot be negative.`);
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
    if (!Number.isSafeInteger(minorUnits))
      throw new Error("Policy money addition exceeds safe precision.");
    return {
      kind: "money",
      money: { minorUnits, currency: left.money.currency },
    };
  }
  throw new Error("Policy metric values are incompatible.");
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
    throw new Error("Policy money negation exceeds safe precision.");
  }
  return {
    kind: "money",
    money: {
      minorUnits: -value.money.minorUnits,
      currency: value.money.currency,
    },
  };
}

function absoluteMetricValue(value: WorldMetricValue): WorldMetricValue {
  return metricValueSign(value) < 0
    ? negateMetricValue(value)
    : cloneMetricValue(value);
}

function scaleMetricValue(
  value: WorldMetricValue,
  factor: ExactQuantity,
): WorldMetricValue {
  assertExactQuantity(factor);
  if (factor.unit !== "rate:share")
    throw new Error("Policy scale factor must use rate:share.");
  return value.kind === "quantity"
    ? { kind: "quantity", quantity: scaleExactQuantity(value.quantity, factor) }
    : {
        kind: "money",
        money: {
          minorUnits: scaleSafeIntegerByExactShare(
            value.money.minorUnits,
            factor,
          ),
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
  throw new Error("Policy metric values are incompatible.");
}

function assertCompatibleMetricValues(
  left: WorldMetricValue,
  right: WorldMetricValue,
): void {
  if (left.kind !== right.kind)
    throw new Error("Policy metric value kinds are incompatible.");
  if (left.kind === "quantity" && right.kind === "quantity") {
    assertExactQuantity(left.quantity);
    assertExactQuantity(right.quantity);
    if (left.quantity.unit !== right.quantity.unit) {
      throw new Error("Policy metric quantity units are incompatible.");
    }
  } else if (
    left.kind === "money" &&
    right.kind === "money" &&
    left.money.currency !== right.money.currency
  ) {
    throw new Error("Policy metric money currencies are incompatible.");
  }
}

function metricValueSign(value: WorldMetricValue): number {
  return value.kind === "quantity"
    ? Math.sign(value.quantity.numerator)
    : Math.sign(value.money.minorUnits);
}

function isZeroMetricValue(value: WorldMetricValue): boolean {
  return value.kind === "quantity"
    ? value.quantity.numerator === 0
    : value.money.minorUnits === 0;
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

function cloneMetricValue(value: WorldMetricValue): WorldMetricValue {
  return value.kind === "quantity"
    ? { kind: "quantity", quantity: { ...value.quantity } }
    : { kind: "money", money: { ...value.money } };
}

function cloneUncertainty(
  uncertainty: MetricObservationUncertainty,
): MetricObservationUncertainty {
  if (uncertainty.kind === "none") return { kind: "none" };
  if (uncertainty.kind === "range") {
    return {
      kind: "range",
      lower: cloneMetricValue(uncertainty.lower),
      upper: cloneMetricValue(uncertainty.upper),
    };
  }
  return {
    kind: "margin-of-error",
    margin: cloneMetricValue(uncertainty.margin),
    confidence:
      uncertainty.confidence === null ? null : { ...uncertainty.confidence },
  };
}

function canonicalEntityIds(values: readonly EntityId[]): EntityId[] {
  return [...new Set(values)].sort();
}

function sameEntityIds(
  left: readonly EntityId[],
  right: readonly EntityId[],
): boolean {
  return JSON.stringify(left) === JSON.stringify(right);
}

function canonicalSemanticKeys(
  values: readonly PolicySemanticKey[],
): PolicySemanticKey[] {
  for (const value of values) assertSemanticKey(value, "Policy semantic key");
  return [...new Set(values)].sort();
}

function assertSemanticKey(
  value: string,
  label: string,
): asserts value is PolicySemanticKey {
  if (!SEMANTIC_KEY.test(value)) {
    throw new Error(`${label} must be a namespaced semantic key: ${value}`);
  }
}

export function policyRecordAvailable(
  record: PolicyHistoryRecord,
  cutoff: HistoricalCutoff,
): boolean {
  return (
    record.recordedAt <= cutoff.asOfDate &&
    record.sequence < cutoff.historySequenceExclusive
  );
}
