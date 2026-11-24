/**
 * The Budgets screen's trend (Nation, Nov 8): every line and every total of a
 * government's latest budget carries its change against the year before and
 * the amounts of the last years kept, oldest first, so the screen draws a
 * timeline and computes nothing. Played for two years in a place drawn from
 * all 56 on a seed nobody chose.
 */
import { randomBytes } from "node:crypto";
import { expect, it } from "vitest";
import { drawPlace } from "../../scripts/core2-year/place";
import { gameStartDate } from "../core2/game-start";
import { addDays, makeIsoDate } from "../core2/kernel/dates";
import { advanceCore } from "../core2/life";
import { budgetView } from "./budget";
import { buildBenchWorld } from "./world";

const seed = process.env.NATION_SEED ?? randomBytes(8).toString("hex");

it("a government's lines and totals carry their change and yearly history", () => {
  const place = drawPlace(seed, "budget-trend");
  const world = buildBenchWorld(place.seed, gameStartDate(), {
    twoLevel: true,
    placeKey: place.key,
  });
  const core = world.core;
  let day = makeIsoDate(core.date);
  const end = addDays(day, 800);
  while (day < end) {
    day = addDays(day, 1);
    advanceCore(core, day);
  }
  const where = `${place.name}, seed ${seed}`;
  const viewer = [...core.people.keys()][0]!;
  const governments = budgetView(core, viewer).governments;
  expect(governments.length, where).toBeGreaterThan(0);
  let withPrior = 0;
  for (const gov of governments) {
    const latest = gov.latest;
    if (!latest) continue;
    expect(latest.historyYears, `${where}: ${gov.id}`).toBeGreaterThan(0);
    for (const row of [...latest.revenue, ...latest.spending]) {
      const h = row.history;
      expect(h[h.length - 1]!.minor, `${gov.id} ${row.line}`).toBe(row.minor);
      expect(h.length).toBeLessThanOrEqual(10);
      // Oldest first.
      for (let i = 1; i < h.length; i += 1)
        expect(h[i]!.fiscalYear).toBeGreaterThan(h[i - 1]!.fiscalYear);
      if (h.length > 1) {
        withPrior += 1;
        const prior = h[h.length - 2]!.minor;
        expect(row.changeMinor).toBe(row.minor - prior);
        expect(row.changePct).toBe(
          prior === 0
            ? null
            : Math.round(((row.minor - prior) / Math.abs(prior)) * 1000) / 10,
        );
      } else {
        expect(row.changeMinor).toBeNull();
        expect(row.changePct).toBeNull();
      }
    }
    // The totals are the lines added up, year by year.
    const t = latest.totals;
    expect(t.revenue.minor).toBe(latest.revenueMinor);
    expect(t.spending.minor).toBe(latest.spendingMinor);
    expect(t.balance.minor).toBe(latest.balanceMinor);
    expect(t.balance.history.map((y) => y.minor)).toEqual(
      t.revenue.history.map((y, i) => y.minor - t.spending.history[i]!.minor),
    );
  }
  expect(withPrior, `${where}: lines with a prior year`).toBeGreaterThan(0);
}, 1800000);
