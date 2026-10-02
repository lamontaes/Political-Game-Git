import { describe, expect, it } from "vitest";
import {
  addDays,
  ageOnDate,
  makeIsoDate,
  simulationMomentOnLocalDate,
} from "../dates";
import { scheduleFutureDueItem } from "../future-transitions";
import { createStableId } from "../ids";
import { createOrganization } from "../life";
import { stateJurisdictionForKey } from "../life-places";
import { createLightweightPerson } from "../people";
import { resourcePositionAt } from "../resource-queries";
import { createResourcePosition, makeCurrencyCode, money } from "../resources";
import { deserializeWorld, serializeWorld } from "../serialization";
import { STATES } from "../state-reference";
import type { EntityId } from "../types";
import { assertWorldIntegrity, createWorld, createWorldId } from "../world";
import {
  currentOutletOwnership,
  outletOwner,
  pressOwnerReviewHandler,
  PRESS_OWNER_REVIEW_TRANSITION_KEY,
} from "./ownership";
import { loadOwnershipPacks, type OwnershipPack } from "./ownership-packs";
import { PRESS_POLICY_VERSION } from "./records";
import { appendPressRecord } from "./store";

const USD = makeCurrencyCode("USD");
const seed = "a145-bilateral-authored-books-all56";
const places = Object.keys(STATES)
  .sort((a, b) =>
    createStableId("decision", `${seed}:${a}`).localeCompare(
      createStableId("decision", `${seed}:${b}`),
    ),
  )
  .slice(0, 5);
type Scenario =
  | "ready"
  | "missing-buyer-principal"
  | "missing-seller-principal"
  | "missing-books"
  | "missing-cash"
  | "missing-price"
  | "insufficient-cash"
  | "multiple-sales";
