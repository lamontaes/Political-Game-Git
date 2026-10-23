import { randomBytes } from "node:crypto";
import { expect, it } from "vitest";
import { buildBenchWorld } from "../bench/world";
import { gameStartDate } from "./game-start";
import { coreAPI } from "./state";
import { advanceCore } from "./life";
import { addDays, makeIsoDate } from "./kernel/dates";
import {
  foreclosureSale,
  startForeclosures,
  type MortgageRow,
} from "./housing-foreclosure";
import type { ModuleRow } from "./module-data";
import { drawPlace } from "../../scripts/core2-year/place";

// A foreclosure sells the home to the town's outside market, which can also
// hold the mortgage. Paying itself moves no cash: the loan is settled all the
// same, the borrower gets any surplus, and the price is accounted for in full.
// Beside it, a loan held by a different lender is paid from the market's cash.
const seed =
  process.env.FORECLOSURE_LENDER_SEED ?? randomBytes(8).toString("hex");

interface SaleRow {
  id: string;
  stage: string;
  salePriceMinor: number;
  owedAtSaleMinor: number;
  recoveredMinor: number;
  surplusMinor: number;
  lossMinor: number;
}

for (const selfLender of [true, false])
  it(`forecloses on a home whose mortgage ${selfLender ? "the outside market that buys it" : "a different lender"} holds: the loan is settled and the price balances`, () => {
    const tried: string[] = [];
    for (let attempt = 0; attempt < 8; attempt += 1) {
      const place = drawPlace(
        `${seed}:${selfLender ? "self" : "other"}:${attempt}`,
        "foreclosure-outside-lender",
      );
      const where = `seed ${seed}, ${place.name} (${place.key}), world seed ${place.seed}`;
      const { core } = buildBenchWorld(place.seed, gameStartDate(), {
        twoLevel: true,
        placeKey: place.key,
      });
      advanceCore(core, addDays(makeIsoDate(core.date), 40));
      const api = coreAPI(core);
      const housing = api.moduleState("housing");
      const usps = core.placeMetadata?.housingState ?? "";
      const loan = (
        housing.table("mortgages").rows() as unknown as MortgageRow[]
      ).find(
        (row) =>
          row.balanceMinor > 0 &&
          !row.foreclosedAt &&
          core.finance.contracts.has(row.id) &&
          core.households.has(row.householdId),
      );
      if (!loan) {
        tried.push(`${where}: no mortgaged household`);
        continue;
      }
      const household = core.households.get(loan.householdId)!;
      // The buyer the sale itself takes: the place's first outside market.
      const buyer = [...core.organizations.values()].find(
        (org) =>
          org.outsideFlow !== undefined && org.placeId === household.placeId,
      );
      if (!buyer) {
        tried.push(`${where}: no outside market`);
        continue;
      }
      if (!selfLender && loan.holderId === buyer.id) {
        tried.push(`${where}: ${loan.id} is already the market's`);
        continue;
      }
      // Edge fixture: the loan is held by the market (or left with its own
      // lender) and is far enough behind for the lender to file.
      housing.table("mortgages").put({
        ...loan,
        ...(selfLender ? { holderId: buyer.id } : {}),
        missedMonths: 12,
      } as unknown as ModuleRow);
      const opened = startForeclosures(api, usps).find((c) =>
        c.caseId.startsWith(`foreclosure:${loan.id}:`),
      );
      expect(opened, `${where}: ${loan.id} filed`).toBeDefined();
      const payee = (
        housing.table("mortgages").get(loan.id) as unknown as MortgageRow
      ).holderId;
      const payerAccount = api.accounts().main(buyer.id);
      const payeeAccount = api.accounts().main(payee);
      if (selfLender) expect(payeeAccount, where).toBe(payerAccount);
      else expect(payeeAccount, where).not.toBe(payerAccount);
      const first = household.memberIds[0]!;
      const cashOf = (id: string) =>
        core.people.get(id)?.liquidMinor ??
        core.organizations.get(id)?.liquidMinor ??
        0;
      const borrowerBefore = cashOf(first);
      const lenderBefore = cashOf(payee);
      foreclosureSale(api, opened!.caseId);
      const sale = housing
        .table("foreclosures")
        .get(opened!.caseId) as unknown as SaleRow;
      expect(sale.stage, where).toBe("sold");
      // The loan is settled.
      expect(
        (housing.table("mortgages").get(loan.id) as unknown as MortgageRow)
          .balanceMinor,
        where,
      ).toBe(0);
      // The price balances: what the lender recovered and the borrower's surplus,
      // and the lender writes off what the sale did not cover.
      expect(sale.recoveredMinor, where).toBe(
        Math.min(sale.salePriceMinor, sale.owedAtSaleMinor),
      );
      expect(sale.surplusMinor, where).toBe(
        Math.max(0, sale.salePriceMinor - sale.owedAtSaleMinor),
      );
      expect(sale.recoveredMinor + sale.surplusMinor, where).toBe(
        sale.salePriceMinor,
      );
      expect(sale.lossMinor, where).toBe(
        sale.owedAtSaleMinor - sale.recoveredMinor,
      );
      expect(cashOf(first) - borrowerBefore, where).toBe(sale.surplusMinor);
      // The outside market's books are outside the town's: a lender in town
      // is paid what it recovered, and a market that holds the loan pays itself nothing.
      if (!selfLender)
        expect(cashOf(payee) - lenderBefore, where).toBe(sale.recoveredMinor);
      process.stdout.write(
        `FORECLOSURE ${selfLender ? "SELF" : "OTHER"} LENDER ${where}: ${sale.id}; mortgage ${loan.id}; payer ${buyer.id} (account ${payerAccount}); payee ${payee} (account ${payeeAccount}); borrower ${first}; price ${sale.salePriceMinor}, owed ${sale.owedAtSaleMinor}, recovered ${sale.recoveredMinor}, surplus ${sale.surplusMinor}, loss ${sale.lossMinor}\n`,
      );
      return;
    }
    throw new Error(
      `no mortgaged household to foreclose in 8 places: ${tried.join("; ")}`,
    );
  }, 900_000);
