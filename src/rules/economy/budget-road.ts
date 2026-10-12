/** Retained full dated road-law selection, first-bill lag and fuel-tax erosion math. */
import fuelShare from "../../../data/research/money/motor-fuel-tax-share-2022.json";
import { addDays, daysBetween } from "../../simulation/dates";
import { lawInForce, lawInForceAtStart } from "../laws/dated-law";
import { propositionIdFor, type BudgetFiscalFacts } from "./budget-fiscal";
import {
  TAX_QUESTION_EFFECTS,
  FUEL_TAX_EROSION_PER_YEAR,
  MILEAGE_FEE_QUESTION,
  ROAD_CHARGE_FIRST_BILL_LAG_MONTHS,
} from "./budget-tax-policy";
import type { IsoDate } from "../../simulation/types";
import type { PublicBudgetGovernment } from "../../simulation/public-budgets/store";
const SHARES = fuelShare.places as Readonly<Record<string, number>>;
export function motorFuelShare(stateKey: string): number {
  return SHARES[stateKey] ?? fuelShare.average;
}
export function yearsBetween(start: IsoDate, end: IsoDate): number {
  return Math.max(0, daysBetween(start, end) / 365.25);
}
export function roadChargeFactor(
  facts: BudgetFiscalFacts,
  government: PublicBudgetGovernment,
  date: IsoDate,
  erodedOn: IsoDate = date,
): number {
  const effect = TAX_QUESTION_EFFECTS.find(
    (row) => row.questionKey === MILEAGE_FEE_QUESTION,
  );
  if (!effect || !(effect.levels ?? ["state"]).includes(government.level))
    return 1;
  const opened = government.years[0]!.adoptedOn;
  const share = motorFuelShare(government.stateKey);
  const kept = (on: IsoDate) =>
    1 -
    share *
      (1 - Math.pow(1 - FUEL_TAX_EROSION_PER_YEAR, yearsBetween(opened, on)));
  const propositionId = propositionIdFor(facts, MILEAGE_FEE_QUESTION);
  if (!propositionId) return kept(erodedOn);
  const law = lawInForce(
    facts.laws,
    government.lawJurisdictionId,
    propositionId,
    date,
  );
  const began =
    lawInForceAtStart(
      facts.laws,
      government.lawJurisdictionId,
      propositionId,
      date,
    ) ?? "no";
  if (law?.answer !== "yes") return kept(erodedOn);
  if (law.origin === "in-force-at-start" || began === "yes") return 1;
  const firstBill = addDays(
    law.operativeAt,
    Math.round(ROAD_CHARGE_FIRST_BILL_LAG_MONTHS * 30.44),
  );
  return kept(firstBill < erodedOn ? firstBill : erodedOn);
}
