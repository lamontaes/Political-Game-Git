/**
 * M1-04 golden-path check, on the whole economy. Uses GOLDEN_PATH_SEED and
 * GOLDEN_PATH_PLACE_KEY from the runner. A drawn town on the two-level world
 * with every economy engine runs a year from its start date. Passes when:
 * (1) the town's monthly hires and quits, as a share of its business jobs,
 * sit inside the JOLTS 2001-2019 range (5th to 95th percentile) for its
 * industry mix; (2) its average unemployment sits from its region's as
 * counties sit from their state's (BLS LAUS 2010-2019, 5th to 95th
 * percentile); (3) every job change records its reason and who decided it;
 * (4) a named layoff, if any, names who decided it. Exits nonzero on failure.
 */
import laus from "../../../data/research/jobs/laus-county-deviation-2010-2019.json" with { type: "json" };
import jobsData from "../data/jobs/jobs.json" with { type: "json" };
import { advanceCore, createLifeCore } from "../life";
import { pinned } from "../modules/jobs";
import { regionalMonth } from "../modules/regional";
import { townMetrics } from "../modules/world-metrics";
import {
  WORLD_MODULES,
  withWorldEconomy,
  worldCoreData,
} from "../modules/world";
import { countedJobsOf } from "../residents-economy";
import { coreAPI } from "../state";
import type { CoreState } from "../types";
import { generatedOpening } from "./generated-world";

const seed = process.env.GOLDEN_PATH_SEED ?? process.argv[2],
  placeKey = process.env.GOLDEN_PATH_PLACE_KEY ?? process.argv[3];
if (!seed || !placeKey)
  throw new Error("GOLDEN_PATH_SEED and GOLDEN_PATH_PLACE_KEY are required.");
/** How far a county's unemployment sat from its state's, 2010-2019 (BLS LAUS via USDA ERS): 5th to 95th percentile, in points. */
const UNEMPLOYMENT_SPREAD = laus.allCounties;
const failures: string[] = [];
const started = Date.now();

const input = withWorldEconomy(
  generatedOpening({ seed, key: placeKey }, { twoLevel: true }),
);
const core = createLifeCore(input, {
  data: worldCoreData(),
  modules: [...WORLD_MODULES],
});
const api = coreAPI(core);
advanceCore(core, input.startedAt);
const opened = Date.now();

type Band = { mean: number; p05: number; p95: number };
const industries = jobsData.turnover.industries as unknown as Record<
  string,
  { hires: Band; quits: Band }
>;
const kindSector = jobsData.kindSector as Record<string, string>;
function businessJobs(c: CoreState): Map<string, number> {
  const bySector = new Map<string, number>();
  for (const [id, book] of c.finance.businesses) {
    if (book.closedAt) continue;
    const sector = kindSector[book.kindId] ?? kindSector["*"] ?? "total";
    // Jobs an agreement names stay put until agreements re-resolve (SG-WORLD-jobs-agreement-pinned): they can't turn over, so they don't count.
    const frozen = pinned(c);
    const full = [...(c.finance.jobsByOrganization.get(id) ?? [])].filter(
      (jobId) => c.jobs.get(jobId)?.endsAt === undefined && !frozen.has(jobId),
    ).length;
    const counted = countedJobsOf(c, id).filter(
      (job) => !frozen.has(job.id),
    ).length;
    bySector.set(sector, (bySector.get(sector) ?? 0) + full + counted);
  }
  return bySector;
}
const mix = businessJobs(core);
const staffAtOpening = [...mix.values()].reduce((n, v) => n + v, 0);
const band = (measure: "hires" | "quits") => {
  let low = 0,
    high = 0,
    mean = 0;
  for (const [sector, staff] of mix) {
    const row = (industries[sector] ?? industries.total!)[measure];
    low += (row.p05 * staff) / staffAtOpening;
    high += (row.p95 * staff) / staffAtOpening;
    mean += (row.mean * staff) / staffAtOpening;
  }
  return { low, high, mean };
};

