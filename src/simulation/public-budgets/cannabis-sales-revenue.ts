import { makeIsoDate } from "../dates";
import { lawInForce, lawInForceAtStart } from "../governing/law-in-force";
import type { EntityId, IsoDate, World } from "../types";
import { CANNABIS_TAX_EFFECT } from "./rules";
import type { PublicBudgetGovernment } from "./store";
import { propositionIdFor } from "./fiscal";

export interface CannabisSalesRevenueReading {
  readonly reason:
    | "not-state-budget"
    | "question-not-present"
    | "starting-law-not-established"
    | "current-law-not-established"
    | "same-answer"
    | "waiting-for-retail"
    | "sales-legalized"
    | "sales-ended";
  /** Annual change against the opening budget, not an actual sale or remittance. */
  readonly annualRevenueDelta: number;
  /** Exact governing measure for the caller's shared effect provenance stamp. */
  readonly sourceMeasureId: EntityId | null;
}

/**
 * Reads the existing cannabis budget model as an amount, so a zero opening
 * selective-tax base cannot suppress an adoption. Unknown opening law is not
 * treated as a ban. The inherited fixed tax average and retail lag remain
 * calibration gaps; this reader does not introduce a new effect size.
 */
export function cannabisSalesRevenueChange(
  world: World,
  government: Pick<
    PublicBudgetGovernment,
    "level" | "lawJurisdictionId" | "population"
  >,
  date: IsoDate,
): CannabisSalesRevenueReading {
  const unchanged = (
    reason: CannabisSalesRevenueReading["reason"],
  ): CannabisSalesRevenueReading => ({
    reason,
    annualRevenueDelta: 0,
    sourceMeasureId: null,
  });
  if (government.level !== "state") return unchanged("not-state-budget");
  const propositionId = propositionIdFor(
    world,
    CANNABIS_TAX_EFFECT.questionKey,
  );
  if (!propositionId) return unchanged("question-not-present");
  const began = lawInForceAtStart(
    world,
    government.lawJurisdictionId,
    propositionId,
    date,
  );
  if (began === null) return unchanged("starting-law-not-established");
  const current = lawInForce(
    world,
    government.lawJurisdictionId,
    propositionId,
    date,
  );
  if (!current) return unchanged("current-law-not-established");
  if (current.answer === began) return unchanged("same-answer");
  const annualRevenue =
    CANNABIS_TAX_EFFECT.perResidentRevenue.annualAmount * government.population;
  if (current.answer === "no") {
    return {
      reason: "sales-ended",
      annualRevenueDelta: -annualRevenue,
      sourceMeasureId: current.measureId,
    };
  }
  const priorMonth =
    Number(date.slice(0, 4)) * 12 +
    Number(date.slice(5, 7)) -
    1 -
    CANNABIS_TAX_EFFECT.perResidentRevenue.firstSaleLagMonths;
  const retailDate = makeIsoDate(
    `${Math.floor(priorMonth / 12)}-${String((priorMonth % 12) + 1).padStart(2, "0")}-${date.slice(8, 10) > "28" ? "28" : date.slice(8, 10)}`,
  );
  const prior = lawInForce(
    world,
    government.lawJurisdictionId,
    propositionId,
    retailDate,
  );
  if (prior?.answer !== "yes") return unchanged("waiting-for-retail");
  return {
    reason: "sales-legalized",
    annualRevenueDelta: annualRevenue,
    sourceMeasureId: current.measureId,
  };
}
