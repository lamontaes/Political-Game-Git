import { typedTaxQuestionRow } from "./law-consequences/typed-tax-question-data";
import powers from "../../data/research/powers-catalog/catalog.json" with { type: "json" };
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
      ...(family.key === "excise"
        ? {
            consequences: [typedTaxQuestionRow(`tax:${level.key}:excise`)],
          }
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
