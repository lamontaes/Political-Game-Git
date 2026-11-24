/**
 * Step 1 of the silent-engines audit (Oct 14, 2026): one year of the played
 * world (buildBenchWorld, two-level, every module), seed from the clock,
 * place drawn from all 56. Records, for twelve engines, every hook call,
 * every event kind delivered to them, and their table sizes at start and end.
 * Run: node --max-old-space-size=8192 --import tsx docs/reports/stress-audit-silent-engines-2026-10-14/census.ts
 */
import { createHash } from "node:crypto";
import { writeFileSync } from "node:fs";
import { buildBenchWorld } from "../../../src/bench/world";
import { gameStartDate } from "../../../src/core2/game-start";
import { drawPlace } from "../../../scripts/core2-year/place";
import { advanceCore } from "../../../src/core2/life";
import { coreAPI } from "../../../src/core2/state";
import { setBookkeeping } from "../../../src/core2/bookkeeping";
import { addDays, makeIsoDate } from "../../../src/simulation/dates";
import type { CoreState } from "../../../src/core2/types";

const ENGINES = [
  "core2-ballot-measures-v1",
  "core2-interest-groups-v1",
  "core2-recalls-v1",
  "core2-constituent-cases-v1",
  "corruption",
  "beliefs",
  "core2-law-effects-v1",
  "core2-world-races-v1",
  "core2-voting-v1",
  "core2-press-v1",
  "core2-meetings-v1",
  "core2-officials-v1",
];
const HOOKS = [
  "onCalendarWork",
  "onWorkResult",
  "onWorkAttendance",
  "onWorkPayroll",
  "onAfterDay",
  "onSalesReceipt",
  "onDay",
  "onEvent",
  "onEventAppraisal",
  "onRelationshipChange",
];
const OPERATIONS = [
  "needEvaluators",
  "offerProviders",
  "effectHandlers",
  "eligibilityRules",
  "reasonProviders",
];

const seed =
  process.env.CENSUS_SEED ??
  createHash("sha256").update(String(Date.now())).digest("hex");
setBookkeeping(false);
const place = drawPlace(seed, "silent-engines-audit");
const world = buildBenchWorld(place.seed, gameStartDate(), {
  twoLevel: true,
  placeKey: place.key,
});
const core: CoreState = world.core;
console.log(JSON.stringify({ seed, place }));

const tablesOf = (id: string) => {
  const m = core.modules.get(id);
  if (!m?.state)
    return {} as Record<
      string,
      { rows: number; hash: string; sample: unknown[] }
    >;
  const store = coreAPI(core).moduleState(id);
  const out: Record<string, { rows: number; hash: string; sample: unknown[] }> =
    {};
  for (const name of Object.keys(m.state.tables)) {
    const rows = store.table(name).rows();
    out[name] = {
      rows: rows.length,
      hash: createHash("sha1")
        .update(JSON.stringify(rows))
        .digest("hex")
        .slice(0, 12),
      sample: rows.slice(0, 2),
    };
  }
  return out;
};

