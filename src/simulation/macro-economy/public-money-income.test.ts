import { describe, expect, it } from "vitest";
import { smallWorld } from "../../../tests/fixtures/small-world";
import {
  lifePlaceStateIdentities,
  stateJurisdictionForKey,
} from "../life-places";
import { SeededRng, pickDistinct } from "../rng";
import { createOrganization } from "../life";
import {
  createResourceFlow,
  money,
  recordResourceTransferOutcome,
} from "../resources";
import { recordWorldEvent } from "../world";
import {
  recordWorldMetricState,
  worldMetricDefinitionByStableKey,
} from "../world-metrics";
import { makeIsoDate } from "../dates";
import { serializeWorld, deserializeWorld } from "../serialization";
import type { World, EntityId, ResourceFlowBasisKind } from "../types";
import { PUBLIC_MONEY_ORIGIN_READER } from "./sources";
import { createProductionWorldMetricCatalog } from "../production-catalog";

const seed = "team4-a64-exact-income-20261002";
const catalog = lifePlaceStateIdentities();
const places = pickDistinct(new SeededRng(seed), catalog, 3);
const provenance = {
  kind: "authored" as const,
  note: "Controlled saved state-month income fixture, not ordinary producer coverage.",
};
const date = makeIsoDate("2026-01-15");
const through = makeIsoDate("2026-02-02");

function payment(
  world: World,
  state: EntityId,
  personId: EntityId,
  amount: number,
  kind: ResourceFlowBasisKind = "custom:authorized-public-payment",
) {
  const key = `a64-income:${kind}:${world.history.nextSequence}`;
  let next = createOrganization(world, {
    stableKey: `${key}:government`,
    formedAt: date,
    provenance,
    initialProfile: {
      name: "Recorded payment fixture",
      classification: "sector:government",
      locationJurisdictionId: state,
    },
  });
  const organizationId = next.history.organizations.at(-1)!.id;
  next = recordWorldEvent(next, {
    stableKey: `${key}:event`,
    type: "fiscal.public-payment",
    occurredAt: date,
    recordedAt: date,
    jurisdictionId: state,
    involvedEntityIds: [organizationId],
    participants: [],
    personFactConstraints: [],
    visibility: "public",
    tags: ["fiscal"],
    summary: "Saved public money fixture.",
    context: {
      location: null,
      socialContext: null,
      pressure: null,
      choice: null,
      motivation: null,
      immediateReaction: null,
    },
  });
  const eventId = next.history.events.at(-1)!.id;
  next = createResourceFlow(next, {
    stableKey: `${key}:flow`,
    source: { kind: "organization", organizationId },
    recipient: { kind: "person", personId },
    startsAt: date,
    amount: money(amount, "USD"),
    cadenceKind: "schedule:once",
    basisKind: kind,
    basisReference: { kind: "general" },
    restrictionKind: null,
    jurisdictionId: state,
    provenance: { kind: "simulated-event", eventId },
  });
  return recordResourceTransferOutcome(next, {
    stableKey: `${key}:paid`,
    resourceFlowId: next.history.resourceFlows.at(-1)!.id,
    periodStartsAt: date,
    periodEndsAt: date,
    occurredAt: date,
    status: "completed",
    attemptedAmount: money(amount, "USD"),
    transferredAmount: money(amount, "USD"),
    reasonKind: null,
    note: null,
    provenance: { kind: "simulated-event", eventId },
  });
}

function income(
  world: World,
  state: EntityId,
  amount: number,
  overrides: {
    metric?: string;
    start?: string;
    end?: string;
    currency?: string;
    recordedAt?: string;
    segment?: "labor.workers" | null;
  } = {},
) {
  const metric = worldMetricDefinitionByStableKey(
    world,
    overrides.metric ?? "income.aggregate-personal",
  );
  const scope = {
    jurisdictionId: state,
    segmentKey: overrides.segment ?? null,
  };
  const referencePeriod = {
    kind: "interval" as const,
    startsAt: makeIsoDate(overrides.start ?? "2026-01-01"),
    endsAt: makeIsoDate(overrides.end ?? "2026-01-31"),
  };
  const previous = world.history.metricStates
    .filter(
      (row) =>
        row.metricId === metric.id &&
        row.scope.jurisdictionId === state &&
        row.scope.segmentKey === scope.segmentKey &&
        JSON.stringify(row.referencePeriod) === JSON.stringify(referencePeriod),
    )
    .at(-1);
  return recordWorldMetricState(world, {
    stableKey: `a64-income:metric:${world.history.nextSequence}`,
    metricId: metric.id,
    scope,
    referencePeriod,
    value: { kind: "money", money: money(amount, overrides.currency ?? "USD") },
    recordedAt: overrides.recordedAt ?? "2026-01-31",
    provenance,
    supersedesStateId: previous?.id ?? null,
  });
}

