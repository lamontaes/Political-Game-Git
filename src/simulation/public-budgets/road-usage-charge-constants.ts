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
