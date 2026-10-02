import { createOrganization } from "../life";
import { appendPressRecord } from "./store";
import { recordMediaPurchasePayment } from "./media-purchase-payment";
import { recordWorldEvent } from "../world";
import { createHash } from "node:crypto";
import { describe, expect, it } from "vitest";
import { makeIsoDate } from "../dates";
import { requireLifePlace } from "../life-places";
import { createLightweightPerson } from "../people";
import { resourcePositionAt } from "../resource-queries";
import { createResourcePosition, makeCurrencyCode, money } from "../resources";
import { deserializeWorld, serializeWorld } from "../serialization";
import { assertWorldIntegrity, createWorld, createWorldId } from "../world";
import { ensurePressMediaOpening, mediaOutlets } from "./outlets";
import {
  ensureMediaOwnership,
  outletOwner,
  outletPurchaseTerms,
  purchaseOutlet,
} from "./ownership";
import { loadOwnershipPacks, type OwnershipPack } from "./ownership-packs";

const USD = makeCurrencyCode("USD");
const places = ["4752006", "3918000", "1150000", "1571550", "2836000"];
// Measured pre-endpoint writer at 5c4965e7c: all five whole-save hashes
// equal the expanded endpoint writer. Financial and serialization assertions remain.
const baselineHashes: Readonly<Record<string, string>> = {
  "4752006": "dd7469b3e175930fc90430d7f8f0813f250b2e98feeaabb410a45951dcde414b",
  "3918000": "49d4e8ddfd1db8d4a49e50eb908a50877cd3660b2fc0d7f0c691acc4d0fcc748",
  "1150000": "6c25c35f64ab499f6800eaebfb1eed38d1b531b55daf630eb9e52c4109084454",
  "1571550": "c87804ea47f779698f5f64e259f9a6519c8d96609f5ae18bdc36bd01e0066139",
  "2836000": "727c2ec2ed7af46fbce69fa111061857112f4928b19fb7cdf3ad0fcaaae7d6b4",
};
const pack: OwnershipPack = {
  id: "test.payment",
  provenance: {
    kind: "authored-fiction",
    note: "Explicit purchase fixture terms, not researched prices.",
  },
  askingPriceDollars: {
    small: 100_000,
    standard: 1_000_000,
    major: 50_000_000,
  },
  owners: [
    {
      key: "owner.seller",
      ownerKind: "independent",
      names: ["{outlet} Publishing Company"],
      perOutlet: true,
      holds: {
        products: [
          "general-newspaper",
          "state-newsroom",
          "politics-publication",
          "public-affairs-broadcaster",
        ],
      },
      foundingWeight: 1,
      reviewEveryDays: 365,
      sellsOutlets: true,
      practices: [],
    },
  ],
};
const registry = loadOwnershipPacks([pack]);
function market(placeKey: string, balance: number | null) {
  const place = requireLifePlace(placeKey);
  const seed = `team8-n3-payment:${placeKey}`;
  const date = makeIsoDate("2026-01-05");
  const person = createLightweightPerson({
    worldId: createWorldId(seed),
    worldSeed: seed,
    index: 0,
    currentDate: date,
    homeJurisdictionId: place.context.jurisdiction.id,
  });
  let world = createWorld({
    seed,
    currentDate: date,
    jurisdictions: [place.context.jurisdiction],
    people: [person],
  });
  world = { ...world, control: { kind: "person", personId: person.id } };
  world = ensureMediaOwnership(
    ensurePressMediaOpening(world, person.id),
    registry,
  );
  const outlet = mediaOutlets(world).find(
    (row) => row.product === "general-newspaper",
  )!;
  const seller = outletOwner(world, outlet.id)!;
  world = createResourcePosition(world, {
    stableKey: "fixture:seller-cash",
    owner: { kind: "organization", organizationId: seller.organizationId },
    openedAt: date,
    openingBalance: money(0, USD),
    provenance: { kind: "authored", note: "Explicit seller cash fixture." },
  });
  if (balance !== null)
    world = createResourcePosition(world, {
      stableKey: "fixture:buyer-cash",
      owner: { kind: "person", personId: person.id },
      openedAt: date,
      openingBalance: money(balance, USD),
      provenance: { kind: "authored", note: "Explicit buyer cash fixture." },
    });
  return { world, person, outlet, seller };
}
describe("media purchase payment preserves the existing financial writer", () => {
  it.each(places)(
    "preserves asking terms, buyer funding, seller receipt and saved records in %s",
    (placeKey) => {
      const { world, person, outlet, seller } = market(
        placeKey,
        10_000_000_000,
      );
      const terms = outletPurchaseTerms(world, person.id, outlet.id, registry);
      expect(terms).toMatchObject({
        status: "available",
        priceMinorUnits: 5_000_000_000,
      });
      const after = purchaseOutlet(
        world,
        {
          stableKey: "fixture:purchase",
          buyerPersonId: person.id,
          outletId: outlet.id,
        },
        registry,
      );
      assertWorldIntegrity(after);
      expect(
        resourcePositionAt(after, { kind: "person", personId: person.id }, USD)
          ?.liquidBalance.minorUnits,
      ).toBe(5_000_000_000);
      expect(
        resourcePositionAt(
          after,
          { kind: "organization", organizationId: seller.organizationId },
          USD,
        )?.liquidBalance.minorUnits,
      ).toBe(5_000_000_000);
      const flow = after.history.resourceFlows.at(-1)!;
      expect(flow.source).toEqual({ kind: "person", personId: person.id });
      expect(flow.recipient).toEqual({
        kind: "organization",
        organizationId: seller.organizationId,
      });
      const outcomes = after.history.resourceTransferOutcomes.filter(
        (row) => row.resourceFlowId === flow.id,
      );
      expect(outcomes).toHaveLength(1);
      expect(outcomes[0]).toMatchObject({
        status: "completed",
        attemptedAmount: money(5_000_000_000, USD),
        transferredAmount: money(5_000_000_000, USD),
        provenance: flow.provenance,
      });
      const payload = serializeWorld(after);
      const loaded = deserializeWorld(payload);
      expect(serializeWorld(loaded)).toBe(payload);
      expect(
        outletPurchaseTerms(loaded, person.id, outlet.id, registry).status,
      ).toBe("already-yours");
      expect(() =>
        purchaseOutlet(
          loaded,
          {
            stableKey: "fixture:purchase",
            buyerPersonId: person.id,
            outletId: outlet.id,
          },
          registry,
        ),
      ).toThrow();
      expect(serializeWorld(loaded)).toBe(payload);
      expect(createHash("sha256").update(payload).digest("hex")).toBe(
        baselineHashes[placeKey],
      );
    },
  );
  it.each(places)(
    "refuses missing and insufficient recorded funding without mutations in %s",
    (placeKey) => {
      for (const balance of [null, 50_000]) {
        const { world, person, outlet } = market(placeKey, balance);
        const payload = serializeWorld(world);
        expect(
          outletPurchaseTerms(world, person.id, outlet.id, registry).status,
        ).toBe(balance === null ? "savings-not-on-record" : "cannot-afford");
        expect(() =>
          purchaseOutlet(
            world,
            {
              stableKey: "fixture:purchase",
              buyerPersonId: person.id,
              outletId: outlet.id,
            },
            registry,
          ),
        ).toThrow();
        expect(serializeWorld(world)).toBe(payload);
      }
    },
  );
});

