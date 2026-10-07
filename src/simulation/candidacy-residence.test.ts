import nominationRules from "../../data/research/elections/party-nomination-rules-2026.json" with { type: "json" };
import { smallWorld } from "../../tests/fixtures/small-world";
import { describe, expect, it } from "vitest";
import {
  candidacyEligibility,
  candidacyResidenceMatches,
  searchLifePlaces,
  stateCandidacyPack,
  stateJurisdictionForKey,
} from "./index";

describe("candidacy residence scope", () => {
  it("matches a locality resident to the statewide filing jurisdiction across all 56 jurisdictions", () => {
    const jurisdictions = Object.keys(nominationRules.places).sort();
    expect(jurisdictions).toHaveLength(56);

    for (let index = 0; index < jurisdictions.length; index += 1) {
      const key = jurisdictions[index]!;
      const locality = searchLifePlaces("", 100_000, {
        stateJurisdictionKey: key,
        scope: "locality",
      })[0];
      const state = stateJurisdictionForKey(key);
      const otherKey = jurisdictions[(index + 1) % jurisdictions.length]!;
      const otherLocality = searchLifePlaces("", 100_000, {
        stateJurisdictionKey: otherKey,
        scope: "locality",
      })[0];
      const otherState = stateJurisdictionForKey(otherKey);

      expect(locality).toBeDefined();
      expect(state).not.toBeNull();
      expect(otherLocality).toBeDefined();
      expect(otherState).not.toBeNull();
      if (!locality || !state || !otherLocality || !otherState) continue;

      expect(
        candidacyResidenceMatches(
          locality.context.jurisdiction.id,
          state.id,
          key,
          "statewide",
        ),
      ).toBe(true);
      expect(
        candidacyResidenceMatches(
          otherLocality.context.jurisdiction.id,
          state.id,
          key,
          "statewide",
        ),
      ).toBe(false);
    }
  });

  it("does not block a locality resident from a state-house filing in the same state", () => {
    const stateKey = Object.keys(nominationRules.places).find((key) =>
      stateCandidacyPack(key)?.offices.some((office) =>
        office.officeKey.endsWith(":house"),
      ),
    )!;
    const fixture = smallWorld({ place: stateKey, seed: "bg-51-locality" });
    const state = stateJurisdictionForKey(stateKey)!;
    const pack = stateCandidacyPack(stateKey)!;
    const office = pack.offices.find((entry) =>
      entry.officeKey.endsWith(":house"),
    )!;
    const personId = fixture.personId;
    const homeJurisdictionId =
      fixture.world.people[personId]!.homeJurisdictionId;
    expect(homeJurisdictionId).not.toBe(state.id);

    const eligibility = candidacyEligibility(fixture.world, {
      personId,
      jurisdictionId: fixture.jurisdictionId,
      officeKey: office.officeKey,
      alreadyACandidate: false,
    });

    expect(
      eligibility.blocks.some((block) => block.kind === "lives-elsewhere"),
      JSON.stringify({
        stateKey,
        stateId: state.id,
        filingJurisdictionId: fixture.jurisdictionId,
        homeJurisdictionId,
        blocks: eligibility.blocks,
      }),
    ).toBe(false);
  });

  it("keeps local filings within the exact local jurisdiction", () => {
    const locality = searchLifePlaces("", 100_000, {
      stateJurisdictionKey: "US-KY",
      scope: "locality",
    })[0]!;
    const siblingLocality = searchLifePlaces("", 100_000, {
      stateJurisdictionKey: "US-KY",
      scope: "locality",
    }).find(
      (place) =>
        place.context.jurisdiction.id !== locality.context.jurisdiction.id,
    )!;
    const state = stateJurisdictionForKey("US-KY")!;

    expect(
      candidacyResidenceMatches(
        locality.context.jurisdiction.id,
        locality.context.jurisdiction.id,
        "US-KY",
        "local",
      ),
    ).toBe(true);
    expect(
      candidacyResidenceMatches(
        siblingLocality.context.jurisdiction.id,
        locality.context.jurisdiction.id,
        "US-KY",
        "local",
      ),
    ).toBe(false);
    expect(state.id).not.toBe(locality.context.jurisdiction.id);
  });
});
