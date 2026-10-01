import { mkdirSync, writeFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import premiums from "../../data/research/money/state-paid-leave-premiums-2026.json" with { type: "json" };
import { DEFAULT_NEW_GAME_SETUP } from "../presentation/new-game";
import {
  generateOpeningLife,
  prepareOpeningLife,
} from "../presentation/opening-life";
import {
  isLawEffectStamp,
  type LawEffectStampedRecord,
} from "./law-effect-stamp";
import { makeIsoDate, simulationMomentOnLocalDate } from "./dates";
import { searchLifePlaces } from "./life-places";
import {
  enterLifePath,
  scheduleLifePathSession,
  applyLifePathSessionCompletion,
  lifePaths2Handlers,
} from "./life-paths2";
import { chiefExecutiveJurisdiction } from "./nationwide-world/government-jurisdiction";
import {
  paidLeaveBenefitRate,
  payPaidLeaveClaims,
} from "./paid-leave-benefits";
import { resourcePositionAt } from "./resource-queries";
import {
  createResourceFlow,
  money,
  recordResourceTransferOutcome,
} from "./resources";
import { deserializeWorld, serializeWorld } from "./serialization";
import { PAID_LEAVE_QUESTION } from "./state-paid-leave-law";
import { ensureTaxPublicAccount, publicOrganizationKey } from "./tax-policy";
import { openGovernmentBudget } from "./public-budgets/opening";
import {
  readMonthFlows,
  settleGovernmentMonth,
  type MonthFlows,
} from "./public-budgets/month";
import {
  BUDGET_PROGRAMS,
  PUBLIC_BUDGETS_VERSION,
  type PublicBudgetStore,
} from "./public-budgets/store";
import type { World } from "./types";

// Five states selected from read programs collecting at the game's start,
// before observing any payment. Claims and funding are authored fixtures;
// program amounts and law selection use the existing readers.
const states = Object.entries(premiums.places)
  .filter(
    ([key, place]) =>
      key !== "US-DC" &&
      place.status === "read" &&
      place.contributionsBeginAt !== null &&
      place.contributionsBeginAt <= "2026-01-05",
  )
  .slice(0, 5)
  .map(([key]) => key);

describe.each(states)("saved paid-leave payment in %s", (stateKey) => {
  it("records completed, partial and blocked paid-leave payments on the state budget and survives canonical save/reopen", () => {
    const place = searchLifePlaces("", 5000, {
      stateJurisdictionKey: stateKey,
    }).find((entry) => entry.scope !== "state")!;
    const life = generateOpeningLife(
      prepareOpeningLife({
        ...DEFAULT_NEW_GAME_SETUP,
        placeKey: place.key,
        seed: `paid-leave-stamp-five:${stateKey}`,
        startAge: 30,
        questionnaire: "skipped",
      }),
    ).game!;
    let world = life.world;
    // Earn fixture funding through the canonical recorded job and paycheck.
    // Opening player cash was zero in every retained state; do not mint cash.
    const entered = enterLifePath(world, "shop-assistant");
    expect(entered.ok, entered.message).toBe(true);
    const workId = entered.world.history.workRelationships.at(-1)!.id;
    const scheduled = scheduleLifePathSession(entered.world, workId);
    expect(scheduled.ok, scheduled.message).toBe(true);
    const activityId = scheduled.world.history.scheduledActivities.at(-1)!.id;
    // Supply the completed shift to its canonical record writer, then invoke
    // the scheduled paycheck handler directly. Calendar/player choice is not
    // under test; avoid unrelated full-world day transitions.
    const worked = applyLifePathSessionCompletion(scheduled.world, activityId);
    const due = worked.history.futureDueItems.find(
      (item) =>
        item.transitionKey === "life-paths2:pay" &&
        item.entityIds.includes(workId),
    )!;
    expect(due).toBeDefined();
    const result = lifePaths2Handlers().get(due.transitionKey)!(
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
    expect(result.status).toBe("resolved");
    world = result.world;
    const state = chiefExecutiveJurisdiction(stateKey.slice(3))!;
    if (!world.jurisdictions[state.id])
      world = {
        ...world,
        jurisdictions: { ...world.jurisdictions, [state.id]: state },
        jurisdictionOrder: [...world.jurisdictionOrder, state.id],
      };
    world = ensureTaxPublicAccount(world, state.id);
    const account = world.history.organizations.find(
      (row) => row.stableKey === publicOrganizationKey(state.id),
    )!;
    const payer = { kind: "person" as const, personId: life.playerPersonId };
    const cash = resourcePositionAt(world, payer, money(0, "USD").currency)!
      .liquidBalance.minorUnits;
    const fundingMinor = Math.min(cash, 1000);
    expect(
      fundingMinor,
      `${stateKey}: fixture has actual cash`,
    ).toBeGreaterThan(0);
    world = createResourceFlow(world, {
      stableKey: `fixture:leave-fund:${stateKey}`,
      source: payer,
      recipient: { kind: "organization", organizationId: account.id },
      startsAt: world.currentDate,
      amount: money(fundingMinor, "USD"),
      cadenceKind: "custom:one-time",
      basisKind: "custom:leave-test-funding",
      basisReference: { kind: "general" },
      restrictionKind: "purpose:public-general-receipts",
      jurisdictionId: state.id,
      provenance: { kind: "authored", note: "Payment-writer fixture funding." },
    });
    const fund = world.history.resourceFlows.at(-1)!;
    world = recordResourceTransferOutcome(world, {
      stableKey: `${fund.stableKey}:transfer`,
      resourceFlowId: fund.id,
      periodStartsAt: world.currentDate,
      periodEndsAt: world.currentDate,
      occurredAt: world.currentDate,
      attemptedAmount: money(fundingMinor, "USD"),
      transferredAmount: money(fundingMinor, "USD"),
      status: "completed",
      reasonKind: null,
      note: "Authored payment-writer fixture funding.",
      provenance: fund.provenance,
    });
    const owner = { kind: "organization" as const, organizationId: account.id };
    const before = resourcePositionAt(world, owner, money(0, "USD").currency)!
      .liquidBalance.minorUnits;
    const rate = paidLeaveBenefitRate(world, stateKey, world.currentDate);
    expect(rate).not.toBeNull();
    const paid = payPaidLeaveClaims(world, [
      {
        personId: life.playerPersonId,
        stateKey,
        paycheckKey: `fixture:${stateKey}`,
        coveredDays: 1,
        caring: true,
        amountMinor: fundingMinor,
        rate: rate!,
      },
    ]);
    const payment = paid.history.resourceTransferOutcomes.at(-1)!;
    expect(payment.transferredAmount.minorUnits).toBe(fundingMinor);
    expect(
      resourcePositionAt(paid, owner, money(0, "USD").currency)!.liquidBalance
        .minorUnits,
    ).toBe(before - fundingMinor);
    const stamps = (payment as typeof payment & LawEffectStampedRecord)
      .lawEffectStamps;
    expect(stamps).toHaveLength(1);
    expect(isLawEffectStamp(stamps![0])).toBe(true);
    expect(stamps![0]).toMatchObject({
      source: "in-force-at-start",
      effectKind: "paid-leave-benefit",
      questionKey: PAID_LEAVE_QUESTION,
      jurisdictionId: state.id,
      appliedAt: paid.currentDate,
    });
    expect(stamps![0]!.sourceRecordIds).toContain(account.id);
    expect(stamps![0]!.sourceRecordIds).toContain(payment.resourceFlowId);
    const government = openGovernmentBudget(
      world,
      {
        key: stateKey,
        jurisdictionId: state.id,
        lawJurisdictionId: state.id,
        level: "state",
        name: stateKey,
        stateKey,
        geoid: null,
      },
      world.currentDate,
    );
    if (typeof government === "string") throw new Error(government);
    const empty: MonthFlows = {
      withheld: new Map(),
      represented: new Map(),
      levies: new Map(),
      payments: new Map(),
    };
    const month = makeIsoDate(`${world.currentDate.slice(0, 7)}-01`);
    const baseline = settleGovernmentMonth(
      world,
      government,
      month,
      empty,
    ).government;
    const checkBudget = (
      source: World,
      result: World,
      expectedMinor: number,
      expectedStamp = expectedMinor > 0,
    ) => {
      const store: PublicBudgetStore = {
        version: PUBLIC_BUDGETS_VERSION,
        cursor: {
          flows: source.history.resourceFlows.length,
          outcomes: source.history.resourceTransferOutcomes.length,
        },
        governments: [government],
        adjustments: [],
        unknown: [],
      };
      const reading = readMonthFlows(result, store);
      const book = settleGovernmentMonth(
        result,
        government,
        month,
        reading.flows,
      ).government;
      const row = book.months.at(-1)!;
      const prior = baseline.months.at(-1)!;
      const at = BUDGET_PROGRAMS.indexOf("otherPrograms");
      expect(row.spending[at]! - prior.spending[at]!).toBe(
        Math.round(expectedMinor / 100),
      );
      expect(row.revenue).toEqual(prior.revenue);
      expect(
        row.balance +
          row.reserve -
          row.debt -
          (prior.balance + prior.reserve - prior.debt),
      ).toBe(-Math.round(expectedMinor / 100) || 0);
      const last = result.history.resourceTransferOutcomes.at(-1)!;
      const costs = (row.lawEffectStamps ?? []).filter(
        (stamp) => stamp.effectKind === "paid-leave-budget-cost",
      );
      expect(costs).toHaveLength(expectedStamp ? 1 : 0);
      if (expectedStamp) {
        expect(isLawEffectStamp(costs[0])).toBe(true);
        expect(costs[0]!.jurisdictionId).toBe(state.id);
        expect(costs[0]!.sourceRecordIds).toContain(last.id);
        expect(costs[0]!.sourceRecordIds).toContain(last.resourceFlowId);
      }
      expect(
        settleGovernmentMonth(result, book, month, reading.flows).government,
      ).toBe(book);
      const repeated = readMonthFlows(result, {
        ...store,
        cursor: reading.cursor,
      });
      expect(repeated.flows.payments.size).toBe(0);
      expect(repeated.flows.paidLeavePaymentStamps?.size).toBe(0);
      const saved = deserializeWorld(
        serializeWorld({
          ...result,
          publicBudgets: {
            ...store,
            governments: [book],
            cursor: reading.cursor,
          },
        }),
      );
      expect(saved.publicBudgets!.governments[0]!.months.at(-1)).toEqual(row);
      mkdirSync("test-results/team-3-paid-leave-budget", { recursive: true });
      writeFileSync(
        `test-results/team-3-paid-leave-budget/${stateKey}-${last.status}-${expectedStamp}.json`,
        JSON.stringify(
          {
            stateKey,
            playerPersonId: life.playerPersonId,
            person: world.people[life.playerPersonId],
            governmentKey: government.key,
            paymentId: last.id,
            flowId: last.resourceFlowId,
            paymentStatus: last.status,
            attemptedMinor: last.attemptedAmount.minorUnits,
            transferredMinor: last.transferredAmount.minorUnits,
            actualBudgetDeltaUsd: row.spending[at]! - prior.spending[at]!,
            netBooksDeltaUsd:
              row.balance +
              row.reserve -
              row.debt -
              (prior.balance + prior.reserve - prior.debt),
            costStamps: costs,
            savedBudgetRowEqual: true,
            settlementIdempotent: true,
            limits:
              "Authored claim/completed-shift fixtures; no eligibility, watched person or nationwide proof.",
          },
          null,
          2,
        ) + "\n",
      );
    };
    checkBudget(world, paid, fundingMinor);
    const partial = payPaidLeaveClaims(world, [
      {
        personId: life.playerPersonId,
        stateKey,
        paycheckKey: `fixture:partial:${stateKey}`,
        coveredDays: 1,
        caring: true,
        amountMinor: before + 1000,
        rate: rate!,
      },
    ]);
    expect(partial.history.resourceTransferOutcomes.at(-1)!.status).toBe(
      "partial",
    );
    expect(
      partial.history.resourceTransferOutcomes.at(-1)!.transferredAmount
        .minorUnits,
    ).toBe(before);
    checkBudget(world, partial, before);
    const { lawEffectStamps: _legacyStamp, ...legacyOutcome } =
      partial.history.resourceTransferOutcomes.at(-1)! as typeof payment &
        LawEffectStampedRecord;
    expect(_legacyStamp).toHaveLength(1);
    const legacyPartial: World = {
      ...partial,
      history: {
        ...partial.history,
        resourceTransferOutcomes: [
          ...partial.history.resourceTransferOutcomes.slice(0, -1),
          legacyOutcome,
        ],
      },
    };
    checkBudget(world, legacyPartial, before, false);
    const blocked = payPaidLeaveClaims(partial, [
      {
        personId: life.playerPersonId,
        stateKey,
        paycheckKey: `fixture:blocked:${stateKey}`,
        coveredDays: 1,
        caring: true,
        amountMinor: 1000,
        rate: rate!,
      },
    ]);
    expect(blocked.history.resourceTransferOutcomes.at(-1)!.status).toBe(
      "blocked",
    );
    expect(
      blocked.history.resourceTransferOutcomes.at(-1)!.transferredAmount
        .minorUnits,
    ).toBe(0);
    checkBudget(partial, blocked, 0);
    const restored = deserializeWorld(serializeWorld(paid));
    expect(
      restored.history.resourceTransferOutcomes.find(
        (row) => row.id === payment.id,
      ),
    ).toEqual(payment);
  }, 120_000);
});
