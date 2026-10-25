import { describe, expect, it } from "vitest";
import { figureOn, pickLook, placeSeated, type Figure } from "./whole-figures";
import { backdropStaging } from "./staging";
import type { CoreState } from "../core2/types";
import staging from "../../art/backdrops/staging.json" with { type: "json" };

const core = {
  date: "2026-10-13",
  people: new Map(),
  jobs: new Map(),
  organizations: new Map(),
} as unknown as CoreState;
const standing = pickLook(
  core,
  { id: "person:seated", birthDate: "1984-05-02", official: false },
  "council-chamber",
)!;
// A seated figure framed as the art request asks: same look, 1000 px canvas,
// hip line at row 560.
const seated: Figure = {
  ...standing,
  file: "seated-fixture.png",
  pose: "sit",
  seatY: 560,
  width: 520,
  height: 1000,
  footY: 990,
};

// A random place with seats each run, named so a failure can be replayed.
const places = Object.keys(staging.places).filter((place) =>
  backdropStaging(place)!.spots.some((spot) => spot.pose === "sit"),
);
const place =
  process.env.PEOPLE_TEST_PLACE ??
  places[Math.floor(Math.random() * places.length)]!;

describe(`seated people at ${place}`, () => {
  const stage = backdropStaging(place)!;
  const seats = stage.spots.filter((spot) => spot.pose === "sit");

  it("puts the hip line on the seat cushion, centered on the seat", () => {
    for (const spot of seats) {
      const { figure } = placeSeated(seated, standing, "adult", stage, spot);
      const scale = figure.heightPercent / seated.height;
      expect(figure.topPercent + 560 * scale).toBeCloseTo(spot.seatY!, 6);
      expect(figure.leftPercent + figure.widthPercent / 2).toBeCloseTo(
        spot.x,
        6,
      );
      // Behind a desk: cut off at the desk, and no shadow on a hidden floor.
      if (spot.clipBelowY !== undefined && spot.clipBandEndY === undefined) {
        expect(figure.clipBelowPercent).toBe(spot.clipBelowY);
        expect(figure.shadow).toBeNull();
      } else expect(figure.shadow).not.toBeNull();
    }
  });

  it("seats each person as their own look and build, from the v2 seated figures", () => {
    for (const spot of seats) {
      const seatedNow = figureOn(standing, "adult", place, stage, spot)!;
      expect(seatedNow.url).toMatch(/^\/art\/people-engine\/v2\/figures\/v2-/);
    }
  });
});
