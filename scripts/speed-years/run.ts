/**
 * A town year on the played world, timed: the bench's two-level town with
 * every module (`buildBenchWorld`), advanced day by day (`advanceCore`) with
 * the debug bookkeeping off, as play runs it. Development tooling.
 *
 *   npm run speed:year -- [--seed <s>] [--place <key>] [--years 1] [--max-seconds 300]
 *     [--exclusive] [--out <receipt.json>] [--baseline <main receipt.json>]
 *     [--same-records] [--proof-out <proof.json>]
 *
 * The place is drawn from all 56 by the seed unless `--place` names a key.
 * Prints the build seconds and each year's seconds, and exits 1 when a year
 * runs over `--max-seconds` (the game's own limit is 120 seconds a year).
 * `--out` writes a receipt (`compare.ts`'s `SpeedReceipt`); `--baseline` reads
 * another and exits 1 when a year is more than 20% slower (`compareYears`),
 * as the local gate asks; with `--same-records` it also exits 1 when a year's
 * records differ (dev mode's records proof, `src/bench/dev-proof.ts`), naming
 * each differing table. `--proof-out` writes the last year's proof with every
 * row's digest, so two builds' files name the first record that differs.
 * `--exclusive` says the machine ran nothing else.
 * Run one process at a time, on a quiet machine.
 */
import { randomBytes } from "node:crypto";
import { execFileSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";
import { hostname } from "node:os";
import { performance } from "node:perf_hooks";
import { recordProof } from "../../src/bench/dev-proof";
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
const git = (...gitArgs: string[]) =>
  execFileSync("git", gitArgs, { encoding: "utf8" }).trim();
const proofOut = option("proof-out", "");
let over = false;
const rows: YearTiming[] = [];
for (let year = 1; year <= years; year += 1) {
  const began = performance.now();
  const target = addDays(makeIsoDate(world.core.date), 365);
  advanceCore(world.core, target);
  const took = seconds(began);
  // Dev mode's records proof, taken after the clock stops (`dev-proof.ts`).
  const proof = recordProof(world.core, { rows: year === years && !!proofOut });
  if (proof.rows) {
    writeFileSync(proofOut, JSON.stringify(proof));
    // Dev mode opens the same world from the core's seed and the place key.
    console.log(
      `proof: core seed ${world.core.seed}, place ${placeKey}, ${world.core.date} -> ${proofOut}`,
    );
  }
  if (year === 1 && proof.uncovered.length)
    console.log(
      `engines that have not declared their whole state saveable, so the proof sees only their tables: ${proof.uncovered.join(", ")}`,
    );
  // The proof's garbage is collected here (`--expose-gc`), not in the next timed year.
  (globalThis as { gc?: () => void }).gc?.();
  rows.push({
    year,
    seconds: took,
    fingerprint: proof.digest,
    tables: proof.tables,
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
    args.includes("--same-records"),
  );
  for (const problem of problems) console.error(problem);
}
if (over || problems.length) process.exit(1);
