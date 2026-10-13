import { describe, expect, it } from "vitest";
import { wholeFigureFor } from "./whole-figures";
import { backdropStaging } from "./staging";
import staging from "../../art/backdrops/staging.json" with { type: "json" };
import type { CoreState } from "../core2/types";

// A random painted place each run, named so a failure can be replayed.
const places = Object.keys(staging.places).filter((place) =>
  backdropStaging(place)!.spots.some(
    (spot) => (spot.pose ?? "stand") === "stand",
  ),
);
const place =
  process.env.PEOPLE_TEST_PLACE ??
  places[Math.floor(Math.random() * places.length)]!;
const core = {
  date: "2026-10-13",
  people: new Map(),
  jobs: new Map(),
  organizations: new Map(),
} as unknown as CoreState;
const person = {
  id: "person:shadow",
  birthDate: "1984-05-02",
  official: false,
};

describe(`contact shadows at ${place}`, () => {
  const stage = backdropStaging(place)!;
  const standing = stage.spots.filter(
    (spot) => (spot.pose ?? "stand") === "stand",
  );

  it("puts every standing person's shadow on their foot point, under their feet", () => {
    for (const spot of standing) {
      const whole = wholeFigureFor(core, person, place, stage, spot)!;
      const { figure } = whole;
      if (spot.clipBelowY !== undefined && spot.clipBandEndY === undefined) {
        expect(figure.shadow).toBeNull();
        continue;
      }
      const shadow = figure.shadow!;
      // Centered vertically on the floor line the feet stand on.
      expect(shadow.topPercent + shadow.heightPercent / 2).toBeCloseTo(
        spot.y,
        6,
      );
      // Centered under the figure, and no wider than the figure's picture.
      const middle = shadow.leftPercent + shadow.widthPercent / 2;
      expect(middle).toBeGreaterThan(figure.leftPercent);
      expect(middle).toBeLessThan(figure.leftPercent + figure.widthPercent);
      expect(shadow.widthPercent).toBeLessThanOrEqual(
        figure.widthPercent * 1.3,
      );
      // Flat on the floor: wider than tall on screen.
      expect(shadow.heightPercent / 1.7768).toBeLessThan(shadow.widthPercent);
    }
  });

  it("draws no shadow where a counter or desk hides the feet", () => {
    const spot = { ...standing[0]!, clipBelowY: standing[0]!.y - 5 };
    expect(
      wholeFigureFor(core, person, place, stage, spot)!.figure.shadow,
    ).toBeNull();
  });
});
