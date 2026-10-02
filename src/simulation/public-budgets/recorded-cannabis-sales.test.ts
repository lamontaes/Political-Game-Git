import { describe, expect, it } from "vitest";
import { smallWorld } from "../../../tests/fixtures/small-world";
import { createOrganization } from "../life";
import { aggregateCustomers } from "../local-economy";
import { recordTownSalesReceipts } from "../living-world/town-sales-receipts";
import { createResourcePosition, money } from "../resources";
import { serializeWorld, deserializeWorld } from "../serialization";
import { advanceWorld } from "../world";
import { recordedTownSalesTaxInput } from "./recorded-cannabis-sales";

const provenance = {
  kind: "authored" as const,
  note: "Controlled saved business books; not an observed cannabis share or tax rate.",
};

function fixture(sourceCash: number | null = null) {
  let world = smallWorld({ place: "OH", date: "2026-01-01" }).world;
  const town = world.people[world.personOrder[0]!]!.homeJurisdictionId!;
  world = createOrganization(world, {
    stableKey: "a31:recorded-seller",
    formedAt: world.currentDate,
    provenance,
    initialProfile: {
      name: "Controlled recorded seller",
      classification: "enterprise:retail",
      locationJurisdictionId: town,
    },
  });
  const organizationId = world.history.organizations.at(-1)!.id;
  const startsAt = world.currentDate;
  if (sourceCash !== null) {
    const source = aggregateCustomers(world, town, startsAt);
    world = createResourcePosition(source.world, {
      stableKey: "a31:controlled-customer-cash",
      owner: { kind: "organization", organizationId: source.organizationId },
      openedAt: startsAt,
      openingBalance: money(sourceCash, "USD"),
      provenance,
    });
  }
  world = {
    ...advanceWorld(world, 91),
    townFinances: {
      version: "town-finances-v1",
      banks: {},
      markets: {},
      basePriceIndex: 100,
      taxableSales: { [town]: 1 },
      businesses: {
        [organizationId]: {
          organizationId,
          openedAt: startsAt,
          cash: 0,
          debt: 0,
          annualRevenue: 4800,
          kind: "retail",
          capacity: 4800,
          annualOtherCosts: 0,
          margin: 0,
          ownDemandLog: 0,
          openingShare: 1,
          openingMarketSales: 4800,
          bankId: null,
          lineLimit: 0,
          lastQuarterNet: 0,
          lastQuarterPay: 0,
          lastRound: "a31:quarter",
        },
      },
    },
  };
  return recordTownSalesReceipts(
    world,
    town,
    startsAt,
    world.currentDate,
    "a31:quarter",
    1,
  );
}

describe("A31 reuses the actual native employer receipt", () => {
  it("keeps paid minor units, actual seller and exact period without creating another receipt", () => {
    const world = fixture();
    const receipt = world.history.resourceTransferOutcomes.at(-1)!;
    const before = serializeWorld(world);
    const input = recordedTownSalesTaxInput(world, receipt.id);
    expect(input.kind).toBe("recorded");
    if (input.kind !== "recorded") throw new Error(input.reason);
    const flow = world.history.resourceFlows.find(
      (row) => row.id === receipt.resourceFlowId,
    )!;
    expect(input.amount).toEqual(receipt.transferredAmount);
    expect(input.amount.minorUnits).toBe(120000);
    expect(input.payer).toEqual(flow.recipient);
    expect(input.periodStartsAt).toBe(receipt.periodStartsAt);
    expect(input.periodEndsAt).toBe(receipt.periodEndsAt);
    expect(input.sourceRecordIds).toContain(receipt.id);
    expect(
      recordedTownSalesTaxInput(deserializeWorld(before), receipt.id),
    ).toEqual(input);
    expect(serializeWorld(world)).toBe(before);
  });

  it("reads only the partial paid amount and refuses an unavailable historical receipt", () => {
    const world = fixture(17);
    const receipt = world.history.resourceTransferOutcomes.at(-1)!;
    expect(receipt.status).toBe("partial");
    expect(receipt.attemptedAmount.minorUnits).toBe(120000);
    const input = recordedTownSalesTaxInput(world, receipt.id);
    expect(input.kind).toBe("recorded");
    if (input.kind !== "recorded") throw new Error(input.reason);
    expect(input.amount.minorUnits).toBe(17);
    expect(
      recordedTownSalesTaxInput(world, receipt.id, {
        asOfDate: world.currentDate,
        historySequenceExclusive: receipt.sequence,
      }).kind,
    ).toBe("unavailable");
    expect(world.history.taxBases ?? []).toEqual([]);
    expect(world.history.taxCollections ?? []).toEqual([]);
  });
});
