import { describe, expect, it } from "vitest";

import {
  deserializeWorld,
  lifePlaceStateIdentities,
  serializeWorld,
} from "../simulation";
import { DEFAULT_NEW_GAME_SETUP, newGameSetupProblems } from "./new-game";
import { decodeReplayDescriptor } from "./new-game-identity";
import {
  ORDINARY_GEOGRAPHY_JOURNEYS,
  createExplicitGeographyLife,
  explicitNewGameSetup,
  freshNewGameSetup,
  kentuckyLexingtonRegressionSetup,
  legacyReplayNewGameSetup,
  ordinaryControlCapabilities,
  reloadCreatedGeographyLife,
  requireExplicitPlaceKey,
  requireLocalityInState,
  resolveExplicitCreatorHometown,
  resolvePlayGeography,
  sampledProofLocalityForState,
} from "./new-game-geography";
import {
  creatorLocationFromPlaceKey,
  emptyCreatorLocation,
  selectCreatorPlace,
  selectCreatorState,
  withCreatorLocation,
} from "./creator-location";
import { searchLifePlaces } from "../simulation";

describe("New-game geography is chosen, not inherited", () => {
  it("keeps the legacy replay default without treating it as a fresh selection", () => {
    expect(DEFAULT_NEW_GAME_SETUP.placeKey).toBe("kentucky");
    expect(freshNewGameSetup("fresh-creator").placeKey).toBe("");
    expect(newGameSetupProblems(freshNewGameSetup("fresh-creator"))).toEqual(
      expect.arrayContaining([expect.objectContaining({ field: "placeKey" })]),
    );
    expect(() => requireExplicitPlaceKey("")).toThrow(
      /Lexington is not assumed/,
    );
    const replayed = legacyReplayNewGameSetup({ seed: "old-replay" });
    expect(replayed.placeKey).toBe("kentucky");
    const geography = resolvePlayGeography(
      replayed.placeKey,
      "legacy-replay-default",
    );
    expect(geography.worldOrigin).toBe("legacy-replay-default");
    expect(geography.selectedStateJurisdictionKey).toBe("US-KY");
  });

  it("records Lexington as a named Kentucky regression, not the unnamed default", () => {
    const setup = kentuckyLexingtonRegressionSetup({ seed: "ky-regression" });
    const geography = resolvePlayGeography(
      setup.placeKey,
      "kentucky-regression-fixture",
    );
    expect(geography.selectedLocalityKey).toBe("lexington-fayette");
    expect(geography.selectedStateJurisdictionKey).toBe("US-KY");
    expect(geography.legislativeRulePackId).toBe("us-ky-general-assembly-v1");
    expect(geography.legislativeScenarioKey).toBeNull();
    expect(geography.candidacyPackId).toBe(
      "us-ky-general-assembly-v1:candidacy",
    );
    expect(geography.discoveredOfficeKeys.length).toBeGreaterThan(0);
    expect(geography.worldOrigin).toBe("kentucky-regression-fixture");
    expect(geography.placeSourceSha256).toMatch(/^[0-9a-f]{64}$/);
  });

  it("refuses a missing or inferred hometown in the creator helper", () => {
    expect(() => resolveExplicitCreatorHometown({})).toThrow(/not assumed/);
    expect(() =>
      resolveExplicitCreatorHometown({ place: "Lexington" }),
    ).toThrow(/not assumed/);
    expect(() => resolveExplicitCreatorHometown({ place: "Kentucky" })).toThrow(
      /not a hometown/,
    );
    expect(() => resolveExplicitCreatorHometown({ state: "Nebraska" })).toThrow(
      /not a hometown/,
    );
    expect(
      resolveExplicitCreatorHometown({
        state: "Kentucky",
        place: "Lexington",
      }),
    ).toMatchObject({
      usps: "KY",
      statewide: false,
      townMatch: "Lexington",
    });
    expect(
      resolveExplicitCreatorHometown({
        state: "Nebraska",
        statewide: true,
      }),
    ).toMatchObject({ usps: "NE", statewide: true });
  });

  it("clears an incompatible town on state change and keeps a same-state replacement", () => {
    const lexington = creatorLocationFromPlaceKey("lexington-fayette");
    const bowlingGreen = searchLifePlaces("Bowling Green", 8, {
      stateJurisdictionKey: "US-KY",
      scope: "locality",
    }).find((place) => /^Bowling Green,/i.test(place.displayName))!;
    const replaced = selectCreatorPlace(lexington, bowlingGreen);
    expect(replaced.placeKey).toBe(bowlingGreen.key);
    expect(replaced.stateJurisdictionKey).toBe("US-KY");
    expect(selectCreatorState(replaced, "US-CA")).toEqual({
      stateJurisdictionKey: "US-CA",
      placeKey: null,
    });
    const empty = withCreatorLocation(
      { ...DEFAULT_NEW_GAME_SETUP, seed: "geo", placeKey: "kentucky" },
      emptyCreatorLocation(),
    );
    expect(empty.placeKey).toBe("");
  });
});

