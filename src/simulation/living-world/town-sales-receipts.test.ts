import { describe, expect, it } from "vitest";
import { smallWorld } from "../../../tests/fixtures/small-world";
import { observerSetup } from "../../presentation/observer-world";
import {
  generateOpeningLife,
  prepareOpeningLife,
} from "../../presentation/opening-life";
import { createOrganization } from "../life";
import { advanceWorld } from "../world";
import {
  createResourceFlow,
  createResourcePosition,
  makeCurrencyCode,
  money,
  recordResourceTransferOutcome,
} from "../resources";
import { resourcePositionAt } from "../resource-queries";
import { serializeWorld, deserializeWorld } from "../serialization";
import { passOrdinaryDays } from "../../presentation/ordinary-life";
import {
  recordTownSalesReceipts,
  TOWN_SALES_RECEIPT_BASIS,
} from "./town-sales-receipts";
import type { World } from "../types";

const provenance = {
  kind: "authored" as const,
  note: "Controlled recorded-sales fixture; not measured real business sales.",
};

function fixture() {
  let world = smallWorld({ place: "OH", date: "2026-01-01" }).world;
  const town = world.people[world.personOrder[0]!]!.homeJurisdictionId!;
  world = createOrganization(world, {
    stableKey: "sales:employer",
    formedAt: world.currentDate,
    provenance,
    initialProfile: {
      name: "Controlled employer",
      classification: "enterprise:retail",
      locationJurisdictionId: town,
    },
  });
  const organizationId = world.history.organizations.at(-1)!.id;
  const currency = makeCurrencyCode("USD");
  world = createResourcePosition(world, {
    stableKey: "sales:cash",
    owner: { kind: "organization", organizationId },
    openedAt: world.currentDate,
    openingBalance: money(0, currency),
    provenance,
  });
  const startsAt = world.currentDate;
  world = {
    ...advanceWorld(world, 91),
    townFinances: {
      version: "town-finances-v1",
      banks: {},
      markets: {},
      basePriceIndex: 100,
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
          lastRound: "quarter:one",
        },
      },
    },
  };
  const settle = (input: World) =>
    recordTownSalesReceipts(
      input,
      town,
      startsAt,
      world.currentDate,
      "quarter:one",
      1.25,
    );
  return { world, town, organizationId, currency, settle };
}

