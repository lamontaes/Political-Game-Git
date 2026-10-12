import { describe, it, expect } from "vitest";
import { smallWorld } from "../../../tests/fixtures/small-world";
import { STATES } from "../../simulation/state-reference";
import { makeIsoDate, addDays } from "../../simulation/dates";
import { money } from "../../simulation/resources";
import { createExactQuantity } from "../../simulation/quantity";
import {
  worldMetricDefinitionByStableKey,
  recordWorldMetricState,
} from "../../simulation/world-metrics";
import * as native from "../../simulation/policy-semantics";
import {
  recordPolicyBaseline,
  recordPolicyAlternative,
  recordPolicyOperation,
  directPolicyImplementationFactor,
  recordPolicyImplementationProfile,
  recordPolicyProjectionRoot,
  recordPolicyEstimate,
} from "../../simulation/policy-semantics";
import {
  computePolicyConsequences,
  resourceRatioPolicyImplementationFactor,
  constrainedFactorReasonKeys,
} from "./policy-math";
import { assertCanonicalRealizedPolicyEffect } from "./policy-effect-integrity";
import {
  policyBaselineAt,
  latestPolicyBaselineForSeriesAt,
  policyEstimateAt,
} from "./policy-availability";
import type {
  World,
  EntityId,
  MetricScope,
  MetricReferencePeriod,
  WorldMetricValue,
  PolicyBaselineRecord,
  PolicySemanticKey,
  PolicyAlternativeRecord,
  QuantitativePolicyOperation,
  PolicyOperationRecord,
  PolicyImplementationFactor,
  PolicyEstimateRecord,
} from "../../simulation/types";
const AUTHORED = {
  kind: "authored" as const,
  note: "Controlled native policy estimate and realization, not an ordinary policy dispatch.",
};
function scope(
  world: World,
  jurisdictionId = world.jurisdictionOrder[0]!,
): MetricScope {
  return { jurisdictionId, segmentKey: null };
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
): {
  readonly world: World;
  readonly baseline: PolicyBaselineRecord;
} {
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
): {
  readonly world: World;
  readonly alternative: PolicyAlternativeRecord;
} {
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
): {
  readonly world: World;
  readonly operation: PolicyOperationRecord;
} {
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
): {
  readonly world: World;
  readonly estimate: PolicyEstimateRecord;
} {
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
function result(call: () => unknown) {
  try {
    return { value: call() };
  } catch (e) {
    return { name: (e as Error).name, message: (e as Error).message };
  }
}
describe("laws: private policy math through native estimate, realization and integrity callers", () => {
  it.each(Object.keys(STATES))(
    "matches exact operations, funding fractions, triggers and saved effects in %s",
    (usps) => {
      let world = smallWorld({
        place: "US-" + usps,
        date: "2026-01-05",
        seed: "rules2-law-policy:" + usps,
      }).world;
      const moneyValue = (n: number): WorldMetricValue => ({
        kind: "money",
        money: money(n, "USD"),
      });
      const qValue = (n: number): WorldMetricValue => ({
        kind: "quantity",
        quantity: createExactQuantity(n, 1, "count:people"),
      });
      for (const kind of ["money", "quantity"] as const) {
        const key =
          kind === "money"
            ? "income.aggregate-personal"
            : "population.resident-count";
        const observed: MetricReferencePeriod =
          kind === "money"
            ? {
                kind: "interval",
                startsAt: makeIsoDate("2026-01-01"),
                endsAt: world.currentDate,
              }
            : { kind: "point", at: world.currentDate };
        const period: MetricReferencePeriod =
          kind === "money"
            ? {
                kind: "interval",
                startsAt: addDays(world.currentDate, 1),
                endsAt: addDays(world.currentDate, 30),
              }
            : { kind: "point", at: addDays(world.currentDate, 30) };
        const value = kind === "money" ? moneyValue : qValue;
        world = recordSourceState(
          world,
          "rules2:" + kind + ":state",
          key,
          observed,
          value(1000),
        );
        const source = world.history.metricStates.at(-1)!;
        const baseline = recordBaseline(
          world,
          "rules2:" + kind + ":baseline",
          key,
          period,
          value(1000),
          [source.id],
        );
        world = baseline.world;
        const operations: QuantitativePolicyOperation[] = [
          { kind: "set-level", value: value(800) },
          {
            kind: "absolute-change",
            direction: "increase",
            magnitude: value(100),
          },
          {
            kind: "absolute-change",
            direction: "decrease",
            magnitude: value(100),
          },
          {
            kind: "relative-change",
            direction: "increase",
            share: createExactQuantity(1, 10, "rate:share"),
          },
          {
            kind: "share-of-baseline",
            direction: "decrease",
            sourceBaselineId: baseline.baseline.id,
            share: createExactQuantity(1, 10, "rate:share"),
          },
          { kind: "cap", maximum: value(800) },
          { kind: "floor", minimum: value(1200) },
        ];
        for (const [i, semantics] of operations.entries())
          for (const funding of [0, 1, 2]) {
            world = baseline.world;
            const stable = "rules2:" + kind + ":" + i + ":" + funding;
            const alternative = recordAlternative(
              world,
              stable + ":alternative",
            );
            world = alternative.world;
            const operation = recordOperation(
              world,
              stable + ":operation",
              alternative.alternative.id,
              baseline.baseline,
              semantics,
              {
                startsAt: world.currentDate,
                maturesAt: addDays(world.currentDate, 1),
                trigger: {
                  baselineId: baseline.baseline.id,
                  comparison: "at-least",
                  threshold: value(i === 6 ? 1001 : 1000),
                },
              },
            );
            world = operation.world;
            const factors = fullFactors([source.id]);
            const input = {
              kind: "funding" as const,
              required: value(2),
              available: value(funding),
              reasonKey: "implementation:funding" as const,
              explanation: "Authored available/required control.",
              evidenceEntityIds: [source.id],
            };
            expect(resourceRatioPolicyImplementationFactor(input)).toEqual(
              native.resourceRatioPolicyImplementationFactor(input),
            );
            factors[1] = resourceRatioPolicyImplementationFactor(input);
            const made = recordEstimate(
              world,
              stable + ":estimate",
              alternative.alternative.id,
              [operation.operation.id],
              factors,
            );
            world = made.world;
            const estimate = made.estimate;
            const profile = world.history.policyImplementationProfiles.at(-1)!;
            const own = computePolicyConsequences(
              {
                baselines: world.history.policyBaselines,
                operations: world.history.policyOperations,
              },
              estimate.operationIds,
              profile,
            );
            expect(own).toEqual(estimate.consequences);
            const realized = native.realizePolicyEstimate(world, {
              stableKey: stable + ":realization",
              estimateId: estimate.id,
              provenance: AUTHORED,
            });
            const realization = realized.history.policyRealizations.at(-1)!;
            if (realization.status === "partial")
              expect(constrainedFactorReasonKeys(profile)).toEqual(
                realization.reasonKeys,
              );
            const availability = {
              onDate: realized.currentDate,
              nextSequence: realized.history.nextSequence,
              baselines: realized.history.policyBaselines,
              estimates: realized.history.policyEstimates,
            };
            for (const seq of [
              baseline.baseline.sequence,
              baseline.baseline.sequence + 1,
              realized.history.nextSequence,
            ]) {
              const cutoff = {
                asOfDate: realized.currentDate,
                historySequenceExclusive: seq,
              };
              expect(
                policyBaselineAt(availability, baseline.baseline.id, cutoff),
              ).toEqual(
                native.policyBaselineAt(realized, baseline.baseline.id, cutoff),
              );
              expect(
                latestPolicyBaselineForSeriesAt(
                  availability,
                  baseline.baseline.seriesKey,
                  cutoff,
                ),
              ).toEqual(
                native.latestPolicyBaselineForSeriesAt(
                  realized,
                  baseline.baseline.seriesKey,
                  cutoff,
                ),
              );
              expect(
                policyEstimateAt(availability, estimate.id, cutoff),
              ).toEqual(native.policyEstimateAt(realized, estimate.id, cutoff));
            }
            if (realization.actualCausalProcessId) {
              const item = realization.consequences[0]!;
              const effect = realized.history.effectActivations.find(
                (e) => e.id === item.effectActivationId,
              )!;
              const cause = realized.history.causalProcesses.find(
                (c) => c.id === realization.actualCausalProcessId,
              )!;
              expect(
                result(() =>
                  assertCanonicalRealizedPolicyEffect(
                    effect,
                    operation.operation,
                    own[0]!,
                    estimate,
                    cause,
                    realization,
                    item,
                  ),
                ),
              ).toEqual({ value: undefined });
              expect(
                result(() =>
                  native.assertPolicySemanticsIntegrity(realized, new Set()),
                ),
              ).toEqual({ value: undefined });
              const changed = {
                ...effect,
                direction:
                  effect.direction === "increase"
                    ? ("decrease" as const)
                    : ("increase" as const),
              };
              const bad = {
                ...realized,
                history: {
                  ...realized.history,
                  effectActivations: realized.history.effectActivations.map(
                    (e) => (e.id === effect.id ? changed : e),
                  ),
                },
              };
              expect(
                result(() =>
                  assertCanonicalRealizedPolicyEffect(
                    changed,
                    operation.operation,
                    own[0]!,
                    estimate,
                    cause,
                    realization,
                    item,
                  ),
                ),
              ).toEqual(
                result(() =>
                  native.assertPolicySemanticsIntegrity(bad, new Set()),
                ),
              );
            }
            world = realized;
          }
      }
    },
  );
});
