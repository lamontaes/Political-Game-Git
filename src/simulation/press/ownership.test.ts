import { describe, expect, it } from "vitest";

import {
  GAME_ADULT_CANDIDACY_AGE,
  advanceWorld,
  ageOnDate,
  createCampaignElectionTransitionRegistry,
  createScenarioWorld,
  deserializeWorld,
  serializeWorld,
} from "../index";
import { KENTUCKY_CONTEXT } from "../legislation-scenarios";
import type { EntityId, World } from "../types";
import { resourcePositionAt } from "../resource-queries";
import { createResourcePosition, makeCurrencyCode, money } from "../resources";
import { assertWorldIntegrity, recordWorldEvent } from "../world";
import {
  DEFAULT_MEDIA_OWNERSHIP_PACK,
  MEDIA_ACTIVE_ASSIGNMENT_CAPACITY,
  PRESS_OWNER_REVIEW_TRANSITION_KEY,
  assignStory,
  latestDisposition,
  outletAssignmentCapacity,
  recordStoryLead,
  sharingSiblings,
  storyLeads,
  currentOutletOwnership,
  describeOwnershipLoad,
  ensureMediaOwnership,
  ensurePressMediaOpening,
  ensurePressStateCoverage,
  loadOwnershipPacks,
  mediaOutlets,
  mediaOwners,
  outletOwner,
  outletsHeldBy,
  ownerDirectives,
  outletPurchaseTerms,
  pressOwnerReviewHandler,
  projectPressDesk,
  purchaseOutlet,
  reporterIsCurrent,
  reporterRoles,
  type OwnershipOwnerRow,
  type OwnershipPack,
  type OwnershipPracticeRow,
  type OwnershipRegistry,
} from "./index";
import { ensurePressOpening } from "./transitions";

const KY = KENTUCKY_CONTEXT.jurisdiction.id;

function withOutlets(seed: string): { world: World; playerId: EntityId } {
  const created = createScenarioWorld(seed, KENTUCKY_CONTEXT, {
    peopleCount: 5,
  });
  const playerId = created.personOrder.find(
    (id) =>
      ageOnDate(created.people[id]!.birthDate, created.currentDate) >=
      GAME_ADULT_CANDIDACY_AGE,
  )!;
  const base: World = {
    ...created,
    control: { kind: "person", personId: playerId },
  };
  return {
    world: ensurePressStateCoverage(
      ensurePressMediaOpening(base, playerId),
      KY,
    ),
    playerId,
  };
}

const PROVENANCE = {
  kind: "authored-fiction",
  note: "Test ownership pack.",
} as const;

/** One chain that may hold everything, plus independents it can buy. */
function chainPack(
  effect: string,
  parameters?: OwnershipPracticeRow["parameters"],
): OwnershipPack {
  return {
    id: "test.chain",
    provenance: PROVENANCE,
    practices: [
      {
        key: "practice.under-test",
        effect,
        likelihoodPerReview: 1,
        description: "Did the thing under test to every outlet it owns.",
        ...(parameters ? { parameters } : {}),
      },
    ],
    owners: [
      {
        key: "owner.chain",
        ownerKind: "private-equity",
        names: ["Test Chain Capital"],
        holds: {},
        foundingWeight: 1,
        reviewEveryDays: 91,
        sellsOutlets: false,
        practices: ["practice.under-test"],
      },
    ],
  };
}

function review(world: World, ownerName: string, registry: OwnershipRegistry) {
  const owner = mediaOwners(world).find((entry) => entry.name === ownerName)!;
  const dueItem = world.history.futureDueItems.find(
    (item) =>
      item.transitionKey === PRESS_OWNER_REVIEW_TRANSITION_KEY &&
      item.stableKey.startsWith(`${owner.stableKey}:review:`),
  )!;
  return pressOwnerReviewHandler(world, dueItem, registry);
}

