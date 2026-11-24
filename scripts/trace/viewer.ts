/* eslint-disable @typescript-eslint/no-explicit-any */
// The viewer: a random town in a named state (STATE="Ohio") or anywhere, YEARS years through dev mode, one report file.
// Usage: STATE="Ohio" YEARS=1 OUT=out/ohio.txt node --max-old-space-size=4096 --import tsx scripts/trace/viewer.ts
import { randomBytes } from "node:crypto";
import { writeFileSync, appendFileSync } from "node:fs";
import { buildBenchWorld } from "../../src/bench/world";
import { gameStartDate } from "../../src/core2/game-start";
import { BenchPlayer } from "../../src/bench/player";
import { DevMode } from "../../src/bench/dev-mode";
import { traceNode, traceReport } from "../../src/bench/dev-trace";
import { coreAPI } from "../../src/core2/state";
const L2: string[] = [];
import { newsItems } from "../../src/bench/calendar";
import { realLocalities } from "../../src/core2/places";

const seed = process.env.SEED ?? randomBytes(6).toString("hex");
const out = process.env.OUT ?? `trace-${seed}.txt`;
const years = Number(process.env.YEARS ?? 10);
const limitMs = Number(process.env.LIMIT_MS ?? 10 * 60 * 1000);
const log = (s: string) => {
  appendFileSync(out, s + "\n");
};
writeFileSync(out, "");
const t0 = Date.now();
const stateName = process.env.STATE;
let placeKey: string | undefined;
if (stateName) {
  const inState = realLocalities().filter(
    (p) =>
      p.withinName === stateName || p.displayName.endsWith(", " + stateName),
  );
  if (!inState.length) throw new Error(`No localities for ${stateName}`);
  let h = 0;
  for (const c of seed) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  placeKey = inState[h % inState.length]!.key;
}
const world = buildBenchWorld(seed, gameStartDate(), {
  twoLevel: true,
  ...(placeKey ? { placeKey } : {}),
});
const core = world.core;
const player = new BenchPlayer(core, world.director);
if (world.playerId) player.select(world.playerId);
const dev = new DevMode(core, world.director, player, world.placeId);
const me = core.people.get(player.personId) ?? ({} as any);
log(
  `# ${world.place.displayName} seed ${seed} start ${core.date} built in ${((Date.now() - t0) / 1000).toFixed(0)}s people ${core.people.size} orgs ${core.organizations.size}`,
);
log(
  `player ${player.personId} ${(me as any).givenName ?? ""} ${(me as any).familyName ?? ""} born ${(me as any).birthDate ?? "?"}`,
);
const INTERESTING =
  /elect|vote|law|bill|ordinance|death|died|hire|fired|quit|move|scandal|appoint|vacan|strike|close|open|campaign|speech|interview|arrest|charge|trial|marr|birth|evict|budget|tax|veto|sign/i;
