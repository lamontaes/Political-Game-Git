/**
 * A player laid off is told at work by the one who decided it, in a played
 * world (scene-producers, step 5). The cause is the jobs engine's own record:
 * dev mode's layoff (`DevMode.forceScene`, recipe "layoff") ends the player's
 * job through `layOffWorker`, which writes `work.job-lost` with who decided it
 * (`decidedBy`, the owner or the best-paid worker left). That record carries
 * the layoff's mood impulse, so the director's day keys the change by the
 * event (`event:work.job-lost`), never as `money:job-ended`; the layoff type
 * reads it by that kind. The place is drawn from all 56 (drawn-place-tests);
 * a place whose player has no job, or whose layoff names no living decider, is
 * passed over by name. GOLDEN_PATH_SEED=<seed> replays a run.
 */
import { randomBytes } from "node:crypto";
import { expect, it } from "vitest";
import { drawPlace } from "../../scripts/core2-year/place";
import { DevMode } from "../bench/dev-mode";
import { buildBenchWorld } from "../bench/world";
import { setBookkeeping } from "../core2/bookkeeping";
import { gameStartDate } from "../core2/game-start";
import { addDays, makeIsoDate } from "../core2/kernel/dates";
import { advanceCore } from "../core2/life";
import type { PersonId } from "../core2/types";
import { purposeScene } from "./purpose-scene";

const seed = process.env.GOLDEN_PATH_SEED ?? randomBytes(8).toString("hex");
const DRAWS = 10;
/** The days the scene may take to stage after the layoff (it is staged at its cause). */
const DAYS = 10;

it(`a player laid off is told at work by the one who decided it (seed ${seed})`, () => {
  setBookkeeping(false);
  const passed: string[] = [];
  for (let draw = 0; draw < DRAWS; draw += 1) {
    const place = drawPlace(seed, `layoff-played:${draw}`);
    const where = `${place.name} (${place.key}), seed ${place.seed}`;
    let world: ReturnType<typeof buildBenchWorld>;
    try {
      world = buildBenchWorld(place.seed, gameStartDate(), {
        twoLevel: true,
        placeKey: place.key,
      });
    } catch (error) {
      passed.push(`${where}: no player here (${(error as Error).message})`);
      continue;
    }
    const { core, director } = world;
    const me = world.playerId as PersonId | undefined;
    const jobId = me ? core.people.get(me)?.jobId : undefined;
    if (!me || !jobId) {
      passed.push(`${where}: the player has no job`);
      continue;
    }
    director.watch(core, me);
    const dev = new DevMode(core, director, undefined, place.key);
    const forced = dev.forceScene({ typeKey: "layoff", forId: me });
    const recordId = [...core.durableLog.keys()].find(
      (id) =>
        String(id).startsWith("event:work.job-lost:") &&
        core.durableLog.get(id)?.personIds.includes(me),
    );
    if (!recordId) {
      passed.push(
        `${where}: dev mode's layoff wrote no work.job-lost naming the player (${JSON.stringify(forced).slice(0, 160)})`,
      );
      continue;
    }
    const record = core.durableLog.get(recordId)!;
    const decider = String(record.facts?.decidedBy ?? "");
    if (!core.people.get(decider as PersonId)?.alive) {
      passed.push(
        `${where}: ${recordId} names no living decider (${decider || "none"})`,
      );
      continue;
    }
    const book = director.ledger.people.get(me)!;
    const staged = () =>
      book.schedule.find(
        (entry) =>
          book.momentsById.get(entry.momentId)?.causeId === recordId &&
          entry.bindings.some((b) => b.typeKey === "layoff"),
      );
    for (let day = 0; day < DAYS && !staged(); day += 1)
      advanceCore(core, addDays(makeIsoDate(core.date), 1));
    const entry = staged();
    const moments = book.moments
      .filter((m) => m.causeId === recordId)
      .map((m) => `${m.label} (${m.causeKind})`);
    expect(
      entry,
      `${where}: the layoff ${recordId} stages a layoff scene within ${DAYS} days; its moments: ${moments.join(", ") || "none"}`,
    ).toBeDefined();
    const binding = entry!.bindings.find((b) => b.typeKey === "layoff")!;
    expect(
      binding.roles.find((row) => row.role === "boss")?.personIds,
      `${where}: the boss is the one the record says decided`,
    ).toEqual([decider]);
    expect(
      binding.roles.find((row) => row.role === "worker")?.personIds,
    ).toEqual([me]);
    const result = purposeScene(core, director, me, entry!, {
      typeKey: "layoff",
    });
    expect(
      result?.kind,
      `${where}: ${result?.kind === "skipped" ? result.reason : "composed"}`,
    ).toBe("composed");
    process.stdout.write(
      `layoff-played: ${where} (run seed ${seed}); record ${recordId}, decided by ${decider}; staged ${entry!.date}; passed over ${passed.length ? passed.join("; ") : "none"}\n`,
    );
    return;
  }
  throw new Error(
    `none of ${DRAWS} drawn places has a working player whose layoff names a living decider (run seed ${seed}): ${passed.join("; ")}`,
  );
}, 1_800_000);
