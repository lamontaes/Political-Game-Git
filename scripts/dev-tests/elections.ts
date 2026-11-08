/* eslint-disable @typescript-eslint/no-explicit-any */
// Field sizes, uncontested shares and empty races in played years: tsx elections.ts <seed> [years] [placeKey]
import { drawPlace } from "../core2-year/place";
import { buildBenchWorld } from "../../src/bench/world";
import { gameStartDate } from "../../src/core2/game-start";
import { setBookkeeping } from "../../src/core2/bookkeeping";
import { coreAPI } from "../../src/core2/state";
import { advanceCore } from "../../src/core2/life";
import { addDays, makeIsoDate } from "../../src/core2/kernel/dates";
import { ELECTIONS_MODULE_ID } from "../../src/core2/modules/elections";
import { VOTING_MODULE_ID } from "../../src/core2/modules/voting";
import { OFFICES_MODULE_ID } from "../../src/core2/modules/offices";
setBookkeeping(false);
const [seed = "1", years = "3", key] = process.argv.slice(2);
const place = drawPlace(seed, "elections");
const w = buildBenchWorld(place.seed, gameStartDate(), {
  twoLevel: true,
  placeKey: key ?? place.key,
});
const t0 = Date.now();
advanceCore(
  w.core,
  addDays(makeIsoDate(w.core.date), Math.round(Number(years) * 365)),
);
const api = coreAPI(w.core);
const results = api
  .moduleState(VOTING_MODULE_ID)
  .table("results")
  .rows() as any[];
const empties = api
  .moduleState(VOTING_MODULE_ID)
  .table("emptyRaces")
  .rows() as any[];
const by: Record<string, number[]> = {};
const filed: Record<string, number[]> = {};
const filings = api
  .moduleState(ELECTIONS_MODULE_ID)
  .table("filings")
  .rows() as any[];
const filedBy = new Map<string, number>();
for (const f of filings)
  filedBy.set(f.contestId, (filedBy.get(f.contestId) ?? 0) + 1);
for (const r of results) {
  const c = api
    .moduleState(ELECTIONS_MODULE_ID)
    .table("contests")
    .get(r.contestId) as any;
  if (!c) continue;
  const k = `${c.level}/${c.family}${c.special ? "/special" : ""}`;
  (by[k] ??= []).push(Object.keys(r.totals ?? {}).length);
  (filed[k] ??= []).push(filedBy.get(r.contestId) ?? 0);
}
console.log(
  `place ${place.key} ${place.name} seed ${seed} years ${years} ms ${Date.now() - t0}`,
);
let tot = 0,
  unc = 0,
  zero = 0;
for (const [k, v] of Object.entries(by).sort()) {
  const u = v.filter((n) => n <= 1).length,
    z = v.filter((n) => n === 0).length;
  tot += v.length;
  unc += u;
  zero += z;
  console.log(
    `${k.padEnd(34)} n=${String(v.length).padStart(3)} unc=${String(u).padStart(3)} zero=${z} max=${Math.max(...v)} mean=${(v.reduce((a, b) => a + b, 0) / v.length).toFixed(2)}`,
  );
}
console.log(
  `TOTAL contests ${tot} uncontested(<=1) ${unc} zero ${zero}; emptyRaces ${empties.length} (${empties.map((e) => e.method).join(",")})`,
);
const terms = api.moduleState(OFFICES_MODULE_ID).table("terms").rows() as any[];
const seats = api.moduleState(OFFICES_MODULE_ID).table("seats")?.rows?.() as
  any[] | undefined;
if (seats) {
  const held = new Set(
    terms.filter((t) => t.status === "serving").map((t) => t.seatId),
  );
  const empty = seats.filter((s) => !held.has(s.id));
  console.log(`seats ${seats.length} without holder ${empty.length}`);
  const offices = api.moduleState(OFFICES_MODULE_ID).table("offices");
  const vac = api
    .moduleState(OFFICES_MODULE_ID)
    .table("vacancies")
    .rows() as any[];
  for (const s of empty.slice(0, 12)) {
    const o = offices.get(s.officeId) as any;
    const v = vac
      .filter((x) => x.seatId === s.id)
      .map((x) => `${x.status}/${x.rule?.method ?? ""}`)
      .join(",");
    console.log(`  vacant ${s.id} ${o?.level}/${o?.kind} vacancies[${v}]`);
  }
}
