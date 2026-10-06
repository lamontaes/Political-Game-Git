import taxTerms from "../../../../../data/laws/budget-and-taxes/lw06-county-city-tax-terms.json" with { type: "json" };
import type {
  AnyLawConsequenceKindRegistration,
  LawConsequenceRow,
} from "../../../law-consequence-types";
import { TAX_ACTION, TAX_AMOUNT, TAX_PREDICATE, TAX_SELECTOR } from "../../tax";

/** This module owns row data only; the existing tax kind remains its sole writer. */
export const registrations: readonly AnyLawConsequenceKindRegistration[] = [];

export type TaxTermQuestionKey =
  | "county.payroll-tax-terms"
  | "county.corporate-tax-terms"
  | "city.income-tax-terms"
  | "city.sales-tax-terms";

const terms = taxTerms as readonly {
  readonly questionKey: TaxTermQuestionKey;
  readonly id: string;
  readonly tax: string;
}[];

export const LW06_TAX_TERM_QUESTION_KEYS: readonly TaxTermQuestionKey[] =
  terms.map((term) => term.questionKey);

function rowFor(term: (typeof terms)[number]): LawConsequenceRow {
  return {
    id: term.id,
    kind: "tax",
    when: "assessment",
    who: {
      selector: TAX_SELECTOR,
      predicates: [{ capability: TAX_PREDICATE, parameters: {} }],
    },
    what: TAX_ACTION,
    amount: { op: "record", key: TAX_AMOUNT, unit: "minor" },
    conditions: [],
    lag: { days: 0, sourceIds: [] },
    onRepeal: "preserve-completed",
    evidence: {
      sourceIds: [
        "data/laws/budget-and-taxes/lw06-county-city-tax-terms.json",
        "src/simulation/tax-law-term-binding.ts",
        "src/simulation/tax-policy.ts",
      ],
      population:
        "A named person with an actual saved taxable occurrence covered by this government's adopted tax terms.",
      scope: `Only ${term.tax} terms that the dated legal-power and typed-term binding establishes for the actual county or city.`,
      why: "The existing tax consequence writer applies saved adopted terms to a recorded taxable occurrence and attributes the assessment to its named payer.",
      uncertainty:
        "This row supplies no tax rate, taxable base, power or amount. Unsupported authority or terms remain unavailable and produce no assessment.",
    },
  };
}

export const LW06_TAX_TERM_CONSEQUENCE_ROWS: Readonly<
  Record<TaxTermQuestionKey, LawConsequenceRow>
> = Object.fromEntries(
  terms.map((term) => [term.questionKey, rowFor(term)]),
) as Record<TaxTermQuestionKey, LawConsequenceRow>;
