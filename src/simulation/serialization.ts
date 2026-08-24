import { createStableId } from "./ids";
import type { EntityId, IsoDate, World } from "./types";
import { assertWorldIntegrity } from "./world";

export interface WorldSnapshot {
  readonly format: "political-life-world";
  readonly formatVersion: 11;
  readonly snapshotId: EntityId;
  readonly worldId: EntityId;
  readonly savedAtWorldDate: IsoDate;
  readonly world: World;
}

export function createWorldSnapshot(world: World): WorldSnapshot {
  assertWorldIntegrity(world);
  const worldPayload = JSON.stringify(world);
  return {
    format: "political-life-world",
    formatVersion: 11,
    snapshotId: createStableId("snapshot", worldPayload),
    worldId: world.id,
    savedAtWorldDate: world.currentDate,
    world,
  };
}

export function serializeWorld(world: World): string {
  return JSON.stringify(createWorldSnapshot(world));
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
  if (parsed.format !== "political-life-world" || parsed.formatVersion !== 11) {
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
