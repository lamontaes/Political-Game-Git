/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * What the remaining growing tables hold after N years: stance rows' per-
 * speaker counts (and how many speakers are dead), the log by kind, candidacy
 * decisions by whether the contest is decided, campaign impressions by
 * whether the candidate's race is over, and credit loans by status.
 *   node --import tsx scripts/speed-years/probe-rest.ts <seed> <placeKey> <years>
 * CORE2_FAST_FORWARD=1 turns on the campaign stride; the seed is the world seed as given.
 */
import { buildBenchWorld } from "../../src/bench/world";
import { setBookkeeping } from "../../src/core2/bookkeeping";
import { setFastForward } from "../../src/core2/fast-forward";
import { gameStartDate } from "../../src/core2/game-start";
import { addDays, makeIsoDate } from "../../src/core2/kernel/dates";
import { advanceCore } from "../../src/core2/life";
import { coreAPI } from "../../src/core2/state";

const [seed = "mont1", placeKey = "5046000", years = "4"] =
  process.argv.slice(2);
setBookkeeping(false);
if (process.env.CORE2_FAST_FORWARD === "1") setFastForward(true);
const world = buildBenchWorld(seed, gameStartDate(), {
  twoLevel: true,
  placeKey,
});
const core = world.core as any;
advanceCore(core, addDays(makeIsoDate(core.date), 365 * Number(years)));
const api = coreAPI(core);
const size = (v: unknown) => JSON.stringify(v)?.length ?? 0;
const top = (m: Map<string, number>, n = 12) =>
  [...m].sort((a, b) => b[1] - a[1]).slice(0, n);
console.log(`year ${years} ${core.date}`);
// Stances.
{
  let rows = 0,
    speakers = 0,
    dead = 0,
    gone = 0,
    heardBytes = 0,
    causeBytes = 0,
    causes = 0;
  for (const row of api.moduleState("views").table("stances").rows() as any[]) {
    rows++;
    for (const id of Object.keys(row.heard ?? {})) {
      speakers++;
      const p = core.people.get(id);
      if (!p) gone++;
      else if (!p.alive) dead++;
    }
    heardBytes += size(row.heard ?? {});
    causeBytes += size(row.causes ?? []);
    causes += row.causes?.length ?? 0;
  }
  console.log(
    `stances: ${rows} rows, ${speakers} speaker counts (${dead} dead speakers, ${gone} not a person record), heard ${Math.round(heardBytes / 1048576)} MB JSON, causes ${causes} rows ${Math.round(causeBytes / 1048576)} MB JSON`,
  );
}
// Log by kind.
{
  const n = new Map<string, number>(),
    b = new Map<string, number>();
  let i = 0;
  for (const row of core.durableLog.values()) {
    const k = row.kind ?? "?";
    n.set(k, (n.get(k) ?? 0) + 1);
    if (i++ % 20 === 0) b.set(k, (b.get(k) ?? 0) + size(row) * 20);
  }
  console.log(`log: ${core.durableLog.size} rows`);
  // The routine acts the log keeps: why each is kept and what its decision weighs.
  const why = new Map<string, number>(),
    whyBytes = new Map<string, number>();
  for (const row of core.durableLog.values()) {
    if (row.kind !== "person.acted") continue;
    const player = [
      ...(row.personIds ?? []),
      ...(row.witnessIds ?? []),
    ].includes(core.playerId);
    const k =
      `${row.visibility}${row.publicRecord ? "+public" : ""}${row.news ? "+news" : ""}${player ? "+player" : ""}${row.decision ? (row.decision.scores ? "+scores" : "+condensed") : ""}:${row.actionId ?? row.facts?.action ?? ""}`.slice(
        0,
        90,
      );
    why.set(k, (why.get(k) ?? 0) + 1);
    whyBytes.set(k, (whyBytes.get(k) ?? 0) + size(row));
  }
  for (const [k, bytes] of top(whyBytes, 15))
    console.log(
      `  person.acted ${String(Math.round(bytes / 1048576)).padStart(4)} MB ${String(why.get(k)).padStart(7)}  ${k}`,
    );
  const sample = [...core.durableLog.values()].find(
    (r: any) => r.kind === "person.acted" && r.publicRecord,
  );
  if (sample)
    console.log(
      `  public act sample keys: ${Object.keys(sample).join(",")}; decision keys: ${Object.keys(sample.decision ?? {}).join(",")}`,
    );
  for (const [k, bytes] of top(b, 15))
    console.log(
      `  ${String(Math.round(bytes / 1048576)).padStart(5)} MB ${String(n.get(k)).padStart(8)} rows  ${k}`,
    );
}
// Candidacy decisions and impressions by whether the contest is decided.
{
  const contests = api.moduleState("core2-elections-v1").table("contests");
  const decided = (contestId: string) => {
    const c = contests.get(contestId) as any;
    return c ? (c.electionDate < core.date ? "past" : "ahead") : "no-contest";
  };
  const d = new Map<string, number>();
  let dBytes = 0,
    i = 0;
  for (const row of api
    .moduleState("candidacy")
    .table("decisions")
    .rows() as any[]) {
    const k = `${decided(row.contestId)}:${row.run ? "run" : "not"}`;
    d.set(k, (d.get(k) ?? 0) + 1);
    if (i++ % 20 === 0) dBytes += size(row) * 20;
  }
  console.log(
    `candidacy.decisions ${Math.round(dBytes / 1048576)} MB JSON`,
    JSON.stringify(Object.fromEntries(d)),
  );
  const m = new Map<string, number>();
  let mBytes = 0;
  i = 0;
  for (const row of api
    .moduleState("core2-campaigns-v1")
    .table("impressions")
    .rows() as any[]) {
    const p = core.people.get(row.voterId);
    const k = `${p ? (p.alive ? "alive" : "dead") : "no-person"}`;
    m.set(k, (m.get(k) ?? 0) + 1);
    if (i++ % 20 === 0) mBytes += size(row) * 20;
  }
  console.log(
    `impressions ${Math.round(mBytes / 1048576)} MB JSON`,
    JSON.stringify(Object.fromEntries(m)),
  );
  const sample = api
    .moduleState("core2-campaigns-v1")
    .table("impressions")
    .rows()[0];
  console.log(
    `  impression sample keys: ${Object.keys(sample ?? {}).join(",")}`,
  );
}
// Credit loans by status.
{
  const s = new Map<string, number>();
  let bytes = 0,
    i = 0;
  for (const row of api.moduleState("credit").table("loans").rows() as any[]) {
    const k = `${row.kind ?? "?"}:${row.status ?? (row.closedAt ? "closed" : "open")}`;
    s.set(k, (s.get(k) ?? 0) + 1);
    if (i++ % 20 === 0) bytes += size(row) * 20;
  }
  console.log(
    `credit.loans ${Math.round(bytes / 1048576)} MB JSON`,
    JSON.stringify(Object.fromEntries(s)),
  );
}
