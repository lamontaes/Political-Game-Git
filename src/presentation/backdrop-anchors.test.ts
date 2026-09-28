import { describe, expect, it } from "vitest";
import manifest from "../../art/backdrops/manifest.json" with { type: "json" };
import staging from "../../art/backdrops/staging.json" with { type: "json" };
import {
  backdropHeroSpot,
  backdropStaging,
  spotDepth,
  spotFigure,
  type PlaceStaging,
  type StagingSpot,
} from "./backdrop-people";

/**
 * THE PEOPLE ANCHORS ON EVERY PLACE PICTURE.
 *
 * Every place picture marks where people can stand, sit, speak and lean
 * (art/backdrops/staging.json). These are the rules every place keeps, so a
 * person put on a spot lands on the floor at a believable size.
 */

const PLACES = [
  ...new Set(manifest.backdrops.map((backdrop) => backdrop.place)),
].sort();
const STAGES = staging.places as unknown as Readonly<
  Record<string, PlaceStaging>
>;
const POSES = new Set(["stand", "sit", "podium", "lean"]);
const FACINGS = new Set(["viewer", "left", "right"]);
const AUDIENCES = new Set(["viewer", "left", "right", "away"]);
/** Places whose picture is a whole building or street from outside. */
const EXTERIOR =
  /^(state-capitol-|us-capitol-exterior|city-hall-exterior|county-courthouse|main-street|college-quad|park|construction-site|door-knocking-)/;
/** Where a seated body's seat sits on the figure canvas (feet 791, seat 547, canvas 808). */
const SEAT_OF_CANVAS = (791 - 547) / 808;

function floorOf(spot: StagingSpot): string {
  return spot.floor ?? "";
}

describe("people anchors on every place picture", () => {
  it("covers every place that has a picture, and only those", () => {
    expect(Object.keys(STAGES).sort()).toEqual(PLACES);
  });

  it.each(PLACES)("%s: every spot is on a floor inside the picture", (place) => {
    const stage = backdropStaging(place)!;
    expect(stage.horizonY).toBeGreaterThan(0);
    expect(stage.horizonY).toBeLessThan(100);
    expect(stage.metersPercent).toBeGreaterThan(0);
    expect(stage.spots.length).toBeGreaterThanOrEqual(3);
    for (const spot of stage.spots) {
      // Inside the picture, and below eye level: on a floor, never in the sky.
      expect(spot.x).toBeGreaterThan(0);
      expect(spot.x).toBeLessThan(100);
      expect(spot.y).toBeGreaterThan(stage.horizonY);
      expect(spot.y).toBeLessThanOrEqual(100);
      expect(POSES.has(spot.pose ?? "stand")).toBe(true);
      expect(FACINGS.has(spot.facing ?? "viewer")).toBe(true);
      if (spot.floor !== undefined)
        expect(stage.floors?.[spot.floor]).toBeGreaterThan(0);
      const figure = spotFigure(stage, spot);
      // A person reads as a person: not a speck, not taller than the picture.
      expect(figure.heightPercent).toBeGreaterThan(2);
      expect(figure.heightPercent).toBeLessThan(140);
      if (spot.clipBelowY !== undefined) {
        // The desk or counter edge falls across the person, not above them.
        expect(spot.clipBelowY).toBeGreaterThan(figure.topPercent);
        expect(spot.clipBelowY).toBeLessThanOrEqual(spot.y);
      }
    }
  });

  it.each(PLACES)("%s: seats, podiums and the hero spot", (place) => {
    const stage = backdropStaging(place)!;
    for (const spot of stage.spots) {
      if (spot.pose === "sit") {
        // The painted seat is where a seated body's seat lands.
        expect(spot.seatY).toBeDefined();
        const figure = spotFigure(stage, spot);
        const seatAbove = (spot.y - spot.seatY!) / figure.heightPercent;
        expect(seatAbove).toBeGreaterThan(SEAT_OF_CANVAS * 0.4);
        expect(seatAbove).toBeLessThan(SEAT_OF_CANVAS * 1.8);
      }
      if (spot.pose === "podium")
        expect(AUDIENCES.has(spot.audience ?? "")).toBe(true);
    }
    const heroes = stage.spots.filter((spot) => spot.hero === true);
    expect(heroes).toHaveLength(1);
    const hero = backdropHeroSpot(place)!;
    // The main character stands whole inside the picture, large enough to
    // read: a building exterior shows the whole building, so its hero is
    // small; a room's hero is a real presence.
    expect(hero.figure.topPercent).toBeGreaterThanOrEqual(0);
    expect(hero.figure.heightPercent).toBeGreaterThan(
      EXTERIOR.test(place) ? 3 : 15,
    );
  });

  it.each(PLACES)("%s: people shrink with distance", (place) => {
    const stage = backdropStaging(place)!;
    // A raised floor is nearer eye level, so a person on it is larger for
    // the same foot line than on the main floor.
    for (const meters of Object.values(stage.floors ?? {}))
      expect(meters).toBeGreaterThan(stage.metersPercent);
    const byFloor = new Map<string, StagingSpot[]>();
    for (const spot of stage.spots)
      byFloor.set(floorOf(spot), [
        ...(byFloor.get(floorOf(spot)) ?? []),
        spot,
      ]);
    for (const spots of byFloor.values()) {
      const sorted = [...spots].sort((a, b) => a.y - b.y);
      for (let i = 1; i < sorted.length; i += 1) {
        const far = sorted[i - 1]!;
        const near = sorted[i]!;
        // Lower in the picture is nearer: taller, and drawn over the farther.
        expect(spotFigure(stage, near).heightPercent).toBeGreaterThanOrEqual(
          spotFigure(stage, far).heightPercent,
        );
        if (near.y - far.y >= 5)
          expect(spotDepth(near)).toBeGreaterThanOrEqual(spotDepth(far));
      }
    }
  });
});
