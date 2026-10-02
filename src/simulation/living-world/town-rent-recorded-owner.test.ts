import { afterEach, describe, expect, it, vi } from "vitest";
import { smallWorld } from "../../../tests/fixtures/small-world";
import { STATES } from "../state-reference";
import { SeededRng } from "../rng";
import { createHousehold, startHouseholdMembership } from "../life";
import {
  createDwelling,
  createHousingTenure,
  recordHousingTenureState,
} from "../resources";
import { deserializeWorld, serializeWorld } from "../serialization";
import { hudRentRowFor, startTownLeases, townLeases } from "./town-rent";
import type { HousingTenureHolder } from "../types";

const seed = "team4-a56-recorded-owners-main";
const places = Object.keys(STATES);
const sample = new SeededRng(seed);
const missingRentPlace = sample.pick(places);
const place = sample.pick(places);
const provenance = {
  kind: "authored" as const,
  note: "Controlled legal ownership and tenant records in the shared small world.",
};
afterEach(() => vi.restoreAllMocks());

function homeWorld(selectedPlace = place) {
  expect(places).toHaveLength(56);
  const small = smallWorld({ place: selectedPlace, seed, date: "2026-01-01" });
  let world = createHousehold(small.world, {
    stableKey: "fixture:a56:household",
    formedAt: small.world.currentDate,
    label: "Recorded tenant household",
    provenance,
  });
  const householdId = world.history.households.at(-1)!.id;
  world = startHouseholdMembership(world, {
    stableKey: "fixture:a56:member",
    personId: small.personId,
    householdId,
    startedAt: world.currentDate,
    residenceRole: "primary",
    kind: "resident:member",
    provenance,
  });
  world = createDwelling(world, {
    stableKey: "fixture:a56:home",
    establishedAt: world.currentDate,
    jurisdictionId: small.jurisdictionId,
    locationLabel: "Recorded rental home",
    classification: "residential:house",
    provenance,
  });
  const dwellingId = world.history.dwellings.at(-1)!.id;
  world = createHousingTenure(world, {
    stableKey: "fixture:a56:tenant",
    holder: { kind: "household", householdId },
    dwellingId,
    startedAt: world.currentDate,
    kind: "lease:rented",
    context: null,
    provenance,
  });
  const tenureId = world.history.housingTenures.at(-1)!.id;
  const own = (holder: HousingTenureHolder, key: string) => {
    world = createHousingTenure(world, {
      stableKey: key,
      holder,
      dwellingId,
      startedAt: world.currentDate,
      kind: "ownership:owned",
      context: null,
      provenance,
    });
  };
  return {
    get world() {
      return world;
    },
    small,
    householdId,
    dwellingId,
    tenureId,
    own,
  };
}

describe("A56 leases follow saved title and retain their identities", () => {
  it("preserves a sampled home without a HUD rent row instead of inventing a lease or landlord", () => {
    const fixture = homeWorld(missingRentPlace);
    expect(
      hudRentRowFor(fixture.small.jurisdictionId),
      `${missingRentPlace} seed=${seed}`,
    ).toBeNull();
    fixture.own(
      { kind: "person", personId: fixture.world.personOrder[2]! },
      "fixture:a56:owner-without-rent",
    );
    expect(startTownLeases(fixture.world, fixture.world.currentDate)).toBe(
      fixture.world,
    );
    expect(townLeases(fixture.world)).toHaveLength(0);
  });
  it("uses the recorded person owner and preserves landlord, bedrooms, obligation, flow and transfers on repeat and canonical reload", () => {
    const fixture = homeWorld();
    const owner = fixture.world.personOrder[2]!;
    fixture.own({ kind: "person", personId: owner }, "fixture:a56:owner");
    const leased = startTownLeases(fixture.world, fixture.world.currentDate);
    const lease = townLeases(leased).find(
      (row) => row.tenureId === fixture.tenureId,
    )!;
    expect(lease, `place=${place} seed=${seed}`).toBeDefined();
    expect(lease.flow.recipient).toEqual({ kind: "person", personId: owner });
    expect(leased.history.resourceTransferOutcomes).toEqual(
      fixture.world.history.resourceTransferOutcomes,
    );
    expect(startTownLeases(leased, leased.currentDate)).toBe(leased);
    const reopened = deserializeWorld(serializeWorld(leased));
    expect(startTownLeases(reopened, reopened.currentDate)).toBe(reopened);
    expect(
      townLeases(reopened).find((row) => row.tenureId === fixture.tenureId),
    ).toEqual(lease);
    console.info(
      `A56 saved title: place=${place}, seed=${seed}, owner=${owner}, flow=${lease.flow.id}, obligation=${lease.obligationId}. No payment created.`,
    );
  });

  it("does not replace a household owner or ambiguous co-owners with a proxy", () => {
    const household = homeWorld();
    household.own(
      { kind: "household", householdId: household.householdId },
      "fixture:a56:household-owner",
    );
    expect(startTownLeases(household.world, household.world.currentDate)).toBe(
      household.world,
    );
    const shared = homeWorld();
    for (const id of shared.world.personOrder.slice(1, 3))
      shared.own(
        { kind: "person", personId: id },
        `fixture:a56:co-owner:${id}`,
      );
    expect(startTownLeases(shared.world, shared.world.currentDate)).toBe(
      shared.world,
    );
    expect(townLeases(shared.world)).toHaveLength(0);
  });

  it("ignores an ended title and sends the lease to its active recorded owner", () => {
    const fixture = homeWorld();
    fixture.own(
      { kind: "person", personId: fixture.world.personOrder[1]! },
      "fixture:a56:former-owner",
    );
    const tenure = fixture.world.history.housingTenures.at(-1)!;
    const state = fixture.world.history.housingTenureStates.at(-1)!;
    let world = recordHousingTenureState(fixture.world, {
      stableKey: "fixture:a56:title-ended",
      housingTenureId: tenure.id,
      effectiveAt: fixture.world.currentDate,
      status: "ended",
      context: "Controlled title transfer",
      provenance,
      supersedesStateId: state.id,
    });
    const owner = world.personOrder[2]!;
    world = createHousingTenure(world, {
      stableKey: "fixture:a56:new-owner",
      holder: { kind: "person", personId: owner },
      dwellingId: fixture.dwellingId,
      startedAt: world.currentDate,
      kind: "ownership:owned",
      context: null,
      provenance,
    });
    const leased = startTownLeases(world, world.currentDate);
    expect(townLeases(leased)[0]!.flow.recipient).toEqual({
      kind: "person",
      personId: owner,
    });
  });

  it("assigns untitled homes from the saved roster without the former landlord fork", () => {
    const fixture = homeWorld();
    const nativeFork = SeededRng.prototype.fork;
    let landlordForks = 0;
    const fork = vi
      .spyOn(SeededRng.prototype, "fork")
      .mockImplementation(function (this: SeededRng, label: string) {
        const child = nativeFork.call(this, label);
        if (label.startsWith("landlord")) {
          landlordForks += 1;
          vi.spyOn(child, "next").mockReturnValue(0.999999);
        }
        return child;
      });
    try {
      const leased = startTownLeases(fixture.world, fixture.world.currentDate);
      expect(townLeases(leased)).toHaveLength(1);
      expect(landlordForks).toBe(0);
      expect(startTownLeases(fixture.world, fixture.world.currentDate)).toEqual(
        leased,
      );
      expect(startTownLeases(leased, leased.currentDate)).toBe(leased);
    } finally {
      fork.mockRestore();
    }
  });
});
