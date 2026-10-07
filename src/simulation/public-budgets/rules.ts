import type { BudgetLawName } from "./store";
import type { LawAmountExpression } from "../law-consequence-types";
import stateLocalFinances from "../../../data/research/money/state-local-finances-2022.json" with { type: "json" };
import {
  MILEAGE_FEE_QUESTION,
  ROAD_CHARGE_BASIS,
} from "./road-usage-charge-constants";
import type { BudgetLevel, BudgetProgram, BudgetSource } from "./store";

/** Should a fixed share of revenue be dedicated to parks and recreation? */
export const PARKS_DEDICATION_QUESTION =
  "us-policy-positions:civil-family-community.dedicated-parks-funding";

/** Should tax incentives offered to attract employers be capped and disclosed? */
export const INCENTIVE_CAP_QUESTION =
  "us-policy-positions:business-commerce.cap-development-incentives";

/**
 * The share of a state's local-government spending on each program that its
 * county governments carry, and the share its city governments carry, per
 * resident. The rest belongs to governments the world does not hold yet
 * (school districts, special districts, townships). ESTIMATED FROM AVERAGE:
 * these national program shares apply to the 50 states and D.C. represented
 * in the game's Census 2022 local-government column; a government's opening
 * note identifies the estimate and its own population basis.
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
 * How a county's or city's revenue splits by source. ESTIMATED FROM AVERAGE:
 * use its state's recorded Census 2022 local-government mix and scale it to
 * this government's spending. Where Census has no place row, opening.ts uses
 * the population-weighted mix of the 50 states and D.C.
 */
export const LOCAL_REVENUE_RULE =
  "ESTIMATED FROM AVERAGE: local revenue by source follows its state's Census 2022 local-government mix, scaled to this government's spending; where Census has no place row, it uses the population-weighted mix of the 50 states and D.C.";

/**
 * Pension opening. ESTIMATED FROM AVERAGE: a 7% assumed return and 30-year
 * amortization apply across governments whose plans appear in the game's
 * 50-state-and-D.C. Public Plans Database extracts. The liability's size
 * against spending is measured (`openingLiabilityToSpending` in `opening.ts`),
 * and each government's normal cost and benefits paid are its own plans'
 * (`pensionFlows`).
 */
export const PENSION = {
  assumedReturn: 0.07,
  amortizationYears: 30,
} as const;

/**
 * How each source moves with the economy. ESTIMATED FROM AVERAGE across the
 * 50 states and D.C.: own-source revenue moves one to one with nominal output
 * (real output times prices), while recorded intergovernmental aid remains at
 * its adopted amount.
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
/**
 * What legal adult cannabis sales pay a state in taxes, per resident a year.
 *
 * The plain average of the ten states whose adult-use stores had been open
 * at least three full years by 2025, each state's 2025 cannabis excise and
 * state sales tax on cannabis over its population (Marijuana Policy Project,
 * "Cannabis Tax Revenue in States that Regulate Cannabis for Adult Use",
 * read September 29, 2026): Colorado $36.8, Washington $62.0, Oregon $34.2,
 * Nevada $49.3, California $26.7, Massachusetts $40.9, Michigan $50.2,
 * Illinois $43.5, Maine $31.0 and Arizona $32.5. Medical cannabis, license
 * fees and local cannabis taxes are left out, as the source leaves them out.
 */
