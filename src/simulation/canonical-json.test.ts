import { describe, expect, it } from "vitest";

import { canonicalJson } from "./canonical-json";
import { createDemoWorld } from "./demo";
import { createWorldSnapshot, worldContentId } from "./serialization";
import type { World } from "./types";

/**
 * The serialization that decides whether two worlds are the same world.
 *
 * The audit's MODERATE 2 was that they were not: `snapshotId` hashed
 * `JSON.stringify(world)`, which writes object keys in insertion order, so
 * rebuilding a record map produced a different revision of an identical life.
 * These are the properties that make the replacement worth trusting — and the
 * ones that make it a serialization rather than a bag of special cases.
 */
describe("Canonical JSON", () => {
  it("writes object keys in one order however they were inserted", () => {
    expect(canonicalJson({ b: 1, a: 2 })).toBe('{"a":2,"b":1}');
    expect(canonicalJson({ a: 2, b: 1 })).toBe(canonicalJson({ b: 1, a: 2 }));
  });

  it("keeps array order, because an array's order is its content", () => {
    expect(canonicalJson([3, 1, 2])).toBe("[3,1,2]");
    expect(canonicalJson([3, 1, 2])).not.toBe(canonicalJson([1, 2, 3]));
  });

  it("sorts keys at every depth, not only the top", () => {
    expect(canonicalJson({ outer: { z: [{ b: 1, a: 2 }], y: 3 } })).toBe(
      '{"outer":{"y":3,"z":[{"a":2,"b":1}]}}',
    );
  });

  it("agrees with JSON.stringify wherever key order cannot differ", () => {
    const values: readonly unknown[] = [
      null,
      true,
      false,
      0,
      -0,
      1.5,
      'a "quoted" string with \n and \u2028 and a tab\t',
      [],
      [1, "two", null, true],
      { a: [1, { b: null }] },
    ];
    for (const value of values) {
      expect(canonicalJson(value)).toBe(JSON.stringify(value));
    }
  });

  it("treats the awkward values exactly as JSON.stringify does", () => {
    // Dropped from objects, null inside arrays.
    expect(canonicalJson({ a: undefined, b: 1 })).toBe('{"b":1}');
    expect(canonicalJson([undefined])).toBe("[null]");
    expect(canonicalJson({ a: () => 1, b: 1 })).toBe('{"b":1}');
    // Not finite, so not representable.
    expect(canonicalJson(Number.NaN)).toBe("null");
    expect(canonicalJson(Number.POSITIVE_INFINITY)).toBe("null");
    // Honoured, so a Date is its ISO string in both.
    const date = new Date("2026-05-01T10:00:00.000Z");
    expect(canonicalJson({ at: date })).toBe(JSON.stringify({ at: date }));
  });

  it("refuses a cycle rather than quietly truncating one", () => {
    const cyclic: Record<string, unknown> = {};
    cyclic.self = cyclic;
    expect(() => canonicalJson(cyclic)).toThrow(TypeError);
  });

  it("is not confused by a key that looks like another key's value", () => {
    expect(canonicalJson({ 'a"b': 1, ab: 2 })).toBe(
      JSON.stringify({ 'a"b': 1, ab: 2 }),
    );
  });
});

/**
 * The same world with its record maps rebuilt in the opposite insertion order:
 * every explicit order array and every value left exactly as it was.
 */
function reversedRecordOrder(world: World): World {
  const reverse = <T>(record: Record<string, T>): Record<string, T> =>
    Object.fromEntries(Object.entries(record).reverse());
  return {
    ...world,
    people: reverse(world.people),
    jurisdictions: reverse(world.jurisdictions),
  };
}

describe("A world's identity is its content", () => {
  it("does not change when a record map is rebuilt in another order", () => {
    const world = createDemoWorld("canonical-identity");
    const reordered = reversedRecordOrder(world);

    // The premise: different bytes, same world.
    expect(JSON.stringify(reordered)).not.toBe(JSON.stringify(world));
    expect(Object.keys(reordered.people)).toEqual(
      [...Object.keys(world.people)].reverse(),
    );
    expect(reordered.personOrder).toEqual(world.personOrder);

    expect(canonicalJson(reordered)).toBe(canonicalJson(world));
    expect(worldContentId(reordered)).toBe(worldContentId(world));
    expect(createWorldSnapshot(reordered).snapshotId).toBe(
      createWorldSnapshot(world).snapshotId,
    );
  });

  it("does change when anything about the world does", () => {
    const world = createDemoWorld("canonical-difference");
    const different = createDemoWorld("canonical-difference-other");
    expect(worldContentId(different)).not.toBe(worldContentId(world));
  });

  it("is stable across repeated derivation", () => {
    const world = createDemoWorld("canonical-stability");
    expect(worldContentId(world)).toBe(worldContentId(world));
    expect(canonicalJson(world)).toBe(canonicalJson(world));
  });
});
