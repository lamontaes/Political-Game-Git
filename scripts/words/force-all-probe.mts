/**
 * Which situation types a cause record written through the game's own event entry stages, for the
 * force-all dev control. Each type is tried in turn on one built world, warmed as the New game route
 * warms it (OPENING_WARMUP_DAYS): the record dev mode's force writes (src/bench/dev-force-event.ts,
 * naming the player from the cause's own `causeFacts`) is written, a day passes, and the player's new
 * moments are read for a cause the type matches and a scene bound to the type. The map keeps only
 * how a type is forced, never a person of the world it was measured in. A type whose cause an
 * engine's own function brings about (`OWN_RECIPES`) gets no row: dev mode forces it that way.
 * The legislature's types are forced last, through its own writers (src/bench/dev-force-legislature.ts),
 * since a recipe may seat the player; the ones no recipe can force keep their reason.
 * Run: SEED=<seed> node --import tsx scripts/words/force-all-probe.mts
 * `--write-map` writes the map; with `--legislature-only` only the legislature's rows are measured and
 * rewritten, and every other row stays as the last full run wrote it.
 */
import { readFileSync, writeFileSync } from "node:fs";
import { setBookkeeping } from "../../src/core2/bookkeeping";
import { gameStartDate } from "../../src/core2/game-start";
import { applyCoreEvent } from "../../src/core2/state";
import type { PersonId } from "../../src/core2/types";
import { addDays, makeIsoDate } from "../../src/core2/kernel/dates";
import { buildBenchWorld, OPENING_WARMUP_DAYS } from "../../src/bench/world";
import { DevMode } from "../../src/bench/dev-mode";
import {
  forceCause,
  forceEvent,
  OWN_RECIPES,
} from "../../src/bench/dev-force-event";
import {
  forceLegislatureScene,
  LEGISLATURE_REASONS,
  LEGISLATURE_SCENES,
} from "../../src/bench/dev-force-legislature";
import { SITUATION_LIBRARY, causeMatches } from "../../src/director/scheduling";

setBookkeeping(false);
const world = buildBenchWorld(process.env.SEED ?? "8341-pin", gameStartDate(), {
  twoLevel: true,
  warmUpDays: OPENING_WARMUP_DAYS,
  ...(process.env.PLACE ? { placeKey: process.env.PLACE } : {}),
});
const { core, director } = world;
const playerId = world.playerId as PersonId;
director.watch(core, playerId);
const mode = new DevMode(core, director, undefined, world.placeId);
const recipes = new Map(mode.scenes().map((row) => [row.key, row.recipe]));
const rows: string[] = [];
const map: Record<
  string,
  {
    how: "event" | "writer" | "legislature";
    reason?: string;
    recipe?: string;
  }
> = {};
let staged = 0;
let matched = 0;
let n = 0;
const MAP_URL = new URL(
  "../../src/bench/dev-views/scene-force-map.json",
  import.meta.url,
);
const legislatureOnly = process.argv.includes("--legislature-only");
if (legislatureOnly)
  Object.assign(
    map,
    (JSON.parse(readFileSync(MAP_URL, "utf8")) as { types: typeof map }).types,
  );
for (const type of legislatureOnly ? [] : SITUATION_LIBRARY.types) {
  n++;
  if (LEGISLATURE_SCENES[type.key] || LEGISLATURE_REASONS[type.key]) continue;
  if (OWN_RECIPES.includes(recipes.get(type.key) ?? "")) {
    rows.push(`${type.key}\town recipe ${recipes.get(type.key)}`);
    continue;
  }
  const found = forceCause(type);
  if (!found) {
    rows.push(`${type.key}\tno-cause`);
    map[type.key] = { how: "writer", reason: "no-cause" };
    continue;
  }
  const { kind } = found;
  if (!kind) {
    rows.push(`${type.key}\tno-kind`);
    map[type.key] = { how: "writer", reason: "circumstance" };
    continue;
  }
  const book = director.ledger.people.get(playerId)!;
  const before = book.moments.length;
  const scheduled = book.schedule.length;
  const id = `force-probe:${type.key}`;
  try {
    applyCoreEvent(
      core,
      forceEvent(core, type, playerId, id, "force-all probe") as never,
    );
    mode.advance(addDays(makeIsoDate(core.date), 1));
  } catch (error) {
    rows.push(
      `${type.key}\tkind=${kind}\terror: ${(error as Error).message.slice(0, 80)}`,
    );
    map[type.key] = { how: "writer", reason: "no-event" };
    continue;
  }
  const fresh = book.moments.slice(before);
  const hit = fresh.some((m) =>
    type.causes.some((c) => causeMatches(c, book, m, core)),
  );
  const bound = book.schedule
    .slice(scheduled)
    .some((row) => row.bindings.some((b) => b.typeKey === type.key));
  if (hit) matched++;
  if (bound) staged++;
  const why = book.schedule
    .slice(scheduled)
    .filter(
      (row) =>
        fresh.some((m) => m.id === row.momentId) &&
        fresh.some(
          (m) =>
            m.id === row.momentId &&
            type.causes.some((c) => causeMatches(c, book, m, core)),
        ),
    )
    .map(
      (row) =>
        `${row.outcome}${row.heldBack?.length ? `[held ${row.heldBack.join("|")}]` : ""}`,
    );
  map[type.key] = bound
    ? { how: "event" }
    : { how: "writer", reason: hit ? "journal-line" : "circumstance" };
  rows.push(
    `${type.key}\tkind=${kind}\tmoments=${fresh.length}\tcause-matched=${hit}\tstaged=${bound}\t${[...new Set(why)].join(",")}`,
  );
}
for (const [key, reason] of Object.entries(LEGISLATURE_REASONS)) {
  rows.push(`${key}\tlegislature\treason=${reason}`);
  map[key] = { how: "writer", reason };
}
for (const [key, way] of Object.entries(LEGISLATURE_SCENES)) {
  const forced = forceLegislatureScene(mode, key);
  if (forced.staged) staged++;
  rows.push(
    `${key}\tlegislature:${way}\tstaged=${forced.staged}\t${forced.outcome ?? ""}\t${forced.causeRecords.join(",")}${forced.refused ? `\trefused=${forced.refused}` : ""}`,
  );
  // The recipe stands whatever this one world allowed: a refusal (no sitting this late in the
  // year, no seat in a territory's chamber) is said by the force itself, in the world it runs in.
  map[key] = { how: "legislature", recipe: way };
}
console.log(rows.join("\n"));
if (process.argv.includes("--write-map"))
  writeFileSync(
    MAP_URL,
    `${JSON.stringify(
      {
        about:
          "Written by scripts/words/force-all-probe.mts --write-map, never by hand: how each situation type can be forced from dev mode's scene view, measured at one built world.",
        types: Object.fromEntries(
          SITUATION_LIBRARY.types.flatMap((type) =>
            map[type.key] ? [[type.key, map[type.key]]] : [],
          ),
        ),
      },
      null,
      2,
    )}\n`,
  );
console.log(`\n${n} types: cause matched ${matched}, scene staged ${staged}`);
