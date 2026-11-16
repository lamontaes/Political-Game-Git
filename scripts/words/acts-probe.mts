import { setBookkeeping } from "../../src/core2/bookkeeping";
import { gameStartDate } from "../../src/core2/game-start";
import { buildBenchWorldInStages, OPENING_WARMUP_DAYS } from "../../src/bench/world";
setBookkeeping(false);
const world = await buildBenchWorldInStages("21", gameStartDate(), { twoLevel: true, warmUpDays: OPENING_WARMUP_DAYS }, () => undefined);
const { core } = world;
const kinds: Record<string, { n: number; keys: Set<string> }> = {};
for (const [pid, ids] of core.logByPerson) for (const id of ids) {
  const r: any = core.durableLog.get(id as never); if (!r) continue;
  const k = (kinds[r.kind] ??= { n: 0, keys: new Set() }); k.n++;
  for (const f of Object.keys(r.facts ?? {})) k.keys.add(f);
}
for (const [k, v] of Object.entries(kinds).sort((a, b) => b[1].n - a[1].n).slice(0, 60)) console.log(v.n, k, [...v.keys].slice(0, 8).join(","));
const kn: Record<string, number> = {};
for (const m of core.knowledgeByPerson.values()) for (const key of m.keys()) { const g = key.replace(/[0-9a-f]{8,}/g, "#").split(":").slice(0,3).join(":"); kn[g] = (kn[g] ?? 0) + 1; }
console.log(Object.entries(kn).sort((a,b)=>b[1]-a[1]).slice(0,25));
const shown = new Set<string>();
for (const ids of core.logByPerson.values()) for (const id of ids) { const r: any = core.durableLog.get(id as never); if (r && ["town-hall","public-comment","vote-recorded","person.acted","person.weighed","office.voted"].includes(r.kind) && !shown.has(r.kind)) { shown.add(r.kind); console.log(r.kind, String(JSON.stringify(r.facts ?? r)).slice(0, 400)); } }
