import federalIncomeTaxes from "../../data/research/money/federal-income-tax-schedules.json" with { type: "json" };
import jurisdictionTables from "../../data/research/jurisdiction-rule-tables.json" with { type: "json" };
import officeQualifications from "../../data/research/elections/office-qualifications.json" with { type: "json" };
import statutoryTaxes from "../../data/research/money/statutory-tax-rules.json" with { type: "json" };
import crisisFunding from "../../data/research/health/crisis-response-funding-rows.json" with { type: "json" };

const tables = {
  ...jurisdictionTables,
  officeQualifications,
  statutoryTaxes,
  crisisFunding,
  federalIncomeTaxes,
};

/** The browser-safe data seam. Readers keep their legal and coverage validation. */
export function researchRuleTable<Key extends keyof typeof tables>(
  key: Key,
): (typeof tables)[Key] {
  return tables[key];
}
