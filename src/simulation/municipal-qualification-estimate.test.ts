import { describe, expect, it } from "vitest";
import { candidacyPackById, stateCandidacyPack } from "./candidacy-packs";
import {
  municipalMinimumAgeEstimate,
  municipalMinimumAgeSentence,
} from "./municipal-qualification-estimate";
import { knownRule } from "./legislature-rules";
import type { CandidacyPack } from "./candidacy-packs";

const key = "local-government-194033-chief-executive";
const donor = stateCandidacyPack("US-RI")!;
function ages(lower: number, upper: number): CandidacyPack {
  return {
    ...donor,
    offices: donor.offices.map((office) => ({
      ...office,
      qualification: {
        ...office.qualification,
        minimumAge: knownRule(
          office.officeKey.endsWith(":house") ? lower : upper,
          {
            authority: "game-profile",
            verification: "game-profile",
            citation: "test-donor",
            sourceTitle: "Authored donor fixture",
            sourceUrl: null,
            retrievedAt: null,
            note: "Fixture, not law.",
          },
        ),
      },
    })),
  };
}
describe("municipal age estimates preserve their actual same-state donor", () => {
  it("admits East Providence's canonical office with the donor's nested estimated authority", () => {
    const qualification = candidacyPackById(`${key}:candidacy`)!.offices[0]!
      .qualification;
    expect(qualification.minimumAge.kind).toBe("known");
    expect(qualification.minimumAgeEstimate).toMatchObject({
      officeKey: key,
      jurisdictionKey: "US-RI",
      minimumAge: 21,
      municipalLegalApplicability: "UNCONFIRMED",
      unestimatedFields: ["residency", "termYears", "filing"],
    });
    expect(
      qualification.minimumAgeEstimate!.donors[0]!.source.verification,
    ).toBe("game-profile");
    for (const field of ["residency", "termYears", "filing"] as const)
      expect(qualification[field].kind).toBe("unknown");
    expect(
      municipalMinimumAgeSentence(qualification.minimumAgeEstimate!),
    ).toContain("estimated from similar elected offices in Rhode Island");
  });
  it("uses representative-office ages without substituting an adult floor or another state", () => {
    expect(
      municipalMinimumAgeEstimate("US-RI", key, ages(25, 30))!.minimumAge,
    ).toBe(25);
    expect(
      municipalMinimumAgeEstimate("US-RI", key, ages(19, 30))!.minimumAge,
    ).toBe(19);
    expect(municipalMinimumAgeEstimate("US-AK", key, donor)).toBeNull();
    expect(municipalMinimumAgeEstimate("US-RI", key, null)).toBeNull();
    expect(
      municipalMinimumAgeEstimate("US-RI", key, { ...donor, offices: [] }),
    ).toBeNull();
  });
  it("retains the exact provenance across a saved JSON round trip", () => {
    const estimate = municipalMinimumAgeEstimate("US-RI", key, donor)!;
    expect(JSON.parse(JSON.stringify(estimate))).toEqual(estimate);
    expect(estimate.donors.every((row) => row.packId === donor.packId)).toBe(
      true,
    );
  });
});
