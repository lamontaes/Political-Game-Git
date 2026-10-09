import presidentialRules from "../../data/research/elections/presidential-rules.json" with { type: "json" };
import stateReference from "../../data/research/geography/state-reference.json" with { type: "json" };
import authoredLegislation from "../../data/scenarios/legislative-content.json" with { type: "json" };
import authoredPlaceContexts from "../../data/scenarios/place-contexts.json" with { type: "json" };
import stateFundedServices from "../../data/scenarios/state-funded-services.json" with { type: "json" };
import recordedSittings from "../../data/scenarios/recorded-sittings.json" with { type: "json" };
import lifePathTerms from "../../data/scenarios/life-paths2-terms.json" with { type: "json" };
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
  presidentialRules,
  stateReference,
  authoredLegislation,
  authoredPlaceContexts,
  stateFundedServices,
  recordedSittings,
  lifePathTerms,
};

/** The browser-safe data seam. Readers keep their legal and coverage validation. */
export function researchRuleTable<Key extends keyof typeof tables>(
  key: Key,
): (typeof tables)[Key] {
  return tables[key];
}
