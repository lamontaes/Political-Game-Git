import { describe, expect, it } from "vitest";

import { canonicalJson } from "./canonical-json";
import { stableHash } from "./ids";
import {
  STATE_FUNDED_SERVICE_GAME_PROFILE_VERSION,
  stateFundedServiceGameProfileByRef,
  stateFundedServiceGameProfileForJurisdictionKey,
  stateFundedServiceGameProfileRef,
  stateFundedServiceGameProfileRefForJurisdictionKey,
} from "./state-funded-service-game-profiles";

describe("state-funded service game profiles", () => {
  it("registers only the approved states with distinct generic program keys", () => {
    const profiles = ["US-KY", "US-MN", "US-NV"].map((key) =>
      stateFundedServiceGameProfileForJurisdictionKey(key),
    );

    expect(profiles.every(Boolean)).toBe(true);
    expect(
      profiles.map((profile) => profile!.appropriation.programKey),
    ).toEqual(["appropriations:ky", "appropriations:mn", "appropriations:nv"]);
    expect(
      profiles.map((profile) => profile!.appropriation.authorityKey),
    ).toEqual([
      "standing:school-facilities",
      "standing:school-facilities",
      "standing:school-facilities",
    ]);
    expect(
      profiles.map((profile) => [
        profile!.taxTerms.rateNumerator,
        profile!.taxTerms.rateDenominator,
      ]),
    ).toEqual([
      [5, 100],
      [9, 200],
      [4, 100],
    ]);
    expect(stateFundedServiceGameProfileForJurisdictionKey("US-AK")).toBeNull();
    expect(stateFundedServiceGameProfileForJurisdictionKey("US-XX")).toBeNull();
  });

  it("labels tax, appropriation, and service assumptions as fictional mechanics", () => {
    for (const key of ["US-KY", "US-MN", "US-NV"]) {
      const profile = stateFundedServiceGameProfileForJurisdictionKey(key)!;
      expect(profile.note).toMatch(/Fictional game-profile mechanics/);
      expect(profile.note).toMatch(/not source evidence/);
      expect(profile.taxTerms.legalBaselineAssumption).toBe(
        "authored-state-game-profile",
      );
      expect(profile.taxTerms.baseKey).toBe(
        "tax-base:declared-personal-occurrence",
      );
      expect(profile.taxTerms.seriesKey).toContain(key.toLowerCase());
      expect(profile.taxTerms.rateNumerator).toBeGreaterThan(0);
      expect(profile.taxTerms.rateDenominator).toBeGreaterThan(0);
      expect(profile.taxTerms.currency).toBe("USD");
      expect(profile.taxTerms.collectionLagDays).toBeGreaterThan(0);
      expect(profile.taxTerms.effectiveDelayDays).toBeGreaterThan(0);
      expect(profile.taxTerms.assumptionNote).toMatch(
        /fictional .* game-profile assumptions/,
      );
      expect(profile.appropriation.basis.kind).toBe("game-profile");
      expect(profile.appropriation.familyKey).toBe("appropriations");
      expect(profile.appropriation.variantKey).toBe("single-programme");
      expect(profile.appropriation.availabilityDays).toBe(365);
      expect(profile.appropriation.amountMinorUnits).toBe(100_000_000);
      expect(profile.capacity.basis.kind).toBe("game-profile");
      expect(profile.capacity.unitsTotal).toBe(1);
      expect(profile.capacity.unitsOperational).toBe(0);
      expect(profile.capacity.currency).toBe("USD");
      expect(profile.capacity.restorationCostPerUnitMinorUnits).toBe(2_500);

      const taxableOccurrenceMinorUnits = Math.ceil(
        (profile.capacity.restorationCostPerUnitMinorUnits *
          profile.taxTerms.rateDenominator) /
          profile.taxTerms.rateNumerator,
      );
      expect(
        Math.floor(
          (taxableOccurrenceMinorUnits * profile.taxTerms.rateNumerator) /
            profile.taxTerms.rateDenominator,
        ),
      ).toBeGreaterThanOrEqual(
        profile.capacity.restorationCostPerUnitMinorUnits,
      );
    }
  });

  it("uses Minnesota's compiled seat counts and labels other panels as stand-ins", () => {
    const mn = stateFundedServiceGameProfileForJurisdictionKey("US-MN")!;
    expect(mn.panelSeatsByChamber.house?.seats).toBe(134);
    expect(mn.panelSeatsByChamber.senate?.seats).toBe(67);
    expect(mn.panelSeatsByChamber.house?.basis).toBe(
      "compiled-formal-seat-count",
    );
    expect(mn.panelSeatsByChamber.senate?.basis).toBe(
      "compiled-formal-seat-count",
    );
    expect(mn.panelSeatsByChamber.house?.note).toMatch(
      /Minn\. Stat\. § 2\.021.*authored game outcomes/,
    );
    expect(mn.panelSeatsByChamber.senate?.note).toMatch(
      /Minn\. Stat\. § 2\.021.*authored game outcomes/,
    );

    for (const key of ["US-KY", "US-NV"]) {
      const profile = stateFundedServiceGameProfileForJurisdictionKey(key)!;
      expect(
        Object.values(profile.panelSeatsByChamber).every(
          (panel) => panel.basis === "game-profile-stand-in",
        ),
      ).toBe(true);
      expect(
        Object.values(profile.panelSeatsByChamber).every((panel) =>
          panel.note.includes("not the formal"),
        ),
      ).toBe(true);
    }
  });

  it("provides deterministic content refs and an immutable registry", () => {
    for (const key of ["US-KY", "US-MN", "US-NV"]) {
      const profile = stateFundedServiceGameProfileForJurisdictionKey(key)!;
      const { ref, version, digest, ...definition } = profile;
      expect(version).toBe(STATE_FUNDED_SERVICE_GAME_PROFILE_VERSION);
      expect(digest).toBe(profile.digest);
      expect(ref).toEqual(
        stateFundedServiceGameProfileRefForJurisdictionKey(key),
      );
      expect(stateFundedServiceGameProfileRef(profile)).toBe(ref);
      expect(stateFundedServiceGameProfileByRef(ref)).toBe(profile);
      expect(
        stateFundedServiceGameProfileByRef({
          ...ref,
          digest: "incorrect-content-digest",
        }),
      ).toBeNull();
      expect(ref).toEqual({
        profileId: profile.profileId,
        version,
        digest: stableHash(canonicalJson({ version, profile: definition })),
      });
      expect(Object.isFrozen(profile)).toBe(true);
      expect(Object.isFrozen(profile.taxTerms)).toBe(true);
      expect(Object.isFrozen(profile.taxTerms.exemptBaseKeys)).toBe(true);
      expect(Object.isFrozen(profile.appropriation.basis)).toBe(true);
      expect(Object.isFrozen(profile.panelSeatsByChamber)).toBe(true);
      expect(
        Object.isFrozen(Object.values(profile.panelSeatsByChamber)[0]),
      ).toBe(true);
    }
  });
});
