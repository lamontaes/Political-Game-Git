/**
 * The law-wiring checker: for every law the game has (catalog.ts), in a drawn
 * place built the way the game builds it (buildBenchWorld, two levels,
 * economy on, bookkeeping off), change the law and follow it through links 1
 * to 8, by record id, against a control world of the same seed where a null
 * law took effect the same day (budget lines: where nothing changed).
 *
 *   node --import tsx scripts/law-wiring/check.ts --seed <hex> [--only k1,k2]
 *     [--shard i/n] [--out file.json]
 *
 * A law not in force at the opening is enacted the day after the opening and
 * repealed 35 days later; a law in force at the opening is measured from the
 * first day, repealed the day after (the money it moved is the control's
 * minus the treatment's) and enacted again 35 days later. Laws read from the
 * table trace and money from the journal trace; both hooks are off in play.
 */
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import { buildBenchWorld } from "../../src/bench/world";
import { setBookkeeping } from "../../src/core2/bookkeeping";
import { gameStartDate } from "../../src/core2/game-start";
import { addDays, makeIsoDate } from "../../src/core2/kernel/dates";
import { advanceCore } from "../../src/core2/life";
import { coreAPI } from "../../src/core2/state";
import { setTableTrace } from "../../src/core2/module-state";
import { setJournalTrace } from "../../src/core2/journal-state";
import type { CoreAPI, CoreState } from "../../src/core2/types";
import {
  enactLaw,
  lawChain,
  lawInForce,
  LAWS_MODULE_ID,
} from "../../src/core2/modules/laws";
import { inForceHere, LAW_REACH_HOST_ID } from "../../src/core2/law-reach/host";
import {
  LAW_APPLIED_TABLE,
  type LawAppliedRow,
} from "../../src/core2/law-reach/applied";
import {
  amendBudget,
  budgetsOf,
  governments,
} from "../../src/core2/modules/budgets";
import { REACH_A_MODULE_ID } from "../../src/core2/law-reach/group-a-records";
import { REACH_B_MODULE_ID } from "../../src/core2/law-reach/group-b-store";
import { OUTCOME_WEB_MODULE_ID } from "../../src/core2/modules/outcome-web";
import type { LawRowInput } from "../../src/core2/laws-starting";
import { placeLocalities, placeStateKeys } from "../../src/core2/places";
import { allLaws, webLinksOf, type LawEntry } from "./catalog";

const ROOT = `${process.cwd()}/`;
const WINDOW = 35;
const AFTER = 10;

const arg = (name: string) => {
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 ? process.argv[i + 1] : undefined;
};

/** A place drawn from all 56 by seed (as tests/golden-path/place.ts). */
export function drawLawPlace(seed: string) {
  const h = createHash("sha256").update(`${seed}:law-wiring`).digest("hex");
  const keys = [...placeStateKeys()].sort((a, b) => a.localeCompare(b));
  const stateKey = keys[parseInt(h.slice(0, 8), 16) % keys.length]!;
  const localities = [...placeLocalities(stateKey)].sort((a, b) =>
    a.key.localeCompare(b.key),
  );
  const locality =
    localities[parseInt(h.slice(8, 16), 16) % localities.length]!;
  return {
    seed: h,
    key: locality.key,
    name: locality.displayName,
    state: stateKey,
  };
}

// ---- traces ---------------------------------------------------------------

/** The first stack frame outside the laws engine and the table store: who read the law. */
const SKIP = [
  "src/core2/module-state.ts",
  "src/core2/modules/laws.ts",
  "src/core2/law-reach/host.ts",
  "src/core2/laws-in-force.ts",
  "src/core2/module-calendar.ts",
  "src/core2/state.ts",
  "src/core2/journal-state.ts",
  "src/core2/journal.ts",
  "src/core2/accounts.ts",
  "src/core2/cash-host.ts",
  "scripts/law-wiring/",
];
function readerFrame(): string {
  const stack = new Error().stack ?? "";
  for (const line of stack.split("\n").slice(2)) {
    const m = /\(?((?:file:\/\/)?\/[^()]+):(\d+):\d+\)?$/.exec(line.trim());
    if (!m) continue;
    const file = m[1]!.replace("file://", "").replace(ROOT, "");
    if (!file.startsWith("src/") || SKIP.some((s) => file.includes(s)))
      continue;
    return `${file}:${m[2]}`;
  }
  return "unknown";
}