/**
 * Months from a legalization law taking effect to its first store opening:
 * the average of Colorado 13, Washington 19, Michigan 12, Illinois 0, New
 * York 21 and Missouri 2 (Build 22's reading of each state's first sale). A
 * law that ends legal sales closes the stores the day it takes effect.
 */
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
    // Adoption collections come from actual wage-base assessments/payments.
    toYes: null,
    // A repeal ends the tax: a state with no income tax collects none.
    toNo: -1,
    basis:
      "A repeal ends the tax, so the state collects none. An adopted tax collects through recorded paycheck withholding using its operative terms; no population-based revenue level is inferred.",
  },
  CANNABIS_TAX_EFFECT,
  {
    questionKey: MILEAGE_FEE_QUESTION,
    source: "selectiveSalesTaxes",
    levels: ["state"],
    // A share that grows each year the fuel tax erodes, not one size:
    // `road-usage-charge.ts`.
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

/**
 * What a state's law on a question costs it to carry out, when the law moves
 * from the answer the state began with: `toYes` dollars a resident a year when
 * a "no" becomes "yes", `toNo` when a "yes" becomes "no", spent on `program`
 * each month the law is in force. Null: not researched, so that change spends
 * nothing. Each size is enacted bills' fiscal notes, each over its state's
 * 2023 residents, averaged: ESTIMATED FROM AVERAGE until more are read. The
 * cost sits outside the adopted programs, so a budget pays it on top and a
 * balanced-budget law finds the money by cutting the rest.
 * research: law-enforcement-costs.
 */
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
    // New York's Raise the Age aid, $250 million each state fiscal year since
    // 2021 (Office of the State Comptroller, 2025), over 19,867,248 residents.
    // A state that lowers the age again stops paying it.
    toYes: 250_000_000 / 19_867_248,
    toNo: -250_000_000 / 19_867_248,
    basis:
      "ESTIMATED FROM AVERAGE: New York's Raise the Age appropriation, $250 million a year (Office of the State Comptroller, 2025), per New York resident.",
  },
  {
    questionKey: PARKS_DEDICATION_QUESTION,
    program: "parks",
    levels: ["state"],
    // What a dedicated tax adds to the state's parks line, from the two
    // constitutions Research 1 read: Missouri's 0.05% of sales (the parks half
    // of its 0.1% tax, Const. art. IV, sec. 47) yields $53.9 million a year
    // over 6,208,038 residents ($8.68), and Minnesota's 14.25% of its
    // 0.375% Legacy sales tax (Const. art. XI, sec. 15) yields $56.6 million
    // over 5,753,048 ($9.84). Both are fiscal 2022 sales tax at the state's
    // rate, over the Census file's 2023 residents; the spread is $8.68 to
    // $9.84.
    toYes: (53_900_000 / 6_208_038 + 56_600_000 / 5_753_048) / 2,
    // A repeal ends the dedication, and the yield with it.
    toNo: -(53_900_000 / 6_208_038 + 56_600_000 / 5_753_048) / 2,
    basis:
      "ESTIMATED FROM AVERAGE: Missouri's ($53.9 million a year) and Minnesota's ($56.6 million a year) dedicated sales tax for parks, read from their constitutions by Research 1 and worked out on fiscal 2022 state sales tax (Census Bureau), each over the state's 2023 residents, averaged. Oregon, Texas, Florida and Michigan dedicate other bases the Census table does not carry, so they are not sized separately.",
  },
];

const NATIONAL_DEBT = stateLocalFinances.places.US.dollars;

/**
 * The interest rate a government opens with when its own Census column
 * shows no debt or no interest: ESTIMATED FROM AVERAGE, the national
 * effective rate for its level, interest paid on debt over debt outstanding
 * (Census, State and Local Government Finances 2022, United States total;
 * `data/research/money/state-local-finances-2022.json`). About 3.6% for
 * states and 3.9% for local governments, against the 4% set by hand before.
 */
export const DEFAULT_STATE_INTEREST_RATE =
  NATIONAL_DEBT.state.interestOnDebt / NATIONAL_DEBT.state.debtOutstanding;
export const DEFAULT_LOCAL_INTEREST_RATE =
  NATIONAL_DEBT.local.interestOnDebt / NATIONAL_DEBT.local.debtOutstanding;

/** Allocation of a saved annual obligation through the shared amount evaluator. */
export const BUDGET_OBLIGATION_AMOUNT: LawAmountExpression = {
  op: "product",
  left: { op: "record", key: "obligation", unit: "dollars/year" },
  right: {
    op: "maximum",
    operands: [
      { op: "record", key: "paid-share", unit: "ratio" },
      { op: "term", key: "required-share", unit: "ratio" },
    ],
  },
};

/** Catalog numeric allocation inputs; the legacy full-contribution question means one whole share. */
export const BUDGET_ALLOCATION_TERM_KEYS: Readonly<
  Partial<Record<BudgetLawName, string>>
> = {
  pensions: "contribution",
};
