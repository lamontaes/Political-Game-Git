import powers from "../../data/research/powers-catalog/catalog.json" with { type: "json" };
import type { LawConsequenceRow } from "./law-consequence-types";
import type { PolicyPack, PolicyPropositionRow } from "./policy-packs";
import { TAX_LAW_TERM_KEYS } from "./tax-law-term-keys";

/** Questions name decisions; they grant no taxing power and set no rate or base. */
export const TAX_QUESTION_FAMILIES = [
  {
    key: "income",
    name: "personal income",
    dial: "income-tax",
    issue: "fiscal.income-tax",
    federalIssue: "tax.income-tax",
  },
  {
    key: "sales",
    name: "sales",
    dial: "sales-tax",
    issue: "fiscal.sales-tax",
    federalIssue: "tax.employment-excise-estate",
  },
  {
    key: "property",
    name: "property",
    dial: "property-tax",
    issue: "fiscal.property-tax",
    federalIssue: "tax.income-tax",
  },
  {
    key: "excise",
    name: "excise",
    dial: "excise-and-fees",
    issue: "fiscal.excise-taxes",
    federalIssue: "tax.employment-excise-estate",
  },
  {
    key: "payroll",
    name: "payroll",
    dial: "payroll-tax",
    issue: "fiscal.income-tax",
    federalIssue: "tax.employment-excise-estate",
  },
  {
    key: "corporate",
    name: "corporate income",
    dial: "income-tax",
    issue: "fiscal.income-tax",
    federalIssue: "tax.corporate-tax",
  },
] as const;

export const TAX_QUESTION_LEVELS = [
  { key: "federal", name: "federal government" },
  { key: "state", name: "state" },
  { key: "county", name: "county" },
  { key: "city", name: "city" },
] as const;

const FEDERAL_TAX_TERM_CONSEQUENCE_FAMILIES = new Set([
  "income",
  "sales",
  "payroll",
  "corporate",
]);

/** The county and city questions a council may decide, where the state's own
 * rule is checked at filing by the shared local tax lookup. */
function localTaxQuestion(levelKey: string, familyKey: string): boolean {
  return (
    (levelKey === "county" || levelKey === "city") &&
    ["property", "sales", "payroll", "corporate"].includes(familyKey)
  );
}

/** The state's own sales, property and payroll questions: read through the
 * shared binder against the powers catalog's state row. */
function stateTaxQuestion(levelKey: string, familyKey: string): boolean {
  return (
    levelKey === "state" && ["property", "sales", "payroll"].includes(familyKey)
  );
}

/** LW-05 rows are recorded now; the shared binder must still admit these
 * authority families before they can resolve an assessment. */
function lw05TaxQuestion(levelKey: string, familyKey: string): boolean {
  return (
    (levelKey === "state" && familyKey === "corporate") ||
    (levelKey === "county" && familyKey === "income")
  );
}

