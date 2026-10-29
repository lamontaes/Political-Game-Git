import { describe, expect, it } from "vitest";
import staging from "../../art/backdrops/staging.json" with { type: "json" };
import { hides } from "./scene";
import { backdropStaging } from "./staging";
import { figureOn, lookFigures } from "./whole-figures";

const look = lookFigures().find(
  (row) => row.sex === "male" && row.build === "medium",
)!;

describe("figures are framed whole", () => {
  it("keeps every figure on every spot of every painted place inside the picture, head included", () => {
    const outside: string[] = [];
    for (const place of Object.keys(staging.places)) {
      const stage = backdropStaging(place)!;
      for (const spot of stage.spots) {
        const drawn = figureOn(look, "adult", place, stage, spot);
        if (!drawn) continue;
        const { topPercent, leftPercent, widthPercent } = drawn.figure;
        // A spot measured from a mannequin plate is where the painter put a
        // person, at the picture's edge too: only its head's middle and top
        // must be inside.
        if (spot.head) {
          if (spot.head.top < 0 || spot.head.x < 0 || spot.head.x > 100)
            outside.push(`${place} ${spot.id ?? ""}`);
          continue;
        }
        if (
          topPercent < 0 ||
          leftPercent < 0 ||
          leftPercent + widthPercent > 100
        )
          outside.push(`${place} ${spot.id ?? ""}`);
      }
    }
    expect(outside).toEqual([]);
  });

  it("leaves every room's hero spot with room at the head and both sides (the January 22 bedroom scene)", () => {
    const crowded: string[] = [];
    for (const place of Object.keys(staging.places)) {
      const stage = backdropStaging(place)!;
      const hero = stage.spots.find((spot) => spot.hero);
      // A spot measured from a mannequin plate keeps the painter's placement.
      if (!hero || hero.head) continue;
      const drawn = figureOn(look, "adult", place, stage, hero);
      if (!drawn) continue;
      const { topPercent, leftPercent, widthPercent } = drawn.figure;
      if (
        topPercent < 4 ||
        leftPercent < 4 ||
        leftPercent + widthPercent > 96.0001
      )
        crowded.push(
          `${place} top ${topPercent.toFixed(1)} left ${leftPercent.toFixed(1)}`,
        );
    }
    expect(crowded).toEqual([]);
  });

  it("leaves the close-up bedroom's hero with head room (the January 22 bedroom scene)", () => {
    const stage = backdropStaging("bedroom-plain")!;
    const hero = stage.spots.find((spot) => spot.hero)!;
    expect(
      figureOn(look, "adult", "bedroom-plain", stage, hero)!.figure.topPercent,
    ).toBeGreaterThanOrEqual(0);
  });

  it("has a clerk spot at the filing counter that the standing hero does not cover", () => {
    const stage = backdropStaging("clerk-counter")!;
    const hero = stage.spots.find((spot) => spot.hero)!;
    const staff = stage.spots.filter(
      (spot) => spot.role === "staff-behind-counter",
    );
    expect(staff.some((spot) => !hides(stage, hero, spot))).toBe(true);
    // The seat directly behind the hero is the covered one.
    expect(staff.some((spot) => hides(stage, hero, spot))).toBe(true);
  });
});
