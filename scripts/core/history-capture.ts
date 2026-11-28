/**
 * A capture of what the one history reader says, for a move of its sources
 * (the pre-start as a history source, item 6b of docs/coordination/refactor/
 * core-plan-2026-11-27.md): build a played world at a place and a seed, ask
 * `historyOf` for every full person, every household, a few employers and the
 * place, with and without kinds and from each source, and hash every answer.
 * Take it before a change and after, with the same place and seed; the two
 * outputs must be byte for byte the same. Nothing is written to the game.
 *
 *   node --import tsx scripts/core/history-capture.ts --place <key> --seed <seed> [--out <file>]
 */
import { createHash } from "node:crypto";
import { writeFileSync } from "node:fs";
import { buildBenchWorld } from "../../src/bench/world";
import { setBookkeeping } from "../../src/core2/bookkeeping";
import { gameStartDate } from "../../src/core2/game-start";
import { historyOf, type HistoryAsk } from "../../src/core2/past-history";
import { placeJurisdictionId } from "../../src/core2/place-map";
import { drawPlace } from "../core2-year/place";

const args = process.argv.slice(2);
const option = (name: string, fallback: string) => {
  const at = args.indexOf(`--${name}`);
  return at >= 0 && args[at + 1] !== undefined ? args[at + 1]! : fallback;
};
const seed = option("seed", "history-capture");
const drawn = drawPlace(seed, "history-capture");
const placeKey = option("place", drawn.key);
const out = option("out", "");
const EMPLOYERS = 12;

setBookkeeping(false);
const world = buildBenchWorld(drawn.seed, gameStartDate(), {
  twoLevel: true,
  placeKey,
});
const core = world.core;

const sources: readonly HistoryAsk[] = [
  {},
  { from: "built" },
  { from: "past" },
  { from: "played" },
];
// A few of the kinds the reader tells, so a kind filter reaches each index.
const kindSets: readonly (readonly string[] | undefined)[] = [
  undefined,
  ["work"],
  ["law", "bill"],
];

const hash = (value: unknown) =>
  createHash("sha256").update(JSON.stringify(value)).digest("hex");
const lines: string[] = [];
let asked = 0;
let events = 0;
const capture = (label: string, scope: Parameters<typeof historyOf>[1]) => {
  for (const source of sources)
    for (const kinds of kindSets) {
      const ask: HistoryAsk = kinds ? { ...source, kinds } : source;
      const answer = historyOf(core, scope, ask);
      asked += 1;
      events += answer.length;
      lines.push(
        `${label} ${JSON.stringify(ask)} ${answer.length} ${hash(answer)}`,
      );
    }
};

for (const id of [...core.people.keys()].sort())
  capture(`person:${id}`, { person: id });
for (const id of [...core.households.keys()].sort())
  capture(`household:${id}`, { household: id });
const employers = [
  ...new Set([...core.jobs.values()].map((job) => job.organizationId)),
]
  .sort()
  .slice(0, EMPLOYERS);
for (const id of employers) capture(`employer:${id}`, { employer: id });
const placeId = placeJurisdictionId(placeKey);
if (placeId) capture(`place:${placeId}`, { place: placeId });

const digest = hash(lines);
console.log(
  `${placeKey} (seed ${seed}): ${asked} reads, ${events} events, ${core.people.size} people, ${core.households.size} households, ${employers.length} employers`,
);
console.log(`history digest ${digest}`);
if (out) writeFileSync(out, `${lines.join("\n")}\n`);
