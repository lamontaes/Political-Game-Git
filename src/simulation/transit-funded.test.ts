import { expect, it } from "vitest";
import {
  enactedTaxFixture,
  TEST_TAX_TERMS,
} from "../../tests/fixtures/tax-policy-fixture";
import { transitAppropriationFixture } from "../../tests/fixtures/transit-service-fixture";
import { declarePersonalTaxOccurrence } from "../presentation/tax-work";
import { advanceWorld, assertWorldIntegrity } from "./world";
import { addDays, daysBetween, simulationMomentAtLocalTime } from "./dates";
import { createCampaignElectionTransitionRegistry } from "./campaigns";
import { resourcePositionAt } from "./resource-queries";
import { publicTaxAccountForJurisdiction } from "./tax-policy";
import { money } from "./resources";
import {
  requestTransitImplementation,
  cancelTransitImplementation,
  deliverTransitStage,
  transitDueState,
  TRANSIT_DELIVERY_KEY,
  publishTransitReport,
} from "./transit-service";
import { settlePublicResourcePayment } from "./public-fiscal";
import { resolveTransitFunding } from "./transit-funding";
import { serializeWorld, deserializeWorld } from "./serialization";
import { createScheduledActivity, cancelScheduledActivity } from "./time-work";
import { passOrdinaryDays } from "../presentation/ordinary-life";

// Canonical writer/consumer proof with explicit authored procedural inputs.
// Not ordinary election/enactment proof and not a supplied public-budget fixture.
function fixture(opening = 10_000, baseAmount = 200_100) {
  const tax = enactedTaxFixture(opening);
  const f = transitAppropriationFixture({
    world: tax.world,
    personId: tax.personId,
    procedure: tax.procedure,
  });
  let world = advanceWorld(
    f.world,
    daysBetween(f.world.currentDate, f.availableAt),
    createCampaignElectionTransitionRegistry(),
  );
  const account = publicTaxAccountForJurisdiction(
    world,
    world.history.taxProposals![0]!.jurisdictionId,
  )!;
  expect(
    resourcePositionAt(
      world,
      { kind: "organization", organizationId: account.organizationId },
      money(0, "USD").currency,
    )!.liquidBalance.minorUnits,
  ).toBe(0);
  world = declarePersonalTaxOccurrence(world, {
    personId: f.personId,
    stableKey: "transit-proof:occurrence",
    proposalId: tax.proposalId,
    baseKey: TEST_TAX_TERMS.baseKey,
    amountMinorUnits: baseAmount,
    assumptionNote:
      "Explicit fictional taxable occurrence. Creates no income, purchase or public cash; only the existing due tax transfer moves money.",
  });
  return { ...f, world, account };
}
it("uses F's actual collected receipt for one paid physical service period, then preserves partial delivery on cancellation/reopen", () => {
  const f = fixture();
  let world = requestTransitImplementation(f.world, f);
  world = advanceWorld(world, 14, createCampaignElectionTransitionRegistry());
  const due = world.history.futureDueItems.filter(
    (d) => d.transitionKey === TRANSIT_DELIVERY_KEY,
  );
  expect(transitDueState(world, due[0]!.id).status).toBe("resolved");
  expect(
    world.history.taxCollections!.at(-1)!.transferredAmount.minorUnits,
  ).toBe(10_000);
  const payments = world.history.resourceFlows.filter(
    (flow) => flow.basisReference.kind === "public-funding",
  );
  expect(payments).toHaveLength(1);
  expect(payments[0]!.source).toEqual({
    kind: "organization",
    organizationId: f.account.organizationId,
  });
  expect(world.history.policyRealizations).toHaveLength(1);
  expect(world.history.effectActivations).toHaveLength(1);
  expect(world.history.metricStates.at(-1)!.value).toMatchObject({
    kind: "quantity",
    quantity: {
      numerator: 1,
      denominator: 1,
      unit: "duration:vehicle-service-hour",
    },
  });
  expect(
    resourcePositionAt(
      world,
      { kind: "organization", organizationId: f.account.organizationId },
      money(0, "USD").currency,
    )!.liquidBalance.minorUnits,
  ).toBe(0);
  const paymentReference = payments[0]!.basisReference;
  if (paymentReference.kind !== "public-funding")
    throw new Error("Missing canonical funding reference.");
  const repeatPayment = settlePublicResourcePayment(
    world,
    {
      fundingId: paymentReference.mandate.fundingId,
      measureId: f.measureId,
      expectedProvisionIds: paymentReference.mandate.provisionIds,
      operationKey: due[0]!.id,
      requestedAmount: money(10_000, "USD"),
      recipient: payments[0]!.recipient,
    },
    resolveTransitFunding,
  );
  expect(repeatPayment.kind).toBe("paid");
  expect(repeatPayment.world).toBe(world);
  const once = serializeWorld(world);
  expect(
    deliverTransitStage(world, due[0]!, settlePublicResourcePayment).world,
  ).toBe(world);
  world = cancelTransitImplementation(deserializeWorld(once), f);
  world = advanceWorld(
    deserializeWorld(serializeWorld(world)),
    30,
    createCampaignElectionTransitionRegistry(),
  );
  expect(due.map((d) => transitDueState(world, d.id).status)).toEqual([
    "resolved",
    "cancelled",
  ]);
  expect(
    world.history.resourceFlows.filter(
      (flow) => flow.basisReference.kind === "public-funding",
    ),
  ).toEqual(payments);
  expect(world.history.policyRealizations).toHaveLength(1);
  expect(world.history.effectActivations).toHaveLength(1);
  const settlement = world.history.events.find(
    (e) => e.type === "transit.service-period-settled",
  )!;
  world = publishTransitReport(world, {
    personId: f.personId,
    eventId: settlement.id,
  });
  expect(world.history.events.at(-1)!.involvedEntityIds).toContain(
    world.history.policyRealizations[0]!.id,
  );
  expect(world.history.publications!.at(-1)!.body).toContain(
    "Delivered 1 vehicle-service hour of added contract service",
  );
  expect(world.history.publications!.at(-1)!.body).toContain(
    "paid with $100.00 from the public account",
  );
  assertWorldIntegrity(deserializeWorld(serializeWorld(world)));
});
it("refuses a fabricated canonical due payload before any payment or effect", () => {
  const f = fixture();
  const world = requestTransitImplementation(f.world, f);
  const due = world.history.futureDueItems.find(
    (d) => d.transitionKey === TRANSIT_DELIVERY_KEY,
  )!;
  const before = serializeWorld(world);
  expect(() =>
    deliverTransitStage(
      world,
      { ...due, stableKey: "forged" },
      settlePublicResourcePayment,
    ),
  ).toThrow(/exact canonical due/);
  expect(serializeWorld(world)).toBe(before);
});

