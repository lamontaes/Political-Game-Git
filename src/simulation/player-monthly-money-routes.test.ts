import { beforeAll, describe, expect, it } from "vitest";
import { smallWorld } from "../../tests/fixtures/small-world";
import { drawRandomPlace } from "../../tests/support/random-place";
import { passOrdinaryDays } from "../presentation/ordinary-life";
import { submitTimeCommand } from "../presentation/time-command";
import {
  createOrganization,
  createWorkRelationship,
  createHousehold,
  recordHouseholdLocation,
  recordHouseholdMembershipState,
  startHouseholdMembership,
  recordWorkStatus,
} from "./life";
import { householdMembershipsAt } from "./life-queries";
import {
  initializeOfficeSalaryFlows,
  settleOfficeSalaries,
} from "./office-salary";
import {
  initializeLivingCostsFlow,
  livingCostsFlowFor,
  settleLivingCosts,
} from "./cost-of-living";
import {
  buyHome,
  homePurchaseReason,
  MORTGAGE_BASIS,
  settleMortgages,
} from "./home-purchase";
import {
  createResourcePosition,
  createResourceFlow,
  recordResourceTransferOutcome,
  recordResourceFlowTerms,
  money,
} from "./resources";
import {
  outstandingDebtAt,
  resourceFlowTermsAt,
  resourcePositionAt,
} from "./resource-queries";
import {
  ensurePlayerMonthlyMoneySchedule,
  PLAYER_MONTHLY_MONEY_KEY,
  playerMoneySchedule,
} from "./player-monthly-money";
import { composeWorldTimeHandlers } from "./campaigns";
import { advanceWorld } from "./world";
import { addDays, daysBetween } from "./dates";
import { deserializeWorld, serializeWorld } from "./serialization";
import type { EntityId, IsoDate, World } from "./types";

let starting: World;
let playerId: EntityId;
let first: IsoDate;
let mortgageId: EntityId;
let livingId: EntityId;
let salaryId: EntityId;

