/**
 * A layoff forced through dev mode's own call in a played world stages the
 * layoff scene at work for the worker, with the boss who decided it. The
 * jobs engine's event carries a feeling of its own (the life change of being
 * fired), so the director's feeling pass makes the lost job's row first; the
 * money pass's job end must still name the moment (`money:job-ended`), the
 * label the layoff type reads.
 *
 * A worker with someone at home is told at home instead (the layoff yields to
 * the household's news, director-civic-producers-household), so the worker
 * here lives alone. A worker let go by a business with no living person on
 * record as its decider has no boss to bind, so no layoff scene stages and
 * none is invented; the test passes over them and names them, and passes over
 * a draw with no lone worker whose employer names a boss.
 *
 * A random place and seed each run (LAYOFF_SCENE_SEED replays one), named.
 */
import { randomBytes } from "node:crypto";
import { expect, it } from "vitest";
import { drawPlace } from "../../scripts/core2-year/place";
import { buildBenchWorld } from "../bench/world";
import { BenchPlayer } from "../bench/player";
import { DevMode } from "../bench/dev-mode";
import { setBookkeeping } from "../core2/bookkeeping";
import { gameStartDate } from "../core2/game-start";
import { addDays, makeIsoDate } from "../core2/kernel/dates";
import type { PersonId } from "../core2/types";

const seed = process.env.LAYOFF_SCENE_SEED ?? randomBytes(10).toString("hex");
const DRAWS = 4;
const TRIES = 12;

it(
  `a forced layoff stages the layoff scene with the boss (seed ${seed})`,
  { timeout: 900_000 },
  () => {
    setBookkeeping(false);
    const passed: string[] = [];
    let found:
      | {
          where: string;
          workerId: string;
          eventId: string;
          bossId: string;
          momentId: string;
          label: string;
          channels: string;
          typeKeys: string[];
          bossBound: string[];
          workerBound: string[];
          housed: string;
        }
      | undefined;
    for (let draw = 0; draw < DRAWS && !found; draw += 1) {
      const place = drawPlace(`${seed}:${draw}`, "layoff-scene");
      const world = buildBenchWorld(place.seed, gameStartDate(), {
        twoLevel: true,
        placeKey: place.key,
      });
      const { core, director } = world;
      const where = `${place.name} (${place.key}), seed ${seed}, draw ${draw}`;
      const dev = new DevMode(
        core,
        director,
        new BenchPlayer(core, director),
        world.placeId,
      );
      // The played town's own workers (not the officials of other places).
      const home = core.people.get(core.playerId)!.placeId;
      const workers = [...core.people.values()]
        .filter(
          (p) =>
            p.alive && p.jobId && p.id !== core.playerId && p.placeId === home,
        )
        .sort((a, b) => a.id.localeCompare(b.id));
      const alone = (id: string) =>
        !(
          core.households.get(core.people.get(id)!.householdId)?.memberIds ?? []
        ).some((m) => m !== id && core.people.get(m)?.alive);
      const lone = workers.filter((p) => alone(p.id)).slice(0, TRIES);
      const housedWorker = workers.find((p) => !alone(p.id));
      const tried = [...lone, ...(housedWorker ? [housedWorker] : [])];
      // Each is followed as the player's circle is (dev mode's own call), so
      // the records naming them are kept, and watched by the director.
      for (const p of tried) {
        dev.follow(p.id);
        if (!director.ledger.people.has(p.id as PersonId))
          director.watch(core, p.id as PersonId);
      }
      // A worker who played today's day is let go on a later day: each day
      // closes, and the ones still working are asked again, for a week.
      const laidOff: { id: string; eventId: string }[] = [];
      const refused = new Map<string, string>();
      for (let day = 0; day < 7; day += 1) {
        dev.advance(addDays(makeIsoDate(core.date), 1));
        for (const p of tried) {
          if (laidOff.some((row) => row.id === p.id)) continue;
          const jobId = core.people.get(p.id)?.jobId;
          if (!jobId) continue;
          try {
            dev.forceLayoff(p.id);
            laidOff.push({
              id: p.id,
              eventId: `event:work.job-lost:${core.date}:${jobId}`,
            });
            refused.delete(p.id);
          } catch (error) {
            refused.set(p.id, (error as Error).message);
          }
        }
      }
      for (const [id, said] of refused)
        passed.push(`${where}: ${id} refused (${said})`);
      // The last layoff day closes, and the director measures it.
      dev.advance(addDays(makeIsoDate(core.date), 1));
      const read = (personId: string, eventId: string) => {
        const book = director.ledger.people.get(personId as PersonId)!;
        const moment = book.moments.find((row) => row.causeId === eventId);
        const entry = moment
          ? book.schedule.find((row) => row.momentId === moment.id)
          : undefined;
        return { moment, entry };
      };
      let housed = "no housed worker laid off";
      for (const row of laidOff) {
        const event = core.durableLog.get(row.eventId);
        const decidedBy = event?.facts?.decidedBy;
        const { moment, entry } = read(row.id, row.eventId);
        const typeKeys = (entry?.bindings ?? []).map((b) => b.typeKey);
        const said = `${row.id} at ${String(event?.facts?.organizationId)}: moment ${moment?.label ?? "none"}, scenes [${typeKeys.join(", ")}]`;
        if (!alone(row.id)) {
          housed = said;
          // Told at home: the layoff yields to the household's news.
          expect(typeKeys, `${where}: ${said}`).not.toContain("layoff");
          continue;
        }
        const boss =
          typeof decidedBy === "string" && core.people.get(decidedBy)?.alive
            ? decidedBy
            : undefined;
        if (!boss) {
          // No living decider on record: no boss is invented, so no layoff.
          expect(typeKeys, `${where}: ${said}`).not.toContain("layoff");
          passed.push(
            `${where}: ${said}, decided by ${String(decidedBy)} (no named boss)`,
          );
          continue;
        }
        const layoff = entry?.bindings.find((b) => b.typeKey === "layoff");
        found ??= {
          where,
          workerId: row.id,
          eventId: row.eventId,
          bossId: boss,
          momentId: moment?.id ?? "none",
          label: moment?.label ?? "none",
          channels: (moment?.channels ?? [])
            .map((c) => `${c.channel} ${c.contribution.toFixed(3)}`)
            .join(", "),
          typeKeys,
          bossBound:
            layoff?.roles.find((r) => r.role === "boss")?.personIds ?? [],
          workerBound:
            layoff?.roles.find((r) => r.role === "worker")?.personIds ?? [],
          housed: "",
        };
      }
      if (found) found.housed = housed;
      else
        passed.push(
          `${where}: no lone worker whose employer names a living boss among ${lone.length}`,
        );
    }
    process.stderr.write(
      `layoff scene, seed ${seed}\npassed over:\n  ${passed.join("\n  ") || "none"}\nfound: ${JSON.stringify(found, null, 1)}\n`,
    );
    expect(found, `seed ${seed}: ${passed.join("; ")}`).toBeDefined();
    const at = `${found!.where}: ${found!.workerId}, ${found!.eventId}, moment ${found!.momentId} (${found!.label}; ${found!.channels})`;
    expect(found!.label, at).toBe("money:job-ended");
    expect(found!.typeKeys, at).toContain("layoff");
    expect(found!.bossBound, at).toEqual([found!.bossId]);
    expect(found!.workerBound, at).toEqual([found!.workerId]);
  },
);
