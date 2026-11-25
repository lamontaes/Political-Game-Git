/**
 * A player who leaves their job by their own press has a last day with the
 * people still working there, in a played world (scene-producers, step 5).
 * The cause is the game's own call: dev mode's quit (`DevMode.forceScene`,
 * recipe "quit") is the Leave work control (`leaveJobAs`, the jobs engine's
 * `quitJob`), which ends the job as a job left (`jobs:left-work:`), so the
 * director's household-pay read makes `money:job-left` on the job and the
 * last-day type casts the coworkers still there. The place is drawn from all
 * 56 (drawn-place-tests); a place whose player has no job they may leave, or
 * no one left at work to say goodbye, is passed over by name.
 * GOLDEN_PATH_SEED=<seed> replays a run.
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
import { jobLeaveBlock } from "../core2/modules/jobs";
import { coreAPI } from "../core2/state";
import type { PersonId } from "../core2/types";
import { purposeScene } from "./purpose-scene";

const seed = process.env.GOLDEN_PATH_SEED ?? randomBytes(8).toString("hex");
const DRAWS = 10;
/** The days the scene may take to stage after the job ends. */
const DAYS = 10;

it(`a player who leaves their job has a last day with the coworkers still there (seed ${seed})`, () => {
  setBookkeeping(false);
  const passed: string[] = [];
  for (let draw = 0; draw < DRAWS; draw += 1) {
    const place = drawPlace(seed, `last-day-played:${draw}`);
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
    const blocked = me ? jobLeaveBlock(coreAPI(core), me) : "no-player";
    if (!me || blocked) {
      passed.push(`${where}: the player cannot leave a job (${blocked})`);
      continue;
    }
    const jobId = core.people.get(me)!.jobId!;
    director.watch(core, me);
    const dev = new DevMode(core, director, undefined, place.key);
    const forced = dev.forceScene({ typeKey: "last-day" });
    expect(
      (forced as { mark?: { control?: string } }).mark?.control,
      `${where}: dev mode's quit leaves a mark`,
    ).toBe("quit");
    const book = director.ledger.people.get(me)!;
    const staged = () =>
      book.schedule.find(
        (entry) =>
          book.momentsById.get(entry.momentId)?.causeId === jobId &&
          entry.bindings.some((b) => b.typeKey === "last-day"),
      );
    for (let day = 0; day < DAYS && !staged(); day += 1)
      advanceCore(core, addDays(makeIsoDate(core.date), 1));
    const entry = staged();
    const moments = book.moments
      .filter((m) => m.causeId === jobId)
      .map((m) => `${m.label} (${m.causeKind})`);
    if (!entry) {
      // A last day needs someone still at work to say goodbye: a job with no
      // one left on its staff stages nothing, and the place is passed over.
      const coverage = book.schedule
        .filter((e) => book.momentsById.get(e.momentId)?.causeId === jobId)
        .map((e) => JSON.stringify(e.coverage ?? e.outcome));
      if (coverage.some((row) => /former-coworkers|staying/.test(row))) {
        passed.push(`${where}: no one left at work (${coverage.join(", ")})`);
        continue;
      }
    }
    expect(
      entry,
      `${where}: leaving ${jobId} stages a last-day scene within ${DAYS} days; its moments: ${moments.join(", ") || "none"}`,
    ).toBeDefined();
    const moment = book.momentsById.get(entry!.momentId)!;
    expect(moment.label, `${where}: the job left`).toBe("money:job-left");
    const binding = entry!.bindings.find((b) => b.typeKey === "last-day")!;
    const staying =
      binding.roles.find((row) => row.role === "staying")?.personIds ?? [];
    expect(
      staying.length,
      `${where}: someone still at work says goodbye`,
    ).toBeGreaterThan(0);
    for (const id of staying)
      expect(
        [...core.jobs.values()].some(
          (job) =>
            job.personId === id &&
            job.endsAt === undefined &&
            job.organizationId === core.jobs.get(jobId)?.organizationId,
        ),
        `${where}: ${id} still works where the player did`,
      ).toBe(true);
    const result = purposeScene(core, director, me, entry!, {
      typeKey: "last-day",
    });
    expect(
      result?.kind,
      `${where}: ${result?.kind === "skipped" ? result.reason : "composed"}`,
    ).toBe("composed");
    process.stdout.write(
      `last-day-played: ${where} (run seed ${seed}); left ${jobId}; staged ${entry!.date} with ${staying.join(", ")}; passed over ${passed.length ? passed.join("; ") : "none"}\n`,
    );
    return;
  }
  throw new Error(
    `none of ${DRAWS} drawn places has a player who can leave a job with coworkers still there (run seed ${seed}): ${passed.join("; ")}`,
  );
}, 1_800_000);
