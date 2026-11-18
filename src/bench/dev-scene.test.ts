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
import situationTypes from "../director/data/situation-types.json" with { type: "json" };

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
    { timeout: 280_000 },
    () => {
      const scenes = dev.scenes();
      const by = (recipe: string | null) =>
        scenes.filter((row) => row.recipe === recipe);
      process.stderr.write(
        `${where}: ${scenes.length} types: ${by("death").length} death, ${by("layoff").length} layoff, ${by("wait").length} run-until-it-happens, ${by(null).length} no engine writes the cause\n`,
      );
      // The Scenes panel's three headings, from the same rows: what dev mode can do for each kind.
      const state = (name: string) =>
        scenes.filter((row) => row.state === name).length;
      process.stderr.write(
        `${where}: plays now ${state("plays")}, waits for a record ${state("waits")}, cannot be caused ${state("none")}\n`,
      );
      expect(state("plays") + state("waits") + state("none"), where).toBe(
        scenes.length,
      );
      // A check, not a baseline (owner, Nov 17, the cut): every type on the
      // written list is a row here, and nothing else is.
      expect(scenes.length, where).toBe(situationTypes.types.length);
      expect(by("death").length, where).toBeGreaterThan(0);
      expect(by("layoff").length, where).toBeGreaterThan(0);
      expect(by("wait").length, where).toBeGreaterThan(20);
      // A type no engine writes a cause for says so.
      expect(() => dev.forceScene({ typeKey: by(null)[0]!.key })).toThrow(
        /No game code/,
      );
      dev.advance(addDays(makeIsoDate(world.core.date), 1));
      // A death: the health module's illness, its onset heard the next day.
      const death = dev.forceScene({ typeKey: by("death")[0]!.key });
      expect(death.recipe, where).toBe("death");
      dev.advance(addDays(makeIsoDate(world.core.date), 2));
      const onset = [...world.core.durableLog.values()].filter(
        (row) =>
          row.personIds.includes(death.personId) &&
          /illness|onset/i.test(row.kind),
      );
      expect(
        onset.length,
        `${where}: the onset is on the record`,
      ).toBeGreaterThan(0);
      // A layoff: the jobs engine's separation, or the engine's own refusal (worked today).
      let layoff: string;
      try {
        layoff = String(
          dev.forceScene({ typeKey: by("layoff")[0]!.key }).personId,
        );
      } catch (error) {
        layoff = (error as Error).message;
        expect(layoff, where).toMatch(/worked today|No one|no job|staff/i);
      }
      // A cause an engine writes on its own schedule: the world runs until one names the player.
      const wait = by("wait").find((row) =>
        row.causeRecords.includes("news.read"),
      );
      expect(wait, `${where}: a news-read type`).toBeDefined();
      const waited = dev.forceScene({ typeKey: wait!.key });
      expect(waited.recipe, where).toBe("wait");
      process.stderr.write(
        `${where}: death ${death.personId}; layoff ${layoff}; ${wait!.key} ${waited.ran?.reason} after ${waited.ran?.days} days ${waited.ran?.records.join(", ")}\n`,
      );
    },
  );

  it(
    "reads the causes the director's own matching names: the kinds the tag missed have a way in, the kinds with no cause say so",
    { timeout: 280_000 },
    () => {
      // A world of its own: the first test has already run this one a year on.
      const world2 = buildBenchWorld(seed, gameStartDate(), { twoLevel: true });
      const dev2 = new DevMode(
        world2.core,
        world2.director,
        new BenchPlayer(world2.core, world2.director),
        world2.placeId,
      );
      dev2.advance(addDays(makeIsoDate(world2.core.date), 1));
      const scenes = dev2.scenes();
      const row = (key: string) => scenes.find((r) => r.key === key)!;
      const missed = ["first-day", "cause-invite"];
      // Kinds that had no cause when this was written; their producers landed
      // (apology, accusation, advice), so each is now run until its record
      // names the player.
      const now = ["apology", "accusation", "advice"];
      const none = ["polling-place"];
      for (const key of now)
        expect(row(key).recipe, `${where}: ${key} has a way in`).not.toBeNull();
      for (const key of missed)
        expect(row(key).recipe, `${where}: ${key} has a way in`).not.toBeNull();
      for (const key of none)
        expect(row(key).recipe, `${where}: ${key} has no cause`).toBeNull();
      // The rest run the world until the player's ledger holds a moment the director reads as the cause.
      const ways = missed.map((key) => `${key}=${row(key).recipe}`).join(" ");
      const ran = ["first-day"].map((key) => {
        const out = dev2.forceScene({ typeKey: key, cap: 90 });
        return `${key}: ${out.ran?.reason} after ${out.ran?.days} days ${out.ran?.records.join(",")}`;
      });
      process.stderr.write(`${where}: ${ways}; ${ran.join("; ")}\n`);
    },
  );
});
