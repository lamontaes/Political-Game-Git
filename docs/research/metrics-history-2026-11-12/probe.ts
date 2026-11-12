/**
 * Research probe (Metrics researcher, Nov 12, 2026): plays the bench world a
 * year at a time and after each December writes every measure a Metrics tab
 * could show, read from the records, plus every table's row count and the
 * dates it spans. Development tooling; not game code.
 *
 *   node --max-old-space-size=8000 --expose-gc --import tsx \
 *     docs/research/metrics-history-2026-11-12/probe.ts --seed <s> --years 5 --out <dir>
 */
import { randomBytes } from "node:crypto";
import { mkdirSync, writeFileSync, appendFileSync } from "node:fs";
import { buildBenchWorld } from "../../../src/bench/world";
import { setBookkeeping } from "../../../src/core2/bookkeeping";
import { gameStartDate } from "../../../src/core2/game-start";
import { makeIsoDate } from "../../../src/core2/kernel/dates";
import { advanceCore } from "../../../src/core2/life";
import { coreAPI } from "../../../src/core2/state";
import { drawPlace } from "../../../scripts/core2-year/place";
import { metricsView } from "../../../src/bench/metrics";
import { budgetView } from "../../../src/bench/budget";
import { macroMonths } from "../../../src/director/opening-story";
import { regionOfPlace } from "../../../src/core2/modules/regional";
import {
  stateFigures,
  type RegionMonth,
} from "../../../src/core2/regional-model";
import {
  townJobsPanel,
  buildingPanel,
} from "../../../src/core2/modules/world-panels";
import {
  countryStateNow,
  countryStates,
} from "../../../src/core2/modules/macro";
import { residentsRuntime } from "../../../src/core2/modules/residents";
import { worldRecords } from "../../../src/core2/snapshot";
import type { CoreState } from "../../../src/core2/types";

const SEEN = ["almont-michigan", "benndale-mississippi", "south-barre-vermont"];
const args = process.argv.slice(2);
const opt = (n: string, f: string) => {
  const i = args.indexOf(`--${n}`);
  return i >= 0 ? args[i + 1]! : f;
};
const seed = opt("seed", randomBytes(8).toString("hex"));
const years = Number(opt("years", "5"));
const out = opt("out", "test-results/metrics-probe");
const stopAfterDays = Number(opt("days", "0"));
mkdirSync(out, { recursive: true });

const drawn = drawPlace(
  seed,
  "metrics-history",
  (key) => !SEEN.some((s) => key.includes(s)),
);
const log = (s: string) =>
  process.stderr.write(`${new Date().toISOString()} ${s}\n`);
log(
  `place ${drawn.name} key ${drawn.key} state ${drawn.state} world seed ${drawn.seed} run seed ${seed}`,
);
setBookkeeping(false);
const world = buildBenchWorld(drawn.seed, gameStartDate(), {
  twoLevel: true,
  placeKey: drawn.key,
});
const core = world.core as CoreState;
const api = coreAPI(core);
const playerId = core.playerId as string;
const placeId = core.people.get(playerId as never)?.placeId as string;
log(`start ${core.date} player ${playerId} place ${placeId}`);
writeFileSync(
  `${out}/game.json`,
  JSON.stringify(
    { seed, ...drawn, placeId, playerId, start: core.date },
    null,
    1,
  ),
);

const DATE_KEYS = [
  "month",
  "date",
  "fiscalYear",
  "year",
  "at",
  "noticeAt",
  "openedAt",
  "recordedAt",
  "day",
  "asOf",
];
function inventory() {
  const recs = worldRecords(core);
  const result: Record<
    string,
    {
      rows: number;
      field?: string;
      first?: string;
      last?: string;
      town?: number;
    }
  > = {};
  const scan = (name: string, rows: readonly Record<string, unknown>[]) => {
    let field: string | undefined;
    let first: string | undefined,
      last: string | undefined,
      town = 0;
    for (const row of rows) {
      if (!row || typeof row !== "object") continue;
      if (row.placeId === placeId) town++;
      const key =
        field ??
        DATE_KEYS.find(
          (k) => row[k] !== undefined && /^\d{4}/.test(String(row[k])),
        );
      if (!key) continue;
      field = key;
      const v = String(row[key]);
      if (!first || v < first) first = v;
      if (!last || v > last) last = v;
    }
    result[name] = { rows: rows.length, field, first, last, town };
  };
  for (const [moduleId, store] of recs.modules)
    for (const name of Object.keys(
      core.modules.get(moduleId)?.state?.tables ?? {},
    ))
      scan(`${moduleId}.${name}`, store.table(name).rows() as never);
  for (const [field, value] of Object.entries(recs.core)) {
    if (value instanceof Map)
      scan(`core.${field}`, [...value.values()] as never);
    else if (Array.isArray(value)) scan(`core.${field}`, value as never);
  }
  return result;
}

