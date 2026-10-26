/**
 * A town year on the played world, timed: the bench's two-level town with
 * every module (`buildBenchWorld`), advanced day by day (`advanceCore`) with
 * the debug bookkeeping off, as play runs it. Development tooling.
 *
 *   npm run speed:year -- [--seed <s>] [--place <key>] [--years 1] [--max-seconds 300]
 *     [--exclusive] [--out <receipt.json>] [--baseline <main receipt.json>]
 *
 * The place is drawn from all 56 by the seed unless `--place` names a key.
 * Prints the build seconds and each year's seconds, and exits 1 when a year
 * runs over `--max-seconds` (the game's own limit is 120 seconds a year).
 * `--out` writes a receipt (`compare.ts`'s `SpeedReceipt`); `--baseline` reads
 * another and exits 1 when a year is more than 20% slower (`compareYears`),
 * as the local gate asks. `--exclusive` says the machine ran nothing else.
 * Run one process at a time, on a quiet machine.
 */
import { createHash, randomBytes } from "node:crypto";
import { execFileSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";
import { hostname } from "node:os";
import { performance } from "node:perf_hooks";
import { buildBenchWorld } from "../../src/bench/world";
import { setBookkeeping } from "../../src/core2/bookkeeping";
import { gameStartDate } from "../../src/core2/game-start";
import { addDays, makeIsoDate } from "../../src/core2/kernel/dates";
import { advanceCore } from "../../src/core2/life";
import { corePlaceByKey } from "../../src/core2/place-lookup";
import { drawPlace } from "../core2-year/place";
import { compareYears, type SpeedReceipt, type YearTiming } from "./compare";

const args = process.argv.slice(2);
const option = (name: string, fallback: string) => {
  const at = args.indexOf(`--${name}`);
  return at >= 0 && args[at + 1] !== undefined ? args[at + 1]! : fallback;
};
const seed = option("seed", randomBytes(8).toString("hex"));
const years = Number(option("years", "1"));
const maxSeconds = Number(option("max-seconds", "300"));
const drawn = drawPlace(seed, "speed-year");
const placeKey = option("place", drawn.key);
// A named key is reported by its own name, not the seed's drawn place.
const placeName =
  placeKey === drawn.key
    ? drawn.name
    : (corePlaceByKey(placeKey)?.displayName ?? placeKey);
const seconds = (since: number) =>
  Number(((performance.now() - since) / 1000).toFixed(1));

setBookkeeping(false);
const built = performance.now();
const world = buildBenchWorld(drawn.seed, gameStartDate(), {
  twoLevel: true,
  placeKey,
});
console.log(
  `${placeName} (key ${placeKey}, seed ${seed}): built in ${seconds(built)} s`,
);
/** A summary of the world at a year's end: its date, counts and every dollar held. */
const fingerprint = (): string => {
  const core = world.core;
  const held = [...core.people.values(), ...core.organizations.values()].reduce(
    (sum, row) => sum + row.liquidMinor,
    0,
  );
  return createHash("sha256")
    .update(JSON.stringify([core.date, core.people.size, core.jobs.size, held]))
    .digest("hex");
};
const git = (...gitArgs: string[]) =>
  execFileSync("git", gitArgs, { encoding: "utf8" }).trim();
let over = false;
const rows: YearTiming[] = [];
for (let year = 1; year <= years; year += 1) {
  const began = performance.now();
  const target = addDays(makeIsoDate(world.core.date), 365);
  advanceCore(world.core, target);
  const took = seconds(began);
  rows.push({
    year,
    seconds: took,
    fingerprint: fingerprint(),
    date: world.core.date,
  });
  console.log(`year ${year}: ${took} s, through ${world.core.date}`);
  if (took > maxSeconds) over = true;
}
if (over) console.error(`over ${maxSeconds} seconds`);
const receipt: SpeedReceipt = {
  seed,
  place: placeKey,
  stepDays: 365,
  head: git("rev-parse", "HEAD"),
  // Main's commit only when src and data match it exactly.
  sourceMain: (() => {
    try {
      git("diff", "--quiet", "origin/main", "--", "src", "data");
      return git("rev-parse", "origin/main");
    } catch {
      return null;
    }
  })(),
  host: hostname(),
  exclusive: args.includes("--exclusive"),
  rows,
};
const out = option("out", "");
if (out) writeFileSync(out, `${JSON.stringify(receipt, null, 2)}\n`);
const baseline = option("baseline", "");
let problems: string[] = [];
if (baseline) {
  problems = compareYears(
    JSON.parse(readFileSync(baseline, "utf8")) as SpeedReceipt,
    receipt,
  );
  for (const problem of problems) console.error(problem);
}
if (over || problems.length) process.exit(1);
