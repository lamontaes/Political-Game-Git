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
        household: "alone",
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
    ).toEqual(["us-president", "us-vice-president"]);
    expect(snapshot.people.every((item) => item.relationship === null)).toBe(
      true,
    );
    expect(serializeWorld(world)).toBe(before);
    expect(
      projectOpeningWorldSnapshot(deserializeWorld(before), playerPersonId),
    ).toEqual(snapshot);
  });
  it("preserves older opening descriptors without the added initialization policy", () => {
    const { openingDataVersion: _version, ...legacy } = DEFAULT_NEW_GAME_SETUP;
    const { world, playerPersonId } = generateOpeningLife(
      prepareOpeningLife({ ...legacy, seed: "playtest65-w-legacy" }),
    ).game!;
    expect(
      projectOpeningWorldSnapshot(world, playerPersonId).vicePresident,
    ).toBeNull();
  });
});
