import { expect, it } from "vitest";
import {
  transitAppropriationFixture as appropriation,
  transitTerminationFixture,
} from "../../tests/fixtures/transit-service-fixture";
import { advanceWorld, assertWorldIntegrity } from "./world";
import { addDays, daysBetween } from "./dates";
import { createFutureTransitionHandlerRegistry } from "./future-transitions";
import { deserializeWorld, serializeWorld } from "./serialization";
import { resolveTransitFunding } from "./transit-funding";
import {
  requestTransitImplementation,
  createTransitTransitionRegistry,
  cancelTransitImplementation,
  deliverTransitStage,
  TRANSIT_DELIVERY_KEY,
  transitDueState,
  publishTransitReport,
  type TransitPaymentWriter,
} from "./transit-service";
import type { World } from "./types";

function operative(f = appropriation()) {
  return {
    ...f,
    world: advanceWorld(
      f.world,
      daysBetween(f.world.currentDate, f.availableAt),
      createFutureTransitionHandlerRegistry([]),
    ),
  };
}
const refuse: TransitPaymentWriter = (world) => ({
  kind: "refused",
  world,
  reason: "No actual public cash account.",
});

it("does not confuse a proposal with operative funding, or substitute Kentucky", () => {
  const f = appropriation();
  expect(resolveTransitFunding(f.world, f.measureId)).toEqual({
    kind: "unavailable",
    reason: `This appropriation takes effect on ${f.availableAt}.`,
  });
  const before = serializeWorld(f.world);
  expect(() => requestTransitImplementation(f.world, f)).toThrow(
    /takes effect/,
  );
  expect(serializeWorld(f.world)).toBe(before);
  const ready = operative(f);
  const funding = resolveTransitFunding(ready.world, ready.measureId);
  expect(funding.kind).toBe("available");
  if (funding.kind === "available") {
    expect(
      ready.world.jurisdictions[funding.mandate.jurisdictionId]!.name,
    ).toMatch(/Alaska/);
    expect(funding.mandate.administrativeEventId).toBe(
      ready.world.history.legislativeEnactments!.find(
        (e) => e.measureId === f.measureId,
      )!.outcomeEventId,
    );
  }
});
it("freezes two separate exact service forecasts, without cash, effects, or publication", () => {
  const f = operative();
  const world = requestTransitImplementation(f.world, f);
  expect(
    world.history.policyEstimates.filter((e) =>
      e.stableKey.startsWith("transit-request:"),
    ),
  ).toHaveLength(2);
  expect(world.history.effectActivations).toHaveLength(0);
  expect(world.history.resourceTransferOutcomes).toEqual(
    f.world.history.resourceTransferOutcomes,
  );
  expect(world.history.publications ?? []).toEqual(
    f.world.history.publications ?? [],
  );
  expect(
    world.history.knowledge.filter((k) =>
      k.stableKey.includes("transit-request:"),
    ),
  ).toHaveLength(2);
  expect(() => requestTransitImplementation(world, f)).toThrow(/already/);
  assertWorldIntegrity(deserializeWorld(serializeWorld(world)));
});
it("a due period with no cash creates no payment, service effect, or extra units", () => {
  const f = operative();
  const requested = requestTransitImplementation(f.world, f);
  const world = advanceWorld(
    requested,
    14,
    createTransitTransitionRegistry(refuse),
  );
  const due = world.history.futureDueItems.find(
    (d) => d.transitionKey === TRANSIT_DELIVERY_KEY,
  )!;
  expect(transitDueState(world, due.id).status).toBe("blocked");
  expect(world.history.policyRealizations.at(-1)!.status).toBe("blocked");
  expect(world.history.effectActivations).toHaveLength(0);
  expect(world.history.metricStates).toHaveLength(0);
  expect(world.history.resourceTransferOutcomes).toEqual(
    f.world.history.resourceTransferOutcomes,
  );
  expect(deliverTransitStage(world, due, refuse).world).toBe(world);
  expect(world.history.publications ?? []).toHaveLength(0);
  const eventId = world.history.events.find(
    (e) => e.type === "transit.service-period-settled",
  )!.id;
  const published = publishTransitReport(world, {
    personId: f.personId,
    eventId,
  });
  expect(published.history.publications!.at(-1)!.body).toContain(
    "not delivered",
  );
  expect(() =>
    publishTransitReport(published, { personId: f.personId, eventId }),
  ).toThrow(/already/);
});
it("cancels future delivery while preserving prior blocked history through save/reopen", () => {
  {
    const f = operative(appropriation());
    const requested = requestTransitImplementation(f.world, f);
    const first = advanceWorld(
      requested,
      14,
      createTransitTransitionRegistry(refuse),
    );
    const cancelled = cancelTransitImplementation(
      deserializeWorld(serializeWorld(first)),
      f,
    );
    const later = advanceWorld(
      cancelled,
      30,
      createTransitTransitionRegistry(refuse),
    );
    expect(
      later.history.futureDueItems
        .filter((d) => d.transitionKey === TRANSIT_DELIVERY_KEY)
        .map((d) => transitDueState(later, d.id).status),
    ).toEqual(["blocked", "cancelled"]);
    expect(later.history.policyRealizations).toEqual(
      first.history.policyRealizations,
    );
    expect(later.history.workItemStates.at(-1)!.status).toBe("completed");
    expect(deserializeWorld(serializeWorld(later))).toEqual(later);
  }
});
it("refuses changed adopted terms, wrong actors, expired authority", () => {
  const f = operative();
  const before = serializeWorld(f.world);
  const other = f.world.personOrder.find((id) => id !== f.personId)!;
  expect(() =>
    requestTransitImplementation(f.world, { ...f, personId: other }),
  ).toThrow(/controlled sponsor/);
  const edited: World = {
    ...f.world,
    history: {
      ...f.world.history,
      legislativeProvisions: f.world.history.legislativeProvisions!.map((p) =>
        p.measureId === f.measureId &&
        p.provisionKey === "administrative-mandate"
          ? { ...p, text: "No administrative implementation mandate." }
          : p,
      ),
    },
  };
  expect(resolveTransitFunding(edited, f.measureId).kind).toBe("unavailable");
  const expired = advanceWorld(
    f.world,
    366,
    createFutureTransitionHandlerRegistry([]),
  );
  expect(resolveTransitFunding(expired, f.measureId)).toEqual({
    kind: "unavailable",
    reason: "The transit appropriation has expired.",
  });
  expect(serializeWorld(f.world)).toBe(before);
});

