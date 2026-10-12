/** Supporting frozen native tax-effect catalog and road-charge source assumptions. */
import type {
  BudgetSource,
  BudgetLevel,
} from "../../simulation/public-budgets/store";
export const MILEAGE_FEE_QUESTION =
  "us-policy-positions:transportation-infrastructure.mileage-fee-replaces-fuel-tax";
// stopgapId: "economy.budget-road-national-projection"
export const FUEL_TAX_EROSION_PER_YEAR = 1 - Math.pow(1 - 0.21, 1 / 28);
// stopgapId: "economy.budget-road-first-bill-lag"
export const ROAD_CHARGE_FIRST_BILL_LAG_MONTHS = 24;
export const ROAD_CHARGE_BASIS = `A state's fuel tax loses ${(FUEL_TAX_EROSION_PER_YEAR * 100).toFixed(2)}% a year as the fleet burns less fuel (CBO 2012, 21% by 2040), on the motor fuel share of its selective sales taxes (Census Bureau 2022). A per-mile road charge bills the same miles whatever the car burns, so from its first bill, ${ROAD_CHARGE_FIRST_BILL_LAG_MONTHS} months after the law takes effect, that share stops falling. A repeal returns the state to the fuel tax at what today's fleet pays.`;
// stopgapId: "economy.budget-cannabis-tax-calibration"
export const CANNABIS_TAX_EFFECT = {
  questionKey: "us-policy-positions:business-commerce.legalize-cannabis-sales",
  source: "selectiveSalesTaxes",
  toYes: null,
  toNo: null,
  perResidentRevenue: { annualAmount: 40.7, firstSaleLagMonths: 11 },
  basis:
    "Legal adult cannabis sales pay the state $40.7 a resident a year in cannabis excise and sales tax, the 2025 average of the ten states with stores open three years or more (Marijuana Policy Project), from the first store opening 11 months after the law takes effect; a law ending legal sales ends it the day it takes effect.",
} as const;
export const TAX_QUESTION_EFFECTS: readonly {
  readonly questionKey: string;
  readonly source: BudgetSource;
  readonly toYes: number | null;
  readonly toNo: number | null;
  readonly levels?: readonly BudgetLevel[];
  readonly perResidentRevenue?: {
    readonly annualAmount: number;
    readonly firstSaleLagMonths: number;
  };
  readonly basis: string;
}[] = [
  {
    questionKey: "us-policy-positions:fiscal.adopt-income-tax",
    source: "individualIncomeTax",
    toYes: null,
    toNo: -1,
    basis:
      "A repeal ends the tax, so the state collects none. An adopted tax collects through recorded paycheck withholding using its operative terms; no population-based revenue level is inferred.",
  },
  CANNABIS_TAX_EFFECT,
  {
    questionKey: MILEAGE_FEE_QUESTION,
    source: "selectiveSalesTaxes",
    levels: ["state"],
    toYes: null,
    toNo: null,
    basis: ROAD_CHARGE_BASIS,
  },
  {
    questionKey: "us-policy-positions:fiscal.cap-property-tax-growth",
    source: "propertyTax",
    toYes: null,
    toNo: null,
    basis: "Not researched: a cap slows growth rather than moving a level.",
  },
];
