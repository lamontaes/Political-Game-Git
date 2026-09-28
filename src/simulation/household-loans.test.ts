import { describe, expect, it } from "vitest";
import {
  createNewGameWorld,
  DEFAULT_NEW_GAME_SETUP,
} from "../presentation/new-game";
import type { NewGameSetup } from "../presentation/new-game";
import { createCampaignElectionTransitionRegistry } from "./campaigns";
import { addDays } from "./dates";
import {
  debtStandingAt,
  householdLoanTotals,
  householdLoansOf,
  openHouseholdLoan,
  reviseLoanTerms,
  type OpenHouseholdLoanInput,
} from "./household-loans";
import { outstandingDebtAt, resourcePositionAt } from "./resource-queries";
import { createResourcePosition, money } from "./resources";
import { deserializeWorld, serializeWorld } from "./serialization";
import { advanceWorld, assertWorldIntegrity } from "./world";
import type { EntityId, World } from "./types";

const REGISTRY = createCampaignElectionTransitionRegistry();
const COLUMBUS = "3918000";

/** A new life whose money is tracked, opening with `openingMinor` cents. */
function newLife(seed: string, openingMinor = 500_000) {
  const created = createNewGameWorld({
    ...DEFAULT_NEW_GAME_SETUP,
    startAge: 35,
    placeKey: COLUMBUS,
    startingLife: "ordinary-life",
    household: "lives-alone",
    questionnaire: "skipped",
    priors: [],
    seed,
  } as NewGameSetup);
  const personId = created.playerPersonId;
  const existing = resourcePositionAt(
    created.world,
    { kind: "person", personId },
    "USD",
  );
  const world = existing
    ? created.world
    : createResourcePosition(created.world, {
        stableKey: `test-cash:${seed}`,
        owner: { kind: "person", personId },
        openedAt: created.world.currentDate,
        openingBalance: money(openingMinor, "USD"),
        provenance: { kind: "authored", note: "Test money." },
      });
  return { world, personId };
}

const cash = (world: World, personId: EntityId) =>
  resourcePositionAt(world, { kind: "person", personId }, "USD")?.liquidBalance
    .minorUnits ?? null;

/** Test inputs only: the loan's rate and terms are what a caller supplies. */
function loan(
  world: World,
  personId: EntityId,
  overrides: Partial<OpenHouseholdLoanInput> = {},
): OpenHouseholdLoanInput {
  return {
    stableKey: `test-loan:${overrides.kind ?? "personal"}:${world.currentDate}`,
    borrower: { kind: "person", personId },
    lenderOrganizationId: null,
    lenderKind: "bank",
    kind: "personal",
    principal: money(120_000, "USD"),
    marketAnnualRateBasisPoints: 1_200,
    rateCap: null,
    repayment: { kind: "installment", termMonths: 12 },
    lateFee: money(3_000, "USD"),
    missedPaymentsToDefault: 3,
    missedPaymentsToCollections: 6,
    jurisdictionId: Object.keys(world.jurisdictions)[0]! as EntityId,
    housingTenureId: null,
    provenance: { kind: "authored", note: "A loan written by the test." },
    ...overrides,
  };
}

/** Advances to just past the next `months` firsts of the month. */
function advanceMonths(world: World, months: number): World {
  let next = world;
  for (let month = 0; month < months; month += 1) {
    const [year, m] = next.currentDate.split("-").map(Number) as [
      number,
      number,
    ];
    const first =
      m === 12
        ? `${year + 1}-01-01`
        : `${year}-${String(m + 1).padStart(2, "0")}-01`;
    let days = 0;
    while (addDays(next.currentDate, days) < first) days += 1;
    next = advanceWorld(next, days, REGISTRY);
  }
  return next;
}

