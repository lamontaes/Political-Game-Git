import { describe, expect, it } from "vitest";
import { lifePlaceStateIdentities } from "../../simulation/life-places";
import {
  isApplicantBetterPlacedFromFacts,
  type JobApplicantPlacementFacts,
} from "./job-applicant-ranking";

const places = lifePlaceStateIdentities();

function applicant(
  overrides: Partial<JobApplicantPlacementFacts> = {},
): JobApplicantPlacementFacts {
  return {
    daysInOpeningWorkLine: 10,
    route: "applied",
    submittedAt: "2026-01-01",
    personId: "person-a",
    ...overrides,
  };
}

describe("job applicant placement rule", () => {
  it.each(places)("ranks work-line experience in $jurisdictionKey", (place) => {
    const index = places.indexOf(place);
    const lessExperience = applicant({
      daysInOpeningWorkLine: index,
      personId: `person-${index}-a`,
    });
    const moreExperience = applicant({
      daysInOpeningWorkLine: index + 1,
      personId: `person-${index}-b`,
    });
    expect(
      isApplicantBetterPlacedFromFacts(moreExperience, lessExperience),
    ).toBe(true);
    expect(
      isApplicantBetterPlacedFromFacts(lessExperience, moreExperience),
    ).toBe(false);
  });

  it("uses referral, submission order, and person ID as successive tie-breakers", () => {
    expect(
      isApplicantBetterPlacedFromFacts(
        applicant({ route: "introduced" }),
        applicant({ route: "applied" }),
      ),
    ).toBe(true);
    expect(
      isApplicantBetterPlacedFromFacts(
        applicant({ submittedAt: "2026-01-01" }),
        applicant({ submittedAt: "2026-01-02" }),
      ),
    ).toBe(true);
    expect(
      isApplicantBetterPlacedFromFacts(
        applicant({ personId: "person-a" }),
        applicant({ personId: "person-b" }),
      ),
    ).toBe(true);
    expect(
      isApplicantBetterPlacedFromFacts(
        applicant({ personId: "person-b" }),
        applicant({ personId: "person-a" }),
      ),
    ).toBe(false);
  });
});
