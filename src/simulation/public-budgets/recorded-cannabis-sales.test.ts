import { describe, expect, it } from "vitest";
import { smallWorld } from "../../../tests/fixtures/small-world";
import { createOrganization } from "../life";
import { aggregateCustomers } from "../local-economy";
import { recordTownSalesReceipts } from "../living-world/town-sales-receipts";
import { createResourcePosition, money } from "../resources";
import { serializeWorld, deserializeWorld } from "../serialization";
import { advanceWorld } from "../world";
import { recordedTownSalesTaxInput } from "./recorded-cannabis-sales";
import { recordedCannabisSalesTaxInput } from "./recorded-cannabis-sales";
import { assessRecordedCannabisSales } from "./cannabis-sales-tax-consumer";
import {
  fixture as enactedCannabisFixture,
  QUESTION,
} from "../../../tests/fixtures/cannabis-tax-fixture";
import { createTaxTransitionHandlerRegistry, previewTax } from "../tax-policy";
import type { World } from "../types";

const provenance = {
  kind: "authored" as const,
  note: "Controlled saved business books; not an observed cannabis share or tax rate.",
};

function fixture(
  sourceCash: number | null = null,
  initial?: World,
  opening = false,
) {
  let world = initial ?? smallWorld({ place: "OH", date: "2026-01-01" }).world;
  const town =
    initial?.history.taxProposals?.[0]?.jurisdictionId ??
    world.people[world.personOrder[0]!]!.homeJurisdictionId!;
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
  world = createResourcePosition(world, {
    stableKey: "a31:controlled-seller-cash",
    owner: { kind: "organization", organizationId },
    openedAt: startsAt,
    openingBalance: money(0, "USD"),
    provenance,
  });
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
    ...(opening ? world : advanceWorld(world, 91)),
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
  it("admits the producer's day-one point period without a second cash receipt", () => {
    const enacted = enactedCannabisFixture(10000, 0, true, QUESTION, false);
    const world = fixture(null, enacted.world, true);
    const receipt = world.history.resourceTransferOutcomes.at(-1)!;
    expect(receipt.periodStartsAt).toBe(receipt.periodEndsAt);
    const input = recordedCannabisSalesTaxInput(world, receipt.id);
    expect(input.kind).toBe("recorded");
    if (input.kind !== "recorded") throw new Error(input.reason);
    expect(input.periodStartsAt).toBe(world.currentDate);
    expect(input.periodEndsAt).toBe(world.currentDate);
    const assessed = assessRecordedCannabisSales(world);
    expect(assessed.history.resourceFlows).toHaveLength(
      world.history.resourceFlows.length,
    );
    expect(assessed.history.taxBases!.at(-1)!.sourceEventId).toBe(receipt.id);
    expect(
      assessed.history.taxAssessments!.at(-1)!.taxAmount.minorUnits,
    ).toBeGreaterThan(0);
    const restored = deserializeWorld(serializeWorld(assessed));
    expect(assessRecordedCannabisSales(restored)).toBe(restored);
  });
  it("assesses the same seller receipt under its actual adopted rate and collects once after reload", () => {
    const enacted = enactedCannabisFixture(10000, 0, true, QUESTION, false);
    const world = fixture(null, enacted.world);
    const receipt = world.history.resourceTransferOutcomes.at(-1)!;
    const input = recordedCannabisSalesTaxInput(world, receipt.id);
    expect(input.kind).toBe("recorded");
    if (input.kind !== "recorded") throw new Error(input.reason);
    const paidFlowCount = world.history.resourceFlows.length;
    const assessed = assessRecordedCannabisSales(world);
    expect(assessed.history.resourceFlows).toHaveLength(paidFlowCount);
    const base = assessed.history.taxBases!.at(-1)!;
    expect(base.sourceEventId).toBe(receipt.id);
    expect(base.payer).toEqual(input.payer);
    expect(base.amount).toEqual(input.amount);
    expect(base.assumptionNote).toContain("Estimated cannabis portion");
    const proposal = assessed.history.taxProposals![0]!;
    const preview = previewTax(proposal.terms, base.baseKey, base.amount);
    expect(preview.status).toBe("available");
    if (preview.status !== "available") throw new Error(preview.reason);
    const assessment = assessed.history.taxAssessments!.at(-1)!;
    expect(assessment.taxAmount).toEqual(preview.taxAmount);
    expect(assessment.taxAmount.minorUnits).toBeGreaterThan(0);
    expect(assessment.lawEffectStamps![0]!.governingLawKey).toBe(
      enacted.measureId,
    );
    const saved = deserializeWorld(serializeWorld(assessed));
    expect(assessRecordedCannabisSales(saved)).toBe(saved);
    const collected = advanceWorld(
      saved,
      proposal.terms.collectionLagDays,
      createTaxTransitionHandlerRegistry(),
    );
    const collection = collected.history.taxCollections!.at(-1)!;
    expect(collection.status).toBe("collected");
    expect(collection.transferredAmount).toEqual(assessment.taxAmount);
    expect(collection.resourceOutcomeId).not.toBe(receipt.id);
    const transfer = collected.history.resourceTransferOutcomes.find(
      (row) => row.id === collection.resourceOutcomeId,
    )!;
    const flow = collected.history.resourceFlows.find(
      (row) => row.id === transfer.resourceFlowId,
    )!;
    expect(flow.source).toEqual(input.payer);
    expect(flow.recipient).toEqual({
      kind: "organization",
      organizationId: proposal.publicOrganizationId,
    });
    expect(assessRecordedCannabisSales(collected)).toBe(collected);
    expect(
      deserializeWorld(serializeWorld(collected)).history.taxCollections,
    ).toEqual(collected.history.taxCollections);
  });
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
