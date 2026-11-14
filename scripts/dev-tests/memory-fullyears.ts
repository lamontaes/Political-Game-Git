/* eslint-disable @typescript-eslint/no-explicit-any */
// Each year: full people (and what keeps them full), seconds, heap after collection, peak RSS.
// node --expose-gc --max-old-space-size=8000 --import tsx scripts/dev-tests/memory-fullyears.ts <seed> <placeKey> <years> <label>
import { appendFileSync } from "node:fs";
// races.jsonl: RACES_OUT=<file> appends every race winner each year.
import { buildBenchWorld } from "../../src/bench/world";
import { gameStartDate } from "../../src/core2/game-start";
import { setBookkeeping } from "../../src/core2/bookkeeping";
import { advanceCore } from "../../src/core2/life";
import { addDays, makeIsoDate } from "../../src/core2/kernel/dates";
import { isDemoted } from "../../src/core2/counted-groups";
import { coreAPI } from "../../src/core2/state";
import { OFFICES_MODULE_ID } from "../../src/core2/modules/offices";
import { isSchoolDistrict } from "../../src/core2/residents";
import { OUTSIDE_MARKET_KIND } from "../../src/core2/opening-outside-market";
import { residentsRuntime } from "../../src/core2/modules/residents";
import { residentCounts } from "../../src/core2/modules/residents";
import { VOTING_MODULE_ID } from "../../src/core2/modules/voting";
import { ELECTIONS_MODULE_ID } from "../../src/core2/modules/elections";
import { stableHash } from "../../src/core2/kernel/ids";
setBookkeeping(false);
const [seed = "mont1", key = "5046000", years = "20", label = "x"] =
  process.argv.slice(2);
