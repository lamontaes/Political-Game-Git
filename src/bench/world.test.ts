import { describe, expect, it } from "vitest";
import { randomBytes } from "node:crypto";
import { setBookkeeping } from "../core2/bookkeeping";
import { gameStartDate } from "../core2/game-start";
import { ageOnDate, addDays, makeIsoDate } from "../core2/kernel/dates";
import { advanceCore } from "../core2/life";
import { buildBenchWorld, entrantChoice, entrantOf } from "./world";
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

describe("the player the creator's birthday makes", () => {
  it("is the resident born nearest the chosen day, whatever age that is", () => {
    const input = opening({
      "turns-18-in-three-days": "2008-10-15",
      "born-near-35": "1991-09-30",
      "born-far-35": "1991-01-01",
      "born-near-70": "1956-10-02",
    });
    expect(entrantChoice(input, place, "1991-09-20")).toEqual({
      id: "born-near-35",
      age: 35,
      estimated: false,
    });
    // Nobody is 56: the nearest stands in, marked as an estimate.
    expect(entrantChoice(input, place, "1970-01-01")).toEqual({
      id: "born-near-70",
      age: 70,
      estimated: true,
    });
  });
  it("passes over a resident whose parent would be too young at the chosen birthday", () => {
    const input = opening({
      "parent-of-near": "1980-06-01",
      near: "1991-09-30",
      far: "1992-03-01",
    });
    const person = (id: string) =>
      input.people.find((row) => row.id === id) as {
        tier?: string;
        pastFacts?: unknown;
      };
    // A relative living elsewhere (a husk) is never the player.
    person("parent-of-near").tier = "husk";
    const parentIsParent = [
      { kind: "family:parent", facts: { otherPersonId: "parent-of-near" } },
    ];
    person("near").pastFacts = parentIsParent;
    // The chosen day sits 11 years after the parent's: too young to be one.
    expect(entrantOf(input, place, "1991-10-20")).toBe("far");
    // Where every resident near the day fails, the nearest stands in.
    person("far").pastFacts = parentIsParent;
    expect(entrantOf(input, place, "1991-10-20")).toBe("near");
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
