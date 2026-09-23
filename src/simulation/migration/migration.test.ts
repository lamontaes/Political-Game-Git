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
import { makeIsoDate } from "../dates";
import { factsForPerson } from "../people";
import { stateJurisdictionForKey } from "../life-places";
import { serializeWorld } from "../serialization";
import type { EntityId, World } from "../types";
import { assertWorldIntegrity } from "../world";
import {
  MIGRATION_REVIEW_TRANSITION_KEY,
  MIGRATION_REVIEWS_PER_YEAR,
  MIGRATION_SEAMS,
  WAVE_CATALOGUE,
  activeWavesCovering,
  evaluateCause,
  reviewTown,
  moveTies,
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

function withNeighbour(
  world: World,
  town: EntityId,
): {
  world: World;
  neighbourId: EntityId;
} {
  const stableKey = "migration-test:neighbour";
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
    neighbourId: characterHistoryContextPersonId(next, stableKey),
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
    const { world, neighbourId } = withNeighbour(opened.world, town);
    const moved = relocateHousehold(world, {
      stableKey: "test-move",
      personId: neighbourId,
      toJurisdictionId: oregon,
      reason: "work:transfer",
      waveKey: null,
    });
    assertWorldIntegrity(moved);
    const person = moved.people[neighbourId]!;
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
        personIds: [neighbourId],
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
      (id) => opened.world.people[id]?.homeJurisdictionId === town,
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

    const { world, neighbourId } = withNeighbour(opened.world, town);
    expect(() =>
      relocateHousehold(world, {
        stableKey: "bad",
        personId: neighbourId,
        toJurisdictionId: oregon,
        reason: "because" as never,
        waveKey: null,
      }),
    ).toThrow("is not a namespaced move reason");
  });

  it("a review moves free households out and brings newcomers in", () => {
    // Rates high enough that one review on the opening day does both, so the
    // test measures the migration step and nothing else the clock runs.
    const { world: seeded, neighbourId } = withNeighbour(opened.world, town);
    const quarter = [...Array(MIGRATION_REVIEWS_PER_YEAR).keys()].find(
      (index) => {
        const probe = reviewTown(seeded, index, {
          departureChancePerYear: 1,
          arrivalsPerResidentPerYear: 0,
        });
        return probe.people[neighbourId]!.homeJurisdictionId !== town;
      },
    )!;
    expect(quarter, "the neighbour is reviewed in some quarter").toBeDefined();
    const world = reviewTown(seeded, quarter, {
      departureChancePerYear: 1,
      arrivalsPerResidentPerYear: 12,
    });
    assertWorldIntegrity(world);

    const moves = recordedMoves(world);
    expect(moves.map((move) => move.personIds)).toContainEqual([neighbourId]);
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
  });

  it("a wave covering the town is named as the reason people leave", () => {
    const { world: seeded, neighbourId } = withNeighbour(opened.world, town);
    const waved = startWave(seeded, "jobs-gone-exodus", town, "Test.");
    const quarter = [...Array(MIGRATION_REVIEWS_PER_YEAR).keys()].find(
      (index) =>
        reviewTown(waved, index, {
          departureChancePerYear: 0.5,
          arrivalsPerResidentPerYear: 0,
        }).people[neighbourId]!.homeJurisdictionId !== town,
    );
    expect(quarter, "doubled pressure moves the neighbour").toBeDefined();
    const world = reviewTown(waved, quarter!, {
      departureChancePerYear: 0.5,
      arrivalsPerResidentPerYear: 0,
    });
    const move = recordedMoves(world).find((entry) =>
      entry.personIds.includes(neighbourId),
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
    for (const definition of WAVE_CATALOGUE) {
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