interface Trace {
  /** key -> reader file:line -> reads */
  reads: Map<string, Map<string, number>>;
  /** journal source kind and poster file:line -> gross minor units moved, and posts */
  money: Map<string, { gross: number; posts: number; ids: string[] }>;
  /** posts whose source cites a law id or key */
  cited: Map<string, { gross: number; ids: string[] }>;
  on: boolean;
}
const trace: Trace = {
  reads: new Map(),
  money: new Map(),
  cited: new Map(),
  on: false,
};
let trackedKeys = new Set<string>();
let citeTokens: string[] = [];

function startTraces(): void {
  Error.stackTraceLimit = 20;
  setTableTrace((moduleId, table, op, query) => {
    if (
      !trace.on ||
      moduleId !== LAWS_MODULE_ID ||
      table !== "laws" ||
      op !== "query" ||
      !query
    )
      return;
    const key = query.values.find(
      (v) => typeof v === "string" && trackedKeys.has(v),
    ) as string | undefined;
    if (!key) return;
    const frame = readerFrame();
    const m = trace.reads.get(key) ?? new Map<string, number>();
    m.set(frame, (m.get(frame) ?? 0) + 1);
    trace.reads.set(key, m);
  });
  setJournalTrace((input) => {
    if (!trace.on) return;
    let gross = 0;
    for (const p of input.postings) if (p.deltaMinor > 0) gross += p.deltaMinor;
    const kind = `${input.sourceRef.kind} @ ${readerFrame()}`;
    const row = trace.money.get(kind) ?? { gross: 0, posts: 0, ids: [] };
    row.gross += gross;
    row.posts += 1;
    if (row.ids.length < 3) row.ids.push(input.id);
    trace.money.set(kind, row);
    const text = `${input.id} ${input.sourceRef.id}`;
    for (const t of citeTokens)
      if (text.includes(t)) {
        const c = trace.cited.get(t) ?? { gross: 0, ids: [] };
        c.gross += gross;
        if (c.ids.length < 3) c.ids.push(input.id);
        trace.cited.set(t, c);
      }
  });
}
function resetTrace(): void {
  trace.reads = new Map();
  trace.money = new Map();
  trace.cited = new Map();
}

// ---- reading the world ----------------------------------------------------