const w = buildBenchWorld(seed, gameStartDate(), {
  twoLevel: true,
  placeKey: key,
});
const core = w.core as any;
const why = () => {
  const api = coreAPI(core);
  const player = core.people.get(core.playerId);
  const playerSet = new Set<string>([
    player?.id,
    ...(core.households.get(player?.householdId)?.memberIds ?? []),
    ...(player?.familyIds ?? []),
    ...(player?.knownIds ?? []),
  ]);
  const serving = new Set<string>();
  for (const t of api
    .moduleState(OFFICES_MODULE_ID)
    .table("terms")
    .query("byStatus", ["serving"]) as any[])
    if (t.personId) serving.add(t.personId);
  const worker = new Map<string, string>();
  for (const job of core.jobs.values()) {
    if (job.endsAt !== undefined) continue;
    const e = core.organizations.get(job.organizationId);
    if (!e || e.kind === OUTSIDE_MARKET_KIND) continue;
    if (e.kind !== "employer") worker.set(job.personId, `org-${e.kind}`);
    else if (e.publicPayAuthority)
      worker.set(job.personId, isSchoolDistrict(e) ? "school" : "public");
  }
  const owners = new Set<string>();
  if (core.modules.has("business"))
    for (const r of api.moduleState("business").table("owners").rows() as any[])
      owners.add(r.ownerId);
  const rt = residentsRuntime(core);
  const keptAt = new Set(rt?.input.accounts.map((a: any) => a.placeId) ?? []);
  const kept = (id: string) =>
    playerSet.has(id) || serving.has(id) || worker.has(id) || owners.has(id);
  const noneWhy = (p: any) => {
    const home = core.households.get(p.householdId);
    if (!home) return "no-home";
    if (home.placeId.startsWith("counted:")) return "in-counted-place";
    if (!keptAt.has(home.placeId)) return "place-without-counts";
    if (home.memberIds.some((m: string) => m !== p.id && kept(m)))
      return "household-of-kept";
    const filled = rt?.filledAt.get(home.id);
    if (!filled) return "never-filled";
    const days = Math.round(
      (Date.parse(core.date) - Date.parse(filled)) / 86400000,
    );
    return days < 240 ? "in-window" : "past-window";
  };
  const tally: Record<string, number> = {};
  let full = 0,
    demoted = 0,
    husks = 0;
  for (const p of core.people.values()) {
    if (!p.alive) continue;
    if (isDemoted(p)) {
      demoted++;
      continue;
    }
    if (p.tier === "husk") {
      husks++;
      continue;
    }
    full++;
    const r = [];
    if (playerSet.has(p.id)) r.push("player");
    if (serving.has(p.id)) r.push("official");
    if (worker.has(p.id)) r.push(worker.get(p.id));
    if (owners.has(p.id)) r.push("owner");
    let k = r.length ? r.sort().join("+") : "none";
    if (k === "none") k = `none:${noneWhy(p)}`;
    tally[k] = (tally[k] ?? 0) + 1;
  }
  // Knowledge facts and ties held by full, demoted and inactive people.
  const facts: Record<string, number> = { full: 0, demoted: 0, husk: 0 };
  const tierOf = (id: string) => {
    const p = core.people.get(id);
    if (!p) return "gone";
    if (isDemoted(p)) return "demoted";
    if (p.tier === "husk") return "husk";
    return p.alive ? "full" : "dead";
  };
  const demotedHeads: Record<string, number> = {};
  for (const [id, known] of core.knowledgeByPerson) {
    const t = tierOf(id);
    facts[t] = (facts[t] ?? 0) + known.size;
    if (t === "demoted")
      for (const key of known.keys()) {
        const head = key.split(":")[0]!;
        demotedHeads[head] = (demotedHeads[head] ?? 0) + 1;
      }
  }
  const ties: Record<string, number> = {};
  for (const rel of core.relationships.values()) {
    const a = tierOf(rel.actorId);
    const b = tierOf(rel.otherId);
    const k = [a, b].sort().join("-");
    ties[k] = (ties[k] ?? 0) + 1;
  }
  return {
    full,
    demoted,
    husks,
    people: core.people.size,
    facts,
    demotedHeads,
    ties,
    tally,
  };
};
// The twin check's numbers: who is alive and dead, the counts, money, and who won.
let lastDate = "";
const outcomes = () => {
  const api = coreAPI(core);
  let fullAlive = 0,
    fullDead = 0;
  for (const p of core.people.values()) {
    if (p.alive) fullAlive++;
    else fullDead++;
  }
  let counted = 0;
  for (const row of residentCounts(core)) counted += row.people;
  let money = 0;
  const accounts = api.accounts();
  for (const ids of core.cashJournal.accountsByOwner.values())
    for (const id of ids) money += accounts.balance(id);
  const contests = api.moduleState(ELECTIONS_MODULE_ID).table("contests");
  const won: string[] = [];
  const local: string[] = [];
  for (const r of api
    .moduleState(VOTING_MODULE_ID)
    .table("results")
    .rows() as any[]) {
    if (r.date <= lastDate || r.date > core.date) continue;
    won.push(`${r.contestId}=${r.winnerId}`);
    if (process.env.RACES_OUT && /US-VT/.test(r.contestId)) {
      const votes = Object.entries(r.totals as Record<string, number>).sort(
        (a, b) => b[1] - a[1],
      );
      const cast = votes.reduce((n, [, v]) => n + v, 0) || 1;
      appendFileSync(
        `${process.env.RACES_OUT}.vt`,
        `${JSON.stringify({ date: r.date, contestId: r.contestId, winnerId: r.winnerId, top: votes.slice(0, 2).map(([id, v]) => [id, Math.round(v), Number((v / cast).toFixed(4))]) })}\n`,
      );
    }
    const c = contests.get(r.contestId) as any;
    if (
      c &&
      ["local", "city", "county", "municipality", "district"].includes(c.level)
    )
      local.push(`${c.title}: ${r.winnerId}`);
  }
  won.sort();
  if (process.env.RACES_OUT)
    appendFileSync(
      process.env.RACES_OUT,
      `${JSON.stringify({ date: core.date, won })}\n`,
    );
  lastDate = core.date;
  return {
    fullAlive,
    fullDead,
    counted,
    moneyMinor: money,
    races: won.length,
    winnersDigest: stableHash(won.join("|")).slice(0, 12),
    local: local.sort(),
  };
};
outcomes();
let peak = 0;
const timer = setInterval(() => {
  peak = Math.max(peak, process.memoryUsage().rss);
}, 200);
timer.unref();
console.log(`YEAR ${label} 0`, JSON.stringify(why()));
for (let y = 1; y <= Number(years); y++) {
  const t0 = Date.now();
  peak = 0;
  advanceCore(core, addDays(makeIsoDate(core.date), 365));
  const seconds = Math.round((Date.now() - t0) / 1000);
  (globalThis as any).gc?.();
  const heapMB = Math.round(process.memoryUsage().heapUsed / 1048576);
  peak = Math.max(peak, process.memoryUsage().rss);
  console.log(
    `YEAR ${label} ${y}`,
    JSON.stringify({
      seconds,
      heapAfterGcMB: heapMB,
      peakRssMB: Math.round(peak / 1048576),
      ...why(),
      ...outcomes(),
    }),
  );
}
