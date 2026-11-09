/* eslint-disable @typescript-eslint/no-explicit-any */
// Election results (winners, margins, turnout) after two years: tsx tiers-results.ts <seed> <label>
import { drawPlace } from "../core2-year/place";
import { buildBenchWorld } from "../../src/bench/world";
import { gameStartDate } from "../../src/core2/game-start";
import { setBookkeeping } from "../../src/core2/bookkeeping";
import { coreAPI } from "../../src/core2/state";
import { advanceCore } from "../../src/core2/life";
import { addDays, makeIsoDate } from "../../src/core2/kernel/dates";
import { VOTING_MODULE_ID } from "../../src/core2/modules/voting";
setBookkeeping(false);
const [seed = "a1", label = "x"] = process.argv.slice(2);
const place = drawPlace(seed, "lean");
const w = buildBenchWorld(place.seed, gameStartDate(), {
  twoLevel: true,
  placeKey: place.key,
});
advanceCore(w.core, addDays(makeIsoDate(w.core.date), 730));
const api = coreAPI(w.core);
const rows = [
  ...(api.moduleState(VOTING_MODULE_ID).table("results").rows() as any[]),
].sort((a, b) => a.id.localeCompare(b.id));
for (const r of rows) {
  const totals = Object.entries(r.totals ?? {})
    .map(([k, v]) => [k, Number(v)] as const)
    .sort((a, b) => b[1] - a[1]);
  if (!totals.length) continue;
  const sum = totals.reduce((n, t) => n + t[1], 0);
  console.log(
    `RES ${label} ${place.name} ${r.id} winner ${totals[0]![0].slice(-6)} margin ${(((totals[0]![1] - (totals[1]?.[1] ?? 0)) / sum) * 100).toFixed(1)} votes ${Math.round(sum)} turnout ${r.turnout !== undefined ? Number(r.turnout).toFixed(3) : "-"}`,
  );
}
