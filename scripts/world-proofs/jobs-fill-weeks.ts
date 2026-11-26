/**
 * How fast the jobs engine's own weekly market fills a town's vacancies (map row 13, first slice:
 * "time it, and find how many weeks the market needs to fill the town").
 *
 * A played world; a share of the town's full-person jobs ended through the engine's own layoff
 * (`layOffWorker`, so the workers become seekers); each ended job's position posted again through
 * `postFundedOpenings` with the job as its template; then the clock runs a week at a time through
 * `advanceCore` and each week prints the positions by status, the seekers and the elapsed time.
 * Nothing in the engine is tuned.
 *
 * node --import tsx scripts/world-proofs/jobs-fill-weeks.ts <seed> [placeKey] [share 0 to 1] [weeks]
 */
import { performance } from "node:perf_hooks";
import { buildBenchWorld } from "../../src/bench/world";
import { gameStartDate } from "../../src/core2/game-start";
import { advanceCore } from "../../src/core2/life";
import { addDays, makeIsoDate } from "../../src/core2/kernel/dates";
import {
  JOBS_MODULE_ID,
  layOffWorker,
  postFundedOpenings,
} from "../../src/core2/modules/jobs";
import { coreAPI } from "../../src/core2/state";
import { drawPlace } from "../../tests/golden-path/place";

const seed = process.argv[2] ?? "r7";
const placeKey = process.argv[3] || drawPlace(seed, "jobs-fill-weeks").key;
const share = Number(process.argv[4] ?? 0.1);
const weeks = Number(process.argv[5] ?? 52);
const world = buildBenchWorld(seed, gameStartDate(), {
  twoLevel: true,
  placeKey,
});
const core = world.core;
const api = coreAPI(core);
// The town's own people only: most full-person jobs belong to relatives and officials who live
// in other places, whom the town's market never hires (their place is a state, not a town).
const townPlace = core.people.get(world.playerId!)!.placeId;
const held = [...core.jobs.values()].filter(
  (job) =>
    job.personId !== world.playerId &&
    core.people.get(job.personId as never)?.placeId === townPlace,
);
const picked = held.filter((_, index) => index % 100 < share * 100);
let laidOff = 0;
const cohort: string[] = [];
for (const job of picked) {
  const result = layOffWorker(api, job.id);
  if (result && typeof result === "object") {
    laidOff += 1;
    cohort.push(job.personId);
  }
}
/** How many of the ended jobs' holders hold a job again. */
const employedAgain = () =>
  cohort.filter((id) => {
    const jobId = core.people.get(id as never)?.jobId;
    const job = jobId ? core.jobs.get(jobId) : undefined;
    return job !== undefined && (!job.endsAt || job.endsAt > core.date);
  }).length;
let posted = 0;
for (const job of picked)
  posted += postFundedOpenings(api, {
    organizationId: job.organizationId,
    templateJobId: job.id,
    count: 1,
    key: `fill:${job.id}`,
    lawId: "jobs-fill-weeks",
  });
process.stdout.write(
  `place ${placeKey}, seed ${seed}: ${held.length} jobs held by the town\'s own people, ${laidOff} ended, ${posted} positions posted\n`,
);
const started = performance.now();
for (let week = 1; week <= weeks; week += 1) {
  advanceCore(core, addDays(makeIsoDate(core.date), 7));
  const byStatus: Record<string, number> = {};
  for (const row of api
    .moduleState(JOBS_MODULE_ID)
    .table("positions")
    .rows() as unknown as { status: string }[])
    byStatus[row.status] = (byStatus[row.status] ?? 0) + 1;
  const seekers = api
    .moduleState(JOBS_MODULE_ID)
    .table("seekers")
    .rows().length;
  process.stdout.write(
    `week ${week} ${core.date} cohort employed ${employedAgain()} of ${cohort.length} positions ${JSON.stringify(byStatus)} seekers ${seekers} ${Math.round(performance.now() - started)} ms\n`,
  );
  if (!(byStatus["open"] ?? 0)) break;
}
