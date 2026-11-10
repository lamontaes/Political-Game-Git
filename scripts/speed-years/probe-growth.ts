/* eslint-disable @typescript-eslint/no-explicit-any */
// The cut candidates after N years, each split by what would let it go: stance
// rows' per-speaker counts by the speaker's state, heard promises by age,
// campaign impressions by their candidate's state, credit loans by status, job
// changes by age. Rows and JSON bytes.
// node --max-old-space-size=6000 --import tsx scripts/speed-years/probe-growth.ts <seed> <placeKey> <years>
import { buildBenchWorld } from "../../src/bench/world";
import { gameStartDate } from "../../src/core2/game-start";
import { setBookkeeping } from "../../src/core2/bookkeeping";
import { advanceCore } from "../../src/core2/life";
import { addDays, makeIsoDate } from "../../src/core2/kernel/dates";
import { setFastForward } from "../../src/core2/fast-forward";
import { isDemoted } from "../../src/core2/counted-groups";
import { coreAPI } from "../../src/core2/state";
setBookkeeping(false);
if (process.env.CORE2_FAST_FORWARD === "1") setFastForward(true);
const [seed = "mont1", key = "5046000", years = "8"] = process.argv.slice(2);
const w = buildBenchWorld(seed, gameStartDate(), {
  twoLevel: true,
  placeKey: key,
});
const core = w.core as any;
const api = coreAPI(core);
const mb = (n: number) => (n / 1e6).toFixed(1);
const status = (id: string) => {
  const p = core.people.get(id);
  if (!p) return core.husks?.has(id) ? "husk" : "no-record";
  if (!p.alive) return "dead";
  if (isDemoted(p)) return "returned";
  return p.tier === "husk" ? "elsewhere" : "full";
};
const tally = (m: Map<string, [number, number]>, k: string, bytes: number) => {
  const e = m.get(k) ?? [0, 0];
  e[0]++;
  e[1] += bytes;
  m.set(k, e);
};
const show = (label: string, m: Map<string, [number, number]>) =>
  console.log(
    `  ${label}: ${[...m]
      .sort((a, b) => b[1][1] - a[1][1])
      .map(([k, [n, b]]) => `${k} ${n} rows ${mb(b)} MB`)
      .join("; ")}`,
  );
for (let y = 1; y <= Number(years); y++) {
  advanceCore(core, addDays(makeIsoDate(core.date), 365));
  const yearAgo = addDays(makeIsoDate(core.date), -365);
  console.log(`YEAR ${y} ${core.date}`);
  // Stances: the heard counts by the speaker's state, and the rest of each row.
  const heard = new Map<string, [number, number]>();
  let stanceRows = 0,
    stanceBytes = 0;
  for (const row of api.moduleState("views").table("stances").rows() as any[]) {
    stanceRows++;
    stanceBytes += JSON.stringify(row).length;
    for (const [speaker, n] of Object.entries(row.heard ?? {}))
      tally(heard, status(speaker), speaker.length + String(n).length + 4);
  }
  console.log(`  STANCES ${stanceRows} rows ${mb(stanceBytes)} MB`);
  show("HEARD by speaker", heard);
  // Knowledge promise:* by age and holder.
  const promises = new Map<string, [number, number]>();
  for (const [pid, known] of core.knowledgeByPerson)
    for (const [k, fact] of known)
      if (k.startsWith("promise:"))
        tally(
          promises,
          `${status(pid)} ${(fact as any).learnedAt < yearAgo ? ">1y" : "<1y"}`,
          k.length + JSON.stringify(fact).length,
        );
  show("PROMISE facts by holder and age", promises);
  // Campaign impressions by the candidate's state.
  const imp = new Map<string, [number, number]>();
  for (const row of api
    .moduleState("core2-campaigns-v1")
    .table("impressions")
    .rows() as any[])
    tally(
      imp,
      `candidate ${status(row.candidateId)} voter ${status(row.voterId)}`,
      JSON.stringify(row).length,
    );
  show("IMPRESSIONS", imp);
  // Credit loans by status.
  const loans = new Map<string, [number, number]>();
  for (const row of api.moduleState("credit").table("loans").rows() as any[])
    tally(
      loans,
      `${row.kind} ${row.open ? "open" : "closed"} ${row.standing} borrower ${status(row.borrowerId)} opened ${(row.openedAt ?? "") < yearAgo ? ">1y" : "<1y"}`,
      JSON.stringify(row).length,
    );
  const payments = new Map<string, [number, number]>();
  for (const row of api.moduleState("credit").table("payments").rows() as any[])
    tally(
      payments,
      `${(row.date ?? "") < yearAgo ? ">1y" : "<1y"}`,
      JSON.stringify(row).length,
    );
  show("LOAN PAYMENTS", payments);
  show("LOANS", loans);
  // Job changes by age.
  const changes = new Map<string, [number, number]>();
  for (const row of api.moduleState("jobs").table("changes").rows() as any[])
    tally(
      changes,
      `${row.kind} ${(row.date ?? "") < yearAgo ? ">1y" : "<1y"}`,
      JSON.stringify(row).length,
    );
  show("JOB CHANGES", changes);
}
