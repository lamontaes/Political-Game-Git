import { randomBytes } from "node:crypto";
import { gzipSync } from "node:zlib";
import { describe, expect, it } from "vitest";
import { drawPlace } from "../../scripts/core2-year/place";
import { advanceCore, createLifeCore } from "./life";
import {
  decoder,
  restoreWorld,
  snapshotWorld,
  uncoveredModules,
  type WorldSnapshot,
} from "./snapshot";
import { generatedOpening } from "./tooling/generated-world";
import type { CoreState } from "./types";
import { daysAfterStart } from "./tooling/test-days";

const seed = process.env.GOLDEN_PATH_SEED ?? randomBytes(16).toString("hex");
const place = drawPlace(seed, "core2-snapshot");

/** Each saved field's content, key order and shared references aside. */
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
    if (part === "modules") out.modules = JSON.stringify(plain(fields));
    else
      for (const [key, value] of Object.entries(fields))
        out[`${part}.${key}`] = JSON.stringify(plain(value));
  return out;
}

describe(`a world snapshot in ${place.name}, ${place.state} (seed ${seed})`, () => {
  it("loads into a rebuilt world that then runs exactly as the original", () => {
    const input = generatedOpening(place, {
      twoLevel: true,
      settings: { population: 1500 },
    });
    const original = createLifeCore(input);
    expect(uncoveredModules(original)).toEqual([]);
    advanceCore(original, daysAfterStart(59));
    // Engines installed on first use are covered too.
    expect(uncoveredModules(original)).toEqual([]);
    const saved = JSON.stringify(snapshotWorld(original));
    // Compact on disk: a few megabytes once compressed.
    expect(gzipSync(saved).length).toBeLessThan(40e6);
    const loaded = createLifeCore(input);
    restoreWorld(loaded, JSON.parse(saved) as WorldSnapshot);
    expect(loaded.date).toBe(daysAfterStart(59));
    advanceCore(original, daysAfterStart(104));
    advanceCore(loaded, daysAfterStart(104));
    const a = content(original),
      b = content(loaded);
    expect(Object.keys(b).sort()).toEqual(Object.keys(a).sort());
    for (const key of Object.keys(a)) expect(b[key], key).toBe(a[key]);
  }, 600_000);
});
