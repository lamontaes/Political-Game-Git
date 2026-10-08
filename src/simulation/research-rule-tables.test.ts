import { describe, expect, it } from "vitest";
import { researchRuleTable } from "./research-rule-tables";
import { STATES } from "./state-reference";
import { executiveRulePackForJurisdiction } from "./executive-authority-rule-packs";
import { assertExecutiveAuthorityPackIntegrity } from "./executive-authority-rules";
import { stateExecutiveIdentity } from "./nationwide-world/state-executive-candidacy-packs";
import { senateVacancyLaw } from "./nationwide-world/senate-vacancy-law";
import { CRISIS_FUNDING_ROWS } from "./crisis-response-funding-rows";
import { RESEARCHED_PLACE_KEYS } from "./statutory-tax-rules";

describe("the shared rule-table seam", () => {
  it.each(Object.keys(STATES))("routes the existing readers for %s", (usps) => {
    const jurisdictionKey = `US-${usps}`;
    const identity = stateExecutiveIdentity(usps);
    expect(identity?.jurisdictionKey).toBe(jurisdictionKey);
    const pack = executiveRulePackForJurisdiction(jurisdictionKey);
    expect(identity?.officeKey).toBe(pack.office.officeKey);
    expect(() => assertExecutiveAuthorityPackIntegrity(pack)).not.toThrow();
    expect(RESEARCHED_PLACE_KEYS).toContain(jurisdictionKey);
    expect(
      CRISIS_FUNDING_ROWS.some((row) => row.placeKey === jurisdictionKey),
    ).toBe(true);
    if (usps in researchRuleTable("stateNames")) {
      expect(senateVacancyLaw(usps)?.stateUsps).toBe(usps);
    } else {
      // The District and territories have no U.S. Senate seat to fill.
      expect(senateVacancyLaw(usps)).toBeNull();
    }
  });
});