interface ReachCount {
  fullPeople: number;
  countedGroups: number;
  countedPeople: number;
  households: number;
  organizations: number;
  governments: number;
  other: number;
  open: number;
  ended: number;
  sample: string[];
}
function reachOf(
  core: CoreState,
  key: string,
  lawIds: ReadonlySet<string> | null,
): ReachCount {
  const api = coreAPI(core);
  const out: ReachCount = {
    fullPeople: 0,
    countedGroups: 0,
    countedPeople: 0,
    households: 0,
    organizations: 0,
    governments: 0,
    other: 0,
    open: 0,
    ended: 0,
    sample: [],
  };
  const take = (
    row: Record<string, unknown>,
    target: string,
    weight?: number,
  ) => {
    if (lawIds && row.lawId && !lawIds.has(String(row.lawId))) return;
    if (row.endedOn) {
      out.ended += 1;
      return;
    }
    out.open += 1;
    if (out.sample.length < 4) out.sample.push(String(row.id));
    if (core.people.has(target)) out.fullPeople += 1;
    else if (core.households.has(target)) out.households += 1;
    else if (
      core.organizations.has(target) ||
      core.publicOrganizations.has(target)
    ) {
      const org = core.organizations.get(target) as
        { kind?: string } | undefined;
      if (org?.kind === "government" || /government|treasury/.test(target))
        out.governments += 1;
      else out.organizations += 1;
    } else if (/group|counted|cohort/.test(target) || weight !== undefined) {
      out.countedGroups += 1;
      out.countedPeople += weight ?? 0;
    } else if (/^gov|government|treasury|state:|city:|county:/.test(target))
      out.governments += 1;
    else out.other += 1;
  };
  if (core.modules.has(REACH_A_MODULE_ID)) {
    const t = api.moduleState(REACH_A_MODULE_ID).table("reach");
    for (const row of t.rows() as unknown as Record<string, unknown>[])
      if (row.key === key) {
        const count = Number(row.count ?? row.people ?? row.weight ?? NaN);
        take(
          row,
          String(row.targetId),
          Number.isFinite(count) ? count : undefined,
        );
      }
  }
  if (core.modules.has(REACH_B_MODULE_ID)) {
    const s = api.moduleState(REACH_B_MODULE_ID);
    for (const row of s.table("people").rows() as unknown as Record<
      string,
      unknown
    >[])
      if (row.key === key) take(row, String(row.personId));
    for (const row of s.table("organizations").rows() as unknown as Record<
      string,
      unknown
    >[])
      if (row.key === key) take(row, String(row.organizationId));
    for (const row of s.table("groups").rows() as unknown as Record<
      string,
      unknown
    >[])
      if (row.key === key) {
        const count = Number(
          row.count ?? row.people ?? row.weight ?? row.members ?? 0,
        );
        if (lawIds && row.lawId && !lawIds.has(String(row.lawId))) continue;
        if (row.endedOn) {
          out.ended += 1;
          continue;
        }
        out.open += 1;
        out.countedGroups += 1;
        out.countedPeople += Number.isFinite(count) ? count : 0;
        if (out.sample.length < 4) out.sample.push(String(row.id));
      }
  }
  if (core.modules.has(LAW_REACH_HOST_ID))
    for (const row of api
      .moduleState(LAW_REACH_HOST_ID)
      .table(LAW_APPLIED_TABLE)
      .query("byKey", [key, null]) as unknown as LawAppliedRow[]) {
      if (lawIds && !lawIds.has(row.lawId)) continue;
      out.open += 1;
      if (out.sample.length < 4) out.sample.push(row.id);
      if (row.target === "person") out.fullPeople += 1;
      else if (row.target === "household") out.households += 1;
      else if (row.target === "organization") out.organizations += 1;
      else if (row.target === "government") out.governments += 1;
      else {
        out.countedGroups += 1;
        out.countedPeople += row.count;
      }
    }
  return out;
}

function webEffects(
  core: CoreState,
  placeId: string,
  linkKeys: readonly string[],
  since: string,
) {
  if (!core.modules.has(OUTCOME_WEB_MODULE_ID) || !linkKeys.length) return [];
  const rows = coreAPI(core)
    .moduleState(OUTCOME_WEB_MODULE_ID)
    .table("months")
    .query("byPlace", [placeId]) as unknown as {
    id: string;
    date: string;
    effects: Record<string, number>;
  }[];
  const out: { id: string; link: string; effect: number }[] = [];
  for (const row of rows) {
    if (row.date < since) continue;
    for (const k of linkKeys) {
      const e = row.effects?.[k];
      if (e !== undefined && e !== 0)
        out.push({ id: row.id, link: k, effect: e });
    }
  }
  return out;
}

function heardOf(
  core: CoreState,
  lawIds: ReadonlySet<string>,
  key: string,
  since: string,
) {
  const api = coreAPI(core);
  if (!core.modules.has("news")) return { people: 0, sample: [] as string[] };
  const news = api.moduleState("news");
  const stories = new Map<string, boolean>();
  const people = new Set<string>();
  const sample: string[] = [];
  for (const row of news.table("heard").rows() as unknown as {
    id: string;
    personId: string;
    storyId: string;
    date?: string;
  }[]) {
    let hit = stories.get(row.storyId);
    if (hit === undefined) {
      const story = news.table("stories").get(String(row.storyId)) as
        | {
            id: string;
            date?: string;
            facts?: Record<string, string>;
            topic?: string;
          }
        | undefined;
      const f = story?.facts ?? {};
      hit =
        !!story &&
        (story.date ?? "") >= since &&
        (lawIds.has(f.lawId ?? "") ||
          f.series === key ||
          f.line === key.replace("budget-line:", "") ||
          story.topic === key ||
          [...lawIds].some((id) => String(story.id).includes(id)));
      stories.set(row.storyId, hit);
    }
    if (hit) {
      people.add(row.personId);
      if (sample.length < 3) sample.push(row.id);
    }
  }
  return { people: people.size, sample };
}

