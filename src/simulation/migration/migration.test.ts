import { describe, expect, it } from "vitest";

import { DEFAULT_NEW_GAME_SETUP } from "../../presentation/new-game";
import {
  generateOpeningLife,
  prepareOpeningLife,
} from "../../presentation/opening-life";
import { openOrdinaryLife } from "../../presentation/ordinary-life";
import {
  characterHistoryContextPersonId,
  createCharacterHistoryContextPeople,
} from "../character-history";
import { declareHazardEpisode } from "../crisis/disaster";
import { crisisRecords } from "../crisis/records";
import { makeIsoDate } from "../dates";
import { recordOrganizationParticipationState } from "../life";
import {
  activeOrganizationParticipationsAt,
  householdMembershipsAt,
  peopleInHouseholdAt,
} from "../life-queries";
import {
  createDwelling,
  createHousingTenure,
  startDwellingOccupancy,
} from "../resources";
import {
  activeDwellingOccupanciesAt,
  activeHousingTenuresAt,
} from "../resource-queries";
import { factsForPerson } from "../people";
import { stateJurisdictionForKey } from "../life-places";
import { serializeWorld } from "../serialization";
import type { EntityId, World } from "../types";
import { assertWorldIntegrity } from "../world";
import {
  MIGRATION_REVIEW_TRANSITION_KEY,
  MIGRATION_REVIEWS_PER_YEAR,
  MIGRATION_SEAMS,
  WAVE_CATALOG,
  activeWavesCovering,
  evaluateCause,
  reviewTown,
  moveTies,
  moveTieReader,
  playerHouseholdPeople,
  recordedMoves,
  recordedWaves,
  relocateHousehold,
  startWave,
  wavePressure,
} from ".";

/** Charlottesville, Virginia; Kentucky is deliberately not the test place. */
const VIRGINIA_TOWN = "5114968";

function openLife(placeKey: string, seed: string) {
  const game = generateOpeningLife(
    prepareOpeningLife({
      ...DEFAULT_NEW_GAME_SETUP,
      seed,
      startAge: 30,
      placeKey,
    }),
  ).game!;
  return {
    world: openOrdinaryLife(game.world, game.playerPersonId),
    playerId: game.playerPersonId,
  };
}

function withNeighbor(
  world: World,
  town: EntityId,
): {
  world: World;
  neighborId: EntityId;
} {
  const stableKey = "migration-test:neighbor";
  const next = createCharacterHistoryContextPeople(world, [
    {
      stableKey,
      givenName: "Rosa",
      familyName: "Delgado",
      birthDate: makeIsoDate("1980-03-14"),
      homeJurisdictionId: town,
    },
  ]);
  return {
    world: next,
    neighborId: characterHistoryContextPersonId(next, stableKey),
  };
}

