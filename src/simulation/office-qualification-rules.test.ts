import { describe, expect, it } from "vitest";

import { createScenarioWorld } from "./demo";
import { LEXINGTON_DEMO_CONTEXT } from "./demo-jurisdiction-context";
import { makeIsoDate } from "./dates";
import {
  OFFICE_QUALIFICATIONS_META,
  QUALIFICATION_SOURCED_STATE_KEYS,
  assessOfficeQualifications,
  officeFamilyForChamberKey,
  officeQualifications,
} from "./office-qualification-rules";

describe("production-compiled office qualification rules", () => {
  it("exposes 63 unique claims across the five recovered source states", () => {
    expect(OFFICE_QUALIFICATIONS_META.recordCount).toBe(63);
    expect(QUALIFICATION_SOURCED_STATE_KEYS).toEqual([
      "US-MN",
      "US-MO",
      "US-NE",
      "US-NV",
      "US-OH",
    ]);
    const ne = officeQualifications(
      "US-NE",
      "UNICAMERAL_CHAMBER",
      makeIsoDate("2026-09-09"),
    );
    expect(new Set(ne.map((row) => row.field)).size).toBe(ne.length);
    expect(
      officeQualifications(
        "US-OH",
        "LOWER_CHAMBER",
        makeIsoDate("2026-09-09"),
      ).find((row) => row.field === "DISTRICT_RESIDENCE"),
    ).toMatchObject({
      sourceState: "KNOWN",
      researchBatch: "31D",
      researchArtifactId: "31D-recovered-qualifications",
      researchArtifactSha256:
        "bc8afda99ae2e9e22180126bc4801fbd9fe5c6f9f3e12f442f8e16ab5de50473",
      derivation: "DIRECT",
    });
  });

  it("maps only explicit chamber keys, never an office display name", () => {
    expect(officeFamilyForChamberKey("legislature")).toBe("UNICAMERAL_CHAMBER");
    expect(officeFamilyForChamberKey("Nebraska Legislature")).toBeNull();
  });

  it("proves a successful age/residence check and a sourced age refusal", () => {
    const world = createScenarioWorld(
      "qualification-production-rules",
      LEXINGTON_DEMO_CONTEXT,
      { peopleCount: 3 },
    );
    const person = world.people[world.personOrder[0]!]!;
    const meets = assessOfficeQualifications({
      person,
      stateJurisdictionKey: "US-NE",
      officeFamily: "UNICAMERAL_CHAMBER",
      stateResidenceSince: makeIsoDate("2000-01-01"),
      districtResidenceSince: makeIsoDate("2000-01-01"),
      onDate: makeIsoDate("2026-09-09"),
    });
    expect(
      meets
        .filter((assessment) =>
          ["MINIMUM_AGE", "DISTRICT_RESIDENCE"].includes(assessment.field),
        )
        .every((assessment) => assessment.verdict === "meets"),
    ).toBe(true);

    const tooYoung = assessOfficeQualifications({
      person: { ...person, birthDate: world.currentDate },
      stateJurisdictionKey: "US-NE",
      officeFamily: "UNICAMERAL_CHAMBER",
      stateResidenceSince: makeIsoDate("2000-01-01"),
      districtResidenceSince: makeIsoDate("2000-01-01"),
      onDate: makeIsoDate("2026-09-09"),
    });
    expect(
      tooYoung.find((assessment) => assessment.field === "MINIMUM_AGE"),
    ).toMatchObject({
      verdict: "fails",
      source: { citation: "Neb. Const. art. III, § 8" },
    });
  });

  it("bounds Ohio and Nevada rules by provision evidence, not transport dates", () => {
    const ohioBefore = officeQualifications(
      "US-OH",
      "GOVERNOR",
      makeIsoDate("1953-11-02"),
    ).find((row) => row.field === "ELECTOR_REQUIREMENT")!;
    const ohioOn = officeQualifications(
      "US-OH",
      "GOVERNOR",
      makeIsoDate("1953-11-03"),
    ).find((row) => row.field === "ELECTOR_REQUIREMENT")!;
    expect(ohioBefore.researchReportedEffectiveDate).toBe("1851-09-01");
    expect(ohioBefore.temporalApplicability.state).toBe("UNKNOWN");
    expect(ohioOn.temporalApplicability.state).toBe("SUPPORTED");

    const nevadaBefore = officeQualifications(
      "US-NV",
      "ATTORNEY_GENERAL",
      makeIsoDate("2021-05-28"),
    );
    const nevadaOn = officeQualifications(
      "US-NV",
      "ATTORNEY_GENERAL",
      makeIsoDate("2021-05-29"),
    );
    expect(
      nevadaBefore.every(
        (row) => row.temporalApplicability.state === "UNKNOWN",
      ),
    ).toBe(true);
    expect(
      nevadaOn.every((row) => row.temporalApplicability.state === "SUPPORTED"),
    ).toBe(true);
    expect(nevadaOn[0]?.researchReportedEffectiveDate).toBe("2021-10-01");
    expect(nevadaOn[0]?.provisionValidity).toMatchObject({
      state: "EXACT_INTERVAL",
      validFrom: "2021-05-29",
      amendmentAnnotations: ["NRS A 2021, 932", "NRS A 2025, 2094"],
    });
  });

  it("does not apply a later current-source observation to an earlier life", () => {
    const earlier = officeQualifications(
      "US-NE",
      "UNICAMERAL_CHAMBER",
      makeIsoDate("2026-01-05"),
    );
    expect(earlier.length).toBeGreaterThan(0);
    expect(
      earlier.every((row) => row.temporalApplicability.state === "UNKNOWN"),
    ).toBe(true);
  });
});
