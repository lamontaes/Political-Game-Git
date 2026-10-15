import { bookkeeping } from "./bookkeeping";
import { makeIsoDate } from "./kernel/dates";
import type { Source } from "./types";

export type ModuleValue =
  | null
  | string
  | number
  | boolean
  | readonly ModuleValue[]
  | { readonly [key: string]: ModuleValue };
export type ModuleRow = Readonly<{ id: string; [key: string]: unknown }>;

export function moduleKey(value: string): string {
  if (typeof value !== "string" || !value.trim() || value !== value.trim())
    throw new Error("Module keys must be nonempty, trimmed strings.");
  return value;
}

/**
 * The same frozen copy, for play: rows stay immutable records (engines check
 * that), only the per-field checks are skipped.
 */
function plainCopy(value: unknown): unknown {
  if (value === null || typeof value !== "object") return value;
  if (Array.isArray(value)) return Object.freeze(value.map(plainCopy));
  const result = Object.create(null) as Record<string, unknown>;
  for (const key of Object.keys(value))
    result[key] = plainCopy((value as Record<string, unknown>)[key]);
  return Object.freeze(result);
}

/**
 * Serializable data only. Never retain caller objects, accessors, or mutable
 * containers. With bookkeeping on every value is checked as it is copied; in
 * play the copy is the same without the checks (they only ever throw).
 */
export function moduleData<T>(input: T): T {
  if (!bookkeeping()) return plainCopy(input) as T;
  const active = new Set<object>();
  function copy(value: unknown): unknown {
    if (
      value === null ||
      typeof value === "string" ||
      typeof value === "boolean"
    )
      return value;
    if (typeof value === "number" && Number.isFinite(value)) return value;
    if (typeof value !== "object" || value === null || active.has(value))
      throw new Error("Module data must be finite, acyclic JSON data.");
    const array = Array.isArray(value);
    const proto = Object.getPrototypeOf(value);
    if (
      array
        ? proto !== Array.prototype
        : proto !== Object.prototype && proto !== null
    )
      throw new Error("Module data requires plain objects and arrays.");
    const keys = Reflect.ownKeys(value);
    const result = array ? [] : Object.create(null);
    active.add(value);
    try {
      for (const key of keys) {
        if (array && key === "length") continue;
        if (typeof key !== "string")
          throw new Error("Module data has a symbol field.");
        const field = Object.getOwnPropertyDescriptor(value, key);
        if (!field || !("value" in field) || !field.enumerable)
          throw new Error("Module data has an accessor or hidden field.");
        if (
          array &&
          (!/^(0|[1-9]\d*)$/.test(key) ||
            Number(key) >= (value as unknown[]).length)
        )
          throw new Error("Module data array has a non-index field.");
        Object.defineProperty(result, key, {
          value: copy(field.value),
          enumerable: true,
        });
      }
      if (array && keys.length !== (value as unknown[]).length + 1)
        throw new Error("Module data requires dense arrays.");
      return Object.freeze(result);
    } finally {
      active.delete(value);
    }
  }
  return copy(input) as T;
}

export function moduleSource(source: Source, date: string): Source {
  const row = moduleData(source);
  if (
    !row ||
    !["SOURCED", "ESTIMATED"].includes(row.tag) ||
    !moduleKey(row.citation) ||
    makeIsoDate(row.asOf) > makeIsoDate(date) ||
    (row.tag === "ESTIMATED" && !moduleKey(row.estimatedFrom!))
  )
    throw new Error("Module Source is invalid or future dated.");
  return row;
}
