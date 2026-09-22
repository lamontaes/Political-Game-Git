import { describe, expect, it } from "vitest";
import { deserializeWorld, serializeWorld } from "../simulation";
import { stateJurisdictionForKey } from "../simulation/life-places";
import { DEFAULT_NEW_GAME_SETUP, createNewGameWorld } from "./new-game";
import { generateOpeningLife, prepareOpeningLife } from "./opening-life";
import { projectOpeningWorldSnapshot } from "./opening-world-snapshot";
import { projectWorldOrientation } from "./living-world-orientation";

describe("opening jurisdiction identity", () => {
  it("keeps the state separate from the governor's saved residence", () => {
    const game = generateOpeningLife(
      prepareOpeningLife({
        ...DEFAULT_NEW_GAME_SETUP,
        seed: "state-residence-identity",
        placeKey: "lexington-fayette",
        startKind: "custom",
      }),
    ).game!;
    const governor = projectWorldOrientation(game.world, game.playerPersonId)
      .homeState!.governor!;
    expect(governor).not.toBeNull();
    const resident = game.world.people[governor.personId]!;
    const home = game.world.people[game.playerPersonId]!.homeJurisdictionId;
    // A coherent alternate saved residence fixture, not a relocation command.
    const moved = {
      ...resident,
      homeJurisdictionId: home,
      establishedFacts: resident.establishedFacts.map((fact) =>
        fact.kind === "residence" && fact.endedAt === null
          ? { ...fact, jurisdictionId: home }
          : fact,
      ),
    };
    const movedWithFacts =
      moved.detailLevel === "materialized"
        ? {
            ...moved,
            details: {
              ...moved.details,
              generatedFacts: moved.details.generatedFacts.map((fact) =>
                fact.kind === "residence" && fact.endedAt === null
                  ? { ...fact, jurisdictionId: home }
                  : fact,
              ),
            },
          }
        : moved;
    const world = {
      ...game.world,
      people: {
        ...game.world.people,
        [resident.id]: movedWithFacts,
      },
    };
    const before = serializeWorld(world);
    const expected = stateJurisdictionForKey("US-KY")!.id;
    expect(expected).not.toBe(home);
    const snapshot = projectOpeningWorldSnapshot(world, game.playerPersonId);
    expect(snapshot.orientation.homeState!.jurisdictionId).toBe(expected);
    expect(
      snapshot.orientation.homeState!.governor!.residenceJurisdictionId,
    ).toBe(home);
    expect(
      snapshot.beats.find((beat) => beat.key === "state")!.jurisdictionId,
    ).toBe(expected);
    expect(
      snapshot.beats.find((beat) => beat.key === "state")!.sceneContext!
        .jurisdictionId,
    ).toBe(home);
    expect(
      projectOpeningWorldSnapshot(
        deserializeWorld(before),
        game.playerPersonId,
      ),
    ).toEqual(snapshot);
    expect(serializeWorld(world)).toBe(before);
  });

  it("retains state identity when no governor has been recorded", () => {
    const game = createNewGameWorld({
      ...DEFAULT_NEW_GAME_SETUP,
      seed: "state-without-holder",
      placeKey: "lexington-fayette",
      startKind: "custom",
    });
    const before = serializeWorld(game.world);
    const orientation = projectWorldOrientation(
      game.world,
      game.playerPersonId,
    );
    expect(orientation.homeState!.governor).toBeNull();
    expect(orientation.homeState!.jurisdictionId).toBe(
      stateJurisdictionForKey("US-KY")!.id,
    );
    expect(serializeWorld(game.world)).toBe(before);
  });

  it("uses the District's represented locality without creating a governor or state placeholder", () => {
    const game = generateOpeningLife(
      prepareOpeningLife({
        ...DEFAULT_NEW_GAME_SETUP,
        seed: "district-identity",
        placeKey: "1150000",
        startKind: "custom",
      }),
    ).game!;
    const before = serializeWorld(game.world);
    const snapshot = projectOpeningWorldSnapshot(
      game.world,
      game.playerPersonId,
    );
    const home = game.world.people[game.playerPersonId]!.homeJurisdictionId;
    // The District's chief executive is its own Mayor, never a governor. The
    // orientation carries it in the slot a state's governor fills.
    expect(snapshot.orientation.homeState).toMatchObject({
      stateUsps: "DC",
      jurisdictionId: home,
      governor: {
        officeKey: "dc-mayor",
        title: "Mayor of the District of Columbia",
      },
    });
    expect(
      snapshot.beats.find((beat) => beat.key === "district")!.jurisdictionId,
    ).toBe(home);
    expect(
      snapshot.beats.some(
        (beat) => beat.key === "state" || beat.key === "local",
      ),
    ).toBe(false);
    expect(
      projectOpeningWorldSnapshot(
        deserializeWorld(before),
        game.playerPersonId,
      ),
    ).toEqual(snapshot);
    expect(serializeWorld(game.world)).toBe(before);
  });
});