const seenIds = new Set<string>(core.durableLog.keys());
for (let y = 1; y <= years; y++) {
  const from = core.date;
  const target = `${Number(from.slice(0, 4)) + 1}${from.slice(4)}`;
  let ms = 0;
  try {
    ms = dev.advance(target).ms;
  } catch (e) {
    log(
      `!! advance failed year ${y}: ${(e as Error).message}\n${(e as Error).stack}`,
    );
    break;
  }
  log(
    `\n## year ${y}: ${from} -> ${core.date}  ${(ms / 1000).toFixed(0)}s  heap ${(process.memoryUsage().heapUsed / 1e6).toFixed(0)}MB  people ${core.people.size} alive ${[...core.people.values()].filter((p) => p.alive).length} orgs ${core.organizations.size}`,
  );
  const fresh = [...core.durableLog.values()].filter((r) => !seenIds.has(r.id));
  for (const r of fresh) seenIds.add(r.id);
  const byKind = new Map<string, number>();
  for (const r of fresh) byKind.set(r.kind, (byKind.get(r.kind) ?? 0) + 1);
  log(
    `records this year: ${fresh.length}; kinds: ` +
      [...byKind.entries()]
        .sort((a, b) => b[1] - a[1])
        .map(([k, n]) => `${k}=${n}`)
        .join(", "),
  );
  const news = newsItems(core).filter(
    (n) => n.date > from && n.date <= core.date,
  );
  const isFederal = (n: any) =>
    /"federal|:US:federal|federal:us-/.test(JSON.stringify(n.facts));
  const fed = news.filter(isFederal),
    local = news.filter((n) => !isFederal(n));
  const fedKinds = new Map<string, number>();
  for (const n of fed) fedKinds.set(n.kind, (fedKinds.get(n.kind) ?? 0) + 1);
  log(
    `news items: ${news.length} (federal ${fed.length}: ${[...fedKinds.entries()].map(([k, v]) => `${k}=${v}`).join(", ")}; federal dates: ${[...new Set(fed.map((n) => n.date))].join(" ")})`,
  );
  for (const n of fed.filter((n) => n.kind === "law-took-effect").slice(0, 25))
    log(
      `  FED ${n.date} ${(n.facts as any).series} value=${(n.facts as any).value} ${(n.facts as any).unit ?? ""}`,
    );
  for (const n of local.slice().reverse().slice(0, 200))
    log(`  ${n.date} ${n.kind} ${JSON.stringify(n.facts).slice(0, 260)}`);
  const deaths = fresh.filter((r) => /death|died/i.test(r.kind));
  log(`deaths: ${deaths.length}`);
  const elect = fresh.filter((r) =>
    /elect|ballot|result|sworn|term|vacan|appoint/i.test(r.kind),
  );
  const ek = new Map<string, number>();
  for (const r of elect) ek.set(r.kind, (ek.get(r.kind) ?? 0) + 1);
  log(
    `election-ish kinds: ${[...ek.entries()].map(([k, v]) => `${k}=${v}`).join(", ")}`,
  );
  for (const r of elect.filter((r) => !/^person\./.test(r.kind)).slice(0, 40))
    log(
      `  E ${r.date} ${r.kind} ${JSON.stringify((r as any).facts ?? {}).slice(0, 240)}`,
    );
  const pm = core.people.get(player.personId)!;
  log(
    `player: alive=${pm.alive} job=${pm.jobId ? (core.jobs.get(pm.jobId)?.title ?? pm.jobId) : "none"} cash=$${(pm.liquidMinor / 100).toFixed(0)} home=${pm.householdId ?? ""}`,
  );
  const traced = fresh
    .filter((r) => INTERESTING.test(r.kind))
    .sort((a, b) => (a.date < b.date ? 1 : -1));
  const picks: typeof traced = [];
  const kindsSeen = new Set<string>();
  for (const r of traced) {
    if (!kindsSeen.has(r.kind)) {
      kindsSeen.add(r.kind);
      picks.push(r);
    }
    if (picks.length >= 12) break;
  }
  for (const r of picks) {
    log(`\n### trace ${r.id} (${r.kind} ${r.date})`);
    const chain: { id: string; via?: string; value?: unknown }[] = [
      { id: r.id },
    ];
    try {
      let node = traceNode(core, world.director, r.id);
      let depth = 0;
      while (node.children.length && depth < 4) {
        const c =
          node.children.find((c) => c.kind === "reason") ??
          node.children.find((c) => c.kind === "learned") ??
          node.children.find(
            (c) =>
              c.kind === "record" &&
              !/placeId|personIds|witnessIds|householdId|memberIds/.test(c.via),
          ) ??
          node.children[0];
        chain.push({ id: c.id, via: c.via, value: c.value });
        if (c.kind === "record") node = traceNode(core, world.director, c.id);
        else break;
        depth++;
      }
      log(traceReport(core, world.director, chain));
      const n0 = traceNode(core, world.director, r.id);
      log(
        `  children: ` +
          n0.children
            .map(
              (c) =>
                `${c.kind}:${c.via}${c.value !== undefined ? "=" + JSON.stringify(c.value).slice(0, 160) : ""}`,
            )
            .join(" | ")
            .slice(0, 1500),
      );
    } catch (e) {
      log(`  trace failed: ${(e as Error).message}`);
    }
  }
  if (ms > limitMs) {
    log(`\nstopping: year took ${(ms / 1000).toFixed(0)}s`);
    break;
  }
}
// State and federal dump (every seat, term, contest, bill and budget at those levels).
{
  const lines = L2;
  const log = (s: string) => lines.push(s);
  const api = coreAPI(core);

  const isHigh = (s: string) =>
    /:US:|:US-[A-Z]{2}:|"US"|"US-[A-Z]{2}"|federal|state/.test(s);
  const slim = (row: any) => {
    const o: any = {};
    for (const [k, v] of Object.entries(row)) {
      if (v === null || v === undefined) continue;
      const j = JSON.stringify(v);
      if (j.length > 220) {
        o[k] = j.slice(0, 200) + "…";
        continue;
      }
      if (typeof v === "object") o[k] = v;
      else o[k] = v;
    }
    return JSON.stringify(o);
  };
  function dump(
    moduleId: string,
    table: string,
    filter: (row: any) => boolean = () => true,
    limit = 400,
  ) {
    try {
      const rows = api.moduleState(moduleId).table(table).rows() as any[];
      const kept = rows.filter((r) => filter(r));
      log(`\n## ${moduleId}.${table}: ${kept.length} of ${rows.length}`);
      for (const r of kept.slice(0, limit)) log("  " + slim(r).slice(0, 700));
    } catch (e) {
      log(`\n## ${moduleId}.${table}: ${(e as Error).message}`);
    }
  }
  const high = (r: any) =>
    isHigh(JSON.stringify(r).slice(0, 400)) &&
    !/gus2025|place:\d|county:\d/.test(String(r.id ?? ""));
  dump("core2-offices-v1", "offices", high);
  dump(
    "core2-offices-v1",
    "seats",
    (r) => high(r) && !/lower:|upper:|us-house:[0-9]/.test(String(r.id)),
    200,
  );
  dump(
    "core2-offices-v1",
    "terms",
    (r) =>
      high(r) &&
      !/lower:|upper:|us-house:[0-9]|us-senate:/.test(String(r.seatId ?? r.id)),
    200,
  );
  dump(
    "core2-offices-v1",
    "terms",
    (r) => /US-[A-Z]{2}:(lower|upper)/.test(String(r.seatId ?? "")),
    12,
  );
  dump("core2-elections-v1", "contests", high);
  dump("core2-elections-v1", "vacancies", () => true);
  dump("core2-voting-v1", "contests", high);
  dump("core2-voting-v1", "filings", high);
  dump("core2-voting-v1", "campaigns", high, 60);
  dump("core2-executive-v1", "offices", () => true);
  dump("core2-executive-v1", "terms", () => true);
  dump("core2-legislature-v1", "governments", () => true);
  dump("core2-legislature-v1", "budgets", high, 40);
  // bills by body and date
  try {
    const bills = api
      .moduleState("core2-legislature-v1")
      .table("bills")
      .rows() as any[];
    const by = new Map<string, number>();
    for (const b of bills) {
      const k = `${b.bodyOfficeId} ${b.introduced}`;
      by.set(k, (by.get(k) ?? 0) + 1);
    }
    log(`\n## bills by body and introduction date (${bills.length} bills)`);
    for (const [k, n] of [...by.entries()].sort()) log(`  ${k}: ${n}`);
    const st = new Map<string, number>();
    for (const b of bills)
      st.set(
        `${b.bodyOfficeId} ${b.status}`,
        (st.get(`${b.bodyOfficeId} ${b.status}`) ?? 0) + 1,
      );
    log(`## bills by body and status`);
    for (const [k, n] of [...st.entries()].sort()) log(`  ${k}: ${n}`);
    log(`## sample federal bill`);
    const fb = bills.find((b) =>
      /US:|us-house|us-senate|congress/i.test(String(b.bodyOfficeId)),
    );
    if (fb) log("  " + JSON.stringify(fb).slice(0, 2500));
    log(`## sample state bill`);
    const sb = bills.find((b) => /US-[A-Z]{2}:/.test(String(b.bodyOfficeId)));
    if (sb) log("  " + JSON.stringify(sb).slice(0, 2500));
  } catch (e) {
    log(`bills: ${(e as Error).message}`);
  }
  // log kinds at federal/state
  const kinds = new Map<string, number>();
  for (const r of core.durableLog.values()) {
    const j = JSON.stringify((r as any).facts ?? {}) + r.id;
    if (
      /:US:|US-[A-Z]{2}:|federal/.test(j) &&
      !/person\.acted|news\.read|speech|cause/.test(r.kind)
    )
      kinds.set(r.kind, (kinds.get(r.kind) ?? 0) + 1);
  }
  log(
    `\n## federal and state log kinds: ` +
      [...kinds.entries()]
        .sort((a, b) => b[1] - a[1])
        .map(([k, n]) => `${k}=${n}`)
        .join(", "),
  );
  for (const kind of [
    "election-result",
    "took-office",
    "seat-vacated",
    "official-appointed",
    "primary-result",
    "bill-signed",
    "bill-vetoed",
    "veto",
    "executive-order",
    "budget-adopted",
    "chamber-organized",
    "candidate-filed",
    "debate",
  ]) {
    const rows = [...core.durableLog.values()].filter(
      (r) =>
        r.kind === kind &&
        /:US:|US-[A-Z]{2}:|federal/.test(
          JSON.stringify((r as any).facts ?? {}) + r.id,
        ),
    );
    if (!rows.length) continue;
    log(`\n## ${kind} (${rows.length})`);
    for (const r of rows.slice(0, 60))
      log(
        `  ${r.date} ${JSON.stringify((r as any).facts ?? {}).slice(0, 420)}`,
      );
  }

  appendFileSync(out, lines.join("\n") + "\n");
}
log(`\ndone ${((Date.now() - t0) / 60000).toFixed(1)} min`);
