import { describe, expect, it } from "vitest";
import { smallWorld } from "../../tests/fixtures/small-world";
import { createOrganization } from "./life";
import { makeIsoDate, simulationMomentOnLocalDate } from "./dates";
import { lifePlaceStateIdentities } from "./life-places";
import { SeededRng, pickDistinct } from "./rng";
import {
  createResourceFlows,
  createResourcePosition,
  money,
  recordResourceTransferOutcome,
} from "./resources";
import { resourceFlowTermsAt, resourcePositionAt } from "./resource-queries";
import { deserializeWorld, serializeWorld } from "./serialization";
import {
  BUSINESS_REVENUE_BASIS,
  BUSINESS_WAGES_BASIS,
  OWNER_DRAW_BASIS,
  settleBusinessMoney,
} from "./local-economy";
import type { World } from "./types";

const seed = "team4-a58-business-recorded-cash-20261002";
const catalog = lifePlaceStateIdentities();
const places = pickDistinct(new SeededRng(seed), catalog, 5);
const provenance = {
  kind: "authored" as const,
  note: "Controlled recorded-cash fixture, not observed business revenue or natural clock proof.",
};

function onDate(world: World, date: string): World {
  const day = makeIsoDate(date);
  return {
    ...world,
    currentDate: day,
    currentMoment: simulationMomentOnLocalDate(world.currentMoment, day),
  };
}

function fixture(place: string, customerCash: number | null) {
  expect(catalog).toHaveLength(56);
  const small = smallWorld({ place, seed, date: "2026-01-01" });
  let world = small.world;
  const organizations = [];
  for (const key of ["customers", "business"]) {
    world = createOrganization(world, {
      stableKey: `a58-cash:${key}`,
      formedAt: world.currentDate,
      detailLevel: "lightweight",
      provenance,
      initialProfile: {
        name: `Recorded fixture ${key}`,
        classification: "enterprise:retail",
        locationJurisdictionId: small.jurisdictionId,
      },
    });
    organizations.push(world.history.organizations.at(-1)!.id);
  }
  const customers = {
    kind: "organization" as const,
    organizationId: organizations[0]!,
  };
  const business = {
    kind: "organization" as const,
    organizationId: organizations[1]!,
  };
  if (customerCash !== null)
    world = createResourcePosition(world, {
      stableKey: "a58-cash:customer-money",
      owner: customers,
      openedAt: world.currentDate,
      openingBalance: money(customerCash, "USD"),
      provenance,
    });
  world = createResourcePosition(world, {
    stableKey: "a58-cash:business-money",
    owner: business,
    openedAt: world.currentDate,
    openingBalance: money(0, "USD"),
    provenance,
  });
  world = createResourceFlows(
    world,
    [
      {
        stableKey: "a58-cash:revenue",
        source: customers,
        recipient: business,
        amount: money(100_000, "USD"),
        basisKind: BUSINESS_REVENUE_BASIS,
      },
      {
        stableKey: "a58-cash:wages",
        source: business,
        recipient: { kind: "person" as const, personId: small.personId },
        amount: money(60_000, "USD"),
        basisKind: BUSINESS_WAGES_BASIS,
      },
      {
        stableKey: "a58-cash:draw",
        source: business,
        recipient: { kind: "person" as const, personId: world.personOrder[1]! },
        amount: money(40_000, "USD"),
        basisKind: OWNER_DRAW_BASIS,
      },
    ].map((flow) => ({
      ...flow,
      startsAt: world.currentDate,
      cadenceKind: "schedule:monthly",
      basisReference: { kind: "general" as const },
      restrictionKind: null,
      jurisdictionId: small.jurisdictionId,
      provenance,
    })),
  );
  return { world, business, customers, personId: small.personId };
}

