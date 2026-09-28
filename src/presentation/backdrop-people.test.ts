import { describe, expect, it } from "vitest";
import staging from "../../art/backdrops/staging.json";
import { generateOpeningLife, prepareOpeningLife } from "./opening-life";
import { DEFAULT_NEW_GAME_SETUP } from "./new-game";
import { backdropStaging, placeBackdropPeople } from "./backdrop-people";
import { hasBackdrop } from "./place-backdrops";
import { addDays, simulationMomentOnLocalDate } from "../simulation/dates";
import type { IsoDate, World } from "../simulation";

const LEXINGTON = "2146027";

/** A local moment on the first `weekday` (0 is Sunday) on or after `from`. */
function at(world: World, from: IsoDate, weekday: number, minute: number) {
  let date = from;
  while (new Date(`${date}T12:00:00Z`).getUTCDay() !== weekday)
    date = addDays(date, 1);
  return {
    ...simulationMomentOnLocalDate(world.currentMoment, date),
    minuteOfDay: minute,
  };
}

describe("people at work in place pictures", { timeout: 180_000 }, () => {
  const game = generateOpeningLife(
    prepareOpeningLife({
      ...DEFAULT_NEW_GAME_SETUP,
      seed: "people-at-work",
      placeKey: LEXINGTON,
      startAge: 24,
      questionnaire: "skipped",
    }),
  ).game!;
  const world = game.world;
  const player = game.playerPersonId;

  it("marks spots only on places that have a picture, inside the picture", () => {
    for (const [place, stage] of Object.entries(staging.places)) {
      expect(hasBackdrop(place)).toBe(true);
      expect(stage.spots.length).toBeGreaterThan(0);
      for (const spot of stage.spots) {
        expect(spot.x).toBeGreaterThan(0);
        expect(spot.x).toBeLessThan(100);
        expect(spot.y).toBeGreaterThan(stage.horizonY);
        expect(spot.y).toBeLessThanOrEqual(100);
      }
    }
    expect(backdropStaging("city-hall-exterior")).toBeNull();
  });

  it("stands the city clerk at the counter on a weekday morning, dressed for work, and nobody at night", () => {
    const morning = at(world, world.currentDate, 2, 10 * 60);
    const night = at(world, world.currentDate, 2, 21 * 60);
    const counter = placeBackdropPeople(
      world,
      player,
      "clerk-counter",
      morning,
    );
    const clerk = counter.find((person) => person.title === "City clerk");
    expect(clerk).toBeDefined();
    // Behind the counter: cut off at its top, feet below it.
    expect(clerk!.clipBelowPercent).toBe(42);
    expect(clerk!.topPercent + clerk!.heightPercent).toBeGreaterThan(42);
    expect(clerk!.topPercent).toBeLessThan(42);
    expect(clerk!.engine.outfit).toBeDefined();
    expect(
      placeBackdropPeople(world, player, "clerk-counter", night),
    ).toHaveLength(0);
  });

  it("puts nearer people lower and larger", () => {
    const morning = at(world, world.currentDate, 2, 10 * 60);
    const hallway = placeBackdropPeople(
      world,
      player,
      "hospital-hallway",
      morning,
    );
    expect(hallway.length).toBeGreaterThan(1);
    const [nearest, farthest] = [...hallway].sort(
      (a, b) =>
        b.topPercent + b.heightPercent - (a.topPercent + a.heightPercent),
    );
    expect(nearest!.heightPercent).toBeGreaterThan(farthest!.heightPercent);
  });
});
