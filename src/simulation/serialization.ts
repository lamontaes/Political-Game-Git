import { canonicalJson } from "./canonical-json";
import { createStableId } from "./ids";
import type { EntityId, IsoDate, World } from "./types";
import { assertWorldIntegrity } from "./world";

/**
 * Format 15 changed how `snapshotId` is derived, not what a world is.
 *
 * Up to format 14 the id hashed `JSON.stringify(world)`, so it named the
 * insertion order of the world's record maps as much as it named the world.
 * It now hashes the canonical serialization, and a record written under the
 * older rule therefore carries an id this build would not compute. That is a
 * format change and is declared as one: an older record is refused as an
 * unsupported version, which is true, rather than as a world that was altered
 * after it was written, which is not.
 */
export const WORLD_SNAPSHOT_FORMAT_VERSION = 15;

export interface WorldSnapshot {
  readonly format: "political-life-world";
  readonly formatVersion: typeof WORLD_SNAPSHOT_FORMAT_VERSION;
  readonly snapshotId: EntityId;
  readonly worldId: EntityId;
  readonly savedAtWorldDate: IsoDate;
  readonly world: World;
}

export function createWorldSnapshot(world: World): WorldSnapshot {
  assertWorldIntegrity(world);
  return {
    format: "political-life-world",
    formatVersion: WORLD_SNAPSHOT_FORMAT_VERSION,
    // Canonical, so that a world rebuilt with its record maps in a different
    // insertion order is recognised as the world it is.
    snapshotId: createStableId("snapshot", canonicalJson(world)),
    worldId: world.id,
    savedAtWorldDate: world.currentDate,
    world,
  };
}

export function serializeWorld(world: World): string {
  return JSON.stringify(createWorldSnapshot(world));
}

/**
 * The name of a world's content, for anything that stores it.
 *
 * This is the snapshot id: a 64-bit hash of the world's canonical
 * serialization. It is a name, and the honest limits of a name are worth
 * stating, because the comment this replaces claimed more than a 64-bit hash
 * can carry.
 *
 * What it does guarantee: two worlds with different content identities are
 * certainly different worlds, and two worlds that differ only in the
 * insertion order of their record maps share one identity, because the input
 * is canonical.
 *
 * What it does not guarantee: that equal identities mean equal worlds. No
 * 64-bit digest can. So this is used to *name* a revision — in caches, in
 * summaries, in the request bookkeeping a store does for itself — and never
 * as the last word on whether a write can be skipped. Skipping durable work
 * is decided by comparing the canonical bytes actually on disk against the
 * canonical bytes about to be written.
 *
 * A domain counter is not a substitute for either: `actionSequence` moves when
 * time advances and stays put when history is written, so two canonically
 * different worlds routinely share one. Anything deciding durability from that
 * number will call the second of them already saved and lose it.
 */
export function worldContentId(world: World): EntityId {
  return createWorldSnapshot(world).snapshotId;
}

export function deserializeWorld(payload: string): World {
  let parsed: unknown;
  try {
    parsed = JSON.parse(payload);
  } catch (error) {
    throw new Error("World snapshot is not valid JSON.", { cause: error });
  }
  if (!isRecord(parsed)) {
    throw new Error("World snapshot must be a JSON object.");
  }
  if (
    parsed.format !== "political-life-world" ||
    parsed.formatVersion !== WORLD_SNAPSHOT_FORMAT_VERSION
  ) {
    throw new Error("World snapshot uses an unsupported format version.");
  }
  if (!isRecord(parsed.world)) {
    throw new Error("World snapshot is missing its world payload.");
  }

  const world = parsed.world as unknown as World;
  assertWorldIntegrity(world);
  const expected = createWorldSnapshot(world);
  if (
    parsed.snapshotId !== expected.snapshotId ||
    parsed.worldId !== world.id ||
    parsed.savedAtWorldDate !== world.currentDate
  ) {
    throw new Error("World snapshot metadata does not match its payload.");
  }
  return structuredClone(world);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}
