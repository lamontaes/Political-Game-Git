import { describe, expect, it } from "vitest";
import { canonicalJson } from "../canonical-json";
import {
  drawStateTaxServiceStartingConditions,
  stateKeysForTaxServiceProfiles,
} from "./state-tax-service-profiles";
import { STATE_TAX_SERVICE_GAME_PROFILE_VERSION } from "./types";

describe("saved state tax and service starting profiles", () => {
  it("generates all fifty canonical jurisdictions deterministically per seed", () => {
    const first = drawStateTaxServiceStartingConditions({
      seed: "profile-seed-a",
    });
    const replay = drawStateTaxServiceStartingConditions({
      seed: "profile-seed-a",
    });

    expect(first.profiles.map((profile) => profile.jurisdictionKey)).toEqual(
      stateKeysForTaxServiceProfiles(),
    );
    expect(replay).toEqual(first);
    expect(first.profiles).toHaveLength(50);
  });

  it("keeps profile identities canonical and rates inside the authored calibration", () => {
    const { profiles } = drawStateTaxServiceStartingConditions({
      seed: "profile-identity-check",
    });

    for (const profile of profiles) {
      expect(profile.version).toBe(STATE_TAX_SERVICE_GAME_PROFILE_VERSION);
      expect(profile.profileId).toBe(
        "state-funded-service:" + profile.jurisdictionKey.toLowerCase(),
      );
      expect(profile.ref).toEqual({
        profileId: profile.profileId,
        version: profile.version,
        digest: profile.digest,
      });
      expect(profile.digest).toMatch(/^[a-f0-9]{16}$/);
      expect(canonicalJson(profile.taxTerms)).toContain(
        '"legalBaselineAssumption":"authored-state-game-profile"',
      );
      expect([400, 450, 500]).toContain(
        (profile.taxTerms.rateNumerator * 10_000) /
          profile.taxTerms.rateDenominator,
      );
      expect(profile.capacity.unitsOperational).toBeLessThanOrEqual(
        profile.capacity.unitsTotal,
      );
      expect(profile.capacity.unitsTotal).toBeGreaterThan(0);
      expect(profile.appropriation.availabilityDays).toBeGreaterThan(0);
    }
  });

  it("changes generated assumptions with the save seed", () => {
    const first = drawStateTaxServiceStartingConditions({
      seed: "profile-seed-a",
    });
    const second = drawStateTaxServiceStartingConditions({
      seed: "profile-seed-b",
    });

    expect(second.profiles).not.toEqual(first.profiles);
  });
});
