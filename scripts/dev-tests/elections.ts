/* eslint-disable @typescript-eslint/no-explicit-any */
// Field sizes, uncontested shares and empty races in played years: tsx elections.ts <seed> [years] [placeKey]
import { drawPlace } from "../core2-year/place";
import { buildBenchWorld } from "../../src/bench/world";
import { gameStartDate } from "../../src/core2/game-start";
import benchmarks from "../../src/core2/data/candidacy/benchmarks.json" with { type: "json" };
import { setBookkeeping } from "../../src/core2/bookkeeping";
import { coreAPI } from "../../src/core2/state";
import { advanceCore } from "../../src/core2/life";
import { addDays, makeIsoDate } from "../../src/core2/kernel/dates";
import { ELECTIONS_MODULE_ID } from "../../src/core2/modules/elections";
import { VOTING_MODULE_ID } from "../../src/core2/modules/voting";
import { OFFICES_MODULE_ID } from "../../src/core2/modules/offices";
import { CANDIDACY_MODULE_ID } from "../../src/core2/modules/candidacy";
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
    `${k.padEnd(34)} n=${String(v.length).padStart(3)} unc=${String(u).padStart(3)} zero=${z} max=${Math.max(...v)} mean=${(v.reduce((a, b) => a + b, 0) / v.length).toFixed(2)} filedMax=${Math.max(...filed[k]!)} filedMean=${(filed[k]!.reduce((a, b) => a + b, 0) / v.length).toFixed(2)}`,
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

// Incumbent challenge rate by level: of the contests where the seat's holder filed again, how many drew a general-election opponent.
{
  const terms = api.moduleState(OFFICES_MODULE_ID).table("terms");
  const ran: Record<string, [number, number]> = {};
  for (const r of results) {
    const c = api
      .moduleState(ELECTIONS_MODULE_ID)
      .table("contests")
      .get(r.contestId) as any;
    if (!c?.incumbentTermId || c.special) continue;
    const holder = (terms.get(c.incumbentTermId) as any)?.personId;
    const fs = filings.filter((f) => f.contestId === c.id);
    if (
      !holder ||
      !fs.some((f) => f.personId === holder && f.status !== "withdrawn")
    )
      continue;
    const k = `${c.level}/${c.family}`;
    const row = (ran[k] ??= [0, 0]);
    row[0] += 1;
    if (Object.keys(r.totals ?? {}).length > 1) row[1] += 1;
  }
  for (const [k, [n, challenged]] of Object.entries(ran).sort())
    console.log(
      `incumbents again ${k.padEnd(30)} ran ${n} drew a general opponent ${challenged}`,
    );
}

// Why a race drew one candidate or none (the owner's Nov 8 rule: a small field passes when the records explain it).
// Explained: no one who weighed the seat had a pull above the stay-out bar; unexplained: someone did and still did not file.
{
  const decisions = api
    .moduleState(CANDIDACY_MODULE_ID)
    .table("decisions")
    .rows() as any[];
  const byContest = new Map<string, any[]>();
  for (const d of decisions)
    (
      byContest.get(d.contestId) ??
      byContest.set(d.contestId, []).get(d.contestId)!
    ).push(d);
  const tally: Record<string, [number, number, number]> = {};
  for (const c of api
    .moduleState(ELECTIONS_MODULE_ID)
    .table("contests")
    .rows() as any[]) {
    if (!results.some((r) => r.contestId === c.id)) continue;
    const filedHere = filedBy.get(c.id) ?? 0;
    if (filedHere > 1) continue;
    const ds = (byContest.get(c.id) ?? []).filter((d) => d.scores?.length);
    const wide =
      c.level !== "city" &&
      c.family !== "municipalOffice" &&
      c.family !== "countyOffice";
    const bar = wide ? 3.2 : 3.94;
    const top = ds.reduce(
      (m, d) =>
        Math.max(
          m,
          Object.values(d.reasons as Record<string, number>).reduce(
            (a, b) => a + b,
            0,
          ),
        ),
      -Infinity,
    );
    const k = `${c.level}/${c.family}`;
    const row = (tally[k] ??= [0, 0, 0]);
    row[0] += 1;
    if (top <= bar) row[1] += 1;
    else row[2] += 1;
  }
  for (const [k, [n, explained, other]] of Object.entries(tally).sort())
    console.log(
      `small field ${k.padEnd(30)} ${n} races with at most one filer: ${explained} explained (no weigher's pull cleared the bar), ${other} to look into`,
    );
}

console.log(
  `Ballotpedia (to check against, never to steer to; a field passes when the records explain it): state legislative uncontested ${benchmarks.stateLegislativeUncontestedShare.value}, House primary candidates per seat ${benchmarks.usHousePrimaryCandidatesPerSeat.value}, House races contested by both parties ${benchmarks.usHouseContestedByBothParties.value}, state legislative seats open ${benchmarks.stateLegislativeOpenSeatShare.value}, largest cities' mayoral candidates ${benchmarks.largestCitiesMayoralCandidatesPerElection.value}, all seats uncontested ${benchmarks.allSeatsUncontestedShare2025.value}`,
);
