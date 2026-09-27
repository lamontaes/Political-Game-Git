import { TRANSIT_METRIC_INPUT } from "../transit-contract-definitions";
import { TRANSIT_CONTRACT_PRICE_MINOR_UNITS_PER_HOUR } from "../legislation-transit-families";
import { publishPublicEvent } from "../public-information";
import { createExactQuantity } from "../quantity";
import { stateTransitServiceProfileForMeasure } from "../state-transit-service-profile";
import {
  createWorldMetricCatalog,
  createWorldMetricDefinition,
  recordWorldMetricState,
} from "../world-metrics";
import { recordWorldEvent } from "../world";
import type {
  PublicProgramAppropriationRecord,
  PublicProgramCommitmentRecord,
  PublicProgramInstallmentRecord,
  World,
} from "../types";

/**
 * The Wave 2 game price is authored contract arithmetic, not a sourced
 * transit cost, observed ridership, travel time, or household access result.
 */
export const TRANSIT_PROGRAM_COST_BASIS = "PLACEHOLDER(wave2)";

function hoursText(minorUnits: number): string {
  const price = TRANSIT_CONTRACT_PRICE_MINOR_UNITS_PER_HOUR;
  const whole = Math.floor(minorUnits / price);
  const rest = minorUnits % price;
  const hours =
    rest === 0
      ? String(whole)
      : `${whole}.${String(rest)
          .padStart(String(price).length - 1, "0")
          .replace(/0+$/, "")}`;
  return `${hours} vehicle-service ${hours === "1" ? "hour" : "hours"}`;
}

/** One posted operating installment produces one counted service outturn. */
export function recordPaidTransitProgramService(
  world: World,
  appropriation: PublicProgramAppropriationRecord,
  commitment: PublicProgramCommitmentRecord,
  installment: PublicProgramInstallmentRecord,
): World {
  const plan = commitment.installments[installment.installmentIndex];
  if (
    installment.status !== "posted" ||
    !installment.resourceFlowId ||
    plan?.purpose !== "operating" ||
    plan.amount.minorUnits <= 0 ||
    !appropriation.sourceMeasureId
  )
    return world;
  const measure = (world.history.legislativeMeasures ?? []).find(
    (row) => row.id === appropriation.sourceMeasureId,
  );
  const profile = measure
    ? stateTransitServiceProfileForMeasure(world, measure)
    : null;
  const lineage = (world.history.legislativeDraftLineages ?? []).find(
    (row) => row.measureId === measure?.id,
  );
  if (
    !profile ||
    lineage?.variantKey !== "transit-staged-service-v2" ||
    profile.programKey !== appropriation.programKey
  )
    return world;
  const outcome = world.history.resourceTransferOutcomes.find(
    (row) =>
      row.resourceFlowId === installment.resourceFlowId &&
      row.status === "completed",
  );
  if (
    !outcome ||
    outcome.transferredAmount.minorUnits !== plan.amount.minorUnits
  )
    throw new Error("Transit service hours require the exact posted payment.");
  const key = `${installment.stableKey}:paid-service-hours`;
  if (world.history.events.some((event) => event.stableKey === key))
    return world;
  let next = recordWorldEvent(world, {
    stableKey: key,
    type: "transit.program-paid-service-hours",
    occurredAt: installment.recordedAt,
    recordedAt: installment.recordedAt,
    jurisdictionId: appropriation.jurisdictionId,
    involvedEntityIds: [
      appropriation.id,
      commitment.id,
      installment.id,
      installment.resourceFlowId,
      outcome.id,
    ],
    participants: [],
    personFactConstraints: [],
    visibility: "public",
    tags: ["transit.service", `program:${profile.programKey}`],
    summary: `The state paid ${plan.amount.minorUnits / 100} USD for ${hoursText(plan.amount.minorUnits)} of modeled added rural-transit service under ${measure!.designation}. This records paid service under ${TRANSIT_PROGRAM_COST_BASIS}; it does not establish ridership, travel time, access, or who learned of the payment.`,
    context: {
      location: null,
      socialContext: "Paid state rural-transit service",
      pressure: null,
      choice: null,
      motivation: null,
      immediateReaction: null,
    },
  });
  const serviceEventId = next.history.events.at(-1)!.id;
  const metric = createWorldMetricDefinition(TRANSIT_METRIC_INPUT);
  if (!next.metricCatalog.definitions[metric.id])
    next = {
      ...next,
      metricCatalog: createWorldMetricCatalog({
        definitions: [
          ...next.metricCatalog.definitionOrder.map(
            (id) => next.metricCatalog.definitions[id]!,
          ),
          metric,
        ],
      }),
    };
  next = recordWorldMetricState(next, {
    stableKey: `${key}:metric`,
    metricId: metric.id,
    scope: {
      jurisdictionId: appropriation.jurisdictionId,
      segmentKey: `public-program-installment:${installment.id}`,
    },
    referencePeriod: { kind: "point", at: installment.recordedAt },
    value: {
      kind: "quantity",
      quantity: createExactQuantity(
        plan.amount.minorUnits,
        TRANSIT_CONTRACT_PRICE_MINOR_UNITS_PER_HOUR,
        "duration:vehicle-service-hour",
      ),
    },
    recordedAt: installment.recordedAt,
    provenance: { kind: "simulated", sourceEntityIds: [serviceEventId] },
    supersedesStateId: null,
  });
  return publishPublicEvent(next, {
    stableKey: `${key}:publication`,
    sourceEventId: serviceEventId,
  });
}
