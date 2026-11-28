/**
 * An employer's staffing target reads the sales it is making (CTO order,
 * #10377, queue item 2). With the opening's job-record scale dividing the
 * sales-implied staffing, a place with counted workers read a sixth (a town)
 * to a thousandth (a city) of what its sales support, every employer's
 * smoothed sales staff slid to about half its opening staff in six months, and
 * the town shed a fifth of its jobs in a year. At a drawn place with counted
 * workers the sales-supported staff after six months holds near the opening's.
 *
 * The place is drawn from all 56 on a seed nobody chose (JOBS_HOLD_SEED pins
 * a seed for a re-run); a place with too few counted jobs for the scale to
 * matter is passed over and named, and the failure names the place and seed.
 */
import { randomBytes } from "node:crypto";
import { expect, it } from "vitest";
import { drawPlace } from "../../../scripts/core2-year/place";
import { buildBenchWorld } from "../../../src/bench/world";
import { setBookkeeping } from "../../../src/core2/bookkeeping";
import { gameStartDate } from "../../../src/core2/game-start";
import { addDays, makeIsoDate } from "../../../src/core2/kernel/dates";
import { advanceCore } from "../../../src/core2/life";
import { JOBS_MODULE_ID } from "../../../src/core2/modules/jobs";
import { residentsRuntime } from "../../../src/core2/modules/residents";
import { coreAPI } from "../../../src/core2/state";

const seed = process.env.JOBS_HOLD_SEED ?? randomBytes(8).toString("hex");
const DRAWS = 10;
/** Counted jobs a place needs for the opening's job-record scale to be well above one. */
const COUNTED_JOBS = 100;

it("a drawn town with counted workers keeps its employers' sales-supported staff near their opening staff through six months", () => {
  const passed: string[] = [];
  setBookkeeping(false);
  for (let i = 0; i < DRAWS; i += 1) {
    const place = drawPlace(`${seed}:${i}`, "jobs-employment-holds");
    const world = buildBenchWorld(place.seed, gameStartDate(), {
      twoLevel: true,
      placeKey: place.key,
    });
    const core = world.core;
    const counted = residentsRuntime(core)!.jobs.size;
    if (counted < COUNTED_JOBS) {
      passed.push(
        `${place.name ?? place.key} (${place.key}), seed ${place.seed}: ${counted} counted jobs`,
      );
      continue;
    }
    advanceCore(core, addDays(makeIsoDate(core.date), 183));
    let opening = 0;
    let sales = 0;
    for (const row of coreAPI(core)
      .moduleState(JOBS_MODULE_ID)
      .table("employers")
      .rows() as unknown as {
      id: string;
      openingStaff: number;
      salesStaff?: number;
    }[]) {
      const book = core.finance.businesses.get(row.id);
      if (!book || book.closedAt || row.salesStaff === undefined) continue;
      opening += row.openingStaff;
      sales += row.salesStaff;
    }
    expect(
      opening,
      `${place.name ?? place.key} (${place.key}), seed ${place.seed}: no employer had a sales-supported staff after six months`,
    ).toBeGreaterThan(0);
    expect(
      sales / opening,
      `${place.name ?? place.key} (${place.key}), seed ${place.seed}: sales-supported staff ${sales.toFixed(0)} against opening staff ${opening.toFixed(0)}; passed over: ${passed.join("; ") || "none"}`,
    ).toBeGreaterThanOrEqual(0.9);
    return;
  }
  throw new Error(
    `no drawn place had ${COUNTED_JOBS} counted jobs in ${DRAWS} draws (base ${seed}); passed over ${passed.join("; ")}`,
  );
}, 3_600_000);
