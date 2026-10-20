import { describe, expect, it } from "vitest";
import { randomBytes } from "node:crypto";
import { drawPlace } from "../../scripts/core2-year/place";
import { setBookkeeping } from "../core2/bookkeeping";
import { gameStartDate } from "../core2/game-start";
import { ageOnDate, addDays, makeIsoDate } from "../core2/kernel/dates";
import { advanceCore } from "../core2/life";
import {
  buildBenchWorld,
  entrantBornNear,
  entrantChoice,
  entrantOf,
} from "./world";
import type { CoreInput } from "../core2/types";

const place = "place:entrant-fixture";
function opening(births: Record<string, string>): CoreInput {
  return {
    startedAt: "2026-10-12",
    people: Object.entries(births).map(([id, birthDate]) => ({
      id,
      placeId: place,
      birthDate,
    })),
  } as unknown as CoreInput;
}

describe("the bench player", () => {
  it("is the 17-year-old whose 18th birthday comes soonest, so turning 18 happens in play", () => {
    const input = opening({
      "turned-18-in-may": "2008-05-01",
      "turned-18-yesterday": "2008-10-11",
      "turns-18-in-march": "2009-03-01",
      "turns-18-in-three-days": "2008-10-15",
      "turns-17-tomorrow": "2009-10-13",
    });
    expect(entrantOf(input, place)).toBe("turns-18-in-three-days");
  });
  it("is the most recent 18-year-old where nobody here is 17", () => {
    const input = opening({
      "turned-18-in-may": "2008-05-01",
      "turned-18-yesterday": "2008-10-11",
      nineteen: "2007-01-01",
    });
    expect(entrantOf(input, place)).toBe("turned-18-yesterday");
  });
  it("is never a relative's husk-tier record, even one in this place", () => {
    const input = opening({
      "kin-turns-18-tomorrow": "2008-10-13",
      "resident-turns-18-in-march": "2009-03-01",
    });
    (input.people[0] as { tier?: string }).tier = "husk";
    expect(entrantOf(input, place)).toBe("resident-turns-18-in-march");
  });
  it("falls back to the resident nearest 18, marked as an estimate, where nobody is 17 or 18", () => {
    const input = opening({
      "turns-21-in-march": "2005-03-01",
      "turns-16-soon": "2010-10-20",
      "turns-16-later": "2010-12-31",
      nine: "2017-01-01",
    });
    expect(entrantChoice(input, place)).toEqual({
      id: "turns-16-soon",
      age: 15,
      estimated: true,
    });
    expect(
      entrantChoice(opening({ "turned-18": "2008-05-01" }), place),
    ).toEqual({ id: "turned-18", age: 18, estimated: false });
    expect(() => entrantChoice(opening({}), place)).toThrow("No resident");
  });
});

describe("a thin place", () => {
  it("opens and plays a month in Polebridge, a place with few residents, with a player at or near 18", () => {
    const seed = process.env.GOLDEN_PATH_SEED ?? randomBytes(8).toString("hex");
    setBookkeeping(false);
    const world = buildBenchWorld(seed, gameStartDate(), {
      twoLevel: true,
      placeKey: "3058675",
    });
    const core = world.core;
    const player = core.people.get(world.playerId!)!;
    const age = ageOnDate(
      makeIsoDate(player.birthDate),
      makeIsoDate(core.date),
    );
    const where = `Polebridge, Montana, seed ${seed}, player ${player.id} aged ${age}`;
    expect(age, where).toBeGreaterThanOrEqual(17);
    expect(age, where).toBeLessThanOrEqual(18);
    advanceCore(core, addDays(makeIsoDate(core.date), 30));
    expect(core.people.get(player.id)?.alive, where).toBe(true);
  }, 600_000);
});

describe("the person the creator chose", () => {
  it("is the resident of that age born nearest the chosen day, so the past fits the age", () => {
    const input = opening({
      "forty-in-march": "1986-03-10",
      "forty-in-october": "1986-10-01",
      "thirty-nine-in-november": "1987-11-20",
      "eighteen-in-may": "2008-05-01",
    });
    // Age on 2026-10-12: 40 for both 1986 births.
    const born = (year: number, month: number, day: number) =>
      entrantBornNear(input, place, { year, month, day });
    expect(born(1986, 3, 12)).toBe("forty-in-march");
    expect(born(1986, 9, 25)).toBe("forty-in-october");
    // Nobody is 25 here: the resident nearest that age stands in.
    expect(born(2001, 6, 1)).toBe("eighteen-in-may");
  });
});

describe("a chosen birthday in a drawn place", () => {
  it("builds the world around a resident of that age, whose past fits it", () => {
    const seed = process.env.GOLDEN_PATH_SEED ?? randomBytes(8).toString("hex");
    setBookkeeping(false);
    const place = drawPlace(seed, "creator-age");
    const startYear = Number(gameStartDate().slice(0, 4));
    // About forty on the opening date.
    const chosen = { year: startYear - 41, month: 6, day: 15 };
    const world = buildBenchWorld(place.seed, gameStartDate(), {
      twoLevel: true,
      placeKey: place.key,
      playerBirthday: chosen,
    });
    const player = world.core.people.get(world.playerId!)!;
    const age = ageOnDate(
      makeIsoDate(player.birthDate),
      makeIsoDate(gameStartDate()),
    );
    const where = `${place.name} (${place.key}), seed ${seed}, player ${player.id} aged ${age}`;
    console.log(`creator-age: ${where}`);
    // The nearest age to the chosen one a resident has; usually the age itself.
    const wanted = ageOnDate(
      makeIsoDate(
        `${chosen.year}-${String(chosen.month).padStart(2, "0")}-${chosen.day}`,
      ),
      makeIsoDate(gameStartDate()),
    );
    expect(Math.abs(age - wanted), where).toBeLessThanOrEqual(1);
    // Their past is dated before their birthday plus their age: schooling
    // and work already on record for an adult.
    expect(player.pastFacts?.length ?? 0, where).toBeGreaterThan(0);
  }, 600_000);
});
