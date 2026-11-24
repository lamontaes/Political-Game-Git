import { describe, expect, it } from "vitest";
import table from "./data/world/community-events.json" with { type: "json" };
import { drawPlace } from "../../scripts/core2-year/place";
import { placeLocalities, placeStateKeys } from "./places";
import {
  COMMUNITY_PLACE_TYPES,
  communityEventsFor,
  communityPlaceType,
  communityPlaceTypeForPopulation,
} from "./community-events-table";

describe("community events by place type", () => {
  it("tags every event SOURCED or ESTIMATED with a source, and a scale for each of its types", () => {
    for (const event of table.events) {
      expect(["SOURCED", "ESTIMATED"]).toContain(event.tag);
      expect(event.source.length).toBeGreaterThan(20);
      for (const type of event.types) {
        expect(COMMUNITY_PLACE_TYPES).toContain(type);
        expect(
          (event.scaleByType as Record<string, number>)[type],
        ).toBeGreaterThan(0);
      }
    }
  });

  it("resolves every locality of all 56 jurisdictions to a type that holds events", () => {
    const keys = placeStateKeys();
    expect(keys.length).toBe(56);
    for (const state of keys) {
      const rows = placeLocalities(state);
      expect(rows.length, state).toBeGreaterThan(0);
      for (const row of rows) {
        const type = communityPlaceType(row.key);
        expect(COMMUNITY_PLACE_TYPES, row.key).toContain(type);
        expect(communityEventsFor(type).length, row.key).toBeGreaterThan(0);
      }
    }
  });

  it("gives every type events and sizes a population into the right band", () => {
    for (const type of COMMUNITY_PLACE_TYPES)
      expect(communityEventsFor(type).length, type).toBeGreaterThan(0);
    expect(communityPlaceTypeForPopulation(0)).toBe("hamlet");
    expect(communityPlaceTypeForPopulation(8_000_000)).toBe("big-city");
  });

  it.each(["community-events-a", "community-events-b"])(
    "a drawn place holds dated or season-ruled events (%s)",
    (seed) => {
      const draw = drawPlace(seed, "community-events");
      const type = communityPlaceType(draw.key);
      const events = communityEventsFor(type);
      expect(
        events.length,
        `${draw.name} (${draw.key}) seed ${draw.seed}`,
      ).toBeGreaterThan(0);
      for (const event of events) expect(event.rule.kind).toBeTruthy();
    },
  );
});
