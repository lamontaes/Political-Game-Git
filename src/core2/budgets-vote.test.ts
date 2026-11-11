/**
 * A state's or county's next budget spends in proportion to what it collected
 * last fiscal year over what that year's plan expected. Played world in a
 * place drawn from all 56; the place and seed are named in every failure
 * message. Set GOLDEN_PATH_SEED to reproduce a run.
 */
import { randomBytes } from "node:crypto";
import { expect, it } from "vitest";
import { buildBenchWorld } from "../bench/world";
import { drawPlace } from "../../scripts/core2-year/place";
import { setBookkeeping } from "./bookkeeping";
import { treasuryMonthsOf } from "./budgets-treasury";
import { gameStartDate } from "./game-start";
import { addDays, makeIsoDate } from "./kernel/dates";
import { advanceCore } from "./life";
import {
  baseBudget,
  budgetsOf,
  enactedBudgetChanges,
  governments,
} from "./modules/budgets";
import { coreAPI } from "./state";

const seed = process.env.GOLDEN_PATH_SEED ?? randomBytes(16).toString("hex");

it("votes a state's or county's spending from the receipts it collected the year before", () => {
  setBookkeeping(false);
  try {
    const draw = drawPlace(seed, "budgets-vote");
    const { core } = buildBenchWorld(draw.seed, gameStartDate(), {
      twoLevel: true,
      placeKey: draw.key,
    });
    const api = coreAPI(core);
    const where = `${draw.key} [${draw.state}], seed ${draw.seed}`;
    advanceCore(core, addDays(makeIsoDate(core.date), 365 * 3));
    let checked = 0;
    let compared = 0;
    for (const gov of governments(api)) {
      if (gov.level !== "state" && gov.level !== "county") continue;
      const adopted = budgetsOf(api, gov.id).filter(
        (b) => b.fiscalYear >= 2027,
      );
      for (const budget of adopted) {
        const prior = budgetsOf(api, gov.id).find(
          (b) => b.fiscalYear === budget.fiscalYear - 1,
        );
        if (!prior) continue;
        const from = `${budget.fiscalYear - 1}-${gov.fiscalYearStart}`;
        const to = `${budget.fiscalYear}-${gov.fiscalYearStart}`;
        const months = treasuryMonthsOf(api, gov.id).filter(
          (m) => m.date >= from && m.date < to,
        );
        if (months.length !== 12) continue;
        const collected = months.reduce((n, m) => n + m.collectedMinor, 0);
        const expected = Object.values(prior.revenueMinor).reduce(
          (n, v) => n + v,
          0,
        );
        const factor = collected / expected;
        const base = baseBudget(api, gov, budget.fiscalYear);
        // Lines no bill has changed are the base times the factor, rounded.
        const changed = new Set(Object.keys(enactedBudgetChanges(api, gov.id)));
        let untouched = 0;
        for (const [line, value] of Object.entries(base.spendingMinor)) {
          if (changed.has(line)) continue;
          expect(
            Math.abs(budget.spendingMinor[line]! - value * factor),
            `${where} ${budget.id} ${line}: factor ${factor.toFixed(4)}`,
          ).toBeLessThanOrEqual(1);
          untouched += 1;
        }
        compared += untouched;
        checked += 1;
      }
    }
    expect(checked, `${where}: a voted budget`).toBeGreaterThan(0);
    expect(compared, `${where}: lines compared`).toBeGreaterThan(0);
  } finally {
    setBookkeeping(true);
  }
}, 900_000);