describe("media ownership packs", () => {
  it("loads the shipped pack cleanly and names what is not simulated yet", () => {
    const registry = loadOwnershipPacks([DEFAULT_MEDIA_OWNERSHIP_PACK]);
    expect(registry.report.rejections).toEqual([]);
    expect(registry.owners.length).toBeGreaterThanOrEqual(4);
    expect(
      registry.report.notYetSimulated.map((entry) => entry.effect).sort(),
    ).toEqual(["consolidate-newsrooms", "coordinate-editorial-line"]);
    expect(describeOwnershipLoad(registry.report)).toContain(
      "is not simulated yet",
    );
  });

  it("skips a bad row by name with its reason, and lets a later pack replace a row", () => {
    const registry = loadOwnershipPacks([
      chainPack("reduce-newsroom-staff"),
      {
        id: "test.mod",
        provenance: PROVENANCE,
        practices: [
          {
            key: "practice.broken",
            effect: "reduce-newsroom-staff",
            likelihoodPerReview: 2,
            description: "Impossible odds.",
          },
        ],
        owners: [
          {
            key: "owner.chain",
            ownerKind: "family-chain",
            names: ["Replacement Family Papers"],
            holds: {},
            foundingWeight: 1,
            reviewEveryDays: 182,
            sellsOutlets: true,
            practices: [],
          },
          {
            key: "owner.dangling",
            ownerKind: "family-chain",
            names: ["Nobody"],
            holds: {},
            foundingWeight: 1,
            reviewEveryDays: 182,
            sellsOutlets: true,
            practices: ["practice.nowhere"],
          },
        ],
      },
      {
        id: "test.shared-name",
        provenance: PROVENANCE,
        owners: [
          {
            key: "owner.shared",
            ownerKind: "family-chain",
            names: ["{outlet} Holdings"],
            holds: {},
            foundingWeight: 1,
            reviewEveryDays: 182,
            sellsOutlets: true,
            practices: [],
          },
        ],
      },
      // A pack arrives as modder data; one that omits its provenance must be
      // refused by the loader, so the type is deliberately bypassed here.
      { id: "test.unsaid", provenance: undefined as never },
    ]);
    const reasons = registry.report.rejections.map(
      (entry) => `${entry.pack} ${entry.where}: ${entry.reason}`,
    );
    expect(reasons).toEqual([
      "test.mod practices[0] practice.broken: has a likelihood outside 0 to 1",
      'test.mod owners[1] owner.dangling: uses the practice "practice.nowhere", which no pack loaded before it declares',
      "test.shared-name owners[0] owner.shared: names {outlet} but is not per-outlet, so one outlet's name would stick to every holding",
      "test.unsaid provenance: the pack does not say whether it is authored fiction or sourced, so none of its rows load",
    ]);
    expect(registry.report.replaced).toEqual([
      { key: "owner.chain", by: "test.mod" },
    ]);
    expect(registry.owners.map((row) => row.names[0])).toEqual([
      "Replacement Family Papers",
    ]);
  });
});

describe("founding owners by product", () => {
  function owner(
    key: string,
    weights: OwnershipOwnerRow["foundingWeightByProduct"],
  ): OwnershipOwnerRow {
    return {
      key,
      ownerKind: "family-chain",
      names: [key],
      holds: {},
      foundingWeight: 0,
      foundingWeightByProduct: weights,
      reviewEveryDays: 182,
      sellsOutlets: false,
      practices: [],
    };
  }

  it("uses an owner's weight for the outlet's product, and skips a weight it cannot read", () => {
    const registry = loadOwnershipPacks([
      {
        id: "test.by-product",
        provenance: PROVENANCE,
        owners: [
          owner("owner.newsroom-only", { "state-newsroom": 1 }),
          owner("owner.everything-else", {
            "general-newspaper": 1,
            "public-affairs-broadcaster": 1,
            "politics-publication": 1,
            "community-outlet": 1,
          }),
          owner("owner.unknown-product", { "town-crier": 1 } as never),
          owner("owner.negative", { "state-newsroom": -1 }),
        ],
      },
    ]);
    expect(
      registry.report.rejections.map(
        (entry) => `${entry.where}: ${entry.reason}`,
      ),
    ).toEqual([
      'owners[2] owner.unknown-product: weights the unknown product "town-crier"',
      'owners[3] owner.negative: has a negative founding weight for "state-newsroom"',
    ]);
    const { world } = withOutlets("ownership-by-product");
    const owned = ensureMediaOwnership(world, registry);
    const outlets = mediaOutlets(owned);
    expect(outlets.some((outlet) => outlet.product === "state-newsroom")).toBe(
      true,
    );
    for (const outlet of outlets) {
      expect(outletOwner(owned, outlet.id)!.name).toBe(
        outlet.product === "state-newsroom"
          ? "owner.newsroom-only"
          : "owner.everything-else",
      );
    }
  });
});

