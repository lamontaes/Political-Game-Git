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
    const ne = officeQualifications("US-NE", "UNICAMERAL_CHAMBER");
    expect(new Set(ne.map((row) => row.field)).size).toBe(ne.length);
    expect(
      officeQualifications("US-OH", "LOWER_CHAMBER").find(
        (row) => row.field === "DISTRICT_RESIDENCE",
      ),
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
      onDate: world.currentDate,
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
      onDate: world.currentDate,
    });
    expect(
      tooYoung.find((assessment) => assessment.field === "MINIMUM_AGE"),
    ).toMatchObject({
      verdict: "fails",
      source: { citation: "Neb. Const. art. III, § 8" },
    });
  });
});
