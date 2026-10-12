import stateLocalFinances from "../../../data/research/money/state-local-finances-2022.json";
/** Retained necessary budget dimensions, allocation expressions and policy constants; no new budget rule is introduced. */
import type { BudgetLawName } from "../../simulation/public-budgets/store";
import type { LawAmountExpression } from "../../simulation/law-consequence-types";
export const BUDGET_SOURCES = [
  "individualIncomeTax",
  "corporateIncomeTax",
  "generalSalesTax",
  "selectiveSalesTaxes",
  "propertyTax",
  "vehicleAndOtherTaxes",
  "chargesAndFees",
  "miscellaneous",
  "federalAid",
  "intergovernmental",
  "sourceUnknown",
] as const;
export const BUDGET_PROGRAMS = [
  "schools",
  "higherEducation",
  "welfareAndMedicaid",
  "healthAndHospitals",
  "highways",
  "transit",
  "police",
  "fire",
  "corrections",
  "parks",
  "housing",
  "naturalResources",
  "administration",
  "otherPrograms",
  "localAid",
  "pensionContribution",
  "interest",
  "programUnknown",
] as const;
export type BudgetProgram = (typeof BUDGET_PROGRAMS)[number];
export const PROTECTED_PROGRAMS: ReadonlySet<BudgetProgram> = new Set([
  "interest",
  "pensionContribution",
]);
export const BUDGET_LAW_KEYS = {
  balanced: "us-policy-positions:fiscal.balanced-operating-budget",
  reserve: "us-policy-positions:fiscal.minimum-reserve-balance",
  pensions: "us-policy-positions:fiscal.fund-pensions-to-schedule",
} as const;
export function sum(values: readonly number[]): number {
  return values.reduce((total, value) => total + value, 0);
}
// stopgapId: "economy.budget-local-program-split"
export const LOCAL_PROGRAM_SPLIT: Readonly<
  Partial<
    Record<
      BudgetProgram,
      {
        readonly county: number;
        readonly city: number;
      }
    >
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
export const LOCAL_REVENUE_RULE =
  "ESTIMATED FROM AVERAGE: local revenue by source follows its state's Census 2022 local-government mix, scaled to this government's spending; where Census has no place row, it uses the population-weighted mix of the 50 states and D.C.";
// stopgapId: "economy.budget-pension-assumptions"
export const PENSION = {
  assumedReturn: 0.07,
  amortizationYears: 30,
} as const;
// stopgapId: "economy.budget-interest-source-fallback"
const NATIONAL_DEBT = stateLocalFinances.places.US.dollars;
export const DEFAULT_STATE_INTEREST_RATE =
  NATIONAL_DEBT.state.interestOnDebt / NATIONAL_DEBT.state.debtOutstanding;
export const DEFAULT_LOCAL_INTEREST_RATE =
  NATIONAL_DEBT.local.interestOnDebt / NATIONAL_DEBT.local.debtOutstanding;
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
export const BUDGET_ALLOCATION_TERM_KEYS: Readonly<
  Partial<Record<BudgetLawName, string>>
> = {
  pensions: "contribution",
};
export const STATUTE_EFFECTIVE_DEFAULT_DAYS = 90;
