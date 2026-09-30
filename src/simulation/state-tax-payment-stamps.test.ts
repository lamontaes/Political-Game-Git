import { mkdirSync, writeFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  createNewGameWorld,
  DEFAULT_NEW_GAME_SETUP,
} from "../presentation/new-game";
import {
  enterLifePath,
  scheduleLifePathSession,
  applyLifePathSessionCompletion,
  LIFE_PATHS2_HANDLERS,
} from "./life-paths2";
import { searchLifePlaces } from "./life-places";
import { simulationMomentOnLocalDate } from "./dates";
import { resourcePositionAt } from "./resource-queries";
import {
  createResourceFlow,
  money,
  recordResourceTransferOutcome,
} from "./resources";
import { assessPaycheckTaxes, FEDERAL_INCOME_TAX_KEY } from "./statutory-tax";
import { serializeWorld, deserializeWorld } from "./serialization";
import { isLawEffectStamp } from "./law-effect-stamp";
import {
  ADOPT_STATE_INCOME_TAX_QUESTION,
  GRADUATED_STATE_INCOME_TAX_QUESTION,
} from "./state-income-tax-law";
import { PAID_LEAVE_QUESTION } from "./state-paid-leave-law";
import { chiefExecutiveJurisdiction } from "./nationwide-world/government-jurisdiction";
import { ensureTaxPublicAccount, publicOrganizationKey } from "./tax-policy";
import type { EntityId, World } from "./types";

const receipts: unknown[] = [];
const states = ["US-MN", "US-MA", "US-OR", "US-CO", "US-CA"];
const provenance = {
  kind: "authored" as const,
  note: "Controlled capacity regression; no empirical wage or cash level.",
};
const cash = (world: World, personId: EntityId) =>
  resourcePositionAt(
    world,
    { kind: "person", personId },
    money(0, "USD").currency,
  )?.liquidBalance.minorUnits ?? 0;

function earnedPaycheck(stateKey: string) {
  const place = searchLifePlaces("", 5000, {
    stateJurisdictionKey: stateKey,
  }).find((row) => row.scope !== "state")!;
  const created = createNewGameWorld({
    ...DEFAULT_NEW_GAME_SETUP,
    placeKey: place.key,
    startAge: 30,
    startingLife: "ordinary-life",
    household: "lives-alone",
    questionnaire: "skipped",
    seed: `tax-payment-stamp:${stateKey}`,
  });
  const entered = enterLifePath(created.world, "shop-assistant");
  expect(entered.ok, entered.message).toBe(true);
  const workId = entered.world.history.workRelationships.at(-1)!.id;
  const scheduled = scheduleLifePathSession(entered.world, workId);
  expect(scheduled.ok, scheduled.message).toBe(true);
  const activity = scheduled.world.history.scheduledActivities.at(-1)!;
  const worked = applyLifePathSessionCompletion(scheduled.world, activity.id);
  const due = worked.history.futureDueItems.find(
    (row) =>
      row.transitionKey === "life-paths2:pay" && row.entityIds.includes(workId),
  )!;
  const paid = LIFE_PATHS2_HANDLERS.get(due.transitionKey)!(
    {
      ...worked,
      currentDate: due.dueAt,
      currentMoment: simulationMomentOnLocalDate(
        worked.currentMoment,
        due.dueAt,
      ),
    },
    due,
  );
  expect(paid.status).toBe("resolved");
  const world = paid.world;
  const liabilities = world.history.statutoryTaxLiabilities!.filter(
    (row) =>
      row.payer.kind === "person" &&
      row.payer.personId === created.playerPersonId,
  );
  const first = world.history.resourceTransferOutcomes.find(
    (row) => row.id === liabilities[0]!.sourceOutcomeId,
  )!;
  return { world, personId: created.playerPersonId, first };
}

