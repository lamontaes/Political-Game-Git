/**
 * One home for a counted worker's new pay (pool item
 * core-residents-seams-single-home): in a random place from all 56, the
 * core's rerateJob on a counted job changes exactly that worker's share of
 * their employer's wage flow, and no other worker's, through the one seam in
 * residents-economy.ts.
 */
import { randomBytes } from "node:crypto";
import { expect, it } from "vitest";
import { buildBenchWorld } from "../bench/world";
import { drawPlace } from "../../scripts/core2-year/place";
import { setBookkeeping } from "./bookkeeping";
import { gameStartDate } from "./game-start";
import { residentsRuntime } from "./modules/residents";
import { coreAPI } from "./state";

const seed = process.env.GOLDEN_PATH_SEED ?? randomBytes(16).toString("hex");

it("re-rates one counted worker and leaves the rest of the flow alone", () => {
  setBookkeeping(false);
  const draw = drawPlace(seed, "rerate-counted-job");
  const where = `${draw.name} [${draw.key}], seed ${draw.seed}`;
  const { core } = buildBenchWorld(draw.seed, gameStartDate(), {
    twoLevel: true,
    placeKey: draw.key,
  });
  const api = coreAPI(core);
  const rt = residentsRuntime(core)!;
  // A counted job in a wage flow with at least two workers.
  const job = [...rt.jobs.values()].find((row) => {
    const flow = rt.wageFlowByJob.get(row.id);
    return (
      row.hourlyMinor &&
      flow &&
      !flow.endedAt &&
      Object.keys(flow.perDayMinorByJob ?? {}).length > 1
    );
  });
  expect(job, where).toBeTruthy();
  const flow = rt.wageFlowByJob.get(job!.id)!;
  const before = { ...flow.perDayMinorByJob };
  const hourly = job!.hourlyMinor! + 100;
  api.rerateJob(job!.id, hourly, {
    tag: "SOURCED",
    asOf: core.date,
    citation: "Test pay change",
  });
  const ratio = hourly / job!.hourlyMinor!;
  const after = flow.perDayMinorByJob!;
  expect(after[job!.id], `${where} ${job!.id}`).toBeCloseTo(
    before[job!.id]! * ratio,
    6,
  );
  for (const [id, value] of Object.entries(before))
    if (id !== job!.id) expect(after[id], `${where} ${id}`).toBe(value);
  expect(rt.jobs.get(job!.id)?.hourlyMinor, where).toBe(hourly);
}, 900_000);
