import {
  createExactQuantity,
  makeCurrencyCode,
  currentMeasureProvisions,
  directPolicyImplementationFactor,
  recordPolicyAlternative,
  recordPolicyAnalysisKnowledge,
  recordPolicyBaseline,
  recordPolicyEstimate,
  recordPolicyImplementationProfile,
  recordPolicyOperation,
  recordPolicyProjectionRoot,
  recordWorldEvent,
} from "../simulation";
import type {
  EntityId,
  MetricReferencePeriod,
  PolicyEstimateRecord,
  PolicyImplementationFactor,
  World,
} from "../simulation";
import { billFiscalReading } from "./legislation-analysis";
import { docketBill, type DocketBill } from "./legislation-docket";

export interface BillEstimateActionInput {
  readonly scenarioKey: string;
  readonly playerPersonId: EntityId;
  readonly docketKey: string;
  readonly expectedProvisionIds: readonly EntityId[];
  readonly expectedHistorySequence: number;
  readonly referencePeriod: Extract<
    MetricReferencePeriod,
    { kind: "interval" }
  >;
}
export interface BillEstimateProjection {
  readonly estimateId: EntityId;
  readonly measureId: EntityId;
  readonly provisionIds: readonly EntityId[];
  readonly knowledgeId: EntityId;
  readonly addedOutlaysMinorUnits: number;
  readonly currency: "USD";
  readonly qualification: string;
  readonly referencePeriod: Extract<
    MetricReferencePeriod,
    { kind: "interval" }
  >;
}
export type BillEstimateActionResult =
  | { readonly kind: "refused"; readonly world: World; readonly reason: string }
  | {
      readonly kind: "estimated";
      readonly world: World;
      readonly estimate: PolicyEstimateRecord;
      readonly projection: BillEstimateProjection;
    };

const QUALIFICATION =
  "Conditional fiscal exposure scenario: assumes the full stated amount is funded, administered and spent during the selected period. The zero baseline means no incremental outlays for this proposal-specific scenario, not a measured government budget. This is not a service-impact forecast, appropriation, enactment or actual expenditure.";

export function prepareBillEstimateAction(
  world: World,
  bill: DocketBill,
  playerPersonId: EntityId,
  referencePeriod: BillEstimateActionInput["referencePeriod"],
): BillEstimateActionInput {
  return {
    scenarioKey: bill.scenarioKey,
    playerPersonId,
    docketKey: bill.docketKey,
    expectedProvisionIds: currentMeasureProvisions(world, bill.measureId).map(
      (p) => p.id,
    ),
    expectedHistorySequence: world.history.nextSequence,
    referencePeriod,
  };
}

/** A read-only projection requires the requesting person's explicit analysis knowledge. */
export function projectBillEstimate(
  world: World,
  actorId: EntityId,
  estimateId: EntityId,
): BillEstimateProjection | null {
  const estimate = world.history.policyEstimates.find(
    (e) => e.id === estimateId,
  );
  if (
    !estimate ||
    !estimate.stableKey.startsWith("docket-conditional-estimate:")
  )
    return null;
  const knowledge = world.history.knowledge.find(
    (k) =>
      k.personId === actorId &&
      world.history.events.some(
        (e) =>
          e.id === k.eventId &&
          e.type === "policy.analysis-reviewed" &&
          e.involvedEntityIds.includes(estimateId),
      ),
  );
  const alternative = world.history.policyAlternatives.find(
    (a) => a.id === estimate.alternativeId,
  );
  const sourceEventIds =
    alternative?.provenance.kind === "simulated"
      ? alternative.provenance.sourceEntityIds
      : [];
  const event = world.history.events.find(
    (e) =>
      sourceEventIds.includes(e.id) &&
      e.type === "legislation.conditional-estimate-requested",
  );
  let sources: EntityId[] = [];
  try {
    const links: unknown = JSON.parse(event?.context.choice ?? "null");
    if (!Array.isArray(links) || !links.every((id) => typeof id === "string"))
      return null;
    sources = links as EntityId[];
  } catch {
    return null;
  }
  const measure = (world.history.legislativeMeasures ?? []).find((m) =>
    sources.includes(m.id),
  );
  if (
    !measure ||
    sources[0] !== measure.id ||
    new Set(sources).size !== sources.length ||
    sources.length < 2 ||
    sources
      .slice(1)
      .some(
        (id) =>
          !(world.history.legislativeProvisions ?? []).some(
            (p) => p.id === id && p.measureId === measure.id,
          ),
      )
  )
    return null;
  const operation = world.history.policyOperations.find((op) =>
    estimate.operationIds.includes(op.id),
  );
  const period = operation?.targetReferencePeriod;
  const value = estimate.consequences[0]?.estimatedChange;
  if (
    !knowledge ||
    !measure ||
    period?.kind !== "interval" ||
    value?.kind !== "money" ||
    value.money.currency !== "USD"
  )
    return null;
  return {
    estimateId,
    measureId: measure.id,
    provisionIds: sources.filter((id) =>
      (world.history.legislativeProvisions ?? []).some((p) => p.id === id),
    ),
    knowledgeId: knowledge.id,
    addedOutlaysMinorUnits: value.money.minorUnits,
    currency: "USD",
    qualification: QUALIFICATION,
    referencePeriod: period,
  };
}

