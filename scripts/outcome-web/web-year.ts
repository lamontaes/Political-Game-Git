/**
 * One played year of the outcome web in a drawn place, for the effect-web
 * report's before and after: the played world (`buildBenchWorld`, two-level,
 * every module) through the dev clock, then which links moved, which engines
 * read them, how unevenly they land across people, the chains seen, and the
 * year's run time.
 *
 *   node --import tsx scripts/outcome-web/web-year.ts <seed> [--out file]
 */
import {
  existsSync,
  readdirSync,
  readFileSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { dirname, join } from "node:path";
import { performance } from "node:perf_hooks";
import { buildBenchWorld } from "../../src/bench/world";
import { DevMode } from "../../src/bench/dev-mode";
import { BenchPlayer } from "../../src/bench/player";
import { drawPlace } from "../core2-year/place";
import { gameStartDate } from "../../src/core2/game-start";
import { setBookkeeping } from "../../src/core2/bookkeeping";
import { addDays, makeIsoDate } from "../../src/core2/kernel/dates";
import { coreAPI } from "../../src/core2/state";
import {
  OUTCOME_WEB_MODULE_ID,
  type WebMonth,
} from "../../src/core2/modules/outcome-web";
import { derivedOf, WEB_LINKS } from "../../src/core2/outcome-web-model";

setBookkeeping(false);
const seed = process.argv[2] ?? "web-year";
const out = process.argv.includes("--out")
  ? process.argv[process.argv.indexOf("--out") + 1]!
  : null;
const place = drawPlace(seed, "effect-web-year");

/** Outcomes an engine outside the web reads through the web's accessors (as the matrix finds them). */
function engineRead(): Set<string> {
  const found = new Set<string>();
  const walk = (dir: string): string[] =>
    readdirSync(dir).flatMap((name) => {
      const path = join(dir, name);
      if (statSync(path).isDirectory())
        return name === "data" ? [] : walk(path);
      return /\.ts$/.test(name) && !/\.test\.ts$/.test(name) ? [path] : [];
    });
  for (const path of walk("src/core2")) {
    if (
      /outcome-web(-model)?\.ts$/.test(path) ||
      /electorate-inputs/.test(path)
    )
      continue;
    const own = readFileSync(path, "utf8");
    if (
      !/webReach|webFactorFor|outcomeWebFactor|placeOutcome|turnoutWeb|deathWebFactor/.test(
        own,
      )
    )
      continue;
    // An engine may name the measures it reads in a data file it imports.
    const text = [
      own,
      ...[...own.matchAll(/from "(\.[^"]+\.json)"/g)]
        .map((m) => join(dirname(path), m[1]!))
        .filter((file) => existsSync(file))
        .map((file) => readFileSync(file, "utf8")),
    ].join("\n");
    for (const m of text.matchAll(/"([a-z][a-z0-9-]*\.[a-z0-9.:-]+)"/g))
      found.add(m[1]!);
  }
  return found;
}

const started = performance.now();
const world = buildBenchWorld(seed, gameStartDate(), {
  twoLevel: true,
  placeKey: place.key,
});
const built = performance.now();
const core = world.core;
const dev = new DevMode(
  core,
  world.director,
  new BenchPlayer(core, world.director),
  world.placeId,
);
dev.advance(addDays(makeIsoDate(core.date), 365));
const played = performance.now();

const api = coreAPI(core);
const months = [
  ...(api
    .moduleState(OUTCOME_WEB_MODULE_ID)
    .table("months")
    .rows() as unknown as WebMonth[]),
].sort((a, b) => a.month.localeCompare(b.month));
const read = engineRead();
const moved = new Map<string, { months: number; maxAbs: number; to: string }>();
for (const row of months)
  for (const [key, effect] of Object.entries(row.effects)) {
    if (!effect) continue;
    const link = WEB_LINKS.find((l) => l.key === key)!;
    const held = moved.get(key) ?? { months: 0, maxAbs: 0, to: link.to };
    held.months += 1;
    held.maxAbs = Math.max(held.maxAbs, Math.abs(effect));
    moved.set(key, held);
  }
const reaching = [...moved].filter(([, v]) => read.has(v.to));
// A chain: a moving link into an outcome an engine reads, and a moving link out of it.
const chains: string[] = [];
for (const [a, va] of reaching)
  for (const [b] of moved) {
    const link = WEB_LINKS.find((l) => l.key === b)!;
    if ((derivedOf(link.from)?.measure ?? link.from) === va.to)
      chains.push(`${a} -> ${b}`);
  }
/** Engine records the web's reads produce, counted by module table. */
const ENGINE_TABLES: readonly [string, string][] = [
  ["core2-crime-v1", "months"],
  ["core2-crime-v1", "groups"],
  ["core2-school-days-v1", "results"],
  ["core2-school-days-v1", "groups"],
  ["core2-school-days-v1", "measures"],
  ["core2-renewal-v1", "counts"],
];
const engineRecords = Object.fromEntries(
  ENGINE_TABLES.filter(([id]) => core.modules.has(id)).map(([id, table]) => {
    try {
      return [`${id}/${table}`, api.moduleState(id).table(table).rows().length];
    } catch {
      return [`${id}/${table}`, null];
    }
  }),
);
/**
 * Chains through engine records: a moving link whose cause is a measure the
 * web reads from an engine (its engineSources cite a record id), where that
 * engine's measure is itself an outcome other links move.
 */
const last = months.at(-1);
const engineCauses = new Set(
  Object.entries(last?.engineSources ?? {})
    .filter(([, id]) => id)
    .map(([measure]) => measure),
);
const recordChains: string[] = [];
for (const [b] of moved) {
  const link = WEB_LINKS.find((l) => l.key === b)!;
  const cause = derivedOf(link.from)?.measure ?? link.from;
  if (!engineCauses.has(cause)) continue;
  const into = WEB_LINKS.filter((l) => l.to === cause).map((l) => l.key);
  recordChains.push(
    `${into.length ? `[${into.join(", ")}] -> ` : ""}${cause} (engine record ${last!.engineSources[cause]}) -> ${b} -> ${link.to}`,
  );
}
const result = {
  seed,
  place: `${place.name}, ${place.state} (${place.key})`,
  buildSeconds: Math.round((built - started) / 1000),
  yearSeconds: Math.round((played - built) / 1000),
  webMonths: months.length,
  linksMoving: moved.size,
  linksMovingAnEngineRead: reaching.length,
  reaching: Object.fromEntries(reaching.map(([k, v]) => [k, v])),
  chains,
  recordChains,
  engineRecords,
  recordKinds: Object.fromEntries(
    [...core.logByKind].map(([k, ids]) => [k, ids.size]).sort(),
  ),
};
console.log(
  JSON.stringify(
    {
      ...result,
      reaching: Object.keys(result.reaching),
      recordKinds: undefined,
    },
    null,
    2,
  ),
);
if (out) writeFileSync(out, `${JSON.stringify(result, null, 2)}\n`);
