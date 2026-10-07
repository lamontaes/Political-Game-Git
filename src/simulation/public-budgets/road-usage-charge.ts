import fuelShare from "../../../data/research/money/motor-fuel-tax-share-2022.json" with { type: "json" };
import { addDays, daysBetween } from "../dates";
import { lawInForce, lawInForceAtStart } from "../governing/law-in-force";
import type { IsoDate, World } from "../types";
import { propositionIdFor } from "./fiscal";
import { TAX_QUESTION_EFFECTS } from "./rules";
import type { PublicBudgetGovernment } from "./store";

import {
  FUEL_TAX_EROSION_PER_YEAR,
  MILEAGE_FEE_QUESTION,
  ROAD_CHARGE_FIRST_BILL_LAG_MONTHS,
} from "./road-usage-charge-constants";

export {
  FUEL_TAX_EROSION_PER_YEAR,
  MILEAGE_FEE_QUESTION,
  ROAD_CHARGE_BASIS,
  ROAD_CHARGE_FIRST_BILL_LAG_MONTHS,
} from "./road-usage-charge-constants";

const SHARES = fuelShare.places as Readonly<Record<string, number>>;

/** The motor fuel tax's share of a state's selective sales taxes. */
export function motorFuelShare(stateKey: string): number {
  return SHARES[stateKey] ?? fuelShare.average;
}

function yearsBetween(start: IsoDate, end: IsoDate): number {
  return Math.max(0, daysBetween(start, end) / 365.25);
}

/**
 * How the fuel tax and a road charge move a state's selective sales taxes on
 * a date, against the level the budget opened with: 1 at the opening, less
 * each year the fuel tax erodes. A state that began with a road charge, or
 * whose enacted charge is billing, keeps the share it had on the charge's
 * first bill: a revenue-neutral charge starts at what the fuel tax then
 * raised, and it bills miles, which the fleet's fuel economy does not
 * change. Only the tax row's declared government levels read this effect.
 * The state fuel-tax estimate is not a county or city's own tax, so those
 * budgets read 1. The law is read on `date` and the fleet's
 * erosion on `erodedOn` (the same date unless given), so a comparison of the
 * laws in force on two dates can hold the fleet at one date and count only
 * what the laws changed.
 */
export function roadChargeFactor(
  world: World,
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
  const propositionId = propositionIdFor(world, MILEAGE_FEE_QUESTION);
  if (!propositionId) return kept(erodedOn);
  const law = lawInForce(
    world,
    government.lawJurisdictionId,
    propositionId,
    date,
  );
  const began =
    lawInForceAtStart(
      world,
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
