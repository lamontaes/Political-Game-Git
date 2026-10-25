/**
 * How a played year's hires, quits, layoffs and separations land against the
 * BLS JOLTS 2025 annual averages and the CPS absence rate, in a place drawn
 * from all 56 on a seed nobody chose (pool item research-residents-cadence-
 * sourced). The bands check totals; they never decide one worker's outcome.
 */
import { randomBytes } from "node:crypto";
import { expect, it } from "vitest";
import { drawPlace } from "../../scripts/core2-year/place";
import { buildBenchWorld } from "../bench/world";
import { setBookkeeping } from "./bookkeeping";
import { gameStartDate } from "./game-start";
import { addDays, makeIsoDate } from "./kernel/dates";
import { advanceCore } from "./life";
import { JOBS_MODULE_ID } from "./modules/jobs";
import { residentsRuntime } from "./modules/residents";
import { countedHeadsOf } from "./residents-economy";
import { coreAPI, fillInPerson } from "./state";
import { absenceRate, joltsRate, turnoverReport } from "./turnover-check";

const seed = process.env.TURNOVER_SEED ?? randomBytes(8).toString("hex");

it("the data carries every JOLTS industry row for each of the four rates, and the CPS absence rows", () => {
  for (const kind of [
    "hires",
    "totalSeparations",
    "quits",
    "layoffsAndDischarges",
  ] as const) {
    expect(joltsRate(kind), kind).toBeGreaterThan(0);
    expect(
      joltsRate(kind, "Accommodation and food services"),
      kind,
    ).toBeGreaterThan(0);
    expect(joltsRate(kind, "Government"), kind).toBeGreaterThan(0);
  }
  // Quits and layoffs are parts of separations, in every row.
  for (const industry of ["Total", "Retail trade", "Government"])
    expect(
      joltsRate("quits", industry)! +
        joltsRate("layoffsAndDischarges", industry)!,
      industry,
    ).toBeLessThanOrEqual(joltsRate("totalSeparations", industry)! + 0.15);
  expect(absenceRate("Public sector")).toBeGreaterThan(
    absenceRate("Private sector")!,
  );
});

it("reports a played year's monthly turnover rates against JOLTS, by record id", () => {
  setBookkeeping(false);
  const place = drawPlace(seed, "residents-turnover");
  const where = `seed ${seed}, ${place.name} (${place.key}), world seed ${place.seed}`;
  const { core } = buildBenchWorld(place.seed, gameStartDate(), {
    twoLevel: true,
    placeKey: place.key,
  });
  const from = core.date;
  const to = addDays(makeIsoDate(from), 365);
  // The CPS absence measure is the share of workers absent in a survey week:
  // a week at a time, each full person's completed work weeks (planned days,
  // and any missed) are read from the work engine's weekly rollups before
  // they age out. The counted tier has no absence mechanic yet
  // (SG-CORE-residents-cadence), so its share is zero by construction and is
  // reported apart.
  const seen = new Set<string>();
  let plannedWeeks = 0;
  let absentWeeks = 0;
  const absentSample: string[] = [];
  const readWeeks = () => {
    for (const [key, week] of core.work.rollups) {
      if (seen.has(key) || week.weekStartedAt < from) continue;
      if (addDays(makeIsoDate(week.weekStartedAt), 7) > core.date) continue;
      seen.add(key);
      if (week.plannedDays <= 0 || !core.people.has(week.personId)) continue;
      plannedWeeks += 1;
      if (week.missedDays > 0) {
        absentWeeks += 1;
        if (absentSample.length < 3)
          absentSample.push(
            `${week.personId} on ${week.jobId} week of ${week.weekStartedAt}`,
          );
      }
    }
  };
  while (core.date < to) {
    const next = addDays(makeIsoDate(core.date), 7);
    advanceCore(core, next < to ? next : to);
    readWeeks();
  }
  const absenceShare =
    plannedWeeks > 0 ? (100 * absentWeeks) / plannedWeeks : 0;
  const report = turnoverReport(core, from, to);
  const lines = Object.entries(report.rates).map(
    ([kind, r]) =>
      `${kind}: ${r.town.toFixed(2)} a month against JOLTS ${r.jolts}`,
  );
  process.stdout.write(
    `turnover: ${where}; ${report.employed} employed; changes ${JSON.stringify(report.counts)}; ${lines.join("; ")}; ids ${JSON.stringify(report.ids)}\n`,
  );
  process.stdout.write(
    `absence: ${where}; full people absent in ${absentWeeks} of ${plannedWeeks} work weeks (${absenceShare.toFixed(2)} percent) against CPS ${absenceRate("Private sector")} private and ${absenceRate("Public sector")} public, e.g. ${absentSample.join("; ")}; counted workers 0 by construction (SG-CORE-residents-cadence)\n`,
  );
  expect(report.employed, where).toBeGreaterThan(0);
  expect(Object.keys(report.counts).length, where).toBeGreaterThan(0);
  // The absence share is measured from the full people's own weeks.
  expect(
    plannedWeeks,
    `${where}: full people's work weeks read`,
  ).toBeGreaterThan(0);
  for (const r of Object.values(report.rates))
    expect(Number.isFinite(r.town), where).toBe(true);
}, 600_000);

