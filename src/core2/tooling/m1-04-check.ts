/**
 * M1-04 golden-path check, jobs, in a played world. Uses GOLDEN_PATH_SEED and
 * GOLDEN_PATH_PLACE_KEY from the runner. The drawn place is built as the
 * player gets it (`buildBenchWorld`, every module installed) and plays one
 * game year, read at the end of each month. The town's year-average monthly
 * rates are checked against the real ones for its state (BLS JOLTS monthly
 * rates, seasonally adjusted, 2001-2019: the 5th to 95th percentile of the
 * monthly rate, data/research/jobs/series/turnover.json) and its
 * unemployment against the lowest and highest rate its state recorded
 * (BLS LAUS, src/core2/data/regional/regions.json). Passes when:
 * (1) the town's unemployment is inside its state's recorded range;
 * (2) hiring is inside the state's JOLTS hires range;
 * (3) quitting is inside the state's JOLTS quits range;
 * (4) layoffs (layoffs and closures) are inside the state's JOLTS layoffs range;
 * (5) every job change on record names a reason from the jobs reasons table
 *     and who decided it, a decider that is a record in the world.
 * Rates are changes on record in the town's employers per hundred jobs at
 * the town's employers; the counted tier keeps no job-change records (owner,
 * Oct 14, ruling 3, src/core2/modules/jobs.ts noteCountedLeavers), so what is
 * measured is the record. Exits nonzero naming each failed clause.
 */
import regionsData from "../data/regional/regions.json" with { type: "json" };
import turnover from "../../../data/research/jobs/series/turnover.json" with { type: "json" };
import jobsData from "../data/jobs/jobs.json" with { type: "json" };
import { residentsRuntime } from "../modules/residents";
import { buildPlayedWorld, playYear } from "./m1-played-year";

const world = buildPlayedWorld();
const { api, core } = world;
const failures: string[] = [];
const jobs = api.moduleState("jobs");
const townId = world.placeId;
const orgPlace = (id: string) => core.organizations.get(id)?.placeId;

/** The town's jobs today: full people's and the counted tier's, at the town's employers. */
function employment(): number {
  let n = 0;
  for (const job of core.jobs.values())
    if (job.endsAt === undefined && orgPlace(job.organizationId) === townId)
      n += 1;
  for (const job of residentsRuntime(core)?.jobs.values() ?? [])
    if (job.endsAt === undefined && orgPlace(job.organizationId) === townId)
      n += 1;
  return n;
}
/** The town's people out of work and looking: full seekers without a job and the counted tier's. */
function unemployed(): number {
  let n = 0;
  for (const row of jobs.table("seekers").rows() as unknown as {
    placeId: string;
    employed: boolean;
  }[])
    if (row.placeId === townId && !row.employed) n += 1;
  for (const row of jobs.table("countedSeekers").rows() as unknown as {
    placeId: string;
  }[])
    if (row.placeId === townId) n += 1;
  return n;
}

const openingEmployment = employment();
const employedAt: number[] = [openingEmployment];
const unemploymentPct: number[] = [];
playYear(world, () => {
  employedAt.push(employment());
  const out = unemployed();
  unemploymentPct.push((100 * out) / Math.max(1, out + employedAt.at(-1)!));
});

// The changes on record in the year at the town's employers, by month.
type Change = {
  id: string;
  date: string;
  personId: string;
  organizationId: string;
  jobId: string;
  kind: string;
  reasonKey?: string;
  decidedBy?: string;
};
const changes = jobs.table("changes").rows() as unknown as Change[];
const inTown = changes.filter(
  (row) => orgPlace(row.organizationId) === townId && row.date > world.start,
);
const monthIndex = (date: string) => {
  const months =
    (Number(date.slice(0, 4)) - Number(world.start.slice(0, 4))) * 12 +
    Number(date.slice(5, 7)) -
    Number(world.start.slice(5, 7));
  // Month m covers the day of the start through the day before the next: a day past the start's day-of-month falls in the next month.
  return Math.min(
    12,
    Math.max(
      1,
      months +
        (Number(date.slice(8, 10)) > Number(world.start.slice(8, 10)) ? 1 : 0),
    ),
  );
};
const counts = {
  hires: Array<number>(12).fill(0),
  quits: Array<number>(12).fill(0),
  layoffs: Array<number>(12).fill(0),
};
for (const row of inTown) {
  const at = monthIndex(row.date) - 1;
  if (row.kind === "hire") counts.hires[at]! += 1;
  else if (row.kind === "quit") counts.quits[at]! += 1;
  else if (row.kind === "layoff" || row.kind === "closure")
    counts.layoffs[at]! += 1;
}
const monthlyRate = (series: number[]) =>
  series.map((n, i) => (100 * n) / Math.max(1, employedAt[i]!));
