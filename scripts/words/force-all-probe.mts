/**
 * Which situation types a cause record written through the game's own event entry stages, for the
 * force-all dev control. Each type is tried in turn on one built world: its first cause's record
 * kind is written naming the player (facts from the cause's own `causeFacts`), a day passes, and
 * the player's new moments are read for a cause the type matches and a scene bound to the type.
 * The campaigns' and the legislature's types are forced last, through their engines' own writers
 * (src/bench/dev-force-campaigns.ts, src/bench/dev-force-legislature.ts), since a recipe files or seats
 * the player; the ones no recipe can force keep their reason.
 * Run: SEED=<seed> node --import tsx scripts/words/force-all-probe.mts
 * `--write-map` writes the map; with `--elections-only`, `--campaigns-only` or `--legislature-only` only that engine's rows are measured and
 * rewritten, and every other row stays as the last full run wrote it.
 */
import { readFileSync, writeFileSync } from "node:fs";
import { setBookkeeping } from "../../src/core2/bookkeeping";
import { gameStartDate } from "../../src/core2/game-start";
import { applyCoreEvent } from "../../src/core2/state";
import type { PersonId } from "../../src/core2/types";
import { addDays, makeIsoDate } from "../../src/core2/kernel/dates";
import { buildBenchWorld } from "../../src/bench/world";
import { DevMode } from "../../src/bench/dev-mode";
import {
  ELECTIONS_REASONS,
  ELECTIONS_SCENES,
  forceElectionsScene,
} from "../../src/bench/dev-force-elections";
import {
  CAMPAIGNS_REASONS,
  CAMPAIGNS_SCENES,
  forceCampaignsScene,
} from "../../src/bench/dev-force-campaigns";
import {
  forceLegislatureScene,
  LEGISLATURE_REASONS,
  LEGISLATURE_SCENES,
} from "../../src/bench/dev-force-legislature";
import { SITUATION_LIBRARY, causeMatches } from "../../src/director/scheduling";

setBookkeeping(false);
const world = buildBenchWorld(process.env.SEED ?? "8341-pin", gameStartDate(), {
  twoLevel: true,
  ...(process.env.PLACE ? { placeKey: process.env.PLACE } : {}),
});
const { core, director } = world;
const playerId = world.playerId as PersonId;
director.watch(core, playerId);
const mode = new DevMode(core, director, undefined, world.placeId);
const player = core.people.get(playerId)!;
const circle = [...player.familyIds, ...player.knownIds].find(
  (id) => core.people.get(id)?.alive,
);
const rows: string[] = [];
const map: Record<
  string,
  {
    how: "event" | "writer" | "elections" | "campaigns" | "legislature";
    kind?: string;
    facts?: Record<string, string>;
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
const electionsOnly = process.argv.includes("--elections-only");
const campaignsOnly = process.argv.includes("--campaigns-only");
const legislatureOnly = process.argv.includes("--legislature-only");
const oneEngine = electionsOnly || campaignsOnly || legislatureOnly;
if (oneEngine)
  Object.assign(
    map,
    (JSON.parse(readFileSync(MAP_URL, "utf8")) as { types: typeof map }).types,
  );
for (const type of oneEngine ? [] : SITUATION_LIBRARY.types) {
  n++;
  if (ELECTIONS_SCENES[type.key] || ELECTIONS_REASONS[type.key]) continue;
  if (CAMPAIGNS_SCENES[type.key] || CAMPAIGNS_REASONS[type.key]) continue;
  if (LEGISLATURE_SCENES[type.key] || LEGISLATURE_REASONS[type.key]) continue;
  const cause = type.causes.find((c) => c.causeRecord) ?? type.causes[0];
  if (!cause) {
    rows.push(`${type.key}\tno-cause`);
    map[type.key] = { how: "writer", reason: "no-cause" };
    continue;
  }
  const label = cause.match?.label ?? "";
  const kind =
    cause.causeRecord ??
    (label.startsWith("feeling:event:")
      ? label.slice("feeling:event:".length)
      : (cause.match?.causeKind?.replace(/^event:/, "") ?? ""));
  if (!kind) {
    rows.push(`${type.key}\tno-kind`);
    map[type.key] = { how: "writer", reason: "circumstance" };
    map[type.key] = { how: "writer", reason: "circumstance" };
    continue;
  }
  const facts: Record<string, string> = {};
  for (const want of cause.match?.causeFacts ?? []) {
    if (want.absent) continue;
    facts[want.key] =
      want.is === "subject"
        ? playerId
        : (want.equals?.[0] ??
          (want.includes === "subject"
            ? JSON.stringify([playerId])
            : playerId));
  }
  const book = director.ledger.people.get(playerId)!;
  const before = book.moments.length;
  const scheduled = book.schedule.length;
  const id = `force-probe:${type.key}`;
  try {
    applyCoreEvent(core, {
      id,
      date: core.date,
      kind,
      personIds: [playerId, ...(circle ? [circle] : [])],
      witnessIds: [],
      placeId: player.placeId,
      facts,
      source: {
        tag: "ESTIMATED",
        citation: "force-all probe",
        asOf: core.date,
      },
    } as never);
    mode.advance(addDays(makeIsoDate(core.date), 1));
  } catch (error) {
    rows.push(
      `${type.key}\tkind=${kind}\terror: ${(error as Error).message.slice(0, 80)}`,
    );
    map[type.key] = { how: "writer", reason: "no-event" };
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
    ? { how: "event", kind, facts }
    : { how: "writer", reason: hit ? "journal-line" : "circumstance" };
  rows.push(
    `${type.key}\tkind=${kind}\tmoments=${fresh.length}\tcause-matched=${hit}\tstaged=${bound}\t${[...new Set(why)].join(",")}`,
  );
}
for (const [key, reason] of Object.entries(ELECTIONS_REASONS)) {
  rows.push(`${key}\telections\treason=${reason}`);
  map[key] = { how: "writer", reason };
}
for (const [key, way] of Object.entries(ELECTIONS_SCENES)) {
  const forced = forceElectionsScene(mode, key);
  if (forced.staged) staged++;
  rows.push(
    `${key}\telections:${way}\tstaged=${forced.staged}\t${forced.outcome ?? ""}\t${forced.causeRecords.join(",")}${forced.refused ? `\trefused=${forced.refused}` : ""}`,
  );
  // The recipe stands whatever this one world allowed: a refusal (no race took the filing) is said
  // by the force itself, in the world it runs in.
  map[key] = { how: "elections", recipe: way };
}
for (const [key, reason] of Object.entries(CAMPAIGNS_REASONS)) {
  rows.push(`${key}\tcampaigns\treason=${reason}`);
  map[key] = { how: "writer", reason };
}
for (const [key, way] of Object.entries(CAMPAIGNS_SCENES)) {
  const forced = forceCampaignsScene(mode, key);
  if (forced.staged) staged++;
  rows.push(
    `${key}\tcampaigns:${way}\tstaged=${forced.staged}\t${forced.outcome ?? ""}\t${forced.causeRecords.join(",")}${forced.refused ? `\trefused=${forced.refused}` : ""}`,
  );
  // The recipe stands whatever this one world allowed: a refusal (nobody offered, nobody gave) is
  // said by the force itself, in the world it runs in.
  map[key] = { how: "campaigns", recipe: way };
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
