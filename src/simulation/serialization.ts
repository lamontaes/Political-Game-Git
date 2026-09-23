import { canonicalJson } from "./canonical-json";
import { createStableId } from "./ids";
import { packRollCalls, unpackRollCalls } from "./roll-call-packing";
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
/** Default format remains unchanged for every life without runtime packs. */
export const WORLD_SNAPSHOT_FORMAT_VERSION = 15;
/** Old readers must refuse instead of silently ignoring runtime definitions. */
export const CONTENT_PACK_SNAPSHOT_FORMAT_VERSION = 16;

/**
 * Formats 17 and 18 are 15 and 16 with their roll calls packed on disk (see
 * `roll-call-packing.ts`). The world they hold is the same world; only the
 * bytes differ, and an older reader must refuse them rather than misread a
 * packed vote as a malformed one. A world with no roll call to pack is still
 * written as 15 or 16, byte for byte as before, and every format is read.
 */
export const PACKED_WORLD_SNAPSHOT_FORMAT_VERSION = 17;
export const PACKED_CONTENT_PACK_SNAPSHOT_FORMAT_VERSION = 18;

export type WorldSnapshotFormatVersion =
  | typeof WORLD_SNAPSHOT_FORMAT_VERSION
  | typeof CONTENT_PACK_SNAPSHOT_FORMAT_VERSION
  | typeof PACKED_WORLD_SNAPSHOT_FORMAT_VERSION
  | typeof PACKED_CONTENT_PACK_SNAPSHOT_FORMAT_VERSION;

export interface WorldSnapshot {
  readonly format: "political-life-world";
  readonly formatVersion: WorldSnapshotFormatVersion;
  readonly snapshotId: EntityId;
  readonly worldId: EntityId;
  readonly savedAtWorldDate: IsoDate;
  readonly world: World;
}

/**
 * Snapshot ids by world. A World is never edited in place (every write makes a
 * new one), so the id of a given World object never changes. Computing it
 * means writing the whole world out canonically, which on a long save is a
 * string of 80 MB; opening and checking a save asked for it three times.
 */
const SNAPSHOT_IDS = new WeakMap<World, EntityId>();

function snapshotIdOf(world: World): EntityId {
  let id = SNAPSHOT_IDS.get(world);
  if (id === undefined) {
    id = createStableId("snapshot", canonicalJson(world));
    SNAPSHOT_IDS.set(world, id);
  }
  return id;
}

export function createWorldSnapshot(world: World): WorldSnapshot {
  assertWorldIntegrity(world);
  return {
    format: "political-life-world",
    formatVersion:
      world.contentPacks === undefined
        ? WORLD_SNAPSHOT_FORMAT_VERSION
        : CONTENT_PACK_SNAPSHOT_FORMAT_VERSION,
    // Canonical, so that a world rebuilt with its record maps in a different
    // insertion order is recognized as the world it is.
    snapshotId: snapshotIdOf(world),
    worldId: world.id,
    savedAtWorldDate: world.currentDate,
    world,
  };
}

/**
 * The saved form of a world: packed when it has roll calls to pack, otherwise
 * exactly the plain snapshot.
 */
export function serializeWorld(world: World): string {
  return serializeWorldSnapshot(createWorldSnapshot(world));
}

/** A snapshot as written to disk, in the format `storedFormatVersion` names. */
export function serializeWorldSnapshot(snapshot: WorldSnapshot): string {
  const packed = packRollCalls(snapshot.world);
  if (packed === null) return JSON.stringify(snapshot);
  return JSON.stringify({
    ...snapshot,
    formatVersion: packedFormat(snapshot.formatVersion),
    world: packed.world,
    rollCalls: packed.packing,
  });
}

/** The format a snapshot is stored under. */
export function storedFormatVersion(
  snapshot: WorldSnapshot,
): WorldSnapshotFormatVersion {
  return packRollCallsApplies(snapshot.world)
    ? packedFormat(snapshot.formatVersion)
    : snapshot.formatVersion;
}

