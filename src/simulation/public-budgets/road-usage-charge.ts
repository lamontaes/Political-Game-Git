import fuelShare from "../../../data/research/money/motor-fuel-tax-share-2022.json" with { type: "json" };
import { addDays, daysBetween } from "../dates";
import { lawInForce, lawInForceAtStart } from "../governing/law-in-force";
import type { IsoDate, World } from "../types";
import { propositionIdFor } from "./fiscal";
import type { PublicBudgetGovernment } from "./store";

/** Should a per-mile road charge replace the fuel tax? */
export const MILEAGE_FEE_QUESTION =
  "us-policy-positions:transportation-infrastructure.mileage-fee-replaces-fuel-tax";

/**
 * How much a fuel tax loses each year as the fleet burns less fuel per mile.
 * The Congressional Budget Office projected that fuel economy standards
 * would cut gasoline tax revenue 21% by 2040 as the fleet turned over ("How
 * Would Proposed Fuel Economy Standards Affect the Highway Trust Fund?",
 * 2012, publication 43198): 0.84% a year over the 28 years. ESTIMATED FROM
 * AVERAGE: one national projection, the same in every place.
 */
export const FUEL_TAX_EROSION_PER_YEAR = 1 - Math.pow(1 - 0.21, 1 / 28);

/**
 * Months from a road charge law taking effect to its first per-mile bill:
 * Oregon's SB 810 (2013) opened OReGO in July 2015, Utah's SB 136 (2018)
 * billed from January 2020 and Virginia's 2020 act opened Mileage Choice in
 * July 2022, about two years each (Research 3).
 */
export const ROAD_CHARGE_FIRST_BILL_LAG_MONTHS = 24;

export const ROAD_CHARGE_BASIS = `A state's fuel tax loses ${(FUEL_TAX_EROSION_PER_YEAR * 100).toFixed(2)}% a year as the fleet burns less fuel (CBO 2012, 21% by 2040), on the motor fuel share of its selective sales taxes (Census Bureau 2022). A per-mile road charge bills the same miles whatever the car burns, so from its first bill, ${ROAD_CHARGE_FIRST_BILL_LAG_MONTHS} months after the law takes effect, that share stops falling. A repeal returns the state to the fuel tax at what today's fleet pays.`;

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
 * change. A county or city collects the state's fuel tax as aid, not as its
 * own tax, so its budget reads 1. The law is read on `date` and the fleet's
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
  if (government.level !== "state") return 1;
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
