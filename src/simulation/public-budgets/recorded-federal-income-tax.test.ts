import { describe, expect, it } from "vitest";
import { stdout } from "node:process";
import { smallWorld } from "../../../tests/fixtures/small-world";
import { drawRandomPlace } from "../../../tests/support/random-place";
import { makeIsoDate } from "../dates";
import {
  enterLifePath,
  lifePaths2Handlers,
  performLifePathSession,
  scheduleLifePathSession,
} from "../life-paths2";
import { advanceWorld } from "../world";
import { personName } from "../people";
import { assessPaychecksTaxes, FEDERAL_INCOME_TAX_KEY } from "../statutory-tax";
import { resourcePositionAt } from "../resource-queries";
import { money } from "../resources";
import { deserializeWorld, serializeWorld } from "../serialization";
import { withOpenedBudgets } from "./index";
import { readMonthFlows, settleGovernmentMonth } from "./month";
import { FEDERAL_RECEIPTS } from "./federal-treasury";
import { PUBLIC_BUDGETS_VERSION } from "./store";

const seeds = Array.from({ length: 5 }, (_, i) => `a29-recorded-income:${i}`);

describe("A29: federal income receipts come from one recorded collection", () => {
  it.each(seeds)(
    "retains actual paycheck collections through Continue (%s)",
    (seed) => {
      const place = drawRandomPlace(seed);
      const fixture = smallWorld({
        place: place.key,
        date: "2026-01-05",
        seed,
      });
      const entered = enterLifePath(fixture.world, "shop-assistant");
      expect(entered.ok, entered.message).toBe(true);
      const work = entered.world.history.workRelationships.at(-1)!;
      const scheduled = scheduleLifePathSession(entered.world, work.id);
      expect(scheduled.ok, scheduled.message).toBe(true);
      const performed = performLifePathSession(
        scheduled.world,
        scheduled.world.history.scheduledActivities.at(-1)!.id,
      );
      expect(performed.ok, performed.message).toBe(true);
      const paid = advanceWorld(performed.world, 1, lifePaths2Handlers());
      const paycheck = paid.history.resourceTransferOutcomes.find((outcome) => {
        const flow = paid.history.resourceFlows.find(
          (row) => row.id === outcome.resourceFlowId,
        );
        return (
          flow?.basisReference.kind === "work" &&
          flow.basisReference.workRelationshipId === work.id &&
          flow.recipient.kind === "person" &&
          flow.recipient.personId === fixture.personId &&
          outcome.transferredAmount.minorUnits > 0
        );
      });
      expect(paycheck).toBeDefined();
      if (!paycheck)
        throw new Error("The completed work has no paid transfer.");
      const liabilities = (paid.history.statutoryTaxLiabilities ?? []).filter(
        (row) =>
          row.sourceOutcomeId === paycheck.id &&
          row.taxKey === FEDERAL_INCOME_TAX_KEY,
      );
      expect(liabilities).toHaveLength(1);
      const income = (paid.history.statutoryTaxPayments ?? []).filter(
        (payment) =>
          liabilities.some((liability) => liability.id === payment.liabilityId),
      );
      const collectedMinor = income.reduce(
        (sum, payment) => sum + payment.amount.minorUnits,
        0,
      );
      const month = makeIsoDate(`${paid.currentDate.slice(0, 7)}-01`);
      const store = withOpenedBudgets(
        paid,
        {
          version: PUBLIC_BUDGETS_VERSION,
          cursor: { flows: 0, outcomes: 0 },
          governments: [],
          adjustments: [],
          unknown: [],
        },
        month,
      );
      // An unread statutory rule is not a zero tax or authority to collect.
      // This small world must not manufacture a national account or receipt.
      if (!store.federalGovernment) {
        expect(liabilities[0]!.status).toBe("rule-unknown");
        expect(liabilities[0]!.liability).toBeNull();
        expect(liabilities[0]!.researchQuestionId).toBeTruthy();
        expect(income).toEqual([]);
        const restored = deserializeWorld(serializeWorld(paid));
        expect(assessPaychecksTaxes(restored, [paycheck.id])).toBe(restored);
        expect(restored.history.resourceTransferOutcomes).toEqual(
          paid.history.resourceTransferOutcomes,
        );
        stdout.write(
          JSON.stringify({
            seed,
            place: place.displayName,
            person: personName(paid.people[fixture.personId]!),
            personId: fixture.personId,
            paycheckId: paycheck.id,
            liabilityId: liabilities[0]!.id,
            status: liabilities[0]!.status,
            sourceUrl: liabilities[0]!.sourceUrl,
            paymentIds: [],
            researchQuestionId: liabilities[0]!.researchQuestionId,
            result:
              "Unread statutory rule; no tax amount, national budget or receipt invented.",
          }) + "\n",
        );
        return;
      }
      expect(income).toHaveLength(1);
      expect(collectedMinor).toBeGreaterThan(0);
      const read = readMonthFlows(paid, store);
      const government = settleGovernmentMonth(
        paid,
        store.federalGovernment!,
        month,
        read.flows,
      ).government;
      const row = government.months.at(-1)!;
      expect(row.revenue[FEDERAL_RECEIPTS.indexOf("individualIncomeTax")]).toBe(
        collectedMinor / 100,
      );
      for (const payment of income) {
        expect(row.cashSettlement.sourceRecordIds).toEqual(
          expect.arrayContaining([
            payment.id,
            payment.liabilityId,
            payment.resourceOutcomeId,
          ]),
        );
      }
      expect(government.balance).toBe(
        resourcePositionAt(
          paid,
          {
            kind: "organization",
            organizationId: row.cashSettlement.organizationId,
          },
          money(0, "USD").currency,
        )!.liquidBalance.minorUnits / 100,
      );
      const saved = deserializeWorld(
        serializeWorld({
          ...paid,
          publicBudgets: {
            ...store,
            cursor: read.cursor,
            federalGovernment: government,
          },
        }),
      );
      expect(assessPaychecksTaxes(saved, [paycheck.id])).toBe(saved);
      const continued = readMonthFlows(saved, saved.publicBudgets!);
      expect(
        settleGovernmentMonth(saved, government, month, continued.flows)
          .government,
      ).toBe(government);
      expect(saved.history.statutoryTaxLiabilities).toEqual(
        paid.history.statutoryTaxLiabilities,
      );
      expect(saved.history.statutoryTaxPayments).toEqual(
        paid.history.statutoryTaxPayments,
      );
      expect(saved.history.resourceTransferOutcomes).toEqual(
        paid.history.resourceTransferOutcomes,
      );
      stdout.write(
        JSON.stringify({
          seed,
          place: place.displayName,
          person: personName(paid.people[fixture.personId]!),
          personId: fixture.personId,
          paycheckId: paycheck.id,
          liabilityId: liabilities[0]!.id,
          paymentIds: income.map((p) => p.id),
          collectedMinor,
          accountOrganizationId: row.cashSettlement.organizationId,
        }) + "\n",
      );
    },
  );
});
