import { describe, expect, it } from "vitest";
import { smallWorld } from "../../../tests/fixtures/small-world";
import { governmentUnitsForState } from "../government-units";
import { lifePlaceByKey } from "../life-places";
import { householdMembershipsAt } from "../life-queries";
import {
  activeDwellingOccupanciesAt,
  activeHousingTenuresAt,
  dwellingOccupancyStateAt,
  housingTenureStateAt,
  sameEndpoint,
} from "../resource-queries";
import {
  createHousingTenure,
  recordDwellingOccupancyState,
  recordHousingTenureState,
  startDwellingOccupancy,
} from "../resources";
import { SeededRng } from "../rng";
import { deserializeWorld, serializeWorld } from "../serialization";
import { STATES } from "../state-reference";
import type { DwellingOccupant, EntityId, World } from "../types";
import { ensureTownHomes, TOWN_TENURE_KINDS } from "./town-homes";
import {
  materializeTownHousehold,
  townRoster,
  TOWN_RESIDENTS_VERSION,
} from "./town-residents";
import {
  councilWardPlan,
  homePosition,
  redrawTownWards,
  wardOfPerson,
} from "./town-wards";

const seed = "elections-a149-recorded-home";
const state = new SeededRng(seed).pick(Object.keys(STATES));
const provenance = {
  kind: "authored",
  note: "Recorded home move fixture.",
} as const;

function vacate(world: World, occupant: DwellingOccupant): World {
  let next = world;
  for (const row of activeDwellingOccupanciesAt(world)) {
    if (!sameEndpoint(row.occupant, occupant)) continue;
    const prior = dwellingOccupancyStateAt(next, row.id)!;
    next = recordDwellingOccupancyState(next, {
      stableKey: `fixture:vacate:${row.id}`,
      dwellingOccupancyId: row.id,
      effectiveAt: next.currentDate,
      status: "ended",
      residenceRole: prior.residenceRole,
      kind: prior.kind,
      reason: "Recorded household move in the fixture.",
      provenance,
      supersedesStateId: prior.id,
    });
  }
  for (const row of activeHousingTenuresAt(world)) {
    if (!sameEndpoint(row.holder, occupant)) continue;
    next = recordHousingTenureState(next, {
      stableKey: `fixture:end-tenure:${row.id}`,
      housingTenureId: row.id,
      effectiveAt: next.currentDate,
      status: "ended",
      context: "Recorded household move in the fixture.",
      provenance,
      supersedesStateId: housingTenureStateAt(next, row.id)!.id,
    });
  }
  return next;
}

function enter(
  world: World,
  householdId: EntityId,
  dwellingId: EntityId,
): World {
  const holder = { kind: "household", householdId } as const;
  const held = createHousingTenure(world, {
    stableKey: `fixture:tenure:${householdId}:${dwellingId}`,
    holder,
    dwellingId,
    startedAt: world.currentDate,
    kind: TOWN_TENURE_KINDS.rented,
    context: "Recorded household move in the fixture.",
    provenance,
  });
  return startDwellingOccupancy(held, {
    stableKey: `fixture:occupancy:${householdId}:${dwellingId}`,
    occupant: holder,
    dwellingId,
    startedAt: held.currentDate,
    residenceRole: "primary",
    kind: "residence:rented-home",
    provenance,
  });
}

function fixture() {
  const unit = governmentUnitsForState(state).find(
    (row) =>
      (councilWardPlan(row)?.wardSeats ?? 0) >= 2 &&
      lifePlaceByKey(row.placeGeoid ?? "") !== null,
  )!;
  expect(unit).toBeDefined();
  const base = smallWorld({ place: unit.placeGeoid!, seed, household: true });
  const town = base.jurisdictionId;
  const total = townRoster(town).households;
  expect(total).toBeGreaterThan(2);
  let world = materializeTownHousehold(base.world, town, 0);
  world = materializeTownHousehold(world, town, total - 1);
  world = ensureTownHomes(world, town);
  const playerHousehold = householdMembershipsAt(world, base.personId).find(
    (row) => row.state.residenceRole === "primary",
  )!.household.id;
  const address = (index: number) => {
    const home = world.history.households.find(
      (row) =>
        row.stableKey ===
        `${TOWN_RESIDENTS_VERSION}:${town}:household:${index}`,
    )!;
    const original = world.history.housingTenures.find(
      (row) =>
        row.holder.kind === "household" && row.holder.householdId === home.id,
    )!;
    return { householdId: home.id, dwellingId: original.dwellingId };
  };
  const first = address(0);
  const last = address(total - 1);
  world = vacate(world, { kind: "household", householdId: playerHousehold });
  world = vacate(world, { kind: "household", householdId: first.householdId });
  world = vacate(world, { kind: "household", householdId: last.householdId });
  world = redrawTownWards(world, {
    unit,
    town,
    drawnBy: "commission",
    members: [],
    reason: "Recorded ward map for the home-move fixture.",
  });
  return {
    world,
    player: base.personId,
    playerHousehold,
    town,
    total,
    first,
    last,
    unit,
  };
}

describe(`player ward from a recorded home (${state}, ${seed})`, () => {
  it("follows the current primary home across a move and Save/Continue without writing", () => {
    const f = fixture();
    const first = enter(f.world, f.playerHousehold, f.first.dwellingId);
    const savedFirst = serializeWorld(first);
    expect(homePosition(first, f.town, f.player)).toBe(0);
    const firstWard = wardOfPerson(first, f.unit, f.town, f.player);
    expect(firstWard).toBe(1);
    expect(serializeWorld(first)).toBe(savedFirst);
    const left = vacate(first, {
      kind: "household",
      householdId: f.playerHousehold,
    });
    const moved = enter(left, f.playerHousehold, f.last.dwellingId);
    const saved = serializeWorld(moved);
    expect(homePosition(moved, f.town, f.player)).toBe(f.total - 1);
    expect(wardOfPerson(moved, f.unit, f.town, f.player)).toBe(
      councilWardPlan(f.unit)!.wardSeats,
    );
    expect(wardOfPerson(moved, f.unit, f.town, f.player)).not.toBe(firstWard);
    expect(moved.people[f.player]).toEqual(first.people[f.player]);
    expect(moved.history.housingTenures).toEqual(
      expect.arrayContaining([...first.history.housingTenures]),
    );
    expect(moved.history.dwellingOccupancies).toEqual(
      expect.arrayContaining([...first.history.dwellingOccupancies]),
    );
    const continued = deserializeWorld(saved);
    expect(homePosition(continued, f.town, f.player)).toBe(f.total - 1);
    expect(wardOfPerson(continued, f.unit, f.town, f.player)).toBe(
      councilWardPlan(f.unit)!.wardSeats,
    );
    expect(serializeWorld(continued)).toBe(saved);
  });

  it("requires an active matching tenure and preserves the legacy fallback when none is recorded", () => {
    const f = fixture();
    const fallback = homePosition(f.world, f.town, f.player);
    const occupied = startDwellingOccupancy(f.world, {
      stableKey: "fixture:occupancy-without-tenure",
      occupant: { kind: "household", householdId: f.playerHousehold },
      dwellingId: f.last.dwellingId,
      startedAt: f.world.currentDate,
      residenceRole: "primary",
      kind: "residence:rented-home",
      provenance,
    });
    const saved = serializeWorld(occupied);
    expect(homePosition(occupied, f.town, f.player)).toBe(fallback);
    expect(serializeWorld(occupied)).toBe(saved);
    expect(
      homePosition(occupied, f.town, "person_absent" as EntityId),
    ).toBeNull();
  });
});
