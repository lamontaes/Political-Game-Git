/**
 * Fast-forward against a full run (development tooling, owner Nov 8, 1:58 a.m.).
 *   node --import tsx scripts/speed-years/fast-forward.ts --place <key> --seed <s> --years 8 [--fast 1|0] [--out file.json]
 * Builds the speed:year world, runs it day by day with fast-forward on or off,
 * and writes the big numbers each year: people, births, deaths, who holds each
 * office by party, the races decided with their winners, and the seconds.
 */
import { writeFileSync } from "node:fs";
import { buildBenchWorld } from "../../src/bench/world";
import { setBookkeeping } from "../../src/core2/bookkeeping";
import { setFastForward } from "../../src/core2/fast-forward";
import { gameStartDate } from "../../src/core2/game-start";
import { addDays, makeIsoDate } from "../../src/core2/kernel/dates";
import { advanceCore } from "../../src/core2/life";
import { coreAPI } from "../../src/core2/state";
import { moduleTableSizes } from "../../src/core2/module-state";
import { VOTING_MODULE_ID } from "../../src/core2/modules/voting";
import { ELECTIONS_MODULE_ID } from "../../src/core2/modules/elections";
import { drawPlace } from "../core2-year/place";

const args = process.argv.slice(2);
const option = (name: string, fallback: string) => {
  const at = args.indexOf(`--${name}`);
  return at >= 0 && args[at + 1] !== undefined ? args[at + 1]! : fallback;
};
const seed = option("seed", "5a1c0de7a11ce5e1");
const years = Number(option("years", "8"));
const fast = option("fast", "1") === "1";
const out = option("out", "");
const drawn = drawPlace(seed, "speed-year");
const placeKey = option("place", drawn.key);
setBookkeeping(false);
setFastForward(fast);
const world = buildBenchWorld(drawn.seed, gameStartDate(), {
  twoLevel: true,
  placeKey,
});
const rows: unknown[] = [];
for (let y = 1; y <= years; y += 1) {
  const began = performance.now();
  advanceCore(world.core, addDays(makeIsoDate(world.core.date), 365));
  const seconds = Number(((performance.now() - began) / 1000).toFixed(1));
  const core = world.core;
  const sizes = moduleTableSizes(core);
  const alive = [...core.people.values()].filter((p) => p.alive).length;
  rows.push({
    year: y,
    date: core.date,
    seconds,
    peopleAlive: alive,
    people: core.people.size,
    tables: sizes,
  });
  console.log(
    `year ${y}: ${seconds} s, ${core.date}, ${alive} alive of ${core.people.size} full people`,
  );
}
const api = coreAPI(world.core);
const table = (module: string, name: string) =>
  api.moduleState(module).table(name);
const races = (
  table(VOTING_MODULE_ID, "results").rows() as unknown as {
    id: string;
    contestId: string;
    date: string;
    totals: Record<string, number>;
    electorate: number;
    winnerId: string | null;
  }[]
).map((r) => {
  const contest = table(ELECTIONS_MODULE_ID, "contests").get(
    r.contestId,
  ) as unknown as { title: string; level: string; family: string } | undefined;
  const votes = Object.values(r.totals).sort((a, b) => b - a);
  const cast = votes.reduce((a, b) => a + b, 0);
  const filing = r.winnerId
    ? (table(ELECTIONS_MODULE_ID, "filings").get(r.winnerId) as unknown as
        { party?: string } | undefined)
    : undefined;
  return {
    date: r.date,
    title: contest?.title,
    level: contest?.level,
    family: contest?.family,
    winnerId: r.winnerId,
    top: Object.entries(r.totals)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 2)
      .map(([id, v]) => [id, Number((v / (cast || 1)).toFixed(3))]),
    margin: cast
      ? Number((((votes[0] ?? 0) - (votes[1] ?? 0)) / cast).toFixed(3))
      : null,
    winnerParty: filing?.party ?? null,
    candidates: votes.length,
  };
});
for (const r of races) console.log(JSON.stringify(r));
if (out)
  writeFileSync(out, JSON.stringify({ seed, placeKey, fast, rows, races }));
