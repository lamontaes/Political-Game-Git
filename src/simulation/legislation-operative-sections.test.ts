import { describe, expect, it } from "vitest";

import { makeIsoDate } from "./dates";
import { legislativeBlueprint } from "./legislation-scenarios";
import { compileBillDraft } from "./legislation-drafting";
import {
  assertOperativeDraft,
  operativeSectionSupport,
} from "./legislation-operative-sections";
import { standingAuthority } from "./legislation-program-families";
import { stateJurisdictionForKey } from "./life-places";

const alaska = stateJurisdictionForKey("US-AK")!.id;
const kentucky = stateJurisdictionForKey("US-KY")!.id;

function draft(selectedProvisionKeys: readonly string[]) {
  return compileBillDraft({
    familyKey: "appropriations",
    variantKey: "single-programme",
    scenarioKey: "alaska",
    jurisdictionId: alaska,
    rulePackId: legislativeBlueprint("alaska").pack.packId,
    designation: "HB 901",
    filedOn: makeIsoDate("2026-01-05"),
    predicateAuthority: standingAuthority("standing:school-facilities")!,
    selectedProvisionKeys,
  });
}

describe("operative section support", () => {
  it("offers only sections with an enacted state appropriation consumer", () => {
    const support = operativeSectionSupport(
      "appropriations",
      "single-programme",
      alaska,
    );
    expect(support.map((row) => [row.provisionKey, row.supported])).toEqual([
      ["authority-named", true],
      ["amount-provided", true],
      ["availability", true],
      ["spending-report", false],
    ]);
    expect(() =>
      assertOperativeDraft(
        draft(["authority-named", "amount-provided", "availability"]),
      ),
    ).not.toThrow();
    expect(() =>
      assertOperativeDraft(
        draft([
          "authority-named",
          "amount-provided",
          "availability",
          "spending-report",
        ]),
      ),
    ).toThrow(/no canonical enacted-rule or delivery consumer/);
  });

  it("keeps the pinned transit mandate together and inside its compiled jurisdiction", () => {
    expect(
      operativeSectionSupport(
        "appropriations",
        "transit-staged-service-v1",
        alaska,
      ).every((row) => row.supported),
    ).toBe(true);
    expect(
      operativeSectionSupport(
        "appropriations",
        "transit-staged-service-v1",
        kentucky,
      ).every((row) => !row.supported),
    ).toBe(true);
  });
});
