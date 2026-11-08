/**
 * M1-04 golden-path check, jobs, in a played world. Uses GOLDEN_PATH_SEED and
 * GOLDEN_PATH_PLACE_KEY from the runner. The drawn place is built as the
 * player gets it (`buildBenchWorld`, every module installed) and plays one
 * game year, read at the end of each month. Real rates are not targets (owner,
 * Nov 8): the check does not compare the town's unemployment or its hires,
 * quits and layoffs with its state's recorded ranges; it asks why they are
 * what they are, by record. Passes when:
 * (1) every person out of work and looking in the town has a reason from the
 *     jobs reasons table, and a named person let go has the layoff on record;
 * (2) every hire, quit and layoff at the town's employers names its reason and
 *     who decided it (a decider that is a record in the world), counted as
 *     the people it stands for;
 * (3) every layoff names the cause that decided it: the turnover pull, the
 *     employer's demand and books (target staff, observed staff, losses), or
 *     a closure.
 * The town's unemployment and the rates of hires, quits and layoffs per
 * hundred jobs are printed with their counts, never tested against a band. A counted
 * worker who leaves keeps no change record (owner, Oct 14, ruling 3,
 * src/core2/modules/jobs.ts noteCountedLeavers), so what is measured is the
 * record. Exits nonzero naming each failed clause.
 */
import jobsData from "../data/jobs/jobs.json" with { type: "json" };
import { residentsRuntime } from "../modules/residents";
import { countedHeadsOf, countedJobHeads } from "../residents-economy";
import {
  changeHeads,
  represented,
  unemployedHeads,
  type SeekerLike,
} from "./m1-measures";
import { buildPlayedWorld, playYear } from "./m1-played-year";

const world = buildPlayedWorld();
const { api, core } = world;
const failures: string[] = [];
const jobs = api.moduleState("jobs");
const townId = world.placeId;
const orgPlace = (id: string) => core.organizations.get(id)?.placeId;

/** The people one record stands for: a full person one, a counted record its household's weight. */
const heads = (personId: string) => countedHeadsOf(core, personId);
/** The town's jobs today: full people's and the counted tier's, at the town's employers, each counted job for the jobs it stands for. */
function employment(): number {
  const inTown = (job: { endsAt?: string; organizationId: string }) =>
    job.endsAt === undefined && orgPlace(job.organizationId) === townId;
  return (
    represented([...core.jobs.values()].filter(inTown), () => 1) +
    represented(
      [...(residentsRuntime(core)?.jobs.values() ?? [])].filter(inTown),
      (job) => countedJobHeads(core, job),
    )
  );
}
/** The town's people out of work and looking: full and counted seekers by one rule, as the people they stand for. */
function unemployed(): number {
  return unemployedHeads(
    jobs.table("seekers").rows() as unknown as SeekerLike[],
    jobs.table("countedSeekers").rows() as unknown as SeekerLike[],
    townId,
    heads,
  );
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
  heads?: number;
  values?: Record<string, number>;
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
// A change stands for the people its record kept when it happened (a counted
// worker's household weight); a change that kept none is a failure, not one.
let withoutHeads = 0;
for (const row of inTown) {
  const at = monthIndex(row.date) - 1;
  const n = changeHeads(row);
  if (n === undefined) {
    withoutHeads += 1;
    continue;
  }
  if (row.kind === "hire") counts.hires[at]! += n;
  else if (row.kind === "quit") counts.quits[at]! += n;
  else if (
    row.kind === "layoff" ||
    row.kind === "staff-shed" ||
    row.kind === "closure"
  )
    counts.layoffs[at]! += n;
}
if (withoutHeads)
  failures.push(
    `${withoutHeads} job changes at the town's employers keep no count of the people they stood for`,
  );
const monthlyRate = (series: number[]) =>
  series.map((n, i) => (100 * n) / Math.max(1, employedAt[i]!));
const mean = (series: number[]) =>
  series.reduce((sum, value) => sum + value, 0) / series.length;

const result: Record<string, unknown> = {};
const unemploymentMean = mean(unemploymentPct);
for (const [name, series] of Object.entries(counts) as [
  "hires" | "quits" | "layoffs",
  number[],
][]) {
  result[name] = {
    changesOnRecord: series.reduce((sum, n) => sum + n, 0),
    meanMonthlyRatePerHundredJobs: Number(mean(monthlyRate(series)).toFixed(3)),
  };
}

// (2) Every job change on record has a reason and a decider.
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
// (1) Every person out of work and looking has a recorded reason.
type SeekerRow = {
  personId: string;
  placeId: string;
  employed?: boolean;
  reasonKey?: string;
};
let seekersWithoutCause = 0,
  letGoWithoutLayoff = 0;
const seekerRows = [
  ...(jobs.table("seekers").rows() as unknown as SeekerRow[]),
  ...(jobs.table("countedSeekers").rows() as unknown as SeekerRow[]),
].filter((row) => !row.employed && row.placeId === townId);
for (const row of seekerRows) {
  if (!row.reasonKey || !reasons.has(row.reasonKey)) {
    seekersWithoutCause += 1;
    if (seekersWithoutCause <= 5)
      failures.push(
        `${row.personId} is out of work with no known reason (${row.reasonKey ?? "none"})`,
      );
  } else if (
    row.reasonKey === jobsData.reasons.layoff &&
    core.people.has(row.personId as never) &&
    !changes.some(
      (change) =>
        change.personId === row.personId &&
        (change.kind === "layoff" ||
          change.kind === "staff-shed" ||
          change.kind === "closure"),
    )
  ) {
    letGoWithoutLayoff += 1;
    if (letGoWithoutLayoff <= 5)
      failures.push(
        `${row.personId} was let go but no layoff is on record for them`,
      );
  }
}
// (3) Every layoff names the cause that decided it.
const causeValues = [
  "turnoverPull",
  "target",
  "projected",
  "observedStaff",
  "salesStaff",
  "lossMonths",
  "demand",
];
let layoffsWithoutCause = 0;
for (const row of inTown) {
  if (row.kind !== "layoff" && row.kind !== "staff-shed") continue;
  if (!causeValues.some((key) => row.values?.[key] !== undefined)) {
    layoffsWithoutCause += 1;
    if (layoffsWithoutCause <= 5)
      failures.push(`${row.id}: a layoff that names no cause`);
  }
}
console.log(
  JSON.stringify({
    place: world.placeName,
    placeId: townId,
    seed: world.seed,
    start: world.start,
    townJobsAtOpening: openingEmployment,
    townJobsAtMonthEnds: employedAt.slice(1),
    unemploymentPctAtMonthEnds: unemploymentPct.map((n) =>
      Number(n.toFixed(2)),
    ),
    unemploymentMean: Number(unemploymentMean.toFixed(2)),
    seekersOutOfWorkInTown: seekerRows.length,
    seekersWithoutCause,
    layoffsWithoutCause,
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
