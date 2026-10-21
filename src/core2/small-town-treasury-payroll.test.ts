/**
 * A town's treasury pays its own employees (world-small-town-treasury-shortfall):
 * its appointed heads are paid what their budget line carries, and the monthly
 * close keeps the coming month's wages back, so no one the treasury employs is
 * left unpaid. Played world: a place nobody chose, and Brookford, North
 * Carolina, the small town found short.
 */
import { randomBytes } from "node:crypto";
import { describe, expect, it } from "vitest";
import { buildBenchWorld } from "../bench/world";
import { drawPlace } from "../../scripts/core2-year/place";
import { setBookkeeping } from "./bookkeeping";
import { gameStartDate } from "./game-start";
import { addDays, makeIsoDate } from "./kernel/dates";
import { advanceCore } from "./life";
import { coreAPI } from "./state";
import { budgetInForce } from "./budgets-treasury";
import { governments } from "./modules/budgets";

const seed = process.env.GOLDEN_PATH_SEED ?? randomBytes(8).toString("hex");
const drawn = drawPlace(seed, "small-town-treasury-payroll");
const places = [
  {
    name: `${drawn.name} (${drawn.key}), seed ${seed}`,
    key: drawn.key,
    seed: drawn.seed,
  },
  {
    name: "Brookford, North Carolina (3708140), seed brookford-1",
    key: "3708140",
    seed: "brookford-1",
  },
];

describe("a treasury pays the people it employs", () => {
  for (const place of places)
    it(
      place.name,
      () => {
        setBookkeeping(false);
        const { core } = buildBenchWorld(place.seed, gameStartDate(), {
          twoLevel: true,
          placeKey: place.key,
        });
        const api = coreAPI(core);
        advanceCore(core, addDays(makeIsoDate(core.date), 400));
        let measured = 0;
        for (const gov of governments(api)) {
          if (gov.level === "federal") continue;
          const budget = budgetInForce(api, gov.id);
          const jobs = [...core.jobs.values()].filter(
            (j) => j.organizationId === gov.organizationId,
          );
          if (!budget || !jobs.length) continue;
          // The payroll the treasury has taken on fits the budget it has.
          const payroll = jobs
            .filter((j) => j.endsAt === undefined)
            .reduce((sum, j) => sum + j.wageDailyMinor * 365, 0);
          const spending = Object.values(budget.spendingMinor).reduce(
            (a, b) => a + b,
            0,
          );
          expect(
            payroll,
            `${place.name}: ${gov.id} payroll`,
          ).toBeLessThanOrEqual(spending);
          // And what its employees earned, it paid.
          for (const job of jobs) {
            const totals = core.work.totalsByJob.get(job.id);
            if (!totals || totals.earnedMinor < 100_000) continue;
            expect(
              totals.arrearsMinor,
              `${place.name}: ${job.id} (${job.title}) arrears`,
            ).toBeLessThanOrEqual(totals.earnedMinor * 0.05);
            measured += 1;
          }
        }
        expect(measured, place.name).toBeGreaterThan(0);
      },
      1_800_000,
    );
});
