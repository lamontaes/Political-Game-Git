import type { EntityId, EntityKind } from "./types";

const FNV_OFFSET_64 = 0xcbf29ce484222325n;
const FNV_PRIME_64 = 0x100000001b3n;

export function stableHash(value: string): string {
  let hash = FNV_OFFSET_64;

  for (let index = 0; index < value.length; index += 1) {
    hash ^= BigInt(value.charCodeAt(index));
    hash = BigInt.asUintN(64, hash * FNV_PRIME_64);
  }

  return hash.toString(16).padStart(16, "0");
}

export function createStableId(kind: EntityKind, stableKey: string): EntityId {
  if (stableKey.length === 0) {
    throw new Error(`Cannot create a ${kind} ID from an empty stable key.`);
  }

  return `${kind}_${stableHash(`${kind}:v1:${stableKey}`)}` as EntityId;
}
