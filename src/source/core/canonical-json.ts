/**
 * Canonical JSON for source artefacts.
 *
 * Byte-identical in contract to `src/authoring/canonical-json.ts`, which is not
 * on accepted main yet (it arrived on the unaccepted #74 branch). 32A §4.3
 * settles the duplication rule: ship this implementation now with the same
 * vectors, and collapse the two the moment the authoring one lands.
 *
 * Keys are sorted so a diff shows a changed fact rather than a changed literal
 * order; arrays keep their meaningful order. `undefined` members are dropped
 * rather than serialized as null, because writing `null` would turn "nobody
 * knows" into a recorded value — the exact failure this substrate exists to
 * prevent. Anything this function does not explicitly understand throws, so a
 * `Date` cannot silently serialize as `{}`.
 */

export type JsonValue =
  | string
  | number
  | boolean
  | null
  | JsonValue[]
  | { [key: string]: JsonValue };

function canonicalize(value: unknown): JsonValue | undefined {
  if (value === undefined) return undefined;
  if (value === null) return null;
  if (typeof value === "string" || typeof value === "boolean") return value;
  if (typeof value === "number") {
    if (!Number.isFinite(value)) {
      throw new Error(
        `Canonical JSON cannot serialize the non-finite number ${String(value)}.`,
      );
    }
    return value;
  }
  if (Array.isArray(value)) {
    return value.map((entry) => canonicalize(entry) ?? null);
  }
  if (value instanceof Set) {
    return [...value].map((entry) => canonicalize(entry) ?? null);
  }
  if (value instanceof Map) {
    const fromMap: Record<string, JsonValue> = {};
    for (const key of [...value.keys()].map(String).sort()) {
      const entry = canonicalize(value.get(key));
      if (entry !== undefined) fromMap[key] = entry;
    }
    return fromMap;
  }
  if (typeof value === "object") {
    const record = value as Record<string, unknown>;
    const result: Record<string, JsonValue> = {};
    for (const key of Object.keys(record).sort()) {
      const entry = canonicalize(record[key]);
      if (entry !== undefined) result[key] = entry;
    }
    return result;
  }
  throw new Error(`Canonical JSON cannot serialize a ${typeof value}.`);
}

/** Deterministic JSON with sorted keys and a trailing newline. */
export function toCanonicalJson(value: unknown, indent = 2): string {
  const canonical = canonicalize(value);
  return `${JSON.stringify(canonical === undefined ? null : canonical, null, indent)}\n`;
}