describe("a household loan", () => {
  it("charges interest, takes the level payment monthly and is paid off in its term", () => {
    const start = newLife("household-loan-paid");
    const before = cash(start.world, start.personId);
    expect(before).not.toBeNull();
    const opened = openHouseholdLoan(
      start.world,
      loan(start.world, start.personId),
    );
    const [reading] = householdLoansOf(opened, {
      kind: "person",
      personId: start.personId,
    });
    // $1,200 at 12% over 12 months is $106.62 a month.
    expect(reading!.monthlyPayment!.minorUnits).toBe(10_662);
    expect(reading!.balance!.minorUnits).toBe(120_000);

    const oneMonth = advanceMonths(opened, 1);
    const obligationId = reading!.obligation.id;
    // First month: $12.00 interest on $1,200, then $106.62 paid.
    expect(outstandingDebtAt(oneMonth, obligationId)!.minorUnits).toBe(
      120_000 + 1_200 - 10_662,
    );
    expect(debtStandingAt(oneMonth, obligationId)!.standing).toBe("current");

    const year = advanceMonths(oneMonth, 11);
    expect(outstandingDebtAt(year, obligationId)!.minorUnits).toBe(0);
    expect(debtStandingAt(year, obligationId)!.standing).toBe("paid-off");
    const totals = householdLoanTotals(year);
    expect(totals.byStanding["paid-off"]).toBe(1);
    expect(totals.lateFeesMinor).toBe(0);
    // Everything paid is the principal plus the interest charged.
    expect(totals.paymentsMinor).toBe(120_000 + totals.interestChargedMinor);
    assertWorldIntegrity(year);

    const reloaded = deserializeWorld(serializeWorld(year));
    expect(householdLoanTotals(reloaded)).toEqual(totals);
  }, 120_000);

  it("goes late, then into default, then to collections when payments are missed", () => {
    // No money at all: every payment is missed.
    const start = newLife("household-loan-missed", 0);
    expect(cash(start.world, start.personId)).toBe(0);
    const opened = openHouseholdLoan(
      start.world,
      loan(start.world, start.personId, {
        principal: money(10_000_000, "USD"),
        repayment: { kind: "installment", termMonths: 12 },
      }),
    );
    const obligationId = opened.history.resourceObligations.at(-1)!.id;
    const after = (months: number) => advanceMonths(opened, months);
    const standings = [1, 3, 6].map((months) =>
      debtStandingAt(after(months), obligationId)!,
    );
    expect(standings.map((row) => row.standing)).toEqual([
      "late",
      "default",
      "collections",
    ]);
    const six = after(6);
    const totals = householdLoanTotals(six);
    // A $30 late fee for each of the six missed months.
    expect(totals.lateFeesMinor).toBe(6 * 3_000);
    assertWorldIntegrity(six);
  }, 120_000);

  it("holds a new loan's rate at a cap in force, and a later cap revision changes the payment", () => {
    const start = newLife("household-loan-capped");
    const measureId = "measure:test-cap" as EntityId;
    const opened = openHouseholdLoan(
      start.world,
      loan(start.world, start.personId, {
        kind: "payday",
        lenderKind: "payday-lender",
        principal: money(40_000, "USD"),
        marketAnnualRateBasisPoints: 39_100,
        rateCap: { capBasisPoints: 3_600, measureId },
        repayment: { kind: "installment", termMonths: 6 },
      }),
    );
    const [reading] = householdLoansOf(opened, {
      kind: "person",
      personId: start.personId,
    });
    expect(reading!.terms.annualRateBasisPoints).toBe(3_600);
    expect(reading!.terms.rateBasis).toBe("capped");
    expect(reading!.terms.rateCapMeasureId).toBe(measureId);

    const uncapped = openHouseholdLoan(
      start.world,
      loan(start.world, start.personId, {
        kind: "payday",
        lenderKind: "payday-lender",
        principal: money(40_000, "USD"),
        marketAnnualRateBasisPoints: 39_100,
        repayment: { kind: "installment", termMonths: 6 },
      }),
    );
    const [open] = householdLoansOf(uncapped, {
      kind: "person",
      personId: start.personId,
    });
    expect(open!.terms.annualRateBasisPoints).toBe(39_100);
    expect(open!.monthlyPayment!.minorUnits).toBeGreaterThan(
      reading!.monthlyPayment!.minorUnits,
    );

    const oneMonth = advanceMonths(uncapped, 1);
    const revised = reviseLoanTerms(
      oneMonth,
      open!.obligation.id,
      {
        annualRateBasisPoints: 3_600,
        rateBasis: "capped",
        rateCapMeasureId: measureId,
      },
      "test-loan:cap-applies",
      { kind: "authored", note: "A cap law reaches this loan." },
    );
    const twoMonths = advanceMonths(revised, 1);
    const payments = twoMonths.history.resourceTransferOutcomes.filter(
      (row) =>
        row.resourceFlowId ===
        twoMonths.history.resourceObligations.find(
          (debt) => debt.id === open!.obligation.id,
        )!.resourceFlowId,
    );
    expect(payments).toHaveLength(2);
    expect(payments[1]!.attemptedAmount.minorUnits).toBeLessThan(
      payments[0]!.attemptedAmount.minorUnits,
    );
    assertWorldIntegrity(twoMonths);
  }, 120_000);

  it("records a payment as blocked, not missed, when the borrower's money is untracked", () => {
    const start = newLife("household-loan-untracked");
    const householdId = start.world.history.households[0]!.id;
    const opened = openHouseholdLoan(start.world, {
      ...loan(start.world, start.personId),
      borrower: { kind: "household", householdId },
    });
    const obligationId = opened.history.resourceObligations.at(-1)!.id;
    const later = advanceMonths(opened, 2);
    const outcomes = later.history.resourceTransferOutcomes.filter(
      (row) =>
        row.resourceFlowId ===
        later.history.resourceObligations.find(
          (debt) => debt.id === obligationId,
        )!.resourceFlowId,
    );
    expect(outcomes.map((row) => row.status)).toEqual(["blocked", "blocked"]);
    expect(debtStandingAt(later, obligationId)!.standing).toBe("current");
    // Interest still accrues under the contract.
    expect(outstandingDebtAt(later, obligationId)!.minorUnits).toBeGreaterThan(
      120_000,
    );
  }, 120_000);
});
