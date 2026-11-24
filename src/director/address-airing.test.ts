import { describe, expect, it } from "vitest";
import { corePlaceByKey } from "../core2/place-lookup";
import type { CoreState } from "../core2/types";
import { addressAiring } from "./address-airing";

// Three pinned places in three zones (geoids drawn at seed 86470 for
// play-opening-lands-at-830-pm) and the territories that sit far from Eastern.
const OPENING_DAY = { date: "2025-01-20" } as unknown as CoreState;
const airsAt = (geoid: string) => {
  const place = corePlaceByKey(geoid);
  expect(place, geoid).not.toBeNull();
  return addressAiring(OPENING_DAY, place!.context.jurisdiction.id);
};

describe("the opening address airs at one Eastern hour, read on the player's clock", () => {
  it("is 8 p.m. in Mason TX, 9 p.m. in Pratt WV and 7 p.m. in Springhill MT", () => {
    expect(airsAt("4846968")).toEqual({
      minuteOfDay: 20 * 60,
      shiftsDay: false,
    });
    expect(airsAt("5465356")).toEqual({
      minuteOfDay: 21 * 60,
      shiftsDay: false,
    });
    expect(airsAt("3070375")).toEqual({
      minuteOfDay: 19 * 60,
      shiftsDay: false,
    });
  });
  it("falls back to the Eastern hour for a place with no clock", () => {
    expect(addressAiring(OPENING_DAY, "no-such-place")).toEqual({
      minuteOfDay: 21 * 60,
      shiftsDay: false,
    });
  });
});
