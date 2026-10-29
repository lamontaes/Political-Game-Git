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
  yesLevels,
} from "../../src/core2/modules/laws";
import { LAW_REACH_HOST_ID } from "../../src/core2/law-reach/host";
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
import {
  lineMoney,
  ownPayments,
  UNDER,
  type Posting,
  type Reached,
} from "./own-payments";
import { OUTCOME_WEB_MODULE_ID } from "../../src/core2/modules/outcome-web";
import { countyNonattainment } from "../../src/core2/business-operating-rules";
import { HOUSING_MODULE_ID } from "../../src/core2/modules/housing";
import type { LawRowInput } from "../../src/core2/laws-starting";
import { townSeats } from "../../src/core2/modules/offices";
import { draftBill, type Provision } from "../../src/core2/modules/legislature";
import powersCatalog from "../../data/research/powers-catalog/catalog.json" with { type: "json" };
import powerQuestions from "../../data/research/powers-catalog/question-powers.json" with { type: "json" };
import { placeLocalities, placeStateKeys } from "../../src/core2/places";
import { linkCoverage, WEB_LINKS } from "../../src/core2/outcome-web-model";
import { allLaws, webLinksOf, type LawEntry } from "./catalog";
import legislaturePowers from "../../src/core2/data/legislature/series-powers.json" with { type: "json" };
import startingLawData from "../../src/core2/data/laws/starting-law.json" with { type: "json" };

const ROOT = `${process.cwd()}/`;
/** Days after a repeal (or the old amount put back) before reach is read again: a month, so an engine that applies a law at a monthly close runs once. */
const AFTER = 31;

const arg = (name: string) => {
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 ? process.argv[i + 1] : undefined;
};
/** Days each law runs before it is graded (--days lengthens it for laws whose event comes later). */
const WINDOW = Number(arg("days") ?? 35);

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
/** The day loop, which calls every module's day: never an engine of its own. */
const DAY_LOOP = "src/core2/life.ts";
function readerFrame(): string {
  const stack = new Error().stack ?? "";
  let reach: string | undefined;
  for (const line of stack.split("\n").slice(2)) {
    const m = /\(?((?:file:\/\/)?\/[^()]+):(\d+):\d+\)?$/.exec(line.trim());
    if (!m) continue;
    const file = m[1]!.replace("file://", "").replace(ROOT, "");
    if (!file.startsWith("src/") || SKIP.some((s) => file.includes(s)))
      continue;
    const at = `${file}:${m[2]}`;
    if (file.startsWith("src/core2/law-reach/")) {
      // A law-reach function an engine calls on its own step: name the engine below it too.
      reach = reach ?? at;
      continue;
    }
    return reach ? `${reach} <- ${at}` : at;
  }
  return reach ? `${reach} <- none` : "unknown";
}

interface Trace {
  /** key -> reader file:line -> reads */
  reads: Map<string, Map<string, number>>;
  /** journal source kind and poster file:line -> gross minor units moved, and posts */
  money: Map<string, { gross: number; posts: number; ids: string[] }>;
  /** posts whose source, or a posting of it, cites a law id or key */
  cited: Map<string, { gross: number; ids: string[] }>;
  /** the treasuries' payments on a budget line, by payment id (which ends in its date) */
  treasury: Map<string, { gross: number; ids: string[] }>;
  /** account -> each posting on it: date, source kind, signed amount, journal id */
  byAccount: Map<string, Posting[]>;
  on: boolean;
}
const trace: Trace = {
  reads: new Map(),
  money: new Map(),
  cited: new Map(),
  treasury: new Map(),
  byAccount: new Map(),
  on: false,
};
let trackedKeys = new Set<string>();
const kinds = new Map<string, string>();
let citeTokens: string[] = [];
/** Every law key, to name the laws a payment's source cites. */
const lawKeys = allLaws().map((l) => l.key);
const underCache = new Map<string, string>();
/** The law keys a source id cites, from its first "law:" on (a price's id ends in its law's key and row), bounded by colons. */
function underOf(sourceId: string): string {
  const at = sourceId.indexOf("law:");
  if (at < 0) return "";
  const tail = `:${sourceId.slice(at)}:`;
  let under = underCache.get(tail);
  if (under === undefined) {
    if (underCache.size > 50_000) underCache.clear();
    under = lawKeys.filter((k) => tail.includes(`:${k}:`)).join("+");
    underCache.set(tail, under);
  }
  return under;
}

