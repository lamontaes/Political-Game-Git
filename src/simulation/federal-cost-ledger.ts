import { lawInForce } from "./governing/law-in-force";
import { lawEffectStamp, type LawEffectStamp } from "./law-effect-stamp";
import { NATIONAL_ELECTION_JURISDICTION } from "./national-election-geography";
import type { EntityId, IsoDate, World } from "./types";
import { measureAnswersAt } from "./vote-bundle";

/** A paid installment, not an appropriation ceiling or a forecast. */
export interface FederalProgramCost {
  readonly transferId: EntityId;
  readonly sourceMeasureId: EntityId;
  readonly programKey: string;
  readonly paidAt: IsoDate;
  readonly amountMinorUnits: number;
  readonly sourceRecordIds: readonly EntityId[];
  readonly questionKey: string | null;
  readonly lawEffectStamps: readonly LawEffectStamp[];
}

/**
 * The existing program mechanism commits against its written appropriation,
 * checks the government's actual cash and posts an actual resource transfer.
 * Read that paid base; never replace it with an annual estimate or a draw.
 * A mixed-subject bill remains unassigned rather than charging every question.
 */
export function federalProgramCostsForMonth(
  world: World,
  month: IsoDate,
): readonly FederalProgramCost[] {
  const nation = NATIONAL_ELECTION_JURISDICTION.id;
  const records = new Map(
    (world.history.publicProgramRecords ?? []).map((r) => [r.id, r]),
  );
  const flows = new Map(
    (world.history.resourceFlows ?? []).map((r) => [r.id, r]),
  );
  const measures = new Map(
    (world.history.legislativeMeasures ?? []).map((r) => [r.id, r]),
  );
  const installmentsByFlow = new Map(
    [...records.values()]
      .filter(
        (r) =>
          r.kind === "installment" && r.status === "posted" && r.resourceFlowId,
      )
      .map((r) =>
        r.kind === "installment" ? ([r.resourceFlowId, r] as const) : null,
      )
      .filter((r) => r !== null),
  );
  const result: FederalProgramCost[] = [];
  for (const transfer of world.history.resourceTransferOutcomes ?? []) {
    if (
      transfer.status !== "completed" ||
      transfer.occurredAt.slice(0, 7) !== month.slice(0, 7) ||
      transfer.transferredAmount.currency !== "USD" ||
      transfer.transferredAmount.minorUnits <= 0
    )
      continue;
    const flow = flows.get(transfer.resourceFlowId);
    if (
      flow?.jurisdictionId !== nation ||
      flow.basisReference.kind !== "public-program"
    )
      continue;
    const commitment = records.get(flow.basisReference.commitmentId);
    if (
      commitment?.kind !== "commitment" ||
      commitment.jurisdictionId !== nation
    )
      continue;
    const appropriation = records.get(commitment.appropriationId);
    if (
      appropriation?.kind !== "appropriation" ||
      appropriation.jurisdictionId !== nation ||
      !appropriation.sourceMeasureId
    )
      continue;
    const measure = measures.get(appropriation.sourceMeasureId);
    if (
      measure?.jurisdictionId !== nation ||
      flow.source.kind !== "organization" ||
      flow.source.organizationId !== appropriation.accountOrganizationId
    )
      continue;
    // The paid flow must be the saved installment of this exact commitment.
    const posted = installmentsByFlow.get(flow.id);
    if (
      !posted ||
      posted.commitmentId !== commitment.id ||
      posted.installmentIndex !== flow.basisReference.installmentIndex
    )
      continue;
    const answers = measureAnswersAt(world, measure.id, transfer.sequence)
      .map((answer) => world.policyCatalog?.propositions[answer.propositionId])
      .filter((p) => p?.stableKey.startsWith("us-federal-positions:"));
    const proposition = answers.length === 1 ? answers[0] : undefined;
    const governing = proposition
      ? lawInForce(
          world,
          nation,
          proposition.id,
          transfer.occurredAt,
          "enacted-only",
        )
      : null;
    const sourceRecordIds = [
      appropriation.id,
      commitment.id,
      posted.id,
      flow.id,
      transfer.id,
    ];
    const stamp =
      governing?.measureId === measure.id && proposition
        ? lawEffectStamp(governing, {
            effectKind: "government-program-payment",
            questionKey: proposition.stableKey,
            jurisdictionId: nation,
            appliedAt: transfer.occurredAt,
            sourceRecordIds,
          })
        : null;
    result.push({
      transferId: transfer.id,
      sourceMeasureId: measure.id,
      programKey: commitment.programKey,
      paidAt: transfer.occurredAt,
      amountMinorUnits: transfer.transferredAmount.minorUnits,
      sourceRecordIds,
      questionKey: stamp?.questionKey ?? null,
      lawEffectStamps: stamp ? [stamp] : [],
    });
  }
  return result;
}