function snapshotMoney() {
  const m = new Map<string, { gross: number; posts: number; ids: string[] }>();
  for (const [k, v] of trace.money) m.set(k, { ...v, ids: [...v.ids] });
  return m;
}

// ---- changing a law -------------------------------------------------------

interface Change {
  lawIds: Set<string>;
  how: string;
  undo: () => void;
}

function townLevel(
  api: CoreAPI,
  allowed: readonly string[] | null,
): { level: LawRowInput["level"]; jurisdiction: string } | null {
  const chain = lawChain(api).levels;
  const want = (allowed ?? ["city", "county", "state", "federal"]).map((l) =>
    l === "local" ? "city" : l,
  );
  for (const level of ["city", "county", "state", "federal"] as const) {
    if (!want.includes(level)) continue;
    const row = chain.find((l) => l.level === level);
    if (row) return { level, jurisdiction: row.jurisdiction };
  }
  return null;
}

function setQuestion(
  api: CoreAPI,
  law: LawEntry,
  value: 0 | 1,
  tag: string,
  ids: Set<string>,
): string {
  const date = addDays(makeIsoDate(api.state.date), 1);
  const laws = api.moduleState(LAWS_MODULE_ID).table("laws");
  if (value === 0) {
    // Repeal at every level whose latest row says yes.
    const levels: string[] = [];
    for (const { level, jurisdiction } of lawChain(api).levels) {
      const latest = (
        laws.query("bySeries", [
          jurisdiction,
          law.key,
        ]) as unknown as LawRowInput[]
      )
        .filter((r) => r.effectiveDate <= api.state.date)
        .sort((a, b) => b.effectiveDate.localeCompare(a.effectiveDate))[0];
      if (latest?.value !== 1) continue;
      ids.add(latest.id);
      const row = enactLaw(api, {
        jurisdiction,
        level,
        series: law.key,
        value: 0,
        effectiveDate: date,
        measureId: `law-wiring-${tag}`,
        citation: "Law-wiring check: repeal",
      });
      ids.add(row.id);
      levels.push(level);
    }
    return `repealed at ${levels.join(", ") || "no level"} effective ${date}`;
  }
  const at = townLevel(api, law.catalog?.levels ?? null);
  if (!at) return "no level of the town's chain may enact it";
  const row = enactLaw(api, {
    ...at,
    series: law.key,
    value: 1,
    effectiveDate: date,
    measureId: `law-wiring-${tag}`,
    citation: "Law-wiring check: enact",
  });
  ids.add(row.id);
  return `enacted at ${at.level} (${row.id}) effective ${date}`;
}

function changeAmount(
  api: CoreAPI,
  law: LawEntry,
  tag: string,
  ids: Set<string>,
): Change {
  const series = law.series!;
  const now = lawInForce(api, series);
  const g = now.governing as LawRowInput | null | undefined;
  const at = g
    ? { level: g.level, jurisdiction: g.jurisdiction }
    : townLevel(api, law.catalog?.levels ?? null);
  if (!at)
    return {
      lawIds: ids,
      how: "no governing row and no level may set it",
      undo: () => {},
    };
  const old = Number(now.value ?? g?.value ?? 0);
  const next =
    old > 0
      ? Number.isInteger(old)
        ? Math.max(old + 1, Math.round(old * 1.1))
        : Math.round(old * 1.1 * 100) / 100
      : 1;
  const date = addDays(makeIsoDate(api.state.date), 1);
  const row = enactLaw(api, {
    ...at,
    series,
    value: next,
    effectiveDate: date,
    measureId: `law-wiring-${tag}`,
    citation: "Law-wiring check: amount raised a tenth",
    ...(g?.unit ? { unit: g.unit } : {}),
    ...(g?.terms ? { terms: { ...g.terms } } : {}),
  });
  ids.add(row.id);
  if (g) ids.add(g.id);
  return {
    lawIds: ids,
    how: `${series} ${old} -> ${next} at ${at.level} (${row.id}) effective ${date}`,
    undo: () => {
      const back = enactLaw(api, {
        ...at,
        series,
        value: old,
        effectiveDate: addDays(makeIsoDate(api.state.date), 1),
        measureId: `law-wiring-${tag}-undo`,
        citation: "Law-wiring check: amount restored",
        ...(g?.unit ? { unit: g.unit } : {}),
        ...(g?.terms ? { terms: { ...g.terms } } : {}),
      });
      ids.add(back.id);
    },
  };
}

