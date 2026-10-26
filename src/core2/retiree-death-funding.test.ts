/**
 * A retiree's award ends at their death while the pooled obligation that funds
 * their payer stands: the parent drops the child's id, award and amount (and
 * ends when it has no children left), so the next month settles. Place and
 * seed are named in every failure message; GOLDEN_PATH_SEED reproduces a run.
 */
import { randomBytes } from "node:crypto";
import { describe, expect, it } from "vitest";
import { drawPlace } from "../../scripts/core2-year/place";
import { endRecipientIncomeAtDeath } from "./finance-state";
import { addDays, makeIsoDate } from "./kernel/dates";
import { advanceCore, createLifeCore } from "./life";
import { generatedOpening } from "./tooling/generated-world";
import type { CoreState } from "./types";

const seed = process.env.GOLDEN_PATH_SEED ?? randomBytes(16).toString("hex");
type Funding = { incomeContractIds?: string[]; sourceAwardIds?: string[] };

const parents = (core: CoreState) =>
  [...core.finance.contracts.values()].filter(
    (row) => !!(row.externalInflow as Funding | undefined)?.incomeContractIds,
  );

describe("a retiree's death and the pooled obligation that funds their payer", () => {
  it("keeps the parent equal to its living children and settles the next month", () => {
    for (let attempt = 0; attempt < 6; attempt++) {
      const place = drawPlace(seed, `retiree-death-funding-${attempt}`);
      const core = createLifeCore(generatedOpening(place, { twoLevel: true }));
      const where = `${place.name}, ${place.state} (${place.key}), seed ${seed}`;
      const children = [...core.finance.contracts.values()].filter(
        (row) => row.recipientIncome && !row.endedAt,
      );
      if (!children.length) continue;
      // Every retiree dies in turn: the parent follows its children down.
      for (const child of children) {
        const parent = parents(core).find((row) =>
          (row.externalInflow as Funding).incomeContractIds!.includes(child.id),
        )!;
        const before = parent.amountMinor;
        endRecipientIncomeAtDeath(core, child.recipientIncome!.personId);
        // A parent with children left falls by the child's amount; the last one ends it.
        const last = parent.endedAt !== undefined;
        if (!last)
          expect(parent.amountMinor, `${where} ${child.id}`).toBe(
            before - child.amountMinor,
          );
        if (last) {
          expect(parent.endedAt, where).toBeDefined();
          if (child !== children.at(-1)) continue;
        } else
          expect(
            (parent.externalInflow as Funding).incomeContractIds,
            where,
          ).not.toContain(child.id);
        const living = (parent.externalInflow as Funding).incomeContractIds!;
        if (!last && living.length)
          expect(
            living.reduce(
              (n, id) => n + core.finance.contracts.get(id)!.amountMinor,
              0,
            ),
            where,
          ).toBe(parent.amountMinor);
        // After the first death the others are still paid: a month settles.
        if (child === children[0])
          advanceCore(core, addDays(makeIsoDate(core.date), 40));
      }
      // The month settles with nothing left to pay.
      advanceCore(core, addDays(makeIsoDate(core.date), 70));
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
