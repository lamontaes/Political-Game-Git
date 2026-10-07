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
const FACINGS = new Set(["viewer", "left", "right", "away"]);
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
  it("anchors each visible barbershop barber chair", () => {
    const seats = STAGES["barbershop"]!.spots.filter(
      (spot) => spot.group === "barber-chair",
    );
    expect(seats).toHaveLength(3);
    expect(new Set(seats.map((spot) => spot.id)).size).toBe(3);
    expect(seats.every((spot) => spot.pose === "sit")).toBe(true);
  });

  it("anchors all six rural farmhouse dining chairs", () => {
    const seats = STAGES["rural-farmhouse"]!.spots.filter(
      (spot) => spot.pose === "sit" && spot.group?.startsWith("table"),
    );
    expect(seats).toHaveLength(6);
    expect(new Set(seats.map((spot) => spot.id)).size).toBe(6);
    const farSide = seats.filter((spot) => spot.group === "table-far-side");
    expect(farSide).toHaveLength(2);
    expect(farSide.every((spot) => spot.facing === "away")).toBe(true);
  });

  it("anchors all county commission dais and pew seats", () => {
    const seats = STAGES["county-commission"]!.spots.filter(
      (spot) => spot.pose === "sit",
    );
    expect(seats).toHaveLength(11);
    expect(new Set(seats.map((spot) => spot.id)).size).toBe(11);
    expect(seats.filter((spot) => spot.group === "dais")).toHaveLength(5);
    expect(seats.filter((spot) => spot.group === "spectator-pew")).toHaveLength(
      6,
    );
    expect(seats.filter((spot) => spot.facing === "away")).toHaveLength(6);
  });

  it("anchors the council chamber dais, side table, and visible audience chairs", () => {
    const seats = STAGES["council-chamber"]!.spots.filter(
      (spot) => spot.pose === "sit",
    );
    const dais = seats.filter((spot) => spot.group === "dais");
    const audience = seats.filter((spot) => spot.role === "audience");
    expect(seats).toHaveLength(81);
    expect(new Set(seats.map((spot) => spot.id)).size).toBe(81);
    expect(dais).toHaveLength(7);
    expect(audience).toHaveLength(74);
    expect(
      audience.filter((spot) => spot.group === "public-comment-table"),
    ).toHaveLength(2);
    expect(audience.every((spot) => spot.facing === "away")).toBe(true);
    const visiblePerRow = [5, 6, 6, 6, 5, 4, 4];
    for (let row = 1; row <= visiblePerRow.length; row += 1)
      for (const side of ["left", "right"])
        expect(
          audience.filter(
            (spot) => spot.group === `audience-row-${row}-${side}`,
          ),
        ).toHaveLength(visiblePerRow[row - 1]!);
  });

  it("anchors each visible chair in the hospital waiting alcove", () => {
    const seats = STAGES["hospital-hallway"]!.spots.filter(
      (spot) => spot.group === "waiting" && spot.role === "audience",
    );
    expect(seats).toHaveLength(4);
    expect(new Set(seats.map((spot) => spot.id)).size).toBe(4);
  });

  it("anchors the visible chairs at both phone-bank tables", () => {
    const seats = STAGES["phone-bank-room"]!.spots.filter(
      (spot) => spot.pose === "sit",
    );
    expect(seats).toHaveLength(12);
    expect(new Set(seats.map((spot) => spot.id)).size).toBe(12);
    expect(seats.filter((spot) => spot.facing === "left")).toHaveLength(6);
    expect(seats.filter((spot) => spot.facing === "right")).toHaveLength(6);
  });

  it("covers every place that has a picture, and only those", () => {
    expect(Object.keys(STAGES).sort()).toEqual(PLACES);
  });

  it("anchors every visible school gym town hall audience chair", () => {
    const spots = STAGES["school-gym-town-hall"]!.spots;
    const seats = spots.filter((spot) => spot.pose === "sit");
    const audience = seats.filter((spot) => spot.role === "audience");
    expect(seats).toHaveLength(115);
    expect(audience).toHaveLength(112);
    expect(new Set(seats.map((spot) => spot.id)).size).toBe(115);
    expect(audience.filter((spot) => spot.facing === "away")).toHaveLength(112);
    for (let row = 1; row <= 8; row += 1)
      expect(
        audience.filter((spot) => spot.group === `audience-row-${row}`),
      ).toHaveLength(14);
  });

  it("anchors visible hotel ballroom banquet chairs", () => {
    const spots = STAGES["hotel-ballroom"]!.spots;
    const seats = spots.filter((spot) => spot.pose === "sit");
    const ballroom = seats.filter((spot) =>
      spot.group?.startsWith("ballroom-"),
    );
    expect(seats).toHaveLength(54);
    expect(ballroom).toHaveLength(52);
    expect(new Set(seats.map((spot) => spot.id)).size).toBe(54);
    expect(ballroom.filter((spot) => spot.facing === "away")).toHaveLength(16);
    expect(
      ballroom.filter((spot) => spot.group === "ballroom-northwest"),
    ).toHaveLength(5);
    expect(
      ballroom.filter((spot) => spot.group === "ballroom-northeast"),
    ).toHaveLength(5);
    expect(
      ballroom.filter((spot) => spot.group === "ballroom-west-center"),
    ).toHaveLength(6);
    expect(
      ballroom.filter((spot) => spot.group === "ballroom-east-center"),
    ).toHaveLength(6);
    expect(
      ballroom.filter((spot) => spot.group === "ballroom-southwest"),
    ).toHaveLength(7);
    expect(
      ballroom.filter((spot) => spot.group === "ballroom-southeast"),
    ).toHaveLength(7);
    expect(
      ballroom.filter((spot) => spot.group === "ballroom-front-left"),
    ).toHaveLength(8);
    expect(
      ballroom.filter((spot) => spot.group === "ballroom-front-right"),
    ).toHaveLength(8);
  });

  it("anchors visible church supper hall table chairs", () => {
    const spots = STAGES["church-supper-hall"]!.spots;
    const seats = spots.filter((spot) => spot.pose === "sit");
    const added = seats.filter((spot) => spot.group?.startsWith("supper-"));
    expect(seats).toHaveLength(36);
    expect(added).toHaveLength(34);
    expect(new Set(seats.map((spot) => spot.id)).size).toBe(36);
    expect(added.filter((spot) => spot.facing === "away")).toHaveLength(8);
    expect(
      added.filter((spot) => spot.group === "supper-back-left"),
    ).toHaveLength(5);
    expect(
      added.filter((spot) => spot.group === "supper-back-right"),
    ).toHaveLength(5);
    expect(
      added.filter((spot) => spot.group === "supper-middle-left"),
    ).toHaveLength(6);
    expect(
      added.filter((spot) => spot.group === "supper-middle-right"),
    ).toHaveLength(6);
    expect(
      added.filter((spot) => spot.group === "supper-front-left"),
    ).toHaveLength(6);
    expect(
      added.filter((spot) => spot.group === "supper-front-right"),
    ).toHaveLength(6);
  });

  it("anchors the rear plaza benches at city hall", () => {
    const seats = STAGES["city-hall-exterior"]!.spots.filter(
      (spot) => spot.pose === "sit",
    );
    expect(seats).toHaveLength(4);
    expect(new Set(seats.map((spot) => spot.id)).size).toBe(4);
    expect(seats.filter((spot) => spot.group === "bench-rear")).toMatchObject([
      { x: 21, y: 61, facing: "viewer", seatY: 58 },
      { x: 79, y: 61, facing: "viewer", seatY: 58 },
    ]);
  });

  it("anchors union hall pews along both sides of the aisle", () => {
    const spots = STAGES["union-hall"]!.spots;
    const seats = spots.filter((spot) => spot.pose === "sit");
    const pews = seats.filter((spot) => spot.role === "audience");
    expect(seats).toHaveLength(17);
    expect(pews).toHaveLength(14);
    expect(new Set(seats.map((spot) => spot.id)).size).toBe(17);
    expect(pews.filter((spot) => spot.facing === "away")).toHaveLength(14);
    for (let row = 1; row <= 7; row += 1)
      expect(
        pews.filter((spot) => spot.group === `pew-row-${row}`),
      ).toHaveLength(2);
  });

  it("anchors the visible convention hall audience chairs", () => {
    const spots = STAGES["convention-hall"]!.spots;
    const seats = spots.filter(
      (spot) => spot.pose === "sit" && spot.role === "audience",
    );
    expect(seats).toHaveLength(164);
    expect(new Set(seats.map((spot) => spot.id)).size).toBe(164);
    expect(seats.every((spot) => spot.facing === "away")).toBe(true);
    for (let row = 1; row <= 10; row += 1) {
      const expectedPerSide = [4, 5, 6, 7, 8, 9, 10, 11, 11, 11][row - 1];
      for (const side of ["left", "right"]) {
        expect(
          seats.filter((spot) => spot.group === `audience-row-${row}-${side}`),
        ).toHaveLength(expectedPerSide);
      }
    }
  });

  it("anchors the visible election-night banquet chairs", () => {
    const seats = STAGES["election-night-venue"]!.spots.filter(
      (spot) => spot.pose === "sit",
    );
    const added = seats.filter((spot) => spot.group?.startsWith("banquet-"));
    expect(seats).toHaveLength(12);
    expect(added).toHaveLength(8);
    expect(new Set(seats.map((spot) => spot.id)).size).toBe(12);
    expect(added.filter((spot) => spot.facing === "away")).toHaveLength(6);
    for (const side of ["left", "right"]) {
      expect(
        added.filter((spot) => spot.group === `banquet-front-${side}`),
      ).toHaveLength(2);
      expect(
        added.filter((spot) => spot.group === `banquet-back-${side}`),
      ).toHaveLength(2);
    }
  });

  it.each(PLACES)(
    "%s: every spot is on a floor inside the picture",
    (place) => {
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
    },
  );

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
      byFloor.set(floorOf(spot), [...(byFloor.get(floorOf(spot)) ?? []), spot]);
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
  it("anchors community room chairs and public meeting room pews", () => {
    const community = STAGES["community-room"]!.spots.filter(
      (spot) => spot.pose === "sit",
    );
    expect(community).toHaveLength(8);
    expect(new Set(community.map((spot) => spot.id)).size).toBe(8);
    expect(
      community.filter((spot) => spot.group === "circle-left"),
    ).toHaveLength(3);
    expect(
      community.filter((spot) => spot.group === "circle-right"),
    ).toHaveLength(3);
    const meeting = STAGES["public-meeting-room"]!.spots.filter(
      (spot) => spot.pose === "sit",
    );
    expect(meeting).toHaveLength(10);
    expect(new Set(meeting.map((spot) => spot.id)).size).toBe(10);
    expect(
      meeting.filter((spot) => spot.group === "spectator-pew"),
    ).toHaveLength(6);
    expect(meeting.filter((spot) => spot.group === "table")).toHaveLength(4);
    expect(meeting.filter((spot) => spot.facing === "away")).toHaveLength(6);
  });

  it("anchors visible U.S. chamber desks and balcony seats", () => {
    const rooms = [
      ["us-house-floor", 79, 46, 30],
      ["us-senate-floor", 73, 40, 30],
    ] as const;
    for (const [
      place,
      expectedSeats,
      expectedMembers,
      expectedGallery,
    ] of rooms) {
      const spots = STAGES[place]!.spots;
      const seats = spots.filter((spot) => spot.pose === "sit");
      expect(seats).toHaveLength(expectedSeats);
      expect(new Set(seats.map((spot) => spot.id)).size).toBe(expectedSeats);
      expect(seats.filter((spot) => spot.group === "members")).toHaveLength(
        expectedMembers,
      );
      expect(seats.filter((spot) => spot.group === "gallery")).toHaveLength(
        expectedGallery,
      );
      expect(seats.filter((spot) => spot.facing === "away")).toHaveLength(
        expectedMembers + expectedGallery,
      );
    }
  });
});
