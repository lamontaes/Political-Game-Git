/* global process, console */
// World snapshot round trip (owner's ruling 7) over the bench's played world:
// every installed engine, two-level population. Builds the world twice from
// one seed, runs one a month, snapshots it, restores the snapshot into the
// other, runs both another month, and compares every saved field, module
// table and part. A field that differs is state some engine keeps outside
// the snapshot; its owner registers it (`registerSnapshotPart` or
// `registerWorldMapPart` in src/core2/snapshot.ts) and then declares the
// engine covered (`declareSnapshotCovered`).
// Usage: CORE2_BOOKKEEPING=0 node --max-old-space-size=12000 --import tsx scripts/core2-guard/snapshot-roundtrip.mjs [--seed S] [--days 30]
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
const args = process.argv.slice(2);
const value = (name, fallback) =>
  args.includes(name) ? args[args.indexOf(name) + 1] : fallback;
const at = (path) => import(pathToFileURL(resolve(process.cwd(), path)).href);
const { buildBenchWorld } = await at("src/bench/world.ts");
const { gameStartDate } = await at("src/core2/game-start.ts");
const { advanceCore } = await at("src/core2/life.ts");
const { decoder, restoreWorld, snapshotWorld, uncoveredModules } = await at(
  "src/core2/snapshot.ts",
);
const seed = value(
  "--seed",
  process.env.GOLDEN_PATH_SEED ??
    (await import("node:crypto")).randomBytes(16).toString("hex"),
);
const days = Number(value("--days", "30"));
const options = {
  twoLevel: true,
  ...(process.env.GOLDEN_PATH_PLACE_KEY
    ? { placeKey: process.env.GOLDEN_PATH_PLACE_KEY }
    : {}),
};
const plus = (date, n) => {
  const d = new Date(`${date}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
};
const original = buildBenchWorld(seed, gameStartDate(), options);
const start = original.core.date;
advanceCore(original.core, plus(start, days));
const text = JSON.stringify(snapshotWorld(original.core));
const loaded = buildBenchWorld(seed, gameStartDate(), options);
restoreWorld(loaded.core, JSON.parse(text));
advanceCore(original.core, plus(start, 2 * days));
advanceCore(loaded.core, plus(start, 2 * days));
const plain = (v) =>
  v instanceof Map
    ? { $map: [...v].map(plain) }
    : v instanceof Set
      ? { $set: [...v].map(plain) }
      : typeof v === "bigint"
        ? `${v}n`
        : Array.isArray(v)
          ? v.map(plain)
          : v && typeof v === "object"
            ? Object.fromEntries(
                Object.keys(v)
                  .sort()
                  .map((k) => [k, plain(v[k])]),
              )
            : v;
const fields = (core) => {
  const world = decoder()(snapshotWorld(core).world);
  const out = {};
  for (const [k, v] of Object.entries(world.core))
    out[`core.${k}`] = JSON.stringify(plain(v));
  for (const [id, saved] of world.modules)
    for (const [table, rows] of Object.entries(saved.tables))
      out[`table.${id}/${table}`] = JSON.stringify(plain(rows));
  for (const [k, v] of Object.entries(world.parts))
    out[`part.${k}`] = JSON.stringify(plain(v));
  return out;
};
const a = fields(original.core),
  b = fields(loaded.core);
const differs = Object.keys(a).filter((key) => a[key] !== b[key]);
console.log(
  JSON.stringify(
    {
      place: original.place.displayName,
      seed,
      days,
      snapshotMB: Number((text.length / 1e6).toFixed(1)),
      fields: Object.keys(a).length,
      differs,
      uncovered: uncoveredModules(original.core),
    },
    null,
    1,
  ),
);
process.exitCode = differs.length ? 1 : 0;