/**
 * A world written in the format it was read from. A store that checks a
 * record was not altered after it was written compares against this, so a
 * save written before packing existed still reads as the save it is.
 */
export function serializeWorldAs(
  world: World,
  formatVersion: WorldSnapshotFormatVersion,
): string {
  const snapshot = createWorldSnapshot(world);
  return formatVersion === snapshot.formatVersion
    ? JSON.stringify(snapshot)
    : serializeWorldSnapshot(snapshot);
}

function packRollCallsApplies(world: World): boolean {
  return packRollCalls(world) !== null;
}

function packedFormat(
  formatVersion: WorldSnapshotFormatVersion,
): WorldSnapshotFormatVersion {
  return formatVersion === CONTENT_PACK_SNAPSHOT_FORMAT_VERSION ||
    formatVersion === PACKED_CONTENT_PACK_SNAPSHOT_FORMAT_VERSION
    ? PACKED_CONTENT_PACK_SNAPSHOT_FORMAT_VERSION
    : PACKED_WORLD_SNAPSHOT_FORMAT_VERSION;
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

/**
 * A copy of a saved world that the caller may do with as it likes, including
 * edit it in place to test that a check catches the change.
 */
export function deserializeWorld(payload: string): World {
  return structuredClone(readWorldSnapshot(payload).world);
}

/**
 * A saved world, with the format it was written in. The world is the checked
 * one itself, not a copy, so it must not be edited in place: an edit would go
 * unchecked. The browser save store reads through this, where a copy doubled
 * the memory a big save took to open and threw away the lookups the check had
 * just built.
 */
export function readWorldSnapshot(payload: string): {
  readonly world: World;
  readonly formatVersion: WorldSnapshotFormatVersion;
} {
  let parsed: unknown;
  try {
    parsed = JSON.parse(payload);
  } catch (error) {
    throw new Error("World snapshot is not valid JSON.", { cause: error });
  }
  if (!isRecord(parsed)) {
    throw new Error("World snapshot must be a JSON object.");
  }
  const formatVersion = parsed.formatVersion;
  const packed =
    formatVersion === PACKED_WORLD_SNAPSHOT_FORMAT_VERSION ||
    formatVersion === PACKED_CONTENT_PACK_SNAPSHOT_FORMAT_VERSION;
  if (
    parsed.format !== "political-life-world" ||
    (!packed &&
      formatVersion !== WORLD_SNAPSHOT_FORMAT_VERSION &&
      formatVersion !== CONTENT_PACK_SNAPSHOT_FORMAT_VERSION)
  ) {
    throw new Error("World snapshot uses an unsupported format version.");
  }
  if (!isRecord(parsed.world)) {
    throw new Error("World snapshot is missing its world payload.");
  }
  if (!packed && parsed.rollCalls !== undefined) {
    throw new Error("World snapshot packs roll calls its format does not.");
  }

  const world = packed
    ? unpackRollCalls(parsed.world as unknown as World, parsed.rollCalls)
    : (parsed.world as unknown as World);
  if (
    (world.contentPacks !== undefined) !==
    (formatVersion === CONTENT_PACK_SNAPSHOT_FORMAT_VERSION ||
      formatVersion === PACKED_CONTENT_PACK_SNAPSHOT_FORMAT_VERSION)
  ) {
    throw new Error(
      "World content packs require their supported snapshot format.",
    );
  }
  assertWorldIntegrity(world);
  const expected = createWorldSnapshot(world);
  if (
    parsed.snapshotId !== expected.snapshotId ||
    parsed.worldId !== world.id ||
    parsed.savedAtWorldDate !== world.currentDate
  ) {
    throw new Error("World snapshot metadata does not match its payload.");
  }
  // A packed format is only ever written for a world with a roll call to
  // pack. A plain one may hold roll calls: every save before packing did.
  if (packed && !packRollCallsApplies(world)) {
    throw new Error("World snapshot format does not match its roll calls.");
  }
  return {
    world,
    formatVersion: formatVersion as WorldSnapshotFormatVersion,
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}
