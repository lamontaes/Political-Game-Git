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

function taxTermConsequenceRow(
  levelKey: string,
  familyKey: string,
): LawConsequenceRow | undefined {
  const federalTerm =
    levelKey === "federal" &&
    FEDERAL_TAX_TERM_CONSEQUENCE_FAMILIES.has(familyKey);
  const excise = familyKey === "excise";
  if (!federalTerm && !excise) return undefined;
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
        ...(federalTerm ? ["src/simulation/tax-law-term-binding.ts"] : []),
        federalTerm
          ? "src/simulation/law-consequences/tax.ts"
          : "src/fiscal-authority/tax-powers.generated.json",
      ],
      population: "The actual payer of a saved taxable occurrence.",
      scope: federalTerm
        ? "Only an operative law with supported legal power, saved terms, and a matching taxable record."
        : "Only an operative law with supported saved taxing authority and exact adopted terms.",
      why: federalTerm
        ? "The common tax consequence reader derives an assessment from the adopted terms and the saved tax base; the row supplies no rate or amount."
        : "The adopted rate and allowance apply to the saved base; collection uses the existing due payment writer.",
      uncertainty: federalTerm
        ? "The existing tax resolver calls bindTaxLawTerms(world, { law, questionKey, proposalId, onDate, cutoff }). Until this federal question has an admitted law, power, and saved-record binding, no assessment is resolved."
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
      tags: ["tax", "adopted-terms-required"],
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