const calls = new Map<string, Record<string, number>>();
const bump = (id: string, what: string) => {
  const r = calls.get(id) ?? {};
  r[what] = (r[what] ?? 0) + 1;
  calls.set(id, r);
};
const declared: Record<string, unknown> = {};
for (const id of ENGINES) {
  const m = core.modules.get(id) as unknown as
    Record<string, unknown> | undefined;
  if (!m) {
    declared[id] = "NOT INSTALLED";
    continue;
  }
  declared[id] = {
    hooks: HOOKS.filter((h) => typeof m[h] === "function"),
    operations: Object.fromEntries(
      OPERATIONS.filter((o) => m[o]).map((o) => [
        o,
        Object.keys(m[o] as object),
      ]),
    ),
    eventKinds: m.eventKinds ?? [],
    appraisalEventKinds: m.appraisalEventKinds ?? [],
    relationshipKinds: m.relationshipKinds ?? [],
    tables: Object.keys(
      (m.state as { tables?: object } | undefined)?.tables ?? {},
    ),
    subscribedKinds: [...core.eventSubscribersByKind.entries()]
      .filter(([, ids]) => ids.has(`module:${id}`) || ids.has(id))
      .map(([k]) => k),
  };
  if (Object.isFrozen(m)) continue;
  for (const h of HOOKS) {
    const f = m[h];
    if (typeof f === "function")
      m[h] = (...a: unknown[]) => {
        bump(id, h);
        return (f as (...x: unknown[]) => unknown)(...a);
      };
  }
  for (const o of OPERATIONS) {
    const t = m[o] as Record<string, (...x: unknown[]) => unknown> | undefined;
    if (!t || Object.isFrozen(t)) continue;
    for (const k of Object.keys(t)) {
      const f = t[k]!;
      t[k] = (...a: unknown[]) => {
        bump(id, `${o}.${k}`);
        return f(...a);
      };
    }
  }
}
// Event listeners keep their reference in core.eventSubscribers; count by kind.
for (const [key, listener] of core.eventSubscribers) {
  const id = key.replace(/^module:/, "");
  if (!ENGINES.includes(id)) continue;
  core.eventSubscribers.set(key, ((api: unknown, ev: { kind?: string }) => {
    bump(id, `event:${ev?.kind ?? "?"}`);
    return (listener as (...x: unknown[]) => unknown)(api, ev);
  }) as never);
}

// Relationship and appraisal listeners are also held by reference; count them.
for (const map of [
  core.relationshipSubscribers,
  core.eventAppraisalSubscribers,
] as unknown as Map<string, (...x: unknown[]) => unknown>[])
  for (const [key, listener] of map) {
    const id = key.replace(/^module:/, "");
    if (!ENGINES.includes(id)) continue;
    map.set(key, (...a: unknown[]) => {
      bump(
        id,
        map === (core.relationshipSubscribers as unknown)
          ? "relationship-change"
          : "appraisal",
      );
      return listener(...a);
    });
  }

const startTables = Object.fromEntries(ENGINES.map((id) => [id, tablesOf(id)]));
const startDate = core.date;
const end = addDays(makeIsoDate(core.date), 365);
const t0 = Date.now();
while (core.date < end)
  advanceCore(
    core,
    addDays(makeIsoDate(core.date), 30) < end
      ? addDays(makeIsoDate(core.date), 30)
      : end,
  );
const seconds = (Date.now() - t0) / 1000;
const endTables = Object.fromEntries(ENGINES.map((id) => [id, tablesOf(id)]));

const summary = ENGINES.map((id) => {
  const s = startTables[id]!,
    e = endTables[id]!;
  const changed = Object.keys(e).filter((t) => e[t]!.hash !== s[t]?.hash);
  const ran = Object.keys(calls.get(id) ?? {}).length > 0;
  return {
    id,
    installed: core.modules.has(id),
    ran,
    changedTables: changed,
    verdict: !core.modules.has(id)
      ? "NOT INSTALLED"
      : ran && changed.length
        ? "ran and changed records"
        : ran
          ? "ran, changed nothing"
          : changed.length
            ? "changed records without a counted call"
            : "neither",
    rowsStartEnd: Object.fromEntries(
      Object.keys(e).map((t) => [t, `${s[t]?.rows ?? 0} -> ${e[t]!.rows}`]),
    ),
    calls: calls.get(id) ?? {},
  };
});
const out = {
  seed,
  place,
  startDate,
  endDate: core.date,
  seconds,
  fullPeople: core.people.size,
  declared,
  summary,
  startTables,
  endTables,
};
const file =
  process.env.CENSUS_OUT ??
  "docs/reports/stress-audit-silent-engines-2026-10-14/census.json";
writeFileSync(file, JSON.stringify(out, null, 2));
for (const s of summary)
  console.log(
    s.id.padEnd(28),
    s.verdict.padEnd(26),
    JSON.stringify(s.rowsStartEnd),
    JSON.stringify(s.calls),
  );
console.log(`year ran in ${seconds}s`);
