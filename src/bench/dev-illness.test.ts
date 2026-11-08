/**
 * Dev mode's illness: a person falls seriously ill through the health module's own onset, and the
 * module's loop carries it to a death, the death record, the estate and the vacancy rule. A random
 * place and seed each run, named so a failure can be replayed.
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

describe(`dev illness: ${where}`, () => {
  it(
    "an illness begun here ends in a death the health module records",
    { timeout: 300_000 },
    () => {
      // The health module opens its records on the world's first day, as in any game already begun.
      dev.advance(addDays(makeIsoDate(world.core.date), 1));
      const player = world.core.playerId;
      // The oldest full person who is not the one being played: the nearest death.
      const oldest = [...world.core.people.values()]
        .filter((p) => p.alive && p.id !== player)
        .sort((a, b) => a.birthDate.localeCompare(b.birthDate))[0]!;
      dev.forceIllness(oldest.id);
      const ran = dev.runUntil({
        event: "death",
        cap: 3660,
        person: oldest.id,
      });
      process.stderr.write(
        `${where}: ${oldest.id} ill; ${ran.reason} after ${ran.days} days; ${ran.records.join(", ")}\n`,
      );
      expect(ran.reason, where).toBe("event");
      expect(world.core.people.get(oldest.id)!.alive, where).toBe(false);
      const deaths = [...(world.core.logByKind.get("life.death") ?? [])]
        .map((id) => world.core.durableLog.get(id)!)
        .filter((row) => row.personIds.includes(oldest.id));
      expect(
        deaths.length,
        `${where}: a death record names them`,
      ).toBeGreaterThan(0);
    },
  );
});