it("counts a counted worker's job as the household weight it stands for, as the jobs engine does", () => {
  setBookkeeping(false);
  // Places are drawn (opened at three times their sample size) until one has
  // counted households that stand for more than one person each.
  const tried: string[] = [];
  for (let n = 0; n < 6; n++) {
    const place = drawPlace(`${seed}:weighted:${n}`, "residents-turnover");
    const where = `seed ${seed}:weighted:${n}, ${place.name} (${place.key}), world seed ${place.seed}`;
    const { core } = buildBenchWorld(place.seed, gameStartDate(), {
      twoLevel: true,
      placeKey: place.key,
      countScale: 3,
    });
    let records = 0;
    let people = 0;
    for (const job of core.jobs.values())
      if (!job.endsAt) {
        records += 1;
        people += 1;
      }
    for (const job of residentsRuntime(core)?.jobs.values() ?? [])
      if (!job.endsAt) {
        records += 1;
        people += countedHeadsOf(core, job.personId);
      }
    const report = turnoverReport(core, core.date, core.date);
    expect(report.employed, where).toBe(people);
    if (people > records) return;
    tried.push(`${where}: ${people} people, ${records} records`);
  }
  throw new Error(
    `no drawn place had weighted counted jobs: ${tried.join("; ")}`,
  );
}, 600_000);

it("keeps a past change's weight when its counted worker is filled in as a full person", () => {
  setBookkeeping(false);
  const tried: string[] = [];
  for (let n = 0; n < 6; n++) {
    const place = drawPlace(`${seed}:fill:${n}`, "residents-turnover");
    const where = `seed ${seed}:fill:${n}, ${place.name} (${place.key}), world seed ${place.seed}`;
    const { core } = buildBenchWorld(place.seed, gameStartDate(), {
      twoLevel: true,
      placeKey: place.key,
      countScale: 3,
    });
    const from = core.date;
    advanceCore(core, addDays(makeIsoDate(from), 60));
    const to = core.date;
    const rows = coreAPI(core)
      .moduleState(JOBS_MODULE_ID)
      .table("changes")
      .rows() as unknown as {
      id: string;
      jobId: string;
      personId: string;
      heads?: number;
    }[];
    // A change made for a counted worker who stood for several people.
    const row = rows.find(
      (r) => !core.jobs.has(r.jobId) && countedHeadsOf(core, r.personId) > 1,
    );
    if (!row) {
      tried.push(`${where}: no weighted change in 60 days`);
      continue;
    }
    const before = turnoverReport(core, from, to);
    const weight = row.heads;
    expect(weight, `${where}: ${row.id} stores its weight`).toBeGreaterThan(1);
    fillInPerson(core, row.personId);
    expect(countedHeadsOf(core, row.personId), where).toBe(1);
    const after = turnoverReport(core, from, to);
    expect(after.counts, `${where}: ${row.id} counts across fill-in`).toEqual(
      before.counts,
    );
    expect(
      (
        coreAPI(core)
          .moduleState(JOBS_MODULE_ID)
          .table("changes")
          .get(row.id) as unknown as { heads?: number }
      ).heads,
      where,
    ).toBe(weight);
    process.stdout.write(
      `fill-in keeps weight: ${where}; ${row.id} stood for ${weight} before and after; counts ${JSON.stringify(after.counts)}\n`,
    );
    return;
  }
  throw new Error(`no place had a weighted change: ${tried.join("; ")}`);
}, 600_000);
