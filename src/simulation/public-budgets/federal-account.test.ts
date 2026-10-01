import {
  createNewGameWorld,
  DEFAULT_NEW_GAME_SETUP,
} from "../../presentation/new-game";
import { observerPlace } from "../../presentation/observer-world";
import {
  enterLifePath,
  scheduleLifePathSession,
  performLifePathSession,
  LIFE_PATHS2_HANDLERS,
} from "../life-paths2";
import { FEDERAL_INCOME_TAX_KEY } from "../statutory-tax";
import { FEDERAL_EMPLOYMENT_RULES } from "../statutory-tax-rules";
import { describe, expect, it } from "vitest";
import { makeIsoDate } from "../dates";
import { createWorld, advanceWorld } from "../world";
import { stateJurisdictionForKey } from "../life-places";
import { NATIONAL_ELECTION_JURISDICTION } from "../national-election-geography";
import { STATES } from "../state-reference";
import { createOrganization } from "../life";
import {
  createResourceFlow,
  createResourcePosition,
  money,
  recordResourceTransferOutcome,
} from "../resources";
import { publicOrganizationKey } from "../tax-policy";
import { resourcePositionAt } from "../resource-queries";
import { serializeWorld, deserializeWorld } from "../serialization";
import { withOpenedBudgets, settlePublicBudgets } from "./index";
import { readMonthFlows, settleGovernmentMonth } from "./month";
import {
  FEDERAL_RECEIPTS,
  FEDERAL_OUTLAYS,
  openFederalTreasury,
  settleFederalTreasuryMonth,
} from "./federal-treasury";
import { PUBLIC_BUDGETS_VERSION, type PublicBudgetStore } from "./store";
import type { World } from "../types";

const date = makeIsoDate("2026-02-28");
const month = makeIsoDate("2026-02-01");
function account(world: World, stableKey: string) {
  let next = createOrganization(world, {
    stableKey,
    formedAt: date,
    provenance: { kind: "authored", note: "Explicit government cash fixture." },
    initialProfile: {
      name: stableKey,
      classification: "sector:government",
      locationJurisdictionId: NATIONAL_ELECTION_JURISDICTION.id,
    },
  });
  const id = next.history.organizations.at(-1)!.id;
  next = createResourcePosition(next, {
    stableKey: `${stableKey}:cash`,
    owner: { kind: "organization", organizationId: id },
    openedAt: date,
    openingBalance: money(10000, "USD"),
    provenance: {
      kind: "authored",
      note: "Explicit test cash, no forecast opening.",
    },
  });
  return { world: next, id };
}

