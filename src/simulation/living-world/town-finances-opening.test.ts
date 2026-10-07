import { describe, expect, it } from "vitest";
import { smallWorld } from "../../../tests/fixtures/small-world";
import { createOrganization } from "../life";
import {
  ensureWorldStartingConditions,
  macroStartingConditions,
} from "../world-setup/conditions";
import { CRUNCH46_WORLD_OPENING_VERSION } from "../world-setup/types";
import {
  ensureMacroEconomyStarted,
  macroStartForHistory,
} from "../macro-economy/producer";
import {
  createResourcePosition,
  createResourceFlow,
  recordResourceTransferOutcome,
  money,
  makeCurrencyCode,
} from "../resources";
import { resourcePositionAt, resourceFlowTermsAt } from "../resource-queries";
import { serializeWorld, deserializeWorld } from "../serialization";
import { advanceWorld } from "../world";
import { aggregateCustomers } from "../local-economy";
import { observerSetup } from "../../presentation/observer-world";
import {
  prepareOpeningLife,
  generateOpeningLife,
} from "../../presentation/opening-life";
import { startTownJobPay } from "./town-pay";
import {
  ensureTownOpeningBusinessBooks,
  recordTownSalesReceipts,
  TOWN_SALES_RECEIPT_BASIS,
  PAYDAYS_A_YEAR,
  stepTownFinances,
} from "./town-finances";
import type { OrganizationClassification, World, EntityId } from "../types";

const provenance = {
  kind: "authored" as const,
  note: "Controlled surviving opening-books fixture, not observed business receipts.",
};
function fixture(
  classification: OrganizationClassification = "service:clinic",
) {
  let world = smallWorld({ place: "OH", date: "2026-01-05" }).world;
  world = ensureWorldStartingConditions(world, {
    openingVersion: CRUNCH46_WORLD_OPENING_VERSION,
  });
  world = ensureMacroEconomyStarted(
    world,
    macroStartForHistory(macroStartingConditions(world)),
  );
  const town = world.people[world.personOrder[0]!]!.homeJurisdictionId!;
  world = createOrganization(world, {
    stableKey: "opening-health:employer",
    formedAt: world.currentDate,
    provenance,
    initialProfile: {
      name: "Controlled health employer",
      classification,
      locationJurisdictionId: town,
    },
  });
  const id = world.history.organizations.at(-1)!.id;
  const currency = makeCurrencyCode("USD");
  world = createResourcePosition(world, {
    stableKey: "opening-health:cash",
    owner: { kind: "organization", organizationId: id },
    openedAt: world.currentDate,
    openingBalance: money(0, currency),
    provenance,
  });
  return { world, town, id, currency, pay: new Map([[id, 1000]]) };
}
function receipts(world: World) {
  const ids = new Set(
    world.history.resourceFlows
      .filter((row) => row.basisKind === TOWN_SALES_RECEIPT_BASIS)
      .map((row) => row.id),
  );
  return world.history.resourceTransferOutcomes.filter((row) =>
    ids.has(row.resourceFlowId),
  );
}
function credit(
  f: ReturnType<typeof fixture>,
  amount: number,
  classification: OrganizationClassification,
  basisKind: "custom:living-costs" | "custom:business-revenue",
) {
  let world = createOrganization(f.world, {
    stableKey: `opening-credit:${classification}`,
    formedAt: f.world.currentDate,
    provenance,
    initialProfile: {
      name: "Controlled existing payer",
      classification,
      locationJurisdictionId: f.town,
    },
  });
  const payer = world.history.organizations.at(-1)!.id;
  world = createResourceFlow(world, {
    stableKey: "opening-credit:flow",
    source: { kind: "organization", organizationId: payer },
    recipient: { kind: "organization", organizationId: f.id },
    startsAt: world.currentDate,
    amount: money(amount, f.currency),
    cadenceKind: "schedule:one-time",
    basisKind,
    basisReference: { kind: "general" },
    restrictionKind: null,
    jurisdictionId: f.town,
    provenance,
  });
  world = recordResourceTransferOutcome(world, {
    stableKey: "opening-credit:paid",
    resourceFlowId: world.history.resourceFlows.at(-1)!.id,
    periodStartsAt: world.currentDate,
    periodEndsAt: world.currentDate,
    occurredAt: world.currentDate,
    attemptedAmount: money(amount, f.currency),
    transferredAmount: money(amount, f.currency),
    status: "completed",
    reasonKind: null,
    note: null,
    provenance,
  });
  return world;
}