// The town: where its businesses are.
const placeCounts = new Map<string, number>();
for (const id of core.finance.businesses.keys()) {
  const placeId = core.organizations.get(id)?.placeId;
  if (placeId) placeCounts.set(placeId, (placeCounts.get(placeId) ?? 0) + 1);
}
const town = [...placeCounts].sort((a, b) => b[1] - a[1])[0]![0];
const staffByMonth: number[] = [];
const unemployment: { town: number; region: number }[] = [];
const end = new Date(`${input.startedAt}T00:00:00Z`);
end.setUTCFullYear(end.getUTCFullYear() + 1);
const at = new Date(`${input.startedAt}T00:00:00Z`);
for (;;) {
  at.setUTCMonth(at.getUTCMonth() + 1);
  if (at > end) break;
  advanceCore(core, at.toISOString().slice(0, 10));
  staffByMonth.push(
    [...businessJobs(core).values()].reduce((n, v) => n + v, 0),
  );
  const metrics = townMetrics(api).find((row) => row.placeId === town);
  const region = regionalMonth(api, town, core.date.slice(0, "YYYY-MM".length));
  if (metrics && region)
    unemployment.push({
      town: metrics.unemploymentRate * 100,
      region: region.unemploymentPct,
    });
}

const changes = [
  ...api.moduleState("jobs").table("changes").rows(),
] as unknown as {
  id: string;
  date: string;
  kind: string;
  reasonKey?: string;
  decidedBy?: string;
  personId: string;
  organizationId: string;
}[];
const months = staffByMonth.length;
const averageStaff =
  (staffAtOpening + staffByMonth.reduce((n, v) => n + v, 0)) / (months + 1);
const rate = (kind: string) =>
  (changes.filter((row) => row.kind === kind).length /
    Math.max(1, averageStaff) /
    months) *
  100;
const measured = { hires: rate("hire"), quits: rate("quit") };
for (const measure of ["hires", "quits"] as const) {
  const range = band(measure);
  if (measured[measure] < range.low || measured[measure] > range.high)
    failures.push(
      `${measure} ${measured[measure].toFixed(2)}% a month outside [${range.low.toFixed(2)}, ${range.high.toFixed(2)}]`,
    );
}
const townUnemployment =
  unemployment.reduce((n, row) => n + row.town, 0) /
  Math.max(1, unemployment.length);
const regionUnemployment =
  unemployment.reduce((n, row) => n + row.region, 0) /
  Math.max(1, unemployment.length);
if (!unemployment.length) failures.push("no monthly unemployment recorded");
else if (
  townUnemployment - regionUnemployment < UNEMPLOYMENT_SPREAD.p05 ||
  townUnemployment - regionUnemployment > UNEMPLOYMENT_SPREAD.p95
)
  failures.push(
    `unemployment ${townUnemployment.toFixed(1)}% against the region's ${regionUnemployment.toFixed(1)}%`,
  );
const unexplained = changes.filter((row) => !row.reasonKey || !row.decidedBy);
if (unexplained.length)
  failures.push(
    `${unexplained.length} job changes without a reason or decider (${unexplained[0]!.id})`,
  );
const layoff = changes.find((row) => row.kind === "layoff");
const named = layoff
  ? {
      person: layoff.personId,
      employer:
        core.organizations.get(layoff.organizationId)?.name ??
        layoff.organizationId,
      decidedBy: layoff.decidedBy,
      reason: layoff.reasonKey,
      date: layoff.date,
    }
  : null;

const byKind: Record<string, number> = {};
for (const row of changes) byKind[row.kind] = (byKind[row.kind] ?? 0) + 1;
console.log(
  JSON.stringify(
    {
      place: input.placeMetadata?.placeName,
      seed,
      start: input.startedAt,
      businessJobs: {
        frozenByAgreements: pinned(core).size,
        opening: staffAtOpening,
        average: Math.round(averageStaff),
        byMonth: staffByMonth,
      },
      perMonthPct: {
        hires: +measured.hires.toFixed(2),
        hiresRange: band("hires"),
        quits: +measured.quits.toFixed(2),
        quitsRange: band("quits"),
        layoffs: +rate("layoff").toFixed(2),
      },
      unemploymentPct: {
        town: +townUnemployment.toFixed(2),
        region: +regionUnemployment.toFixed(2),
      },
      changes: byKind,
      namedLayoff: named,
      seconds: Math.round((Date.now() - started) / 1000),
      yearSeconds: Math.round((Date.now() - opened) / 1000),
      failures,
    },
    null,
    2,
  ),
);
if (failures.length) process.exit(1);
