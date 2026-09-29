import type { BudgetProgram, BudgetSource } from "./store";

/**
 * Every number the budgets use that research has not supplied yet. Each is a
 * PLACEHOLDER naming the research question filed for it
 * (docs/research/requests/), and each is shown on the government's opening
 * notes or adjustment so a report can say which figures are stand-ins.
 */

/**
 * The share of a state's local-government spending on each program that its
 * county governments carry, and the share its city governments carry, per
 * resident. The rest belongs to governments the world does not hold yet
 * (school districts, special districts, townships). PLACEHOLDER until Census
 * finances by type of government are read, research:
 * local-government-finances-by-type.
 */
export const LOCAL_PROGRAM_SPLIT: Readonly<
  Partial<
    Record<BudgetProgram, { readonly county: number; readonly city: number }>
  >
> = {
  schools: { county: 0.05, city: 0.08 },
  higherEducation: { county: 0.3, city: 0.05 },
  welfareAndMedicaid: { county: 0.7, city: 0.2 },
  healthAndHospitals: { county: 0.45, city: 0.15 },
  highways: { county: 0.4, city: 0.4 },
  police: { county: 0.3, city: 0.65 },
  fire: { county: 0.15, city: 0.6 },
  corrections: { county: 0.85, city: 0.1 },
  parks: { county: 0.2, city: 0.6 },
  housing: { county: 0.2, city: 0.5 },
  naturalResources: { county: 0.4, city: 0.1 },
  administration: { county: 0.4, city: 0.4 },
  otherPrograms: { county: 0.35, city: 0.4 },
  interest: { county: 0.25, city: 0.35 },
};

/**
 * How a county's or city's revenue splits by source: its state's local mix,
 * scaled to the government's own spending. PLACEHOLDER, research:
 * local-government-finances-by-type.
 */
export const LOCAL_REVENUE_RULE =
  "local revenue by source follows the state's local mix, scaled to this government's spending (PLACEHOLDER, research: local-government-finances-by-type)";

/**
 * How far each opening amount is drawn around its research figure: one
 * log-normal draw per line with this standard deviation. PLACEHOLDER, a game
 * profile choice pending research: local-government-finances-by-type.
 */
export const OPENING_DRAW_SD = 0.05;

/**
 * Pension opening. The actuarial liability as a multiple of a year's general
 * spending, the funded ratio, the normal cost and benefits paid as shares of
 * the liability, the assumed return, and the amortization period for the
 * unfunded part. PLACEHOLDER, research: public-pension-funding-by-state.
 */
export const PENSION = {
  liabilityToSpending: 1.2,
  fundedRatio: 0.75,
  normalCostShare: 0.02,
  benefitShare: 0.08,
  assumedReturn: 0.07,
  amortizationYears: 30,
  /**
   * The share of the actuarial contribution paid where no law requires the
   * full amount. PLACEHOLDER, research: public-pension-funding-by-state.
   */
  paidShareWithoutLaw: 0.8,
} as const;

/**
 * Minimum reserve law: the floor as a share of a year's spending, and the
 * most the adopted budget sets aside toward it in one year. PLACEHOLDER,
 * research: state-balanced-budget-and-reserve-rules.
 */
export const RESERVE = {
  floorShareOfSpending: 0.05,
  yearlyDepositShareOfSpending: 0.01,
} as const;

/**
 * Balanced-budget law, mid-year: the first round of across-the-board cuts is
 * at most this share of the year's remaining cuttable spending; the reserve
 * is drawn next, then cuts close the rest. PLACEHOLDER order and size,
 * research: state-balanced-budget-and-reserve-rules.
 */
export const FIRST_CUT_SHARE = 0.03;

/**
 * How each source moves with the economy: one to one with nominal output
 * (real output times prices). PLACEHOLDER, research:
 * tax-revenue-response-to-economy.
 */
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

/**
 * The revenue change each yes-or-no tax question makes, as a share of its
 * source. Null: not researched yet, so an answer moves no money and the
 * budget says so. research: tax-question-revenue-effects.
 */
export const TAX_QUESTION_EFFECTS: readonly {
  readonly questionKey: string;
  readonly source: BudgetSource;
  readonly shareChange: number | null;
}[] = [
  {
    questionKey: "us-policy-positions:fiscal.adopt-income-tax",
    source: "individualIncomeTax",
    shareChange: null,
  },
  {
    questionKey: "us-policy-positions:fiscal.graduated-income-tax",
    source: "individualIncomeTax",
    shareChange: null,
  },
  {
    questionKey: "us-policy-positions:fiscal.exempt-groceries-from-sales-tax",
    source: "generalSalesTax",
    shareChange: null,
  },
  {
    questionKey: "us-policy-positions:fiscal.cap-property-tax-growth",
    source: "propertyTax",
    shareChange: null,
  },
];

/** An interest rate for a government whose research shows no debt. */
export const DEFAULT_INTEREST_RATE = 0.04;
