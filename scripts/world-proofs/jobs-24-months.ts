/**
 * Jobs and economy proof: a played world for 24 months in a place, printing
 * month by month the town's out-of-work count against its labor force (named
 * and counted people, counted at their weight), the open positions at the
 * town's employers, the regional hires by record id, and the town's outside
 * sales by its sellers' sector (the outside buyers' flows at the rate they pay,
 * dollars a 30-day month, and against the opening), with the country tier's
 * records each sector followed.
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
import { sectorOfKind } from "../../src/core2/business-books";
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

// The town's outside sales by sector: every live outside buyers' flow, at the rate it pays a 30-day month.
const outsideAtStart = new Map<string, number>();
const followed = new Map<string, string>();
function outsideBySector(): Map<string, number> {
  const out = new Map<string, number>();
  for (const flow of rt.flows.values()) {
    if (flow.kind !== "outside-sales" || flow.endedAt) continue;
    const book = core.finance.businesses.get(flow.payeeId);
    const sector = (book && sectorOfKind(book.kindId)) ?? "no-sector";
    const perMonth =
      flow.cadence.kind === "days"
        ? (flow.amountMinor * 30) / flow.cadence.every
        : flow.amountMinor / flow.cadence.every;
    out.set(sector, (out.get(sector) ?? 0) + perMonth / 100);
    const note = flow.source.estimatedFrom?.match(/follow (.*)\.$/)?.[1];
    if (note && !followed.has(sector))
      followed.set(sector, `${flow.id} follows ${note}`);
  }
  return out;
}
let outsideLast = new Map<string, number>();
let firstYearOutside = 0;
const monthsSectorsDiffer: string[] = [];
function outsideLine(label: string) {
  const now = outsideBySector();
  if (label === "start") for (const [k, v] of now) outsideAtStart.set(k, v);
  const total = [...now.values()].reduce((a, b) => a + b, 0);
  const month = Number(label.slice(1));
  if (month >= 1 && month <= 12) firstYearOutside += total;
  // A month the sectors moved apart: two sectors' change on the month differs by at least a twentieth of a point.
  const moves = [...now]
    .filter(([sector]) => (outsideLast.get(sector) ?? 0) > 0)
    .map(([sector, dollars]) => (100 * dollars) / outsideLast.get(sector)!);
  if (moves.length >= 2 && Math.max(...moves) - Math.min(...moves) >= 0.05)
    monthsSectorsDiffer.push(label);
  outsideLast = now;
  const cells = [...now.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([sector, dollars]) => {
      const was = outsideAtStart.get(sector);
      return `${sector} $${Math.round(dollars)}${was ? ` (${((100 * dollars) / was).toFixed(2)}%)` : ""}`;
    });
  console.log(
    `${label} outside sales total $${Math.round(total)}; by sector: ${cells.join(", ")}`,
  );
}

let seen = new Map<string, string>();
let lastDate = core.date;
function snapshot(label: string) {
  // The jobs engine's own units: one record is one person, named or counted.
  const seekers = [...table("seekers"), ...table("countedSeekers")].filter(
    (row) => !row.employed && row.placeId === world.placeId,
  );
  const unemployed = seekers.length;
  // The town's own flows since the last snapshot, named and counted people alike: who came into the pool and why, who left it hired or with no hire.
  const now = new Map(
    seekers.map((row) => [String(row.personId), String(row.reasonKey)]),
  );
  if (label !== "start") {
    const hiredNow = new Set(
      (
        table("changes") as unknown as {
          personId: string;
          date: string;
          kind: string;
        }[]
      )
        .filter((row) => row.kind === "hire" && row.date > lastDate)
        .map((row) => row.personId),
    );
    let lost = 0,
      chose = 0,
      hired = 0,
      gaveUp = 0;
    for (const [id, reason] of now)
      if (!seen.has(id)) {
        if (reason === "started-looking" || reason === "opening-unemployed")
          chose += 1;
        else lost += 1;
      }
    for (const id of seen.keys())
      if (!now.has(id)) {
        if (hiredNow.has(id)) hired += 1;
        else gaveUp += 1;
      }
    console.log(
      `${label} town flows: in lost-job ${lost}, in chose-to-look ${chose}; out hired ${hired}, out gave-up-or-left ${gaveUp}`,
    );
  }
  seen = now;
  lastDate = core.date;
  const named = [...core.jobs.values()].filter(
    (job) =>
      job.endsAt === undefined &&
      core.people.get(job.personId)?.placeId === world.placeId,
  ).length;
  const counted = [...rt.jobs.values()].filter(
    (job) => job.endsAt === undefined,
  ).length;
  // The opening's employment target also holds working-age members at work outside a recorded job; they are in the labor force until a fill-in gives them a commuter job.
  let unplaced = 0;
  for (const h of rt.store.liveHouseholds())
    if (h.placeId === world.placeId)
      unplaced += h.unplacedWorkers / rt.store.weightOf(h);
  const force = unemployed + named + counted + Math.round(unplaced);
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
  outsideLine(label);
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
console.log(
  `outside sales in months 1 to 12, the 30-day rates summed: $${Math.round(firstYearOutside)}; months two sectors moved apart: ${monthsSectorsDiffer.length} of ${months} (${monthsSectorsDiffer.join(" ")})`,
);
console.log(
  `outside sales followed: ${[...followed.values()].join("; ") || "no flow names the records it follows"}`,
);
// Hours cuts: the jobs whose hours the employers changed (core.work.hourChanges), the record that hours moved before staff.
const hourRows = [...world.core.work.hourChanges.values()].flat();
console.log(
  `jobs with an hours change ${world.core.work.hourChanges.size}; changes ${hourRows.length}; first: ${[...world.core.work.hourChanges.keys()].slice(0, 3).join(", ")}`,
);