it("delivers two separately paid completion records without duplicate spending or effects", () => {
  const f = fixture(20_000, 400_100);
  const requested = requestTransitImplementation(f.world, f);
  const world = advanceWorld(
    requested,
    28,
    createCampaignElectionTransitionRegistry(),
  );
  const due = world.history.futureDueItems.filter(
    (d) => d.transitionKey === TRANSIT_DELIVERY_KEY,
  );
  expect(due.map((d) => transitDueState(world, d.id).status)).toEqual([
    "resolved",
    "resolved",
  ]);
  expect(
    world.history.resourceFlows.filter(
      (f) => f.basisReference.kind === "public-funding",
    ),
  ).toHaveLength(2);
  expect(world.history.policyRealizations).toHaveLength(2);
  expect(world.history.effectActivations).toHaveLength(2);
  expect(
    world.history.metricStates.filter((s) =>
      s.stableKey.endsWith(":delivered"),
    ),
  ).toHaveLength(2);
  expect(world.history.workItemStates.at(-1)!.status).toBe("completed");
  const reopened = deserializeWorld(serializeWorld(world));
  const later = advanceWorld(
    reopened,
    10,
    createCampaignElectionTransitionRegistry(),
  );
  expect(later.history.resourceTransferOutcomes).toEqual(
    world.history.resourceTransferOutcomes,
  );
  expect(later.history.effectActivations).toEqual(
    world.history.effectActivations,
  );
});
it("preserves insufficient collected public cash when the full contract period cannot be paid", () => {
  const f = fixture(5_000, 100_100);
  const requested = requestTransitImplementation(f.world, f);
  const world = advanceWorld(
    requested,
    14,
    createCampaignElectionTransitionRegistry(),
  );
  const due = world.history.futureDueItems.find(
    (d) => d.transitionKey === TRANSIT_DELIVERY_KEY,
  )!;
  expect(
    world.history.taxCollections!.at(-1)!.transferredAmount.minorUnits,
  ).toBe(5_000);
  expect(transitDueState(world, due.id).status).toBe("blocked");
  expect(
    world.history.policyImplementationProfiles
      .at(-1)!
      .factors.find((f) => f.kind === "authority")!.reasonKey,
  ).toBe("transit:operative-mandate");
  expect(
    world.history.resourceFlows.filter(
      (f) => f.basisReference.kind === "public-funding",
    ),
  ).toHaveLength(0);
  expect(world.history.effectActivations).toHaveLength(0);
  expect(
    resourcePositionAt(
      world,
      { kind: "organization", organizationId: f.account.organizationId },
      money(0, "USD").currency,
    )!.liquidBalance.minorUnits,
  ).toBe(5_000);
  assertWorldIntegrity(deserializeWorld(serializeWorld(world)));
});