beforeAll(() => {
  const seed = "c9-monthly-money-routes";
  const place = drawRandomPlace(seed);
  console.info(
    `Player bill route: seed=${seed}, place=${place.displayName} (${place.key})`,
  );
  const fixture = smallWorld({
    seed,
    place: place.key,
    people: 3,
  });
  playerId = fixture.personId;
  const provenance = {
    kind: "authored" as const,
    note: "Recorded funded mortgage route fixture.",
  };
  const tracked = createResourcePosition(fixture.world, {
    stableKey: "c9:buyer-opening-cash",
    owner: { kind: "person", personId: playerId },
    openedAt: fixture.world.currentDate,
    openingBalance: money(0, "USD"),
    provenance,
  });
  let world = createHousehold(tracked, {
    stableKey: "c9:buyer-household",
    formedAt: fixture.world.currentDate,
    label: "Fixture buyer's independent household",
    provenance,
  });
  const buyingHouseholdId = world.history.households.at(-1)!.id;
  world = recordHouseholdLocation(world, {
    stableKey: "c9:buyer-household:location",
    householdId: buyingHouseholdId,
    effectiveAt: world.currentDate,
    jurisdictionId: world.people[playerId]!.homeJurisdictionId!,
    label: fixture.place.displayName,
    kind: "residence:home",
    provenance,
    supersedesLocationId: null,
  });
  for (const entry of householdMembershipsAt(world, playerId)) {
    if (entry.state.residenceRole !== "primary") continue;
    world = recordHouseholdMembershipState(world, {
      stableKey: `c9:left-household:${entry.membership.id}`,
      membershipId: entry.membership.id,
      effectiveAt: world.currentDate,
      status: "ended",
      residenceRole: entry.state.residenceRole,
      kind: entry.state.kind,
      provenance,
      supersedesStateId: entry.state.id,
    });
  }
  world = startHouseholdMembership(world, {
    stableKey: "c9:buyer-household:member",
    personId: playerId,
    householdId: buyingHouseholdId,
    startedAt: world.currentDate,
    residenceRole: "primary",
    kind: "resident:member",
    provenance,
  });
  world = createOrganization(world, {
    stableKey: "c9:funding-source",
    formedAt: fixture.world.currentDate,
    provenance,
    initialProfile: {
      name: "Fixture funding source",
      classification: "custom:fixture",
      locationJurisdictionId: null,
    },
  });
  const organizationId = world.history.organizations.at(-1)!.id;
  const funding = money(100_000_000, "USD");
  world = createResourcePosition(world, {
    stableKey: "c9:source-cash",
    owner: { kind: "organization", organizationId },
    openedAt: world.currentDate,
    openingBalance: funding,
    provenance,
  });
  world = createResourceFlow(world, {
    stableKey: "c9:buyer-funding",
    source: { kind: "organization", organizationId },
    recipient: { kind: "person", personId: playerId },
    startsAt: world.currentDate,
    amount: funding,
    cadenceKind: "schedule:one-time",
    basisKind: "custom:fixture-funding",
    basisReference: { kind: "general" },
    restrictionKind: null,
    jurisdictionId: null,
    provenance,
  });
  world = recordResourceTransferOutcome(world, {
    stableKey: "c9:buyer-funded",
    resourceFlowId: world.history.resourceFlows.at(-1)!.id,
    periodStartsAt: world.currentDate,
    periodEndsAt: world.currentDate,
    occurredAt: world.currentDate,
    status: "completed",
    attemptedAmount: funding,
    transferredAmount: funding,
    reasonKind: null,
    note: "Actual recorded transfer to the existing player USD position.",
    provenance,
  });
  expect(
    world.history.resourcePositions.filter(
      (position) =>
        position.owner.kind === "person" &&
        position.owner.personId === playerId &&
        position.openingBalance.currency === funding.currency,
    ),
  ).toHaveLength(1);
  // Household bills consume household cash, while the mortgage consumes the
  // buyer's personal cash. Record a transfer rather than duplicate funds.
  world = createResourcePosition(world, {
    stableKey: "c9:household-opening-cash",
    owner: { kind: "household", householdId: buyingHouseholdId },
    openedAt: world.currentDate,
    openingBalance: money(0, "USD"),
    provenance,
  });
  const householdFunding = money(funding.minorUnits / 2, funding.currency);
  world = createResourceFlow(world, {
    stableKey: "c9:household-funding",
    source: { kind: "person", personId: playerId },
    recipient: { kind: "household", householdId: buyingHouseholdId },
    startsAt: world.currentDate,
    amount: householdFunding,
    cadenceKind: "schedule:one-time",
    basisKind: "custom:fixture-funding",
    basisReference: { kind: "general" },
    restrictionKind: null,
    jurisdictionId: null,
    provenance,
  });
  world = recordResourceTransferOutcome(world, {
    stableKey: "c9:household-funded",
    resourceFlowId: world.history.resourceFlows.at(-1)!.id,
    periodStartsAt: world.currentDate,
    periodEndsAt: world.currentDate,
    occurredAt: world.currentDate,
    status: "completed",
    attemptedAmount: householdFunding,
    transferredAmount: householdFunding,
    reasonKind: null,
    note: "Transfer half the existing fixture funding to household cash.",
    provenance,
  });
  expect(homePurchaseReason(world, playerId)).toBeNull();
  const purchase = buyHome(world, playerId);
  expect(purchase.status).toBe("bought");
  world = createOrganization(purchase.world, {
    stableKey: "c9:office-employer",
    formedAt: world.currentDate,
    provenance: { kind: "authored", note: "Recorded paid-office fixture." },
    initialProfile: {
      name: "Fixture congressional office",
      classification: "sector:government",
      locationJurisdictionId: null,
    },
  });
  world = createWorkRelationship(world, {
    stableKey: "c9:office-work",
    personId: playerId,
    organizationId: world.history.organizations.at(-1)!.id,
    startedAt: world.currentDate,
    kind: "employment:congress-member",
    compensation: "paid",
    authority: "directed",
    dependency: "partly-dependent",
    economicRisk: "organization-borne",
    provenance: { kind: "authored", note: "Recorded paid-office fixture." },
    initialRole: {
      title: "Member of Congress",
      occupationClassification: null,
      locationJurisdictionId: null,
      timeDemand: {
        expectedWeekly: { minimumHours: 40, maximumHours: 60 },
        attention: "high",
        concurrency: "partly-concurrent",
        scheduleRigidity: "mixed",
        interruptibility: "limited",
        locationJurisdictionId: null,
      },
    },
  });
  const workId = world.history.workRelationships.at(-1)!.id;
  world = initializeOfficeSalaryFlows(world, playerId);
  world = initializeLivingCostsFlow(world, playerId);
  world = ensurePlayerMonthlyMoneySchedule(world, playerId);
  const mortgages = world.history.resourceFlows.filter(
    (flow) =>
      flow.basisKind === MORTGAGE_BASIS &&
      flow.source.kind === "person" &&
      flow.source.personId === playerId,
  );
  expect(mortgages).toHaveLength(1);
  mortgageId = mortgages[0]!.id;
  livingId = livingCostsFlowFor(world, playerId)!.id;
  salaryId = world.history.resourceFlows.find(
    (flow) => flow.stableKey === `office-salary:${workId}`,
  )!.id;
  first = world.history.futureDueItems.find(
    (item) =>
      item.transitionKey === PLAYER_MONTHLY_MONEY_KEY &&
      item.dueAt > world.currentDate,
  )!.dueAt;
  const weekBefore = addDays(first, -7);
  starting = advanceWorld(
    world,
    daysBetween(world.currentDate, weekBefore),
    composeWorldTimeHandlers(),
  );
  expect(starting.currentDate).toBe(weekBefore);
  expect(payments(starting)).toHaveLength(0);
}, 30_000);

