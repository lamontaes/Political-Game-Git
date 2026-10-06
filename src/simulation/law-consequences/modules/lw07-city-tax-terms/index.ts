import type {
  AnyLawConsequenceKindRegistration,
  LawConsequenceRow,
} from "../../../law-consequence-types";

/**
 * City tax-term questions share the existing typed tax assessment contract.
 * Amounts come from an adopted proposal applied to a saved taxable occurrence;
 * this batch never supplies a rate, base, city authority, or estimated payer.
 *
 * The rows are data only until the shared tax-term binder admits city power and
 * the policy pack attaches them to these questions. The `tax` kind already has
 * a canonical registration, so this module must not register a second owner.
 */
export const LW07_CITY_TAX_TERM_ROWS: readonly LawConsequenceRow[] = [
  {
    id: "tax:city:property:recorded-base",
    kind: "tax",
    when: "assessment",
    who: {
      selector: "recorded-tax-base-payer",
      predicates: [
        { capability: "has-operative-typed-tax-policy", parameters: {} },
      ],
    },
    what: "assess-enacted-tax-base",
    amount: {
      op: "record",
      key: "enacted-tax-assessment",
      unit: "minor",
    },
    conditions: [],
    lag: { days: 0, sourceIds: [] },
    onRepeal: "preserve-completed",
    evidence: {
      sourceIds: [
        "src/simulation/law-consequences/tax.ts",
        "src/simulation/tax-policy.ts",
        "src/simulation/tax-law-term-binding.ts",
      ],
      population: "The named payer of a saved taxable occurrence.",
      scope:
        "An adopted city property-tax proposal and its exact saved taxable base, where the shared authority and term binder permits the city question.",
      why: "The shared typed tax handler derives the assessment from adopted terms and the saved base.",
      uncertainty:
        "Current main has no city property-tax authority/base binding in the shared tax path; this row does not estimate rates, assessments, or owners.",
    },
  },
  {
    id: "tax:city:payroll:recorded-base",
    kind: "tax",
    when: "assessment",
    who: {
      selector: "recorded-tax-base-payer",
      predicates: [
        { capability: "has-operative-typed-tax-policy", parameters: {} },
      ],
    },
    what: "assess-enacted-tax-base",
    amount: {
      op: "record",
      key: "enacted-tax-assessment",
      unit: "minor",
    },
    conditions: [],
    lag: { days: 0, sourceIds: [] },
    onRepeal: "preserve-completed",
    evidence: {
      sourceIds: [
        "src/simulation/law-consequences/tax.ts",
        "src/simulation/tax-policy.ts",
        "src/simulation/tax-law-term-binding.ts",
      ],
      population: "The named payer of a saved taxable occurrence.",
      scope:
        "An adopted city payroll-tax proposal and its exact saved taxable base, where the shared authority and term binder permits the city question.",
      why: "The shared typed tax handler derives the assessment from adopted terms and the saved base.",
      uncertainty:
        "Current main has no city payroll-tax authority/binding in the shared tax path; existing paycheck records do not establish a city tax rate.",
    },
  },
  {
    id: "tax:city:corporate:recorded-base",
    kind: "tax",
    when: "assessment",
    who: {
      selector: "recorded-tax-base-payer",
      predicates: [
        { capability: "has-operative-typed-tax-policy", parameters: {} },
      ],
    },
    what: "assess-enacted-tax-base",
    amount: {
      op: "record",
      key: "enacted-tax-assessment",
      unit: "minor",
    },
    conditions: [],
    lag: { days: 0, sourceIds: [] },
    onRepeal: "preserve-completed",
    evidence: {
      sourceIds: [
        "src/simulation/law-consequences/tax.ts",
        "src/simulation/tax-policy.ts",
        "src/simulation/tax-law-term-binding.ts",
      ],
      population: "The named payer of a saved taxable occurrence.",
      scope:
        "An adopted city corporate-income-tax proposal and its exact saved taxable base, where the shared authority and term binder permits the city question.",
      why: "The shared typed tax handler derives the assessment from adopted terms and the saved base.",
      uncertainty:
        "Current main has no city corporate-income-tax authority or organization-to-person incidence writer; this row invents neither company profits nor owner shares.",
    },
  },
];

/** The canonical `tax` registration is owned by the shared tax module. */
export const registrations: readonly AnyLawConsequenceKindRegistration[] = [];
