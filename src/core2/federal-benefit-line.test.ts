/**
 * Benefits with no line of their own count against the paying government's own budget line (pool item
 * laws-federal-benefits-on-a-line-the-federal-budget-lacks): in a played world of a place drawn from
 * all 56, the federal treasury's months keep the SNAP benefit on a line its budget has, never on a
 * welfare and Medicaid line it lacks.
 */
import { randomBytes } from "node:crypto";
import { expect, it } from "vitest";
import { buildBenchWorld } from "../bench/world";
import { drawPlace } from "../../scripts/core2-year/place";
import { setBookkeeping } from "./bookkeeping";
import { gameStartDate } from "./game-start";
import { addDays, makeIsoDate } from "./kernel/dates";
import { advanceCore } from "./life";
import { coreAPI } from "./state";
import { governments } from "./modules/budgets";
import { budgetInForce, treasuryMonthsOf } from "./budgets-treasury";

const base = process.env.GOLDEN_PATH_SEED ?? randomBytes(8).toString("hex");

for (const salt of ["a", "b"]) {
  const seed = `${base}-${salt}`;
  it(
    `the federal treasury counts benefits on a line its budget has (seed ${seed})`,
    { timeout: 900_000 },
    () => {
      setBookkeeping(false);
      const draw = drawPlace(seed, "federal-benefit-line");
      const where = `${draw.name} [${draw.key}], seed ${draw.seed}`;
      const { core } = buildBenchWorld(draw.seed, gameStartDate(), {
        twoLevel: true,
        placeKey: draw.key,
      });
      const api = coreAPI(core);
      advanceCore(core, addDays(makeIsoDate(core.date), 120));
      const us = governments(api).find((g) => g.level === "federal")!;
      const budgetLines = Object.keys(
        budgetInForce(api, us.id)?.spendingMinor ?? {},
      );
      expect(budgetLines.length, where).toBeGreaterThan(0);
      const months = treasuryMonthsOf(api, us.id);
      expect(months.length, where).toBeGreaterThan(0);
      for (const month of months)
        for (const line of Object.keys(month.lines ?? {}))
          expect(
            budgetLines,
            `${where}: ${month.date} counts ${line}`,
          ).toContain(line);
    },
  );
}
