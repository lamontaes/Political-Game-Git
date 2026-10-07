import { describe, expect, it } from "vitest";
import { smallWorld } from "../../tests/fixtures/small-world";
import { lifePlaceStateIdentities } from "./life-places";
import { SeededRng, pickDistinct } from "./rng";
import { createOrganization } from "./life";
import {
  createDwelling,
  createHousingTenure,
  createResourcePosition,
  createResourceFlow,
  createResourceObligation,
  recordResourceTransferOutcome,
  money,
} from "./resources";
import { makeIsoDate } from "./dates";
import { homeBuyerKind, homeDownPaymentShare } from "./home-down-payment";
import { serializeWorld, deserializeWorld } from "./serialization";

const seed = "a53-nar2025-and-recorded-loans";
const catalog = lifePlaceStateIdentities();
const places = pickDistinct(new SeededRng(seed), catalog, 5);
const provenance = {
  kind: "authored" as const,
  note: "Controlled recorded A53 purchase fixture; not an empirical loan offer",
};
function purchase(
  place: string,
  down: number,
  principal: number,
  placeholder = false,
) {
  const sample = smallWorld({ place, seed, date: "2026-01-01" });
  let world = createOrganization(sample.world, {
    stableKey: "a53-seller",
    formedAt: worldDate(sample.world),
    initialProfile: {
      name: "Controlled fixture seller",
      classification: "enterprise:finance",
      locationJurisdictionId: sample.jurisdictionId,
    },
    provenance,
  });
  const organizationId = world.history.organizations.at(-1)!.id;
  world = createDwelling(world, {
    stableKey: "a53-home",
    establishedAt: world.currentDate,
    jurisdictionId: sample.jurisdictionId,
    classification: "residential:house",
    locationLabel: "Controlled fixture home",
    provenance,
  });
  world = createHousingTenure(world, {
    stableKey: "a53-tenure",
    holder: { kind: "person", personId: sample.personId },
    dwellingId: world.history.dwellings.at(-1)!.id,
    startedAt: world.currentDate,
    kind: "ownership:mortgaged",
    context: "Controlled recorded purchase",
    provenance,
  });
  const tenureId = world.history.housingTenures.at(-1)!.id;
  const borrower = { kind: "person" as const, personId: sample.personId };
  const recipient = { kind: "organization" as const, organizationId };
  world = createResourcePosition(world, {
    stableKey: "a53-cash",
    owner: borrower,
    openingBalance: money(down, "USD"),
    openedAt: world.currentDate,
    provenance,
  });
  world = createResourcePosition(world, {
    stableKey: "a53-seller-cash",
    owner: recipient,
    openingBalance: money(0, "USD"),
    openedAt: world.currentDate,
    provenance,
  });
  world = createResourceFlow(world, {
    stableKey: "a53-recorded:down-payment",
    source: borrower,
    recipient,
    startsAt: world.currentDate,
    initialStatus: "active",
    amount: money(down, "USD"),
    cadenceKind: "schedule:one-time",
    basisKind: "custom:home-down-payment",
    basisReference: { kind: "general" },
    restrictionKind: null,
    jurisdictionId: sample.jurisdictionId,
    provenance,
  });
  world = recordResourceTransferOutcome(world, {
    stableKey: "a53-recorded:paid",
    resourceFlowId: world.history.resourceFlows.at(-1)!.id,
    periodStartsAt: world.currentDate,
    periodEndsAt: world.currentDate,
    occurredAt: world.currentDate,
    status: "completed",
    attemptedAmount: money(down, "USD"),
    transferredAmount: money(down, "USD"),
    reasonKind: null,
    note: "Controlled purchase paid",
    provenance,
  });
  world = createResourceFlow(world, {
    stableKey: "a53-recorded:mortgage",
    source: borrower,
    recipient,
    startsAt: world.currentDate,
    initialStatus: "active",
    amount: money(1, "USD"),
    cadenceKind: "schedule:monthly",
    basisKind: "housing:mortgage",
    basisReference: { kind: "general" },
    restrictionKind: null,
    jurisdictionId: sample.jurisdictionId,
    provenance,
  });
  world = createResourceObligation(world, {
    stableKey: "a53-recorded:mortgage:debt",
    resourceFlowId: world.history.resourceFlows.at(-1)!.id,
    establishedAt: world.currentDate,
    basisKind: "housing:mortgage",
    principal: money(principal, "USD"),
    housingTenureId: tenureId,
    careResponsibilityId: null,
    provenance: placeholder
      ? { kind: "authored", note: "Placeholder home purchase pending research" }
      : provenance,
  });
  return { world, personId: sample.personId };
}
function worldDate(world: { currentDate: ReturnType<typeof makeIsoDate> }) {
  return world.currentDate;
}

describe("A53 sourced opening down payments and recorded game averages", () => {
  it("uses the complete 56-place catalog", () =>
    expect(catalog).toHaveLength(56));
  for (const place of places) {
    it(`keeps NAR first-time and repeat medians separate (${place.jurisdictionKey})`, () => {
      const { world } = smallWorld({ place: place.jurisdictionKey, seed });
      expect(homeDownPaymentShare(world, "first-time")).toMatchObject({
        share: 0.1,
        basis: "sourced-opening-median",
      });
      expect(homeDownPaymentShare(world, "repeat")).toMatchObject({
        share: 0.23,
        basis: "sourced-opening-median",
      });
    });
    it(`reads actual completed same-purchase amounts, stays pure and reloads (${place.jurisdictionKey})`, () => {
      const { world, personId } = purchase(
        place.jurisdictionKey,
        25_000,
        75_000,
      );
      const before = serializeWorld(world);
      expect(homeDownPaymentShare(world, "first-time")).toMatchObject({
        share: 0.25,
        basis: "recorded-game-average",
      });
      expect(
        homeDownPaymentShare(world, "first-time").recordIds.length,
      ).toBeGreaterThan(0);
      expect(homeDownPaymentShare(world, "repeat").share).toBe(0.23);
      expect(serializeWorld(world)).toBe(before);
      expect(
        homeDownPaymentShare(deserializeWorld(before), "first-time"),
      ).toEqual(homeDownPaymentShare(world, "first-time"));
      expect(
        homeBuyerKind(
          { ...world, currentDate: makeIsoDate("2026-01-02") },
          personId,
        ),
      ).toBe("repeat");
    });
    it(`does not turn old placeholder loans into a market average (${place.jurisdictionKey})`, () => {
      const { world } = purchase(place.jurisdictionKey, 25_000, 75_000, true);
      expect(homeDownPaymentShare(world, "first-time")).toMatchObject({
        share: 0.1,
        basis: "sourced-opening-median",
        recordIds: [],
      });
    });
  }
});
