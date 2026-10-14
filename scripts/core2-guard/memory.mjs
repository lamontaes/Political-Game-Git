/* global process, console, global */
// Running memory over a played world (owner, Oct 12: "running memory stays
// small"). Builds the bench's played world (every installed engine,
// two-level population) in a drawn place, advances it month by month, and
// reports the heap after each month, the growth per month over the last two
// years, and which tables grew, so each owner can see their share.
// Usage: CORE2_BOOKKEEPING=0 node --expose-gc --import tsx scripts/core2-guard/memory.mjs [--seed S] [--months 36]
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
const args = process.argv.slice(2);
const value = (name, fallback) =>
  args.includes(name) ? args[args.indexOf(name) + 1] : fallback;
const at = (path) => import(pathToFileURL(resolve(process.cwd(), path)).href);
if (typeof global.gc !== "function")
  throw new Error("Run with node --expose-gc for a measured heap.");
const { buildBenchWorld } = await at("src/bench/world.ts");
const { gameStartDate } = await at("src/core2/game-start.ts");
const { advanceCore } = await at("src/core2/life.ts");
const { moduleTableSizes } = await at("src/core2/module-state.ts");
const seed = value(
  "--seed",
  process.env.GOLDEN_PATH_SEED ??
    (await import("node:crypto")).randomBytes(16).toString("hex"),
);
const months = Number(value("--months", "36"));
const world = buildBenchWorld(seed, gameStartDate(), {
  twoLevel: true,
  ...(process.env.GOLDEN_PATH_PLACE_KEY
    ? { placeKey: process.env.GOLDEN_PATH_PLACE_KEY }
    : {}),
});
const core = world.core;
const sizeOf = (v) =>
  v instanceof Map || v instanceof Set
    ? v.size
    : Array.isArray(v)
      ? v.length
      : undefined;
const tables = () => {
  const rows = { ...moduleTableSizes(core) };
  for (const [key, v] of Object.entries(core)) {
    const n = sizeOf(v);
    if (n !== undefined) rows[`core.${key}`] = n;
    else if (v && typeof v === "object")
      for (const [inner, w] of Object.entries(v)) {
        const m = sizeOf(w);
        if (m !== undefined) rows[`core.${key}.${inner}`] = m;
      }
  }
  return rows;
};
const heap = () => {
  global.gc();
  return Math.round(process.memoryUsage().heapUsed / 1e6);
};
const heaps = [heap()];
let atYearOne = tables();
for (let month = 1; month <= months; month++) {
  const next = new Date(`${core.date}T00:00:00Z`);
  next.setUTCMonth(next.getUTCMonth() + 1);
  advanceCore(core, next.toISOString().slice(0, 10));
  heaps.push(heap());
  if (month === 12) atYearOne = tables();
  console.error(
    JSON.stringify({ month, date: core.date, heapMB: heaps.at(-1) }),
  );
}
const last = tables();
const span = Math.min(24, months);
const perMonth = (heaps.at(-1) - heaps.at(-1 - span)) / span;
const growth = Object.entries(last)
  .map(([table, rows]) => [table, rows - (atYearOne[table] ?? 0), rows])
  .filter(([, grew]) => grew > 0)
  .sort((a, b) => b[1] - a[1])
  .slice(0, 15);
console.log(
  JSON.stringify(
    {
      place: world.place.displayName,
      seed,
      months,
      heapMB: { start: heaps[0], end: heaps.at(-1) },
      growthMBPerMonthLastTwoYears: Number(perMonth.toFixed(1)),
      tablesGrownSinceYearOne: growth,
    },
    null,
    1,
  ),
);
