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
      expect(scenes.length, where).toBeGreaterThan(50);
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
    "reads the causes the director's own matching names: twelve kinds the tag missed have a way in, the kinds with no cause say so",
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
      const missed = [
        "argument",
        "becoming-friends",
        "funeral",
        "first-day",
        "betrayal",
        "care",
        "reconciliation",
        "new-baby",
        "cause-invite",
      ];
      // Five kinds had no cause when this was written; their producers landed (return, apology,
      // rescue, accusation, advice), so each is now run until its record names the player.
      const now = ["return", "apology", "rescue", "accusation", "advice"];
      const none = ["polling-place"];
      for (const key of now)
        expect(row(key).recipe, `${where}: ${key} has a way in`).not.toBeNull();
      for (const key of missed)
        expect(row(key).recipe, `${where}: ${key} has a way in`).not.toBeNull();
      for (const key of none)
        expect(row(key).recipe, `${where}: ${key} has no cause`).toBeNull();
      // A funeral is a death, care is an illness: each through its engine.
      expect(row("funeral").recipe, where).toBe("death");
      expect(row("care").recipe, where).toBe("illness");
      // The rest run the world until the player's ledger holds a moment the director reads as the cause.
      const ways = missed.map((key) => `${key}=${row(key).recipe}`).join(" ");
      const ran = ["new-baby", "first-day"].map((key) => {
        const out = dev2.forceScene({ typeKey: key, cap: 90 });
        return `${key}: ${out.ran?.reason} after ${out.ran?.days} days ${out.ran?.records.join(",")}`;
      });
      // Care last (the illness runs on from here): the player falls seriously ill through the health module.
      const care = dev2.forceScene({ typeKey: "care" });
      expect(care.personId, where).toBe(world2.core.playerId);
      process.stderr.write(`${where}: ${ways}; ${ran.join("; ")}\n`);
    },
  );

  it(
    "casts a forced funeral: who it is for, who is mourned and where, from the director's own records",
    { timeout: 280_000 },
    () => {
      const world3 = buildBenchWorld(seed, gameStartDate(), { twoLevel: true });
      const player3 = new BenchPlayer(world3.core, world3.director);
      const dev3 = new DevMode(
        world3.core,
        world3.director,
        player3,
        world3.placeId,
      );
      // The director tells the story of the people it watches: the player and their household.
      const playerId = world3.core.playerId!;
      player3.select(playerId);
      dev3.advance(addDays(makeIsoDate(world3.core.date), 1));
      const cast = dev3.sceneCast("funeral");
      expect(
        cast.for.map((row) => row.id),
        where,
      ).toContain(playerId);
      const mourned = cast.mourned?.[playerId] ?? [];
      expect(mourned.length, `${where}: someone to mourn`).toBeGreaterThan(0);
      // Every pick is a person the director has on record; the kinds of place are the type's own.
      for (const row of mourned)
        expect(world3.core.people.get(row.id as never)?.alive, where).toBe(
          true,
        );
      expect(cast.where, where).toEqual(["venue"]);
      // A kind with no mourned person has none to pick; a place the type cannot be set at is refused.
      expect(dev3.sceneCast("care").mourned, where).toBeNull();
      expect(
        () => dev3.forceScene({ typeKey: "funeral", where: "nowhere" }),
        where,
      ).toThrow(/cannot be set there/);
      // The one mourned is the one the health module's illness takes, heard by the one it is for.
      const pick = mourned[0]!;
      const out = dev3.forceScene({
        typeKey: "funeral",
        forId: playerId,
        mournedId: pick.id,
        where: "venue",
      });
      expect(out.personId, where).toBe(pick.id);
      dev3.advance(addDays(makeIsoDate(world3.core.date), 2));
      expect(
        [...world3.core.durableLog.values()].some(
          (row) =>
            row.personIds.includes(pick.id as never) &&
            /illness|onset/i.test(row.kind),
        ),
        `${where}: the mourned person's illness is on the record`,
      ).toBe(true);
      // Someone the player does not know cannot be mourned for them.
      const stranger = [...world3.core.people.values()].find(
        (row) =>
          row.alive &&
          row.id !== playerId &&
          !world3.core.people.get(playerId)!.knownIds.has(row.id) &&
          !world3.core.people.get(playerId)!.familyIds.has(row.id),
      )!;
      expect(
        () =>
          dev3.forceScene({
            typeKey: "funeral",
            forId: playerId,
            mournedId: stranger.id,
          }),
        where,
      ).toThrow(/would not hear of it/);
    },
  );
});
