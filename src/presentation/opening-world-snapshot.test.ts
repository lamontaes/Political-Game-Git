import {
  ensureOpeningPriorLocalRecords,
  projectPublicMatters,
} from "../simulation/living-world/developments";
import { describe, expect, it } from "vitest";
import { serializeWorld, deserializeWorld } from "../simulation";
import { DEFAULT_NEW_GAME_SETUP } from "./new-game";
import { generateOpeningLife, prepareOpeningLife } from "./opening-life";
import { projectOpeningWorldSnapshot } from "./opening-world-snapshot";

describe("PLAYTEST65 canonical opening", () => {
  it.each([
    ["2160852", "appalachian-coal-region-town"],
    ["2135362", "appalachian-coal-region-town"],
    ["4622260", "great-plains-grassland"],
    ["4649600", "great-plains-grassland"],
  ])(
    "retains %s illustrative region context across saved opening reads",
    (placeKey, type) => {
      const { world, playerPersonId } = generateOpeningLife(
        prepareOpeningLife({
          ...DEFAULT_NEW_GAME_SETUP,
          seed: `region:${placeKey}`,
          placeKey,
          household: "lives-alone",
          startKind: "custom",
        }),
      ).game!;
      const before = serializeWorld(world);
      const snapshot = projectOpeningWorldSnapshot(world, playerPersonId);
      const regional = snapshot.beats.filter(
        (beat) => beat.sceneContext !== null,
      );
      expect(regional.length).toBeGreaterThan(0);
      expect(
        regional.every((beat) =>
          beat.sceneContext!.regionTypes?.includes(
            type as "great-plains-grassland" | "appalachian-coal-region-town",
          ),
        ),
      ).toBe(true);
      expect(
        projectOpeningWorldSnapshot(deserializeWorld(before), playerPersonId),
      ).toEqual(snapshot);
      expect(serializeWorld(world)).toBe(before);
    },
  );

  it("introduces distinct saved executives without travel, knowledge or time writes", () => {
    const { world, playerPersonId } = generateOpeningLife(
      prepareOpeningLife({
        ...DEFAULT_NEW_GAME_SETUP,
        seed: "playtest65-w-opening",
        placeKey: "lexington-fayette",
        household: "lives-alone",
        startKind: "custom",
      }),
    ).game!;
    const before = serializeWorld(world);
    const snapshot = projectOpeningWorldSnapshot(world, playerPersonId);
    expect(snapshot.beats[0]?.key).toBe("white-house");
    const localContext = snapshot.beats.find(
      (beat) => beat.key === "local",
    )!.sceneContext!;
    expect(localContext).toMatchObject({
      jurisdictionId: world.people[playerPersonId]!.homeJurisdictionId,
      placeKey: "lexington-fayette",
      stateJurisdictionKey: "US-KY",
      asOf: world.currentDate,
    });
    expect(
      snapshot.beats
        .filter((beat) =>
          ["white-house", "congress", "your-life"].includes(beat.key),
        )
        .every((beat) => beat.sceneContext === null),
    ).toBe(true);
    expect(
      snapshot.beats.find((beat) => beat.key === "state")?.sceneContext
        ?.presentationKey,
    ).not.toBe(localContext.presentationKey);
    const revised = {
      ...world,
      history: {
        ...world.history,
        nextSequence: world.history.nextSequence + 1,
      },
    };
    expect(
      projectOpeningWorldSnapshot(revised, playerPersonId).beats.find(
        (beat) => beat.key === "local",
      )?.sceneContext?.presentationKey,
    ).toBe(localContext.presentationKey);
    expect(snapshot.president).not.toBeNull();
    expect(snapshot.vicePresident).not.toBeNull();
    expect(snapshot.president?.personId).not.toBe(
      snapshot.vicePresident?.personId,
    );
    expect(
      snapshot.orientation.executive.map((item) => item.officeKey),
    ).toEqual(["us-president", "us-chief-justice", "us-vice-president"]);
    expect(snapshot.people.every((item) => item.relationship === null)).toBe(
      true,
    );
    const prior = world.history.events.filter((event) =>
      event.stableKey.startsWith("playtest65:prior-local"),
    );
    expect(prior).toHaveLength(4);
    expect(
      prior.every(
        (event) =>
          event.occurredAt < world.currentDate &&
          event.participants.length === 0 &&
          !event.involvedEntityIds.includes(playerPersonId),
      ),
    ).toBe(true);
    expect(
      projectPublicMatters(world)
        .filter((matter) =>
          matter.matterId.startsWith("playtest65:prior-local"),
        )
        .every((matter) => matter.concluded && !matter.openForComment),
    ).toBe(true);
    expect(ensureOpeningPriorLocalRecords(world, playerPersonId)).toBe(world);
    const archivedPublications = (world.history.publications ?? []).filter(
      (publication) =>
        prior.some((event) => event.id === publication.sourceEventId),
    );
    expect(archivedPublications).toHaveLength(4);
    expect(
      archivedPublications.every(
        (publication) => publication.publishedAt < world.currentDate,
      ),
    ).toBe(true);
    expect(serializeWorld(world)).toBe(before);
    expect(
      projectOpeningWorldSnapshot(deserializeWorld(before), playerPersonId),
    ).toEqual(snapshot);
  });
  it("binds the D.C. beat to its actual locality and preserves presentation identity through reload", () => {
    const { world, playerPersonId } = generateOpeningLife(
      prepareOpeningLife({
        ...DEFAULT_NEW_GAME_SETUP,
        seed: "regional-dc",
        placeKey: "1150000",
        startAge: 34,
      }),
    ).game!;
    const before = serializeWorld(world);
    const snapshot = projectOpeningWorldSnapshot(world, playerPersonId);
    const context = snapshot.beats.find(
      (beat) => beat.key === "district",
    )!.sceneContext!;
    expect(context).toMatchObject({
      placeKey: "1150000",
      sourceGeoid: "1150000",
      stateJurisdictionKey: "US-DC",
      jurisdictionId: world.people[playerPersonId]!.homeJurisdictionId,
    });
    expect(snapshot.beats.some((beat) => beat.key === "state")).toBe(false);
    expect(
      projectOpeningWorldSnapshot(
        deserializeWorld(before),
        playerPersonId,
      ).beats.find((beat) => beat.key === "district")?.sceneContext,
    ).toEqual(context);
    expect(serializeWorld(world)).toBe(before);
  });

  it("preserves older opening descriptors without the added initialization policy", () => {
    const legacy = { ...DEFAULT_NEW_GAME_SETUP, openingDataVersion: undefined };
    const { world, playerPersonId } = generateOpeningLife(
      prepareOpeningLife({ ...legacy, seed: "playtest65-w-legacy" }),
    ).game!;
    expect(
      projectOpeningWorldSnapshot(world, playerPersonId).vicePresident,
    ).toBeNull();
    expect(
      world.history.events.some((event) =>
        event.stableKey.startsWith("playtest65:prior-local"),
      ),
    ).toBe(false);
  });
});
