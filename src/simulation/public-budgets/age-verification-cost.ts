import { lawEffectStamp, type LawEffectStamp } from "../law-effect-stamp";
import { lawInForce, lawInForceAtStart } from "../governing/law-in-force";
import { propositionIdFor } from "./fiscal";
import { SPENDING_QUESTION_EFFECTS } from "./rules";
import type { EntityId, IsoDate, World } from "../types";
import type { BudgetProgram, PublicBudgetGovernment } from "./store";

export const AGE_VERIFICATION_COST_QUESTION =
  "us-policy-positions:technology-privacy.age-verification-for-social-media";

/** A component actually used by modeled budget spending, not a cash payment. */
export interface GovernmentLawCostAttribution {
  readonly program: BudgetProgram;
  readonly amountUsd: number;
  readonly basis: string;
  readonly lawEffectStamps: readonly LawEffectStamp[];
}

/** Attribute the existing fiscal projection without changing its rate or reach. */
export function ageVerificationCostForMonth(
  world: World,
  government: PublicBudgetGovernment,
  month: IsoDate,
): GovernmentLawCostAttribution | null {
  if (government.level !== "state") return null;
  const effect = SPENDING_QUESTION_EFFECTS.find(
    (row) => row.questionKey === AGE_VERIFICATION_COST_QUESTION,
  );
  const propositionId = propositionIdFor(world, AGE_VERIFICATION_COST_QUESTION);
  if (!effect || !propositionId) return null;
  const law = lawInForce(
    world,
    government.lawJurisdictionId,
    propositionId,
    month,
  );
  const began = lawInForceAtStart(
    world,
    government.lawJurisdictionId,
    propositionId,
    month,
  );
  const perResident =
    began === "no" && law?.answer === "yes"
      ? effect.toYes
      : began === "yes" && law?.answer === "no"
        ? effect.toNo
        : null;
  if (perResident === null) return null;
  const amountUsd = (perResident * government.population) / 12;
  if (!Number.isFinite(amountUsd) || amountUsd === 0) return null;
  const stamp = lawEffectStamp(law, {
    effectKind: "government-age-verification-enforcement-cost",
    questionKey: AGE_VERIFICATION_COST_QUESTION,
    jurisdictionId: government.lawJurisdictionId,
    appliedAt: month,
    sourceRecordIds: law ? [law.measureId as EntityId] : [],
  });
  if (!stamp) return null;
  return {
    program: effect.program,
    amountUsd,
    basis:
      "ESTIMATED FROM AVERAGE: " +
      effect.basis +
      " This is the inherited modeled monthly spending component, before aggregate budget rounding and any zero floor. It is not a platform invoice or observed 2026 enforcement payment. Injunctions require the canonical legal reader to mark the law inoperative.",
    lawEffectStamps: [stamp],
  };
}