describe("media owners", () => {
  it("gives every outlet an owner at the opening, the same way every time", () => {
    const { world, playerId } = withOutlets("ownership-opening");
    const opened = ensurePressOpening(world, playerId);
    for (const outlet of mediaOutlets(opened)) {
      expect(outletOwner(opened, outlet.id)).not.toBeNull();
    }
    const again = ensurePressOpening(world, playerId);
    expect(
      mediaOutlets(again).map((outlet) => outletOwner(again, outlet.id)!.name),
    ).toEqual(
      mediaOutlets(opened).map(
        (outlet) => outletOwner(opened, outlet.id)!.name,
      ),
    );
    expect(ensureMediaOwnership(opened)).toBe(opened);
    assertWorldIntegrity(opened);
  });

  it("cuts newsroom jobs across every outlet one owner holds, in one decision", () => {
    const registry = loadOwnershipPacks([
      chainPack("reduce-newsroom-staff", {
        shareOfPositions: 0.5,
        minimumPositionsKept: 1,
      }),
    ]);
    const { world } = withOutlets("ownership-layoffs");
    const owned = ensureMediaOwnership(world, registry);
    const owner = mediaOwners(owned)[0]!;
    const held = outletsHeldBy(owned, owner.id);
    expect(held.length).toBe(mediaOutlets(owned).length);
    const before = reporterRoles(owned).filter((role) =>
      reporterIsCurrent(owned, role),
    );

    const result = review(owned, "Test Chain Capital", registry);
    const after = result.world;
    assertWorldIntegrity(after);

    const [directive] = ownerDirectives(after, owner.id);
    expect(directive).toMatchObject({ simulated: true });
    const cut = before.filter((role) => !reporterIsCurrent(after, role));
    expect(cut.length).toBe(Math.floor(before.length * 0.5));
    expect(directive!.endedWorkRelationshipIds).toEqual(
      cut.map((role) => role.workRelationshipId),
    );
    // Spread across outlets: every outlet keeps at least one reporter, and
    // more than one outlet lost somebody.
    for (const outlet of held) {
      expect(
        reporterRoles(after, outlet.id).some((role) =>
          reporterIsCurrent(after, role),
        ),
      ).toBe(true);
    }
    expect(new Set(cut.map((role) => role.outletId)).size).toBeGreaterThan(1);
    const summary = after.history.events.find(
      (event) => event.id === directive!.eventId,
    )!.summary;
    expect(summary).toBe(
      `Test Chain Capital eliminated ${cut.length} newsroom positions across ${new Set(cut.map((role) => role.outletId)).size} outlets it owns.`,
    );
    // Each person who lost a job has it in their own history.
    for (const role of cut) {
      expect(
        after.history.events.some(
          (event) =>
            event.type === "press.reporter-position-eliminated" &&
            event.participants.some(
              (participant) => participant.personId === role.personId,
            ),
        ),
      ).toBe(true);
    }
    // Each outlet now works fewer stories at once, in step with the reporters
    // it kept, and none drops to nothing while somebody is left.
    for (const outlet of held) {
      const roles = reporterRoles(after, outlet.id);
      const kept = roles.filter((role) => reporterIsCurrent(after, role));
      const full = MEDIA_ACTIVE_ASSIGNMENT_CAPACITY[outlet.resourceTier];
      expect(outletAssignmentCapacity(after, outlet)).toBe(
        Math.min(full, Math.ceil((full * kept.length) / roles.length)),
      );
      expect(outletAssignmentCapacity(owned, outlet)).toBe(full);
    }
    expect(
      held.some(
        (outlet) =>
          outletAssignmentCapacity(after, outlet) <
          MEDIA_ACTIVE_ASSIGNMENT_CAPACITY[outlet.resourceTier],
      ),
    ).toBe(true);
    // The owner reviews again on its own cadence.
    expect(
      after.history.futureDueItems.some((item) =>
        item.stableKey.endsWith(":review:1"),
      ),
    ).toBe(true);
  });

  it("buys an outlet from an owner that sells, and the sale supersedes the old holding", () => {
    const pack = chainPack("acquire-outlet");
    const independent = {
      key: "owner.independent",
      ownerKind: "independent",
      names: ["{outlet} Publishing Company"],
      perOutlet: true,
      holds: {
        products: [
          "general-newspaper",
          "public-affairs-broadcaster",
          "state-newsroom",
        ],
      },
      foundingWeight: 1,
      reviewEveryDays: 365,
      sellsOutlets: true,
      practices: [],
    } as const;
    // At founding the chain may hold only the politics publication and every
    // other outlet goes to an independent owner of its own.
    const founding = loadOwnershipPacks([
      {
        ...pack,
        owners: [
          {
            ...pack.owners![0]!,
            holds: { products: ["politics-publication"] },
          },
          independent,
        ],
      },
    ]);
    // By its first review the chain may buy anything.
    const later = loadOwnershipPacks([
      { ...pack, owners: [pack.owners![0]!, independent] },
    ]);
    const { world } = withOutlets("ownership-buyout");
    const owned = ensureMediaOwnership(world, founding);
    const chain = mediaOwners(owned).find(
      (owner) => owner.name === "Test Chain Capital",
    )!;
    expect(outletsHeldBy(owned, chain.id).length).toBe(1);

    const after = review(owned, "Test Chain Capital", later).world;
    assertWorldIntegrity(after);
    const [directive] = ownerDirectives(after);
    expect(directive).toMatchObject({ simulated: true });
    const bought = directive!.outletIds[0]!;
    const holding = currentOutletOwnership(after, bought)!;
    expect(holding.basis).toBe("acquisition");
    expect(holding.supersedesOwnershipId).toBe(
      currentOutletOwnership(owned, bought)!.id,
    );
    expect(outletOwner(after, bought)!.id).toBe(chain.id);
    expect(outletsHeldBy(after, chain.id).length).toBe(2);
    expect(
      after.history.events.find((event) => event.id === directive!.eventId)!
        .summary,
    ).toMatch(/^Test Chain Capital bought .+ from .+ Publishing Company\.$/u);
  });

  it("records a practice the engine cannot carry out yet, and changes nothing else", () => {
    const registry = loadOwnershipPacks([
      chainPack("coordinate-editorial-line"),
    ]);
    const { world } = withOutlets("ownership-blanket");
    const owned = ensureMediaOwnership(world, registry);
    const result = review(owned, "Test Chain Capital", registry);
    const after = result.world;
    assertWorldIntegrity(after);
    const [directive] = ownerDirectives(after);
    expect(directive).toMatchObject({
      simulated: false,
      effect: "coordinate-editorial-line",
      endedWorkRelationshipIds: [],
      ownershipId: null,
    });
    expect(directive!.outletIds.length).toBe(mediaOutlets(after).length);
    expect(
      reporterRoles(after).filter((role) => reporterIsCurrent(after, role))
        .length,
    ).toBe(
      reporterRoles(owned).filter((role) => reporterIsCurrent(owned, role))
        .length,
    );
  });

  it("runs a story in the owner's other outlets, credited, only where it is relevant", () => {
    const registry = loadOwnershipPacks([
      chainPack("share-content-across-outlets"),
    ]);
    const { world } = withOutlets("ownership-sharing");
    const owned = ensureMediaOwnership(world, registry);
    const ordered = review(owned, "Test Chain Capital", registry).world;
    assertWorldIntegrity(ordered);
    expect(ownerDirectives(ordered)[0]).toMatchObject({
      simulated: true,
      effect: "share-content-across-outlets",
    });
    const origin = mediaOutlets(ordered).find(
      (outlet) => outlet.product === "general-newspaper",
    )!;
    expect(sharingSiblings(ordered, origin.id).length).toBe(
      mediaOutlets(ordered).length - 1,
    );
    // A statement with no place: every national outlet's audience, and no
    // state newsroom's.
    const said = recordWorldEvent(ordered, {
      stableKey: "ownership-test:statement",
      type: "civic.public-statement",
      occurredAt: ordered.currentDate,
      recordedAt: ordered.currentDate,
      jurisdictionId: null,
      involvedEntityIds: [ordered.personOrder[0]!],
      participants: [],
      personFactConstraints: [],
      visibility: "public",
      tags: [],
      summary: "A national commission issued its annual report.",
      context: {
        location: null,
        socialContext: null,
        pressure: null,
        choice: null,
        motivation: null,
        immediateReaction: null,
      },
    });
    const basis = said.history.events.at(-1)!;
    const lead = recordStoryLead(said, {
      stableKey: "ownership-test:lead",
      outletId: origin.id,
      family: "scheduled-beat",
      route: "public-record",
      basisEventIds: [basis.id],
      subjectPersonIds: [],
      jurisdictionId: null,
      matterId: null,
      followsPublicationId: null,
    });
    let after = assignStory(lead.world, lead.lead.id);
    const handlers = createCampaignElectionTransitionRegistry();
    for (let day = 0; day < 3; day += 1) {
      after = advanceWorld(after, 1, handlers);
    }
    assertWorldIntegrity(after);
    expect(latestDisposition(after, lead.lead.id)!.decision).toBe("published");
    const original = (after.history.publications ?? []).find(
      (publication) => publication.outletKey === `media:${origin.id}`,
    )!;
    const shared = storyLeads(after).filter(
      (other) => other.route === "owner-shared",
    );
    const national = mediaOutlets(after).filter(
      (outlet) => outlet.scope === "national" && outlet.id !== origin.id,
    );
    expect(shared.map((other) => other.outletId).sort()).toEqual(
      national.map((outlet) => outlet.id).sort(),
    );
    for (const copy of shared) {
      expect(latestDisposition(after, copy.id)).toMatchObject({
        decision: "published",
        reasonKey: "press:shared-by-owner",
        reporterPersonId: null,
      });
      const publication = (after.history.publications ?? []).find(
        (candidate) =>
          candidate.id === latestDisposition(after, copy.id)!.publicationId,
      )!;
      expect(publication.outletKey).toBe(`media:${copy.outletId}`);
      expect(publication.headline).toBe(original.headline);
      expect(publication.body).toContain(original.body);
      expect(publication.body).toContain(`for ${origin.name}.`);
    }
    // Before the order, the same outlet shares with nobody.
    expect(sharingSiblings(owned, origin.id)).toEqual([]);
    // An order an older save recorded as changing nothing still changes
    // nothing.
    const recordedAsInert: World = {
      ...ordered,
      history: {
        ...ordered.history,
        pressRecords: (ordered.history.pressRecords ?? []).map((record) =>
          record.kind === "owner-directive"
            ? { ...record, simulated: false }
            : record,
        ),
      },
    };
    expect(sharingSiblings(recordedAsInert, origin.id)).toEqual([]);
  });

  it("stops reviewing, and says so, when the owner's pack is no longer loaded", () => {
    const registry = loadOwnershipPacks([chainPack("reduce-newsroom-staff")]);
    const { world } = withOutlets("ownership-unloaded");
    const owned = ensureMediaOwnership(world, registry);
    const result = review(owned, "Test Chain Capital", loadOwnershipPacks([]));
    expect(result.status).toBe("cancelled");
    expect(result.context).toContain("no longer reviews its outlets");
    expect(result.world).toBe(owned);
  });

  it("survives a save round trip", () => {
    const registry = loadOwnershipPacks([
      chainPack("reduce-newsroom-staff", { shareOfPositions: 0.5 }),
    ]);
    const { world } = withOutlets("ownership-save");
    const after = review(
      ensureMediaOwnership(world, registry),
      "Test Chain Capital",
      registry,
    ).world;
    const loaded = deserializeWorld(serializeWorld(after));
    assertWorldIntegrity(loaded);
    expect(ownerDirectives(loaded)).toEqual(ownerDirectives(after));
    expect(
      mediaOutlets(loaded).map((outlet) => outletOwner(loaded, outlet.id)?.id),
    ).toEqual(
      mediaOutlets(after).map((outlet) => outletOwner(after, outlet.id)?.id),
    );
  });
});

