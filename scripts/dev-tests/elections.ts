/**
 * Phase 2, elections: a drawn place run N years untouched; every contest the
 * town votes in that was held. Per contest: level, family, special or not,
 * how many filed and how many stood on the ballot (the field), the town's
 * named and counted turnout and the wider electorate's, the winner's share.
 * Summary: field sizes (real local fields run 1 to 15), turnout against real
 * ranges, uncontested races, races with no winner.
 *   tsx scripts/dev-tests/elections.ts <seed> [years]
 */
import { drawPlace } from "../core2-year/place";
import { buildBenchWorld } from "../../src/bench/world";
import { gameStartDate } from "../../src/core2/game-start";
import { setBookkeeping } from "../../src/core2/bookkeeping";
import { coreAPI } from "../../src/core2/state";
import { advanceCore } from "../../src/core2/life";
import { addDays, makeIsoDate } from "../../src/core2/kernel/dates";
import { ELECTIONS_MODULE_ID, ballot, type ContestRow, type FilingRow } from "../../src/core2/modules/elections";
import { resultOf } from "../../src/core2/modules/voting";
setBookkeeping(false);
const [seed = "el1", yearsArg = "2"] = process.argv.slice(2);
const place = drawPlace(seed, "elections");
const w = buildBenchWorld(place.seed, gameStartDate(), { twoLevel: true, placeKey: place.key });
const api = coreAPI(w.core);
for (let y = 0; y < Number(yearsArg); y++) advanceCore(w.core, addDays(makeIsoDate(w.core.date), 365));
const contests = api.moduleState(ELECTIONS_MODULE_ID).table("contests").rows() as unknown as ContestRow[];
const filings = api.moduleState(ELECTIONS_MODULE_ID).table("filings").rows() as unknown as (FilingRow & { contestId: string })[];
const rows: any[] = [];
for (const c of contests) {
  const result = resultOf(api, c.id);
  if (!result) continue;
  const field = ballot(api, c.id).length;
  const filed = filings.filter((f) => f.contestId === c.id).length;
  const total = Object.values(result.totals).reduce((a, b) => a + b, 0);
  const top = Math.max(0, ...Object.values(result.totals));
  const eligible = result.namedEligible + result.countedEligible;
  const turnedOut = result.namedTurnout + result.countedTurnout;
  rows.push({ title: c.title, level: c.level, family: c.family, special: !!c.special, date: result.date, filed, field, votes: Math.round(total), eligible: Math.round(eligible), turnoutPct: eligible ? Math.round((1000 * turnedOut) / eligible) / 10 : null, winnerSharePct: total ? Math.round((1000 * top) / total) / 10 : null, noWinner: result.winnerId === null });
}
const hist: Record<number, number> = {};
for (const r of rows) hist[r.field] = (hist[r.field] ?? 0) + 1;
const turn = rows.map((r) => r.turnoutPct).filter((x): x is number => x !== null).sort((a, b) => a - b);
console.log(JSON.stringify({ place: place.name, key: place.key, seed: place.seed, years: Number(yearsArg), contestsHeld: rows.length, fieldSizeHistogram: hist, uncontested: rows.filter((r) => r.field <= 1).length, noWinner: rows.filter((r) => r.noWinner).length, turnoutPct: { min: turn[0], median: turn[Math.floor(turn.length / 2)], max: turn.at(-1) }, byLevel: Object.fromEntries([...new Set(rows.map((r) => r.level))].map((l) => [l, rows.filter((r) => r.level === l).length])) }));
for (const r of rows.slice(0, 40)) console.log(JSON.stringify(r));
