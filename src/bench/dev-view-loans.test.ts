/**
 * Dev mode's Loans view (src/bench/dev-views/loans.ts, pool item dev-mode-shows-a-loans-monthly-bills)
 * shows a played household's loan as the credit engine wrote it: the application with the income
 * and costs it read, and each month's bill with the borrower's cash that morning and the payment
 * or missed-payment record. Played on the player's own clock at the pinned borrower
 * (tests/support/real-borrower.ts): Ragland, Alabama, seed promises-real-loan-1 draw loan:16, born
 * 1995-03-01, whose bank personal loan of Jul 1, 2025 goes unpaid on Aug 1 and Sep 1. When the
 * lenders pair makes a personal loan the borrower's own (refusing a borrower with no income of
 * their own), this player is refused instead and the test is re-pinned with that pair.
 */
import type { IncomingMessage } from "node:http";
import { expect, it } from "vitest";
import { setBookkeeping } from "../core2/bookkeeping";
import { coreAPI } from "../core2/state";
import type { PersonId } from "../core2/types";
import {
  BANK_BORROWER,
  borrowerWorld,
  play,
} from "../../tests/support/real-borrower";
import { handleDev } from "./dev-api";
import { loadDevViews } from "./dev-views";

/** Days from the opening to Sep 2, 2025: the loan, its first bill and its second. */
const DAYS = 225;
/** About 90 seconds to play the days alone (Nov 16); twice that. */
const TIMEOUT = 180_000;

function request(method: string): IncomingMessage {
  return {
    method,
    async *[Symbol.asyncIterator]() {},
  } as unknown as IncomingMessage;
}

it(
  "dev mode's Loans view shows a played loan's application and each month's bill by record (Ragland AL)",
  async () => {
    setBookkeeping(false);
    try {
      const { core, director, placeId, playerId, where } = borrowerWorld(
        BANK_BORROWER.draw,
        BANK_BORROWER.birth,
      );
      const id = playerId as PersonId;
      let guard = 0;
      while (core.date < "2025-09-02" && guard++ < DAYS) {
        const before = core.date;
        play(core, id, 1);
        if (core.date === before) play(core, id, 2);
      }
      await loadDevViews();
      const answers: { status: number; value: unknown }[] = [];
      await handleDev(
        request("GET"),
        new URL("http://bench/api/dev/loans/household"),
        (status, value) => answers.push({ status, value }),
        () => ({ core, director, placeId }),
      );
      const { status, value } = answers.at(-1)!;
      expect(status, where).toBe(200);
      const view = value as {
        householdId: string;
        applications: {
          id: string;
          date: string;
          borrowerId: string;
          approved: boolean;
          monthlyIncomeMinor: number;
        }[];
        loans: {
          id: string;
          borrowerId: string;
          months: {
            date: string;
            dueMinor: number;
            cashBeforeMinor: number;
            paidMinor: number;
            recordId: string | null;
          }[];
        }[];
      };
      const household = core.people.get(id)!.householdId;
      expect(view.householdId, where).toBe(household);
      // The view lists every application and payment row the engine wrote for the household, no more.
      const credit = coreAPI(core).moduleState("credit");
      const rows = credit
        .table("applications")
        .rows()
        .filter((row) => row.householdId === household);
      expect(view.applications.map((row) => row.id).sort(), where).toEqual(
        rows.map((row) => String(row.id)).sort(),
      );
      const july = view.applications.find(
        (row) => row.date === "2025-07-01" && row.approved,
      );
      expect(
        july,
        `${where}: ${JSON.stringify(view.applications)}`,
      ).toBeTruthy();
      expect(july!.borrowerId, where).toBe(id);
      const loan = view.loans.find(
        (row) => row.id === `loan:${household}:2025-07-01`,
      );
      expect(loan, `${where}: ${JSON.stringify(view.loans)}`).toBeTruthy();
      expect(
        loan!.months.map((m) => m.date),
        where,
      ).toEqual(["2025-08-01", "2025-09-01"]);
      for (const month of loan!.months) {
        // Each bill unpaid in full names the engine's own missed-payment record, which exists.
        expect(month.paidMinor < month.dueMinor, where).toBe(true);
        expect(month.recordId, where).toBe(
          `event:credit.payment-missed:${loan!.id}:${month.date}`,
        );
        expect(core.durableLog.has(month.recordId!), where).toBe(true);
      }
      process.stdout.write(
        `LOANS VIEW ${where}\n  ${JSON.stringify(view.applications)}\n  ${JSON.stringify(loan)}\n`,
      );
    } finally {
      setBookkeeping(true);
    }
  },
  TIMEOUT,
);
