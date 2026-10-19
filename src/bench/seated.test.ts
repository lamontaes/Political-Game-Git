import { describe, expect, it } from "vitest";
import {
  figureOn,
  placeSeated,
  seatKindOf,
  type Figure,
} from "./whole-figures";
import { backdropStaging } from "./staging";
import manifest from "../../art/people-whole/manifest.json" with { type: "json" };
import staging from "../../art/backdrops/staging.json" with { type: "json" };

const standing = (manifest.figures as Figure[]).find(
  (row) => row.angle === "three-quarter" && row.ageBand === "adult",
)!;
// A seated figure framed as the art request asks: same look, 1000 px canvas,
// hip line at row 560.
const seated: Figure = {
  ...standing,
  file: "seated-fixture.png",
  pose: "sit",
  seat: "office-chair",
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

  it("draws nobody on a seat until that look's seated art exists", () => {
    for (const spot of seats)
      expect(figureOn(standing, "adult", place, stage, spot)).toBeNull();
  });
});

describe("what kind of chair a seat is", () => {
  const spot = (place: string, group: string) =>
    backdropStaging(place)!.spots.find((row) => row.group === group)!;
  it("reads the owner's rooms right", () => {
    expect(seatKindOf("oval-office", spot("oval-office", "desk"))).toBe(
      "office-chair",
    );
    expect(seatKindOf("oval-office", spot("oval-office", "sofas"))).toBe(
      "couch",
    );
    expect(seatKindOf("council-chamber", spot("council-chamber", "dais"))).toBe(
      "dais-chair",
    );
    const senate = backdropStaging("us-senate-floor")!.spots.find(
      (row) => row.pose === "sit" && row.facing === "away",
    )!;
    expect(seatKindOf("us-senate-floor", senate)).toBe("legislative-seat");
  });
});
