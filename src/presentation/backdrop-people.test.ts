import { describe, expect, it } from "vitest";
import staging from "../../art/backdrops/staging.json" with { type: "json" };
import { generateOpeningLife, prepareOpeningLife } from "./opening-life";
import { DEFAULT_NEW_GAME_SETUP } from "./new-game";
import {
  backdropStaging,
  placeBackdropPeople,
  spotFigure,
  spotPose,
  type StagingSpot,
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
      const placed = office.find((person) => person.personId === personId);
      if (!placed) {
        expect(
          office.overflow.find((person) => person.personId === personId)
            ?.reason,
        ).toBe("missing-art");
        continue;
      }
      // Nothing is hidden behind furniture, and each stands centered on a
      // standing spot.
      expect(placed.clipBelowPercent).toBeNull();
      const center = placed.leftPercent + placed.widthPercent / 2;
      expect(standing.some((spot) => Math.abs(center - spot.x) < 1)).toBe(true);
    }
  });

  it("carries the title the scene gives each of its people, for their name plate", () => {
    const [first, second] = Object.values(world.people)
      .filter((person) => person.id !== player && person.appearance)
      .slice(0, 2);
    if (!first || !second) throw new Error("two drawn people are needed");
    const office = placeBackdropPeople(
      world,
      player,
      "oval-office",
      world.currentMoment,
      [
        { personId: first.id, title: "President of the United States" },
        { personId: second.id },
      ],
      { standing: true },
    );
    const titleOf = (id: string) =>
      [...office, ...office.overflow].find((person) => person.personId === id)
        ?.title;
    expect(titleOf(first.id)).toBe("President of the United States");
    // No title named: the plate shows the name alone.
    expect(titleOf(second.id)).toBe("");
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
  it("keeps every chair seated across activities and uses the marked floor", () => {
    for (const stage of Object.values(staging.places)) {
      for (const spot of stage.spots as readonly StagingSpot[]) {
        if (spot.pose === "sit") {
          expect(spot.seatY).toBeDefined();
          for (const activity of [
            "speaking",
            "listening",
            "desk",
            "waiting",
            "meeting",
            "idle",
            "speech",
          ] as const)
            expect(spotPose(spot, activity).startsWith("seated")).toBe(true);
        }
        if (spot.floor)
          expect(
            "floors" in stage
              ? (stage.floors as Record<string, number>)[spot.floor]
              : undefined,
          ).toBeDefined();
      }
    }
    const stage = {
      horizonY: 20,
      metersPercent: 1,
      floors: { dais: 2 },
      spots: [],
    };
    const floor = { x: 50, y: 50, pose: "stand" as const };
    expect(spotFigure(stage, { ...floor, floor: "dais" }).heightPercent).toBe(
      spotFigure(stage, floor).heightPercent * stage.floors.dais,
    );
    expect(spotPose({ ...floor, pose: "podium" }, "listening")).toBe("podium");
  });

  it("accounts for everyone when a room fills, and when staging is missing", () => {
    const present = Object.values(world.people)
      .filter((person) => person.id !== player && person.appearance)
      .slice(0, staging.places.office.spots.length + 1)
      .map((person) => ({ personId: person.id }));
    const night = at(world, world.currentDate, 2, 21 * 60);
    const placed = placeBackdropPeople(world, player, "office", night, present);
    expect(placed.overflow.length).toBeGreaterThan(0);
    expect(
      [...placed, ...placed.overflow].map((person) => person.personId).sort(),
    ).toEqual(present.map((person) => person.personId).sort());
    const absent = placeBackdropPeople(
      world,
      player,
      "no-such-place",
      night,
      present,
    );
    expect(absent).toHaveLength(0);
    expect(absent.overflow.map((person) => person.personId)).toEqual(
      present.map((person) => person.personId),
    );
    expect(absent.overflow.every((person) => person.reason === "no-spot")).toBe(
      true,
    );
  });

  it("keeps standing-only overflow off chairs and follows the speaking activity", () => {
    const present = Object.values(world.people)
      .filter((person) => person.id !== player && person.appearance)
      .slice(0, staging.places["oval-office"].spots.length)
      .map((person) => ({ personId: person.id }));
    const placed = placeBackdropPeople(
      world,
      player,
      "oval-office",
      world.currentMoment,
      present,
      {
        standing: true,
        speakerId: present[0]!.personId,
      },
    );
    expect(placed.overflow.length).toBeGreaterThan(0);
    expect(
      placed.every((person) => !person.engine.pose?.startsWith("seated")),
    ).toBe(true);
    const speaker = placed.find(
      (person) => person.personId === present[0]!.personId,
    );
    if (speaker) expect(speaker.engine.pose).toBe("explaining");
    else
      expect(
        placed.overflow.find(
          (person) => person.personId === present[0]!.personId,
        )?.reason,
      ).toBe("missing-art");
    expect(spotPose({ x: 50, y: 50, pose: "stand" }, "speaking")).toBe(
      "explaining",
    );
  });
});
