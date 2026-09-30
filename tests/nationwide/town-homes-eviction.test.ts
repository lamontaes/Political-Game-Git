import { describe, expect, it } from "vitest";
import { createDemoWorld } from "../../src/simulation/demo";
import {
  addDays,
  ageOnDate,
  simulationMomentOnLocalDate,
} from "../../src/simulation/dates";
import {
  createHousehold,
  recordHouseholdLocation,
  startHouseholdMembership,
  recordHouseholdMembershipState,
} from "../../src/simulation/life";
import {
  createDwelling,
  startDwellingOccupancy,
  recordDwellingOccupancyState,
} from "../../src/simulation/resources";
import { activeDwellingOccupanciesAt } from "../../src/simulation/resource-queries";
import {
  assertWorldIntegrity,
  recordWorldEvent,
} from "../../src/simulation/world";
import {
  recordEvictionDestination,
  reviewTownHomes,
  TOWN_HOMES_VERSION,
  EVICTION_DESTINATION_TYPE,
} from "../../src/simulation/living-world/town-homes";
import type { EntityId, World } from "../../src/simulation/types";

function fixture() {
  let world = createDemoWorld("eviction-destination-fixture");
  const personId = world.personOrder.find(
    (id) => ageOnDate(world.people[id]!.birthDate, world.currentDate) >= 18,
  )!;
  const town = world.people[personId]!.homeJurisdictionId;
  const provenance = {
    kind: "authored" as const,
    note: "Eviction destination regression fixture.",
  };
  world = createHousehold(world, {
    stableKey: "fixture:household",
    label: "Fixture household",
    formedAt: world.currentDate,
    provenance,
  });
  const householdId = world.history.households.at(-1)!.id;
  for (const membership of world.history.householdMemberships.filter(
    (row) => row.personId === personId,
  )) {
    const state = world.history.householdMembershipStates
      .filter((row) => row.membershipId === membership.id)
      .at(-1)!;
    if (state.status === "ended" || state.residenceRole !== "primary") continue;
    world = recordHouseholdMembershipState(world, {
      stableKey: `fixture:end:${membership.id}`,
      membershipId: membership.id,
      effectiveAt: world.currentDate,
      status: "ended",
      residenceRole: state.residenceRole,
      kind: state.kind,
      provenance,
      supersedesStateId: state.id,
    });
  }
  world = recordHouseholdLocation(world, {
    stableKey: "fixture:location",
    householdId,
    effectiveAt: world.currentDate,
    jurisdictionId: town,
    label: "Fixture town",
    kind: "residence:primary",
    provenance,
    supersedesLocationId: null,
  });
  world = startHouseholdMembership(world, {
    stableKey: "fixture:member",
    personId,
    householdId,
    startedAt: world.currentDate,
    residenceRole: "primary",
    kind: "resident:member",
    provenance,
  });
  world = vacant(world, town, "former");
  const formerId = world.history.dwellings.at(-1)!.id;
  world = startDwellingOccupancy(world, {
    stableKey: "fixture:former-occupancy",
    occupant: { kind: "household", householdId },
    dwellingId: formerId,
    startedAt: world.currentDate,
    residenceRole: "primary",
    kind: "residence:rented-home",
    provenance,
  });
  const occupancyId = world.history.dwellingOccupancies.at(-1)!.id;
  const occupancyStateId = world.history.dwellingOccupancyStates.at(-1)!.id;
  world = recordWorldEvent(world, {
    stableKey: "fixture:order",
    type: "housing.evicted",
    occurredAt: world.currentDate,
    recordedAt: world.currentDate,
    jurisdictionId: town,
    involvedEntityIds: [householdId, personId],
    participants: [{ personId, role: "focus:subject", detail: null }],
    personFactConstraints: [],
    visibility: "limited",
    tags: [],
    summary: "The court ordered the fixture household to leave.",
    context: {
      location: null,
      socialContext: null,
      pressure: null,
      choice: null,
      motivation: null,
      immediateReaction: null,
    },
  });
  const orderId = world.history.events.at(-1)!.id;
  const ended = recordDwellingOccupancyState(world, {
    stableKey: "fixture:ended",
    dwellingOccupancyId: occupancyId,
    effectiveAt: world.currentDate,
    status: "ended",
    residenceRole: "primary",
    kind: "residence:rented-home",
    reason: "Evicted.",
    provenance: { kind: "simulated-event", eventId: orderId },
    supersedesStateId: occupancyStateId,
  });
  return { world: ended, unended: world, householdId, formerId, orderId, town };
}
function vacant(world: World, town: EntityId, key: string, future = false) {
  if (future) {
    const date = addDays(world.currentDate, 30);
    world = {
      ...world,
      currentDate: date,
      currentMoment: simulationMomentOnLocalDate(world.currentMoment, date),
    };
  }
  return createDwelling(world, {
    stableKey: `${TOWN_HOMES_VERSION}:${town}:fixture:${key}`,
    establishedAt: world.currentDate,
    jurisdictionId: town,
    locationLabel: `Fixture ${key} apartment`,
    classification: "residential:apartment",
    provenance: { kind: "authored", note: "Recorded vacancy fixture." },
  });
}
function outcome(f: ReturnType<typeof fixture>, world = f.world) {
  return recordEvictionDestination(world, f.householdId, f.formerId, f.orderId);
}
describe("same-day eviction destination from actual housing stock", () => {
  it("records no fixed home without creating stock and never returns to the former home", () => {
    const f = fixture();
    const original = JSON.stringify(f.world);
    const next = outcome(f);
    const event = next.history.events.at(-1)!;
    expect(event.type).toBe(EVICTION_DESTINATION_TYPE);
    expect(event.occurredAt).toBe(f.world.currentDate);
    expect(event.tags).toContain(`eviction:order:${f.orderId}`);
    expect(event.tags).toContain("housing:no-fixed-home");
    expect(event.tags).toContain("housing:destination-cost-unavailable");
    expect(next.history.dwellings).toEqual(f.world.history.dwellings);
    expect(activeDwellingOccupanciesAt(next)).toHaveLength(0);
    expect(JSON.stringify(f.world)).toBe(original);
    expect(outcome(f, next)).toBe(next);
    const saved = JSON.parse(JSON.stringify(next)) as World;
    expect(outcome(f, saved)).toBe(saved);
    const later = reviewTownHomes(
      {
        ...saved,
        currentDate: addDays(saved.currentDate, 120),
        currentMoment: simulationMomentOnLocalDate(
          saved.currentMoment,
          addDays(saved.currentDate, 120),
        ),
      },
      f.town,
      "after-eviction",
    );
    expect(
      later.history.dwellingOccupancies.filter(
        (row) =>
          row.occupant.kind === "household" &&
          row.occupant.householdId === f.householdId &&
          row.dwellingId === f.formerId,
      ),
    ).toEqual(
      next.history.dwellingOccupancies.filter(
        (row) =>
          row.occupant.kind === "household" &&
          row.occupant.householdId === f.householdId &&
          row.dwellingId === f.formerId,
      ),
    );
    assertWorldIntegrity(next);
  });
  it("selects an actual different vacant dwelling and dates its occupancy to the order", () => {
    const f = fixture();
    const stocked = vacant(f.world, f.town, "destination");
    const destinationId = stocked.history.dwellings.at(-1)!.id;
    const next = outcome(f, stocked);
    const home = activeDwellingOccupanciesAt(next).at(-1)!;
    expect(home.dwellingId).toBe(destinationId);
    expect(home.dwellingId).not.toBe(f.formerId);
    expect(home.startedAt).toBe(f.world.currentDate);
    expect(next.history.dwellings).toEqual(stocked.history.dwellings);
    expect(next.history.events.at(-1)!.tags).toContain(
      "housing:recorded-destination",
    );
    assertWorldIntegrity(next);
  });
  it("does not allocate future stock or a dwelling another household occupies", () => {
    const f = fixture();
    let world = vacant(f.world, f.town, "occupied");
    const dwellingId = world.history.dwellings.at(-1)!.id;
    world = createHousehold(world, {
      stableKey: "fixture:other",
      label: "Other fixture household",
      formedAt: world.currentDate,
      provenance: { kind: "authored", note: "Occupancy fixture." },
    });
    world = startDwellingOccupancy(world, {
      stableKey: "fixture:occupied",
      occupant: {
        kind: "household",
        householdId: world.history.households.at(-1)!.id,
      },
      dwellingId,
      startedAt: world.currentDate,
      residenceRole: "primary",
      kind: "residence:rented-home",
      provenance: { kind: "authored", note: "Occupancy fixture." },
    });
    world = vacant(world, f.town, "future", true);
    const next = outcome(f, world);
    expect(next.history.events.at(-1)!.tags).toContain("housing:no-fixed-home");
    expect(activeDwellingOccupanciesAt(next)).toHaveLength(1);
    expect(next.history.dwellings).toEqual(world.history.dwellings);
  });
  it("requires the former occupancy to end before recording the destination", () => {
    const f = fixture();
    expect(() => outcome(f, f.unended)).toThrow(
      "End the evicted home's occupancy",
    );
  });
});