describe("a person buying an outlet", () => {
  const USD = makeCurrencyCode("USD");
  const pack: OwnershipPack = {
    id: "test.market",
    provenance: PROVENANCE,
    askingPriceDollars: {
      small: 100_000,
      standard: 1_000_000,
      major: 50_000_000,
    },
    owners: [
      {
        key: "owner.independent",
        ownerKind: "independent",
        names: ["{outlet} Publishing Company"],
        perOutlet: true,
        holds: { products: ["general-newspaper", "state-newsroom"] },
        foundingWeight: 1,
        reviewEveryDays: 365,
        sellsOutlets: true,
        practices: [],
      },
      {
        key: "owner.keeper",
        ownerKind: "private-equity",
        names: ["Never Sells Capital"],
        holds: {
          products: ["public-affairs-broadcaster", "politics-publication"],
        },
        foundingWeight: 1,
        reviewEveryDays: 91,
        sellsOutlets: false,
        practices: [],
      },
    ],
  };
  const registry = loadOwnershipPacks([pack]);

  function market(savingsDollars: number | null) {
    const { world, playerId } = withOutlets("ownership-purchase");
    let next = ensureMediaOwnership(world, registry);
    if (savingsDollars !== null) {
      next = createResourcePosition(next, {
        stableKey: "test:savings",
        owner: { kind: "person", personId: playerId },
        openedAt: next.currentDate,
        openingBalance: money(savingsDollars * 100, USD),
        provenance: { kind: "authored", note: "Test savings." },
      });
    }
    const forSale = mediaOutlets(next).find(
      (outlet) => outlet.product === "state-newsroom",
    )!;
    const kept = mediaOutlets(next).find(
      (outlet) => outlet.product === "politics-publication",
    )!;
    return { world: next, playerId, forSale, kept };
  }

  it("pays the seller from the buyer's savings and makes the buyer the owner", () => {
    const { world, playerId, forSale } = market(2_000_000);
    const terms = outletPurchaseTerms(world, playerId, forSale.id, registry);
    expect(terms).toMatchObject({
      status: "available",
      priceMinorUnits: 100_000_000,
    });
    const seller = outletOwner(world, forSale.id)!;
    const after = purchaseOutlet(
      world,
      { stableKey: "test:buy", buyerPersonId: playerId, outletId: forSale.id },
      registry,
    );
    assertWorldIntegrity(after);
    const owner = outletOwner(after, forSale.id)!;
    expect(owner.principalPersonId).toBe(playerId);
    expect(owner.ownerKind).toBe("individual");
    expect(currentOutletOwnership(after, forSale.id)).toMatchObject({
      basis: "acquisition",
      supersedesOwnershipId: currentOutletOwnership(world, forSale.id)!.id,
    });
    expect(
      resourcePositionAt(after, { kind: "person", personId: playerId }, USD)!
        .liquidBalance.minorUnits,
    ).toBe(100_000_000);
    const paid = after.history.resourceFlows.at(-1)!;
    expect(paid.recipient).toEqual({
      kind: "organization",
      organizationId: seller.organizationId,
    });
    expect(
      outletPurchaseTerms(after, playerId, forSale.id, registry).status,
    ).toBe("already-yours");
    // Nobody else can buy it from the player: a person's outlet is not for sale.
    const rival = after.personOrder.find((id) => id !== playerId)!;
    expect(outletPurchaseTerms(after, rival, forSale.id, registry).status).toBe(
      "not-for-sale",
    );
    const loaded = deserializeWorld(serializeWorld(after));
    assertWorldIntegrity(loaded);
    expect(outletOwner(loaded, forSale.id)!.principalPersonId).toBe(playerId);
  });

  it("refuses, and changes nothing, where the owner keeps it or the money is short or unknown", () => {
    const rich = market(2_000_000);
    expect(
      outletPurchaseTerms(rich.world, rich.playerId, rich.kept.id, registry),
    ).toMatchObject({
      status: "not-for-sale",
      reason: expect.stringContaining("Never Sells Capital is not selling"),
    });

    const poor = market(50_000);
    expect(
      outletPurchaseTerms(poor.world, poor.playerId, poor.forSale.id, registry)
        .status,
    ).toBe("cannot-afford");

    const unknown = market(null);
    expect(
      outletPurchaseTerms(
        unknown.world,
        unknown.playerId,
        unknown.forSale.id,
        registry,
      ).status,
    ).toBe("savings-not-on-record");
    expect(() =>
      purchaseOutlet(
        unknown.world,
        {
          stableKey: "test:buy",
          buyerPersonId: unknown.playerId,
          outletId: unknown.forSale.id,
        },
        registry,
      ),
    ).toThrow("Your savings are not on record");
  });

  it("shows the viewer on the press desk what an outlet would cost", () => {
    const { world, playerId, forSale } = market(2_000_000);
    const desk = projectPressDesk(world, playerId);
    // The desk reads the build's own pack, so this checks the wiring, not a
    // price: every outlet carries purchase terms for the viewer.
    for (const outlet of desk.outlets) {
      expect(outlet.purchase.outletId).toBe(outlet.outletId);
    }
    expect(desk.outlets.some((outlet) => outlet.outletId === forSale.id)).toBe(
      true,
    );
  });
});