describe("migration scaffold", () => {
  const opened = openLife(VIRGINIA_TOWN, "migration-scaffold");
  const town = opened.world.people[opened.playerId]!.homeJurisdictionId;
  const oregon = stateJurisdictionForKey("US-OR")!.id;

  it("schedules a quarterly review for a current opening", () => {
    expect(
      opened.world.history.futureDueItems.some(
        (item) => item.transitionKey === MIGRATION_REVIEW_TRANSITION_KEY,
      ),
    ).toBe(true);
  });

  it("moves a person living alone, closing the old residence and recording why", () => {
    const { world, neighborId } = withNeighbor(opened.world, town);
    const moved = relocateHousehold(world, {
      stableKey: "test-move",
      personId: neighborId,
      toJurisdictionId: oregon,
      reason: "work:transfer",
      waveKey: null,
    });
    assertWorldIntegrity(moved);
    const person = moved.people[neighborId]!;
    expect(person.homeJurisdictionId).toBe(oregon);
    const residences = factsForPerson(person).filter(
      (fact) => fact.kind === "residence",
    );
    expect(residences).toHaveLength(2);
    expect(residences[0]).toMatchObject({
      jurisdictionId: town,
      endedAt: moved.currentDate,
    });
    expect(residences[1]).toMatchObject({
      jurisdictionId: oregon,
      endedAt: null,
    });
    expect(recordedMoves(moved)).toEqual([
      expect.objectContaining({
        personIds: [neighborId],
        fromJurisdictionId: town,
        toJurisdictionId: oregon,
        reason: "work:transfer",
        waveKey: null,
      }),
    ]);
  });

  it("refuses to move the player, somebody tied to the town, or a bad reason", () => {
    expect(() =>
      relocateHousehold(opened.world, {
        stableKey: "player",
        personId: opened.playerId,
        toJurisdictionId: oregon,
        reason: "life-course:unrecorded",
        waveKey: null,
      }),
    ).toThrow("The player's household moves only when the player chooses to.");

    const tied = [...moveTies(opened.world).keys()].find(
      (id) =>
        opened.world.people[id]?.homeJurisdictionId === town &&
        !playerHouseholdPeople(opened.world).has(id),
    );
    expect(tied, "the opening seats somebody tied to the town").toBeDefined();
    expect(() =>
      relocateHousehold(opened.world, {
        stableKey: "tied",
        personId: tied!,
        toJurisdictionId: oregon,
        reason: "life-course:unrecorded",
        waveKey: null,
      }),
    ).toThrow("closing that on a move is not built");

    const { world, neighborId } = withNeighbor(opened.world, town);
    expect(() =>
      relocateHousehold(world, {
        stableKey: "bad",
        personId: neighborId,
        toJurisdictionId: oregon,
        reason: "because" as never,
        waveKey: null,
      }),
    ).toThrow("is not a namespaced move reason");
  });

  it("a review moves free households out and brings newcomers in", () => {
    // Rates high enough that one review on the opening day does both, so the
    // test measures the migration step and nothing else the clock runs.
    const { world: seeded, neighborId } = withNeighbor(opened.world, town);
    const quarter = [...Array(MIGRATION_REVIEWS_PER_YEAR).keys()].find(
      (index) => {
        const probe = reviewTown(seeded, index, {
          departureChancePerYear: 1,
          arrivalsPerResidentPerYear: 0,
        });
        return probe.people[neighborId]!.homeJurisdictionId !== town;
      },
    )!;
    expect(quarter, "the neighbor is reviewed in some quarter").toBeDefined();
    const world = reviewTown(seeded, quarter, {
      departureChancePerYear: 1,
      arrivalsPerResidentPerYear: 12,
    });
    assertWorldIntegrity(world);

    const moves = recordedMoves(world);
    expect(moves.map((move) => move.personIds)).toContainEqual([neighborId]);
    for (const move of moves) {
      expect(move.fromJurisdictionId).toBe(town);
      expect(move.reason).toBe("life-course:unrecorded");
      for (const id of move.personIds) {
        expect(id).not.toBe(opened.playerId);
        expect(moveTies(seeded).has(id)).toBe(false);
      }
    }

    const arrivals = world.history.events.filter(
      (event) => event.type === "migration.arrived",
    );
    expect(arrivals.length).toBeGreaterThan(0);
    for (const event of arrivals) {
      const personId = event.participants[0]!.personId;
      expect(world.people[personId]!.homeJurisdictionId).toBe(town);
      expect(event.summary).toMatch(/ moved to .+ from .+\.$/);
    }

    // The same review on the same world decides the same thing.
    expect(
      serializeWorld(
        reviewTown(seeded, quarter, {
          departureChancePerYear: 1,
          arrivalsPerResidentPerYear: 12,
        }),
      ),
    ).toBe(serializeWorld(world));
  }, 60_000);

  it("a membership that has ended no longer holds a person in town", () => {
    const reader = moveTieReader(opened.world);
    const member = opened.world.personOrder.find(
      (id) =>
        opened.world.people[id]!.homeJurisdictionId === town &&
        id !== opened.playerId &&
        reader.bindingTie(id) === "belongs to an organization or party" &&
        activeOrganizationParticipationsAt(opened.world, id).length > 0,
    )!;
    expect(member, "the opening seats a party member in town").toBeDefined();
    let world = opened.world;
    for (const active of activeOrganizationParticipationsAt(world, member))
      world = recordOrganizationParticipationState(world, {
        stableKey: `migration-test:left:${active.participation.id}`,
        participationId: active.participation.id,
        effectiveAt: world.currentDate,
        status: "ended",
        roleKind: active.state.roleKind,
        context: null,
        provenance: { kind: "authored", note: "migration test" },
        supersedesStateId: active.state.id,
      });
    // Before, any record at all, ended or not, held them.
    expect(moveTies(world, [member]).get(member)).toBeUndefined();
    expect(
      world.history.organizationParticipations.some(
        (record) => record.personId === member,
      ),
    ).toBe(true);
  });

  it("a disaster that wrecks newcomers' homes sends some away for good", () => {
    // A year of arrivals, so the town holds households a disaster can reach.
    const settled = reviewTown(opened.world, 0, {
      departureChancePerYear: 0,
      arrivalsPerResidentPerYear: 6,
    });
    const newcomers = settled.history.events
      .filter((event) => event.type === "migration.arrived")
      .map((event) => event.participants[0]!.personId);
    expect(newcomers.length).toBeGreaterThan(10);
    for (const id of newcomers)
      expect(householdMembershipsAt(settled, id)).toHaveLength(1);

    // One newcomer's household leases a recorded home.
    const renter = newcomers[0]!;
    const householdId = householdMembershipsAt(settled, renter)[0]!.household
      .id;
    const provenance = { kind: "authored" as const, note: "migration test" };
    let housed = createDwelling(settled, {
      stableKey: "migration-test:dwelling",
      establishedAt: settled.currentDate,
      jurisdictionId: town,
      locationLabel: "An apartment in town",
      classification: "residential:apartment",
      provenance,
    });
    const dwellingId = housed.history.dwellings.at(-1)!.id;
    housed = startDwellingOccupancy(housed, {
      stableKey: "migration-test:occupancy",
      occupant: { kind: "household", householdId },
      dwellingId,
      startedAt: housed.currentDate,
      residenceRole: "primary",
      kind: "residence:renter",
      provenance,
    });
    housed = createHousingTenure(housed, {
      stableKey: "migration-test:lease",
      holder: { kind: "household", householdId },
      dwellingId,
      startedAt: housed.currentDate,
      kind: "lease:month-to-month",
      context: null,
      provenance,
    });
    expect(moveTieReader(housed).housingTie(renter)).not.toBeNull();

    const struck = declareHazardEpisode(housed, {
      stableKey: "migration-test-flood",
      family: "flood",
      magnitude: "catastrophic",
      stateUsps: "VA",
      jurisdictionIds: [town],
      durationDays: 4,
      basis: "Declared test episode; not a local hazard prediction.",
      sourceReference: null,
    });
    const wrecked = crisisRecords(struck).flatMap((record) =>
      record.kind === "disaster-damage" &&
      record.targetKind === "household" &&
      record.level !== "service-interrupted"
        ? [record]
        : [],
    );
    expect(wrecked.length).toBeGreaterThan(0);

    // Everybody whose home was hit leaves, and nobody else does.
    const after = reviewTown(struck, 1, {
      departureChancePerYear: 0,
      arrivalsPerResidentPerYear: 0,
      displacedLeaveChance: { destroyed: 1, damaged: 1 },
    });
    assertWorldIntegrity(after);
    const moves = recordedMoves(after);
    const freeWrecked = wrecked.filter(
      (record) =>
        peopleInHouseholdAt(struck, record.targetId).every(
          (id) => !moveTieReader(struck).bindingTie(id),
        ) &&
        !peopleInHouseholdAt(struck, record.targetId).includes(opened.playerId),
    );
    expect(freeWrecked.length).toBeGreaterThan(0);
    expect(moves.map((move) => move.causeId).sort()).toEqual(
      freeWrecked.map((record) => record.id).sort(),
    );
    for (const move of moves) {
      const damage = wrecked.find((record) => record.id === move.causeId)!;
      expect(move.reason).toBe(`disaster:home-${damage.level}`);
      expect(move.fromJurisdictionId).toBe(town);
    }

    // A leased home that was hit is given up on the move.
    const renterLeft = moves.some((move) => move.personIds.includes(renter));
    const leases = activeHousingTenuresAt(after).filter(
      (tenure) => tenure.dwellingId === dwellingId,
    );
    const occupied = activeDwellingOccupanciesAt(after).filter(
      (occupancy) => occupancy.dwellingId === dwellingId,
    );
    expect(leases.length === 0).toBe(renterLeft);
    expect(occupied.length === 0).toBe(renterLeft);

    // With the blanket chance, a destroyed home is left more often than a
    // damaged one, and some households stay to rebuild.
    const blanket = recordedMoves(
      reviewTown(struck, 1, {
        departureChancePerYear: 0,
        arrivalsPerResidentPerYear: 0,
      }),
    );
    expect(blanket.length).toBeLessThan(moves.length);
  }, 60_000);

  it("a wave covering the town is named as the reason people leave", () => {
    const { world: seeded, neighborId } = withNeighbor(opened.world, town);
    const waved = startWave(seeded, "jobs-gone-exodus", town, "Test.");
    const quarter = [...Array(MIGRATION_REVIEWS_PER_YEAR).keys()].find(
      (index) =>
        reviewTown(waved, index, {
          departureChancePerYear: 0.5,
          arrivalsPerResidentPerYear: 0,
        }).people[neighborId]!.homeJurisdictionId !== town,
    );
    expect(quarter, "doubled pressure moves the neighbor").toBeDefined();
    const world = reviewTown(waved, quarter!, {
      departureChancePerYear: 0.5,
      arrivalsPerResidentPerYear: 0,
    });
    const move = recordedMoves(world).find((entry) =>
      entry.personIds.includes(neighborId),
    )!;
    expect(move.reason).toBe("wave:jobs-gone-exodus");
    expect(move.waveKey).toBe("jobs-gone-exodus");
  });

  it("reading moves and waves writes nothing", () => {
    const before = serializeWorld(opened.world);
    recordedMoves(opened.world);
    recordedWaves(opened.world);
    activeWavesCovering(opened.world, town);
    expect(serializeWorld(opened.world)).toBe(before);
  });
});

