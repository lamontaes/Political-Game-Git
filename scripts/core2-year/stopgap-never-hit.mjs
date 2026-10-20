/* global process, console */
// Which open stopgap rows never fired? The play build's own world
// (buildBenchWorld, two-level, every module) is built in --towns drawn
// places and played --days days each; every open row in
// src/core2/data/stopgaps.json whose marker fired in none of them (in the
// core's or the director's hits) is listed with its kind and file, as a
// candidate for a staleness check: a marker that never fires in two played
// years in three towns is either behind a rarely-met condition, in code
// that no longer runs, or already replaced. The list is evidence, not a
// verdict; the row's owner decides.
// Usage: CORE2_BOOKKEEPING=0 node --max-old-space-size=8000 --import tsx scripts/core2-year/stopgap-never-hit.mjs [--seed S] [--towns 3] [--days 730] [--out file.json]
import { writeFileSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { randomBytes } from "node:crypto";
const args = process.argv.slice(2);
const value = (name, fallback) =>
  args.includes(name) ? args[args.indexOf(name) + 1] : fallback;
const at = (path) => import(pathToFileURL(resolve(process.cwd(), path)).href);
const seed = value("--seed", randomBytes(16).toString("hex"));
const towns = Number(value("--towns", 3));
const days = Number(value("--days", 730));
const out = value("--out", undefined);

const { buildBenchWorld } = await at("src/bench/world.ts");
const { gameStartDate } = await at("src/core2/game-start.ts");
const { advanceCore } = await at("src/core2/life.ts");
const { addDays, makeIsoDate } = await at("src/core2/kernel/dates.ts");
const { drawPlace } = await at("scripts/core2-year/place.ts");
const { setBookkeeping } = await at("src/core2/bookkeeping.ts");
setBookkeeping(false);

const registry = JSON.parse(
  readFileSync("src/core2/data/stopgaps.json", "utf8"),
);
const open = registry.filter((row) => row.status === "open");
const hits = new Map();
const drawn = [];
for (let i = 0; i < towns; i += 1) {
  const place = drawPlace(`${seed}:${i}`, "stopgap-never-hit");
  drawn.push({ name: place.name, state: place.state, key: place.key });
  console.error(`town ${i + 1}: ${place.name}, ${place.state} (${place.key})`);
  const world = buildBenchWorld(place.seed, gameStartDate(), {
    twoLevel: true,
    placeKey: place.key,
  });
  const core = world.core;
  const note = (id) => hits.set(id, [...(hits.get(id) ?? []), place.key]);
  for (const id of core.stopgapHits) note(id);
  advanceCore(core, addDays(makeIsoDate(core.date), days));
  for (const id of core.stopgapHits)
    if (!(hits.get(id) ?? []).includes(place.key)) note(id);
  for (const id of world.director?.ledger?.stopgapHits ?? [])
    if (!(hits.get(id) ?? []).includes(place.key)) note(id);
}
const never = open.filter((row) => !hits.has(row.id));
const report = {
  seed,
  days,
  towns: drawn,
  openRows: open.length,
  fired: open.length - never.length,
  neverFired: never.map((row) => ({
    id: row.id,
    kind: row.kind,
    file: row.file,
    addedAt: row.addedAt,
    whatItFakes: row.whatItFakes,
  })),
};
const text = JSON.stringify(report, null, 2);
if (out) writeFileSync(out, text + "\n");
console.log(text);