function payments(world: World) {
  return world.history.resourceTransferOutcomes.filter((outcome) =>
    [mortgageId, livingId, salaryId].includes(outcome.resourceFlowId),
  );
}

function moneyResult(world: World) {
  return payments(world).map((outcome) => ({
    flow: outcome.resourceFlowId,
    periodStartsAt: outcome.periodStartsAt,
    periodEndsAt: outcome.periodEndsAt,
    occurredAt: outcome.occurredAt,
    status: outcome.status,
    amount: outcome.transferredAmount,
  }));
}

describe("player money on the first through existing time controls", () => {
  it.todo(
    "Individual household bills settle on their saved contractual due dates",
  );
  it.todo(
    "The player's what's-next screen displays the recorded bill schedule",
  );
  it("settles the next recorded monthly period once after Continue, with no early bill", () => {
    const paid = passOrdinaryDays(starting, 7);
    const nextDue = playerMoneySchedule(paid, playerId)[0]!.dueAt;
    const continued = deserializeWorld(serializeWorld(paid));
    const beforeDue = passOrdinaryDays(
      continued,
      daysBetween(first, nextDue) - 1,
    );
    const billPayments = (world: World) =>
      payments(world).filter((row) =>
        [mortgageId, livingId].includes(row.resourceFlowId),
      );
    expect(billPayments(beforeDue)).toHaveLength(2);
    const next = passOrdinaryDays(beforeDue, 1);
    expect(next.currentDate).toBe(nextDue);
    const bills = billPayments(next);
    expect(bills).toHaveLength(4);
    for (const flowId of [mortgageId, livingId]) {
      expect(
        bills
          .filter((row) => row.resourceFlowId === flowId)
          .map((row) => row.periodStartsAt),
      ).toEqual([first, nextDue]);
    }
    const reloaded = deserializeWorld(serializeWorld(next));
    expect(
      serializeWorld(
        settleLivingCosts(
          settleMortgages(settleOfficeSalaries(reloaded, playerId), playerId),
          playerId,
        ),
      ),
    ).toBe(serializeWorld(reloaded));
    expect(playerMoneySchedule(reloaded, playerId)[0]!.dueAt > nextDue).toBe(
      true,
    );
  }, 60_000);

  it("removes a paid-off mortgage from upcoming bills and does not charge it again", () => {
    const obligation = starting.history.resourceObligations.find(
      (row) => row.resourceFlowId === mortgageId,
    )!;
    const debt = outstandingDebtAt(starting, obligation.id)!;
    const terms = resourceFlowTermsAt(starting, mortgageId)!;
    const payoff = recordResourceFlowTerms(starting, {
      stableKey: "c9:mortgage-payoff-terms",
      resourceFlowId: mortgageId,
      effectiveAt: starting.currentDate,
      status: "active",
      amount: debt,
      cadenceKind: terms.cadenceKind,
      reason: "Recorded early payoff agreement.",
      provenance: {
        kind: "authored",
        note: "Paid-off mortgage route fixture.",
      },
      supersedesTermsId: terms.id,
    });
    const world = recordResourceTransferOutcome(payoff, {
      stableKey: "c9:mortgage-paid-off",
      resourceFlowId: mortgageId,
      periodStartsAt: starting.currentDate,
      periodEndsAt: starting.currentDate,
      occurredAt: starting.currentDate,
      status: "completed",
      attemptedAmount: debt,
      transferredAmount: debt,
      reasonKind: null,
      note: "Recorded early mortgage payoff from the player's account.",
      provenance: {
        kind: "authored",
        note: "Paid-off mortgage route fixture.",
      },
    });
    const before = serializeWorld(world);
    expect(
      playerMoneySchedule(world, playerId)[0]!.bills.map((bill) => bill.flowId),
    ).toEqual([livingId]);
    expect(serializeWorld(world)).toBe(before);
    const paid = passOrdinaryDays(deserializeWorld(before), 7);
    expect(
      payments(paid).filter((row) => row.resourceFlowId === mortgageId),
    ).toHaveLength(1);
    expect(outstandingDebtAt(paid, obligation.id)!.minorUnits).toBe(0);
    expect(
      playerMoneySchedule(paid, playerId)[0]!.bills.map((bill) => bill.flowId),
    ).toEqual([livingId]);
  }, 60_000);

  it("records unfunded bills as missed once and schedules the next review", () => {
    let world = settleOfficeSalaries(starting, playerId);
    const salary = world.history.resourceFlows.find(
      (row) => row.id === salaryId,
    )!;
    expect(salary.basisReference.kind).toBe("work");
    if (salary.basisReference.kind !== "work")
      throw new Error("Expected office work");
    const workId = salary.basisReference.workRelationshipId;
    const status = world.history.workStatuses
      .filter((row) => row.workRelationshipId === workId)
      .at(-1)!;
    const provenance = {
      kind: "authored" as const,
      note: "Recorded unfunded-bill route fixture.",
    };
    world = recordWorkStatus(world, {
      stableKey: "c9:office-ended-before-bills",
      workRelationshipId: workId,
      effectiveAt: world.currentDate,
      status: "ended",
      reason: "Office work ended before the bill date.",
      provenance,
      supersedesStatusId: status.id,
    });
    const available = resourcePositionAt(
      world,
      { kind: "person", personId: playerId },
      money(0, "USD").currency,
    )!.liquidBalance;
    world = createResourceFlow(world, {
      stableKey: "c9:spent-savings",
      source: { kind: "person", personId: playerId },
      recipient: salary.source,
      startsAt: world.currentDate,
      amount: available,
      cadenceKind: "schedule:one-time",
      basisKind: "custom:fixture-expense",
      basisReference: { kind: "general" },
      restrictionKind: null,
      jurisdictionId: null,
      provenance,
    });
    world = recordResourceTransferOutcome(world, {
      stableKey: "c9:savings-spent",
      resourceFlowId: world.history.resourceFlows.at(-1)!.id,
      periodStartsAt: world.currentDate,
      periodEndsAt: world.currentDate,
      occurredAt: world.currentDate,
      status: "completed",
      attemptedAmount: available,
      transferredAmount: available,
      reasonKind: null,
      note: "Recorded expense exhausts available savings before bills are due.",
      provenance,
    });
    const due = passOrdinaryDays(deserializeWorld(serializeWorld(world)), 7);
    const bills = payments(due).filter((row) =>
      [mortgageId, livingId].includes(row.resourceFlowId),
    );
    expect(bills).toHaveLength(2);
    expect(bills.map((row) => row.status)).toEqual(["missed", "missed"]);
    expect(bills.every((row) => row.transferredAmount.minorUnits === 0)).toBe(
      true,
    );
    expect(playerMoneySchedule(due, playerId)[0]!.dueAt > first).toBe(true);
    expect(
      serializeWorld(
        settleLivingCosts(settleMortgages(due, playerId), playerId),
      ),
    ).toBe(serializeWorld(due));
  }, 60_000);

  it("reads upcoming recorded bills without spending money or time, then debits the player's single account once", () => {
    const before = serializeWorld(starting);
    const schedule = playerMoneySchedule(starting, playerId);
    expect(serializeWorld(starting)).toBe(before);
    expect(schedule).toHaveLength(1);
    expect(schedule[0]!.dueAt).toBe(first);
    expect(schedule[0]!.bills.map((bill) => bill.flowId)).toEqual([
      mortgageId,
      livingId,
    ]);
    expect(schedule[0]!.bills.every((bill) => bill.amount.minorUnits > 0)).toBe(
      true,
    );
    expect(playerMoneySchedule(deserializeWorld(before), playerId)).toEqual(
      schedule,
    );
    const owner = { kind: "person" as const, personId: playerId };
    const currency = money(0, "USD").currency;
    const opening = resourcePositionAt(starting, owner, currency)!.liquidBalance
      .minorUnits;
    const paid = passOrdinaryDays(starting, 7);
    const closing = resourcePositionAt(paid, owner, currency)!.liquidBalance
      .minorUnits;
    const bills = payments(paid).filter(
      (row) => row.resourceFlowId !== salaryId,
    );
    expect(bills).toHaveLength(2);
    expect(bills.every((row) => row.status === "completed")).toBe(true);
    let otherNet = 0;
    for (const outcome of paid.history.resourceTransferOutcomes.slice(
      starting.history.resourceTransferOutcomes.length,
    )) {
      if ([mortgageId, livingId].includes(outcome.resourceFlowId)) continue;
      const flow = paid.history.resourceFlows.find(
        (row) => row.id === outcome.resourceFlowId,
      )!;
      if (flow.source.kind === "person" && flow.source.personId === playerId)
        otherNet -= outcome.transferredAmount.minorUnits;
      if (
        flow.recipient.kind === "person" &&
        flow.recipient.personId === playerId
      )
        otherNet += outcome.transferredAmount.minorUnits;
    }
    const charged = bills.reduce(
      (sum, row) => sum + row.transferredAmount.minorUnits,
      0,
    );
    expect(closing).toBe(opening + otherNet - charged);
    expect(playerMoneySchedule(paid, playerId)[0]!.dueAt > first).toBe(true);
    expect(
      serializeWorld(
        settleLivingCosts(settleMortgages(paid, playerId), playerId),
      ),
    ).toBe(serializeWorld(paid));
  }, 60_000);

  it("Day, Week and days command settle the same actual mortgage, living costs and salary periods, including after reload", () => {
    let days = starting;
    for (let day = 0; day < 7; day++) {
      days = passOrdinaryDays(days, 1);
      if (day < 6) expect(payments(days)).toHaveLength(0);
    }
    const week = passOrdinaryDays(starting, 7);
    const command = submitTimeCommand(
      starting,
      {
        requestId: "c9:days-seven",
        personId: playerId,
        sourceMoment: starting.currentMoment,
        command: { kind: "days", days: 7 },
      },
      () => 0,
    );
    expect(command.receipt.status).toBe("accepted");
    const reopened = passOrdinaryDays(
      deserializeWorld(serializeWorld(starting)),
      7,
    );
    for (const world of [days, week, command.world, reopened]) {
      expect(world.currentDate).toBe(first);
      expect(moneyResult(world)).toEqual(moneyResult(days));
      for (const flowId of [mortgageId, livingId]) {
        const charges = payments(world).filter(
          (outcome) => outcome.resourceFlowId === flowId,
        );
        expect(charges).toHaveLength(1);
        expect(charges[0]!.occurredAt).toBe(first);
        expect(charges[0]!.status).toBe("completed");
        expect(charges[0]!.transferredAmount.minorUnits).toBeGreaterThan(0);
      }
      const flow = world.history.resourceFlows.find(
        (row) => row.id === salaryId,
      )!;
      const weeksDue = Math.floor(daysBetween(flow.startsAt, first) / 7);
      expect(weeksDue).toBeGreaterThan(0);
      expect(
        payments(world).filter(
          (outcome) => outcome.resourceFlowId === salaryId,
        ),
      ).toHaveLength(weeksDue);
      expect(resourceFlowTermsAt(world, salaryId)!.cadenceKind).toBe(
        "schedule:weekly",
      );
      const settled = settleLivingCosts(
        settleMortgages(settleOfficeSalaries(world, playerId), playerId),
        playerId,
      );
      expect(serializeWorld(settled)).toBe(serializeWorld(world));
      const loaded = deserializeWorld(serializeWorld(world));
      expect(
        serializeWorld(ensurePlayerMonthlyMoneySchedule(loaded, playerId)),
      ).toBe(serializeWorld(loaded));
    }
  }, 60_000);
});
