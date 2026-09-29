import { describe, expect, it } from "vitest";

import {
  campaignLifeCatalogEntry,
  campaignLifeEntryForHost,
} from "./campaign-life-catalog";
import { placeForLocationKey } from "../presentation/place-backdrops";
import { createExplicitGeographyLife } from "../presentation/new-game-geography";

describe("where a town hall is held", () => {
  const townHall = campaignLifeCatalogEntry("town-hall");

  it("uses the school gym when a school or a civic group hosts it", () => {
    for (const classification of [
      "service:school",
      "service:private-school",
      "community:association",
      "community:voluntary",
      "community:organizing-nonprofit",
    ]) {
      expect(campaignLifeEntryForHost(townHall, classification)).toMatchObject({
        locationKey: "campaign-life:town-hall-school-gym",
        locationLabel: "School gym",
      });
    }
  });

  it("keeps the community room for a party chapter, a campaign or an unknown host", () => {
    for (const classification of [
      "membership:party-chapter",
      "custom:political-campaign",
      "community:congregation",
      null,
    ]) {
      expect(campaignLifeEntryForHost(townHall, classification)).toBe(townHall);
    }
  });

  it("changes no other form", () => {
    const meeting = campaignLifeCatalogEntry("organization-meeting");
    expect(campaignLifeEntryForHost(meeting, "service:school")).toBe(meeting);
  });

  it("shows the gym for a town hall and the community room for a meeting", () => {
    const created = createExplicitGeographyLife({
      placeKey: "2743000", // Minneapolis, Minnesota
      seed: "town-hall-venue",
      startAge: 40,
      startKind: "normal",
      depth: "summarize-earlier-life",
    });
    const { world, playerPersonId } = created.game;
    const gym = campaignLifeEntryForHost(townHall, "service:school");
    expect(placeForLocationKey(world, playerPersonId, gym.locationKey)).toBe(
      "school-gym-town-hall",
    );
    expect(
      placeForLocationKey(world, playerPersonId, townHall.locationKey),
    ).toBe("public-meeting-room");
  });
});