function taxTermConsequenceRow(
  levelKey: string,
  familyKey: string,
): LawConsequenceRow | undefined {
  // Federal and local terms are read back through the shared binder; only the
  // power evidence differs, and local power is the state's own rule, estimated
  // where the state's row was not read.
  const federalTerm =
    (levelKey === "federal" &&
      FEDERAL_TAX_TERM_CONSEQUENCE_FAMILIES.has(familyKey)) ||
    localTaxQuestion(levelKey, familyKey) ||
    stateTaxQuestion(levelKey, familyKey);
  const lw05Term = lw05TaxQuestion(levelKey, familyKey);
  const stateIncomeTerm = levelKey === "state" && familyKey === "income";
  const excise = familyKey === "excise";
  if (!federalTerm && !lw05Term && !excise && !stateIncomeTerm)
    return undefined;
  if (stateIncomeTerm) {
    return {
      id: "tax:state:income:saved-statutory",
      kind: "tax",
      when: "assessment",
      who: { selector: "recorded-tax-base-payer", predicates: [] },
      what: "attribute-saved-statutory-tax",
      attributes: {
        level: "state-statute",
        taxKey: "{authority}:wage-income-tax",
      },
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
          "src/simulation/state-income-tax-law.ts",
          "src/simulation/policy-pack-registry.ts",
          "src/simulation/law-consequences/tax.ts",
        ],
        population: "The named payer on a saved state wage-tax liability.",
        scope:
          "An actual operative state income-tax law already recorded on the saved wage-tax liability.",
        why: "The existing statutory writer calculates the wage tax; this row only attributes that saved result to the operative tax-terms law.",
        uncertainty:
          "The row supplies no rate, wage base or tax amount; missing law lineage remains unavailable.",
      },
    };
  }
  return {
    id: `tax:${levelKey}:${familyKey}:recorded-base`,
    kind: "tax" as const,
    when: "assessment" as const,
    who: {
      selector: "recorded-tax-base-payer",
      predicates: [
        {
          capability: "has-operative-typed-tax-policy",
          parameters: {},
        },
      ],
    },
    what: "assess-enacted-tax-base",
    amount: {
      op: "record" as const,
      key: "enacted-tax-assessment",
      unit: "minor" as const,
    },
    conditions: [],
    lag: { days: 0, sourceIds: [] },
    onRepeal: "preserve-completed" as const,
    evidence: {
      sourceIds: [
        "src/simulation/tax-policy.ts",
        ...(federalTerm || lw05Term
          ? ["src/simulation/tax-law-term-binding.ts"]
          : []),
        ...(localTaxQuestion(levelKey, familyKey)
          ? ["src/simulation/local-tax-authority.ts"]
          : []),
        ...(stateTaxQuestion(levelKey, familyKey)
          ? ["src/simulation/state-tax-authority.ts"]
          : []),
        federalTerm || lw05Term
          ? "src/simulation/law-consequences/tax.ts"
          : "src/fiscal-authority/tax-powers.generated.json",
      ],
      population: "The actual payer of a saved taxable occurrence.",
      scope: federalTerm
        ? "Only an operative law with supported legal power, saved terms, and a matching taxable record."
        : lw05Term
          ? "Only an operative law with a supported tax family, legal power, saved terms, and a matching taxable record."
          : "Only an operative law with supported saved taxing authority and exact adopted terms.",
      why: federalTerm
        ? "The common tax consequence reader derives an assessment from the adopted terms and the saved tax base; the row supplies no rate or amount."
        : lw05Term
          ? "The row records the consequence, but the shared tax resolver does not yet admit this authority family; missing bindings refuse assessment."
          : "The adopted rate and allowance apply to the saved base; collection uses the existing due payment writer.",
      uncertainty: federalTerm
        ? "The existing tax resolver calls bindTaxLawTerms(world, { law, questionKey, proposalId, onDate, cutoff }). Until this question has an admitted law, power, and saved-record binding, no assessment is resolved. A local question also needs the state to let that level levy the tax (the shared local tax lookup); where that answer is estimated the saved power says so."
        : lw05Term
          ? "The existing tax resolver calls bindTaxLawTerms(world, { law, questionKey, proposalId, onDate, cutoff }). This question's authority family is not admitted by the current shared binder, so no assessment resolves until that binding is added."
          : "This row supplies no rate, authority, taxable occurrence or recipient. Missing bindings refuse assessment.",
    },
  };
}

export const TAX_TERM_QUESTION_ROWS: readonly PolicyPropositionRow[] =
  TAX_QUESTION_LEVELS.flatMap((level) =>
    TAX_QUESTION_FAMILIES.filter(
      (family) =>
        powers.dials.find((dial) => dial.id === family.dial)?.levels[level.key]
          ?.may !== "no",
    ).map((family) => ({
      key: `${level.key}.${family.key}-tax-terms`,
      issue:
        level.key === "federal"
          ? `us-federal:${family.federalIssue}`
          : `us-state-and-local:${family.issue}`,
      name: `Set ${level.name} ${family.name} tax terms`,
      question: `Should the ${level.name} change its ${family.name} tax rate, base or exemptions?`,
      parameters: Object.entries(TAX_LAW_TERM_KEYS).map(([field, key]) => ({
        key,
        value: field,
      })),
      ...(taxTermConsequenceRow(level.key, family.key)
        ? { consequences: [taxTermConsequenceRow(level.key, family.key)!] }
        : {}),
      tags: [
        "tax",
        "adopted-terms-required",
        ...(localTaxQuestion(level.key, family.key)
          ? ["local-fiscal-effect:tax-policy"]
          : []),
      ],
    })),
  );

export const TAX_TERMS_POLICY_PACK: PolicyPack = {
  pack: "us-tax-terms",
  provenance: {
    kind: "authored-fiction",
    note: "Questions a government may debate, not observations, legal power, adopted terms or tax rates. Each law requires actual dated authority and saved taxable records.",
  },
  propositions: TAX_TERM_QUESTION_ROWS,
};