function changeBudget(
  api: CoreAPI,
  law: LawEntry,
  tag: string,
  ids: Set<string>,
): Change {
  const line = law.key.slice("budget-line:".length);
  const town = lawChain(api).levels;
  const govs = governments(api);
  const gov =
    govs.find((g) => g.level === "city") ??
    govs.find((g) => g.level === "county") ??
    govs.find((g) => g.level === "state");
  if (!gov)
    return {
      lawIds: ids,
      how: `no government budget in ${town.map((l) => l.level).join(",")}`,
      undo: () => {},
    };
  const budget = [...budgetsOf(api, gov.id)].sort(
    (a, b) => b.fiscalYear - a.fiscalYear,
  )[0];
  const base = budget?.spendingMinor[line] ?? 0;
  const delta = Math.max(100_000_00, Math.round(base * 0.2));
  const row = amendBudget(api, {
    governmentId: gov.id,
    line,
    deltaMinor: delta,
    measureId: `law-wiring-${tag}`,
  });
  ids.add(`law-wiring-${tag}`);
  return {
    lawIds: ids,
    how: row
      ? `${gov.id} ${line} ${base} -> ${base + delta} by law-wiring-${tag}`
      : `${gov.id} has no budget this year`,
    undo: () => {
      amendBudget(api, {
        governmentId: gov.id,
        line,
        deltaMinor: -delta,
        measureId: `law-wiring-${tag}-undo`,
      });
    },
  };
}

// ---- one law ---------------------------------------------------------------

function step(core: CoreState, days: number): void {
  advanceCore(core, addDays(makeIsoDate(core.date), days));
}

function build(drawn: ReturnType<typeof drawLawPlace>) {
  return buildBenchWorld(drawn.seed, gameStartDate(), {
    twoLevel: true,
    placeKey: drawn.key,
  });
}

interface Control {
  money: Map<string, { gross: number; posts: number; ids: string[] }>;
  reads: Map<string, Map<string, number>>;
  web: Map<string, number>;
}

/** The series a null law sets: no engine, handler or link reads it. */
const NULL_SERIES = "law-wiring-null-control";

/**
 * The control world: the same seed with nothing changed (for budget lines,
 * whose change is no news), or with a null law taking effect the same day
 * (for laws: any law taking effect is news and reruns the outcome web, so
 * only what this law's own content does differs from it).
 */
function runControl(
  drawn: ReturnType<typeof drawLawPlace>,
  laws: readonly LawEntry[],
  nullLaw: boolean,
): Control {
  const w = build(drawn);
  trackedKeys = new Set(laws.map((l) => l.key));
  citeTokens = [];
  resetTrace();
  if (nullLaw) {
    const api = coreAPI(w.core);
    const at = townLevel(api, null)!;
    enactLaw(api, {
      ...at,
      series: NULL_SERIES,
      value: 1,
      effectiveDate: addDays(makeIsoDate(w.core.date), 1),
      measureId: "law-wiring-null",
      citation: "Law-wiring check: null control",
    });
  }
  trace.on = true;
  step(w.core, 1 + WINDOW);
  trace.on = false;
  const money = snapshotMoney();
  const reads = trace.reads;
  const placeId = lawChain(coreAPI(w.core)).townPlaceId;
  const web = new Map<string, number>();
  for (const law of laws)
    for (const l of webLinksOf(law))
      for (const e of webEffects(w.core, placeId, [l.key], "0000"))
        web.set(`${e.id}|${e.link}`, e.effect);
  return { money, reads, web };
}