function startTraces(): void {
  Error.stackTraceLimit = 60;
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
    // One shared string per source kind, poster and the laws its source cites.
    const under = underOf(input.sourceRef.id);
    const own = under ? `${kind}${UNDER}${under}` : kind;
    const shared = kinds.get(own) ?? kinds.set(own, own).get(own)!;
    for (const p of input.postings) {
      const list = trace.byAccount.get(p.accountId);
      const posting: Posting = [input.date, shared, p.deltaMinor, input.id];
      if (list) list.push(posting);
      else trace.byAccount.set(p.accountId, [posting]);
    }
    const text = `${input.id} ${input.sourceRef.id}`;
    for (const t of citeTokens) {
      // The entry names the law, or one of its postings does (a paycheck's tax
      // line names the law row it took): then only that posting's money counts.
      let named = text.includes(t) ? gross : 0;
      if (!named)
        for (const p of input.postings)
          if (p.deltaMinor > 0 && p.id?.includes(t)) named += p.deltaMinor;
      if (named) {
        const c = trace.cited.get(t) ?? { gross: 0, ids: [] };
        c.gross += named;
        if (c.ids.length < 3) c.ids.push(input.id);
        trace.cited.set(t, c);
      }
    }
    // A treasury's payment on a budget line names its government, line and date.
    if (input.sourceRef.id.startsWith("treasury")) {
      const row = trace.treasury.get(input.sourceRef.id) ?? {
        gross: 0,
        ids: [],
      };
      row.gross += gross;
      if (row.ids.length < 3) row.ids.push(input.id);
      trace.treasury.set(input.sourceRef.id, row);
    }
  });
}
function resetTrace(): void {
  trace.reads = new Map();
  trace.money = new Map();
  trace.cited = new Map();
  trace.treasury = new Map();
  trace.byAccount = new Map();
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

/**
 * The law causes the web read, month by month, for the links of these laws
 * that run on core2 (a built, sized link to a kept measure whose cause is a
 * law). A link with a long lag moves its outcome that many months after the
 * cause changes; what a run can show of it is the cause the web read.
 */
function webCauses(
  core: CoreState,
  placeId: string,
  laws: readonly LawEntry[],
) {
  const links = laws.flatMap((law) =>
    WEB_LINKS.filter(
      (l) =>
        l.from.startsWith("law:") &&
        linkCoverage(l).wired &&
        webLinksOf(law).some((w) => w.key === l.key),
    ),
  );
  if (!core.modules.has(OUTCOME_WEB_MODULE_ID) || !links.length) return [];
  const rows = coreAPI(core)
    .moduleState(OUTCOME_WEB_MODULE_ID)
    .table("months")
    .query("byPlace", [placeId]) as unknown as {
    id: string;
    date: string;
    values: Record<string, number>;
  }[];
  return rows.flatMap((row) =>
    links.flatMap((link) => {
      const value = row.values?.[link.from];
      return typeof value === "number"
        ? [{ id: row.id, date: row.date, link, value }]
        : [];
    }),
  );
}

function heardOf(
  core: CoreState,
  lawIds: ReadonlySet<string>,
  key: string,
  since: string,
) {
  const api = coreAPI(core);
  if (!core.modules.has("news"))
    return { people: 0, sample: [] as string[], ids: new Set<string>() };
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
  return { people: people.size, sample, ids: people };
}

/**
 * Plays a window in steps shorter than the news engine's memory (it forgets
 * who heard a story after 30 days), so everyone who heard about the law at
 * any point in a long window is counted, not only those still remembered on
 * its last day. With `peak`, it also keeps the step at which the changed rows
 * reached the most people.
 */
function stepHearing(
  core: CoreState,
  days: number,
  heard: { people: Set<string>; sample: string[] },
  lawIds: ReadonlySet<string>,
  key: string,
  since: string,
  peak?: { reach: ReachCount | null },
): void {
  for (let left = days; left > 0;) {
    const d = Math.min(28, left);
    step(core, d);
    left -= d;
    if (peak) {
      const now = reachOf(core, key, lawIds);
      if (!peak.reach || now.open > peak.reach.open) peak.reach = now;
    }
    const now = heardOf(core, lawIds, key, since);
    for (const id of now.ids) heard.people.add(id);
    for (const id of now.sample)
      if (heard.sample.length < 3 && !heard.sample.includes(id))
        heard.sample.push(id);
  }
}

/** Who a law could bind in the drawn place: the subjects its handler applies it to. */
interface Subjects {
  count: number;
  why: string;
  ids: string[];
}

/**
 * For a law whose handler binds only one kind of subject, who in the drawn
 * place it could bind, read from the records the handler reads: none means
 * reaching nobody here is the statute's own terms, not a missing wire.
 */
const SUBJECTS: Readonly<
  Record<string, (core: CoreState, since: string) => Subjects>
> = {
  // routeCompliance in modules/business.ts: a county out of attainment of an
  // air quality standard (EPA Green Book) puts the plan's duty on its emitters.
  "us-policy-positions:environment-energy.clean-air-plan-for-polluted-counties":
    (core) => {
      const county = core.placeMetadata?.housingCounty ?? "";
      const year = Number(core.date.slice(0, 4));
      const rows = county
        ? countyNonattainment(county, year).filter((row) => !row.revoked)
        : [];
      return {
        count: rows.length,
        why: `county ${county || "(none)"} misses ${rows.length} air quality standards in ${year} (EPA Green Book)`,
        ids: rows.map((row) => `${county}:${row.standard}`),
      };
    },
  // The groundwater cap in modules/business.ts binds the town's open farms.
  "us-policy-positions:agriculture-natural-resources.limit-groundwater-withdrawal":
    (core) => {
      const town = lawChain(coreAPI(core)).townPlaceId;
      const farms = [...core.finance.businesses]
        .filter(
          ([id, book]) =>
            !book.closedAt &&
            core.organizations.get(id)?.placeId === town &&
            (core.organizations.get(id)?.classification ?? "").startsWith(
              "enterprise:agriculture",
            ),
        )
        .map(([id]) => id);
      return {
        count: farms.length,
        why: `${farms.length} open farms in the town`,
        ids: farms.slice(0, 3),
      };
    },
  // payCounsel in modules/housing.ts: a lawyer at the hearing of an eviction case.
  "us-policy-positions:housing-land-use.right-to-counsel-in-eviction": (
    core,
    since,
  ) => {
    const cases = core.modules.has(HOUSING_MODULE_ID)
      ? (
          coreAPI(core)
            .moduleState(HOUSING_MODULE_ID)
            .table("cases")
            .rows() as unknown as { id: string; filedAt?: string }[]
        ).filter((row) => row.filedAt && row.filedAt >= since)
      : [];
    return {
      count: cases.length,
      why: `${cases.length} eviction cases filed in the window`,
      ids: cases.slice(0, 3).map((row) => row.id),
    };
  },
};

/** The law's own applied rows in the window and how many record an amount owed, paid, taken or held. */
function appliedAmounts(
  core: CoreState,
  key: string,
  lawIds: ReadonlySet<string> | null,
): { rows: number; withAmount: number; sample: string[] } {
  const out = { rows: 0, withAmount: 0, sample: [] as string[] };
  if (!core.modules.has(LAW_REACH_HOST_ID)) return out;
  for (const row of coreAPI(core)
    .moduleState(LAW_REACH_HOST_ID)
    .table(LAW_APPLIED_TABLE)
    .query("byKey", [key, null]) as unknown as LawAppliedRow[]) {
    if (lawIds && !lawIds.has(row.lawId)) continue;
    out.rows += 1;
    if (row.amountMinor) out.withAmount += 1;
    if (out.sample.length < 3) out.sample.push(row.id);
  }
  return out;
}

function reachedTargets(
  core: CoreState,
  key: string,
  lawIds: ReadonlySet<string> | null,
): Reached[] {
  const api = coreAPI(core);
  const out = new Map<string, Reached>();
  const add = (row: Record<string, unknown>, target: unknown) => {
    if (lawIds && row.lawId && !lawIds.has(String(row.lawId))) return;
    const targetId = String(target);
    if (out.has(targetId)) return;
    out.set(targetId, {
      targetId,
      row: String(row.id),
      amountMinor: Number(row.amountMinor ?? 0) || 0,
      since: String(row.since ?? ""),
    });
  };
  if (core.modules.has(LAW_REACH_HOST_ID))
    for (const row of api
      .moduleState(LAW_REACH_HOST_ID)
      .table(LAW_APPLIED_TABLE)
      .rows() as unknown as LawAppliedRow[])
      if (row.key === key)
        add(row as unknown as Record<string, unknown>, row.targetId);
  if (core.modules.has(REACH_A_MODULE_ID))
    for (const row of api
      .moduleState(REACH_A_MODULE_ID)
      .table("reach")
      .rows() as unknown as Record<string, unknown>[])
      if (row.key === key) add(row, row.targetId);
  if (core.modules.has(REACH_B_MODULE_ID)) {
    const b = api.moduleState(REACH_B_MODULE_ID);
    // Its group rows count a place's counted people, not a payee: skipped.
    for (const [table, field] of [
      ["people", "personId"],
      ["organizations", "organizationId"],
    ] as const)
      for (const row of b.table(table).rows() as unknown as Record<
        string,
        unknown
      >[])
        if (row.key === key) add(row, row[field]);
  }
  return [...out.values()].sort((a, b) => a.targetId.localeCompare(b.targetId));
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
  /** The budget line the change raised, as an act's move rows record theirs (a budget-line law's own line). */
  lines?: { governmentId: string; moves: Record<string, number> }[];
}

/**
 * The levels a law may be enacted at: the catalog's levels narrowed to those
 * that hold the power, read from the same series powers the legislature's
 * authority check reads (`beyondPower`: a "local" power is the city, county
 * and township). A catalog level with no power is dropped; when none is left,
 * the levels that hold the power are used. Null where nothing is recorded.
 */
const POWERS = legislaturePowers as unknown as {
  series: Record<string, { levels: string[] }>;
  questions: Record<string, { levels: string[] }>;
};
function enactingLevels(law: LawEntry): readonly string[] | null {
  const power = POWERS.questions[law.key] ?? POWERS.series[law.key];
  const catalog = law.catalog?.levels ?? null;
  if (!power) return catalog;
  const held = power.levels.flatMap((l) =>
    l === "local" ? ["city", "county", "township", "local"] : [l],
  );
  const both = (catalog ?? []).filter((l) => held.includes(l));
  return both.length ? both : held;
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

/**
 * Laws the checker enacts at a level other than the town's lowest: an
 * independent redistricting commission draws a state's lines (a town draws
 * only its own ward lines, and most towns have none).
 */
/**
 * `--at <level>` enacts every law of the run at that level: a law a town
 * cannot pass where it is drawn (a state's own minimum wage question, where
 * the state preempts local wages) is enacted where it can be. The general
 * rule is `laws-checker-enacts-where-no-power`.
 */
const AT = arg("at");
const ENACT_AT: Readonly<Record<string, readonly string[]>> = {
  "us-policy-positions:government-operations.independent-redistricting": [
    "state",
  ],
};

/**
 * Set a question yes or no. A repeal ends it at every level that says yes and
 * notes those levels in `repealed`; putting it back enacts it again at those
 * same levels (a state's own law stays a state's), else at the town's level.
 */
function setQuestion(
  api: CoreAPI,
  law: LawEntry,
  value: 0 | 1,
  tag: string,
  ids: Set<string>,
  repealed: { level: LawRowInput["level"]; jurisdiction: string }[] = [],
): string {
  const date = addDays(makeIsoDate(api.state.date), 1);
  const laws = api.moduleState(LAWS_MODULE_ID).table("laws");
  if (value === 1 && repealed.length) {
    for (const at of repealed)
      ids.add(
        enactLaw(api, {
          ...at,
          series: law.key,
          value: 1,
          effectiveDate: date,
          measureId: `law-wiring-${tag}`,
          citation: "Law-wiring check: enact",
        }).id,
      );
    return `enacted again at ${repealed.map((r) => r.level).join(", ")} effective ${date}`;
  }
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
      repealed.push({ level, jurisdiction });
    }
    return `repealed at ${levels.join(", ") || "no level"} effective ${date}`;
  }
  const at = townLevel(
    api,
    AT ? [AT] : (ENACT_AT[law.key] ?? enactingLevels(law)),
  );
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

/**
 * The questions a town's body may legislate on only where the state grants
 * home rule: their city cell in the powers catalog is unread or varies by
 * state, so the authority check reads the home-rule law (policy-authority.ts).
 */
const HOME_RULE_QUESTIONS = Object.entries(
  powerQuestions.questions as Record<
    string,
    { dial: string; levels: readonly string[]; gate?: unknown }
  >,
)
  .filter(([, row]) => {
    if (!row.levels.includes("city") || row.gate) return false;
    const dial = (
      powersCatalog.dials as unknown as {
        id: string;
        levels: Record<string, { may?: string; status?: string }>;
      }[]
    ).find((d) => d.id === row.dial);
    const cell = dial?.levels.city;
    return (
      cell?.may === "UNKNOWN" ||
      (cell?.may === "varies by state" && cell.status === "game-profile")
    );
  })
  .map(([question]) => question)
  .sort();

/**
 * What a council's bill drafts under each authority law, which the
 * legislature reads at drafting: a law amount the authority law lets it set,
 * or (home rule) the questions only home rule lets it answer.
 */
const DRAFTED_UNDER: Readonly<
  Record<string, (api: CoreAPI) => readonly Provision[]>
> = {
  "local-minimum-wage-authority": (api) => amountUnder(api, "minimum-wage"),
  "us-policy-positions:labor-workforce.local-minimum-wage-authority": (api) =>
    amountUnder(api, "minimum-wage"),
  "local-income-tax-authority": (api) => amountUnder(api, "income-tax"),
  "us-policy-positions:government-operations.broaden-local-authority": () =>
    HOME_RULE_QUESTIONS.map((question) => ({
      kind: "policy-question" as const,
      question,
      value: 1,
    })),
};

function amountUnder(api: CoreAPI, series: string): readonly Provision[] {
  const now = Number(lawInForce(api, series).value ?? 0);
  return [
    {
      kind: "law-amount",
      series,
      value: series === "minimum-wage" ? now + 100 : Math.max(1, now + 1),
      unit: series === "minimum-wage" ? "minor/hour" : "percent",
    },
  ];
}

function draftUnder(
  api: CoreAPI,
  provisions: (api: CoreAPI) => readonly Provision[],
): void {
  // The town's own body: a city council, or the township board where the
  // town has no city government.
  const council = townSeats(api).find(
    (s) =>
      (s.office.kind === "council" || s.office.kind === "township-board") &&
      s.holder?.personId,
  );
  if (!council) return;
  draftBill(api, {
    bodyOfficeId: council.office.id,
    sponsorId: council.holder!.personId!,
    provisions: provisions(api),
  });
}

/**
 * The amount a body first enacts for a series that starts at none (0), where
 * a token 1 would bind nobody: the public pay floor at the owner's own
 * what-if example, a $70,000 public pay base (docs/coordination/OWNER-DECISIONS.md,
 * "The economy must answer what if"; src/bench/data/dev-experiments.json).
 */
const FIRST_AMOUNT: Readonly<Record<string, number>> = {
  "public-pay-floor": 70_000,
};

/**
 * Amount series whose every starting row is 0 or 1: a grant or a yes-or-no
 * (a state granting localities an income tax). A body changes one by
 * switching it, not by raising it a tenth (1 to 2 would not be read as
 * granted).
 */
const SWITCH_SERIES: ReadonlySet<string> = (() => {
  const values = new Map<string, boolean>();
  for (const rows of Object.values(
    (
      startingLawData as unknown as {
        jurisdictions: Record<string, { series: string; value: number }[]>;
      }
    ).jurisdictions,
  ))
    for (const row of rows)
      values.set(
        row.series,
        (values.get(row.series) ?? true) &&
          (row.value === 0 || row.value === 1),
      );
  // A series with a first amount of its own (the public pay floor, in dollars)
  // is an amount that happens to start at 0, not a switch.
  return new Set(
    [...values]
      .filter(([k, only01]) => only01 && !(k in FIRST_AMOUNT))
      .map(([k]) => k),
  );
})();

function changeAmount(
  api: CoreAPI,
  law: LawEntry,
  tag: string,
  ids: Set<string>,
): Change {
  const series = law.series!;
  const now = lawInForce(api, series);
  const governing = now.governing as LawRowInput | null | undefined;
  // The governing row can be another series lifted into a level's slot (the
  // state's average local sales tax stands in for a place with no local row):
  // the change is then made to the most local row of the law's own series.
  const g =
    governing && governing.series !== series
      ? (["city", "county", "state", "federal"] as const)
          .map(
            (level) =>
              now.levels.find(
                (l) => l.level === level && l.row?.series === series,
              )?.row,
          )
          .find((row) => row)
      : governing;
  const at = g
    ? { level: g.level, jurisdiction: g.jurisdiction }
    : townLevel(api, AT ? [AT] : enactingLevels(law));
  if (!at)
    return {
      lawIds: ids,
      how: "no governing row and no level may set it",
      undo: () => {},
    };
  // The governing row's own amount: the change is written at its level, and
  // the law in force can be several levels' sum (a federal and a state tax).
  const old = Number(g?.value ?? now.value ?? 0);
  const switched = SWITCH_SERIES.has(series);
  const next = switched
    ? old === 1
      ? 0
      : 1
    : old > 0
      ? Number.isInteger(old)
        ? Math.max(old + 1, Math.round(old * 1.1))
        : Math.round(old * 1.1 * 100) / 100
      : (FIRST_AMOUNT[series] ?? 1);
  const date = addDays(makeIsoDate(api.state.date), 1);
  const row = enactLaw(api, {
    ...at,
    series,
    value: next,
    effectiveDate: date,
    measureId: `law-wiring-${tag}`,
    citation: switched
      ? "Law-wiring check: grant switched"
      : "Law-wiring check: amount raised a tenth",
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
    // As a passed budget bill's change does, it carries into later years.
    carry: true,
  });
  ids.add(`law-wiring-${tag}`);
  return {
    lawIds: ids,
    how: row
      ? `${gov.id} ${line} ${base} -> ${base + delta} by law-wiring-${tag}`
      : `${gov.id} has no budget this year`,
    ...(row
      ? { lines: [{ governmentId: gov.id, moves: { [line]: delta } }] }
      : {}),
    undo: () => {
      amendBudget(api, {
        governmentId: gov.id,
        line,
        deltaMinor: -delta,
        measureId: `law-wiring-${tag}-undo`,
        carry: true,
      });
    },
  };
}

/** The lines an act moved, as its move rows record them (the treasury pays the lines as amended). */
function moveRowsOf(core: CoreState, key: string) {
  if (!core.modules.has(REACH_B_MODULE_ID)) return [];
  return (
    coreAPI(core)
      .moduleState(REACH_B_MODULE_ID)
      .table("taken")
      .rows() as unknown as {
      id: string;
      key?: string;
      governmentId?: string;
      moves?: Record<string, number>;
      undone?: boolean;
    }[]
  )
    .filter((r) => r.key === key && r.id.startsWith("move|") && r.moves)
    .map((r) => ({ governmentId: r.governmentId!, moves: { ...r.moves } }));
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
  /** The law causes the web read in the control world, by month row and link. */
  cause: Map<string, number>;
  /** Each law's reach in the control window, where nothing changed it, at its widest step. */
  reach: Map<string, ReachCount>;
  /** Posts citing each law's key in the control world, where a law in force at the opening stays in force. */
  cited: Map<string, { gross: number; ids: string[] }>;
  /** The treasuries' payments on budget lines in the control window. */
  treasury: Map<string, { gross: number; ids: string[] }>;
  /** Every posting in the control window, by account. */
  byAccount: Map<string, Posting[]>;
  /** Whom each law in force reached in the control world (a repeal stops their money). */
  targets: Map<string, Reached[]>;
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
  // What a law already in force pays here is the money its repeal stops.
  citeTokens = laws.map((l) => l.key);
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
  // Each law's reach where nothing changed it, at its widest step of the
  // window: over a long window a body in play may change a law already in
  // force, and the people it reached until then still count.
  const reach = new Map<string, ReachCount>();
  trace.on = true;
  for (let left = 1 + WINDOW; left > 0;) {
    const d = Math.min(28, left);
    step(w.core, d);
    left -= d;
    for (const law of laws) {
      const now = reachOf(w.core, law.key, null);
      if (now.open > (reach.get(law.key)?.open ?? -1)) reach.set(law.key, now);
    }
  }
  trace.on = false;
  const money = snapshotMoney();
  const reads = trace.reads;
  const cited = new Map(trace.cited);
  const treasury = new Map(trace.treasury);
  const byAccount = trace.byAccount;
  const targets = new Map(
    laws.map((l) => [l.key, reachedTargets(w.core, l.key, null)] as const),
  );
  const placeId = lawChain(coreAPI(w.core)).townPlaceId;
  const web = new Map<string, number>();
  for (const law of laws)
    for (const l of webLinksOf(law))
      for (const e of webEffects(w.core, placeId, [l.key], "0000"))
        web.set(`${e.id}|${e.link}`, e.effect);
  const cause = new Map<string, number>();
  for (const law of laws)
    for (const c of webCauses(w.core, placeId, [law]))
      cause.set(`${c.id}|${c.link.key}`, c.value);
  return {
    money,
    reads,
    web,
    cause,
    reach,
    cited,
    treasury,
    byAccount,
    targets,
  };
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

  const opening =
    law.kind === "question" ? yesLevels(api, law.key).length > 0 : false;
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
  const drafts = DRAFTED_UNDER[law.key];
  if (drafts && opening) {
    // An authority law in force at the opening is read when a body drafts
    // under it: a council member drafts one before it is repealed.
    trace.on = true;
    draftUnder(api, drafts);
    trace.on = false;
  }
  // A law in force at the opening reaches whom the engines apply it to as
  // they act: its reach is the opening day's or what the control world
  // (nothing changed) shows at the end of the window, whichever is more (a
  // body in play may repeal it during a long window).
  const dayOne = reachOf(core, law.key, null);
  const controlled = control.reach.get(law.key);
  const openingReach =
    opening && controlled && controlled.open > dayOne.open
      ? controlled
      : dayOne;
  let how: string;
  let undo: () => void;
  let raised: NonNullable<Change["lines"]> = [];
  if (law.kind === "question") {
    const repealed: { level: LawRowInput["level"]; jurisdiction: string }[] =
      [];
    how = setQuestion(api, law, opening ? 0 : 1, tag, ids, repealed);
    undo = () => {
      how += `; then ${setQuestion(api, law, opening ? 1 : 0, `${tag}-b`, ids, repealed)}`;
    };
  } else if (law.kind === "budget-line") {
    const c = changeBudget(api, law, tag, ids);
    how = c.how;
    undo = c.undo;
    raised = c.lines ?? [];
  } else {
    const c = changeAmount(api, law, tag, ids);
    how = c.how;
    undo = c.undo;
  }
  citeTokens = [...ids, law.key, `law-wiring-${tag}`];
  const since = core.date;
  const heardInWindow = { people: new Set<string>(), sample: [] as string[] };
  // A repeal is measured on the window's last day (its reach must be gone);
  // an enactment by whom it reached at any step of the window.
  const peak = opening ? undefined : { reach: null as ReachCount | null };
  let earlyMoves: ReturnType<typeof moveRowsOf> | undefined;
  trace.on = true;
  if (drafts) {
    // An authority law is read when a body drafts a bill under it: once the
    // change has taken effect, a council member drafts one.
    stepHearing(core, 2, heardInWindow, ids, law.key, since, peak);
    draftUnder(api, drafts);
    stepHearing(core, WINDOW - 1, heardInWindow, ids, law.key, since, peak);
  } else {
    // The first month, then the rest: the move rows are read after the first
    // month, before a body in play can change the act and the rows with it.
    const first = Math.min(28, 1 + WINDOW);
    stepHearing(core, first, heardInWindow, ids, law.key, since, peak);
    earlyMoves = moveRowsOf(core, law.key);
    stepHearing(
      core,
      1 + WINDOW - first,
      heardInWindow,
      ids,
      law.key,
      since,
      peak,
    );
  }
  trace.on = false;
  const money = snapshotMoney();
  const reads = trace.reads.get(law.key) ?? new Map();
  const controlReads = control.reads.get(law.key) ?? new Map();
  // Only reach under the rows the checker changed (or repealed) counts: a body in
  // play may enact the law again during a long window, and its rows are its own.
  // Once a body's own row takes over, the people the change reached cite that
  // row, so an enactment's reach is its widest step in the window.
  const reachAtEnd = reachOf(core, law.key, ids);
  const subjects = SUBJECTS[law.key]?.(core, since);
  const applied = appliedAmounts(core, law.key, opening ? null : ids);
  // The law's own payments to whom it reached, against the control world.
  const own = ownPayments(
    (id) => core.households.get(id)?.memberIds ?? [],
    opening
      ? (control.targets.get(law.key) ?? [])
      : reachedTargets(core, law.key, ids),
    trace.byAccount,
    control.byAccount,
    opening,
    since,
    law.key,
  );
  const reach =
    peak?.reach && peak.reach.open > reachAtEnd.open ? peak.reach : reachAtEnd;
  // Law rows a body in play (not the checker) put in force on the series in the window.
  const inPlay = lawChain(api)
    .levels.flatMap(
      ({ jurisdiction }) =>
        api
          .moduleState(LAWS_MODULE_ID)
          .table("laws")
          .query("bySeries", [
            jurisdiction,
            law.key,
          ]) as unknown as LawRowInput[],
    )
    .filter((r) => r.effectiveDate > since && !ids.has(r.id))
    .map((r) => ({
      id: r.id,
      level: r.level,
      effectiveDate: r.effectiveDate,
      value: Number(r.value),
    }));
  const links = webLinksOf(law);
  const treated = webEffects(
    core,
    placeId,
    links.map((l) => l.key),
    since,
  );
  const web = treated.filter(
    (e) => control.web.get(`${e.id}|${e.link}`) !== e.effect,
  );
  // A link the change brought to zero moved too: the control month holds an
  // effect the treated month no longer does (months after the change only).
  const kept = new Set(treated.map((e) => `${e.id}|${e.link}`));
  const linkKeys = new Set(links.map((l) => l.key));
  for (const [k, effect] of control.web) {
    const cut = k.lastIndexOf("|");
    const id = k.slice(0, cut);
    const link = k.slice(cut + 1);
    const month = /(\d{4}-\d{2})$/.exec(id)?.[1];
    if (
      linkKeys.has(link) &&
      !kept.has(k) &&
      month !== undefined &&
      month > since.slice(0, 7) &&
      effect !== 0
    )
      web.push({ id, link, effect: 0 });
  }
  // The law cause the web read differently from the control world, per link
  // (what a link whose lag outlasts this window can show of itself).
  const cause = webCauses(core, placeId, [law])
    .filter((c) => c.date >= since)
    .flatMap((c) => {
      const held = control.cause.get(`${c.id}|${c.link.key}`);
      return held !== undefined && held !== c.value
        ? [
            {
              id: c.id,
              month: c.id.slice(-"YYYY-MM".length),
              link: c.link.key,
              from: c.link.from,
              lagMonths: c.link.lagMonths,
              treated: c.value,
              control: held,
            },
          ]
        : [];
    });
  // The law row a body (not the checker) put the law back with in the window:
  // a cause the world itself reversed did not last the lag.
  const reenacted =
    cause.length > 0
      ? ([...inPlay].sort(
          (a, b) =>
            a.effectiveDate.localeCompare(b.effectiveDate) ||
            a.id.localeCompare(b.id),
        )[0] ?? null)
      : null;
  const heard = {
    people: heardInWindow.people.size,
    sample: heardInWindow.sample,
  };
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
  // `control` is what the control world paid citing the same key, to set an
  // amount law's payment (at the changed rate) beside the one it replaced.
  const cited = [...trace.cited.entries()].map(([token, v]) => ({
    token,
    ...v,
    ...(control.cited.has(token)
      ? { control: control.cited.get(token)!.gross }
      : {}),
  }));
  // An act that moves budget lines is paid by the treasury on those lines: the
  // lines its own move rows name, and what the treasury paid on each here and
  // in the control world, up to the day a body in play first changed the act
  // (no rows: the law is not one that moves a line). A budget-line law is the
  // same with its own line, the one the checker raised: the treasury pays the
  // line's workers and contractors through the town's outside market, which no
  // person's or organization's account shows, so its payments are followed by
  // the line their payment ids name.
  const moveRows = [...(earlyMoves ?? moveRowsOf(core, law.key)), ...raised];
  const changedByBodyOn = inPlay.map((r) => r.effectiveDate).sort()[0] ?? null;
  const lines = moveRows.length
    ? moveRows.flatMap((row) =>
        Object.entries(row.moves)
          .filter(([, moved]) => moved !== 0)
          .map(([line, moved]) => {
            const here = lineMoney(
              trace.treasury,
              row.governmentId,
              line,
              changedByBodyOn,
            );
            const there = lineMoney(
              control.treasury,
              row.governmentId,
              line,
              changedByBodyOn,
            );
            return {
              government: row.governmentId,
              line,
              moved,
              treatment: here.gross,
              control: there.gross,
              ...(changedByBodyOn ? { before: changedByBodyOn } : {}),
              ids: here.ids.length ? here.ids : there.ids,
            };
          }),
      )
    : undefined;
  // Money a file that read this law posted differently from the control. A
  // law-reach file counts only where it read this law: law reach holds every
  // law's handlers, and another law's handler can post differently in this
  // run. The day loop is no engine: a read or a post it is named for came from
  // the laws engine's own calendar or the accounts engine's scheduled
  // obligations, which every law's run shares.
  const readerFiles = new Set(
    [...reads.keys(), ...controlReads.keys()].map((f) =>
      f.split(" <- ")[0]!.replace(/:\d+$/, ""),
    ),
  );
  const direct = moneyDiff.filter((d) => {
    const file =
      d.kind.split(" @ ")[1]?.split(" <- ")[0]!.replace(/:\d+$/, "") ?? "";
    return file !== DAY_LOOP && readerFiles.has(file);
  });
  // A law in force at the opening stays in force in the control world: what
  // it paid there, citing its key, is the money its repeal stopped.
  const controlCited = opening
    ? [...control.cited.entries()]
        .filter(([token]) => token === law.key)
        .map(([token, v]) => ({ token, ...v }))
    : [];

  // Repeal (or re-enact) and see whether reach ends (or returns).
  const changedIds = new Set(ids);
  undo();
  if (drafts && opening) {
    // Put back in force, it is read again at the next bill drafted under it.
    step(core, 2);
    draftUnder(api, drafts);
    step(core, AFTER - 2);
  } else step(core, AFTER);
  const after = reachOf(core, law.key, null);
  // An amount or a budget line is never repealed, only put back: what must stop is the changed row's own reach.
  const afterUndoChanged = reachOf(core, law.key, changedIds);
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
    reachAtEnd,
    inPlay,
    ...(subjects ? { subjects } : {}),
    applied,
    readers: Object.fromEntries([...readers].sort((a, b) => b[1] - a[1])),
    openingRow,
    money: {
      direct,
      diff: moneyDiff.slice(0, 12),
      diffKinds: moneyDiff.length,
      cited,
      controlCited,
      ...(lines ? { lines } : {}),
      own,
    },
    web: {
      links: links.map((l) => ({ key: l.key, status: l.status, to: l.to })),
      fired: web.slice(0, 12),
      firedCount: web.length,
      windowDays: WINDOW,
      cause: cause.slice(0, 12),
      reenacted,
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
  const results: {
    key: string;
    kind?: string;
    family?: string;
    error?: string;
  }[] = existsSync(out)
    ? (
        JSON.parse(readFileSync(out, "utf8")) as {
          results: {
            key: string;
            kind?: string;
            family?: string;
            error?: string;
          }[];
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
