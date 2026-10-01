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
// Measured current-main 281d44603 pre-extraction whole-save parity.
const baselineHashes: Readonly<Record<string, string>> = {
  "4752006": "7fd381c25a5e55f820aac40607b393b4b4dc3eba6f74fa5e8774bc7ce0ef3398",
  "3918000": "c15706d3149b6768ed125eed7080672364b131e4d409e85d23212411afd2b32b",
  "1150000": "bbc15af24c4049dc7b9fdf5ad2966b9b32265430e1156e3fbc50d9d4b30be6b1",
  "1571550": "790eaec5f888ba5c37cdad57265192f43165eed4a6541fe72274cd9782b14911",
  "2836000": "d45f412092ffefcb9d6363092794667ed06e0860937897076a0976b1a1db5374",
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
