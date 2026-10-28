/**
 * The Money sheet's cash, spending, assets and debts are the ledger's and the
 * credit engine's own records: each value cites a record that exists. In the
 * played world, in a place drawn from all 56 on a seed nobody chose
 * (GOLDEN_PATH_SEED pins one).
 */
import { randomBytes } from "node:crypto";
import { describe, expect, it } from "vitest";
import { drawPlace } from "../../scripts/core2-year/place";
import { bankDeposit } from "../core2/accounts";
import { setBookkeeping } from "../core2/bookkeeping";
import { gameStartDate } from "../core2/game-start";
import { addDays, makeIsoDate } from "../core2/kernel/dates";
import { advanceCore } from "../core2/life";
import { coreAPI } from "../core2/state";
import { bankView } from "./bank";
import { buildBenchWorld } from "./world";

const seed = process.env.GOLDEN_PATH_SEED ?? randomBytes(8).toString("hex");
const maxPlaces = 6;
const maxDays = 105;

describe("the Money sheet reads the ledger", () => {
  it("lists cash, spending, assets and debts that cite real records", () => {
    setBookkeeping(false);
    const tried: string[] = [];
    for (let i = 0; i < maxPlaces; i += 1) {
      const place = drawPlace(i ? `${seed}:${i}` : seed, "bank-sections");
      const where = `${place.name} (${place.key}), seed ${place.seed}`;
      const { core, playerId } = buildBenchWorld(place.seed, gameStartDate(), {
        twoLevel: true,
        placeKey: place.key,
      });
      // Thirty-five days at a time until the credit engine's monthly review
      // has written the household's row (the review falls on the first of a month).
      let days = 0;
      let view = bankView(core, playerId);
      while (days < maxDays && !view?.cash.months.length) {
        advanceCore(core, addDays(makeIsoDate(core.date), 35));
        days += 35;
        view = bankView(core, playerId);
      }
      const person = core.people.get(playerId)!;
      if (!view || view.cash.nowMinor <= 0 || !view.spending.length) {
        tried.push(`${where}: no cash or spending for ${playerId}`);
        continue;
      }
      const api = coreAPI(core);
      const credit = api.moduleState("credit");
      expect(view.cash.months.length, where).toBeGreaterThan(0);
      for (const entry of view.cash.months) {
        const row = credit.table("households").get(entry.id) as unknown as {
          householdId: string;
          cashMinor: number;
        };
        expect(row.householdId, entry.id).toBe(person.householdId);
        expect(entry.cashMinor, entry.id).toBe(row.cashMinor);
      }
      const receiptIds = new Set(
        [...core.finance.latestReceiptsByContract.values()].map((r) => r.id),
      );
      for (const line of view.spending) {
        expect(line.reasonKey, where).toBeTruthy();
        expect(line.ids.length, line.reasonKey).toBeGreaterThan(0);
        for (const id of line.ids)
          expect(
            receiptIds.has(id) || id.startsWith(`living:${person.householdId}`),
            id,
          ).toBe(true);
        expect(line.paidMinor, line.reasonKey).toBeLessThanOrEqual(
          line.requestedMinor,
        );
      }
      const bankId = String(
        credit.table("banks").get("credit:bank")?.organizationId,
      );
      for (const asset of view.assets) {
        if (asset.kind === "savings")
          expect(asset.id, where).toBe(
            bankDeposit(core, bankId, person.householdId)?.id,
          );
        else
          expect(
            api.moduleState("housing").table("dwellings").get(asset.id),
            asset.id,
          ).toBeTruthy();
      }
      for (const debt of view.debts) {
        const found =
          credit.table("loans").get(debt.id) ??
          api.moduleState("housing").table("mortgages").get(debt.id);
        expect(found, debt.id).toBeTruthy();
        expect(debt.owedMinor, debt.id).toBeGreaterThan(0);
      }
      console.log(
        `bank sections: ${where}: after ${days} days: ${playerId} cash ${view.cash.nowMinor}, ${view.cash.months.length} months, ${view.spending.length} spending lines (${view.spending.map((l) => l.reasonKey).join(", ")}), ${view.assets.length} assets, ${view.debts.length} debts`,
      );
      return;
    }
    throw new Error(
      `No drawn place showed cash and spending (seed ${seed}): ${tried.join("; ")}`,
    );
  }, 1_800_000);
});
