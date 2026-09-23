import type { EntityId, EntityKind } from "./types";

/**
 * 64-bit FNV-1a over UTF-16 code units, as lowercase hex.
 *
 * Computed in four 16-bit limbs rather than with BigInt: the same digits, a
 * few times faster. Every record's id is re-derived from its stable key each
 * time the world's integrity is checked, which happens on every commit, so
 * this function sits on the path of every action in the game. The limb
 * arithmetic stays exact: no intermediate exceeds 2^26.
 */
export function stableHash(value: string): string {
  // 0xcbf29ce484222325, least significant limb first.
  let h0 = 0x2325;
  let h1 = 0x8422;
  let h2 = 0x9ce4;
  let h3 = 0xcbf2;

  for (let index = 0; index < value.length; index += 1) {
    h0 ^= value.charCodeAt(index);
    // Multiply by the FNV prime 0x100000001b3 = 2^40 + 0x1b3, modulo 2^64.
    const t0 = h0 * 0x1b3;
    let t1 = h1 * 0x1b3;
    let t2 = h2 * 0x1b3 + (h0 << 8);
    let t3 = h3 * 0x1b3 + (h1 << 8);
    t1 += t0 >>> 16;
    t2 += t1 >>> 16;
    t3 += t2 >>> 16;
    h0 = t0 & 0xffff;
    h1 = t1 & 0xffff;
    h2 = t2 & 0xffff;
    h3 = t3 & 0xffff;
  }

  return (
    HEX_BYTE[h3 >>> 8]! +
    HEX_BYTE[h3 & 0xff]! +
    HEX_BYTE[h2 >>> 8]! +
    HEX_BYTE[h2 & 0xff]! +
    HEX_BYTE[h1 >>> 8]! +
    HEX_BYTE[h1 & 0xff]! +
    HEX_BYTE[h0 >>> 8]! +
    HEX_BYTE[h0 & 0xff]!
  );
}

const HEX_BYTE: readonly string[] = Array.from({ length: 256 }, (_, byte) =>
  byte.toString(16).padStart(2, "0"),
);

export function createStableId(kind: EntityKind, stableKey: string): EntityId {
  if (stableKey.length === 0) {
    throw new Error(`Cannot create a ${kind} ID from an empty stable key.`);
  }

  return `${kind}_${stableHash(`${kind}:v1:${stableKey}`)}` as EntityId;
}