function checkLaw(
  drawn: ReturnType<typeof drawLawPlace>,
  law: LawEntry,
  control: Control,
) {
  const started = Date.now();
  const w = build(drawn);
  const core = w.core;
  const api = coreAPI(core);
  const placeId = lawChain(api).townPlaceId;
  const tag = createHash("sha256").update(law.key).digest("hex").slice(0, 8);
  const ids = new Set<string>();
  trackedKeys = new Set([law.key]);
  resetTrace();

  const opening = law.kind === "question" ? inForceHere(api, law.key) : false;
  // Link 1 in the drawn place: the row in force (or saying no) on day one.
  const openingRow =
    law.kind === "budget-line"
      ? null
      : ((
          lawInForce(api, law.series ?? law.key).governing as
            LawRowInput | null | undefined
        )?.id ??
        (
          api
            .moduleState(LAWS_MODULE_ID)
            .table("laws")
            .query("bySeriesOnly", [law.key]) as unknown as LawRowInput[]
        )
          .map((r) => r.id)
          .sort()[0] ??
        null);
  const openingReach = reachOf(core, law.key, null);
  let how: string;
  let undo: () => void;
  if (law.kind === "question") {
    how = setQuestion(api, law, opening ? 0 : 1, tag, ids);
    undo = () => {
      how += `; then ${setQuestion(api, law, opening ? 1 : 0, `${tag}-b`, ids)}`;
    };
  } else if (law.kind === "budget-line") {
    const c = changeBudget(api, law, tag, ids);
    how = c.how;
    undo = c.undo;
  } else {
    const c = changeAmount(api, law, tag, ids);
    how = c.how;
    undo = c.undo;
  }
  citeTokens = [...ids, law.key, `law-wiring-${tag}`];
  const since = core.date;
  trace.on = true;
  step(core, 1 + WINDOW);
  trace.on = false;
  const money = snapshotMoney();
  const reads = trace.reads.get(law.key) ?? new Map();
  const controlReads = control.reads.get(law.key) ?? new Map();
  const reach = reachOf(core, law.key, opening ? null : ids);
  const links = webLinksOf(law);
  const web = webEffects(
    core,
    placeId,
    links.map((l) => l.key),
    since,
  ).filter((e) => control.web.get(`${e.id}|${e.link}`) !== e.effect);
  const heard = heardOf(core, ids, law.key, since);
  // Money: each journal source kind whose total differs from the control's.
  const moneyDiff: {
    kind: string;
    treatment: number;
    control: number;
    ids: string[];
  }[] = [];
  for (const kind of new Set([...money.keys(), ...control.money.keys()])) {
    const t = money.get(kind)?.gross ?? 0;
    const c = control.money.get(kind)?.gross ?? 0;
    if (t !== c)
      moneyDiff.push({
        kind,
        treatment: t,
        control: c,
        ids: money.get(kind)?.ids ?? control.money.get(kind)?.ids ?? [],
      });
  }
  moneyDiff.sort(
    (a, b) =>
      Math.abs(b.treatment - b.control) - Math.abs(a.treatment - a.control),
  );
  const cited = [...trace.cited.entries()].map(([token, v]) => ({
    token,
    ...v,
  }));
  // Money a file that read this law (or law reach itself) posted differently from the control.
  const readerFiles = new Set(
    [...reads.keys(), ...controlReads.keys()].map((f) =>
      f.replace(/:\d+$/, ""),
    ),
  );
  const direct = moneyDiff.filter((d) => {
    const file = d.kind.split(" @ ")[1]?.replace(/:\d+$/, "") ?? "";
    return file.startsWith("src/core2/law-reach/") || readerFiles.has(file);
  });

  // Repeal (or re-enact) and see whether reach ends (or returns).
  undo();
  step(core, AFTER);
  const after = reachOf(core, law.key, null);
  // An amount or a budget line is never repealed, only put back: what must stop is the changed row's own reach.
  const afterUndoChanged = reachOf(core, law.key, ids);
  const readers = new Map<string, number>();
  for (const [f, n] of [...reads, ...controlReads])
    readers.set(f, (readers.get(f) ?? 0) + n);
  return {
    key: law.key,
    kind: law.kind,
    family: law.family,
    inForceAtOpening: opening,
    change: how,
    lawIds: [...ids],
    openingReach,
    reach,
    readers: Object.fromEntries([...readers].sort((a, b) => b[1] - a[1])),
    openingRow,
    money: {
      direct,
      diff: moneyDiff.slice(0, 12),
      diffKinds: moneyDiff.length,
      cited,
    },
    web: {
      links: links.map((l) => ({ key: l.key, status: l.status, to: l.to })),
      fired: web.slice(0, 12),
      firedCount: web.length,
    },
    heard,
    afterUndo: after,
    afterUndoChanged,
    seconds: Math.round((Date.now() - started) / 1000),
  };
}

