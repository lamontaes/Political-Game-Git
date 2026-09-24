import { describe, expect, it } from "vitest";
import {
  candidacyPackForJurisdiction,
  electionContestById,
  serializeWorld,
} from "../simulation";
import { resolveLegislativeFilingEntry } from "./legislative-filing-entry";
import { fileDraftFromOffice } from "./legislation-docket";
import { ordinaryStateHouseFilingEntry } from "../../tests/fixtures/multistate-funded-service-entry";

describe("ordinary generated lower-chamber members reach their state filing entry", () => {
  it.each([
    ["KY", "house"],
    ["MN", "house"],
    ["NV", "assembly"],
  ] as const)(
    "%s: the elected member's state and bound seat reach the gate",
    (stateUsps, chamberKey) => {
      const fixture = ordinaryStateHouseFilingEntry(stateUsps);
      const before = serializeWorld(fixture.world);
      const entry = resolveLegislativeFilingEntry(
        fixture.world,
        fixture.personId,
      );

      expect(entry.kind).toBe("available");
      if (entry.kind !== "available") throw new Error(entry.reason);
      expect(serializeWorld(fixture.world)).toBe(before);
      expect(entry.personId).toBe(fixture.personId);
      expect(entry.jurisdictionId).toBe(fixture.governingJurisdictionId);
      expect(entry.seat.governingJurisdictionId).toBe(
        fixture.governingJurisdictionId,
      );
      expect(entry.seat.jurisdictionKey).toBe(`US-${stateUsps}`);
      expect(entry.seat.chamberKey).toBe(chamberKey);

      const contest = electionContestById(fixture.world, entry.seat.contestId);
      expect(contest).toBeDefined();
      expect(contest!.candidatePersonIds).toContain(fixture.personId);
      expect(contest!.office.officeKey).toBe(fixture.officeKey);
      expect(contest!.office.districtBinding).toEqual(fixture.districtBinding);

      // Nevada's seat identity comes from the resident's recorded whole-place
      // district membership. The profile does not supply office qualifications.
      if (stateUsps === "NV") {
        const pack = candidacyPackForJurisdiction(fixture.homeJurisdictionId)!;
        const residency = pack.offices.find(
          (office) => office.officeKey === fixture.officeKey,
        )?.qualification.residency;
        expect(residency?.kind).toBe("known");
        if (residency?.kind === "known") {
          expect(residency.value).toBe("1");
          expect(residency.source.citation).toContain("NRS 218A.200");
        }
      }

      const filed = fileDraftFromOffice(fixture.world, {
        playerPersonId: fixture.personId,
        scenarioKey: entry.scenarioKey,
        jurisdictionId: entry.jurisdictionId,
        familyKey: "broadband-access",
        variantKey: "unserved-buildout",
      });
      const measure = filed.world.history.legislativeMeasures!.find(
        (candidate) => candidate.id === filed.bill.measureId,
      )!;
      expect(measure.rulePackId).toBe(entry.seat.legislativeRulePackId);
      expect(measure.originChamberKey).toBe(chamberKey);
      expect(measure.sponsorPersonId).toBe(fixture.personId);
    },
    120_000,
  );
});