it("the ordinary player clock stops at a confirmed appointment before transit delivery and resumes after its canonical cancellation", () => {
  const f = fixture();
  let world = requestTransitImplementation(f.world, f);
  const moment = (minuteOfDay: number) =>
    simulationMomentAtLocalTime({
      date: addDays(world.currentDate, 13),
      minuteOfDay,
      timeZone: world.currentMoment.timeZone,
      preferredUtcOffsetMinutes: world.currentMoment.utcOffsetMinutes,
    });
  const start = moment(12 * 60),
    end = moment(13 * 60);
  world = createScheduledActivity(world, {
    stableKey: "transit-proof:confirmed-appointment",
    title: "Authored appointment",
    summary: "Explicit protected appointment for clock interruption proof.",
    kind: "confirmed",
    start,
    end,
    participantPersonIds: [f.personId],
    responsiblePersonId: f.personId,
    location: {
      locationKey: "transit-proof:appointment",
      label: "Authored appointment location",
      jurisdictionId: world.jurisdictionOrder[0]!,
    },
    sourceEntityIds: [
      world.history.events.find(
        (e) => e.stableKey === `transit-request:${f.measureId}`,
      )!.id,
    ],
    flexibility: { kind: "fixed" },
    access: { kind: "private", personIds: [f.personId] },
  });
  const activityId = world.history.scheduledActivities.at(-1)!.id;
  const stopped = passOrdinaryDays(world, 30);
  expect(stopped.currentMoment).toEqual(start);
  expect(
    stopped.history.futureDueItems
      .filter((d) => d.transitionKey === TRANSIT_DELIVERY_KEY)
      .map((d) => transitDueState(stopped, d.id).status),
  ).toEqual(["scheduled", "scheduled"]);
  expect(stopped.history.effectActivations).toHaveLength(0);
  expect(
    stopped.history.resourceFlows.filter(
      (f) => f.basisReference.kind === "public-funding",
    ),
  ).toHaveLength(0);
  const resumed = passOrdinaryDays(
    cancelScheduledActivity(
      deserializeWorld(serializeWorld(stopped)),
      activityId,
    ),
    1,
  );
  expect(resumed.history.policyRealizations).toHaveLength(1);
  expect(resumed.history.effectActivations).toHaveLength(1);
  assertWorldIntegrity(deserializeWorld(serializeWorld(resumed)));
});

it("keeps concurrent appropriations' paid completion scopes separate on the same date", () => {
  const first = fixture(20_000, 400_100);
  const receiptDue = first.world.history.futureDueItems.find(
    (d) => d.transitionKey === "tax:collect-assessment",
  )!;
  const collected = advanceWorld(
    first.world,
    daysBetween(first.world.currentDate, receiptDue.dueAt),
    createCampaignElectionTransitionRegistry(),
  );
  const second = transitAppropriationFixture(
    {
      world: collected,
      personId: first.personId,
      procedure: first.procedure,
    },
    20_000,
    "weekday",
    2,
  );
  let world = advanceWorld(
    second.world,
    daysBetween(second.world.currentDate, second.availableAt),
    createCampaignElectionTransitionRegistry(),
  );
  world = requestTransitImplementation(world, first);
  world = requestTransitImplementation(world, second);
  world = advanceWorld(world, 14, createCampaignElectionTransitionRegistry());
  expect(
    world.history.resourceFlows.filter(
      (f) => f.basisReference.kind === "public-funding",
    ),
  ).toHaveLength(2);
  expect(world.history.effectActivations).toHaveLength(2);
  const delivered = world.history.metricStates.filter((s) =>
    s.stableKey.endsWith(":delivered"),
  );
  expect(delivered).toHaveLength(2);
  expect(new Set(delivered.map((s) => s.scope.segmentKey)).size).toBe(2);
  for (const state of delivered)
    expect(state.value).toMatchObject({
      kind: "quantity",
      quantity: { numerator: 1, denominator: 1 },
    });
  world = cancelTransitImplementation(world, first);
  world = cancelTransitImplementation(world, second);
  assertWorldIntegrity(deserializeWorld(serializeWorld(world)));
});

it("the shared legislative hearing clock settles the existing transit due item without implicit spending on the new bill", () => {
  const first = fixture(20_000, 400_100);
  let world = requestTransitImplementation(first.world, first);
  world = advanceWorld(world, 10, createCampaignElectionTransitionRegistry());
  const nextBill = transitAppropriationFixture(
    { world, personId: first.personId, procedure: first.procedure },
    20_000,
    "weekend",
    2,
  );
  world = nextBill.world;
  const due = world.history.futureDueItems.filter(
    (d) => d.transitionKey === TRANSIT_DELIVERY_KEY,
  );
  expect(due.map((d) => transitDueState(world, d.id).status)).toEqual([
    "resolved",
    "scheduled",
  ]);
  const payments = world.history.resourceFlows.filter(
    (f) => f.basisReference.kind === "public-funding",
  );
  expect(payments).toHaveLength(1);
  expect(payments[0]!.basisReference).toMatchObject({
    kind: "public-funding",
    mandate: { measureId: first.measureId },
  });
  expect(world.history.effectActivations).toHaveLength(1);
  expect(world.history.metricStates.at(-1)!.referencePeriod).toEqual({
    kind: "point",
    at: due[0]!.dueAt,
  });
  expect(
    world.history.events.some(
      (e) => e.stableKey === `transit-request:${nextBill.measureId}`,
    ),
  ).toBe(false);
  world = cancelTransitImplementation(world, first);
  expect(
    world.history.resourceFlows.filter(
      (f) => f.basisReference.kind === "public-funding",
    ),
  ).toEqual(payments);
  assertWorldIntegrity(deserializeWorld(serializeWorld(world)));
});
