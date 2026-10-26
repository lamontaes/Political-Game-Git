/**
 * Large place-keyed data tables, read on first use and kept only for the
 * states a world actually asks about (owner ruling on PR #4123, Oct 13 2026).
 *
 * Importing the engine used to parse every row for all 56 states and
 * territories before a town existed. A table built here reads its file the
 * first time a key from a new state is asked for, keeps that state's rows
 * and lets the rest go. Callers keep their own signatures; only the table
 * object they read from changes.
 *
 * The reader is a seam: Node reads the file (the bench, tests and tools all
 * run on Node); another host can supply its own with `setJsonDataReader`.
 */

export type JsonDataReader = (url: URL) => unknown;

interface FileReader {
  readFileSync(url: URL, encoding: "utf8"): string;
}

function nodeReader(url: URL): unknown {
  const fs = (
    globalThis as {
      process?: {
        getBuiltinModule?: (id: string) => FileReader | undefined;
      };
    }
  ).process?.getBuiltinModule?.("node:fs");
  if (!fs)
    throw new Error(
      `No data reader for ${url.pathname}: call setJsonDataReader first`,
    );
  return JSON.parse(fs.readFileSync(url, "utf8")) as unknown;
}

let reader: JsonDataReader = nodeReader;

/** Replaces the file reader; returns the previous one. */
export function setJsonDataReader(next: JsonDataReader): JsonDataReader {
  const previous = reader;
  reader = next;
  return previous;
}

/** Reads one JSON data file now (no caching). */
export function readJsonData(url: URL): unknown {
  return reader(url);
}

/** A value built once, the first time it is asked for. */
export function lazyValue<T>(build: () => T): () => T {
  let built = false;
  let value: T | undefined;
  return () => {
    if (!built) {
      value = build();
      built = true;
    }
    return value as T;
  };
}

/**
 * The state group of a place, county or school key: the two-digit state code
 * that starts every Census geoid and NCES id (optionally followed by
 * `:kind`), or `territory:XX` for the
 * territory places keyed by name. Any other key is an error, never a silent
 * miss.
 */
export function geoidGroup(key: string): string {
  if (/^\d{2}\d*(?::[a-z-]+)?$/.test(key)) return key.slice(0, 2);
  const territory = /^(territory:[A-Z]{2}):/.exec(key);
  if (territory) return territory[1]!;
  throw new Error(`Not a place, county or school key: ${JSON.stringify(key)}`);
}

export interface GroupedTable {
  /** A reader for one keyed section; a missing key in a known group is undefined. */
  section<V>(name: string): (key: string) => V | undefined;
  /** Every field of the file except the keyed sections, read once. */
  rest<R>(): R;
  /** Groups currently held (for tests and measurement). */
  heldGroups(): readonly string[];
}

/**
 * A JSON file whose named top-level sections are records keyed by place,
 * county or school. The first key asked for in a new group reads the file,
 * keeps that group's rows of every section and drops the rest.
 */
export function groupedJsonTable(
  url: URL,
  sections: readonly string[],
  groupOf: (key: string) => string = geoidGroup,
): GroupedTable {
  const groups = new Map<string, Map<string, Map<string, unknown>>>();
  let rest: Record<string, unknown> | undefined;
  const read = (): Record<string, unknown> => {
    const whole = reader(url);
    if (typeof whole !== "object" || whole === null || Array.isArray(whole))
      throw new Error(`Data file is not an object: ${url.pathname}`);
    return whole as Record<string, unknown>;
  };
  const load = (group: string): Map<string, Map<string, unknown>> => {
    const held = groups.get(group);
    if (held) return held;
    const whole = read();
    const slice = new Map<string, Map<string, unknown>>();
    for (const name of sections) {
      const record = whole[name];
      if (typeof record !== "object" || record === null)
        throw new Error(`Data file has no section ${name}: ${url.pathname}`);
      const rows = new Map<string, unknown>();
      for (const [key, value] of Object.entries(record))
        if (groupOf(key) === group) rows.set(key, value);
      slice.set(name, rows);
    }
    if (!rest) {
      rest = { ...whole };
      for (const name of sections) delete rest[name];
    }
    groups.set(group, slice);
    return slice;
  };
  return {
    section<V>(name: string) {
      if (!sections.includes(name))
        throw new Error(`Unknown data section ${name}: ${url.pathname}`);
      return (key: string) =>
        load(groupOf(key)).get(name)!.get(key) as V | undefined;
    },
    rest<R>() {
      if (!rest) {
        const whole = read();
        rest = { ...whole };
        for (const name of sections) delete rest[name];
      }
      return rest as R;
    },
    heldGroups: () => [...groups.keys()],
  };
}
