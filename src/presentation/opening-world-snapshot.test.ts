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
