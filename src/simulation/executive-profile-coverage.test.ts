import { describe, expect, it } from "vitest";
import {
  executiveAuthorityGameProfileForJurisdiction,
  executiveProfileCoverage,
  municipalExecutivePowerProfileByKey,
} from "./executive-authority-game-profile";
import { executiveRulePackForJurisdiction } from "./executive-authority-rule-packs";
import { assertExecutiveAuthorityPackIntegrity } from "./executive-authority-rules";
import { SeededRng } from "./rng";
import { STATES } from "./state-reference";
import { searchLifePlaces } from "./life-places";
import { stateExecutiveOffice } from "./nationwide-world/state-executives";
import { supportedCivicOfficesFor } from "./civic-office-definitions";
import {
  createNewGameWorld,
  DEFAULT_NEW_GAME_SETUP,
} from "../presentation/new-game";

describe("executive game-profile coverage", () => {
  it("provides an authority pack for all 56 state, District and territory executives", () => {
    const profiles = executiveProfileCoverage();

    expect(Object.keys(STATES)).toHaveLength(56);
    expect(profiles).toHaveLength(56);
    expect(
      new Set(profiles.map((profile) => profile.jurisdictionKey)).size,
    ).toBe(56);

    for (const profile of profiles) {
      expect(profile.pack).toBe(
        executiveRulePackForJurisdiction(profile.jurisdictionKey),
      );
      expect(profile.pack.jurisdictionKey).toBe(profile.jurisdictionKey);
      expect(profile.pack.unresolvedGaps.length).toBeGreaterThanOrEqual(0);
      expect(() =>
        assertExecutiveAuthorityPackIntegrity(profile.pack),
      ).not.toThrow();
      if (profile.basis === "estimated") {
        expect(profile.estimated).toBe(true);
        expect(profile.estimatedFields.length).toBeGreaterThan(0);
        expect(profile.pack.office.source.authority).toBe("game-profile");
      } else {
        expect(profile.estimated).toBe(false);
        expect(profile.estimatedFields).toEqual([]);
      }
    }
  });

  it("keeps the federal office separate from the 56 state-level profiles", () => {
    const federal = executiveAuthorityGameProfileForJurisdiction("US");

    expect(federal.basis).toBe("read");
    expect(federal.pack.office.officeKey).toBe("us-federal-president");
    expect(
      executiveProfileCoverage().some(
        (profile) => profile.jurisdictionKey === "US",
      ),
    ).toBe(false);
  });

  it("gives strong-mayor and weak-mayor forms different estimated powers", () => {
    const strong = municipalExecutivePowerProfileByKey("us-al-birmingham");
    const weak = municipalExecutivePowerProfileByKey("us-az-mesa");

    expect(strong?.model).toBe("strong-mayor");
    expect(weak?.model).toBe("weak-mayor");
    expect(strong?.powers.directsDepartmentHeads).toBe(true);
    expect(weak?.powers.directsDepartmentHeads).toBe(false);
    expect(strong?.powerBasis.model).toBe("estimated");
    expect(weak?.powerBasis.model).toBe("estimated");
  });

  it("retains an individually read mayor power and its registry source", () => {
    const profile = municipalExecutivePowerProfileByKey(
      "us-ky-lexington-fayette-ucg",
    );

    expect(profile?.powerBasis.appointsDepartmentHeads).toBe("read");
    expect(profile?.powers.appointsDepartmentHeads).toBe(true);
    expect(profile?.powerSources.appointsDepartmentHeads).not.toBeNull();
    expect(profile?.estimated).toBe(true);
  });

  it("opens an ordinary new game in a seed-drawn place with its executive profile", () => {
    const seed = "session38-executive-profile-new-game-20261006";
    const rng = new SeededRng(seed);
    const stateUsps = rng.pick(Object.keys(STATES));
    const jurisdictionKey = `US-${stateUsps}`;
    const places = searchLifePlaces("", 100, {
      scope: "locality",
      stateJurisdictionKey: jurisdictionKey,
    });
    expect(places.length).toBeGreaterThan(0);
    const chosenPlace = rng.pick(places);
    const game = createNewGameWorld({
      ...DEFAULT_NEW_GAME_SETUP,
      startKind: "normal",
      placeKey: chosenPlace.key,
      startAge: 30,
      depth: "summarize-earlier-life",
      startingLife: "ordinary-life",
      seed,
      questionnaire: "skipped",
      priors: [],
    });
    const offices = supportedCivicOfficesFor(game.place);
    const stateProfile =
      executiveAuthorityGameProfileForJurisdiction(jurisdictionKey);
    const executive = stateExecutiveOffice(stateUsps);

    expect(game.world.seed).toContain(seed);
    expect(game.place.key).toBe(chosenPlace.key);
    expect(offices.map((office) => office.jurisdictionKey)).toContain(
      jurisdictionKey,
    );
    expect(executive?.authorityPackId).toBe(stateProfile.pack.packId);
    console.log(
      JSON.stringify({
        proof: "ordinary generated new game executive profile",
        seed,
        worldId: game.world.id,
        simulationDate: game.world.currentDate,
        place: game.place.displayName,
        placeKey: game.place.key,
        jurisdictionKey,
        office: executive?.displayName,
        profileBasis: stateProfile.basis,
        authorityPackId: executive?.authorityPackId,
        source: stateProfile.pack.office.source,
      }),
    );
  });
});
