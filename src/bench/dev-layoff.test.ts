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
import { coreAPI } from "../core2/state";
import { JOBS_MODULE_ID } from "../core2/modules/jobs";

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
    "a worker is laid off through the jobs engine and its record names them",
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
          const out = dev.forceLayoff(worker.id);
          // A worker who played today is booked for tomorrow (the next test); look for one let go now.
          if ("bookedFor" in out) continue;
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
      // The jobs engine's own record of the separation: a layoff, the worker named, decided by the
      // business (its owner or manager), with the pick kept beside the values it weighed.
      const changes = (
        coreAPI(world.core)
          .moduleState(JOBS_MODULE_ID)
          .table("changes")
          .rows() as unknown as {
          personId: string;
          kind: string;
          decidedBy: string;
          values?: Record<string, number>;
        }[]
      ).filter((row) => row.personId === laidOff && row.kind === "layoff");
      expect(
        changes.length,
        `${where}: the jobs engine recorded the layoff`,
      ).toBe(1);
      expect(changes[0]!.values?.picked, where).toBe(1);
      expect(changes[0]!.decidedBy, where).toBeTruthy();
      expect(world.core.people.get(laidOff!)!.jobId, where).toBeFalsy();
    },
  );

  it(
    "a worker who played today is booked for tomorrow, before their shift, and is out of work by then with no second press",
    { timeout: 300_000 },
    () => {
      // Run until someone holds a job they have worked today.
      let booked: { personId: string; on: string } | undefined;
      for (let day = 0; day < 30 && !booked; day += 1) {
        dev.advance(addDays(makeIsoDate(world.core.date), 1));
        for (const worker of [...world.core.people.values()].filter(
          (p) => p.alive && p.jobId && p.id !== world.core.playerId,
        )) {
          try {
            const out = dev.forceLayoff(worker.id);
            if ("bookedFor" in out && out.bookedFor)
              booked = { personId: worker.id, on: out.bookedFor };
            if (booked) break;
          } catch {
            /* not on a staff: try the next */
          }
        }
      }
      expect(booked, `${where}: no worker had worked today`).toBeDefined();
      // One day on, with no second call: the job has ended and the layoff is on record.
      expect(booked!.on, where).toBe(addDays(makeIsoDate(world.core.date), 1));
      dev.advance(booked!.on);
      expect(world.core.people.get(booked!.personId)!.jobId, where).toBeFalsy();
      const changes = (
        coreAPI(world.core)
          .moduleState(JOBS_MODULE_ID)
          .table("changes")
          .rows() as unknown as { personId: string; kind: string }[]
      ).filter(
        (row) => row.personId === booked!.personId && row.kind === "layoff",
      );
      expect(changes.length, `${where}: the layoff is on record`).toBe(1);
    },
  );
});
