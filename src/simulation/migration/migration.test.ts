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
import { CRIME_EVENT_TYPES } from "../crime/producer";
import { recordWorldEvent } from "../world";
import {
  activeOrganizationParticipationsAt,
  householdMembershipsAt,
  peopleInHouseholdAt,
} from "../life-queries";
import { factsForPerson } from "../people";
import { stateJurisdictionForKey } from "../life-places";
import { serializeWorld } from "../serialization";
import type { MacroMonthRecord } from "../macro-economy/types";
import type { EntityId, World } from "../types";
import { assertWorldIntegrity } from "../world";
import {
  MIGRATION_REVIEW_TRANSITION_KEY,
  MIGRATION_SEAMS,
  WAVE_CATALOG,
  activeWavesCovering,
  evaluateCause,
  moveTies,
  moveTieReader,
  playerHouseholdPeople,
  townCrimePush,
  townJobsPush,
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

  it("a member leaves a membership behind on a move; a leader is still held by the role", () => {
    const reader = moveTieReader(opened.world);
    const member = opened.world.personOrder.find(
      (id) =>
        opened.world.people[id]!.homeJurisdictionId === town &&
        id !== opened.playerId &&
        reader.membershipsLeftBehind(id).length > 0 &&
        reader.bindingTie(id) === null &&
        reader.housingTie(id) === null &&
        peopleInHouseholdAt(
          opened.world,
          householdMembershipsAt(opened.world, id)[0]?.household.id ??
            ("none" as EntityId),
        ).every((other) => other === id || !reader.bindingTie(other)),
    );
    expect(member, "the opening seats a free member in town").toBeDefined();
    const left = reader.membershipsLeftBehind(member!);
    const moved = relocateHousehold(opened.world, {
      stableKey: "migration-test:member-moves",
      personId: member!,
      toJurisdictionId: oregon,
      reason: "work:transfer",
      waveKey: null,
    });
    expect(moved.people[member!]!.homeJurisdictionId).toBe(oregon);
    // The membership ended on the move, and is still on record.
    expect(activeOrganizationParticipationsAt(moved, member!)).toEqual([]);
    for (const id of left)
      expect(
        moved.history.organizationParticipations.some(
          (record) => record.id === id,
        ),
      ).toBe(true);
    // A leader's role still holds them in town.
    const leader = opened.world.personOrder.find((id) =>
      activeOrganizationParticipationsAt(opened.world, id).some(
        (active) => active.state.roleKind?.startsWith("leader:") ?? false,
      ),
    );
    if (leader) expect(reader.bindingTie(leader)).not.toBeNull();
  });

  it("unemployment in town above the nation's pushes people out", () => {
    // An authored national month, carrying only the fields the reader
    // uses, in place of a month of play: the case measures the reader, not
    // the economy (which `macro-economy` tests run).
    expect(townJobsPush(opened.world, town)).toBe(1);
    const nation = {
      key: "migration-test:nation",
      scope: "national",
      periodEnd: opened.world.currentDate,
      recordedAt: opened.world.currentDate,
      unemploymentPct: 4.2,
    } as unknown as MacroMonthRecord;
    const played: World = {
      ...opened.world,
      macroEconomy: {
        ...(opened.world.macroEconomy ??
          ({} as NonNullable<World["macroEconomy"]>)),
        months: [nation],
      },
    };
    expect(townJobsPush(played, town)).toBe(1);
    const months = played.macroEconomy!.months;
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
  });

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
