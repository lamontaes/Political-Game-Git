import { describe, expect, it } from "vitest";
import { requireLifePlace } from "./life-places";
import {
  municipalGovernmentForLifePlace,
  municipalPublicMeetingSeries,
  municipalRulePackFor,
  primaryReading,
} from "./municipal-government";
import { hometownCountyEquivalentGeoid } from "../presentation/place-hometown-population";

// Real generated production identity, not a fixture declaring its own join.
describe("reviewed municipal place identities", () => {
  it("binds Portland to its exact active city without promoting its inventory county", () => {
    const place = requireLifePlace("4159000");
    const government = municipalGovernmentForLifePlace(place)!;
    expect(government).not.toBeNull();
    expect(government.key).toBe("us-or-portland");
    expect(government.placeGeoid).toBe("4159000");
    expect(government.identity).toMatchObject({
      publisherId: "211254",
      publisherUnitName: "CITY OF PORTLAND",
      countyAreaGeoid: "41051",
      countyEquivalentGeoid: null,
      governmentUnit: { functionalActive: true },
    });
    expect(hometownCountyEquivalentGeoid(place)).toBeNull();
  });

  it("exposes only Portland's admitted composition and meeting facts", () => {
    const government = municipalGovernmentForLifePlace(
      requireLifePlace("4159000"),
    )!;
    const reading = primaryReading(government);
    expect(reading.evidence).toBe("enacted-text");
    expect(reading.bodySize).toBe(12);
    expect(reading.presidingOffice).toBe("President of the Council");
    expect(reading.separation).toBe("SEPARATE_EXECUTIVE_AND_LEGISLATIVE");
    expect(reading.mayor).toEqual({
      title: "Mayor",
      structuralPosition: "SEPARATE_CHIEF_EXECUTIVE",
    });
    expect(reading.executiveSelection).toBeNull();
    expect(reading.manager).toBeNull();
    expect(reading.procedure.quorumRule?.fixedVotesRequired).toBe(7);
    const meetings = municipalPublicMeetingSeries(government);
    expect(meetings).toHaveLength(2);
    for (const series of meetings) {
      expect(series.publicAttendance?.openToPublic).toBe(true);
      expect(series.publicAttendance?.publicCommentOffered).toBe("UNKNOWN");
      expect(series.cadence).toBeNull();
      expect(series.venue).toBeNull();
    }
    const capability = municipalRulePackFor(government);
    expect(capability.ok).toBe(false);
    if (!capability.ok)
      expect(
        capability.missing.some((row) => row.field === "passage threshold"),
      ).toBe(true);
  });

  it("dates Portland's admitted meeting rules to the charter commencement", () => {
    const government = municipalGovernmentForLifePlace(
      requireLifePlace("4159000"),
    )!;
    const reading = primaryReading(government);
    const meetingFacts = reading.facts.filter((fact) =>
      fact.evidence?.some(
        (source) =>
          source.artifactId === "or-portland-charter-2-1" &&
          [
            "Portland City Charter § 2-112",
            "Portland City Charter § 2-114",
          ].includes(source.locator.citation ?? ""),
      ),
    );
    expect(meetingFacts).toHaveLength(4);
    for (const fact of meetingFacts) {
      expect(fact.state).toBe("KNOWN");
      expect(fact.asOf).toBe("2025-01-01");
    }
    expect(reading.procedure.introductionSponsorship).toBeNull();
    expect(reading.procedure.passageText).toBeNull();
    expect(reading.procedure.effectivePublication).toBeNull();
    expect(municipalRulePackFor(government).ok).toBe(false);
  });

  it("preserves separately reviewed county-equivalent joins", () => {
    for (const [placeKey, countyGeoid] of [
      ["5114968", "51540"],
      ["5167000", "51760"],
      ["3209700", "32510"],
    ]) {
      expect(hometownCountyEquivalentGeoid(requireLifePlace(placeKey!))).toBe(
        countyGeoid,
      );
    }
  });
});
