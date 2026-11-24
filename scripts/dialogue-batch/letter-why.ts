import { buildBenchWorld } from "../../src/bench/world";
import { setBookkeeping } from "../../src/core2/bookkeeping";
import { advanceCore } from "../../src/core2/life";
import { addDays, makeIsoDate } from "../../src/core2/kernel/dates";
import { drawPlace } from "../core2-year/place";
import { OPENING_DATE } from "./play-lives";
const place = drawPlace("lives-letter-a", "scene-year");
setBookkeeping(false);
const { core, director, playerId } = buildBenchWorld(place.seed, OPENING_DATE, {
  twoLevel: true,
  placeKey: place.key,
});
director.watch(core, playerId!);
const out = new Map<string, number>();
let seen = 0;
for (let d = 0; d < 365; d++) {
  advanceCore(core, addDays(makeIsoDate(core.date), 1));
  const book = director.ledger.people.get(playerId!)!;
  for (const e of book.schedule.slice(seen)) {
    const m = book.momentsById.get(e.momentId)!;
    if (m.label.includes("family.contact")) {
      const k = `${e.outcome} rank=${e.rank} pace=${e.pace} bindings=${e.bindings.map((b) => b.typeKey)} cov=${e.coverage?.typeKey}/${e.coverage?.reason}/${e.coverage?.detail}`;
      out.set(k, (out.get(k) ?? 0) + 1);
    }
  }
  seen = book.schedule.length;
}
console.log([...out].map(([k, v]) => `${v} x ${k}`).join("\n"));
