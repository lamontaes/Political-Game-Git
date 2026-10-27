/**
 * Pay growth in play: a place drawn from all 56, built as the game builds it
 * (`buildBenchWorld`, two-level, every module), plays its first year. On each
 * job's yearly review a business adds to the market's move the return to the
 * worker's tenure and how it reads their work (`jobs.value-worker`), in the
 * share its memory of losses leaves it. The test names raise records, checks
 * that each follows its parts, that the payroll pays a full worker the raised
 * rate from then on, that a counted worker's job carries it, and that two
 * workers of opposite temperament at the same tenure got different raises.
 * The year runs with the debug bookkeeping off, as play runs it.
 */
import { describe, expect, it } from "vitest";
import { buildBenchWorld } from "../bench/world";
import { setBookkeeping } from "./bookkeeping";
import { gameStartDate } from "./game-start";
import { addDays, makeIsoDate } from "./kernel/dates";
import { advanceCore } from "./life";
import { JOBS_MODULE_ID, type RaiseRow } from "./modules/jobs";
import { residentsRuntime } from "./modules/residents";
import { testPlace } from "./money-traits-kit";
import { coreAPI } from "./state";
import type { CoreState } from "./types";

const DAYS = 365;
/** Days a raised worker is followed on the payroll after their raise. */
const FOLLOW_DAYS = 14;
/** Years apart that two workers' tenures count as the same. */
const SAME_TENURE_YEARS = 0.25;

function nextMonthStart(date: string): string {
  const [year, month] = date.split("-").map(Number) as [number, number];
  return month === 12
    ? `${year + 1}-01-01`
    : `${year}-${String(month + 1).padStart(2, "0")}-01`;
}

describe("pay grows with tenure and how a person works, in play", () => {
  it("raises pay on the yearly review by record, and the payroll pays it", () => {
    const priorBookkeeping = setBookkeeping(false);
    try {
      playYear();
    } finally {
      setBookkeeping(priorBookkeeping);
    }
  }, 1_800_000);
});

