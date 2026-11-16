/**
 * Which situation types a cause record written through the game's own event entry stages, for the
 * force-all dev control. Each type is tried in turn on one built world: its first cause's record
 * kind is written naming the player (facts from the cause's own `causeFacts`), a day passes, and
 * the player's new moments are read for a cause the type matches and a scene bound to the type.
 * Run: SEED=<seed> node --import tsx scripts/words/force-all-probe.mts
 */
import { writeFileSync } from "node:fs";
import { setBookkeeping } from "../../src/core2/bookkeeping";
import { gameStartDate } from "../../src/core2/game-start";
import { applyCoreEvent } from "../../src/core2/state";
import type { PersonId } from "../../src/core2/types";
import { addDays, makeIsoDate } from "../../src/core2/kernel/dates";
import { buildBenchWorld } from "../../src/bench/world";
import { DevMode } from "../../src/bench/dev-mode";
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
    how: "event" | "writer";
    kind?: string;
    facts?: Record<string, string>;
    reason?: string;
  }
> = {};
let staged = 0;
let matched = 0;
let n = 0;
for (const type of SITUATION_LIBRARY.types) {
  n++;
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
console.log(rows.join("\n"));
if (process.argv.includes("--write-map"))
  writeFileSync(
    new URL("../../src/bench/dev-views/scene-force-map.json", import.meta.url),
    `${JSON.stringify(
      {
        about:
          "Written by scripts/words/force-all-probe.mts --write-map, never by hand: how each situation type can be forced from dev mode's scene view, measured at one built world.",
        types: map,
      },
      null,
      2,
    )}\n`,
  );
console.log(`\n${n} types: cause matched ${matched}, scene staged ${staged}`);
