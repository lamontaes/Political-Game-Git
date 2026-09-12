import { describe, expect, it } from "vitest";

import {
  creatorLocationFromPlaceKey,
  creatorLocationIsReady,
  creatorPlaceListOpen,
  emptyCreatorLocation,
  selectCreatorPlace,
  selectCreatorState,
  withCreatorLocation,
} from "./creator-location";
import { DEFAULT_NEW_GAME_SETUP } from "./new-game";
import {
  lifePlaceByKey,
  lifePlaceStateIdentities,
  searchLifePlaces,
} from "../simulation";

const seeded = { ...DEFAULT_NEW_GAME_SETUP, seed: "creator-location" };

describe("Creator location is chosen, not inherited", () => {
  it("does not treat the default Kentucky setup key as a fresh selection", () => {
    expect(DEFAULT_NEW_GAME_SETUP.placeKey).toBe("kentucky");
    expect(emptyCreatorLocation()).toEqual({
      stateJurisdictionKey: null,
      placeKey: null,
    });
    expect(creatorLocationIsReady(emptyCreatorLocation())).toBe(false);
    expect(lifePlaceByKey(emptyCreatorLocation().placeKey ?? "")).toBeNull();
  });

  it("keeps an explicit previously selected place, including statewide replay", () => {
    const lexington = creatorLocationFromPlaceKey("lexington-fayette");
    expect(lexington).toEqual({
      stateJurisdictionKey: "US-KY",
      placeKey: "lexington-fayette",
    });
    expect(creatorLocationIsReady(lexington)).toBe(true);

    const statewide = creatorLocationFromPlaceKey("kentucky");
    expect(statewide.placeKey).toBe("kentucky");
    expect(creatorLocationIsReady(statewide, "normal")).toBe(false);
    expect(creatorLocationIsReady(statewide, "custom")).toBe(true);
  });

  it("filters localities by canonical state identity, not name substrings", () => {
    const alabama = searchLifePlaces("lex", 20, {
      stateJurisdictionKey: "US-AL",
      scope: "locality",
    });
    expect(alabama.length).toBeGreaterThan(0);
    expect(
      alabama.every((place) => place.stateJurisdictionKey === "US-AL"),
    ).toBe(true);
    expect(
      alabama.some((place) => place.stateJurisdictionKey === "US-KY"),
    ).toBe(false);
    expect(alabama.some((place) => place.scope === "state")).toBe(false);

    const kentucky = searchLifePlaces("lex", 20, {
      stateJurisdictionKey: "US-KY",
      scope: "locality",
    });
    expect(kentucky.some((place) => place.key === "lexington-fayette")).toBe(
      true,
    );
    expect(kentucky.some((place) => place.key === "kentucky")).toBe(false);
    expect(
      kentucky.every((place) => place.stateJurisdictionKey === "US-KY"),
    ).toBe(true);
  });

  it("lists a state's localities with an empty query and still omits the statewide row", () => {
    const alabama = searchLifePlaces("", 12, {
      stateJurisdictionKey: "US-AL",
      scope: "locality",
    });
    expect(alabama.length).toBeGreaterThan(0);
    expect(alabama.every((place) => place.scope === "locality")).toBe(true);
    expect(
      alabama.every((place) => place.stateJurisdictionKey === "US-AL"),
    ).toBe(true);

    const identities = lifePlaceStateIdentities();
    expect(
      identities.find((state) => state.jurisdictionKey === "US-AL")?.name,
    ).toBe("Alabama");
    expect(
      identities.find((state) => state.usps === "KY")?.jurisdictionKey,
    ).toBe("US-KY");
  });

  it("keeps a committed town until a deliberate replacement, and opens the list only then", () => {
    expect(creatorPlaceListOpen(null, false)).toBe(true);
    expect(creatorPlaceListOpen("lexington-fayette", false)).toBe(false);
    expect(creatorPlaceListOpen("lexington-fayette", true)).toBe(true);

    const lexington = creatorLocationFromPlaceKey("lexington-fayette");
    const bowlingGreen = searchLifePlaces("Bowling", 8, {
      stateJurisdictionKey: "US-KY",
      scope: "locality",
    }).find((place) => /^Bowling Green,/i.test(place.displayName))!;
    const replaced = selectCreatorPlace(lexington, bowlingGreen);
    expect(replaced.placeKey).toBe(bowlingGreen.key);
    expect(replaced.stateJurisdictionKey).toBe("US-KY");
  });

  it("clears an incompatible town when the state changes, and keeps a compatible one", () => {
    const lexington = creatorLocationFromPlaceKey("lexington-fayette");
    const afterAlabama = selectCreatorState(lexington, "US-AL");
    expect(afterAlabama).toEqual({
      stateJurisdictionKey: "US-AL",
      placeKey: null,
    });

    const stillKentucky = selectCreatorState(lexington, "US-KY");
    expect(stillKentucky.placeKey).toBe("lexington-fayette");
  });

  it("refuses a town from another state and commits only a ready draft", () => {
    const alabama = selectCreatorState(emptyCreatorLocation(), "US-AL");
    const lexington = lifePlaceByKey("lexington-fayette")!;
    expect(selectCreatorPlace(alabama, lexington)).toEqual(alabama);

    const auburn = searchLifePlaces("Auburn", 8, {
      stateJurisdictionKey: "US-AL",
      scope: "locality",
    }).find((place) => /^Auburn,/i.test(place.displayName))!;
    const chosen = selectCreatorPlace(alabama, auburn);
    expect(creatorLocationIsReady(chosen)).toBe(true);
    const committed = withCreatorLocation(seeded, chosen);
    expect(committed.placeKey).toBe(auburn.key);
    expect(committed.placeKey).not.toBe("kentucky");
  });
});