describe("recorded organization purchase funding", () => {
  it.each(places)(
    "uses actual organization cash and saved principal in %s",
    (placeKey) => {
      const f = market(placeKey, null);
      let world = createOrganization(f.world, {
        stableKey: "fixture:buyer-organization",
        formedAt: f.world.currentDate,
        provenance: {
          kind: "authored",
          note: "Explicit test buyer organization",
        },
        initialProfile: {
          name: "Recorded buyer",
          classification: "enterprise:media-ownership",
          locationJurisdictionId: f.person.homeJurisdictionId,
        },
      });
      const organization = world.history.organizations.at(-1)!;
      world = appendPressRecord(world, "media-owner", {
        stableKey: "fixture:buyer-owner",
        organizationId: organization.id,
        packId: "person",
        rowKey: "owner.person",
        name: "Recorded buyer",
        ownerKind: "individual",
        establishedAt: world.currentDate,
        principalPersonId: f.person.id,
      }).world;
      const pending = recordMediaPurchasePayment(world, {
        stableKey: "fixture:unfunded-organization-payment",
        buyerOrganizationId: organization.id,
        decisionMakerPersonId: f.person.id,
        sellerOrganizationId: f.seller.organizationId,
        sellerName: f.seller.name,
        outletName: f.outlet.name,
        jurisdictionId: f.person.homeJurisdictionId,
        eventId: world.history.events.at(-1)!.id,
        priceMinorUnits: 10000,
      });
      expect(pending).toBe(world);
      world = createResourcePosition(world, {
        stableKey: "fixture:organization-cash",
        owner: { kind: "organization", organizationId: organization.id },
        openedAt: world.currentDate,
        openingBalance: money(20000, USD),
        provenance: {
          kind: "authored",
          note: "Explicit test funds, no credit inferred",
        },
      });
      world = recordWorldEvent(world, {
        stableKey: "fixture:reviewed-purchase",
        type: "fixture.purchase-reviewed",
        occurredAt: world.currentDate,
        recordedAt: world.currentDate,
        jurisdictionId: f.person.homeJurisdictionId,
        involvedEntityIds: [
          f.person.id,
          organization.id,
          f.seller.organizationId,
        ],
        participants: [],
        personFactConstraints: [],
        visibility: "private",
        tags: ["fixture:authored-purchase"],
        summary: "Explicit fixture purchase event.",
        context: {
          location: null,
          socialContext: null,
          pressure: null,
          choice: null,
          motivation: null,
          immediateReaction: null,
        },
      });
      const input = {
        stableKey: "fixture:organization-payment",
        buyerOrganizationId: organization.id,
        decisionMakerPersonId: f.person.id,
        sellerOrganizationId: f.seller.organizationId,
        sellerName: f.seller.name,
        outletName: f.outlet.name,
        jurisdictionId: f.person.homeJurisdictionId,
        eventId: world.history.events.at(-1)!.id,
        priceMinorUnits: 10000,
      };
      expect(
        recordMediaPurchasePayment(world, {
          ...input,
          buyerOrganizationId: f.outlet.organizationId,
        }),
      ).toBe(world);
      expect(
        recordMediaPurchasePayment(world, { ...input, priceMinorUnits: 20001 }),
      ).toBe(world);
      const after = recordMediaPurchasePayment(world, input);
      expect(
        resourcePositionAt(
          after,
          { kind: "organization", organizationId: organization.id },
          USD,
        )?.liquidBalance.minorUnits,
      ).toBe(10000);
      expect(
        resourcePositionAt(
          after,
          { kind: "organization", organizationId: f.seller.organizationId },
          USD,
        )?.liquidBalance.minorUnits,
      ).toBe(10000);
      expect(after.history.resourceFlows.at(-1)!.source).toEqual({
        kind: "organization",
        organizationId: organization.id,
      });
      expect(after.history.resourceTransferOutcomes.at(-1)!.provenance).toEqual(
        { kind: "simulated-event", eventId: input.eventId },
      );
      expect(serializeWorld(deserializeWorld(serializeWorld(after)))).toBe(
        serializeWorld(after),
      );
      assertWorldIntegrity(after);
    },
  );
});
