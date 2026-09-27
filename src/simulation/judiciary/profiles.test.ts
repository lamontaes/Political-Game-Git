import { describe, expect, it } from "vitest";
import {
  judicialSelectionProfile,
  judicialSelectionProfilesForJurisdiction,
} from "./profiles";
import { JUDICIAL_SELECTION_PROFILES } from "./generated/selection-profiles";

describe("92L runtime selection projection", () => {
  it("retains all reported office slots and research provenance", () => {
    expect(JUDICIAL_SELECTION_PROFILES).toHaveLength(156);
    expect(
      new Set(JUDICIAL_SELECTION_PROFILES.map((row) => row.jurisdictionId))
        .size,
    ).toBe(51);
    expect(
      judicialSelectionProfilesForJurisdiction("us-ak").length,
    ).toBeGreaterThan(0);
    expect(
      judicialSelectionProfile("us-ak:highest_court")?.primaryAuthorityStatus,
    ).toBe("CITATIONS_REPORTED_NOT_RETRIEVED");
  });

  it("preserves ordered merit stages and retention without inventing actors", () => {
    const alaska = judicialSelectionProfile("us-ak:highest_court")!;
    expect(
      alaska.initialSelection.value?.paths[0].stages.map(
        (stage) => stage.mechanism,
      ),
    ).toEqual(["MERIT_COMMISSION_SHORTLIST", "EXECUTIVE_APPOINTMENT"]);
    expect(alaska.renewal.value?.paths[0].stages[0].mechanism).toBe(
      "RETENTION_ELECTION",
    );
    expect(alaska.renewal.value?.paths[0].stages[0].actor.state).toBe(
      "UNKNOWN",
    );
    expect(alaska.mandatoryRetirement.value?.age.value).toBe(70);
    expect(alaska.mandatoryRetirement.value?.triggerPoint.value).toContain(
      "or end of calendar year / term",
    );
  });

  it("retains county-dependent branches rather than choosing one statewide", () => {
    const arizonaTrial = judicialSelectionProfile("us-az:general_trial")!;
    expect(
      arizonaTrial.initialSelection.value?.paths.map((path) => path.pathId),
    ).toEqual(["merit-appointment", "nonpartisan-election"]);
    expect(
      arizonaTrial.initialSelection.value?.paths.every(
        (path) =>
          path.applicability.state === "KNOWN" &&
          path.applicability.value?.includes("counties"),
      ),
    ).toBe(true);
  });
});
