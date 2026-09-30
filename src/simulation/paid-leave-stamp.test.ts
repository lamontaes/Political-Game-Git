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
import { simulationMomentOnLocalDate } from "./dates";
import { searchLifePlaces } from "./life-places";
import {
  enterLifePath,
  scheduleLifePathSession,
  applyLifePathSessionCompletion,
  LIFE_PATHS2_HANDLERS,
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
  it("debits the actual state account, stamps the transfer, and survives canonical save/reopen", () => {
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
    const result = LIFE_PATHS2_HANDLERS.get(due.transitionKey)!(
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
    const restored = deserializeWorld(serializeWorld(paid));
    expect(
      restored.history.resourceTransferOutcomes.find(
        (row) => row.id === payment.id,
      ),
    ).toEqual(payment);
  }, 120_000);
});