function rows(moduleId: string, table: string): Record<string, unknown>[] {
  return core.modules.has(moduleId)
    ? (api.moduleState(moduleId).table(table).rows() as never)
    : [];
}

function population() {
  let named = 0;
  for (const p of core.people.values())
    if (p.placeId === placeId && (p as { alive?: boolean }).alive !== false)
      named++;
  let households = 0;
  for (const h of core.households.values())
    if (h.placeId === placeId) households++;
  const rt = residentsRuntime(core);
  let countedHouseholds = 0,
    countedPeople = 0;
  for (const h of rt?.store.liveHouseholds() ?? [])
    if (h.placeId === placeId) {
      countedHouseholds++;
      countedPeople += rt!.store.weightedCount(h);
    }
  return {
    namedPeople: named,
    namedHouseholds: households,
    countedHouseholds,
    countedPeople: Math.round(countedPeople),
  };
}

const TOWN_TABLES = [
  "core2-crime-v1.months",
  "core2-public-safety-v1.months",
  "core2-school-days-v1.measures",
  "core2-school-days-v1.results",
  "core2-school-days-v1.groups",
  "core2-homeless-count-v1.counts",
  "climate.months",
  "grievance.counts",
  "core2-resting-stress-v1.months",
  "national-opinion.approval",
  "jobs.claims",
  "housing.stock",
  "housing.cases",
  "core2-renewal-v1.births",
  "core2-counted-moves-v1.moves",
  "core2-coverage-v1.countedCoverage",
  "core2-coverage-v1.coverage",
  "core2-budgets-v1.townRevenue",
  "core2-budgets-v1.treasuryMonths",
  "core2-budgets-v1.budgets",
  "macro.countryParts",
  "macro.country",
  "core2-justice-v1.cases",
  "credit.books",
  "core2-public-action-v1.mobilization",
  "jobs.regional",
  "jobs.turnover",
  "core2-budgets-v1.serviceChargeMonths",
  "core2-budgets-v1.federalDebt",
  "core2-budgets-v1.creditMarks",
];
function townTables() {
  const outT: Record<
    string,
    { count: number; townCount: number; dates: string[]; sample: unknown[] }
  > = {};
  for (const name of TOWN_TABLES) {
    const [m, t] = [
      name.slice(0, name.lastIndexOf(".")),
      name.slice(name.lastIndexOf(".") + 1),
    ];
    let all: Record<string, unknown>[] = [];
    try {
      all = rows(m, t);
    } catch {
      continue;
    }
    const town = all.filter(
      (r) => r.placeId === placeId || String(r.id ?? "").includes(placeId),
    );
    const use = town.length ? town : all;
    const dk = DATE_KEYS.find((k) => use.some((r) => r[k] !== undefined));
    const sorted = dk
      ? [...use].sort((a, b) => String(a[dk]).localeCompare(String(b[dk])))
      : use;
    outT[name] = {
      count: all.length,
      townCount: town.length,
      dates: dk ? [...new Set(sorted.map((r) => String(r[dk])))] : [],
      sample: sorted.slice(-3),
    };
  }
  return outT;
}

function countryTier(fips: string | undefined) {
  try {
    const own = fips ? countryStateNow(api, fips) : undefined;
    let people = 0;
    for (const st of countryStates(api)) {
      const f = countryStateNow(api, (st as unknown as { fips: string }).fips);
      if (f) people += f.now.population;
    }
    const debt = rows("core2-budgets-v1", "federalDebt").reduce(
      (n, r) => n + Number(r.balanceMinor ?? 0),
      0,
    );
    return {
      state: own && { ...own.now, base: undefined },
      statePopulationAtOpening:
        own && (own.base as unknown as { population?: number }).population,
      countryPeople: people,
      federalDebtMinor: debt,
    };
  } catch (e) {
    return { error: String(e) };
  }
}

function yearEvents() {
  const byYear = (list: string[]) => {
    const o: Record<string, number> = {};
    for (const d of list) o[d.slice(0, 4)] = (o[d.slice(0, 4)] ?? 0) + 1;
    return o;
  };
  const births = rows("core2-renewal-v1", "births")
    .filter((r) => r.placeId === placeId)
    .map((r) => String(r.date));
  const moves = rows("core2-counted-moves-v1", "moves");
  const movesIn = moves
    .filter((r) => r.toPlace === placeId && r.fromPlace !== placeId)
    .map((r) => String(r.date));
  const movesOut = moves
    .filter((r) => r.fromPlace === placeId && r.toPlace !== placeId)
    .map((r) => String(r.date));
  let dead = 0;
  for (const p of core.people.values())
    if (p.placeId === placeId && (p as { alive?: boolean }).alive === false)
      dead++;
  return {
    births: byYear(births),
    movesIn: byYear(movesIn),
    movesOut: byYear(movesOut),
    namedDeadSoFar: dead,
  };
}