/** Transactional adapter: all refusal paths return the original immutable World. */
export function requestBillEstimate(
  world: World,
  input: BillEstimateActionInput,
): BillEstimateActionResult {
  const refuse = (reason: string): BillEstimateActionResult => ({
    kind: "refused",
    world,
    reason,
  });
  if (
    world.control.kind !== "person" ||
    world.control.personId !== input.playerPersonId
  )
    return refuse(
      "Only the controlled person may request this private analysis.",
    );
  const bill = docketBill(world, input);
  if (!bill) return refuse("The docket bill is no longer available.");
  if (
    Object.values(bill.parameterValues).some(
      (value) => value.kind === "money" && value.currency !== "USD",
    )
  )
    return refuse("The fiscal scenario requires compatible USD amounts.");
  const provisions = currentMeasureProvisions(world, bill.measureId);
  if (
    JSON.stringify(provisions.map((p) => p.id)) !==
    JSON.stringify(input.expectedProvisionIds)
  )
    return refuse(
      "The bill's provisions changed; review the current version first.",
    );
  const period = input.referencePeriod;
  const key = `docket-conditional-estimate:${JSON.stringify([input.playerPersonId, bill.measureId, input.expectedProvisionIds, input.expectedHistorySequence, period])}`;
  const existing = world.history.policyEstimates.find(
    (e) => e.stableKey === key,
  );
  if (existing) {
    const projection = projectBillEstimate(
      world,
      input.playerPersonId,
      existing.id,
    );
    return projection
      ? { kind: "estimated", world, estimate: existing, projection }
      : refuse("The existing analysis is not known to this person.");
  }
  if (input.expectedHistorySequence !== world.history.nextSequence)
    return refuse(
      "The circumstances changed; review the analysis request again.",
    );
  if (
    period.kind !== "interval" ||
    period.startsAt < world.currentDate ||
    period.endsAt <= period.startsAt
  )
    return refuse(
      "Choose a future interval for the conditional spending scenario.",
    );
  if (
    provisions.some((p) => "fiscalPeriod" in p && p.fiscalPeriod === "annual")
  )
    return refuse(
      "This bill states annual amounts. A whole-programme spending scenario cannot be calculated from them.",
    );
  const reading = billFiscalReading(world, bill);
  const amount = reading.statedCeilingMinorUnits;
  if (
    amount === null ||
    !Number.isSafeInteger(amount) ||
    amount < 0 ||
    reading.effect.kind === "collects-charge"
  )
    return refuse(
      "This bill does not provide a supported aggregate spending amount.",
    );
  const metric = Object.values(world.metricCatalog.definitions).find(
    (d) =>
      d.stableKey === "government.outlays" &&
      d.valueKind === "money" &&
      d.referencePeriodKind === "interval" &&
      d.stateSemantics === "primitive",
  );
  const mechanism = Object.values(
    world.causalMechanismCatalog.definitions,
  ).find((d) => d.stableKey === "mechanism.linear-transition");
  if (!metric || !mechanism)
    return refuse(
      "A spending scenario cannot be calculated with the information currently available.",
    );
  const sourceEntityIds = [bill.measureId, ...provisions.map((p) => p.id)];
  const scope = {
    jurisdictionId: bill.jurisdictionId,
    segmentKey:
      `scenario.incremental-proposal.${bill.measureId.replaceAll("_", "-")}` as const,
  };
  const provenance = { kind: "authored" as const, note: QUALIFICATION };
  try {
    let next = recordWorldEvent(world, {
      stableKey: `${key}:request`,
      type: "legislation.conditional-estimate-requested",
      occurredAt: world.currentDate,
      recordedAt: world.currentDate,
      jurisdictionId: bill.jurisdictionId,
      involvedEntityIds: [bill.measureId, input.playerPersonId].sort(),
      participants: [
        {
          personId: input.playerPersonId,
          role: "observation:policy-analysis",
          detail:
            "Requested a conditional fiscal exposure scenario for these exact provisions.",
        },
      ],
      personFactConstraints: [],
      visibility: "private",
      tags: ["policy.analysis"],
      summary: QUALIFICATION,
      context: {
        location: null,
        socialContext:
          "Private conditional scenario request; choice stores exact measure/provision IDs validated against the request frontier.",
        pressure: null,
        choice: JSON.stringify(sourceEntityIds),
        motivation: null,
        immediateReaction: null,
      },
    });
    const evidenceIds = [next.history.events.at(-1)!.id];
    next = recordPolicyAlternative(next, {
      stableKey: `${key}:alternative`,
      alternativeKind: "proposal:legislative-working-draft",
      title: `${bill.designation}: conditional fiscal exposure`,
      summary: QUALIFICATION,
      propositionId: null,
      proposedAt: world.currentDate,
      recordedAt: world.currentDate,
      provenance: { kind: "simulated", sourceEntityIds: evidenceIds },
    });
    const alternativeId = next.history.policyAlternatives.at(-1)!.id;
    // Reuse only this explicitly authored incremental scenario baseline, never an unrelated aggregate.
    let baseline = next.history.policyBaselines
      .filter(
        (b) =>
          b.metricId === metric.id &&
          b.scope.jurisdictionId === scope.jurisdictionId &&
          b.scope.segmentKey === scope.segmentKey &&
          JSON.stringify(b.referencePeriod) === JSON.stringify(period) &&
          b.expectedValue.kind === "money" &&
          b.expectedValue.money.currency === "USD" &&
          b.expectedValue.money.minorUnits === 0 &&
          b.methodologyKey === "scenario:no-proposal-incremental-outlays" &&
          b.recordedAt <= world.currentDate &&
          b.generatedAt <= world.currentDate &&
          b.sequence < input.expectedHistorySequence,
      )
      .at(-1);
    if (!baseline) {
      next = recordPolicyBaseline(next, {
        stableKey: `${key}:baseline`,
        seriesKey: `baseline:conditional-${bill.measureId}-${period.startsAt}-${period.endsAt}`,
        metricId: metric.id,
        scope,
        referencePeriod: period,
        expectedValue: {
          kind: "money",
          money: { minorUnits: 0, currency: makeCurrencyCode("USD") },
        },
        generatedAt: world.currentDate,
        recordedAt: world.currentDate,
        sourceEntityIds: evidenceIds,
        methodologyKey: "scenario:no-proposal-incremental-outlays",
        assumptionKeys: ["assumption:no-proposal-no-incremental-spending"],
        uncertainty: { kind: "none" },
        provenance,
        supersedesBaselineId: null,
      });
      baseline = next.history.policyBaselines.at(-1)!;
    }
    next = recordPolicyOperation(next, {
      stableKey: `${key}:operation`,
      alternativeId,
      targetMetricId: metric.id,
      targetScope: scope,
      targetReferencePeriod: period,
      targetBaselineId: baseline.id,
      operation: {
        kind: "absolute-change",
        direction: "increase",
        magnitude: {
          kind: "money",
          money: { minorUnits: amount, currency: makeCurrencyCode("USD") },
        },
      },
      trigger: null,
      mechanismDefinitionId: mechanism.id,
      realizationKind: "policy:quantitative-operation",
      timing: {
        startsAt: period.startsAt,
        maturesAt: period.endsAt,
        endsAt: null,
      },
      recordedAt: world.currentDate,
      provenance,
    });
    const operationIds = [next.history.policyOperations.at(-1)!.id];
    const factors = (
      [
        "authority",
        "funding",
        "administrative-capacity",
        "enforcement-compliance",
        "uptake-participation",
      ] as PolicyImplementationFactor["kind"][]
    ).map((kind) =>
      directPolicyImplementationFactor({
        kind,
        share: createExactQuantity(1, 1, "rate:share"),
        reasonKey: `assumption:conditional-${kind}`,
        explanation: `Assumed full ${kind} for this conditional scenario only; no evidence of implementation.`,
        evidenceEntityIds: evidenceIds,
      }),
    );
    next = recordPolicyImplementationProfile(next, {
      stableKey: `${key}:profile`,
      alternativeId,
      operationIds,
      factors,
      assessedAt: world.currentDate,
      recordedAt: world.currentDate,
      provenance,
    });
    const implementationProfileId =
      next.history.policyImplementationProfiles.at(-1)!.id;
    next = recordPolicyProjectionRoot(next, {
      stableKey: `${key}:root`,
      alternativeId,
      operationIds,
      effectiveAt: world.currentDate,
      recordedAt: world.currentDate,
    });
    next = recordPolicyEstimate(next, {
      stableKey: key,
      seriesKey: `estimate:conditional-${alternativeId}`,
      alternativeId,
      operationIds,
      implementationProfileId,
      projectedCausalProcessId: next.history.causalProcesses.at(-1)!.id,
      generatedAt: world.currentDate,
      recordedAt: world.currentDate,
      provenance,
      supersedesEstimateId: null,
    });
    const estimate = next.history.policyEstimates.at(-1)!;
    next = recordPolicyAnalysisKnowledge(next, {
      stableKey: `${key}:review`,
      personId: input.playerPersonId,
      estimateId: estimate.id,
      summary: QUALIFICATION,
      believedSummary: QUALIFICATION,
      accuracy: "accurate",
      confidence: "high",
      visibility: "private",
    });
    const projection = projectBillEstimate(
      next,
      input.playerPersonId,
      estimate.id,
    );
    if (!projection)
      return refuse("The private estimate could not be projected.");
    return { kind: "estimated", world: next, estimate, projection };
  } catch (error) {
    return refuse(
      error instanceof Error
        ? error.message
        : "The conditional analysis could not be recorded.",
    );
  }
}
