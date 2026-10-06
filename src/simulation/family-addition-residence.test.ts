import { describe, expect, it } from "vitest";
import { assertWorldIntegrity, createWorld } from "./world";
import { createDemoWorld } from "./demo";
import {
  characterHistoryContextPersonId,
  createCharacterHistoryContextPerson,
} from "./character-history";
import { makeIsoDate } from "./dates";
import {
  createHousehold,
  recordHouseholdLocation,
  recordHouseholdMembershipState,
  startHouseholdMembership,
} from "./life";
import { householdMembershipsAt } from "./life-queries";
import { recordFamilyAddition } from "./people-family";
import { deserializeWorld, serializeWorld } from "./serialization";
import type { EntityId, LifeRecordProvenance, World } from "./types";

const provenance: LifeRecordProvenance = {
  kind: "authored",
  note: "Explicit dated household fixture.",
};
function fixture(priorResidence: boolean) {
  const demo = createDemoWorld("session6-dated-birth-household");
  let world = createWorld({
    seed: demo.seed,
    currentDate: demo.currentDate,
    jurisdictions: demo.jurisdictionOrder.map((id) => demo.jurisdictions[id]!),
    people: [],
  });
  world = createCharacterHistoryContextPerson(world, {
    stableKey: "parent",
    givenName: "Fixture",
    familyName: "Parent",
    birthDate: makeIsoDate("1980-02-03"),
    homeJurisdictionId: world.jurisdictionOrder[0]!,
  });
  const parentId = characterHistoryContextPersonId(world, "parent");
  function household(key: string, formedAt: string): EntityId {
    world = createHousehold(world, {
      stableKey: key,
      formedAt,
      label: key,
      provenance,
    });
    const id = world.history.households.at(-1)!.id;
    world = recordHouseholdLocation(world, {
      stableKey: `${key}:location`,
      householdId: id,
      effectiveAt: formedAt,
      jurisdictionId: world.jurisdictionOrder[0]!,
      label: key,
      kind: "residence:community-base",
      provenance,
      supersedesLocationId: null,
    });
    world = startHouseholdMembership(world, {
      stableKey: `${key}:parent`,
      personId: parentId,
      householdId: id,
      startedAt: formedAt,
      residenceRole: "primary",
      kind: "resident:member",
      provenance,
    });
    return id;
  }
  let earlierId: EntityId | null = null;
  if (priorResidence) {
    earlierId = household("earlier", "2000-01-01");
    const membership = world.history.householdMemberships.at(-1)!;
    world = recordHouseholdMembershipState(world, {
      stableKey: "parent:left-earlier",
      membershipId: membership.id,
      effectiveAt: "2020-01-01",
      status: "ended",
      residenceRole: "primary",
      kind: "resident:member",
      provenance,
      supersedesStateId: world.history.householdMembershipStates.at(-1)!.id,
    });
  }
  const laterId = household("later", "2020-01-01");
  return { world, parentId, earlierId, laterId };
}
function birth(world: World, parentId: EntityId) {
  return recordFamilyAddition(world, {
    kind: "birth",
    stableKey: "dated-birth",
    occurredAt: "2010-06-15",
    parentPersonIds: [parentId],
  });
}
describe("dated family-addition residence", () => {
  it("uses the household recorded at birth despite a later parent move", () => {
    const input = fixture(true);
    const result = birth(input.world, input.parentId);
    const memberships = householdMembershipsAt(
      result.world,
      result.childPersonId,
      {
        asOfDate: makeIsoDate("2010-06-15"),
        historySequenceExclusive: result.world.history.nextSequence,
      },
    );
    expect(memberships.map((m) => m.membership.householdId)).toEqual([
      input.earlierId,
    ]);
    expect(
      result.world.history.householdMemberships
        .filter((m) => m.personId === result.childPersonId)
        .map((m) => m.householdId),
    ).not.toContain(input.laterId);
    expect(result.world.people[input.parentId]).toBe(
      input.world.people[input.parentId],
    );
    expect(result.world.currentDate).toBe(input.world.currentDate);
    const reopened = deserializeWorld(serializeWorld(result.world));
    expect(reopened.id).toBe(input.world.id);
    expect(reopened.history.householdMemberships).toEqual(
      result.world.history.householdMemberships,
    );
    expect(() => assertWorldIntegrity(reopened)).not.toThrow();
  });
  it("does not infer earlier residence from a household formed after birth", () => {
    const input = fixture(false);
    const result = birth(input.world, input.parentId);
    expect(
      result.world.history.householdMemberships.filter(
        (m) => m.personId === result.childPersonId,
      ),
    ).toEqual([]);
    expect(result.world.people[result.childPersonId]!.birthDate).toBe(
      "2010-06-15",
    );
    expect(() => assertWorldIntegrity(result.world)).not.toThrow();
  });
});
