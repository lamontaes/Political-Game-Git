/**
 * A job states the week its schedule runs: payroll pays the hourly rate for
 * the scheduled minutes, so the hours and daily pay the job row states are
 * those minutes at that rate. At the opening and for the hires of the first
 * months, every full worker's annual pay over the minutes the schedule runs is
 * the annual pay the job states. Played world, a place and seed nobody chose.
 */
import { randomBytes } from "node:crypto";
import { expect, it } from "vitest";
import { drawPlace } from "../../scripts/core2-year/place";
import { buildBenchWorld } from "../bench/world";
import { setBookkeeping } from "./bookkeeping";
import { gameStartDate } from "./game-start";
import { addDays, makeIsoDate } from "./kernel/dates";
import { advanceCore } from "./life";
import type { CoreState } from "./types";

const seed = process.env.GOLDEN_PATH_SEED ?? randomBytes(8).toString("hex");

/** Each open job's scheduled annual pay over its stated annual pay, by job id. */
function ratios(
  core: CoreState,
  statedDaily: (
    job: CoreState["jobs"] extends Map<string, infer J> ? J : never,
  ) => number,
): Map<string, number> {
  const out = new Map<string, number>();
  for (const commitment of core.work.commitments.values()) {
    const job = core.jobs.get(commitment.jobId);
    if (!job || job.endsAt !== undefined || commitment.endsAt !== undefined)
      continue;
    const scheduledDaily =
      (commitment.hourlyMinor * commitment.expectedWeeklyMinutes) / 7 / 60;
    out.set(job.id, scheduledDaily / statedDaily(job));
  }
  return out;
}

it("a job pays its stated annual pay over the minutes its schedule runs", () => {
  const place = drawPlace(seed, "opening-schedule-pay");
  const where = `${place.name} (${place.key}), seed ${seed}`;
  const { core } = buildBenchWorld(place.seed, gameStartDate(), {
    twoLevel: true,
    placeKey: place.key,
  });
  const off = (table: Map<string, number>) =>
    [...table]
      .filter(([, ratio]) => Math.abs(ratio - 1) > 0.02)
      .map(([id, ratio]) => `${id} ${ratio.toFixed(3)}`);
  // At the opening: the pay the row states.
  const opening = ratios(core, (job) => job.wageDailyMinor);
  expect(opening.size, `${where}: jobs with a schedule`).toBeGreaterThan(0);
  expect(off(opening), `${where}: opening jobs off their stated pay`).toEqual(
    [],
  );
  // After the first months, with hires and raises: the hourly rate the job
  // pays over the hours it states.
  setBookkeeping(false);
  advanceCore(core, addDays(makeIsoDate(core.date), 120));
  const later = ratios(core, (job) => (job.hourlyMinor ?? 0) * job.hoursDaily);
  expect(off(later), `${where}: jobs off their stated pay`).toEqual([]);
}, 1_800_000);
