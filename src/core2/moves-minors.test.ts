import { randomBytes } from "node:crypto";
import { describe, expect, it } from "vitest";
import { drawPlace } from "../../scripts/core2-year/place";
import { buildBenchWorld } from "../bench/world";
import { setBookkeeping } from "./bookkeeping";
import { addDays, ageOnDate, makeIsoDate } from "./kernel/dates";
import { advanceCore } from "./life";

/**
 * A minor moves with the guardian they live with: after every move no
 * household in town holds only minors. The repro place (a base where the last
 * adult of a household of four moved and left two children) and a place
 * drawn at random, each through a year and a month of the played world.
 */
const seeds = [
  ["454f046f2c5b", "scene-year"],
  [
    process.env.GOLDEN_PATH_SEED ?? randomBytes(8).toString("hex"),
    "moves-minors",
  ],
] as const;

describe("movers and minors", () => {
  for (const [seed, purpose] of seeds)
    it(`leave no minor alone in a household (seed ${seed})`, () => {
      const place = drawPlace(seed, purpose);
      setBookkeeping(false);
      const world = buildBenchWorld(place.seed, "2026-10-12", {
        twoLevel: true,
        placeKey: place.key,
      });
      const core = world.core;
      const alone: string[] = [];
      for (let day = 0; day < 400; day += 1) {
        advanceCore(core, addDays(makeIsoDate(core.date), 1));
        if (day % 7) continue;
        for (const household of core.households.values()) {
          const alive = household.memberIds
            .map((id) => core.people.get(id))
            .filter((person) => person?.alive && person.tier !== "husk");
          if (!alive.length) continue;
          const adults = alive.filter(
            (person) =>
              ageOnDate(
                makeIsoDate(person!.birthDate),
                makeIsoDate(core.date),
              ) >= 18,
          );
          if (!adults.length)
            alone.push(
              `${core.date} ${household.id}: ${alive.map((p) => p!.id).join(",")}`,
            );
        }
      }
      expect(alone.slice(0, 3), `${place.name}, seed ${seed}`).toEqual([]);
    }, 1_200_000);
});
