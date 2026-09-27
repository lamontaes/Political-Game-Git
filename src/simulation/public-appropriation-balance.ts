import type {
  EntityId,
  PublicProgramAppropriationRecord,
  PublicProgramCommitmentRecord,
  World,
} from "./types";

/**
 * The saved appropriation is the shared cap for executive commitments and
 * pinned public payments. Historical reads use the writer's sequence so a
 * later decision cannot retroactively invalidate an earlier transfer.
 */
export function appropriationCommittedMinorUnits(
  world: World,
  appropriation: PublicProgramAppropriationRecord,
  sequenceExclusive = world.history.nextSequence,
): number {
  const commitments = (world.history.publicProgramRecords ?? [])
    .filter(
      (record): record is PublicProgramCommitmentRecord =>
        record.kind === "commitment" &&
        record.appropriationId === appropriation.id &&
        record.sequence < sequenceExclusive,
    )
    .reduce(
      (total, record) =>
        total +
        record.installments.reduce(
          (sum, plan) => sum + plan.amount.minorUnits,
          0,
        ),
      0,
    );
  return (
    commitments +
    appropriationPinnedPaymentsMinorUnits(
      world,
      appropriation,
      sequenceExclusive,
    )
  );
}

export function appropriationPinnedPaymentsMinorUnits(
  world: World,
  appropriation: PublicProgramAppropriationRecord,
  sequenceExclusive = world.history.nextSequence,
): number {
  if (appropriation.sourceMeasureId === null) return 0;
  const eligibleFlows = new Set<EntityId>(
    world.history.resourceFlows
      .filter(
        (flow) =>
          flow.sequence < sequenceExclusive &&
          flow.basisReference.kind === "public-funding" &&
          flow.basisReference.mandate.measureId ===
            appropriation.sourceMeasureId &&
          (flow.basisReference.mandate.appropriationId === undefined ||
            flow.basisReference.mandate.appropriationId === appropriation.id) &&
          flow.jurisdictionId === appropriation.jurisdictionId &&
          flow.source.kind === "organization" &&
          flow.source.organizationId === appropriation.accountOrganizationId,
      )
      .map((flow) => flow.id),
  );
  return world.history.resourceTransferOutcomes
    .filter(
      (outcome) =>
        outcome.sequence < sequenceExclusive &&
        outcome.status === "completed" &&
        eligibleFlows.has(outcome.resourceFlowId),
    )
    .reduce((sum, outcome) => sum + outcome.transferredAmount.minorUnits, 0);
}
