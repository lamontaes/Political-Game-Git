/* eslint-disable @typescript-eslint/no-explicit-any */
import { createHash } from "node:crypto";
import { drawPlace } from "../core2-year/place";
import { buildBenchWorld } from "../../src/bench/world";
import { gameStartDate } from "../../src/core2/game-start";
import { setBookkeeping } from "../../src/core2/bookkeeping";
import { advanceCore } from "../../src/core2/life";
import { countedResidents } from "../../src/core2/electorate";
import { addDays, makeIsoDate } from "../../src/core2/kernel/dates";
setBookkeeping(false);
const [seed = "m3"] = process.argv.slice(2);
const place = drawPlace(seed, "elections");
const w = buildBenchWorld(place.seed, gameStartDate(), {
  twoLevel: true,
  placeKey: place.key,
});
advanceCore(w.core, addDays(makeIsoDate(w.core.date), 365));
const core: any = w.core;
const counted = countedResidents(core)
  .map((v: any) => `${v.id}|${v.householdId}|${v.birthDate}|${v.placeId}`)
  .sort();
const named = [...core.people.values()]
  .map(
    (p: any) =>
      `${p.id}|${p.givenName}|${p.familyName}|${p.birthDate}|${JSON.stringify(p.traits)}`,
  )
  .sort();
const h = (a: string[]) =>
  createHash("sha256").update(a.join("\n")).digest("hex").slice(0, 16);
console.log(
  place.name ?? place.key,
  seed,
  "counted",
  counted.length,
  h(counted),
  "named",
  named.length,
  h(named),
);
