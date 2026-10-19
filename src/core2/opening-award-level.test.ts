/**
 * A cut to the federal Social Security line reaches the retirement awards the
 * opening wrote for full people: each recipient's contract takes the new
 * amount from its next due date, the funding that pays its payer falls by the
 * same dollars, the saved award is untouched, and every dollar balances.
 * Place and seed are named in every failure message; GOLDEN_PATH_SEED
 * reproduces a run.
 */
import { randomBytes } from "node:crypto";
import { describe, expect, it } from "vitest";
import { drawPlace } from "../../scripts/core2-year/place";
import { daysAfterStart } from "./tooling/test-days";
import { generatedOpening } from "./tooling/generated-world";
import { advanceCore, createLifeCore } from "./life";
import { amendBudget, governments, openBudgets } from "./modules/budgets";
import { budgetInForce } from "./budgets-treasury";
import { openLaws } from "./modules/laws";
import { coreAPI } from "./state";

const seed = process.env.GOLDEN_PATH_SEED ?? randomBytes(16).toString("hex");

describe("an opening retirement award follows the Social Security line", () => {
  it("cuts each recipient's check and its funding by the same dollars", () => {
    for (let attempt = 0; attempt < 8; attempt++) {
      const place = drawPlace(seed, `opening-award-level-${attempt}`);
      const core = createLifeCore(generatedOpening(place, { twoLevel: true }));
      openLaws(core);
      openBudgets(core);
      const api = coreAPI(core);
      const where = `${place.name}, ${place.state} (${place.key}), seed ${seed}`;
      const awards = () =>
        [...core.finance.contracts.values()].filter(
          (row) =>
            row.kind === "income.retirement" &&
            row.recipientIncome &&
            !row.endedAt,
        );
      if (!awards().length) continue;
      advanceCore(core, daysAfterStart(3));
      const before = new Map(awards().map((row) => [row.id, row.amountMinor]));
      const fundingOf = () =>
        [...core.finance.contracts.values()]
          .filter(
            (row) =>
              !row.endedAt &&
              (
                row.externalInflow as
                  { incomeContractIds?: string[] } | undefined
              )?.incomeContractIds,
          )
          .reduce((n, row) => n + row.amountMinor, 0);
      const fundingBefore = fundingOf();
      const federal = governments(api).find((g) => g.level === "federal")!;
      const line = budgetInForce(api, federal.id)!.spendingMinor
        .socialSecurity!;
      // A bill cuts the line by a tenth.
      amendBudget(api, {
        governmentId: federal.id,
        line: "socialSecurity",
        deltaMinor: -Math.round(line / 10),
        measureId: "test:cut-social-security",
      });
      let cut = 0;
      for (const row of awards()) {
        const was = before.get(row.id);
        if (was === undefined) continue;
        expect(
          Math.abs(row.amountMinor - Math.round(was * 0.9)),
          `${where} ${row.id}`,
        ).toBeLessThanOrEqual(1);
        expect(row.recipientIncome!.adjustedBy, where).toBe(
          "test:cut-social-security",
        );
        cut += was - row.amountMinor;
      }
      expect(cut, where).toBeGreaterThan(0);
      // The funding that pays the payers falls by the same dollars.
      expect(fundingBefore - fundingOf(), where).toBe(cut);
      // The next due dates settle on the new amounts: no settlement check
      // throws and every dollar balances.
      advanceCore(core, daysAfterStart(70));
      expect(core.cashJournal.totals.grossDebitMinor, where).toBe(
        core.cashJournal.totals.grossCreditMinor,
      );
      return;
    }
    throw new Error(
      `no drawn place had an opening retirement award (seed ${seed})`,
    );
  }, 900_000);
});
