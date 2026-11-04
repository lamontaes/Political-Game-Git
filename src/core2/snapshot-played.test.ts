// A save of the played world loads and then runs exactly as the original
// (core-snapshot-cover-rest): the world the player gets (buildBenchWorld, a
// place drawn from all 56), saved after a month, restored into the same world
// rebuilt, and both run on; every saved field must then agree. An engine whose
// state lives outside what the snapshot keeps shows here as a differing field.
import { randomBytes } from "node:crypto";
import { deserialize, serialize } from "node:v8";
import { describe, expect, it } from "vitest";
import { buildBenchWorld } from "../bench/world";
import { drawPlace } from "../../scripts/core2-year/place";
import { setBookkeeping } from "./bookkeeping";
import { gameStartDate } from "./game-start";
import { advanceCore } from "./life";
import {
  decoder,
  restoreWorld,
  snapshotWorld,
  uncoveredModules,
  type WorldSnapshot,
} from "./snapshot";
import { addDays, makeIsoDate } from "./kernel/dates";
import type { CoreState } from "./types";

const seed = process.env.GOLDEN_PATH_SEED ?? randomBytes(16).toString("hex");
const place = drawPlace(seed, "snapshot-played");

/** Each saved part's content as text, key order aside. */
function content(core: CoreState): Record<string, string> {
  const world = decoder()(snapshotWorld(core).world) as Record<
    string,
    Record<string, unknown>
  >;
  const plain = (value: unknown): unknown => {
    if (value instanceof Map) return { $map: [...value].map(plain) };
    if (value instanceof Set) return { $set: [...value].map(plain) };
    if (typeof value === "bigint") return `${value}n`;
    if (Array.isArray(value)) return value.map(plain);
    if (value && typeof value === "object")
      return Object.fromEntries(
        Object.keys(value)
          .sort()
          .map((key) => [key, plain((value as Record<string, unknown>)[key])]),
      );
    return value;
  };
  const out: Record<string, string> = {};
  for (const [part, fields] of Object.entries(world))
    for (const [field, value] of Object.entries(fields ?? {}))
      out[`${part}.${field}`] = JSON.stringify(plain(value));
  return out;
}

describe(`a save of the played world in ${place.name} (${place.key}), seed ${seed}`, () => {
  it("loads into the rebuilt world, which then runs exactly as the original", () => {
    setBookkeeping(false);
    const build = () =>
      buildBenchWorld(place.seed, gameStartDate(), {
        twoLevel: true,
        placeKey: place.key,
      });
    const first = build();
    const original = first.core;
    const start = makeIsoDate(original.date);
    advanceCore(original, addDays(start, 30));
    const uncovered = uncoveredModules(original);
    process.stdout.write(
      `SNAPSHOT ${place.name}: ${original.modules.size} engines, ${uncovered.length} uncovered: ${uncovered.join(", ")}\n`,
    );
    const saved = JSON.stringify(snapshotWorld(original));
    // The story director's memory is saved beside the world (agreements/3-5.md),
    // through bytes as a save file would hold it.
    const savedDirector = serialize(first.director.save());
    const second = build();
    const loaded = second.core;
    restoreWorld(loaded, JSON.parse(saved) as WorldSnapshot);
    second.director.restore(
      deserialize(savedDirector) as ReturnType<typeof first.director.save>,
    );
    expect(loaded.date).toBe(original.date);
    advanceCore(original, addDays(start, 75));
    advanceCore(loaded, addDays(start, 75));
    const a = content(original),
      b = content(loaded);
    // The director's own memory, compared the same way, field by field.
    const directorText = (save: unknown): Record<string, string> =>
      Object.fromEntries(
        Object.entries(save as Record<string, unknown>).map(([k, v]) => [
          `director.${k}`,
          JSON.stringify(v, (_key, x) =>
            x instanceof Map
              ? { $map: [...x] }
              : x instanceof Set
                ? { $set: [...x] }
                : x,
          ),
        ]),
      );
    Object.assign(a, directorText(first.director.save()));
    Object.assign(b, directorText(second.director.save()));
    const differing = Object.keys(a).filter((key) => a[key] !== b[key]);
    process.stdout.write(
      `SNAPSHOT ${place.name}: ${Object.keys(a).length} saved fields, ${differing.length} differ: ${differing.slice(0, 40).join(", ")}\n`,
    );
    expect(Object.keys(b).sort()).toEqual(Object.keys(a).sort());
    expect(differing).toEqual([]);
    expect(uncovered).toEqual([]);
  }, 1_800_000);
});
