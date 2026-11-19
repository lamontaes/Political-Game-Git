/**
 * A state or local treasury's reserve comes from its own past, not from a published months-of-spending median
 * (pin `budgets-treasury.ts` reserve sweep, family 17). The cushion is the deepest run of months it paid out more than
 * it collected, in months of its own spending; with less than a year recorded the treasury keeps what it holds.
 * Fails on the code that swept everything above 1.2 months of spending from the first close.
 * Places: three drawn per run (GOLDEN_PATH_SEED replays a run), each named in every message.
 */
import { randomBytes } from "node:crypto";
import { describe, expect, it } from "vitest";
import { drawPlace } from "../../scripts/core2-year/place";
import { buildBenchWorld } from "../bench/world";
import { setBookkeeping } from "./bookkeeping";
import {
  reserveCushionMonths,
  treasuryMonthsOf,
  treasuryMonthsPerYear,
} from "./budgets-treasury";
import { gameStartDate } from "./game-start";
import { advanceCore } from "./life";
import { BUDGETS_MODULE_ID, governments } from "./modules/budgets";
import { coreAPI } from "./state";

const run = process.env.GOLDEN_PATH_SEED ?? randomBytes(8).toString("hex");

describe("a treasury's reserve follows its own shortfalls", () => {
  for (const draw of [0, 1, 2]) {
    it(`draw ${draw}`, () => {
      setBookkeeping(false);
      const place = drawPlace(draw === 0 ? run : `${run}:${draw}`, "reserve");
      const where = `${place.name} (${place.key}), seed ${place.seed}, run ${run}`;
      const world = buildBenchWorld(place.seed, gameStartDate(), {
        twoLevel: true,
        placeKey: place.key,
      });
      const api = coreAPI(world.core);
      advanceCore(world.core, "2026-05-01" as never);
      const sweeps = api
        .moduleState(BUDGETS_MODULE_ID)
        .table("reserveSweeps")
        .rows() as unknown as { governmentId: string; date: string }[];
      let sized = 0;
      const cushions = new Set<number>();
      for (const gov of governments(api)) {
        if (gov.level === "federal") continue;
        const months = [...treasuryMonthsOf(api, gov.id)].sort((a, b) =>
          a.date.localeCompare(b.date),
        );
        const cushion = reserveCushionMonths(api, gov.id);
        // No sweep before the government has a whole year of its own months to size a cushion by.
        const firstSized = months[treasuryMonthsPerYear() - 1]?.date;
        for (const sweep of sweeps.filter((s) => s.governmentId === gov.id))
          expect(
            firstSized !== undefined && sweep.date >= firstSized,
            `${where}: ${gov.id} swept on ${sweep.date} before a year of its own months`,
          ).toBe(true);
        if (months.length < treasuryMonthsPerYear()) {
          expect(cushion, `${where}: ${gov.id} cushion with no year`).toBe(
            undefined,
          );
          continue;
        }
        // The cushion is the deepest run of months it paid out more than it collected, in months of spending.
        let running = 0;
        let peak = 0;
        let deepest = 0;
        let spentTotal = 0;
        for (const m of months) {
          const spent = Object.values(m.lines).reduce(
            (n, l) =>
              n +
              l.inTownMinor +
              l.aidMinor +
              l.providersMinor +
              l.outsideMinor,
            0,
          );
          spentTotal += spent;
          running += m.collectedMinor - m.borrowedMinor - spent;
          peak = Math.max(peak, running);
          deepest = Math.max(deepest, peak - running);
        }
        const mean = spentTotal / months.length;
        expect(cushion, `${where}: ${gov.id} cushion`).toBeCloseTo(
          mean > 0 ? deepest / mean : 0,
          6,
        );
        sized += 1;
        cushions.add(Math.round((cushion ?? 0) * 1000));
      }
      expect(
        sized,
        `${where}: governments with a year of months`,
      ).toBeGreaterThan(0);
      expect(
        cushions.size,
        `${where}: cushions differ between governments (${[...cushions].join(", ")})`,
      ).toBeGreaterThan(1);
    }, 900_000);
  }
});
