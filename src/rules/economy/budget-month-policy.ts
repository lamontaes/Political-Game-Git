/** Frozen native source elasticities and law-spending catalog; each retained numeric contract is separately frozen in legacy-parameters. */
import type {
  BudgetSource,
  BudgetProgram,
  BudgetLevel,
} from "../../simulation/public-budgets/store";
export const PARKS_DEDICATION_QUESTION =
  "us-policy-positions:civil-family-community.dedicated-parks-funding";
// stopgapId: "economy.monthly-budget-elasticity"
export const ECONOMY_ELASTICITY: Readonly<Record<BudgetSource, number>> = {
  individualIncomeTax: 1,
  corporateIncomeTax: 1,
  generalSalesTax: 1,
  selectiveSalesTaxes: 1,
  propertyTax: 1,
  vehicleAndOtherTaxes: 1,
  chargesAndFees: 1,
  miscellaneous: 1,
  federalAid: 0,
  intergovernmental: 0,
  sourceUnknown: 1,
};
// stopgapId: "economy.monthly-law-spending-cohort"
export const SPENDING_QUESTION_EFFECTS: readonly {
  readonly questionKey: string;
  readonly program: BudgetProgram;
  readonly toYes: number | null;
  readonly toNo: number | null;
  readonly levels?: readonly BudgetLevel[];
  readonly basis: string;
}[] = [
  {
    questionKey:
      "us-policy-positions:justice-public-safety.raise-juvenile-court-age",
    program: "corrections",
    levels: ["state"],
    toYes: 250000000 / 19867248,
    toNo: -250000000 / 19867248,
    basis:
      "ESTIMATED FROM AVERAGE: New York's Raise the Age appropriation, $250 million a year (Office of the State Comptroller, 2025), per New York resident.",
  },
  {
    questionKey: PARKS_DEDICATION_QUESTION,
    program: "parks",
    levels: ["state"],
    toYes: (53900000 / 6208038 + 56600000 / 5753048) / 2,
    toNo: -(53900000 / 6208038 + 56600000 / 5753048) / 2,
    basis:
      "ESTIMATED FROM AVERAGE: Missouri's ($53.9 million a year) and Minnesota's ($56.6 million a year) dedicated sales tax for parks, read from their constitutions by Research 1 and worked out on fiscal 2022 state sales tax (Census Bureau), each over the state's 2023 residents, averaged. Oregon, Texas, Florida and Michigan dedicate other bases the Census table does not carry, so they are not sized separately.",
  },
];
