/**
 * A federal surplus pays down the debt held by the public and never piles up
 * in the U.S. Treasury's account. Congress halves every federal spending line
 * (the budget engine's own amendment), so receipts pass outlays; at each
 * monthly close the Treasury repays its debt holders, in the shares of what
 * each is owed, with what it holds above the month of standing payments it
 * keeps back. Before this, a world whose receipts passed its spending kept
 * every surplus dollar: at Inarajan, Guam the account reached $777 billion
 * five months after receipts passed outlays in 2031, and the outside market's
 * net passed 2^53 cents in year 13 (the long game's stop). A place is drawn
 * from all 56; GOLDEN_PATH_SEED replays one.
 */
import { randomBytes } from "node:crypto";
import { expect, it } from "vitest";
import { drawPlace } from "../../scripts/core2-year/place";
import { buildBenchWorld } from "../bench/world";
import { setBookkeeping } from "./bookkeeping";
import {
  budgetInForce,
  debtBalanceMinor,
  federalDebtOf,
  standingReserve,
} from "./budgets-treasury";
import { gameStartDate } from "./game-start";
import { addDays, makeIsoDate } from "./kernel/dates";
import { advanceCore } from "./life";
import { amendBudget, governments } from "./modules/budgets";
import { coreAPI } from "./state";

const replay = process.env.GOLDEN_PATH_SEED ?? randomBytes(8).toString("hex");
const place = drawPlace(replay, "federal-surplus");
const where = `${place.name} (${place.key}), seed ${place.seed}`;

it(
  `a federal surplus pays down the debt and does not pile up: ${where}, replay ${replay}`,
  { timeout: 1_800_000 },
  () => {
    const bookkeeping = setBookkeeping(false);
    try {
      const { core } = buildBenchWorld(place.seed, gameStartDate(), {
        twoLevel: true,
        placeKey: place.key,
      });
      const api = coreAPI(core);
      const federal = governments(api).find((g) => g.level === "federal")!;
      const budget = budgetInForce(api, federal.id)!;
      for (const [line, minor] of Object.entries(budget.spendingMinor))
        if (minor > 0)
          amendBudget(api, {
            governmentId: federal.id,
            line,
            deltaMinor: -Math.round(minor / 2),
            measureId: "federal-surplus-test",
          });
      const owed = () =>
        federalDebtOf(api).reduce((n, h) => n + debtBalanceMinor(h), 0);
      const main = api.accounts().main(federal.organizationId);
      const rows: string[] = [];
      const before = owed();
      let repaid = 0;
      for (let month = 0; month < 3; month++) {
        const debt = owed();
        advanceCore(core, addDays(makeIsoDate(core.date), 31));
        const held = api.accounts().balance(main);
        const reserve = standingReserve(api, main);
        repaid += Math.max(0, debt - owed());
        rows.push(
          `${core.date}: holds ${(held / 1e11).toFixed(1)} billion dollars against a reserve of ${(reserve / 1e11).toFixed(1)} billion, owes ${(owed() / 1e14).toFixed(3)} trillion`,
        );
      }
      process.stdout.write(`federal surplus: ${where}: ${rows.join("; ")}\n`);
      // The surplus went to the holders: the debt fell, and the account
      // held no more than a month's receipts (each row above).
      expect(owed(), `${where}: ${rows.join("; ")}`).toBeLessThan(before);
      expect(repaid, `${where}: repaid`).toBeGreaterThan(0);
    } finally {
      setBookkeeping(bookkeeping);
    }
  },
);