function fixture(
  usps: string,
  scenario: Scenario = "ready",
  practiceEffect = "acquire-outlet",
) {
  const date = makeIsoDate("2026-01-31");
  const worldSeed = `${seed}:${usps}`;
  const state = stateJurisdictionForKey(`US-${usps}`)!;
  const people = Array.from({ length: 100 }, (_, index) =>
    createLightweightPerson({
      worldId: createWorldId(worldSeed),
      worldSeed,
      index,
      currentDate: date,
      homeJurisdictionId: state.id,
    }),
  )
    .filter((person) => ageOnDate(person.birthDate, date) >= 25)
    .slice(0, 2);
  expect(people).toHaveLength(2);
  let world = createWorld({
    seed: worldSeed,
    currentDate: date,
    jurisdictions: [state],
    people,
  });
  const pack: OwnershipPack = {
    id: "fixture.bilateral",
    provenance: {
      kind: "authored-fiction",
      note: "Existing price and balance fixture, not empirical newspaper valuation or production finance.",
    },
    ...(scenario === "missing-price"
      ? {}
      : { askingPriceDollars: { standard: 1_000_000 } }),
    practices: [
      {
        key: "fixture.acquire",
        effect: practiceEffect,
        likelihoodPerReview: 0,
        description: "Review recorded sale and funding",
      },
    ],
    owners: [
      {
        key: "fixture.buyer",
        ownerKind: "family-chain",
        names: ["Fixture growing chain"],
        holds: {},
        foundingWeight: 0,
        reviewEveryDays: 30,
        sellsOutlets: false,
        practices: ["fixture.acquire"],
      },
      {
        key: "fixture.seller",
        ownerKind: "independent",
        names: ["Fixture seller"],
        holds: {},
        foundingWeight: 0,
        reviewEveryDays: 30,
        sellsOutlets: true,
        practices: [],
      },
    ],
  };
  const registry = loadOwnershipPacks([pack]);
  expect(registry.report.rejections).toEqual([]);
  const organization = (key: string) => {
    world = createOrganization(world, {
      stableKey: key,
      formedAt: date,
      provenance: {
        kind: "authored",
        note: "Explicit bilateral fixture organization",
      },
      initialProfile: {
        name: key,
        classification: "enterprise:media-ownership",
        locationJurisdictionId: state.id,
      },
    });
    return world.history.organizations.at(-1)!.id;
  };
  const buyerOrganizationId = organization("fixture:buyer-org");
  const sellerOrganizationId = organization("fixture:seller-org");
  const owner = (
    key: string,
    organizationId: EntityId,
    principalPersonId: EntityId | undefined,
  ) => {
    const saved = appendPressRecord(world, "media-owner", {
      stableKey: key,
      organizationId,
      packId: pack.id,
      rowKey: key,
      name: key,
      ownerKind: key === "fixture.buyer" ? "family-chain" : "independent",
      establishedAt: date,
      ...(principalPersonId ? { principalPersonId } : {}),
    });
    world = saved.world;
    return saved.record;
  };
  const buyer = owner(
    "fixture.buyer",
    buyerOrganizationId,
    scenario === "missing-buyer-principal" ? undefined : people[0]!.id,
  );
  const seller = owner(
    "fixture.seller",
    sellerOrganizationId,
    scenario === "missing-seller-principal" ? undefined : people[1]!.id,
  );
  const position = (key: string, organizationId: EntityId, balance: number) => {
    world = createResourcePosition(world, {
      stableKey: key,
      owner: { kind: "organization", organizationId },
      openedAt: date,
      openingBalance: money(balance, USD),
      provenance: {
        kind: "authored",
        note: "Saved fixture cash, not inferred cash",
      },
    });
  };
  if (scenario !== "missing-cash")
    position(
      "fixture:buyer-cash",
      buyerOrganizationId,
      scenario === "insufficient-cash" ? 1 : 200_000_000,
    );
  position("fixture:seller-cash", sellerOrganizationId, 0);
  const outlets = [];
  for (
    let index = 0;
    index < (scenario === "multiple-sales" ? 2 : 1);
    index++
  ) {
    const organizationId = organization(`fixture:outlet-org:${index}`);
    const saved = appendPressRecord(world, "media-outlet", {
      stableKey: `fixture:outlet:${index}`,
      organizationId,
      name: `Fixture newspaper ${index}`,
      product: "general-newspaper",
      scope: "state",
      primaryJurisdictionIds: [state.id],
      mediums: ["text"],
      beats: ["general-assignment"],
      resourceTier: "standard",
      cadence: "daily",
      acceptsDeepBackground: false,
      establishedAt: date,
      policyVersion: PRESS_POLICY_VERSION,
      provenanceNote: "Authored bilateral fixture",
    });
    world = saved.world;
    outlets.push(saved.record);
    world = appendPressRecord(world, "outlet-ownership", {
      stableKey: `fixture:holding:${index}`,
      outletId: saved.record.id,
      ownerId: practiceEffect === "acquire-outlet" ? seller.id : buyer.id,
      basis: "founding-owner",
      effectiveAt: date,
      eventId: null,
      supersedesOwnershipId: null,
    }).world;
    if (scenario !== "missing-books") {
      // Fixture snapshot uses the existing saved books schema; no history array is rewritten.
      world = {
        ...world,
        townFinances: {
          version: "town-finances-v1",
          banks: {},
          markets: {},
          businesses: {
            ...world.townFinances?.businesses,
            [organizationId]: {
              organizationId,
              openedAt: date,
              cash: 100,
              debt: 100,
              annualRevenue: 1200,
              kind: "information",
              capacity: 1200,
              annualOtherCosts: 1200,
              margin: 0,
              ownDemandLog: 0,
              openingShare: 1,
              openingMarketSales: 1200,
              bankId: null,
              lineLimit: 0,
              lastQuarterNet: -300,
              lastQuarterPay: 300,
              lastRound: "2026-Q1",
            },
          },
        },
      };
    }
  }
  world = scheduleFutureDueItem(world, {
    stableKey: `${buyer.stableKey}:review:0`,
    dueAt: addDays(date, 1),
    transitionKey: PRESS_OWNER_REVIEW_TRANSITION_KEY,
    entityIds: [buyerOrganizationId],
    jurisdictionId: null,
    provenance: { kind: "initialization", reference: "press46/v1" },
  });
  const due = world.history.futureDueItems.at(-1)!;
  world = {
    ...world,
    currentDate: due.dueAt,
    currentMoment: simulationMomentOnLocalDate(world.currentMoment, due.dueAt),
  };
  return { world, registry, buyer, seller, outlets, due };
}

