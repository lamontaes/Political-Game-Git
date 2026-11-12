/**
 * A payday that results mode skips still settles what is due on it
 * (core-played-days-after-results-mode-lose-a-payroll-retry): play 45 days,
 * skip to the first of the month two months on, and every payroll bucket
 * dated before the day play resumes is empty; then 45 more played days run
 * with no throw from the payroll guard. Fairmount, North Dakota is the place
 * the defect was seen in (a labeled case); the other is drawn from all 56.
 */
import { randomBytes } from "node:crypto";
import { describe, expect, it } from "vitest";
import { drawPlace } from "../../scripts/core2-year/place";
import { buildBenchWorld } from "../bench/world";
import { setBookkeeping } from "./bookkeeping";
import { gameStartDate } from "./game-start";
import { addDays, makeIsoDate } from "./kernel/dates";
import { advanceCore } from "./life";

const seed = process.env.RESULTS_PAYROLL_SEED ?? randomBytes(6).toString("hex");
const cases = [
  {
    label: "seen in",
    place: drawPlace("fx8886a1", "results-mode-savings-draw-per-payday"),
  },
  { label: "drawn", place: drawPlace(seed, "results-mode-payroll") },
];

describe(`results mode settles skipped paydays (seed ${seed})`, () => {
  for (const { label, place } of cases)
    it(`${label}: ${place.name} (place ${place.key}, world seed ${place.seed})`, () => {
      setBookkeeping(false);
      const world = buildBenchWorld(place.seed, gameStartDate(), {
        twoLevel: true,
        placeKey: place.key,
      });
      const core = world.core;
      advanceCore(core, addDays(gameStartDate(), 45));
      const resume = new Date(`${core.date}T00:00:00Z`);
      resume.setUTCMonth(resume.getUTCMonth() + 2);
      resume.setUTCDate(1);
      advanceCore(core, makeIsoDate(resume.toISOString().slice(0, 10)), {
        results: true,
      });
      const where = `${place.name}, resumed on ${core.date}`;
      for (const bucket of [
        "payrollArrearsByDue",
        "payrollPeriodsByDue",
      ] as const)
        for (const [date, members] of core.work[bucket])
          if (date < core.date)
            expect(members.size, `${where}: ${bucket} ${date}`).toBe(0);
      expect(
        () => advanceCore(core, addDays(core.date, 45)),
        where,
      ).not.toThrow();
    }, 900_000);
});