describe("Creation and serialization across state and DC contexts", () => {
  it.each(lifePlaceStateIdentities())(
    "builds and reloads a real locality in $name without substituting Kentucky",
    (state) => {
      const place = sampledProofLocalityForState(state.jurisdictionKey);
      const created = createExplicitGeographyLife({
        placeKey: place.key,
        seed: `geo-table-${state.usps}`,
        startAge: 30,
        startKind: "custom",
        household: "lives-alone",
        depth: "summarize-earlier-life",
        worldOrigin: "explicit-creator",
      });
      expect(created.geography.selectedStateJurisdictionKey).toBe(
        state.jurisdictionKey,
      );
      expect(created.geography.selectedLocalityKey).toBe(place.key);
      expect(created.geography.worldOrigin).toBe("explicit-creator");
      expect(created.game.place.stateJurisdictionKey).toBe(
        state.jurisdictionKey,
      );
      const replayed = decodeReplayDescriptor(created.replay);
      expect(replayed.placeKey).toBe(place.key);
      const reloaded = reloadCreatedGeographyLife(created);
      expect(serializeWorld(reloaded.game.world)).toBe(created.serialized);
      expect(reloaded.geography.selectedLocalityKey).toBe(place.key);
      expect(reloaded.geography.legislativeRulePackId).toBe(
        created.geography.legislativeRulePackId,
      );
      if (state.usps !== "KY") {
        expect(created.geography.legislativeScenarioKey).not.toBe("kentucky");
        expect(created.game.place.context.jurisdiction.id).not.toBe(
          resolvePlayGeography("lexington-fayette").resolvedJurisdictionId,
        );
      }
    },
    20_000,
  );
});

describe("Ordinary-control journeys in named states", () => {
  it.each(ORDINARY_GEOGRAPHY_JOURNEYS)(
    "keeps $usps / $town identity, offices and unavailable governing distinct from Kentucky",
    (journey) => {
      const state = lifePlaceStateIdentities().find(
        (entry) => entry.usps === journey.usps,
      )!;
      const place = requireLocalityInState(state.jurisdictionKey, journey.town);
      const created = createExplicitGeographyLife({
        placeKey: place.key,
        seed: `geo-journey-${journey.usps}`,
        startAge: 34,
        startKind: "normal",
        worldOrigin: journey.origin,
      });
      expect(created.geography.selectedStateJurisdictionKey).toBe(
        state.jurisdictionKey,
      );
      expect(created.geography.selectedLocalityDisplayName).toMatch(
        new RegExp(journey.town, "i"),
      );
      expect(created.geography.worldOrigin).toBe("explicit-creator");
      const controls = ordinaryControlCapabilities(created.game);
      expect(controls.homePlaceKey).toBe(place.key);
      expect(controls.homeJurisdictionId).toBe(
        created.geography.resolvedJurisdictionId,
      );
      expect(controls.legislation).toBe(false);
      expect(controls.legislativeScenarioKey).toBeNull();
      expect(controls.office).toBe(false);
      expect(controls.withheldLegislation).not.toMatch(/Kentucky/i);
      if (journey.usps === "CA") {
        expect(created.geography.legislativeRulePackId).toBeNull();
        expect(created.geography.candidacyPackId).toBeNull();
        expect(created.geography.discoveredOfficeKeys).toEqual([]);
      } else {
        expect(created.geography.legislativeRulePackId).toMatch(
          new RegExp(`us-${journey.usps.toLowerCase()}-`),
        );
        expect(created.geography.legislativeRulePackId).not.toBe(
          "us-ky-general-assembly-v1",
        );
        expect(created.geography.discoveredOfficeKeys.length).toBeGreaterThan(
          0,
        );
        expect(created.geography.candidacyPackId).not.toBe(
          "us-ky-general-assembly-v1:candidacy",
        );
      }
      const reloaded = deserializeWorld(created.serialized);
      expect(
        reloaded.jurisdictions[created.geography.resolvedJurisdictionId]?.id,
      ).toBe(created.geography.resolvedJurisdictionId);
      expect(
        explicitNewGameSetup({
          placeKey: place.key,
          seed: "named",
        }).placeKey,
      ).toBe(place.key);
    },
    20_000,
  );
});
