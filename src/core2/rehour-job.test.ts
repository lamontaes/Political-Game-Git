/**
 * One home for a job's new hours (queue item 2 of Money, Nov 8): in a random
 * place from all 56, `rehourJob` on a named job scales its commitment's
 * shifts and planned calendar, the weeks that follow earn at the new hours and
 * the payday pays them; on a counted job it scales that worker's share of the
 * employer's wage flow and no other worker's.
 */
import { randomBytes } from "node:crypto";
import { expect, it } from "vitest";
import { buildBenchWorld } from "../bench/world";
import { drawPlace } from "../../scripts/core2-year/place";
import { setBookkeeping } from "./bookkeeping";
import { gameStartDate } from "./game-start";
import { addDays, makeIsoDate } from "./kernel/dates";
import { advanceCore } from "./life";
import { residentsRuntime } from "./modules/residents";
import { coreAPI } from "./state";

const seed = process.env.GOLDEN_PATH_SEED ?? randomBytes(16).toString("hex");
const source = (asOf: string) => ({
  tag: "SOURCED" as const,
  asOf,
  citation: "Test hours change",
});

it("a named job's hours change mid-period: shifts scale, later weeks earn at the new hours, the payday pays them", () => {
  setBookkeeping(false);
  const draw = drawPlace(seed, "rehour-named-job");
  const where = `${draw.name} [${draw.key}], seed ${draw.seed}`;
  const { core } = buildBenchWorld(draw.seed, gameStartDate(), {
    twoLevel: true,
    placeKey: draw.key,
  });
  const api = coreAPI(core);
  const job = [...core.jobs.values()].find(
    (row) =>
      row.endsAt === undefined &&
      row.hoursDaily > 0 &&
      core.work.payrollCalendarByJob.has(row.id),
  );
  expect(job, where).toBeTruthy();
  const earned = () => core.work.totalsByJob.get(job!.id)?.requestedMinor ?? 0;
  const paid = () => core.work.totalsByJob.get(job!.id)?.paidMinor ?? 0;
  const commitment = () =>
    [...(core.work.commitmentsByPerson.get(job!.personId) ?? [])]
      .map((id) => core.work.commitments.get(id)!)
      .find((row) => row.jobId === job!.id && row.endsAt === undefined)!;
  const day = (n: number) => addDays(makeIsoDate(core.date), n);
  advanceCore(core, day(14));
  const e0 = earned();
  advanceCore(core, day(28));
  const rate = (earned() - e0) / 28;
  expect(rate, `${where} ${job!.id} earned per day before`).toBeGreaterThan(0);
  const weekly = commitment().expectedWeeklyMinutes;
  const hours = job!.hoursDaily / 2;
  api.rehourJob(job!.id, hours, source(core.date));
  expect(commitment().expectedWeeklyMinutes, where).toBeCloseTo(weekly / 2, 6);
  expect(job!.hoursDaily, where).toBe(hours);
  expect(core.work.hourChanges.get(job!.id)?.length, where).toBe(1);
  const e1 = earned(),
    p1 = paid();
  advanceCore(core, day(28));
  const after = (earned() - e1) / 28;
  expect(after / rate, `${where} ${job!.id} earned per day after`).toBeCloseTo(
    0.5,
    1,
  );
  advanceCore(core, day(35));
  expect(paid(), `${where} paid after the change`).toBeGreaterThan(p1);
}, 900_000);

it("a counted job's hours change scales that worker's share of the wage flow and no other", () => {
  setBookkeeping(false);
  const draw = drawPlace(seed, "rehour-counted-job");
  const where = `${draw.name} [${draw.key}], seed ${draw.seed}`;
  const { core } = buildBenchWorld(draw.seed, gameStartDate(), {
    twoLevel: true,
    placeKey: draw.key,
  });
  const api = coreAPI(core);
  const rt = residentsRuntime(core)!;
  const job = [...rt.jobs.values()].find((row) => {
    const flow = rt.wageFlowByJob.get(row.id);
    return (
      row.hoursDaily > 0 &&
      flow &&
      !flow.endedAt &&
      Object.keys(flow.perDayMinorByJob ?? {}).length > 1
    );
  });
  expect(job, where).toBeTruthy();
  const flow = rt.wageFlowByJob.get(job!.id)!;
  const before = { ...flow.perDayMinorByJob };
  const hours = job!.hoursDaily / 2;
  api.rehourJob(job!.id, hours, source(core.date));
  const after = flow.perDayMinorByJob!;
  expect(after[job!.id], `${where} ${job!.id}`).toBeCloseTo(
    before[job!.id]! / 2,
    6,
  );
  for (const [id, value] of Object.entries(before))
    if (id !== job!.id) expect(after[id], `${where} ${id}`).toBe(value);
  expect(rt.jobs.get(job!.id)?.hoursDaily, where).toBe(hours);
}, 900_000);