describe("waves", () => {
  const opened = openLife(VIRGINIA_TOWN, "migration-waves");
  const town = opened.world.people[opened.playerId]!.homeJurisdictionId;

  it("a scenario can begin a wave, and it presses on who leaves while it lasts", () => {
    const world = startWave(
      opened.world,
      "flight-from-the-city",
      town,
      "A test scenario began it.",
    );
    const active = activeWavesCovering(world, town);
    expect(active.map((wave) => wave.key)).toEqual(["flight-from-the-city"]);
    expect(wavePressure(active, "departure-pressure")).toEqual({
      multiplier: 3,
      waveKey: "flight-from-the-city",
    });
    const began = world.history.events.at(-1)!;
    expect(began.visibility).toBe("public");
    expect(began.type).toBe("migration.wave-began");
  });

  it("an unmodeled cause never fires, and says so", () => {
    for (const definition of WAVE_CATALOG) {
      for (const cause of definition.causes) {
        if (cause.kind !== "unbuilt") continue;
        expect(evaluateCause(opened.world, cause, town)).toEqual({
          met: false,
          because: `The cause '${cause.causeKey}' is not modeled yet.`,
        });
      }
    }
  });
});

describe("the seam list", () => {
  it("gives every unbuilt hookup the rule the code follows meanwhile", () => {
    const keys = MIGRATION_SEAMS.map((seam) => seam.key);
    expect(new Set(keys).size).toBe(keys.length);
    for (const seam of MIGRATION_SEAMS) {
      expect(seam.rule.trim().length, seam.key).toBeGreaterThan(20);
      expect(seam.where.trim().length, seam.key).toBeGreaterThan(0);
    }
    for (const required of [
      "beliefs-carried",
      "wave-parties",
      "wave-beliefs",
      "press",
      "why-people-leave",
    ])
      expect(keys).toContain(required);
  });
});
