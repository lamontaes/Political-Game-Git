import { describe, expect, it } from "vitest";

import { crosswalkProfileToCensusGovId } from "./census-crosswalk.js";
import { SYNTHETIC_BICAMERAL_STATE_PROFILE } from "./__fixtures__/synthetic-profiles.js";
import type { JurisdictionProfile } from "./types.js";
import { known, unknown } from "../sourced-value.js";

const PROVENANCE = {
  sourceId: "census-cog-2022",
  authoritativeUrl:
    "https://www.census.gov/programs-surveys/cog/technical-documentation.html",
  publisher: "U.S. Census Bureau",
  effectiveDate: "2022-01-01",
  locator: "Census Government ID",
  sourceClassification: "CENSUS_FEDERAL_RECORD" as const,
};

function profileWith(overrides: {
  censusGovId?: string;
  postal?: string;
  jurisdictionType?: JurisdictionProfile["identity"]["jurisdictionType"];
}): JurisdictionProfile {
  const base = SYNTHETIC_BICAMERAL_STATE_PROFILE;
  return {
    ...base,
    identity: {
      ...base.identity,
      censusFips:
        overrides.censusGovId === undefined
          ? unknown("not yet crosswalked")
          : known({ censusGovId: overrides.censusGovId }, PROVENANCE),
      postalAbbreviation:
        overrides.postal === undefined
          ? base.identity.postalAbbreviation
          : known(overrides.postal, PROVENANCE),
      jurisdictionType:
        overrides.jurisdictionType ?? base.identity.jurisdictionType,
    },
  };
}

describe("governance <-> government-universe crosswalk", () => {
  it("reports an unjoined profile without treating it as a contradiction", () => {
    const result = crosswalkProfileToCensusGovId(profileWith({}));

    expect(result.censusGovId).toBeNull();
    expect(result.consistent).toBe(false);
    expect(result.findings[0]?.kind).toBe("no_census_gov_id");
  });

  it("accepts a profile whose state and class agree with the decoded ID", () => {
    // Census state code 18 = Kentucky; type digit 1 = state government.
    const result = crosswalkProfileToCensusGovId(
      profileWith({
        censusGovId: "18100000000000",
        postal: "KY",
        jurisdictionType: known("STATE", PROVENANCE),
      }),
    );

    expect(result.consistent).toBe(true);
    expect(result.findings).toEqual([]);
  });

  it("flags a state that disagrees with the Census Gov ID", () => {
    const result = crosswalkProfileToCensusGovId(
      profileWith({
        censusGovId: "18100000000000",
        postal: "TX",
        jurisdictionType: known("STATE", PROVENANCE),
      }),
    );

    expect(result.consistent).toBe(false);
    expect(result.findings.map((f) => f.kind)).toContain("state_mismatch");
  });

  it("flags a jurisdiction type that disagrees with the decoded class", () => {
    const result = crosswalkProfileToCensusGovId(
      profileWith({
        censusGovId: "18100000000000",
        postal: "KY",
        jurisdictionType: known("MUNICIPALITY", PROVENANCE),
      }),
    );

    expect(result.findings.map((f) => f.kind)).toContain("class_mismatch");
  });

  it("rejects a malformed Census Gov ID instead of partially decoding it", () => {
    const result = crosswalkProfileToCensusGovId(
      profileWith({ censusGovId: "181000", postal: "KY" }),
    );

    expect(result.findings[0]?.kind).toBe("unparseable_census_gov_id");
  });

  it("does not compare a class the profile has not established", () => {
    const result = crosswalkProfileToCensusGovId(
      profileWith({
        censusGovId: "18100000000000",
        postal: "KY",
        jurisdictionType: unknown("not researched"),
      }),
    );

    expect(result.findings.map((f) => f.kind)).toContain(
      "jurisdiction_type_unresolved",
    );
    expect(result.findings.map((f) => f.kind)).not.toContain("class_mismatch");
  });
});
