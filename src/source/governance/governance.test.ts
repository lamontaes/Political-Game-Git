import { describe, expect, it } from "vitest";
import {
  SYNTHETIC_ABSENT_UNKNOWN_PROFILE,
  SYNTHETIC_BICAMERAL_STATE_PROFILE,
  SYNTHETIC_HISTORICAL_TRANSITION_PROFILE,
  SYNTHETIC_UNICAMERAL_STATE_PROFILE,
} from "./__fixtures__/synthetic-profiles.js";
import type { JurisdictionProfile } from "./types.js";
import { validateJurisdictionProfile } from "./validator.js";

describe("Jurisdiction Profile Schema & Validator Foundation", () => {
  describe("Synthetic Fixture Validation", () => {
    it("validates the synthetic bicameral state profile cleanly", () => {
      const result = validateJurisdictionProfile(
        SYNTHETIC_BICAMERAL_STATE_PROFILE,
      );
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
      expect(SYNTHETIC_BICAMERAL_STATE_PROFILE.isSynthetic).toBe(true);
    });

    it("validates the synthetic unicameral state profile cleanly", () => {
      const result = validateJurisdictionProfile(
        SYNTHETIC_UNICAMERAL_STATE_PROFILE,
      );
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
      expect(SYNTHETIC_UNICAMERAL_STATE_PROFILE.isSynthetic).toBe(true);
    });

    it("validates the synthetic absent/unknown profile cleanly", () => {
      const result = validateJurisdictionProfile(
        SYNTHETIC_ABSENT_UNKNOWN_PROFILE,
      );
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
      expect(SYNTHETIC_ABSENT_UNKNOWN_PROFILE.isSynthetic).toBe(true);
    });

    it("validates the synthetic historical transition profile cleanly", () => {
      const result = validateJurisdictionProfile(
        SYNTHETIC_HISTORICAL_TRANSITION_PROFILE,
      );
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
      expect(SYNTHETIC_HISTORICAL_TRANSITION_PROFILE.isSynthetic).toBe(true);
    });
  });

  describe("SourcedValue State Discrimination & Protection", () => {
    it("distinguishes KNOWN, UNKNOWN, NOT_APPLICABLE, CONFLICTING, and HISTORICAL states", () => {
      expect(
        SYNTHETIC_BICAMERAL_STATE_PROFILE.identity.officialName.state,
      ).toBe("KNOWN");
      expect(
        SYNTHETIC_ABSENT_UNKNOWN_PROFILE.identity.postalAbbreviation.state,
      ).toBe("UNKNOWN");
      expect(
        SYNTHETIC_ABSENT_UNKNOWN_PROFILE.institutions
          .legislativeChamberStructure.state,
      ).toBe("NOT_APPLICABLE");
      expect(
        SYNTHETIC_HISTORICAL_TRANSITION_PROFILE.institutions
          .legislativeChamberStructure.state,
      ).toBe("HISTORICAL");
    });

    it("rejects UNKNOWN states that attempt coercion to false, 0, or empty string", () => {
      const invalidCoercedProfile = JSON.parse(
        JSON.stringify(SYNTHETIC_ABSENT_UNKNOWN_PROFILE),
      );
      // Attempt to attach coerced false to UNKNOWN
      invalidCoercedProfile.identity.postalAbbreviation = {
        state: "UNKNOWN",
        value: false,
        reason: "Coerced to false",
      };

      const result = validateJurisdictionProfile(invalidCoercedProfile);
      expect(result.isValid).toBe(false);
      expect(
        result.errors.some((e) => e.code === "UNKNOWN_COERCION_ATTEMPT"),
      ).toBe(true);
    });

    it("validates CONFLICTING state when multiple source claims are provided", () => {
      const conflictingProfile: JurisdictionProfile = {
        ...SYNTHETIC_BICAMERAL_STATE_PROFILE,
        profileId: "profile:conflicting-test",
        identity: {
          ...SYNTHETIC_BICAMERAL_STATE_PROFILE.identity,
          officialName: {
            state: "CONFLICTING",
            claims: [
              {
                claim: "State of Alpha Primary Record",
                provenance: (
                  SYNTHETIC_BICAMERAL_STATE_PROFILE.identity
                    .officialName as Extract<
                    typeof SYNTHETIC_BICAMERAL_STATE_PROFILE.identity.officialName,
                    { state: "KNOWN" }
                  >
                ).provenance,
              },
              {
                claim: "Commonwealth of Alpha Secondary Archive",
                provenance: {
                  ...(
                    SYNTHETIC_BICAMERAL_STATE_PROFILE.identity
                      .officialName as Extract<
                      typeof SYNTHETIC_BICAMERAL_STATE_PROFILE.identity.officialName,
                      { state: "KNOWN" }
                    >
                  ).provenance,
                  sourceId: "src-secondary-archive",
                  locator: "Archive Vol 2, p. 14",
                },
              },
            ],
            conflictNotes:
              "Official gazette vs secondary historical monograph.",
          },
        },
      };

      const result = validateJurisdictionProfile(conflictingProfile);
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it("rejects CONFLICTING state with fewer than 2 claims", () => {
      const invalidConflictingProfile = JSON.parse(
        JSON.stringify(SYNTHETIC_BICAMERAL_STATE_PROFILE),
      );
      const knownProvenance = (
        SYNTHETIC_BICAMERAL_STATE_PROFILE.identity.officialName as Extract<
          typeof SYNTHETIC_BICAMERAL_STATE_PROFILE.identity.officialName,
          { state: "KNOWN" }
        >
      ).provenance;

      invalidConflictingProfile.identity.officialName = {
        state: "CONFLICTING",
        claims: [
          {
            claim: "Single Claim",
            provenance: knownProvenance,
          },
        ],
      };

      const result = validateJurisdictionProfile(invalidConflictingProfile);
      expect(result.isValid).toBe(false);
      expect(
        result.errors.some((e) => e.code === "CONFLICTING_CLAIMS_COUNT"),
      ).toBe(true);
    });
  });

  describe("Provenance & Structural Validation Rules", () => {
    it("rejects invalid URLs in provenance metadata", () => {
      const invalidUrlProfile = JSON.parse(
        JSON.stringify(SYNTHETIC_BICAMERAL_STATE_PROFILE),
      );
      invalidUrlProfile.identity.officialName.provenance.authoritativeUrl =
        "invalid-url-string-without-scheme";

      const result = validateJurisdictionProfile(invalidUrlProfile);
      expect(result.isValid).toBe(false);
      expect(result.errors.some((e) => e.code === "INVALID_URL")).toBe(true);
    });

    it("rejects missing provenance locators", () => {
      const missingLocatorProfile = JSON.parse(
        JSON.stringify(SYNTHETIC_BICAMERAL_STATE_PROFILE),
      );
      if (
        typeof missingLocatorProfile.identity.officialName === "object" &&
        missingLocatorProfile.identity.officialName !== null &&
        "provenance" in missingLocatorProfile.identity.officialName
      ) {
        (
          missingLocatorProfile.identity.officialName as {
            provenance: { locator: string };
          }
        ).provenance.locator = "";
      }

      const result = validateJurisdictionProfile(missingLocatorProfile);
      expect(result.isValid).toBe(false);
      expect(result.errors.some((e) => e.code === "MISSING_PROVENANCE")).toBe(
        true,
      );
    });

    it("rejects legislative chamber model mismatches (e.g. BICAMERAL with 1 chamber)", () => {
      const mismatchProfile = JSON.parse(
        JSON.stringify(SYNTHETIC_BICAMERAL_STATE_PROFILE),
      );
      mismatchProfile.institutions.legislativeChamberStructure.value.chambers.pop(); // Remove 1 chamber from BICAMERAL

      const result = validateJurisdictionProfile(mismatchProfile);
      expect(result.isValid).toBe(false);
      expect(
        result.errors.some((e) => e.code === "CHAMBER_MODEL_MISMATCH"),
      ).toBe(true);
    });
  });
});
