import { buildBenchWorld } from "../src/bench/world";
import { drawPlace } from "./core2-year/place";
import { setBookkeeping } from "../src/core2/bookkeeping";
import { gameStartDate } from "../src/core2/game-start";
import { addDays, makeIsoDate } from "../src/core2/kernel/dates";
import { advanceCore } from "../src/core2/life";
const place = drawPlace("probe-birth:0", "birth-scenes");
setBookkeeping(false);
const world = buildBenchWorld(place.seed, gameStartDate(), { twoLevel: true, placeKey: place.key });
const { core, director } = world;
for (const p of core.people.values()) if (p.alive && p.id.startsWith("person_")) director.watch(core, p.id);
advanceCore(core, addDays(makeIsoDate(core.date), 365));
let births = 0;
for (const r of core.durableLog.values()) if (r.kind === "person-birth") births++;
console.log(place.name, "births", births);
let moments = 0, shown = 0;
for (const [pid, book] of director.ledger.people) for (const [, m] of book.momentsById) {
  if (m.label !== "feeling:event:person-birth") continue; moments++;
  if (shown++ < 2) console.log("MOMENT", pid, JSON.stringify(m).slice(0, 400));
}
console.log("birth moments", moments);
for (const [pid, book] of director.ledger.people) for (const row of book.schedule) { if (String(row.momentId).includes("person-birth") && shown++ < 5) console.log("SCHED", pid, JSON.stringify(row).slice(0,400)); }
