/**
 * Budgeted revenue is re-budgeted every fiscal year (pool item
 * budgets-revenue-rebudgeted-yearly). The nation, the state and the county
 * write each year's revenue from what their treasuries collected over the
 * fiscal year before (borrowing left out) over the Census base, in the
 * published mix of lines, so a budget no longer repeats the same revenue year
 * after year. A state's or county's spending follows the same ratio as
 * before; the nation's spending is voted and holds the base.
 * Pinned place and seed: Washington, Kansas (599e6f66e9c1d25a). The time is
 * the game's own played days: 1,108 days (January 20, 2025 to February 1,
 * 2028; measured 351 seconds, about a third of a second a day with the
 * bookkeeping off); the limit is about twice that.
 */
import { describe, expect, it } from "vitest";
import { buildBenchWorld } from "../bench/world";
import { setBookkeeping } from "./bookkeeping";
import { treasuryMonthsOf, treasuryMonthsPerYear } from "./budgets-treasury";
import { gameStartDate } from "./game-start";
import { advanceCore } from "./life";
import { baseBudget, budgetsOf, governments } from "./modules/budgets";
import { coreAPI } from "./state";

const SEED = "599e6f66e9c1d25a";
const total = (side: Readonly<Record<string, number>>) =>
  Object.values(side).reduce((a, v) => a + v, 0);

describe("revenue is re-budgeted from last year's collections", () => {
  it("moves each level's budgeted revenue year to year (Washington, Kansas)", () => {
    setBookkeeping(false);
    const world = buildBenchWorld(SEED, gameStartDate(), { twoLevel: true });
    expect(world.place.displayName).toBe("Washington, Kansas");
    const api = coreAPI(world.core);
    advanceCore(world.core, "2028-02-01" as never);
    const where = `${world.place.displayName} (seed ${SEED})`;

    for (const level of ["federal", "state", "county"] as const) {
      const gov = governments(api).find((g) => g.level === level)!;
      const rows = budgetsOf(api, gov.id)
        .slice()
        .sort((a, b) => a.fiscalYear - b.fiscalYear);
      const revenues = new Set<number>();
      let rebudgeted = 0;
      for (const row of rows) {
        revenues.add(total(row.revenueMinor));
        // The year before had a whole year of the treasury's months.
        const from = `${row.fiscalYear - 1}-${gov.fiscalYearStart}`;
        const to = `${row.fiscalYear}-${gov.fiscalYearStart}`;
        const months = treasuryMonthsOf(api, gov.id).filter(
          (m) => m.date >= from && m.date < to,
        );
        if (months.length !== treasuryMonthsPerYear()) continue;
        const base = baseBudget(api, gov, row.fiscalYear - 1).revenueMinor;
        const ratio =
          months.reduce((a, m) => a + m.collectedMinor - m.borrowedMinor, 0) /
          total(base);
        const lines = baseBudget(api, gov, row.fiscalYear).revenueMinor;
        expect(
          total(row.revenueMinor),
          `${where}: ${level} ${row.fiscalYear}`,
        ).toBe(
          Object.values(lines).reduce((a, v) => a + Math.round(v * ratio), 0),
        );
        // A state's or county's spending follows the same ratio; the nation's holds.
        expect(row.receiptsFactor, `${where}: ${level} spending factor`).toBe(
          level === "federal" ? 1 : ratio,
        );
        rebudgeted += 1;
      }
      expect(
        rebudgeted,
        `${where}: ${level} re-budgeted years`,
      ).toBeGreaterThan(0);
      expect(
        revenues.size,
        `${where}: ${level} revenue by year`,
      ).toBeGreaterThan(2);
    }
  }, 700_000);
});
