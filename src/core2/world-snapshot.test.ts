/** A world with the whole economy restored from a snapshot runs on exactly as the one it was taken from. Place and seed in the test name. */
import { createHash, randomUUID } from "node:crypto";
import { describe, expect, it } from "vitest";
import { drawPlace } from "../../tests/golden-path/place";
import { advanceCore, createLifeCore } from "./life";
import {
  WORLD_MODULES,
  withWorldEconomy,
  worldCoreData,
} from "./modules/world";
import {
  decoder,
  restoreWorld,
  snapshotWorld,
  uncoveredModules,
} from "./snapshot";
import { generatedOpening } from "./tooling/generated-world";
import type { CoreState } from "./types";

const drawn = drawPlace(
  process.env.GOLDEN_PATH_SEED ?? randomUUID(),
  "world-snapshot",
);

function build(): CoreState {
  const input = withWorldEconomy(generatedOpening(drawn, { twoLevel: true }));
  const core = createLifeCore(input, {
    data: worldCoreData(),
    modules: [...WORLD_MODULES],
  });
  advanceCore(core, input.startedAt);
  return core;
}

/** Every saved field, module table and part, by a hash of its contents. */
function fields(core: CoreState): Record<string, string> {
  const digest = (value: unknown) => {
    const hash = createHash("sha256");
    const walk = (x: unknown): void => {
      if (x instanceof Map) {
        hash.update("M");
        for (const [k, y] of x) {
          walk(k);
          walk(y);
        }
      } else if (x instanceof Set) {
        hash.update("S");
        for (const y of x) walk(y);
      } else if (Array.isArray(x)) {
        hash.update("[");
        for (const y of x) walk(y);
        hash.update("]");
      } else if (x && typeof x === "object") {
        hash.update("{");
        for (const k of Object.keys(x).sort()) {
          hash.update(k);
          walk((x as Record<string, unknown>)[k]);
        }
        hash.update("}");
      } else hash.update(`${typeof x}${String(x)};`);
    };
    walk(value);
    return hash.digest("hex");
  };
  const world = decoder()(snapshotWorld(core).world) as {
    core: Record<string, unknown>;
    modules: Map<string, { tables: Record<string, unknown> }>;
    parts: Record<string, unknown>;
  };
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(world.core)) out[`core.${k}`] = digest(v);
  for (const [id, saved] of world.modules)
    for (const [table, rows] of Object.entries(saved.tables))
      out[`table.${id}/${table}`] = digest(rows);
  for (const [k, v] of Object.entries(world.parts))
    out[`part.${k}`] = digest(v);
  return out;
}

describe(`a world snapshot with the economy (${drawn.name}, ${drawn.state}, seed ${drawn.seed})`, () => {
  it("covers every economy engine and runs on identically after a restore", () => {
    const original = build();
    expect(uncoveredModules(original)).toEqual([]);
    const start = original.date;
    const plus = (days: number) => {
      const d = new Date(`${start}T00:00:00Z`);
      d.setUTCDate(d.getUTCDate() + days);
      return d.toISOString().slice(0, 10);
    };
    advanceCore(original, plus(35));
    const snapshot = structuredClone(snapshotWorld(original));
    const loaded = build();
    restoreWorld(loaded, snapshot);
    advanceCore(original, plus(70));
    advanceCore(loaded, plus(70));
    const a = fields(original),
      b = fields(loaded);
    expect(Object.keys(a).filter((key) => a[key] !== b[key])).toEqual([]);
  }, 900_000);
});