/** One year in a drawn place, read for its raises. */
function playYear(): void {
  const place = testPlace("pay-growth");
  const label = `${place.name} (${place.key}), seed ${place.seed}`;
  const start = gameStartDate();
  const end = addDays(start, DAYS);
  const core = buildBenchWorld(place.seed, start, {
    twoLevel: true,
    placeKey: place.key,
  }).core as CoreState;
  const api = coreAPI(core);
  const table = () =>
    api
      .moduleState(JOBS_MODULE_ID)
      .table("raises")
      .rows() as unknown as RaiseRow[];
  // Month by month to the first raises, then the raised full workers' pay
  // totals are kept and followed on the payroll.
  let first: RaiseRow[] = [];
  while (!first.length && core.date < end) {
    const next = nextMonthStart(core.date);
    advanceCore(core, makeIsoDate(next < end ? next : end));
    first = table().filter((row) => row.date === core.date);
  }
  expect(first.length, `${label}: no raise by ${core.date}`).toBeGreaterThan(0);
  const raisedOn = core.date;
  const before = new Map(
    first
      .filter((row) => !row.counted && core.jobs.has(row.jobId))
      .map((row) => [row.jobId, { ...core.work.totalsByJob.get(row.jobId)! }]),
  );
  advanceCore(core, addDays(makeIsoDate(raisedOn), FOLLOW_DAYS));
  if (core.date < end) advanceCore(core, end);
  const raises = table();
  console.log(
    `${label}: ${raises.length} raises, ${raises.filter((r) => r.counted).length} of counted workers, ` +
      `${raises.filter((r) => r.values.given < 1).length} held below the full raise by the employer's losses, ` +
      `given ${Math.min(...raises.map((r) => r.values.given)).toFixed(3)} at the least; first on ${raisedOn}`,
  );

  // Every raise follows its parts: the market's move times the within-job
  // part the employer's losses left it.
  for (const row of raises) {
    const v = row.values;
    expect(v.tenurePart, row.id).toBeGreaterThan(0);
    expect(v.given, row.id).toBeGreaterThan(0);
    expect(v.given, row.id).toBeLessThanOrEqual(1);
    const added = v.tenurePart + v.workPart;
    expect(v.toHourlyMinor, row.id).toBe(
      Math.round(v.marketHourlyMinor * Math.exp(added * v.given)),
    );
  }

  // A full worker's raise reached their job that day, and every minute they
  // worked since is paid at the raised rate.
  const paid = first.filter((row) => {
    const was = before.get(row.jobId),
      now = core.work.totalsByJob.get(row.jobId);
    return (
      was &&
      now &&
      core.jobs.get(row.jobId)?.hourlyMinor === row.values.toHourlyMinor &&
      now.attendedMinutes > was.attendedMinutes
    );
  });
  expect(
    paid.length,
    `${label}: no raised full worker worked after`,
  ).toBeGreaterThan(0);
  for (const row of paid) {
    expect(
      (core.work.payChanges.get(row.jobId) ?? []).some(
        (change) =>
          change.date === row.date &&
          change.hourlyMinor === row.values.toHourlyMinor,
      ),
      row.id,
    ).toBe(true);
    const was = before.get(row.jobId)!,
      now = core.work.totalsByJob.get(row.jobId)!;
    const minutes = now.attendedMinutes - was.attendedMinutes;
    const earned = now.requestedMinor - was.requestedMinor;
    expect(
      Math.abs(earned - (row.values.toHourlyMinor * minutes) / 60),
      row.id,
    ).toBeLessThan(1);
  }
  const shown = paid[0]!;
  const shownTotals = core.work.totalsByJob.get(shown.jobId)!;
  console.log(
    `${label}: ${shown.id} raised ${shown.personId} from ${shown.values.fromHourlyMinor} to ` +
      `${shown.values.toHourlyMinor} cents an hour; the payroll paid ` +
      `${shownTotals.requestedMinor - before.get(shown.jobId)!.requestedMinor} cents for ` +
      `${shownTotals.attendedMinutes - before.get(shown.jobId)!.attendedMinutes} minutes worked since`,
  );

  // A counted worker's job carries their raise.
  const rt = residentsRuntime(core)!;
  const countedRaised = raises.filter(
    (row) =>
      row.counted &&
      rt.jobs.get(row.jobId)?.hourlyMinor === row.values.toHourlyMinor,
  );
  expect(
    countedRaised.length,
    `${label}: no counted raise held`,
  ).toBeGreaterThan(0);
  console.log(
    `${label}: counted ${countedRaised[0]!.id} (standing for ${countedRaised[0]!.heads} jobs) ` +
      `${countedRaised[0]!.values.fromHourlyMinor} to ${countedRaised[0]!.values.toHourlyMinor}`,
  );

  // Two workers of opposite temperament at about the same tenure, both raised
  // in full: the one read as more diligent got the larger within-job raise.
  // Tenure held when the game began is estimated person by person, so no two
  // workers share it to the day; a quarter year apart is the same tenure here.
  const full = raises.filter((row) => row.values.given === 1);
  let pair: [RaiseRow, RaiseRow] | undefined;
  for (const a of full)
    for (const b of full) {
      if (
        a.values.workScore <= 0 ||
        b.values.workScore >= 0 ||
        Math.abs(a.values.tenureYears - b.values.tenureYears) >
          SAME_TENURE_YEARS ||
        Math.abs(a.values.sinceYears - b.values.sinceYears) > SAME_TENURE_YEARS
      )
        continue;
      const gap = a.values.workScore - b.values.workScore;
      if (!pair || gap > pair[0].values.workScore - pair[1].values.workScore)
        pair = [a, b];
    }
  expect(pair, `${label}: no opposite pair at one tenure`).toBeDefined();
  const [diligent, slack] = pair!;
  const within = (row: RaiseRow) =>
    Math.log(row.values.toHourlyMinor / row.values.marketHourlyMinor);
  for (const row of pair!)
    console.log(
      `${label}: ${row.id}: ${row.personId}, tenure ${row.values.tenureYears.toFixed(3)} years, ` +
        `how they work ${row.values.workScore.toFixed(3)}, ${row.values.fromHourlyMinor} to ` +
        `${row.values.toHourlyMinor} (market ${row.values.marketHourlyMinor.toFixed(1)}; tenure ` +
        `${row.values.tenurePart.toFixed(4)}, work ${row.values.workPart.toFixed(4)})`,
    );
  expect(diligent.values.workPart).toBeGreaterThan(slack.values.workPart);
  expect(diligent.values.tenurePart + diligent.values.workPart).toBeGreaterThan(
    slack.values.tenurePart + slack.values.workPart,
  );
  expect(within(diligent)).toBeGreaterThan(within(slack));
}