it("reads the canonical terminating source's operative and expiration dates without inventing an unresolved date", () => {
  const base = appropriation();
  const ending = transitTerminationFixture(
    base,
    addDays(base.world.currentDate, 10),
  );
  const ready = advanceWorld(
    ending.world,
    daysBetween(ending.world.currentDate, base.availableAt),
    createFutureTransitionHandlerRegistry([]),
  );
  expect(resolveTransitFunding(ready, base.measureId).kind).toBe("available");
  const expired = advanceWorld(
    ready,
    daysBetween(ready.currentDate, addDays(ending.endsOn, 1)),
    createFutureTransitionHandlerRegistry([]),
  );
  expect(resolveTransitFunding(expired, base.measureId)).toEqual({
    kind: "unavailable",
    reason:
      "The transit funding authority has expired under its recorded termination.",
  });
  expect(() => requestTransitImplementation(expired, base)).toThrow(
    /recorded termination/,
  );
  const unknown = transitTerminationFixture(base, null);
  const operativeUnknown = advanceWorld(
    unknown.world,
    daysBetween(unknown.world.currentDate, base.availableAt),
    createFutureTransitionHandlerRegistry([]),
  );
  expect(resolveTransitFunding(operativeUnknown, base.measureId)).toEqual({
    kind: "unavailable",
    reason:
      "A recorded terminating authority has an unresolved operative date.",
  });
  expect(() => requestTransitImplementation(operativeUnknown, base)).toThrow(
    /unresolved operative date/,
  );
  expect(expired.history.resourceTransferOutcomes).toEqual(
    base.world.history.resourceTransferOutcomes,
  );
  expect(expired.history.effectActivations).toHaveLength(0);
  assertWorldIntegrity(deserializeWorld(serializeWorld(expired)));
});
