import {
  isLawEffectStamp,
  lawEffectStamp,
  type LawEffectStampedRecord,
} from "../law-effect-stamp";
import { lawInForce, lawInForceAtStart } from "../governing/law-in-force";
import type { EntityId, World } from "../types";
import type { GovernmentLawCostAttribution } from "./age-verification-cost";
import { propositionIdFor } from "./fiscal";
import { SPENDING_QUESTION_EFFECTS } from "./rules";
import type { BudgetMonthRow, PublicBudgetGovernment } from "./store";

export const CONSUMER_PRIVACY_COST_QUESTION =
  "us-policy-positions:technology-privacy.consumer-data-privacy-law";

/** Attribute spending already calculated by the existing budget reader. */
export function appendConsumerPrivacyCostToMonth<
  Row extends BudgetMonthRow & LawEffectStampedRecord,
>(world: World, government: PublicBudgetGovernment, row: Row): Row {
  if (government.level !== "state") return row;
  const effect = SPENDING_QUESTION_EFFECTS.find(
    (entry) => entry.questionKey === CONSUMER_PRIVACY_COST_QUESTION,
  );
  const propositionId = propositionIdFor(world, CONSUMER_PRIVACY_COST_QUESTION);
  if (!effect || !propositionId) return row;
  const law = lawInForce(
    world,
    government.lawJurisdictionId,
    propositionId,
    row.month,
  );
  const opening = lawInForceAtStart(
    world,
    government.lawJurisdictionId,
    propositionId,
    row.month,
  );
  const perResident =
    opening === "no" && law?.answer === "yes"
      ? effect.toYes
      : opening === "yes" && law?.answer === "no"
        ? effect.toNo
        : null;
  if (perResident === null) return row;
  const amountUsd = (perResident * government.population) / 12;
  if (!Number.isFinite(amountUsd) || amountUsd === 0) return row;
  const stamp = lawEffectStamp(law, {
    effectKind: "government-consumer-privacy-enforcement-cost",
    questionKey: CONSUMER_PRIVACY_COST_QUESTION,
    jurisdictionId: government.lawJurisdictionId,
    appliedAt: row.month,
    sourceRecordIds: law ? [law.measureId as EntityId] : [],
  });
  if (!stamp) return row;
  if (
    row.lawEffectStamps?.some(
      (existing) =>
        isLawEffectStamp(existing) &&
        existing.effectKind === stamp.effectKind &&
        existing.governingLawKey === stamp.governingLawKey &&
        existing.jurisdictionId === stamp.jurisdictionId &&
        existing.appliedAt === stamp.appliedAt,
    )
  )
    return row;
  const cost: GovernmentLawCostAttribution = {
    program: effect.program,
    amountUsd,
    basis:
      "ESTIMATED FROM AVERAGE: " +
      effect.basis +
      " Existing modeled enforcement spending component, before aggregate rounding and the budget zero floor; not an observed 2026 payment or a firm's compliance invoice. This attribution adds no spending or cash debit.",
    lawEffectStamps: [stamp],
  };
  return {
    ...row,
    lawCostAttributions: [...(row.lawCostAttributions ?? []), cost],
    lawEffectStamps: [...(row.lawEffectStamps ?? []), stamp],
  };
}
