/**
 * A town with no shock keeps its jobs: an employer's staffing target reads the
 * sales it is making, so a year at a drawn place leaves the town's employment
 * near where it opened (CTO order, #10377, queue item 2). With the opening's
 * job-record scale dividing the sales-implied staffing, employers let staff
 * go all year and a drawn town lost a fifth of its jobs.
 *
 * The place is drawn from all 56 on a seed nobody chose (JOBS_HOLD_SEED pins a
 * seed for a re-run); the failure names the place and seed.
 */
import { randomBytes } from "node:crypto";
import { expect, it } from "vitest";
import { drawPlace } from "../../scripts/core2-year/place";
import { buildBenchWorld } from "../bench/world";
import { setBookkeeping } from "./bookkeeping";
import { gameStartDate } from "./game-start";
import { addDays, makeIsoDate } from "./kernel/dates";
import { advanceCore } from "./life";
import { residentsRuntime } from "./modules/residents";
import type { CoreState } from "./types";

/** The jobs the town's people hold today: named people living here and the counted jobs, one each. */
function jobsHeld(core: CoreState, placeId: string): number {
  const rt = residentsRuntime(core)!;
  let n = 0;
  for (const job of core.jobs.values())
    if (
      job.endsAt === undefined &&
      core.people.get(job.personId)?.placeId === placeId
    )
      n += 1;
  for (const job of rt.jobs.values()) if (job.endsAt === undefined) n += 1;
  return n;
}

const seed = process.env.JOBS_HOLD_SEED ?? randomBytes(8).toString("hex");

const DRAWS = 10;

it("a drawn town with counted workers keeps at least nine in ten of its jobs through a year with no shock", () => {
  // The case is a place whose jobs are partly counted (the opening's job-record scale above one): at a place with none the scale is one and the staffing target is the same either way. A place without counted jobs is passed over and named.
  const passed: string[] = [];
  setBookkeeping(false);
  for (let i = 0; i < DRAWS; i += 1) {
    const place = drawPlace(`${seed}:${i}`, "jobs-employment-holds");
    const world = buildBenchWorld(place.seed, gameStartDate(), {
      twoLevel: true,
      placeKey: place.key,
    });
    const core = world.core;
    if (residentsRuntime(core)!.jobs.size === 0) {
      passed.push(
        `${place.name ?? place.key} (${place.key}), seed ${place.seed}`,
      );
      continue;
    }
    const opened = jobsHeld(core, world.placeId);
    advanceCore(core, addDays(makeIsoDate(core.date), 365));
    const after = jobsHeld(core, world.placeId);
    expect(
      after / opened,
      `${place.name ?? place.key} (${place.key}), seed ${place.seed}: jobs ${opened} to ${after}; passed over for no counted jobs: ${passed.join("; ") || "none"}`,
    ).toBeGreaterThanOrEqual(0.9);
    return;
  }
  throw new Error(
    `no drawn place had counted jobs in ${DRAWS} draws (base ${seed}); passed over ${passed.join("; ")}`,
  );
}, 3_600_000);