function snapshot(year: number) {
  const months = macroMonths(core);
  const regionId = regionOfPlace(placeId);
  const regMonths = rows("regional", "months") as unknown as RegionMonth[];
  const latestMonth = regMonths
    .map((r) => (r as unknown as { month: string }).month)
    .sort()
    .at(-1);
  const fips = regMonths.find((r) => r.regionId === regionId)?.stateFips;
  const stateNow =
    fips && latestMonth
      ? stateFigures(
          regMonths.filter(
            (r) => (r as unknown as { month: string }).month === latestMonth,
          ),
          fips,
        )
      : null;
  const wm = rows("world-metrics", "months")
    .filter((r) => r.placeId === placeId)
    .sort((a, b) => String(a.date).localeCompare(String(b.date)));
  const web = rows("core2-outcome-web-v1", "months")
    .filter((r) => r.placeId === placeId)
    .sort((a, b) => String(a.month).localeCompare(String(b.month)));
  let budgets: unknown = null;
  try {
    budgets = budgetView(core, playerId).governments.map((g) => ({
      id: g.id,
      level: g.level,
      name: g.name,
      latest: g.latest && {
        fiscalYear: (g.latest as { fiscalYear?: number }).fiscalYear,
        revenueMinor: g.latest.revenueMinor,
        spendingMinor: g.latest.spendingMinor,
      },
      prior: g.prior && {
        fiscalYear: (g.prior as { fiscalYear?: number }).fiscalYear,
        revenueMinor: g.prior.revenueMinor,
        spendingMinor: g.prior.spendingMinor,
      },
    }));
  } catch (e) {
    budgets = { error: String(e) };
  }
  let view: unknown = null;
  try {
    view = metricsView(core, placeId, playerId);
  } catch (e) {
    view = { error: String(e) };
  }
  let jobs: unknown = null;
  try {
    jobs = townJobsPanel(api, placeId);
  } catch (e) {
    jobs = { error: String(e) };
  }
  let stock: unknown = null;
  try {
    stock = buildingPanel(api).stock.find(
      (r: { placeId: string }) => r.placeId === placeId,
    );
  } catch (e) {
    stock = { error: String(e) };
  }
  return {
    year,
    date: core.date,
    macroNow: months?.now,
    macroBefore: months?.before,
    macroMonthsKept: rows("macro", "months")
      .map((r) => r.month)
      .sort(),
    regional: {
      regionId,
      fips,
      latestMonth,
      stateNow,
      monthsKept: [
        ...new Set(
          regMonths.map((r) => (r as unknown as { month: string }).month),
        ),
      ].sort(),
    },
    worldMetricsLatest: wm.at(-1),
    worldMetricsDatesKept: wm.map((r) => r.date),
    worldMetricsDecember: wm.filter((r) => String(r.date).slice(5, 7) === "12"),
    webLatest: web.at(-1) && {
      month: web.at(-1)!.month,
      values: web.at(-1)!.values,
      engineSources: web.at(-1)!.engineSources,
    },
    webMonthsKept: web.map((r) => r.month),
    budgets,
    view,
    jobs,
    stock,
    population: population(),
    townTables: townTables(),
    yearEvents: yearEvents(),
    countryTier: countryTier(fips),
    tables: inventory(),
  };
}

const start = Number(core.date.slice(0, 4));
if (stopAfterDays) {
  advanceCore(
    core,
    makeIsoDate(
      new Date(Date.parse(core.date) + stopAfterDays * 864e5)
        .toISOString()
        .slice(0, 10),
    ),
  );
  writeFileSync(
    `${out}/probe-short.json`,
    JSON.stringify(snapshot(0), null, 1),
  );
  log(`short probe done ${core.date}`);
  process.exit(0);
}
for (let y = 0; y < years; y++) {
  const target = makeIsoDate(`${start + y}-12-31`);
  const t = Date.now();
  advanceCore(core, target);
  (globalThis as { gc?: () => void }).gc?.();
  const snap = snapshot(start + y);
  writeFileSync(`${out}/year-${start + y}.json`, JSON.stringify(snap));
  appendFileSync(
    `${out}/progress.log`,
    `year ${start + y} done ${core.date} in ${Math.round((Date.now() - t) / 1000)}s heap ${Math.round(process.memoryUsage().heapUsed / 1048576)}MB\n`,
  );
  log(
    `year ${start + y} done ${core.date} in ${Math.round((Date.now() - t) / 1000)}s`,
  );
}
log("ALL DONE");