function assertLineage(
  world: World,
  outcomeId: EntityId,
  stateKey: string,
  scenario = "completed",
) {
  const liabilities = world.history.statutoryTaxLiabilities!.filter(
    (row) => row.sourceOutcomeId === outcomeId,
  );
  const state = chiefExecutiveJurisdiction(stateKey.slice(3))!.id;
  for (const suffix of ["wage-income-tax", "paid-leave-premium"]) {
    const liability = liabilities.find(
      (row) => row.taxKey === `${stateKey.toLowerCase()}:${suffix}`,
    )!;
    expect(liability.liability!.minorUnits).toBeGreaterThan(0);
    expect(liability.lawEffectStamps!.length).toBeGreaterThan(0);
    for (const stamp of liability.lawEffectStamps!) {
      expect(isLawEffectStamp(stamp)).toBe(true);
      expect(stamp.jurisdictionId).toBe(state);
      expect(stamp.sourceRecordIds).toContain(outcomeId);
      if (suffix === "paid-leave-premium")
        expect(stamp.questionKey).toBe(PAID_LEAVE_QUESTION);
      else
        expect([
          ADOPT_STATE_INCOME_TAX_QUESTION,
          GRADUATED_STATE_INCOME_TAX_QUESTION,
        ]).toContain(stamp.questionKey);
    }
    const payment = world.history.statutoryTaxPayments!.find(
      (row) => row.liabilityId === liability.id,
    );
    if (!payment) continue;
    expect(payment.amount.minorUnits).toBeGreaterThan(0);
    expect(payment.amount.minorUnits).toBeLessThanOrEqual(
      liability.liability!.minorUnits,
    );
    const transfer = world.history.resourceTransferOutcomes.find(
      (row) => row.id === payment.resourceOutcomeId,
    )!;
    for (const stamp of payment.lawEffectStamps!) {
      expect(stamp.effectKind).toBe(
        suffix === "paid-leave-premium"
          ? "paid-leave-premium-payment"
          : "state-income-tax-payment",
      );
      expect(stamp.sourceRecordIds).toEqual(
        expect.arrayContaining([liability.id, transfer.id, outcomeId]),
      );
      expect(
        liability.lawEffectStamps!.some(
          (source) =>
            source.governingLawKey === stamp.governingLawKey &&
            source.questionKey === stamp.questionKey,
        ),
      ).toBe(true);
    }
  }
  const federal = liabilities.find(
    (row) => row.taxKey === FEDERAL_INCOME_TAX_KEY,
  )!;
  expect(federal.authorityKey).toBe("US");
  expect(
    (federal.lawEffectStamps ?? []).every(
      (stamp) => stamp.effectKind === "federal-income-tax-withholding",
    ),
  ).toBe(true);
  const reopened = deserializeWorld(serializeWorld(world));
  expect(reopened.history.statutoryTaxLiabilities).toEqual(
    world.history.statutoryTaxLiabilities,
  );
  expect(reopened.history.statutoryTaxPayments).toEqual(
    world.history.statutoryTaxPayments,
  );
  expect(assessPaycheckTaxes(reopened, outcomeId)).toBe(reopened);
  receipts.push({
    stateKey,
    scenario,
    sourceOutcomeId: outcomeId,
    liabilities: liabilities.map((row) => ({
      id: row.id,
      taxKey: row.taxKey,
      payer: row.payer,
      amount: row.liability,
      lawEffectStamps: row.lawEffectStamps ?? [],
    })),
    payments: (world.history.statutoryTaxPayments ?? []).filter((row) =>
      liabilities.some((liability) => liability.id === row.liabilityId),
    ),
    transfers: world.history.resourceTransferOutcomes.filter((row) =>
      (world.history.statutoryTaxPayments ?? []).some(
        (payment) =>
          payment.resourceOutcomeId === row.id &&
          liabilities.some((liability) => liability.id === payment.liabilityId),
      ),
    ),
  });
  return liabilities;
}

