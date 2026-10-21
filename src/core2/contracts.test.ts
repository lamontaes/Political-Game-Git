/** Generated play evidence: a government's body awards a public contract and the treasury pays it. */
import { randomBytes } from "node:crypto";
import { expect, it } from "vitest";
import { buildBenchWorld } from "../bench/world";
import { drawPlace } from "../../scripts/core2-year/place";
import { setBookkeeping } from "./bookkeeping";
import { gameStartDate } from "./game-start";
import { addDays, makeIsoDate } from "./kernel/dates";
import { advanceCore } from "./life";
import { coreAPI } from "./state";
import { treasuryMonthsOf } from "./budgets-treasury";
import { governments } from "./modules/budgets";
import { businessTradingMonth } from "./modules/business";
import { contractsOf } from "./modules/contracts";

it("awards a line's work to a bidder by the body's members and pays the winner monthly", () => {
  const draw = drawPlace(
    process.env.GOLDEN_PATH_SEED ?? randomBytes(32).toString("hex"),
    "gov-public-contract-awards",
  );
  const where = `${draw.name} (${draw.key}), seed ${draw.seed}`;
  setBookkeeping(false);
  try {
    const { core } = buildBenchWorld(draw.seed, gameStartDate(), {
      twoLevel: true,
      placeKey: draw.key,
    });
    const api = coreAPI(core);
    for (let day = 0; day < 365; day++)
      advanceCore(core, addDays(makeIsoDate(core.date), 1));
    const govs = governments(api);
    const awards = govs.flatMap((gov) => contractsOf(api, gov.id));
    const paidToFirms = govs.reduce(
      (sum, gov) =>
        sum +
        treasuryMonthsOf(api, gov.id).reduce(
          (n, month) =>
            n +
            Object.values(month.lines).reduce(
              (m, l) => m + l.providersMinor,
              0,
            ),
          0,
        ),
      0,
    );
    // Every dollar the treasuries paid town firms went through an award.
    expect(
      awards.reduce((n, a) => n + a.paidMinor, 0),
      where,
    ).toBe(paidToFirms);
    for (const award of awards) {
      const names = award.bids.map((b) => b.organizationId);
      expect(names, where).toContain(award.organizationId);
      const votes = Object.values(award.votes);
      if (award.basis === "vote") {
        // The winner holds the most first choices, and the tally is the votes.
        const most = Math.max(...Object.values(award.tally));
        expect(award.tally[award.organizationId], where).toBe(most);
        expect(votes.length, where).toBe(
          Object.values(award.tally).reduce((a, b) => a + b, 0),
        );
      }
      // Each month's payment is named on the award, in the treasury's own id.
      for (const id of award.paymentIds)
        expect(id, where).toMatch(
          new RegExp(
            `^treasury:${award.governmentId}:${award.line}:${award.organizationId}:`,
          ),
        );
      // The firm that was paid pays its workers: its books show a payroll.
      if (award.paidMinor > 0)
        expect(
          businessTradingMonth(api, award.organizationId)?.payrollMinor ?? 0,
          `${where}: ${award.id} payroll`,
        ).toBeGreaterThan(0);
    }
    expect(core.cashJournal.totals.grossDebitMinor).toBe(
      core.cashJournal.totals.grossCreditMinor,
    );
    console.log(
      where,
      awards.map((a) => ({
        id: a.id,
        basis: a.basis,
        paid: a.paidMinor,
        payments: a.paymentIds.length,
        bids: a.bids.length,
      })),
    );
  } finally {
    setBookkeeping(true);
  }
}, 900_000);
