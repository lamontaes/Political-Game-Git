import { createCampaignElectionTransitionRegistry } from "../campaigns";
import {
  introduceMeasure,
  recordEnactment,
  measurePosition,
  availableMeasureSteps,
} from "../legislation";
import {
  US_CONGRESS_PACK_ID,
  US_CONGRESS_RULE_PACK,
} from "../congress-rule-pack";
import { seatedCongressChamber } from "../governing/congress-chambers";
import { chamberByKey } from "../legislature-rules";
import {
  votePlanKeyForCommittee,
  votePlanKeyForFloor,
} from "../legislation-scenarios";
import { applyLegislativeStep } from "../../presentation/legislation-session";
import { federalProgramCostsForMonth } from "../federal-cost-ledger";
import { EXPAND_PASSENGER_RAIL_QUESTION } from "../federal-passenger-rail";
import {
  generateOpeningLife,
  prepareOpeningLife,
} from "../../presentation/opening-life";
import { addDays } from "../dates";
import { currentPresidentOf } from "../crisis/offices";
import { ensureNationalElectionJurisdiction } from "../national-election-geography";
import {
  ensurePublicGovernmentAccount,
  publicTaxAccountForJurisdiction,
} from "../tax-policy";
import {
  commitPublicProgram,
  declareProgramCapacity,
  programAppropriations,
  recordProgramAppropriation,
  programInstallments,
  settleProgramInstallment,
} from "../governing/public-program";
import { programOperatorOrganization } from "../governing/program-governing";
import { FIXTURE } from "../../../tests/fixtures/public-program-fixture";
const PROGRAM_KEY = "passenger-rail:us";
const PAYMENT = money(100_000_00, "USD");
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
  it("preserves the legacy federal paid component and authority IDs through the common cash settler", () => {
    const game = generateOpeningLife(
      prepareOpeningLife({
        ...DEFAULT_NEW_GAME_SETUP,
        seed: "federal-public-program-outlay-metric",
        startAge: 34,
        depth: "summarize-earlier-life",
      }),
    ).game;
    if (!game) throw new Error("Expected an ordinary opening life.");

    let world = ensureNationalElectionJurisdiction(game.world);
    const proposition = Object.values(world.policyCatalog.propositions).find(
      (p) => p.stableKey === EXPAND_PASSENGER_RAIL_QUESTION,
    )!;
    // Controlled legal passage, with explicitly authored test ballots.
    // This does not prove ordinary sponsor selection or voting behavior.
    world = introduceMeasure(world, {
      stableKey: "test:rail-cost:measure",
      jurisdictionId: NATIONAL_ELECTION_JURISDICTION.id,
      rulePackId: US_CONGRESS_PACK_ID,
      designation: "H.R. TEST",
      shortTitle: "Controlled rail payment authority",
      summary: "Fixture appropriation authority, not natural passage.",
      origin: "member-introduction",
      subjectClass: "general-policy",
      originChamberKey: "house",
      sponsorPersonId: null,
      propositionIds: [proposition.id],
      propositionAnswers: [{ propositionId: proposition.id, answer: "yes" }],
    });
    const measure = world.history.legislativeMeasures!.at(-1)!;
    const bodies = US_CONGRESS_RULE_PACK.chamberOrder.map((key) => {
      const seated = seatedCongressChamber(world, key);
      if (!seated) throw new Error("Expected the actual seated Congress.");
      return seated.body;
    });
    const votePlan: Record<string, { yea: number }> = {};
    for (const key of US_CONGRESS_RULE_PACK.chamberOrder) {
      const chamber = chamberByKey(US_CONGRESS_RULE_PACK, key);
      for (const committee of chamber.committees)
        votePlan[votePlanKeyForCommittee(committee.committeeKey)] = {
          yea: committee.appointedMembers ?? 1,
        };
      for (const stage of chamber.floorStages)
        votePlan[votePlanKeyForFloor(key, stage.stageKey)] = {
          yea: bodies.find((b) => b.chamberKey === key)!.members.length,
        };
    }
    const procedure = {
      pack: US_CONGRESS_RULE_PACK,
      measureId: measure.id,
      bodies,
      committeeMemberCount: null,
      votePlan,
      governorAction: "signed" as const,
      governorRationale: "Explicit controlled payment-authority fixture.",
    };
    for (
      let stepNumber = 0;
      stepNumber < 45 &&
      measurePosition(world, measure.id).phase !== "awaiting-enactment";
      stepNumber++
    ) {
      const step = availableMeasureSteps(world, measure.id).find(
        (s) => s !== "offer-amendment",
      );
      if (!step) throw new Error("No legal controlled enactment step remains.");
      world = applyLegislativeStep(procedure, world, step).world;
    }
    world = recordEnactment(world, {
      stableKey: "test:rail-cost:enactment",
      measureId: measure.id,
      effectiveAt: world.currentDate,
    });
    const president = currentPresidentOf(world);
    if (!president) throw new Error("Expected a sitting President.");
    const jurisdictionId = NATIONAL_ELECTION_JURISDICTION.id;
    const publicOrganizationId = publicOrganizationKey(jurisdictionId);
    world = createOrganization(world, {
      stableKey: publicOrganizationId,
      formedAt: world.currentDate,
      provenance: { kind: "authored", note: FIXTURE.note },
      initialProfile: {
        name: "Federal public government",
        classification: "sector:government",
        locationJurisdictionId: jurisdictionId,
      },
    });
    const publicGovernment = world.history.organizations.at(-1)!;
    world = createResourcePosition(world, {
      stableKey: `${publicOrganizationId}:modeled-receipts:USD`,
      owner: { kind: "organization", organizationId: publicGovernment.id },
      openedAt: world.currentDate,
      openingBalance: money(150_000_00, "USD"),
      provenance: { kind: "authored", note: FIXTURE.note },
    });
    world = ensurePublicGovernmentAccount(world, {
      kind: "jurisdiction",
      jurisdictionId,
    });
    const account = publicTaxAccountForJurisdiction(world, jurisdictionId);
    expect(account?.organizationId).toBe(publicGovernment.id);
    if (!account) throw new Error("Expected the federal public account.");

    world = declareProgramCapacity(world, {
      edition: "federal-outlay-metric",
      programKey: PROGRAM_KEY,
      jurisdictionId,
      serviceLabel: "Passenger rail service",
      unitLabel: "service units",
      unitsTotal: 1,
      unitsOperational: 0,
      monthlyOperatingNeed: money(1, "USD"),
      completedPermille: null,
      restorationCostPerUnit: PAYMENT,
      basis: FIXTURE,
    }).world;
    const written = recordProgramAppropriation(world, {
      edition: "federal-outlay-metric",
      programKey: PROGRAM_KEY,
      jurisdictionId,
      accountOrganizationId: account.organizationId,
      amount: money(150_000_00, "USD"),
      sourceMeasureId: measure.id,
      availableFrom: world.currentDate,
      availableThrough: addDays(world.currentDate, 30),
      basis: FIXTURE,
    });
    world = written.world;
    const appropriation = programAppropriations(world, PROGRAM_KEY).find(
      (record) => record.id === written.id,
    );
    if (!appropriation)
      throw new Error("The federal appropriation is missing.");

    const operator = programOperatorOrganization(
      world,
      PROGRAM_KEY,
      jurisdictionId,
    );
    world = operator.world;
    const dueAt = addDays(world.currentDate, 1);
    const committed = commitPublicProgram(world, {
      appropriationId: appropriation.id,
      alternative: {
        key: "federal-one-day-outlay-proof",
        title: "One federal service payment",
        installments: [
          { afterDays: 1, amount: PAYMENT, purpose: "maintenance" },
        ],
        deliveryLeadDays: 1,
      },
      personId: president.personId,
      office: { kind: "federal-executive" },
      recipientOrganizationId: operator.organizationId,
    });
    expect(committed.ok).toBe(true);
    if (!committed.ok) throw new Error(committed.reason);

    const beforePayment = committed.world;
    const month = makeIsoDate(`${dueAt.slice(0, 7)}-01`);
    const opened = openFederalTreasury(month);
    const unpaid = settleFederalTreasuryMonth(
      beforePayment,
      opened,
      month,
    ).months.at(-1)!;
    expect(federalProgramCostsForMonth(beforePayment, month)).toEqual([]);
    world = advanceWorld(
      beforePayment,
      1,
      createCampaignElectionTransitionRegistry(),
    );
    const installment = programInstallments(world, PROGRAM_KEY).find(
      (record) => record.commitmentId === committed.recordId,
    );
    expect(installment).toMatchObject({ status: "posted", recordedAt: dueAt });
    if (!installment) throw new Error("The federal payment did not post.");

    const empty: PublicBudgetStore = {
      version: PUBLIC_BUDGETS_VERSION,
      cursor: {
        flows: beforePayment.history.resourceFlows.length,
        outcomes: beforePayment.history.resourceTransferOutcomes.length,
      },
      governments: [],
      unknown: [],
      adjustments: [],
      federal: opened,
    };
    const store = withOpenedBudgets(beforePayment, empty, month);
    const paid = settleFederalTreasuryMonth(world, opened, month).months.at(
      -1,
    )!;
    const read = readMonthFlows(world, store);
    const cashGovernment = settleGovernmentMonth(
      world,
      store.federalGovernment!,
      month,
      read.flows,
    ).government;
    const row = cashGovernment.months.at(-1)!;
    const costs = federalProgramCostsForMonth(world, month);
    expect(costs).toHaveLength(1);
    const transportation = FEDERAL_OUTLAYS.indexOf("transportation");
    // Retain the actual paid component, rather than treating the old forecast
    // or its automatic deficit borrowing as a resource transaction.
    expect(row.spending[transportation]).toBe(
      paid.outlays[transportation]! - unpaid.outlays[transportation]!,
    );
    expect(row.spending[transportation]).toBe(PAYMENT.minorUnits / 100);
    expect(cashGovernment.debt).toBe(store.federalGovernment!.debt);
    expect(row.cashSettlement.sourceRecordIds).toEqual(
      expect.arrayContaining([...costs[0]!.sourceRecordIds]),
    );
    expect(row.lawEffectStamps).toEqual(costs[0]!.lawEffectStamps);
    expect(cashGovernment.balance).toBe(
      resourcePositionAt(
        world,
        { kind: "organization", organizationId: publicGovernment.id },
        money(0, "USD").currency,
      )!.liquidBalance.minorUnits / 100,
    );
    const saved = deserializeWorld(
      serializeWorld({
        ...world,
        publicBudgets: {
          ...store,
          cursor: read.cursor,
          federalGovernment: cashGovernment,
        },
      }),
    );
    expect(saved.publicBudgets!.federalGovernment).toEqual(cashGovernment);
    const repeatedPayment = settleProgramInstallment(
      saved,
      committed.recordId,
      0,
    ).world;
    expect(repeatedPayment.history.resourceTransferOutcomes).toEqual(
      saved.history.resourceTransferOutcomes,
    );
    expect(
      settleGovernmentMonth(
        repeatedPayment,
        cashGovernment,
        month,
        readMonthFlows(repeatedPayment, repeatedPayment.publicBudgets!).flows,
      ).government,
    ).toBe(cashGovernment);
  });

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
