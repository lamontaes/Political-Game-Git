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
 * spending, the assumed return, and the amortization period for the unfunded
 * part. PLACEHOLDER, research: public-pension-funding-by-state. Each
 * government's normal cost and benefits paid are its own plans'
 * (`pensionFlows` in `pension-share.ts`).
 */
export const PENSION = {
  liabilityToSpending: 1.2,
  assumedReturn: 0.07,
  amortizationYears: 30,
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
 * The revenue change a state's tax law makes when it moves from the answer
 * the state began with: `toYes` when a "no" becomes "yes", `toNo` when a
 * "yes" becomes "no", each as a share of the source. Null: not researched
 * yet, so that change moves no money. Each size is one state's fiscal note
 * divided by that state's own collections in the Census Bureau's 2022 state
 * finances (`data/research/money/state-local-finances-2022.json`), the base
 * the budget opens from; one note each, so ESTIMATED FROM AVERAGE until more
 * are read. research: tax-question-revenue-effects.
 */
export const TAX_QUESTION_EFFECTS: readonly {
  readonly questionKey: string;
  readonly source: BudgetSource;
  readonly toYes: number | null;
  readonly toNo: number | null;
  readonly basis: string;
}[] = [
  {
    questionKey: "us-policy-positions:fiscal.adopt-income-tax",
    source: "individualIncomeTax",
    toYes: null,
    // A repeal ends the tax: a state with no income tax collects none.
    toNo: -1,
    basis:
      "A repeal ends the tax, so the state collects none; adopting one needs a level, not a share, and is not researched.",
  },
  {
    questionKey: "us-policy-positions:fiscal.graduated-income-tax",
    source: "individualIncomeTax",
    // Illinois' 2020 graduated-rate amendment: the $3.4 billion a year the
    // rates passed with it were estimated to raise, over Illinois' $22.70
    // billion (2022).
    toYes: 3.4 / 22.7,
    // Iowa's 2024 SF 2442, which replaced the brackets due in 2025 with a
    // flat 3.8% rate: $605.3 million in its first full year (FY 2026, Iowa
    // Legislative Services Agency fiscal note), over Iowa's $4.97 billion.
    toNo: -0.6053 / 4.97,
    basis:
      "Illinois 2020 graduated-rate estimate ($3.4 billion a year) and Iowa SF 2442 fiscal note, final action ($605.3 million in FY 2026), each over the state's 2022 individual income tax collections (Census Bureau).",
  },
  {
    questionKey: "us-policy-positions:fiscal.exempt-groceries-from-sales-tax",
    source: "generalSalesTax",
    toYes: null,
    toNo: null,
    basis: "Not researched.",
  },
  {
    questionKey: "us-policy-positions:fiscal.cap-property-tax-growth",
    source: "propertyTax",
    toYes: null,
    toNo: null,
    basis: "Not researched: a cap slows growth rather than moving a level.",
  },
];

/** An interest rate for a government whose research shows no debt. */
export const DEFAULT_INTEREST_RATE = 0.04;
