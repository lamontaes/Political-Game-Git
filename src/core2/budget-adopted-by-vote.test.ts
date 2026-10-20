/**
 * A government's budget is adopted by its body's vote (pool item
 * gov-stopgap-budgets-missing-engine): in a place drawn from all 56 on a seed
 * nobody chose (BUDGET_VOTE_SEED pins one), after a year of the played world
 * every government's next budget names the vote that adopted it, not the
 * carry-forward rule.
 */
import { randomBytes } from "node:crypto";
import { expect, it } from "vitest";
import { drawPlace } from "../../scripts/core2-year/place";
import { buildBenchWorld } from "../bench/world";
import { setBookkeeping } from "./bookkeeping";
import { gameStartDate } from "./game-start";
import { addDays, makeIsoDate } from "./kernel/dates";
import { advanceCore } from "./life";
import { budgetsOf, governments } from "./modules/budgets";
import { coreAPI } from "./state";

const seed = process.env.BUDGET_VOTE_SEED ?? randomBytes(8).toString("hex");

it("every government's budget in a played year is adopted by a vote", () => {
  setBookkeeping(false);
  try {
    const place = drawPlace(seed, "budget-vote");
    const where = `${place.name} (${place.key}), seed ${place.seed}`;
    const { core } = buildBenchWorld(place.seed, gameStartDate(), {
      twoLevel: true,
      placeKey: place.key,
    });
    const api = coreAPI(core);
    advanceCore(core, addDays(makeIsoDate(core.date), 400));
    for (const gov of governments(api)) {
      const adopted = budgetsOf(api, gov.id).filter((b) =>
        / vote /.test(b.adoptedBy),
      );
      expect(
        adopted.length,
        `${where}: ${gov.id} adopted a budget by vote`,
      ).toBeGreaterThan(0);
    }
    for (const gov of governments(api))
      for (const b of budgetsOf(api, gov.id))
        expect(b.adoptedBy, `${where}: ${b.id}`).not.toMatch(
          /carried forward by the budget rule/,
        );
  } finally {
    setBookkeeping(true);
  }
}, 3_600_000);