const mean = (series: number[]) =>
  series.reduce((sum, value) => sum + value, 0) / series.length;

// The town's state, from its region.
const regionId = (
  api.moduleState("regional").table("places").get(townId) as unknown as
    { regionId: string } | undefined
)?.regionId;
const fips = regionId?.split(":")[1];
const stateRates = (
  turnover.states as unknown as Record<
    string,
    Record<"hires" | "quits" | "layoffs", { p05: number; p95: number }>
  >
)[fips ?? ""];
if (!fips || !stateRates)
  failures.push(`no JOLTS state rates for the town's region ${regionId}`);
const lausSeries =
  (
    regionsData.series.stateUnemploymentPct as Record<
      string,
      Record<string, number>
    >
  )[fips ?? ""] ?? {};
const lausValues = Object.values(lausSeries);
const lausMonths = Object.keys(lausSeries).sort();
const lausRange = lausValues.length
  ? ([Math.min(...lausValues), Math.max(...lausValues)] as const)
  : undefined;
if (!lausRange) failures.push(`no recorded unemployment for state ${fips}`);

const result: Record<string, unknown> = {};
const unemploymentMean = mean(unemploymentPct);
if (
  lausRange &&
  !(unemploymentMean >= lausRange[0] && unemploymentMean <= lausRange[1])
)
  failures.push(
    `unemployment: the town's year average ${unemploymentMean.toFixed(2)}% is outside its state's recorded range [${lausRange[0]}, ${lausRange[1]}]% (LAUS ${lausMonths[0]} to ${lausMonths.at(-1)})`,
  );
for (const [name, series] of Object.entries(counts) as [
  "hires" | "quits" | "layoffs",
  number[],
][]) {
  const rate = mean(monthlyRate(series));
  result[name] = {
    changesOnRecord: series.reduce((sum, n) => sum + n, 0),
    meanMonthlyRatePerHundredJobs: Number(rate.toFixed(3)),
    stateRange: stateRates
      ? [stateRates[name].p05, stateRates[name].p95]
      : null,
  };
  if (
    stateRates &&
    !(rate >= stateRates[name].p05 && rate <= stateRates[name].p95)
  )
    failures.push(
      `${name}: the town's year-average monthly rate ${rate.toFixed(3)} per hundred jobs is outside its state's JOLTS range [${stateRates[name].p05}, ${stateRates[name].p95}] (${turnover.window.split(";")[0]})`,
    );
}

// (5) Every job change on record has a reason and a decider.
const reasons = new Set(Object.values(jobsData.reasons));
const counted = residentsRuntime(core);
const knownDecider = (id: string) =>
  core.people.has(id as never) ||
  core.organizations.has(id) ||
  core.eventIds.has(id) ||
  counted?.store.countedMember(id) !== undefined;
let withoutReason = 0,
  unknownDecider = 0;
for (const row of changes) {
  if (!row.reasonKey || !reasons.has(row.reasonKey) || !row.decidedBy) {
    withoutReason += 1;
    if (withoutReason <= 5)
      failures.push(
        `${row.id}: change without a known reason (${row.reasonKey ?? "none"}) or decider (${row.decidedBy ?? "none"})`,
      );
  } else if (!knownDecider(row.decidedBy)) {
    unknownDecider += 1;
    if (unknownDecider <= 5)
      failures.push(
        `${row.id}: decided by ${row.decidedBy}, which is no record`,
      );
  }
}
console.log(
  JSON.stringify({
    place: world.placeName,
    placeId: townId,
    seed: world.seed,
    start: world.start,
    state: fips,
    jolts: `${turnover.window.split(";")[0]}; BLS JOLTS jt.data.1.AllItems`,
    townJobsAtOpening: openingEmployment,
    townJobsAtMonthEnds: employedAt.slice(1),
    unemploymentPctAtMonthEnds: unemploymentPct.map((n) =>
      Number(n.toFixed(2)),
    ),
    unemploymentMean: Number(unemploymentMean.toFixed(2)),
    unemploymentStateRange: lausRange,
    ...result,
    changesOnRecordInTown: inTown.length,
    changesOnRecordInWorld: changes.length,
    changesWithoutReasonOrDecider: withoutReason,
    changesDecidedByNoRecord: unknownDecider,
    sampleChangeIds: inTown.slice(0, 5).map((row) => row.id),
  }),
);
if (failures.length) {
  console.error(failures.join("\n"));
  process.exit(1);
}
