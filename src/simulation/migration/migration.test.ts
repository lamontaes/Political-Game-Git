import { describe, expect, it } from "vitest";

import { DEFAULT_NEW_GAME_SETUP } from "../../presentation/new-game";
import {
  generateOpeningLife,
  prepareOpeningLife,
} from "../../presentation/opening-life";
import {
  openOrdinaryLife,
  passOrdinaryDays,
} from "../../presentation/ordinary-life";
import {
  characterHistoryContextPersonId,
  createCharacterHistoryContextPeople,
} from "../character-history";
import { declareHazardEpisode } from "../crisis/disaster";
import { crisisRecords } from "../crisis/records";
import { makeIsoDate } from "../dates";
import { recordOrganizationParticipationState } from "../life";
import { CRIME_EVENT_TYPES } from "../crime/producer";
import { recordWorldEvent } from "../world";
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
import { advanceWithWorldIntegrityAtEnd, assertWorldIntegrity } from "../world";
import {
  MIGRATION_REVIEW_TRANSITION_KEY,
  MIGRATION_SEAMS,
  WAVE_CATALOG,
  activeWavesCovering,
  evaluateCause,
  reviewTown,
  moveTies,
  moveTieReader,
  playerHouseholdPeople,
  arrivalCount,
  townCrimePush,
  townJobsPush,
  recordedMoves,
  recordedWaves,
  relocateHousehold,
  startWave,
  wavePressure,
} from ".";

/**
 * A review as the clock runs it: writers' checks deferred inside the scheduled
 * transition, and the whole world checked once at the end.
 */