describe("surviving town opening books and sales dispatch", () => {
  it.each([
    { classification: "service:clinic" as const, kind: "clinic" },
    { classification: "service:nursing-home" as const, kind: "care-home" },
  ])(
    "opens newly formed $kind from recorded quarter pay before the ordinary quarter loop",
    ({ classification, kind }) => {
      const f = fixture(classification);
      const opened = ensureTownOpeningBusinessBooks(f.world, f.pay);
      expect(opened.townFinances!.businesses[f.id]!.kind).toBe(kind);
      expect(receipts(opened)).toHaveLength(1);
      expect(receipts(opened)[0]!.transferredAmount.minorUnits).toBeGreaterThan(
        0,
      );
      expect(
        resourcePositionAt(
          opened,
          { kind: "organization", organizationId: f.id },
          f.currency,
        )!.liquidBalance.minorUnits,
      ).toBe(receipts(opened)[0]!.transferredAmount.minorUnits);
      const restored = deserializeWorld(serializeWorld(opened));
      expect(ensureTownOpeningBusinessBooks(restored, f.pay)).toEqual(restored);
    },
  );
  it.each([
    {
      classification: "custom:state-government" as const,
      basis: "custom:business-revenue" as const,
    },
    {
      classification: "custom:recorded-payer" as const,
      basis: "custom:living-costs" as const,
    },
  ])(
    "includes already credited $basis at opening and first quarter without a second credit",
    ({ classification, basis }) => {
      const f = fixture();
      const original = ensureTownOpeningBusinessBooks(f.world, f.pay);
      const gross = receipts(original)[0]!.transferredAmount.minorUnits;
      const credited = credit(f, 10000, classification, basis);
      const opened = ensureTownOpeningBusinessBooks(credited, f.pay);
      expect(receipts(opened)[0]!.transferredAmount.minorUnits).toBe(
        gross - 10000,
      );
      const later = advanceWorld(opened, 91);
      const quarter = recordTownSalesReceipts(
        {
          ...later,
          townFinances: {
            ...later.townFinances!,
            businesses: {
              ...later.townFinances!.businesses,
              [f.id]: {
                ...later.townFinances!.businesses[f.id]!,
                lastRound: "quarter:one",
              },
            },
          },
        },
        f.town,
        opened.currentDate,
        later.currentDate,
        "quarter:one",
        1,
      );
      expect(receipts(quarter)).toEqual(receipts(opened));
    },
  );
  it("keeps main aggregate consumers on one identity and caps a tracked customer payment", () => {
    const f = fixture();
    const customers = aggregateCustomers(f.world, f.town);
    const again = aggregateCustomers(customers.world, f.town);
    expect(again.organizationId).toBe(customers.organizationId);
    const funded = createResourcePosition(again.world, {
      stableKey: "customer:actual-cash",
      owner: { kind: "organization", organizationId: customers.organizationId },
      openedAt: f.world.currentDate,
      openingBalance: money(10000, f.currency),
      provenance,
    });
    const opened = ensureTownOpeningBusinessBooks(funded, f.pay);
    expect(receipts(opened)[0]!.transferredAmount.minorUnits).toBe(10000);
    expect(receipts(opened)[0]!.status).toBe("partial");
    expect(
      resourcePositionAt(
        opened,
        { kind: "organization", organizationId: customers.organizationId },
        f.currency,
      )!.liquidBalance.minorUnits,
    ).toBe(0);
    expect(
      opened.history.organizations.filter(
        (row) => row.stableKey === `local-customers:${f.town}`,
      ),
    ).toHaveLength(1);
  });
  it("does not open books from absent or zero quarter pay", () => {
    const f = fixture();
    expect(ensureTownOpeningBusinessBooks(f.world, new Map())).toEqual(f.world);
    expect(
      ensureTownOpeningBusinessBooks(f.world, new Map([[f.id, 0]])),
    ).toEqual(f.world);
  });
  it("dispatches later sales through the surviving quarterly books caller once", () => {
    const f = fixture();
    const opened = ensureTownOpeningBusinessBooks(f.world, f.pay);
    const firstDate = advanceWorld(opened, 91);
    const first = stepTownFinances(
      firstDate,
      f.town,
      [{ organizationId: f.id, kind: "clinic", newcomer: false }],
      new Set(),
      "quarter:one",
    ).world;
    const secondDate = advanceWorld(first, 91);
    const second = stepTownFinances(
      secondDate,
      f.town,
      [{ organizationId: f.id, kind: "clinic", newcomer: false }],
      new Set(),
      "quarter:two",
    ).world;
    const later = receipts(second).filter(
      (row) => row.occurredAt === secondDate.currentDate,
    );
    expect(later).toHaveLength(1);
    expect(later[0]!.periodStartsAt).toBe(firstDate.currentDate);
    expect(later[0]!.transferredAmount.minorUnits).toBeGreaterThan(0);
    const replay = stepTownFinances(
      second,
      f.town,
      [{ organizationId: f.id, kind: "clinic", newcomer: false }],
      new Set(),
      "quarter:two",
    ).world;
    expect(receipts(replay)).toEqual(receipts(second));
  });

  it(
    "uses an actual random opening's saved staff terms and preserves receipts through reload",
    { timeout: 180000 },
    () => {
      const seed = "standby4-surviving-opening-books-20261002";
      const setup = observerSetup(seed);
      const session = generateOpeningLife(
        prepareOpeningLife({ ...setup, questionnaire: "skipped" }),
      );
      expect(session.game).toBeDefined();
      const priced = startTownJobPay(
        session.game!.world,
        null,
        session.game!.world.currentDate,
      );
      const quarter = new Map<EntityId, number>();
      for (const flow of priced.history.resourceFlows) {
        if (
          flow.basisKind !== "compensation:work" ||
          flow.source.kind !== "organization"
        )
          continue;
        const terms = resourceFlowTermsAt(priced, flow.id);
        if (!terms || terms.status !== "active") continue;
        const cadence = /^schedule:town-([a-z]+)/.exec(terms.cadenceKind)?.[1];
        const yearly = cadence ? PAYDAYS_A_YEAR[cadence] : undefined;
        if (!yearly) continue;
        quarter.set(
          flow.source.organizationId,
          (quarter.get(flow.source.organizationId) ?? 0) +
            (terms.amount.minorUnits * yearly) / 400,
        );
      }
      const opened = ensureTownOpeningBusinessBooks(priced, quarter);
      const paid = receipts(opened);
      process.stdout.write(
        JSON.stringify({
          receipt: "A60 survivor opening interface",
          seed,
          placeKey: setup.placeKey,
          books: Object.keys(opened.townFinances?.businesses ?? {}).length,
          receipts: paid.length,
          paidMinor: paid.reduce(
            (n, row) => n + row.transferredAmount.minorUnits,
            0,
          ),
          first: paid[0],
          reloadParity: true,
        }) + "\n",
      );
      expect(paid.length).toBeGreaterThan(0);
      const restored = deserializeWorld(serializeWorld(opened));
      expect(ensureTownOpeningBusinessBooks(restored, quarter)).toEqual(
        restored,
      );
    },
  );
});
