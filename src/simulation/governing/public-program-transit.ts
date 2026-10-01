import {
  lawEffectStamp,
  type LawEffectStampedRecord,
} from "../law-effect-stamp";
import { lawInForce } from "./law-in-force";
import { propositionIdFor } from "../public-budgets/fiscal";
import { STATE_TRANSIT_SERVICE_QUESTION } from "../legislation-transit-families";
import { stateTransitServiceProfileForMeasure } from "../state-transit-service-profile";
import {
  recordWorldMetricState,
  worldMetricStateForPeriodAt,
} from "../world-metrics";
import type {
  PublicProgramAppropriationRecord,
  PublicProgramCommitmentRecord,
  PublicProgramInstallmentRecord,
  World,
} from "../types";

export const TRANSIT_PROGRAM_COST_BASIS = "actual-posted-government-outlay";
/** Attribute an actual transit payment; payment alone does not prove service. */
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
    !plan ||
    plan.amount.minorUnits <= 0 ||
    !appropriation.sourceMeasureId
  )
    return world;
  if (
    commitment.appropriationId !== appropriation.id ||
    installment.commitmentId !== commitment.id ||
    commitment.programKey !== appropriation.programKey ||
    installment.programKey !== appropriation.programKey
  )
    throw new Error(
      "Transit service requires the saved appropriation payment chain.",
    );
  const measure = (world.history.legislativeMeasures ?? []).find(
    (row) => row.id === appropriation.sourceMeasureId,
  );
  const profile = measure
    ? stateTransitServiceProfileForMeasure(world, measure)
    : null;
  const lineage = (world.history.legislativeDraftLineages ?? []).find(
    (row) => row.measureId === measure?.id,
  );
  const rural =
    !!measure &&
    !!profile &&
    lineage?.variantKey === "transit-staged-service-v2" &&
    profile.programKey === appropriation.programKey;
  const fareRelief =
    !!measure &&
    lineage?.familyKey === "transit-access" &&
    lineage.variantKey === "enrollment-fare-relief";
  if (!rural && !fareRelief) return world;
  if (rural && plan.purpose !== "operating") return world;
  const questionKey = fareRelief
    ? "us-policy-positions:transportation-infrastructure.fare-free-transit"
    : STATE_TRANSIT_SERVICE_QUESTION;
  const outcome = world.history.resourceTransferOutcomes.find(
    (row) =>
      row.resourceFlowId === installment.resourceFlowId &&
      row.status === "completed",
  );
  if (
    !outcome ||
    outcome.transferredAmount.minorUnits !== plan.amount.minorUnits ||
    outcome.transferredAmount.currency !== plan.amount.currency
  )
    throw new Error("Transit service hours require the exact posted payment.");
  const propositionId = propositionIdFor(world, questionKey);
  const governingLaw = propositionId
    ? lawInForce(
        world,
        appropriation.jurisdictionId,
        propositionId,
        installment.recordedAt,
      )
    : null;
  // Never attribute this payment to a different measure answering the same question.
  const ownLaw = governingLaw?.measureId === measure!.id ? governingLaw : null;
  const sources = [
    measure!.id,
    appropriation.id,
    commitment.id,
    installment.id,
    installment.resourceFlowId,
    outcome.id,
  ];
  const spendingStamp = lawEffectStamp(ownLaw, {
    effectKind: "state-spending",
    questionKey,
    jurisdictionId: appropriation.jurisdictionId,
    appliedAt: installment.recordedAt,
    sourceRecordIds: sources,
  });
  const key = `${installment.stableKey}:paid-service-hours`;
  if (
    world.history.metricStates.some(
      (state) => state.stableKey === `${key}:budget-cost`,
    )
  )
    return world;
  let next = world;
  if (spendingStamp) {
    const budgetMetric = Object.values(world.metricCatalog.definitions).find(
      (definition) => definition.stableKey === "government.outlays",
    );
    const budget = budgetMetric
      ? worldMetricStateForPeriodAt(
          world,
          budgetMetric.id,
          { jurisdictionId: appropriation.jurisdictionId, segmentKey: null },
          {
            kind: "interval",
            startsAt: installment.recordedAt,
            endsAt: installment.recordedAt,
          },
          {
            asOfDate: world.currentDate,
            historySequenceExclusive: world.history.nextSequence,
          },
        )
      : null;
    if (
      !budget ||
      budget.value.kind !== "money" ||
      budget.value.money.currency !== plan.amount.currency ||
      budget.value.money.minorUnits < plan.amount.minorUnits ||
      budget.provenance.kind !== "simulated" ||
      !budget.provenance.sourceEntityIds.includes(installment.eventId)
    )
      throw new Error(
        "A transit cost stamp requires its actual government outlay.",
      );
    const priorStamps =
      (budget as typeof budget & LawEffectStampedRecord).lawEffectStamps ?? [];
    // Append provenance to the already posted budget total; never post the payment again.
    next = recordWorldMetricState(next, {
      stableKey: `${key}:budget-cost`,
      metricId: budget.metricId,
      scope: budget.scope,
      referencePeriod: budget.referencePeriod,
      value: budget.value,
      recordedAt: world.currentDate,
      provenance: budget.provenance,
      supersedesStateId: budget.id,
      ...{
        lawEffectStamps: [
          ...priorStamps,
          {
            ...spendingStamp,
            sourceRecordIds: [...sources, installment.eventId, budget.id],
          },
        ],
      },
    });
  }
  // Installment terms contain an amount, date and purpose, not purchased
  // vehicle hours. No rate or service quantity is inferred from research.
  return next;
}
