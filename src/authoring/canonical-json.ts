/**
 * Canonical JSON for authoring artefacts.
 *
 * Every report, scaffold and manifest this pipeline emits is compared against
 * its previous self — by a reviewer reading a diff, and by tests asserting that
 * the same inputs produce the same bytes. That only works if key order is fixed
 * rather than inherited from whatever order a literal happened to be written
 * in, so keys are sorted and arrays keep their meaningful order.
 *
 * `undefined` members are dropped rather than serialized as null. A missing
 * measurement must stay missing: writing `null` would turn "nobody knows" into
 * a recorded value, which is the failure mode this whole pipeline is built to
 * avoid.
 */

export type JsonValue =
  string | number | boolean | null | JsonValue[] | { [key: string]: JsonValue };

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
