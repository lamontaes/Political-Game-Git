/**
 * Dev mode's Scenes: every situation type is listed with the cause it waits on, a type whose cause
 * the game can bring about is forced through the game's code, and a type with no way in says so. A
 * random place and seed each run, named so a failure can be replayed.
 */
import { randomBytes } from "node:crypto";
import { describe, expect, it } from "vitest";
import { buildBenchWorld } from "./world";
import { gameStartDate } from "../core2/game-start";
import { BenchPlayer } from "./player";
import { DevMode } from "./dev-mode";
import { addDays, makeIsoDate } from "../core2/kernel/dates";

const seed = process.env.DEV_MODE_SEED ?? randomBytes(8).toString("hex");
const world = buildBenchWorld(seed, gameStartDate(), { twoLevel: true });
const dev = new DevMode(
  world.core,
  world.director,
  new BenchPlayer(world.core, world.director),
  world.placeId,
);
const where = `${world.place.displayName} (seed ${seed})`;

describe(`dev scenes: ${where}`, () => {
  it(
    "lists every type, forces the one the game can bring about and refuses the rest",
    { timeout: 120_000 },
    () => {
      const scenes = dev.scenes();
      const forceable = scenes.filter((row) => row.recipe);
      const refused = scenes.filter((row) => !row.recipe);
      process.stderr.write(
        `${where}: ${scenes.length} types, forceable: ${forceable.map((r) => r.key).join(", ")}; ${refused.length} with no way in\n`,
      );
      expect(scenes.length, where).toBeGreaterThan(50);
      expect(forceable.length, where).toBeGreaterThan(0);
      expect(() => dev.forceScene({ typeKey: refused[0]!.key })).toThrow(
        /No game code/,
      );
      dev.advance(addDays(makeIsoDate(world.core.date), 1));
      const out = dev.forceScene({ typeKey: forceable[0]!.key });
      expect(out.personId, where).toBeTruthy();
      expect(out.recipe, where).toBe("death");
      // The illness is the health module's: its onset is heard the next day, as it would for anyone.
      dev.advance(addDays(makeIsoDate(world.core.date), 2));
      const onset = [...world.core.durableLog.values()].filter(
        (row) =>
          row.personIds.includes(out.personId) &&
          /illness|onset/i.test(row.kind),
      );
      process.stderr.write(
        `${where}: ${out.personId} ill; onset records ${onset.map((r) => r.id).join(", ")}\n`,
      );
      expect(
        onset.length,
        `${where}: the onset is on the record`,
      ).toBeGreaterThan(0);
    },
  );
});
