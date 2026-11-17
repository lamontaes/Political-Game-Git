/**
 * Budgeted revenue is re-budgeted every fiscal year (pool item
 * budgets-revenue-rebudgeted-yearly). The nation, the state and the county
 * write each year's revenue from what their treasuries collected over the
 * fiscal year before (borrowing left out) over the Census base, in the
 * published mix of lines, so a budget no longer repeats the same revenue year
 * after year. A state's or county's spending follows the same ratio as
 * before; the nation's spending is voted and holds the base.
 * Pinned place and seed: Everett, Georgia (7a5e19c2b3d84f60). The rule first
 * shows when a treasury has a whole fiscal year of months behind it: the
 * nation's year runs October to September and the first whole year ends
 * September 2026, so its next budget (and the state's, from July 2026) is the
 * first one re-budgeted. The time is the game's own played days: 650 days
 * (January 20, 2025 to November 1, 2026) in a small town; the limit is
 * about twice the measured time (70 seconds).
 */
import { describe, expect, it } from "vitest";
import { buildBenchWorld } from "../bench/world";
import { setBookkeeping } from "./bookkeeping";
import { treasuryMonthsOf, treasuryMonthsPerYear } from "./budgets-treasury";
import { gameStartDate } from "./game-start";
import { advanceCore } from "./life";
import { baseBudget, budgetsOf, governments } from "./modules/budgets";
import { coreAPI } from "./state";

const SEED = "7a5e19c2b3d84f60";
const total = (side: Readonly<Record<string, number>>) =>
  Object.values(side).reduce((a, v) => a + v, 0);

describe("revenue is re-budgeted from last year's collections", () => {
  it("moves each level's budgeted revenue year to year (Everett, Georgia)", () => {
    setBookkeeping(false);
    const world = buildBenchWorld(SEED, gameStartDate(), { twoLevel: true });
    expect(world.place.displayName).toBe("Everett, Georgia");
    const api = coreAPI(world.core);
    advanceCore(world.core, "2026-11-01" as never);
    const where = `${world.place.displayName} (seed ${SEED})`;

    for (const level of ["federal", "state", "county"] as const) {
      const gov = governments(api).find((g) => g.level === level)!;
      const rows = budgetsOf(api, gov.id)
        .slice()
        .sort((a, b) => a.fiscalYear - b.fiscalYear);
      const revenues = new Set<number>();
      const movedFederal = new Set<number>();
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
        // A state's or county's spending carries forward from its last budget by what it collected over that
        // budget's revenue plan; the nation's lines move with its own people and prices, not with its receipts.
        const before = rows.find((r) => r.fiscalYear === row.fiscalYear - 1);
        if (before?.baseSpendingMinor && row.baseSpendingMinor) {
          const carried = total(row.baseSpendingMinor);
          const last = total(before.baseSpendingMinor);
          if (level === "federal") movedFederal.add(carried / last);
          else
            expect(
              carried / last,
              `${where}: ${level} ${row.fiscalYear} spending carry`,
            ).toBeCloseTo(
              months.reduce(
                (a, m) => a + m.collectedMinor - m.borrowedMinor,
                0,
              ) / total(before.revenueMinor),
              4,
            );
        }
        rebudgeted += 1;
      }
      if (level === "federal")
        expect(
          [...movedFederal].some((r) => r !== 1),
          `${where}: federal spending moves from year to year`,
        ).toBe(true);
      expect(
        rebudgeted,
        `${where}: ${level} re-budgeted years`,
      ).toBeGreaterThan(0);
      expect(
        revenues.size,
        `${where}: ${level} revenue by year`,
      ).toBeGreaterThan(1);
    }
  }, 140_000);
});
