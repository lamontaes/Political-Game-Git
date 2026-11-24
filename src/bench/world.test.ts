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
    seed: "entrant-fixture",
    startedAt: "2026-10-12",
    people: Object.entries(births).map(([id, birthDate]) => ({
      id,
      placeId: place,
      birthDate,
    })),
  } as unknown as CoreInput;
}

describe("the bench player with no birthday chosen", () => {
  // Owner, Nov 16: "Just do 18 and up right now. Life before 18 will come after early access."
  it("is one of the town's adults, picked by the world's seeded unit, never a 17-year-old", () => {
    const input = opening({
      "turns-18-in-three-days": "2008-10-15",
      "turned-18-yesterday": "2008-10-11",
      forty: "1986-02-02",
      seventy: "1956-03-03",
    });
    const pick = entrantChoice(input, place);
    expect(["turned-18-yesterday", "forty", "seventy"]).toContain(pick.id);
    expect(pick.age).toBeGreaterThanOrEqual(18);
    expect(pick).toMatchObject({ estimated: false, how: "town-adult" });
    // The same world picks the same player; another world's seed can pick another.
    expect(entrantChoice(input, place).id).toBe(pick.id);
    const picks = new Set(
      ["a", "b", "c", "d", "e", "f", "g", "h"].map(
        (seed) => entrantChoice({ ...input, seed }, place).id,
      ),
    );
    expect(picks.size).toBeGreaterThan(1);
    expect(picks.has("turns-18-in-three-days")).toBe(false);
  });
  it("is never a relative's husk-tier record, even one in this place", () => {
    const input = opening({
      "kin-forty": "1986-02-02",
      "resident-thirty": "1996-03-01",
    });
    (input.people[0] as { tier?: string }).tier = "husk";
    expect(entrantOf(input, place)).toBe("resident-thirty");
  });
  it("fails only where no adult lives", () => {
    expect(() =>
      entrantChoice(opening({ "turns-18-soon": "2008-10-15" }), place),
    ).toThrow("No adult resident");
  });
});

describe("the player the creator's birthday makes", () => {
  it("is a resident of the chosen age, born nearest the chosen day", () => {
    const input = opening({
      "born-near-35": "1991-09-30",
      "born-far-35": "1991-01-01",
      // Nearer the chosen day, but 34 on the opening day: another age's life.
      "born-near-but-34": "1991-10-20",
      "born-near-70": "1956-10-02",
    });
    expect(entrantChoice(input, place, "1991-09-20")).toEqual({
      id: "born-near-35",
      age: 35,
      estimated: false,
      how: "chosen-age",
      chosenAge: 35,
    });
    // Nobody is 56: the nearest age stands in, marked as an estimate.
    expect(entrantChoice(input, place, "1970-01-01")).toMatchObject({
      id: "born-near-70",
      age: 70,
      estimated: true,
      chosenAge: 56,
    });
  });
  it("passes over a resident whose parent would be too young at the chosen birthday", () => {
    const input = opening({
      "parent-of-near": "1980-06-01",
      near: "1991-09-30",
      far: "1991-03-01",
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
    // Where every resident that age fails, the nearest stands in.
    person("far").pastFacts = parentIsParent;
    expect(entrantOf(input, place, "1991-10-20")).toBe("near");
  });
});

describe("a thin place", () => {
  it("opens and plays a month in Polebridge, a place with few residents, with an adult player", () => {
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
    expect(age, where).toBeGreaterThanOrEqual(18);
    advanceCore(core, addDays(makeIsoDate(core.date), 30));
    expect(core.people.get(player.id)?.alive, where).toBe(true);
  }, 600_000);
});
