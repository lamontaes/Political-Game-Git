/**
 * One serialization for a world, whatever order its keys happen to be in.
 *
 * `JSON.stringify` writes object keys in insertion order, so two worlds that
 * are the same world in every semantic respect serialize to different bytes
 * as soon as one of them rebuilt a record map — `{...world.people}` after a
 * delete-and-reinsert, a structured clone that took a different path, a
 * reducer that spread the changed person last. The audit reproduced exactly
 * that: reversing the insertion order of `people` and `jurisdictions`, leaving
 * every explicit order array and every value untouched, produced a different
 * world identity.
 *
 * Content identity has to be about content. Records keyed by entity id are
 * sets, not sequences — the sequences the game actually cares about are the
 * explicit `personOrder`-style arrays, and those are arrays, so they keep
 * their order here. Sorting object keys makes identity semantic without
 * making it lossy.
 *
 * This is the input to the hash, not the stored payload. What is written to
 * disk stays `JSON.stringify` of the snapshot, so a record read back and
 * re-serialized is still byte-identical to what was written.
 */

/** Key order is by UTF-16 code unit, which is what `Array.prototype.sort` does. */
function compareKeys(left: string, right: string): number {
  return left < right ? -1 : left > right ? 1 : 0;
}

/**
 * `JSON.stringify` with object keys in sorted order.
 *
 * Everything else follows `JSON.stringify` exactly, including the parts that
 * are easy to get wrong: `undefined` and functions are dropped from objects
 * and become `null` inside arrays, `toJSON` is honoured, and a cycle throws
 * rather than being quietly truncated. A world never holds any of the exotic
 * cases, but a serializer that disagrees with `JSON.stringify` about them
 * would be a second definition of the same thing, and two definitions is how
 * identity bugs start.
 */
export function canonicalJson(value: unknown): string {
  const seen = new Set<object>();

  function write(input: unknown): string | undefined {
    let current = input;
    if (
      current !== null &&
      typeof current === "object" &&
      typeof (current as { toJSON?: unknown }).toJSON === "function"
    ) {
      current = (current as { toJSON: () => unknown }).toJSON();
    }

    if (current === null) return "null";
    switch (typeof current) {
      case "string":
        return JSON.stringify(current);
      case "number":
        return Number.isFinite(current) ? String(current) : "null";
      case "boolean":
        return current ? "true" : "false";
      case "bigint":
        throw new TypeError("Do not know how to serialize a BigInt");
      case "undefined":
      case "function":
      case "symbol":
        return undefined;
    }

    const object = current as object;
    if (seen.has(object)) {
      throw new TypeError("Converting circular structure to JSON");
    }
    seen.add(object);
    try {
      if (Array.isArray(object)) {
        // Arrays are ordered on purpose; their order is the content.
        const parts = object.map((entry) => write(entry) ?? "null");
        return `[${parts.join(",")}]`;
      }
      const record = object as Record<string, unknown>;
      const parts: string[] = [];
      for (const key of Object.keys(record).sort(compareKeys)) {
        const written = write(record[key]);
        if (written === undefined) continue;
        parts.push(`${JSON.stringify(key)}:${written}`);
      }
      return `{${parts.join(",")}}`;
    } finally {
      seen.delete(object);
    }
  }

  return write(value) ?? "undefined";
}
