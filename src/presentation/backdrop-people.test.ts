import { describe, expect, it } from "vitest";
import staging from "../../art/backdrops/staging.json";
import { generateOpeningLife, prepareOpeningLife } from "./opening-life";
import { DEFAULT_NEW_GAME_SETUP } from "./new-game";
import {
  backdropStaging,
  placeBackdropPeople,
  spotFigure,
} from "./backdrop-people";
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
    expect(backdropStaging("no-such-place")).toBeNull();
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
    const counterTop = staging.places["clerk-counter"].spots.find(
      (spot) => "clipBelowY" in spot,
    )!.clipBelowY!;
    expect(clerk!.clipBelowPercent).toBe(counterTop);
    expect(clerk!.topPercent + clerk!.heightPercent).toBeGreaterThan(
      counterTop,
    );
    expect(clerk!.topPercent).toBeLessThan(counterTop);
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
  it("seats the scene's own people on the council dais before anyone on shift", () => {
    // A council meeting at night: nobody is on shift in the chamber, and the
    // five seated officers the meeting names must still be drawn.
    const night = at(world, world.currentDate, 2, 19 * 60);
    const officers = Object.values(world.people)
      .filter((person) => person.id !== player && person.appearance)
      .slice(0, 5)
      .map((person) => ({ personId: person.id }));
    expect(officers).toHaveLength(5);
    const chamber = placeBackdropPeople(
      world,
      player,
      "council-chamber",
      night,
      officers,
    );
    const drawn = chamber.map((person) => person.personId);
    for (const officer of officers) expect(drawn).toContain(officer.personId);
    // On the dais: the raised floor's seats, never the lectern.
    const dais = staging.places["council-chamber"].spots.filter(
      (spot) => "group" in spot && spot.group === "dais",
    );
    const daisTops = new Set(dais.map((spot) => spot.clipBelowY ?? null));
    for (const officer of officers) {
      const placed = chamber.find(
        (person) => person.personId === officer.personId,
      )!;
      expect(daisTops.has(placed.clipBelowPercent)).toBe(true);
    }
    // Nobody is drawn twice, and the player is never among them.
    expect(new Set(drawn).size).toBe(drawn.length);
    expect(drawn).not.toContain(player);
  });
  it("stands the scene's people on the open floor when asked, not in seats", () => {
    const pair = Object.values(world.people)
      .filter((person) => person.id !== player && person.appearance)
      .slice(0, 2)
      .map((person) => ({ personId: person.id }));
    const office = placeBackdropPeople(
      world,
      player,
      "oval-office",
      world.currentMoment,
      pair,
      { standing: true },
    );
    const standing = staging.places["oval-office"].spots.filter(
      (spot) => spot.pose === "stand",
    );
    for (const { personId } of pair) {
      const placed = office.find((person) => person.personId === personId)!;
      // Nothing is hidden behind furniture, and each stands centered on a
      // standing spot.
      expect(placed.clipBelowPercent).toBeNull();
      const center = placed.leftPercent + placed.widthPercent / 2;
      expect(standing.some((spot) => Math.abs(center - spot.x) < 1)).toBe(true);
    }
  });

  it("shows a seated person's legs under an open table, hiding only the tabletop's edge", () => {
    const stage = backdropStaging("public-meeting-room")!;
    const seat = stage.spots.find(
      (spot) => spot.pose === "sit" && spot.group === "table",
    )!;
    const figure = spotFigure(stage, seat);
    expect(figure.clipBelowPercent).toBe(39);
    expect(figure.clipBandEndPercent).toBe(40.4);
    // A counter still hides everything below its top.
    const counter = backdropStaging("clerk-counter")!.spots.find(
      (spot) => spot.clipBelowY !== undefined,
    )!;
    expect(
      spotFigure(backdropStaging("clerk-counter")!, counter).clipBandEndPercent,
    ).toBeNull();
  });
});
