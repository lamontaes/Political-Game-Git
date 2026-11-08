/**
 * Jobs and economy proof: a played world for 24 months in a place, printing
 * month by month the town's out-of-work count against its labor force (named
 * and counted people, counted at their weight), the open positions at the
 * town's employers, and the regional hires by record id.
 *
 * The labor force is the people holding a job plus the seekers, so the rate
 * is the one the jobs engine's own tables show (BLS LAUS defines it as
 * unemployed over labor force).
 *
 * node --import tsx scripts/world-proofs/jobs-24-months.ts <seed> <placeKey> [months]
 */
import { buildBenchWorld } from "../../src/bench/world";
import { gameStartDate } from "../../src/core2/game-start";
import { advanceCore } from "../../src/core2/life";
import { coreAPI } from "../../src/core2/state";
import { addDays, makeIsoDate } from "../../src/core2/kernel/dates";
import { JOBS_MODULE_ID } from "../../src/core2/modules/jobs";
import { residentsRuntime } from "../../src/core2/modules/residents";
import { drawPlace } from "../../tests/golden-path/place";

const seed = process.argv[2] ?? "r7";
const placeKey = process.argv[3] || drawPlace(seed, "jobs-24-months").key;
const months = Number(process.argv[4] ?? 24);
const start = gameStartDate();
const world = buildBenchWorld(seed, start, { twoLevel: true, placeKey });
const core = world.core;
const api = coreAPI(core);
const rt = residentsRuntime(core)!;
const table = (name: string) =>
  api.moduleState(JOBS_MODULE_ID).table(name).rows() as unknown as Record<
    string,
    unknown
  >[];

function snapshot(label: string) {
  // The jobs engine's own units: one record is one person, named or counted.
  const seekers = [...table("seekers"), ...table("countedSeekers")].filter(
    (row) => !row.employed && row.placeId === world.placeId,
  );
  const unemployed = seekers.length;
  const named = [...core.jobs.values()].filter(
    (job) =>
      job.endsAt === undefined &&
      core.people.get(job.personId)?.placeId === world.placeId,
  ).length;
  const counted = [...rt.jobs.values()].filter(
    (job) => job.endsAt === undefined,
  ).length;
  const force = unemployed + named + counted;
  const open = table("positions").filter((row) => row.status === "open");
  const commuters = [...core.jobs.values()].filter(
    (job) => job.endsAt === undefined && job.id.startsWith("job:commuter:"),
  ).length;
  const changes = (
    api.moduleState(JOBS_MODULE_ID).table("changes").rows() as unknown as {
      id: string;
      kind: string;
      values?: Record<string, number>;
    }[]
  ).filter((row) => row.id.startsWith(`job-change:${core.date.slice(0, 7)}`));
  const count = (test: (row: (typeof changes)[number]) => boolean) =>
    changes.filter(test).length;
  console.log(
    `${label} layoffs ${count((r) => r.kind === "layoff")} (turnover ${count((r) => r.kind === "layoff" && !!r.values?.turnoverPull)}) hires ${count((r) => r.kind === "hire")} (regional ${count((r) => r.kind === "hire" && !!r.values?.regional)})`,
  );
  console.log(
    `${label} unemployed ${unemployed} of ${force} (${((100 * unemployed) / force).toFixed(1)}%) openPositions ${open.length} commuterJobs ${commuters}`,
  );
}

console.log(`place ${placeKey} seed ${seed}`);
snapshot("start");
let day = start;
for (let m = 1; m <= months; m++) {
  const end = addDays(makeIsoDate(start), m * 30);
  while (day < end) {
    const next = addDays(makeIsoDate(day), 1);
    advanceCore(core, next);
    day = next;
  }
  snapshot(`m${m}`);
}
const hires = (
  api.moduleState(JOBS_MODULE_ID).table("changes").rows() as unknown as {
    id: string;
    kind: string;
    values?: Record<string, number>;
  }[]
).filter((row) => row.kind === "hire" && row.values?.regional);
console.log(
  `regional hires ${hires.length}; first records: ${hires
    .slice(0, 3)
    .map((row) => row.id)
    .join(", ")}`,
);
// Hours cuts: the jobs whose hours the employers changed (core.work.hourChanges), the record that hours moved before staff.
const hourRows = [...world.core.work.hourChanges.values()].flat();
console.log(
  `jobs with an hours change ${world.core.work.hourChanges.size}; changes ${hourRows.length}; first: ${[...world.core.work.hourChanges.keys()].slice(0, 3).join(", ")}`,
);
