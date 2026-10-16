/* global process, console, performance */
// M7-01 speed and memory, measured once in the golden-path place: the new
// game's load (the bench's played world, every engine, two-level), a game
// year, the slowest day of that year, and a year-old base-world save's
// compressed size, each against its budget in the parameter table. Exits 1
// on a miss. The minimum-spec PC isn't measured yet: these are cloud numbers.
// Usage: CORE2_BOOKKEEPING=0 node --max-old-space-size=8000 --import tsx scripts/core2-year/speed-memory.mjs [--seed S]
import { gzipSync } from "node:zlib";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
const args = process.argv.slice(2);
const value = (name, fallback) =>
  args.includes(name) ? args[args.indexOf(name) + 1] : fallback;
const at = (path) => import(pathToFileURL(resolve(process.cwd(), path)).href);
const { buildBenchWorld } = await at("src/bench/world.ts");
const { gameStartDate } = await at("src/core2/game-start.ts");
const { advanceCore } = await at("src/core2/life.ts");
const { parameter } = await at("src/core2/parameters.ts");
const { newGame, runCommand, saveGame } = await at("src/core2/saves.ts");
const seed = value(
  "--seed",
  process.env.GOLDEN_PATH_SEED ??
    (await import("node:crypto")).randomBytes(16).toString("hex"),
);
const placeKey = process.env.GOLDEN_PATH_PLACE_KEY;
const seconds = (t) => Number(((performance.now() - t) / 1000).toFixed(1));
let t = performance.now();
const world = buildBenchWorld(seed, gameStartDate(), {
  twoLevel: true,
  ...(placeKey ? { placeKey } : {}),
});
const load = seconds(t);
const core = world.core;
const start = new Date(`${core.date}T00:00:00Z`);
const end = new Date(start);
end.setUTCFullYear(end.getUTCFullYear() + 1);
let slowest = 0,
  slowestDate = core.date;
t = performance.now();
while (core.date < end.toISOString().slice(0, 10)) {
  const day = performance.now();
  const next = new Date(`${core.date}T00:00:00Z`);
  next.setUTCDate(next.getUTCDate() + 1);
  advanceCore(core, next.toISOString().slice(0, 10));
  const took = (performance.now() - day) / 1000;
  if (took > slowest) [slowest, slowestDate] = [took, core.date];
}
const year = seconds(t);
// Save size: a year-old game in the same place (base engines, so it carries
// a snapshot; the full game's saves replay until every engine is covered).
const place = { seed, key: world.place.key };
const game = newGame({ place, twoLevel: true, preStart: false });
// A year from the opening, whatever the start date.
const yearOn = new Date(`${game.core.date}T00:00:00Z`);
yearOn.setUTCFullYear(yearOn.getUTCFullYear() + 1);
yearOn.setUTCDate(yearOn.getUTCDate() - 1);
runCommand(game, "advance", { through: yearOn.toISOString().slice(0, 10) });
const saveMB = Number(
  (gzipSync(JSON.stringify(saveGame(game))).length / 1e6).toFixed(1),
);
const checks = {
  newGameLoadSeconds: [load, parameter("budgetNewGameLoadSeconds")],
  yearSeconds: [year, parameter("budgetYearSeconds")],
  slowestDaySeconds: [
    Number(slowest.toFixed(2)),
    parameter("budgetSlowestDaySeconds"),
  ],
  saveCompressedMegabytes: [saveMB, parameter("budgetSaveCompressedMegabytes")],
};
const failed = Object.entries(checks)
  .filter(([, [got, budget]]) => got > budget)
  .map(([name]) => name);
console.log(
  JSON.stringify(
    {
      place: world.place.displayName,
      seed,
      checks: Object.fromEntries(
        Object.entries(checks).map(([name, [got, budget]]) => [
          name,
          { got, budget },
        ]),
      ),
      slowestDate,
      machine: "cloud (not the minimum-spec PC)",
      result: failed.length ? `FAIL: ${failed.join(", ")}` : "PASS",
    },
    null,
    1,
  ),
);
process.exitCode = failed.length ? 1 : 0;