describe("A145 bilateral acquisition consumes saved principals, books and funding", () => {
  it.each(places)(
    "records both decisions, payment and ownership through reload in %s",
    (usps) => {
      const f = fixture(usps);
      const oldHolding = currentOutletOwnership(f.world, f.outlets[0]!.id)!;
      const after = pressOwnerReviewHandler(f.world, f.due, f.registry).world;
      assertWorldIntegrity(after);
      expect(outletOwner(after, f.outlets[0]!.id)?.id).toBe(f.buyer.id);
      const holding = currentOutletOwnership(after, f.outlets[0]!.id)!;
      expect(holding.supersedesOwnershipId).toBe(oldHolding.id);
      expect(holding.basis).toBe("acquisition");
      expect(
        resourcePositionAt(
          after,
          { kind: "organization", organizationId: f.buyer.organizationId },
          USD,
        )?.liquidBalance.minorUnits,
      ).toBe(100_000_000);
      expect(
        resourcePositionAt(
          after,
          { kind: "organization", organizationId: f.seller.organizationId },
          USD,
        )?.liquidBalance.minorUnits,
      ).toBe(100_000_000);
      expect(
        after.history.decisionTraces.length -
          f.world.history.decisionTraces.length,
      ).toBe(2);
      expect(
        after.history.resourceTransferOutcomes.length -
          f.world.history.resourceTransferOutcomes.length,
      ).toBe(1);
      expect(
        after.history.events.find((event) => event.id === holding.eventId)
          ?.type,
      ).toBe("press.owner.acquisition");
      const payload = serializeWorld(after);
      const loaded = deserializeWorld(payload);
      expect(serializeWorld(loaded)).toBe(payload);
      expect(outletOwner(loaded, f.outlets[0]!.id)?.id).toBe(f.buyer.id);
      expect(pressOwnerReviewHandler(loaded, f.due, f.registry).world).toBe(
        loaded,
      );
    },
  );
  it.each([
    "missing-buyer-principal",
    "missing-seller-principal",
    "missing-books",
    "missing-cash",
    "missing-price",
    "insufficient-cash",
    "multiple-sales",
  ] as const)("omits acquisition for %s", (scenario) => {
    const f = fixture(places[0]!, scenario);
    const after = pressOwnerReviewHandler(f.world, f.due, f.registry).world;
    for (const outlet of f.outlets)
      expect(outletOwner(after, outlet.id)?.id).toBe(f.seller.id);
    expect(after.history.resourceTransferOutcomes).toBe(
      f.world.history.resourceTransferOutcomes,
    );
    expect(
      after.history.events.filter(
        (event) => event.type === "press.owner.acquisition",
      ),
    ).toEqual([]);
    assertWorldIntegrity(after);
  });
});

describe("A145 recorded owner practice replaces likelihood", () => {
  it.each(places)(
    "applies a saved sharing preference with zero likelihood in %s",
    (usps) => {
      const f = fixture(usps, "ready", "share-content-across-outlets");
      const after = pressOwnerReviewHandler(f.world, f.due, f.registry).world;
      assertWorldIntegrity(after);
      expect(
        after.history.decisionTraces.length -
          f.world.history.decisionTraces.length,
      ).toBe(1);
      expect(
        after.history.events.some(
          (event) => event.type === "press.owner.directive",
        ),
      ).toBe(true);
      const loaded = deserializeWorld(serializeWorld(after));
      expect(pressOwnerReviewHandler(loaded, f.due, f.registry).world).toBe(
        loaded,
      );
    },
  );
  it("leaves missing principals and controlled principals pending", () => {
    for (const missing of [true, false]) {
      const f = fixture(
        places[0]!,
        missing ? "missing-buyer-principal" : "ready",
        "share-content-across-outlets",
      );
      const before = missing
        ? f.world
        : {
            ...f.world,
            control: {
              kind: "person" as const,
              personId: f.buyer.principalPersonId!,
            },
          };
      const after = pressOwnerReviewHandler(before, f.due, f.registry).world;
      expect(after.history.decisionTraces).toBe(before.history.decisionTraces);
      expect(after.history.events).toBe(before.history.events);
      assertWorldIntegrity(after);
    }
  });
});
