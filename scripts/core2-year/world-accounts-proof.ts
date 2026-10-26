/**
 * Proof for world-accounts-api: one year of the played world (`buildBenchWorld`,
 * two-level, every module) in a place drawn from all 56 by a seed from the
 * clock. Counts journal entries by the head of their record id and names an
 * example each, and counts the named funds the world's modules opened.
 *
 * Run: node --max-old-space-size=8192 --import tsx scripts/core2-year/world-accounts-proof.ts [seed]
 */
import { randomBytes } from "node:crypto";
import { buildBenchWorld } from "../../src/bench/world";
import { gameStartDate } from "../../src/core2/game-start";
import { advanceCore } from "../../src/core2/life";
import { coreAPI } from "../../src/core2/state";
import { setBookkeeping } from "../../src/core2/bookkeeping";
import { addDays, makeIsoDate } from "../../src/core2/kernel/dates";
import { drawPlace } from "./place";

setBookkeeping(false);
const seed = process.argv[2] ?? randomBytes(20).toString("hex");
const place = drawPlace(seed, "played-world");
const world = buildBenchWorld(place.seed, gameStartDate(), {
  twoLevel: true,
  placeKey: place.key,
});
const core = world.core;
const api = coreAPI(core);
console.log(`Place ${place.key}, seed ${seed}`);

const heads = new Map<string, { count: number; example: string }>();
const post = api.postJournal.bind(api);
api.postJournal = (entry) => {
  const head = entry.sourceRef.id.split(/[:@]/)[0]!;
  const row = heads.get(head) ?? { count: 0, example: entry.sourceRef.id };
  row.count += 1;
  heads.set(head, row);
  return post(entry);
};
const namedBefore = [...core.cashJournal.accounts.values()].filter(
  (a) => a.name !== undefined && a.name !== "main",
).length;
advanceCore(core, addDays(makeIsoDate(core.date), 365));
for (const [head, row] of [...heads].sort((a, b) => b[1].count - a[1].count))
  console.log(`${String(row.count).padStart(7)}  ${head}  e.g. ${row.example}`);
const named = [...core.cashJournal.accounts.values()].filter(
  (a) => a.name !== undefined && a.name !== "main",
);
console.log(
  `\nNamed accounts (not main): ${namedBefore} at the opening, ${named.length} after the year`,
);
