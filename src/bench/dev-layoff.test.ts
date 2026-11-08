/**
 * Dev mode's layoff: a named worker's job ends through the jobs engine's own separation, with the
 * record of why, the work.job-lost event and the claim that follow any layoff. A worker who played
 * today's day is let go on a day they have off, which the control says. A random place and seed each
 * run, named so a failure can be replayed.
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

describe(`dev layoff: ${where}`, () => {
  it(
    "a worker is laid off through the jobs engine and the event names them",
    { timeout: 300_000 },
    () => {
      dev.advance(addDays(makeIsoDate(world.core.date), 1));
      const workers = [...world.core.people.values()].filter(
        (p) => p.alive && p.jobId && p.id !== world.core.playerId,
      );
      expect(workers.length, where).toBeGreaterThan(0);
      let said = "";
      let laidOff: string | undefined;
      for (const worker of workers) {
        try {
          dev.forceLayoff(worker.id);
          laidOff = worker.id;
          break;
        } catch (error) {
          said = (error as Error).message;
        }
      }
      process.stderr.write(
        `${where}: ${workers.length} workers; laid off ${laidOff ?? "none"}; last refusal: ${said}\n`,
      );
      expect(laidOff, `${where}: ${said}`).toBeDefined();
      const events = [...(world.core.logByKind.get("work.job-lost") ?? [])]
        .map((id) => world.core.durableLog.get(id)!)
        .filter((row) => row.personIds.includes(laidOff!));
      expect(
        events.length,
        `${where}: a work.job-lost event names them`,
      ).toBeGreaterThan(0);
      expect(world.core.people.get(laidOff!)!.jobId, where).toBeFalsy();
    },
  );
});
