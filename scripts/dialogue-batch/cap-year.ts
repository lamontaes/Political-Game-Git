/**
 * Step 0 of director-cap-on-scene-repeats: a played year of one officeholder and, for each situation type, how many scenes
 * were staged, how many another reason held back, and how many staged scenes repeated an earlier staged scene's type and
 * cast. Development tooling for the PR's proof; shipped play never imports it.
 *
 *   node --import tsx scripts/dialogue-batch/cap-year.ts --place <key> --seed <seed> --persona governor|legislator|mayor [--days 365] [--out file.json]
 */
import { writeFileSync } from "node:fs";
import { BenchPlayer } from "../../src/bench/player";
import { buildBenchWorld } from "../../src/bench/world";
import {
  leaveHoldsToCharacter,
  ordersDecide,
  ordersView,
} from "../../src/bench/office";
import { setBookkeeping } from "../../src/core2/bookkeeping";
import { gameStartDate } from "../../src/core2/game-start";
import { memberKey } from "../../src/core2/modules/legislature";
import { townSeats } from "../../src/core2/modules/offices";
import { coreAPI } from "../../src/core2/state";

const option = (name: string, fallback: string) => {
  const at = process.argv.indexOf(`--${name}`);
  return at >= 0 ? (process.argv[at + 1] ?? fallback) : fallback;
};
const place = option("place", "");
const seed = option("seed", "");
const persona = option("persona", "governor");
const days = Number(option("days", "365"));
const out = option("out", "");
if (!place || !seed) throw new Error("--place and --seed are required");

setBookkeeping(false);
const world = buildBenchWorld(seed, gameStartDate(), {
  twoLevel: true,
  placeKey: place,
});
const core = world.core;
const seats = townSeats(coreAPI(core)).filter((row) => row.holder?.personId);
const chosen = seats.find((row) =>
  persona === "governor"
    ? row.office.kind === "governor"
    : persona === "legislator"
      ? row.office.kind === "legislature-lower"
      : row.office.kind === "mayor",
);
if (!chosen?.holder) throw new Error(`no ${persona} seat held at ${place}`);
const player = new BenchPlayer(core, world.director);
player.select(memberKey(chosen.holder));
const pid = player.personId!;
// Watched as the scene web watches a year: the player and every official who is a full person.
for (const seat of seats)
  if (
    seat.holder?.personId &&
    !world.director.ledger.people.has(seat.holder.personId)
  )
    world.director.watch(core, seat.holder.personId);
if (!world.director.ledger.people.has(pid)) world.director.watch(core, pid);

const started = Date.now();
for (
  let g = 0;
  g < days * 6 &&
  Date.parse(core.date) < Date.parse(gameStartDate()) + days * 86400000;
  g += 1
) {
  const packet = player.packet;
  if (player.pollingPlace) player.leavePolls();
  else if (packet?.kind === "stop") {
    for (const item of ordersView(core))
      ordersDecide(core, item.entryId, "decline");
    leaveHoldsToCharacter(core);
    player.resume({ kind: "stop", pauseId: packet.pauseId });
  } else if (packet?.kind === "choice")
    player.resume({ kind: "own-choice", pauseId: packet.pauseId });
  else player.advance("day");
}

type Row = {
  staged: number;
  heldOther: number;
  sameCastRepeat: number;
};
const types = new Map<string, Row>();
const castsSeen = new Map<string, Set<string>>();
const row = (key: string): Row => {
  let r = types.get(key);
  if (!r)
    types.set(
      key,
      (r = {
        staged: 0,
        heldOther: 0,
        sameCastRepeat: 0,
        heldReasons: {},
      }),
    );
  return r;
};
let people = 0;
for (const [who, book] of world.director.ledger.people) {
  people += 1;
  for (const entry of book.schedule) {
    const moment = book.momentsById.get(entry.momentId);
    const cast = (moment?.counterpartIds ?? []).slice().sort().join("+");
    for (const held of entry.heldBack ?? []) {
      const r = row(held.typeKey);
      r.heldOther += 1;
      r.heldReasons[held.reason] = (r.heldReasons[held.reason] ?? 0) + 1;
    }
    if (entry.outcome === "journal-line") continue;
    for (const typeKey of new Set(entry.bindings.map((b) => b.typeKey))) {
      if ((entry.heldBack ?? []).some((h) => h.typeKey === typeKey)) continue;
      const r = row(typeKey);
      r.staged += 1;
      const mark = `${who}|${typeKey}`;
      const seen = castsSeen.get(mark) ?? new Set<string>();
      if (seen.has(cast)) r.sameCastRepeat += 1;
      seen.add(cast);
      castsSeen.set(mark, seen);
    }
  }
}
const report = {
  place,
  seed,
  persona,
  days,
  player: pid,
  seat: chosen.office.kind,
  endDate: core.date,
  peopleWatched: people,
  records: core.durableLog.size,
  seconds: Math.round((Date.now() - started) / 100) / 10,
  types: Object.fromEntries(
    [...types].sort((a, b) => b[1].staged - a[1].staged),
  ),
};
if (out) writeFileSync(out, JSON.stringify(report, null, 1));
console.log(JSON.stringify({ ...report, types: undefined }));
