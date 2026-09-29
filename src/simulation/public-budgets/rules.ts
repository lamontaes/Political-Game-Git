import { CANNABIS_TAX_BASIS } from "./cannabis-sales-tax";
import type { BudgetLevel, BudgetProgram, BudgetSource } from "./store";

/** Should tax incentives offered to attract employers be capped and disclosed? */
export const INCENTIVE_CAP_QUESTION =
  "us-policy-positions:business-commerce.cap-development-incentives";

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
 * The revenue change a tax law makes when it moves from the answer the
 * government began with: `toYes` when a "no" becomes "yes", `toNo` when a
 * "yes" becomes "no", each as a share of the source. Null: not researched
 * yet, so that change moves no money. `levels` names the governments whose
 * revenue it moves (a state by default); a county or city reads the law in
 * force where it sits, its own ordinance or its state's law. Each size is one
 * fiscal note divided by the collections in the Census Bureau's 2022 state
 * and local finances (`data/research/money/state-local-finances-2022.json`),
 * the base the budget opens from; one note each, so ESTIMATED FROM AVERAGE
 * until more are read. research: tax-question-revenue-effects.
 */
export const TAX_QUESTION_EFFECTS: readonly {
  readonly questionKey: string;
  readonly source: BudgetSource;
  readonly toYes: number | null;
  readonly toNo: number | null;
  readonly levels?: readonly BudgetLevel[];
  readonly basis: string;
}[] = [
  {
    questionKey: "us-policy-positions:fiscal.adopt-income-tax",
    source: "individualIncomeTax",
    // Adopting one needs a level, not a share: `income-tax-adoption.ts`.
    toYes: null,
    // A repeal ends the tax: a state with no income tax collects none.
    toNo: -1,
    basis:
      "A repeal ends the tax, so the state collects none. An adopted tax collects the per-resident average of the states that tax wages, moved by the state's median earnings (income-tax-adoption.ts, ESTIMATED FROM AVERAGE).",
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
    // Oklahoma's HB 1955 (2024) ended the state's 4.5% sales tax on
    // groceries: $370.3 million a year in the Oklahoma Tax Commission's fiscal
    // impact statement, over Oklahoma's $3.57 billion of general sales tax
    // (Census Bureau 2022 per resident times 2024 population), 10.4% of it.
    toYes: -0.3703 / 3.5735,
    // Taxing groceries again where they are exempt adds the same base back:
    // the 10.4% share over the 89.6% left.
    toNo: 0.3703 / (3.5735 - 0.3703),
    basis:
      "Oklahoma HB 1955 (2024) fiscal impact statement, Oklahoma Tax Commission: $370.3 million a year, over Oklahoma's 2022 general sales tax (Census Bureau) at 2024 population. A state that taxed groceries at a reduced rate loses less; the full-rate example is used for every state until each state's grocery base is read.",
  },
  {
    questionKey:
      "us-policy-positions:business-commerce.legalize-cannabis-sales",
    source: "selectiveSalesTaxes",
    // A level per resident, not a share: `cannabis-sales-tax.ts`.
    toYes: null,
    toNo: null,
    basis: CANNABIS_TAX_BASIS,
  },
  {
    questionKey: "us-policy-positions:fiscal.cap-property-tax-growth",
    source: "propertyTax",
    toYes: null,
    toNo: null,
    basis: "Not researched: a cap slows growth rather than moving a level.",
  },
  {
    questionKey: INCENTIVE_CAP_QUESTION,
    source: "corporateIncomeTax",
    // California's 2026 permanent business credit limitation (the greater of
    // $5 million or half of a corporation's tax before credits): $1.7 to
    // $1.8 billion a year from 2027-28 (Legislative Analyst's Office), over
    // California's $46.01 billion corporate income tax (2022).
    toYes: 1.75 / 46.01,
    // Lifting a cap gives the same credits back.
    toNo: -1.75 / 46.01,
    basis:
      "California 2026-27 May Revision business credit limitation, $1.7-1.8 billion a year (LAO, The 2026-27 Budget: Permanent Business Credit Limitation), over California's 2022 corporate income tax (Census Bureau); ESTIMATED FROM AVERAGE, one state's note.",
  },
  {
    questionKey: INCENTIVE_CAP_QUESTION,
    source: "propertyTax",
    // Local incentives are mostly property tax abatements: governments
    // reported $93 billion abated over 2017-2022 under GASB 77 (Good Jobs
    // First), $15.5 billion a year, against $649.03 billion of state and
    // local property tax (2022). A cap keeps about half of what it caps, the
    // share California's cap takes back of its $3.5 billion a year in
    // research credits.
    toYes: ((1.75 / 3.5) * 15.5) / 649.03,
    toNo: -((1.75 / 3.5) * 15.5) / 649.03,
    levels: ["county", "city"],
    basis:
      "GASB 77 abatement disclosures, $93 billion over 2017-2022 (Good Jobs First, Hidden Costs No More, 2024), over 2022 state and local property tax (Census Bureau), times the half of credits California's 2026 cap takes back (LAO); ESTIMATED FROM AVERAGE.",
  },
];

/** An interest rate for a government whose research shows no debt. */
export const DEFAULT_INTEREST_RATE = 0.04;