// ---- main ------------------------------------------------------------------

function main(): void {
  setBookkeeping(false);
  const seed =
    arg("seed") ??
    createHash("sha256").update(`law-wiring:${Date.now()}`).digest("hex");
  const drawn = drawLawPlace(seed);
  const only = arg("only")?.split(",");
  const [shard, of] = (arg("shard") ?? "0/1").split("/").map(Number) as [
    number,
    number,
  ];
  const laws = allLaws()
    .filter((l) => !only || only.includes(l.key))
    .filter((_, i) => i % of === shard);
  if (process.argv.includes("--draw")) {
    console.log(JSON.stringify(drawn));
    return;
  }
  const out =
    arg("out") ??
    `docs/reports/law-wiring/${drawn.state}-${drawn.key}-${shard}.json`;
  console.error(
    `law-wiring: seed ${seed} -> ${drawn.name}, ${drawn.state} (${drawn.key}); ${laws.length} laws`,
  );
  startTraces();
  const t = Date.now();
  const lawControl = runControl(drawn, allLaws(), true);
  const lineControl = laws.some((l) => l.kind === "budget-line")
    ? runControl(drawn, allLaws(), false)
    : lawControl;
  console.error(`control world: ${Math.round((Date.now() - t) / 1000)}s`);
  // A run picks up where an earlier one on the same file stopped.
  const results: { key: string; error?: string }[] = existsSync(out)
    ? (
        JSON.parse(readFileSync(out, "utf8")) as {
          results: { key: string; error?: string }[];
        }
      ).results.filter((r) => !r.error)
    : [];
  const done = new Set(results.map((r) => r.key));
  const write = () => {
    mkdirSync(dirname(out), { recursive: true });
    writeFileSync(
      out,
      `${JSON.stringify({ seed, place: drawn, window: WINDOW, after: AFTER, results }, null, 1)}\n`,
    );
  };
  for (const law of laws) {
    if (done.has(law.key)) continue;
    try {
      const r = checkLaw(
        drawn,
        law,
        law.kind === "budget-line" ? lineControl : lawControl,
      );
      results.push(r);
      console.error(
        `${law.key}: reach ${r.reach.open} (full ${r.reach.fullPeople}, groups ${r.reach.countedGroups}, orgs ${r.reach.organizations}), readers ${Object.keys(r.readers).length}, money kinds ${r.money.diffKinds}, web ${r.web.firedCount}/${r.web.links.length}, heard ${r.heard.people}, after ${r.afterUndo.open} [${r.seconds}s]`,
      );
    } catch (error) {
      results.push({
        key: law.key,
        kind: law.kind,
        family: law.family,
        error: String((error as Error).stack ?? error).slice(0, 800),
      });
      console.error(`${law.key}: ERROR ${(error as Error).message}`);
    }
    write();
  }
  write();
  setTableTrace(null);
  setJournalTrace(null);
}

if (process.argv[1]?.endsWith("check.ts")) main();
