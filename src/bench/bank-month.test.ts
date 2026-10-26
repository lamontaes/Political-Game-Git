/**
 * The Money screen shows why a household's cash fell short: its last month
 * (home costs, everyday living, paid, left unpaid) and the latest payments on
 * the loans it owes, read from the credit engine's own rows. In the played
 * world, in places drawn from all 56 on a seed nobody chose (BANK_MONTH_SEED
 * pins one).
 */
import { randomBytes } from "node:crypto";
import { describe, expect, it } from "vitest";
import { drawPlace } from "../../scripts/core2-year/place";
import { setBookkeeping } from "../core2/bookkeeping";
import { gameStartDate } from "../core2/game-start";
import { addDays, makeIsoDate } from "../core2/kernel/dates";
import { advanceCore } from "../core2/life";
import { coreAPI } from "../core2/state";
import { bankView } from "./bank";
import { buildBenchWorld } from "./world";

const seed = process.env.BANK_MONTH_SEED ?? randomBytes(8).toString("hex");
const maxPlaces = 8;

describe("the Money screen's last month and loan payments", () => {
  it("shows a household's month and its latest loan payments as the credit engine recorded them", () => {
    setBookkeeping(false);
    const tried: string[] = [];
    for (let i = 0; i < maxPlaces; i += 1) {
      const place = drawPlace(i ? `${seed}:${i}` : seed, "bank-month");
      const where = `${place.name} (${place.key}), seed ${place.seed}`;
      const { core } = buildBenchWorld(place.seed, gameStartDate(), {
        twoLevel: true,
        placeKey: place.key,
      });
      const api = coreAPI(core);
      advanceCore(core, addDays(makeIsoDate(core.date), 120));
      const credit = api.moduleState("credit");
      const loans = credit.table("loans").rows() as unknown as {
        id: string;
        householdId: string;
      }[];
      const borrower = loans
        .filter(
          (loan) =>
            credit.table("payments").query("byLoan", [loan.id]).length > 0,
        )
        .map((loan) => ({
          loan,
          person: [...core.people.values()].find(
            (p) => p.alive && p.householdId === loan.householdId,
          ),
        }))
        .find((row) => row.person);
      if (!borrower) {
        tried.push(`${where}: no full household had paid a loan in 120 days`);
        continue;
      }
      const view = bankView(core, borrower.person!.id)!;
      const month = (
        credit
          .table("households")
          .query("byHousehold", [borrower.loan.householdId]) as unknown as {
          id: string;
          date: string;
          housingMinor: number;
          everydayMinor: number;
          paidMinor: number;
          unpaidMinor: number;
        }[]
      ).toSorted((a, b) => b.date.localeCompare(a.date))[0]!;
      expect(view.month, where).toEqual({
        id: month.id,
        date: month.date,
        housingMinor: month.housingMinor,
        everydayMinor: month.everydayMinor,
        paidMinor: month.paidMinor,
        unpaidMinor: month.unpaidMinor,
      });
      expect(view.loanPayments.length, where).toBeGreaterThan(0);
      for (const payment of view.loanPayments) {
        const row = credit.table("payments").get(payment.id) as unknown as {
          loanId: string;
          dueMinor: number;
          paidMinor: number;
        };
        expect(
          loans.find((loan) => loan.id === row.loanId)?.householdId,
          `${payment.id} in ${where}`,
        ).toBe(borrower.loan.householdId);
        expect(payment.dueMinor, payment.id).toBe(row.dueMinor);
        expect(payment.paidMinor, payment.id).toBe(row.paidMinor);
      }
      console.log(
        `bank month: ${where}: ${borrower.person!.id} month ${month.id} (${month.unpaidMinor} unpaid), ${view.loanPayments.length} payments from ${view.loanPayments[0]!.id}`,
      );
      return;
    }
    throw new Error(
      `No drawn place had a household that paid a loan (seed ${seed}): ${tried.join("; ")}`,
    );
  }, 1_800_000);
});
