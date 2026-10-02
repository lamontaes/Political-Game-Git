import { describe, expect, it } from "vitest";
import { makeIsoDate } from "../simulation/dates";
import { createHousehold, startHouseholdMembership } from "../simulation/life";
import { stateJurisdictionForKey } from "../simulation/life-places";
import { createLightweightPerson } from "../simulation/people";
import { primaryDwellingOf } from "../simulation/resource-queries";
import {
  createDwelling,
  createHousingTenure,
  startDwellingOccupancy,
} from "../simulation/resources";
import { deserializeWorld, serializeWorld } from "../simulation/serialization";
import { STATES } from "../simulation/state-reference";
import { createWorld, createWorldId } from "../simulation/world";
import type {
  Dwelling,
  DwellingClassification,
  DwellingOccupant,
  EntityId,
  ResidenceRole,
  World,
} from "../simulation/types";
import { homePlaceForPerson } from "./place-backdrops";

const TODAY = makeIsoDate("2026-01-05");
const YESTERDAY = makeIsoDate("2026-01-04");
const AUTHORED = {
  kind: "authored",
  note: "Fictional saved home-picture fixture.",
} as const;
const REGIONS = Object.keys(STATES).sort();

function smallWorld(usps: string): World {
  const seed = `primary-dwelling-query:${usps}`;
  const jurisdiction = stateJurisdictionForKey(`US-${usps}`);
  if (!jurisdiction)
    throw new Error(`Missing canonical jurisdiction for ${usps}`);
  return createWorld({
    seed,
    currentDate: TODAY,
    jurisdictions: [jurisdiction],
    people: [0, 1].map((index) =>
      createLightweightPerson({
        worldId: createWorldId(seed),
        worldSeed: seed,
        index,
        profile: "stress",
        currentDate: TODAY,
        homeJurisdictionId: jurisdiction.id,
      }),
    ),
  });
}

function addDwelling(
  world: World,
  key: string,
  classification: DwellingClassification,
): [World, Dwelling] {
  const next = createDwelling(world, {
    stableKey: key,
    establishedAt: YESTERDAY,
    jurisdictionId: world.jurisdictionOrder[0]!,
    locationLabel: `Fixture ${key}`,
    classification,
    provenance: AUTHORED,
  });
  return [next, next.history.dwellings.at(-1)!];
}

function occupy(
  world: World,
  dwelling: Dwelling,
  occupant: DwellingOccupant,
  key: string,
  residenceRole: ResidenceRole = "primary",
): World {
  return startDwellingOccupancy(world, {
    stableKey: key,
    dwellingId: dwelling.id,
    occupant,
    startedAt: TODAY,
    residenceRole,
    kind: "residence:fixture",
    provenance: AUTHORED,
  });
}

function tenure(
  world: World,
  dwelling: Dwelling,
  holder: DwellingOccupant,
  key: string,
): World {
  return createHousingTenure(world, {
    stableKey: key,
    dwellingId: dwelling.id,
    holder,
    startedAt: TODAY,
    kind: "lease:fixture",
    context: null,
    provenance: AUTHORED,
  });
}

function household(
  world: World,
  personId: EntityId,
  role: ResidenceRole = "primary",
): [World, DwellingOccupant] {
  let next = createHousehold(world, {
    stableKey: "fixture:household",
    formedAt: YESTERDAY,
    label: "Fixture household",
    provenance: AUTHORED,
  });
  const householdId = next.history.households.at(-1)!.id;
  next = startHouseholdMembership(next, {
    stableKey: "fixture:membership",
    personId,
    householdId,
    startedAt: TODAY,
    residenceRole: role,
    kind: "resident:household-member",
    provenance: AUTHORED,
  });
  return [next, { kind: "household", householdId }];
}

function verify(world: World, personId: EntityId, expected: string): void {
  const saved = serializeWorld(world);
  expect(homePlaceForPerson(world, personId)).toBe(expected);
  expect(serializeWorld(world)).toBe(saved);
  const continued = deserializeWorld(saved);
  expect(homePlaceForPerson(continued, personId)).toBe(expected);
  expect(serializeWorld(continued)).toBe(saved);
}

describe("primary home picture and household fallback", () => {
  it("covers all 56 jurisdiction identities", () => {
    expect(REGIONS).toHaveLength(56);
  });

  it.each(REGIONS)(
    "%s does not let secondary or no-tenure occupancy override a primary dwelling",
    (usps) => {
      const initial = smallWorld(usps);
      const personId = initial.personOrder[0]!;
      const endpoint = { kind: "person", personId } as const;
      const [withPrimary, primary] = addDwelling(
        initial,
        "fixture:primary",
        "residential:apartment",
      );
      let world = tenure(
        withPrimary,
        primary,
        endpoint,
        "fixture:primary-tenure",
      );
      world = occupy(world, primary, endpoint, "fixture:primary-occupancy");
      const [withSecondary, secondary] = addDwelling(
        world,
        "fixture:secondary",
        "residential:large-house",
      );
      world = tenure(
        withSecondary,
        secondary,
        endpoint,
        "fixture:secondary-tenure",
      );
      world = occupy(
        world,
        secondary,
        endpoint,
        "fixture:secondary-occupancy",
        "secondary",
      );
      const [withUnsupported, unsupported] = addDwelling(
        world,
        "fixture:unsupported",
        "residential:farmhouse",
      );
      world = occupy(
        withUnsupported,
        unsupported,
        endpoint,
        "fixture:unsupported-occupancy",
      );
      expect(primaryDwellingOf(world, personId)).toBe(primary);
      verify(world, personId, "small-apartment");
    },
  );

  it.each(REGIONS)(
    "%s retains the household fallback when no primary dwelling is saved",
    (usps) => {
      const initial = smallWorld(usps);
      const personId = initial.personOrder[0]!;
      const [withHousehold, endpoint] = household(initial, personId);
      const [withHome, home] = addDwelling(
        withHousehold,
        "fixture:household-home",
        "residential:rowhouse",
      );
      let world = occupy(
        withHome,
        home,
        endpoint,
        "fixture:household-occupancy",
      );
      const [withSecondary, secondary] = addDwelling(
        world,
        "fixture:secondary",
        "residential:mobile-home",
      );
      world = tenure(
        withSecondary,
        secondary,
        { kind: "person", personId },
        "fixture:secondary-tenure",
      );
      world = occupy(
        world,
        secondary,
        { kind: "person", personId },
        "fixture:secondary-occupancy",
        "secondary",
      );
      expect(primaryDwellingOf(world, personId)).toBeNull();
      verify(world, personId, "rowhouse");
    },
  );

  it.each(REGIONS)(
    "%s keeps the generic picture without a primary home or household fallback",
    (usps) => {
      const initial = smallWorld(usps);
      const personId = initial.personOrder[0]!;
      const endpoint = { kind: "person", personId } as const;
      const [withHome, home] = addDwelling(
        initial,
        "fixture:unsupported",
        "residential:mobile-home",
      );
      const world = occupy(
        withHome,
        home,
        endpoint,
        "fixture:unsupported-occupancy",
      );
      expect(primaryDwellingOf(world, personId)).toBeNull();
      verify(world, personId, "suburban-house");
    },
  );
});
