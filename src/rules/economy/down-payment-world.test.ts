import { describe, it, expect } from "vitest";
import { smallWorld } from "../../../tests/fixtures/small-world";
import { STATES } from "../../simulation/state-reference";
import { createOrganization } from "../../simulation/life";
import {
  createDwelling,
  createHousingTenure,
  createResourcePosition,
  createResourceFlow,
  createResourceObligation,
  recordResourceTransferOutcome,
  money,
} from "../../simulation/resources";
import { makeIsoDate } from "../../simulation/dates";
import {
  homeDownPaymentShare as nativeDown,
  homeBuyerKind as nativeBuyer,
} from "../../simulation/home-down-payment";
import { homeDownPaymentShare, homeBuyerKind } from "./down-payments";
import { downFacts } from "./test-support/housing-facts";
const seed = "rules2:economy:down-payment-native-writer";
const provenance = {
  kind: "authored" as const,
  note: "Controlled completed native-writer purchase sample, not an empirical loan offer or ordinary NPC purchase.",
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
describe("economy completed same-purchase down-payment KEEP math", () => {
  for (const usps of Object.keys(STATES))
    it(usps, () => {
      const base = smallWorld({
        place: "US-" + usps,
        date: "2026-01-01",
        seed,
      });
      for (const buyer of ["first-time", "repeat"] as const)
        expect(homeDownPaymentShare(downFacts(base.world), buyer)).toEqual(
          nativeDown(base.world, buyer),
        );
      for (const placeholder of [false, true]) {
        const { world, personId } = purchase(
          "US-" + usps,
          25000,
          75000,
          placeholder,
        );
        const facts = downFacts(world);
        for (const buyer of ["first-time", "repeat"] as const)
          expect(homeDownPaymentShare(facts, buyer)).toEqual(
            nativeDown(world, buyer),
          );
        if (!placeholder)
          expect(
            homeDownPaymentShare(facts, "first-time").recordIds.length,
          ).toBeGreaterThan(0);
        for (const before of [world.currentDate, makeIsoDate("2026-01-02")])
          expect(homeBuyerKind(facts, personId, before)).toEqual(
            nativeBuyer(world, personId, before),
          );
      }
    });
});
