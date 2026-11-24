/** Heap after a collection, day by day, over a window of the Dev Tester's drift world. */
import { buildBenchWorld } from "../../src/bench/world";
import { setBookkeeping } from "../../src/core2/bookkeeping";
import { gameStartDate } from "../../src/core2/game-start";
import { addDays, makeIsoDate } from "../../src/core2/kernel/dates";
import { advanceCore } from "../../src/core2/life";
import { drawPlace } from "../core2-year/place";

const [seed = "dpA", from = "2030-10-25", to = "2030-11-20"] =
  process.argv.slice(2);
setBookkeeping(false);
const place = drawPlace(seed, "drift-played");
const w = buildBenchWorld(place.seed, gameStartDate(), {
  twoLevel: true,
  placeKey: place.key,
});
advanceCore(w.core, makeIsoDate(from));
const gc = (globalThis as { gc?: () => void }).gc;
while (w.core.date < to) {
  const t = performance.now();
  advanceCore(w.core, addDays(makeIsoDate(w.core.date), 1));
  const took = Math.round(performance.now() - t);
  const before = Math.round(process.memoryUsage().heapUsed / 1048576);
  gc?.();
  console.log(
    `${w.core.date}: ${took} ms, heap ${before} -> ${Math.round(process.memoryUsage().heapUsed / 1048576)} MB after gc, log ${w.core.durableLog.size}`,
  );
}
