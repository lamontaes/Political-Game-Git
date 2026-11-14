// Warm-up probe: build a world with warmUpDays and count the day-zero known-red tables still empty.
// tsx scripts/dev-tests/warm-probe.ts <placeKey> <seed> <warmUpDays>
import { readFileSync } from "node:fs";
import { buildBenchWorld } from "../../src/bench/world";
import { gameStartDate } from "../../src/core2/game-start";
import { recordProof } from "../../src/bench/dev-proof";
import { setBookkeeping } from "../../src/core2/bookkeeping";
setBookkeeping(false);
const [placeKey, seed, k] = process.argv.slice(2);
const t0 = Date.now();
const world = buildBenchWorld(seed!, gameStartDate(), {
  twoLevel: true,
  placeKey,
  warmUpDays: Number(k),
});
const ms = Date.now() - t0;
const file = JSON.parse(
  readFileSync("src/core2/data/opening/day-zero.json", "utf8"),
);
const tables = recordProof(world.core).tables;
type Row = { table: string; knownRed?: string };
const red = (file.rows as Row[]).filter((r) => r.knownRed);
const empty = red
  .filter((r) => !((tables[r.table]?.rows ?? 0) > 0))
  .map((r) => r.table);
console.log(
  JSON.stringify({
    placeKey,
    k: Number(k),
    date: world.core.date,
    ms,
    knownRed: red.length,
    stillEmpty: empty.length,
    empty,
  }),
);