const review = (...args: Parameters<typeof reviewTown>) =>
  advanceWithWorldIntegrityAtEnd(() => reviewTown(...args));

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

  it("a review brings newcomers in, as many as the rate owes, with no draw", () => {
    // The living residents the review counts.
    const dead = new Set(
      opened.world.history.personDeaths.map((death) => death.personId),
    );
    const residents = opened.world.personOrder.filter(
      (id) =>
        opened.world.people[id]!.homeJurisdictionId === town && !dead.has(id),
    ).length;
    const world = review(opened.world, 0, { arrivalsPerResidentPerYear: 12 });
    assertWorldIntegrity(world);
    const arrivals = world.history.events.filter(
      (event) => event.type === "migration.arrived",
    );
    // Twelve a resident a year is three a quarter: exactly that many, no
    // rounding draw either way.
    expect(arrivals).toHaveLength(arrivalCount((residents * 12) / 4, 0));
    expect(arrivals.length).toBe(residents * 3);
    for (const event of arrivals) {
      const personId = event.participants[0]!.personId;
      expect(world.people[personId]!.homeJurisdictionId).toBe(town);
      expect(event.summary).toMatch(/ moved to .+ from .+\.$/);
    }
    // A fraction is carried from review to review: a third a quarter is
    // one newcomer every third review, and a year owes what it should.
    expect(
      [0, 1, 2, 3, 4, 5].map((index) => arrivalCount(1 / 3, index)),
    ).toEqual([0, 0, 1, 0, 0, 1]);
    expect(
      [...Array(40).keys()].reduce(
        (sum, index) => sum + arrivalCount(0.37, index),
        0,
      ),
    ).toBe(Math.floor(0.37 * 40));
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
    const settled = review(opened.world, 0, {
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
    // Damage reaches a household directly, or through the recorded home it
    // lives in (the town's households have homes, `town-homes.ts`).
    const wrecked = crisisRecords(struck).flatMap((record) =>
      record.kind === "disaster-damage" &&
      (record.targetKind === "household" || record.targetKind === "dwelling") &&
      record.level !== "service-interrupted"
        ? [record]
        : [],
    );
    const householdsHit = (record: (typeof wrecked)[number]) =>
      record.targetKind === "household"
        ? [record.targetId]
        : activeDwellingOccupanciesAt(struck).flatMap((occupancy) =>
            occupancy.dwellingId === record.targetId &&
            occupancy.occupant.kind === "household"
              ? [occupancy.occupant.householdId]
              : [],
          );
    expect(wrecked.length).toBeGreaterThan(0);

    // Everybody whose home was hit leaves, and nobody else does.
    const after = review(struck, 1, {
      arrivalsPerResidentPerYear: 0,
      displacedLeaveChance: { destroyed: 1, damaged: 1 },
    });
    assertWorldIntegrity(after);
    const moves = recordedMoves(after);
    // The flood can kill; a household it left nobody alive in moves nowhere.
    const died = new Set(
      struck.history.personDeaths.map((death) => death.personId),
    );
    const freeWrecked = [
      ...new Set(wrecked.flatMap((record) => householdsHit(record))),
    ].filter(
      (householdId) =>
        // The flood's dead keep their jobs on the books; they bind nobody.
        peopleInHouseholdAt(struck, householdId)
          .filter((id) => !died.has(id))
          .every((id) => !moveTieReader(struck).bindingTie(id)) &&
        peopleInHouseholdAt(struck, householdId).some((id) => !died.has(id)) &&
        !peopleInHouseholdAt(struck, householdId).includes(opened.playerId),
    );
    expect(freeWrecked.length).toBeGreaterThan(0);
    expect(
      moves
        .map(
          (move) =>
            householdMembershipsAt(struck, move.personIds[0]!)[0]!.household.id,
        )
        .sort(),
    ).toEqual([...freeWrecked].sort());
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
      review(struck, 1, {
        arrivalsPerResidentPerYear: 0,
      }),
    );
    expect(blanket.length).toBeLessThan(moves.length);
  }, 60_000);

  it("unemployment in town above the nation's pushes people out", () => {
    // A month of play, so the economy has recorded a national month.
    const played = passOrdinaryDays(opened.world, 35);
    expect(townJobsPush(played, town)).toBe(1);
    const months = played.macroEconomy?.months ?? [];
    const nation = months.filter((row) => row.scope === "national").at(-1)!;
    expect(nation, "the opening records a national month").toBeDefined();
    const withTownMonth = (unemploymentPct: number) => ({
      ...played,
      macroEconomy: {
        ...played.macroEconomy!,
        months: [
          ...months,
          {
            ...nation,
            key: `migration-test:${unemploymentPct}`,
            scope: `jurisdiction:${town}` as const,
            unemploymentPct,
          },
        ],
      },
    });
    // Four points above the nation: 20 percent more likely to leave.
    expect(
      townJobsPush(withTownMonth(nation.unemploymentPct + 4), town),
    ).toBeCloseTo(1.2);
    expect(
      townJobsPush(withTownMonth(nation.unemploymentPct - 2), town),
    ).toBeCloseTo(0.9);
  }, 120_000);

  it("an unusually bad quarter of crime in town pushes people out", () => {
    expect(townCrimePush(opened.world, town)).toBe(1);
    let world = opened.world;
    for (let n = 0; n < 10; n += 1)
      world = recordWorldEvent(world, {
        stableKey: `migration-test:assault:${n}`,
        type: CRIME_EVENT_TYPES.reported,
        occurredAt: world.currentDate,
        recordedAt: world.currentDate,
        jurisdictionId: town,
        involvedEntityIds: [town],
        participants: [],
        personFactConstraints: [],
        visibility: "public",
        tags: ["crime", "crime:offense:assault"],
        summary: "An assault was reported to police.",
        context: {
          location: null,
          socialContext: null,
          pressure: null,
          choice: null,
          motivation: null,
          immediateReaction: null,
        },
      });
    // About 2.5 assaults and robberies are the usual quarter; 10 is 7.5 more.
    expect(townCrimePush(world, town)).toBeGreaterThan(1.3);
    expect(townCrimePush(world, town)).toBeLessThan(1.45);
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