describe.each(places)("A58 recorded money in $jurisdictionKey", (place) => {
  it("blocks unknown customer money and does not invent sales or payroll", () => {
    const { world, business, customers } = fixture(place.jurisdictionKey, null);
    const paid = settleBusinessMoney(
      onDate(world, "2026-02-01"),
      business.organizationId,
    );
    expect(
      paid.history.resourceTransferOutcomes.map((row) => row.status),
    ).toEqual(["blocked", "missed", "missed"]);
    expect(
      paid.history.resourceTransferOutcomes.every(
        (row) => row.transferredAmount.minorUnits === 0,
      ),
    ).toBe(true);
    expect(paid.history.resourceTransferOutcomes[0]!.reasonKind).toBe(
      "capacity:money-unknown",
    );
    expect(
      resourcePositionAt(paid, customers, money(0, "USD").currency),
    ).toBeUndefined();
    expect(
      resourcePositionAt(paid, business, money(0, "USD").currency)!
        .liquidBalance.minorUnits,
    ).toBe(0);
    expect(settleBusinessMoney(paid, business.organizationId)).toBe(paid);
  });

  it("limits sales and sequential payouts to the actual recorded cash", () => {
    const { world, business, customers } = fixture(
      place.jurisdictionKey,
      90_000,
    );
    const paid = settleBusinessMoney(
      onDate(world, "2026-02-01"),
      business.organizationId,
    );
    expect(
      paid.history.resourceTransferOutcomes.map((row) => [
        row.status,
        row.transferredAmount.minorUnits,
      ]),
    ).toEqual([
      ["partial", 90_000],
      ["completed", 60_000],
      ["partial", 30_000],
    ]);
    expect(
      resourcePositionAt(paid, customers, money(0, "USD").currency)!
        .liquidBalance.minorUnits,
    ).toBe(0);
    expect(
      resourcePositionAt(paid, business, money(0, "USD").currency)!
        .liquidBalance.minorUnits,
    ).toBe(0);
    expect(settleBusinessMoney(paid, business.organizationId)).toBe(paid);
    const reopened = deserializeWorld(serializeWorld(paid));
    expect(settleBusinessMoney(reopened, business.organizationId)).toBe(
      reopened,
    );
    expect(reopened.history.resourceTransferOutcomes).toEqual(
      paid.history.resourceTransferOutcomes,
    );
    console.info(
      `A58 place=${place.jurisdictionKey}, seed=${seed}: saved cash 90000; sales 90000, wages 60000, draw 30000; controlled amounts.`,
    );
  });

  it("records missed payments for known empty accounts", () => {
    const { world, business } = fixture(place.jurisdictionKey, 0);
    const paid = settleBusinessMoney(
      onDate(world, "2026-02-01"),
      business.organizationId,
    );
    expect(
      paid.history.resourceTransferOutcomes.map((row) => row.status),
    ).toEqual(["missed", "missed", "missed"]);
    expect(
      paid.history.resourceTransferOutcomes.every(
        (row) => row.reasonKind === "capacity:insufficient-funds",
      ),
    ).toBe(true);
  });

  it("settles two funded months in order and remains stable after reload", () => {
    const { world, business } = fixture(place.jurisdictionKey, 200_000);
    const paid = settleBusinessMoney(
      onDate(world, "2026-03-01"),
      business.organizationId,
    );
    expect(paid.history.resourceTransferOutcomes).toHaveLength(6);
    expect(
      paid.history.resourceTransferOutcomes.every(
        (row) => row.status === "completed",
      ),
    ).toBe(true);
    expect(
      paid.history.resourceTransferOutcomes.map((row) => row.periodStartsAt),
    ).toEqual([...Array(3).fill("2026-02-01"), ...Array(3).fill("2026-03-01")]);
    expect(
      resourcePositionAt(paid, business, money(0, "USD").currency)!
        .liquidBalance.minorUnits,
    ).toBe(0);
    const reopened = deserializeWorld(serializeWorld(paid));
    expect(settleBusinessMoney(reopened, business.organizationId)).toBe(
      reopened,
    );
  });

  it("preserves money already spent after an earlier due date", () => {
    const {
      world: initial,
      business,
      customers,
      personId,
    } = fixture(place.jurisdictionKey, 100_000);
    let world = onDate(initial, "2026-02-15");
    world = createResourceFlows(world, [
      {
        stableKey: "a58-cash:later-expense",
        source: customers,
        recipient: { kind: "person", personId },
        startsAt: world.currentDate,
        amount: money(80_000, "USD"),
        cadenceKind: "schedule:once",
        basisKind: "custom:fixture-expense",
        basisReference: { kind: "general" },
        restrictionKind: null,
        jurisdictionId: initial.people[personId]!.homeJurisdictionId,
        provenance,
      },
    ]);
    const expense = world.history.resourceFlows.at(-1)!;
    const expenseAmount = resourceFlowTermsAt(world, expense.id)!.amount;
    world = recordResourceTransferOutcome(world, {
      stableKey: "a58-cash:later-expense-paid",
      resourceFlowId: expense.id,
      periodStartsAt: world.currentDate,
      periodEndsAt: world.currentDate,
      occurredAt: world.currentDate,
      status: "completed",
      attemptedAmount: expenseAmount,
      transferredAmount: expenseAmount,
      reasonKind: null,
      note: "Actual fixture transfer already committed before catch-up.",
      provenance,
    });
    const savedExpense = world.history.resourceTransferOutcomes[0]!;
    const paid = settleBusinessMoney(
      onDate(world, "2026-03-01"),
      business.organizationId,
    );
    expect(paid.history.resourceTransferOutcomes[0]).toEqual(savedExpense);
    expect(
      paid.history.resourceTransferOutcomes[1]!.transferredAmount.minorUnits,
    ).toBe(20_000);
    expect(
      resourcePositionAt(paid, customers, money(0, "USD").currency)!
        .liquidBalance.minorUnits,
    ).toBe(0);
    expect(
      resourcePositionAt(paid, business, money(0, "USD").currency)!
        .liquidBalance.minorUnits,
    ).toBe(0);
  });
});
