import { describe, expect, it } from "vitest";
import { smallWorld } from "../../../tests/fixtures/small-world";
import { STATES } from "../state-reference";
import { daysBetween } from "../dates";
import { futureDueItemStateAt } from "../future-transitions";
import {
  ensureRentDaySchedule,
  hudRentRowFor,
  RENT_DAY_TRANSITION_KEY,
  startTownLeases,
  townLeases,
} from "../living-world/town-rent";
import { createDwelling, createHousingTenure } from "../resources";
import { createHousehold, startHouseholdMembership } from "../life";
import { deserializeWorld, serializeWorld } from "../serialization";
import { composeWorldTimeHandlers } from "../campaigns";
import { advanceWorld } from "../world";
import type { FutureDueItem, World } from "../types";

const SEED = "team4-m10-scheduled-rent-entry-20261001";
const PLACES = Object.keys(STATES);
const PROVENANCE = {
  kind: "authored" as const,
  note: "Controlled scheduled-rent proof using the shared small-world fixture.",
};

function scheduledRentWorld(place: string): {
  readonly world: World;
  readonly due: FutureDueItem;
  readonly lease: ReturnType<typeof townLeases>[number];
} {
  const small = smallWorld({
    place,
    seed: `${SEED}:${place}`,
    date: "2026-01-31",
    people: 3,
  });
  expect(hudRentRowFor(small.jurisdictionId), `place=${place}`).toBeDefined();
  let world = createHousehold(small.world, {
    stableKey: `fixture:${place}:tenant-household`,
    formedAt: small.world.currentDate,
    label: "Recorded rental household",
    provenance: PROVENANCE,
  });
  const householdId = world.history.households.at(-1)!.id;
  world = startHouseholdMembership(world, {
    stableKey: `fixture:${place}:tenant-member`,
    personId: small.personId,
    householdId,
    startedAt: world.currentDate,
    residenceRole: "primary",
    kind: "resident:member",
    provenance: PROVENANCE,
  });
  world = createDwelling(world, {
    stableKey: `fixture:${place}:rental-home`,
    establishedAt: small.world.currentDate,
    jurisdictionId: small.jurisdictionId,
    locationLabel: "Recorded rental home",
    classification: "residential:house",
    provenance: PROVENANCE,
  });
  const dwellingId = world.history.dwellings.at(-1)!.id;
  world = createHousingTenure(world, {
    stableKey: `fixture:${place}:tenant`,
    holder: { kind: "household", householdId },
    dwellingId,
    startedAt: world.currentDate,
    kind: "lease:rented",
    context: null,
    provenance: PROVENANCE,
  });
  const tenantTenureId = world.history.housingTenures.at(-1)!.id;
  world = createHousingTenure(world, {
    stableKey: `fixture:${place}:owner`,
    holder: { kind: "person", personId: small.world.personOrder[1]! },
    dwellingId,
    startedAt: world.currentDate,
    kind: "ownership:owned",
    context: null,
    provenance: PROVENANCE,
  });
  world = startTownLeases(world, world.currentDate);
  const lease = townLeases(world).find(
    (record) => record.tenureId === tenantTenureId,
  );
  expect(lease, `place=${place} seed=${SEED}:${place}`).toBeDefined();
  world = ensureRentDaySchedule(world);
  const due = world.history.futureDueItems.find(
    (item) =>
      item.transitionKey === RENT_DAY_TRANSITION_KEY &&
      futureDueItemStateAt(world, item.id, {
        asOfDate: world.currentDate,
        historySequenceExclusive: world.history.nextSequence,
      })?.status === "scheduled",
  );
  expect(due).toBeDefined();
  return { world, due: due!, lease: lease! };
}

describe("scheduled rent proof across all jurisdictions", () => {
  it("keeps all 56 state, district and territory cases in the gate", () => {
    expect(PLACES).toHaveLength(56);
  });
});

describe.each(PLACES)("scheduled rent day in %s", (place) => {
  it("collects the saved lease through the admitted clock and replays it", () => {
    const { world, due, lease } = scheduledRentWorld(place);
    const days = daysBetween(world.currentDate, due.dueAt);
    expect(days).toBeGreaterThan(0);
    const before = deserializeWorld(serializeWorld(world));
    const advanced = advanceWorld(world, days, composeWorldTimeHandlers());
    expect(advanced.currentDate).toBe(due.dueAt);
    expect(
      futureDueItemStateAt(advanced, due.id, {
        asOfDate: advanced.currentDate,
        historySequenceExclusive: advanced.history.nextSequence,
      }),
    ).toMatchObject({ status: "resolved", reasonKey: "rent-day:collected" });
    const outcome = advanced.history.resourceTransferOutcomes.find(
      (record) =>
        record.resourceFlowId === lease.flow.id &&
        record.periodStartsAt === due.dueAt,
    );
    expect(outcome).toBeDefined();
    expect(outcome!.attemptedAmount.minorUnits).toBeGreaterThan(0);
    const nextDue = advanced.history.futureDueItems.find(
      (item) =>
        item.transitionKey === RENT_DAY_TRANSITION_KEY &&
        item.dueAt > due.dueAt &&
        futureDueItemStateAt(advanced, item.id, {
          asOfDate: advanced.currentDate,
          historySequenceExclusive: advanced.history.nextSequence,
        })?.status === "scheduled",
    );
    expect(nextDue).toBeDefined();
    const replayed = advanceWorld(before, days, composeWorldTimeHandlers());
    expect(serializeWorld(replayed)).toBe(serializeWorld(advanced));
  });
});
