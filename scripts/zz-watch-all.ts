import { buildBenchWorld } from "../src/bench/world";
import { setBookkeeping } from "../src/core2/bookkeeping";
import { gameStartDate } from "../src/core2/game-start";
import { addDays, makeIsoDate } from "../src/core2/kernel/dates";
import { advanceCore } from "../src/core2/life";
import { searchCorePlaces } from "../src/core2/place-lookup";

const seed = "0fc1c044eef41a1c22a597a9d1846533367bca84";
const place = searchCorePlaces("Coventry", 20, { stateJurisdictionKey: "US-VT", scope: "locality" })[0]!;
console.log("place", place.key, place.name);
setBookkeeping(false);
const world = buildBenchWorld(seed, gameStartDate(), { twoLevel: false, placeKey: place.key });
const { core, director } = world;
let n = 0;
for (const person of core.people.values()) if (person.alive && person.id.startsWith("person_")) { director.watch(core, person.id); n++; }
console.log("watched", n);
const t0 = Date.now();
advanceCore(core, addDays(makeIsoDate(core.date), 30));
console.log("THIRTY DAYS ms", Date.now() - t0);