describe.each(states)(
  "state tax and leave premium payment stamps in %s",
  (stateKey) => {
    it("preserves full, partial and zero allocated payments through Save/Continue", () => {
      const { world: earned, personId, first } = earnedPaycheck(stateKey);
      const firstRows = assertLineage(earned, first.id, stateKey);
      for (const row of firstRows.filter(
        (row) =>
          row.payer.kind === "person" &&
          row.collection === "withheld-from-pay" &&
          row.liability!.minorUnits > 0,
      ))
        expect(
          earned.history.statutoryTaxPayments!.find(
            (payment) => payment.liabilityId === row.id,
          )!.amount,
        ).toEqual(row.liability);

      // A distinct controlled wage flow reuses the real work endpoints and the
      // observed pay amount. This is tax allocation, not a second earned shift.
      const originalFlow = earned.history.resourceFlows.find(
        (row) => row.id === first.resourceFlowId,
      )!;
      let input = createResourceFlow(earned, {
        stableKey: `tax-stamp:controlled-gross:${stateKey}`,
        source: originalFlow.source,
        recipient: originalFlow.recipient,
        startsAt: earned.currentDate,
        amount: first.transferredAmount,
        cadenceKind: "schedule:one-time",
        basisKind: originalFlow.basisKind,
        basisReference: originalFlow.basisReference,
        restrictionKind: null,
        jurisdictionId: originalFlow.jurisdictionId,
        provenance,
      });
      const controlledFlow = input.history.resourceFlows.at(-1)!;
      input = recordResourceTransferOutcome(input, {
        stableKey: `tax-stamp:controlled-second:${stateKey}`,
        resourceFlowId: controlledFlow.id,
        periodStartsAt: earned.currentDate,
        periodEndsAt: earned.currentDate,
        occurredAt: earned.currentDate,
        status: "completed",
        attemptedAmount: first.transferredAmount,
        transferredAmount: first.transferredAmount,
        reasonKind: null,
        note: "Controlled second wage input for allocation regression.",
        provenance,
      });
      const second = input.history.resourceTransferOutcomes.at(-1)!;
      const probe = assessPaycheckTaxes(input, second.id);
      const rows = probe.history.statutoryTaxLiabilities!.filter(
        (row) =>
          row.sourceOutcomeId === second.id &&
          row.payer.kind === "person" &&
          row.collection === "withheld-from-pay",
      );
      const federalMinor = rows
        .filter((row) => row.authorityKey === "US")
        .reduce((sum, row) => sum + row.liability!.minorUnits, 0);
      const incomeMinor = rows.find((row) =>
        row.taxKey.endsWith(":wage-income-tax"),
      )!.liability!.minorUnits;
      const premiumMinor = rows.find((row) =>
        row.taxKey.endsWith(":paid-leave-premium"),
      )!.liability!.minorUnits;
      expect(premiumMinor).toBeGreaterThan(1);
      const state = chiefExecutiveJurisdiction(stateKey.slice(3))!;
      input = ensureTaxPublicAccount(input, state.id);
      const account = input.history.organizations.find(
        (row) => row.stableKey === publicOrganizationKey(state.id),
      )!;
      for (const targetCash of [
        federalMinor + incomeMinor + Math.floor(premiumMinor / 2),
        federalMinor + Math.floor(incomeMinor / 2),
        0,
      ]) {
        const held = cash(input, personId);
        expect(held).toBeGreaterThanOrEqual(targetCash);
        let capacity = createResourceFlow(input, {
          stableKey: `tax-stamp:capacity:${stateKey}:${targetCash}`,
          source: { kind: "person", personId },
          recipient: { kind: "organization", organizationId: account.id },
          startsAt: input.currentDate,
          amount: money(held - targetCash, "USD"),
          cadenceKind: "schedule:one-time",
          basisKind: "custom:tax-stamp-capacity",
          basisReference: { kind: "general" },
          restrictionKind: null,
          jurisdictionId: state.id,
          provenance,
        });
        const drain = capacity.history.resourceFlows.at(-1)!;
        capacity = recordResourceTransferOutcome(capacity, {
          stableKey: `${drain.stableKey}:paid`,
          resourceFlowId: drain.id,
          periodStartsAt: input.currentDate,
          periodEndsAt: input.currentDate,
          occurredAt: input.currentDate,
          status: "completed",
          attemptedAmount: money(held - targetCash, "USD"),
          transferredAmount: money(held - targetCash, "USD"),
          reasonKind: null,
          note: "Transfer held fixture cash to control remaining withholding capacity.",
          provenance,
        });
        expect(cash(capacity, personId)).toBe(targetCash);
        const assessed = assessPaycheckTaxes(capacity, second.id);
        const assessedRows = assertLineage(
          assessed,
          second.id,
          stateKey,
          targetCash === 0
            ? "zero"
            : targetCash > federalMinor + incomeMinor
              ? "partial-premium"
              : "partial-income",
        );
        const payments = assessed.history.statutoryTaxPayments!.filter(
          (payment) =>
            assessedRows.some((row) => row.id === payment.liabilityId),
        );
        expect(
          payments.reduce((sum, row) => sum + row.amount.minorUnits, 0),
        ).toBe(targetCash);
        if (targetCash === 0) expect(payments).toHaveLength(0);
        else {
          const premium = assessedRows.find((row) =>
            row.taxKey.endsWith(":paid-leave-premium"),
          )!;
          const income = assessedRows.find((row) =>
            row.taxKey.endsWith(":wage-income-tax"),
          )!;
          if (targetCash > federalMinor + incomeMinor) {
            expect(
              payments.find((row) => row.liabilityId === premium.id)!.amount
                .minorUnits,
            ).toBe(Math.floor(premiumMinor / 2));
            expect(
              payments.find((row) => row.liabilityId === income.id)!.amount
                .minorUnits,
            ).toBe(incomeMinor);
          } else {
            expect(
              payments.find((row) => row.liabilityId === income.id)!.amount
                .minorUnits,
            ).toBe(Math.floor(incomeMinor / 2));
            expect(payments.some((row) => row.liabilityId === premium.id)).toBe(
              false,
            );
          }
          for (const row of assessedRows.filter(
            (row) => row.authorityKey === "US",
          )) {
            const baseline = rows.find((item) => item.taxKey === row.taxKey);
            if (baseline) {
              expect(row.liability).toEqual(baseline.liability);
              expect(row.lawEffectStamps).toEqual(baseline.lawEffectStamps);
            }
          }
        }
      }
      mkdirSync("test-results/team-3-tax-payment-stamps", { recursive: true });
      writeFileSync(
        `test-results/team-3-tax-payment-stamps/${stateKey}.json`,
        JSON.stringify(
          receipts.filter(
            (row) => (row as { stateKey: string }).stateKey === stateKey,
          ),
          null,
          2,
        ),
      );
    }, 120_000);
  },
);
