import { describe, expect, it } from "vitest";

import { JSON_CHUNK_LENGTH } from "../simulation/json-chunks";
import {
  createWorldSnapshot,
  readWorldSnapshot,
  serializeWorld,
  serializeWorldSnapshotPayload,
  worldPayloadMatches,
} from "../simulation/serialization";
import type { World } from "../simulation/types";
import {
  createBrowserWorldRecord,
  validateBrowserWorldRecord,
} from "./browser-world-repository";
import { DEFAULT_NEW_GAME_SETUP } from "./new-game";
import { generateOpeningLife, prepareOpeningLife } from "./opening-life";

/**
 * A world played for about twenty years writes out longer than the longest
 * string JavaScript can hold, and saving one failed with "Invalid string
 * length". Such a save is now written, stored and read back in pieces, and a
 * save that fits in one string is stored exactly as before.
 */

/** V8's longest string, in UTF-16 code units: 2^29 - 24. */
const LONGEST_STRING = 2 ** 29 - 24;

function openingWorld(seed: string): World {
  return generateOpeningLife(
    prepareOpeningLife({
      ...DEFAULT_NEW_GAME_SETUP,
      placeKey: "nebraska",
      seed,
      startAge: 30,
    }),
  ).game!.world;
}

describe("a save longer than a string", () => {
  it("stores a save that fits in one string exactly as before", () => {
    const world = openingWorld("b18-save-fits");
    const record = createBrowserWorldRecord(world, "2026-09-29T06:00:00.000Z");
    expect(record.payload).toBe(serializeWorld(world));
    expect(validateBrowserWorldRecord(record).payload).toBe(record.payload);
  });

  it("reads a save written in pieces as the world it is, and sees any change", () => {
    const world = openingWorld("b18-save-pieces");
    const snapshot = createWorldSnapshot(world);
    const whole = serializeWorld(world);
    // A save that fits is written whole, even when asked for small pieces.
    expect(serializeWorldSnapshotPayload(snapshot, 4096)).toBe(whole);
    // Pieces cut anywhere read the same; the big test below writes real ones.
    const cut = whole.match(/[\s\S]{1,4096}/g)!;
    const read = readWorldSnapshot(cut);
    expect(read.world).toEqual(readWorldSnapshot(whole).world);
    expect(createWorldSnapshot(read.world).snapshotId).toBe(
      snapshot.snapshotId,
    );
    expect(worldPayloadMatches(cut, read.world, read.formatVersion)).toBe(true);

    const record = createBrowserWorldRecord(world, "2026-09-29T06:00:00.000Z");
    expect(
      validateBrowserWorldRecord({ ...record, payload: cut }).payload,
    ).toBe(cut);
    const changed = cut.map((piece, index) =>
      index === 3
        ? piece.replace(/.$/, (last) => (last === "a" ? "b" : "a"))
        : piece,
    );
    expect(() =>
      validateBrowserWorldRecord({ ...record, payload: changed }),
    ).toThrow();
    expect(() =>
      validateBrowserWorldRecord({ ...record, payload: cut.slice(0, -1) }),
    ).toThrow();
  });

  it("saves and reopens a world whose saved text passes the longest string", () => {
    const base = openingWorld("b18-save-too-long");
    // One record of a thousand characters, listed until the saved world
    // passes the longest string by about a tenth. A list the world does not
    // read stands in for twenty years of history: the save writes and
    // reads it like any other list.
    const entry = { text: "x".repeat(1000) };
    const count = Math.ceil((LONGEST_STRING * 1.1) / 1011);
    const world = {
      ...base,
      longHistoryStandIn: new Array<typeof entry>(count).fill(entry),
    } as World;

    const snapshot = createWorldSnapshot(world);
    const payload = serializeWorldSnapshotPayload(snapshot);
    expect(Array.isArray(payload)).toBe(true);
    const pieces = payload as readonly string[];
    let total = 0;
    for (const piece of pieces) {
      expect(piece.length).toBeLessThan(LONGEST_STRING);
      expect(piece.length).toBeLessThanOrEqual(JSON_CHUNK_LENGTH + 1100);
      total += piece.length;
    }
    expect(total).toBeGreaterThan(LONGEST_STRING);

    const record = createBrowserWorldRecord(world, "2026-09-29T06:00:00.000Z");
    const reopened = validateBrowserWorldRecord(record);
    expect(reopened.metadata.snapshotId).toBe(snapshot.snapshotId);
    const read = readWorldSnapshot(reopened.payload);
    const list = (read.world as unknown as { longHistoryStandIn: unknown[] })
      .longHistoryStandIn;
    expect(list.length).toBe(count);
    expect(list[count - 1]).toEqual(entry);
    expect(read.world.id).toBe(base.id);
    expect(read.world.currentDate).toBe(base.currentDate);
    expect(createWorldSnapshot(read.world).snapshotId).toBe(
      snapshot.snapshotId,
    );
  }, 600_000);
});