describe("recorded quarterly sales fund canonical employer cash", () => {
  it("converts constant annual dollars once and survives reload without a second receipt", () => {
    const f = fixture();
    const paid = f.settle(f.world);
    const receipt = paid.history.resourceTransferOutcomes.at(-1)!;
    expect(receipt.transferredAmount).toEqual(money(150000, f.currency));
    expect(receipt.periodStartsAt).toBe(
      f.world.townFinances!.businesses[f.organizationId]!.openedAt,
    );
    expect(receipt.periodEndsAt).toBe(f.world.currentDate);
    expect(
      resourcePositionAt(
        paid,
        { kind: "organization", organizationId: f.organizationId },
        f.currency,
      )!.liquidBalance.minorUnits,
    ).toBe(150000);
    expect(
      f.settle(deserializeWorld(serializeWorld(paid))).history
        .resourceTransferOutcomes,
    ).toEqual(paid.history.resourceTransferOutcomes);
  });

  it("includes existing government and player cash payments instead of crediting them again", () => {
    const f = fixture();
    let world = f.world;
    for (const basisKind of [
      "custom:government-payment",
      "custom:living-costs",
    ] as const) {
      world = createOrganization(world, {
        stableKey: basisKind,
        formedAt: world.currentDate,
        provenance,
        initialProfile: {
          name: basisKind,
          classification:
            basisKind === "custom:government-payment"
              ? "sector:government"
              : "custom:controlled-payer",
          locationJurisdictionId: f.town,
        },
      });
      world = createResourceFlow(world, {
        stableKey: `${basisKind}:payment`,
        source: {
          kind: "organization",
          organizationId: world.history.organizations.at(-1)!.id,
        },
        recipient: { kind: "organization", organizationId: f.organizationId },
        startsAt: world.currentDate,
        amount: money(25000, f.currency),
        cadenceKind: "schedule:one-time",
        basisKind,
        basisReference: { kind: "general" },
        restrictionKind: null,
        jurisdictionId: f.town,
        provenance,
      });
      world = recordResourceTransferOutcome(world, {
        stableKey: `${basisKind}:receipt`,
        resourceFlowId: world.history.resourceFlows.at(-1)!.id,
        periodStartsAt: world.currentDate,
        periodEndsAt: world.currentDate,
        occurredAt: world.currentDate,
        attemptedAmount: money(25000, f.currency),
        transferredAmount: money(25000, f.currency),
        status: "completed",
        reasonKind: null,
        note: null,
        provenance,
      });
    }
    const paid = f.settle(world);
    expect(
      paid.history.resourceTransferOutcomes.at(-1)!.transferredAmount
        .minorUnits,
    ).toBe(100000);
    expect(
      resourcePositionAt(
        paid,
        { kind: "organization", organizationId: f.organizationId },
        f.currency,
      )!.liquidBalance.minorUnits,
    ).toBe(150000);
  });

  it.each([
    {
      seed: "standby4-a60-recorded-period-sales-20261002",
      hasBusinessBooks: false,
    },
    {
      seed: "standby4-a60-comparable-opening-20261002",
      hasBusinessBooks: true,
    },
  ])(
    "opens random normal game $seed and credits only its saved business sales",
    { timeout: 180000 },
    ({ seed, hasBusinessBooks }) => {
      const setup = observerSetup(seed);
      const session = generateOpeningLife(
        prepareOpeningLife({ ...setup, questionnaire: "skipped" }),
      );
      expect(session.game).toBeDefined();
      const later = passOrdinaryDays(session.game!.world, 95);
      const flows = later.history.resourceFlows.filter(
        (flow) => flow.basisKind === TOWN_SALES_RECEIPT_BASIS,
      );
      const ids = new Set(flows.map((flow) => flow.id));
      const receipts = later.history.resourceTransferOutcomes.filter(
        (row) =>
          ids.has(row.resourceFlowId) && row.transferredAmount.minorUnits > 0,
      );
      process.stdout.write(
        JSON.stringify({
          diagnostic: "A60 quarterly path",
          seed,
          placeKey: setup.placeKey,
          opening: session.game!.world.currentDate,
          later: later.currentDate,
          businesses: Object.keys(later.townFinances?.businesses ?? {}).length,
          macroMonths: later.macroEconomy?.months.length,
          migrationItems: later.history.futureDueItems
            .filter((row) => row.stableKey.startsWith("migration:review:"))
            .map((row) => ({ dueAt: row.dueAt, stableKey: row.stableKey })),
        }) + "\n",
      );
      if (hasBusinessBooks) expect(receipts.length).toBeGreaterThan(0);
      else {
        expect(Object.keys(later.townFinances?.businesses ?? {})).toHaveLength(
          0,
        );
        expect(receipts).toHaveLength(0);
      }
      for (const row of receipts) {
        const flow = flows.find(
          (candidate) => candidate.id === row.resourceFlowId,
        )!;
        expect(flow.recipient.kind).toBe("organization");
        if (flow.recipient.kind === "organization")
          expect(
            resourcePositionAt(
              later,
              flow.recipient,
              row.transferredAmount.currency,
            )!.outcomeIds,
          ).toContain(row.id);
      }
      process.stdout.write(
        JSON.stringify({
          receipt: "A60 native quarterly sales",
          seed,
          placeKey: setup.placeKey,
          receipts: receipts.length,
          first: receipts[0],
        }) + "\n",
      );
    },
  );
});