describe.each(places)("A64 recorded income in $jurisdictionKey", (place) => {
  function fixture(amount = 20000) {
    expect(catalog).toHaveLength(56);
    const small = smallWorld({
      place: place.jurisdictionKey,
      seed,
      date: through,
    });
    const state = stateJurisdictionForKey(place.jurisdictionKey)!.id;
    return {
      ...small,
      state,
      world: payment(small.world, state, small.personId, amount),
    };
  }
  it(`uses the exact saved state-month total and preserves receipts/reload (seed ${seed})`, () => {
    const f = fixture();
    const world = income(f.world, f.state, 100000);
    const before = serializeWorld(world);
    const origins = PUBLIC_MONEY_ORIGIN_READER.origins(
      deserializeWorld(before),
      through,
    );
    expect(origins).toHaveLength(1);
    expect(origins[0]).toMatchObject({
      intensity: 0.2,
      scope: `jurisdiction:${f.state}`,
      beginsAt: date,
      kind: "public-spending-paid",
    });
    expect(serializeWorld(world)).toBe(before);
    expect(PUBLIC_MONEY_ORIGIN_READER.origins(world, through)).toEqual(origins);
    expect(
      PUBLIC_MONEY_ORIGIN_READER.origins(
        income(world, f.state, 200000),
        through,
      )[0]!.intensity,
    ).toBe(0.1);
  });
  it(`preserves completed payments when the production catalog has no personal-income definition (seed ${seed})`, () => {
    const f = fixture();
    const world = {
      ...f.world,
      metricCatalog: createProductionWorldMetricCatalog(),
    };
    const before = serializeWorld(world);
    expect(world.history.resourceTransferOutcomes.at(-1)?.status).toBe(
      "completed",
    );
    expect(PUBLIC_MONEY_ORIGIN_READER.origins(world, through)).toEqual([]);
    const loaded = deserializeWorld(before);
    expect(PUBLIC_MONEY_ORIGIN_READER.origins(loaded, through)).toEqual([]);
    expect(serializeWorld(world)).toBe(before);
    expect(loaded.history.resourceTransferOutcomes).toEqual(
      world.history.resourceTransferOutcomes,
    );
  });
  it(`aggregates actual paid receipts by channel and retains small shares (seed ${seed})`, () => {
    const f = fixture(1);
    let world = payment(f.world, f.state, f.personId, 2);
    world = payment(world, f.state, f.personId, 10000, "custom:tax-collection");
    world = income(world, f.state, 10000000);
    const origins = PUBLIC_MONEY_ORIGIN_READER.origins(world, through);
    expect(origins).toHaveLength(2);
    expect(
      origins.find((row) => row.kind === "public-spending-paid")!.intensity,
    ).toBe(3 / 10000000);
    expect(
      origins.find((row) => row.kind === "tax-collections-paid")!.intensity,
    ).toBe(0.001);
  });
  it(`bounds a recorded payment share at the macro intensity limit (seed ${seed})`, () => {
    const f = fixture(200000);
    const world = income(f.world, f.state, 100000);
    expect(
      PUBLIC_MONEY_ORIGIN_READER.origins(world, through)[0]!.intensity,
    ).toBe(1);
  });
  it.each([
    "missing",
    "labor",
    "zero",
    "currency",
    "annual",
    "month",
    "segment",
    "scope",
    "future",
  ] as const)(
    `rejects incompatible %s totals without $50m or annual/12 (seed ${seed})`,
    (kind) => {
      const f = fixture();
      let world = f.world;
      if (kind === "zero") world = income(world, f.state, 0);
      if (kind === "labor")
        world = income(world, f.state, 100000, {
          metric: "labor.aggregate-income",
        });
      if (kind === "currency")
        world = income(world, f.state, 100000, { currency: "EUR" });
      if (kind === "annual")
        world = income(world, f.state, 1200000, {
          start: "2025-01-01",
          end: "2025-12-31",
        });
      if (kind === "month")
        world = income(world, f.state, 100000, {
          start: "2025-12-01",
          end: "2025-12-31",
        });
      if (kind === "segment")
        world = income(world, f.state, 100000, { segment: "labor.workers" });
      if (kind === "scope") world = income(world, f.jurisdictionId, 100000);
      if (kind === "future")
        world = income(world, f.state, 100000, { recordedAt: "2026-02-02" });
      expect(
        PUBLIC_MONEY_ORIGIN_READER.origins(
          world,
          kind === "future" ? makeIsoDate("2026-02-01") : through,
        ),
      ).toEqual([]);
    },
  );
});
