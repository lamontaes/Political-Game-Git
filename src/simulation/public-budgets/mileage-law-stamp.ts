import { addDays } from "../dates";
import { lawInForce, lawInForceAtStart } from "../governing/law-in-force";
import { lawEffectStamp, type LawEffectStamp } from "../law-effect-stamp";
import type { IsoDate, World } from "../types";
import { propositionIdFor } from "./fiscal";
import {
  MILEAGE_FEE_QUESTION,
  motorFuelShare,
  ROAD_CHARGE_FIRST_BILL_LAG_MONTHS,
} from "./road-usage-charge";
import { BUDGET_SOURCES, type PublicBudgetGovernment } from "./store";

/**
 * Attribution for the road-charge component of an existing settled budget.
 * This creates no revenue, assessment, transfer or driver record. The saved
 * source also contains other selective taxes; its total is not a road bill.
 * Keep the first-billing rule identical to the existing road-charge reader.
 */
export function mileageBudgetStamp(
  world: World,
  government: PublicBudgetGovernment,
  month: IsoDate,
  settledRevenue: readonly number[],
): LawEffectStamp | null {
  if (
    government.level !== "state" ||
    motorFuelShare(government.stateKey) <= 0 ||
    !(settledRevenue[BUDGET_SOURCES.indexOf("selectiveSalesTaxes")]! > 0) ||
    !(
      (government.years[0]?.expectedRevenue[
        BUDGET_SOURCES.indexOf("selectiveSalesTaxes")
      ] ?? 0) > 0
    )
  )
    return null;
  const proposition = propositionIdFor(world, MILEAGE_FEE_QUESTION);
  if (!proposition) return null;
  const law = lawInForce(
    world,
    government.lawJurisdictionId,
    proposition,
    month,
  );
  if (law?.answer !== "yes") return null;
  const began = lawInForceAtStart(
    world,
    government.lawJurisdictionId,
    proposition,
    month,
  );
  if (law.origin === "enacted" && began !== "yes") {
    const firstBill = addDays(
      law.operativeAt,
      Math.round(ROAD_CHARGE_FIRST_BILL_LAG_MONTHS * 30.44),
    );
    if (month < firstBill) return null;
  }
  return lawEffectStamp(law, {
    effectKind: "modeled-road-charge-budget-revenue",
    questionKey: MILEAGE_FEE_QUESTION,
    jurisdictionId: government.lawJurisdictionId,
    appliedAt: month,
  });
}