describe("M5 federal government uses the same saved-payment settler", () => {
  it("joins a named worker's saved federal income and payroll payments to their actual account", () => {
    const seed = "m5-federal-recorded-payroll";
    const place = observerPlace(seed);
    const game = createNewGameWorld({
      ...DEFAULT_NEW_GAME_SETUP,
      seed,
      placeKey: place.key,
      startAge: 30,
      startingLife: "ordinary-life",
      household: "lives-alone",
      questionnaire: "skipped",
    });
    const entered = enterLifePath(game.world, "shop-assistant");
    expect(entered.ok, entered.message).toBe(true);
    const work = entered.world.history.workRelationships.at(-1)!;
    const scheduled = scheduleLifePathSession(entered.world, work.id);
    expect(scheduled.ok, scheduled.message).toBe(true);
    const performed = performLifePathSession(
      scheduled.world,
      scheduled.world.history.scheduledActivities.at(-1)!.id,
    );
    expect(performed.ok, performed.message).toBe(true);
    const world = advanceWorld(performed.world, 1, LIFE_PATHS2_HANDLERS);
    const month = makeIsoDate(`${world.currentDate.slice(0, 7)}-01`);
    const store = withOpenedBudgets(
      world,
      {
        version: PUBLIC_BUDGETS_VERSION,
        governments: [],
        unknown: [],
        adjustments: [],
        cursor: { flows: 0, outcomes: 0 },
      },
      month,
    );
    const read = readMonthFlows(world, store);
    const government = settleGovernmentMonth(
      world,
      store.federalGovernment!,
      month,
      read.flows,
    ).government;
    const payments = (world.history.statutoryTaxPayments ?? []).filter(
      (payment) => {
        const liability = world.history.statutoryTaxLiabilities!.find(
          (row) => row.id === payment.liabilityId,
        );
        return liability?.authorityKey === "US";
      },
    );
    expect(payments.length).toBeGreaterThan(0);
    const income = payments.filter(
      (payment) =>
        world.history.statutoryTaxLiabilities!.find(
          (row) => row.id === payment.liabilityId,
        )!.taxKey === FEDERAL_INCOME_TAX_KEY,
    );
    const payroll = payments.filter((payment) =>
      FEDERAL_EMPLOYMENT_RULES.some(
        (rule) =>
          rule.taxKey ===
          world.history.statutoryTaxLiabilities!.find(
            (row) => row.id === payment.liabilityId,
          )!.taxKey,
      ),
    );
    const row = government.months.at(-1)!;
    expect(row.revenue[FEDERAL_RECEIPTS.indexOf("individualIncomeTax")]).toBe(
      income.reduce((sum, p) => sum + p.amount.minorUnits, 0) / 100,
    );
    expect(row.revenue[FEDERAL_RECEIPTS.indexOf("payrollTaxes")]).toBe(
      payroll.reduce((sum, p) => sum + p.amount.minorUnits, 0) / 100,
    );
    for (const payment of payments) {
      expect(row.cashSettlement.sourceRecordIds).toContain(payment.id);
      expect(row.cashSettlement.sourceRecordIds).toContain(payment.liabilityId);
      expect(row.cashSettlement.sourceRecordIds).toContain(
        payment.resourceOutcomeId,
      );
      const liability = world.history.statutoryTaxLiabilities!.find(
        (row) => row.id === payment.liabilityId,
      )!;
      expect(liability.payer).toEqual({
        kind: "person",
        personId: work.personId,
      });
    }
    expect(government.balance).toBe(
      resourcePositionAt(
        world,
        {
          kind: "organization",
          organizationId: row.cashSettlement.organizationId,
        },
        money(0, "USD").currency,
      )!.liquidBalance.minorUnits / 100,
    );
    expect(
      deserializeWorld(
        serializeWorld({
          ...world,
          publicBudgets: {
            ...store,
            cursor: read.cursor,
            federalGovernment: government,
          },
        }),
      ).publicBudgets!.federalGovernment,
    ).toEqual(government);
  });

  it.each(Object.keys(STATES).map((key) => `US-${key}`))(
    "retains national cash, null state/local fields and replay safety alongside %s",
    (stateKey) => {
      const nation = NATIONAL_ELECTION_JURISDICTION;
      let world = createWorld({
        seed: `m5-federal:${stateKey}`,
        currentDate: date,
        jurisdictions: [nation, stateJurisdictionForKey(stateKey)!],
        people: [],
      });
      const empty: PublicBudgetStore = {
        version: PUBLIC_BUDGETS_VERSION,
        cursor: { flows: 0, outcomes: 0 },
        governments: [],
        adjustments: [],
        unknown: [],
        federal: openFederalTreasury(date),
      };
      const store = withOpenedBudgets(world, empty, month);
      const government = store.federalGovernment!;
      expect(government).toMatchObject({
        level: "federal",
        categorySet: "federal",
        balance: null,
        reserve: null,
        pension: null,
      });
      const noCash = readMonthFlows(world, store);
      expect(
        settleGovernmentMonth(world, government, month, noCash.flows)
          .government,
      ).toBe(government);
      const treasury = account(world, publicOrganizationKey(nation.id));
      const recipient = account(treasury.world, "m5:actual-recipient");
      world = recipient.world;
      // An explicit saved partial transfer, not an appropriation or delivered service.
      world = createResourceFlow(world, {
        stableKey: "m5:federal-payment",
        source: { kind: "organization", organizationId: treasury.id },
        recipient: { kind: "organization", organizationId: recipient.id },
        startsAt: date,
        amount: money(1000, "USD"),
        cadenceKind: "schedule:one-time",
        basisKind: "custom:fixture-payment",
        basisReference: { kind: "general" },
        restrictionKind: null,
        jurisdictionId: nation.id,
        provenance: {
          kind: "authored",
          note: "Explicit cash-only fixture; no law or service inferred.",
        },
      });
      world = recordResourceTransferOutcome(world, {
        stableKey: "m5:federal-paid",
        resourceFlowId: world.history.resourceFlows.at(-1)!.id,
        periodStartsAt: date,
        periodEndsAt: date,
        occurredAt: date,
        attemptedAmount: money(1000, "USD"),
        transferredAmount: money(325, "USD"),
        status: "partial",
        reasonKind: "capacity:insufficient-funds",
        note: "Explicit partial cash fixture.",
        provenance: { kind: "authored", note: "Saved actual payment." },
      });
      world = advanceWorld(world, 1);
      const transfer = world.history.resourceTransferOutcomes.at(-1)!;
      const flow = world.history.resourceFlows.at(-1)!;
      const before = serializeWorld(world);
      const read = readMonthFlows(world, store);
      const result = settleGovernmentMonth(
        world,
        government,
        month,
        read.flows,
      ).government;
      expect(serializeWorld(world)).toBe(before);
      expect(result.months[0]!.revenue).toEqual(FEDERAL_RECEIPTS.map(() => 0));
      expect(result.months[0]!.spending).toEqual(
        FEDERAL_OUTLAYS.map((key) => (key === "otherPrograms" ? 3.25 : 0)),
      );
      expect(result.balance).toBe(96.75);
      expect(result.debt).toBe(government.debt);
      expect(result.months[0]!.cashSettlement.sourceRecordIds).toEqual([
        flow.id,
        transfer.id,
      ]);
      expect(result.publicAccountMigration?.previousBudgetReserve).toBeNull();
      const saved = deserializeWorld(
        serializeWorld({
          ...world,
          publicBudgets: {
            ...store,
            cursor: read.cursor,
            federalGovernment: result,
          },
        }),
      );
      expect(saved.publicBudgets!.federalGovernment).toEqual(result);
      expect(
        settleGovernmentMonth(
          saved,
          result,
          month,
          readMonthFlows(saved, saved.publicBudgets!).flows,
        ).government,
      ).toBe(result);
      expect(
        resourcePositionAt(
          saved,
          { kind: "organization", organizationId: treasury.id },
          money(0, "USD").currency,
        )!.liquidBalance.minorUnits,
      ).toBe(9675);
      // Integration preserves the old forecast unchanged while the cash path is compared.
      const expectedLegacy = settleFederalTreasuryMonth(
        world,
        store.federal!,
        month,
      );
      const integrated = settlePublicBudgets(
        { ...world, publicBudgets: store },
        month,
      );
      expect(integrated.publicBudgets!.federal).toEqual(expectedLegacy);
      expect(integrated.publicBudgets!.federalGovernment).toEqual(result);
      const repeated = settlePublicBudgets(integrated, month);
      expect(repeated.publicBudgets!.federal!.months).toHaveLength(1);
      expect(repeated.publicBudgets!.federalGovernment!.months).toHaveLength(1);
      expect(repeated.publicBudgets).toEqual(integrated.publicBudgets);
      // An old save still reads the federal payment before advancing its cursor.
      const oldStore = { ...store };
      delete oldStore.federalGovernment;
      const oldSaveResult = settlePublicBudgets(
        { ...world, publicBudgets: oldStore },
        month,
      );
      expect(
        oldSaveResult.publicBudgets!.federalGovernment!.months[0]!.spending,
      ).toEqual(result.months[0]!.spending);
      expect(oldSaveResult.publicBudgets!.federalGovernment!.balance).toBe(
        result.balance,
      );
    },
  );
});
