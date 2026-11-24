/**
 * Memory probe for the Dev Tester's drift world: builds the world exactly as
 * `scripts/dev-tests/drift-played.ts` does (its seed draws the place and the
 * world seed), then each year prints the heap after a collection and the
 * rows of the tables that grew most since year 1.
 *   node --expose-gc --import tsx scripts/speed-years/probe-drift-memory.ts <seed> [years]
 */
import { buildBenchWorld } from "../../src/bench/world";
import { setBookkeeping } from "../../src/core2/bookkeeping";
import { gameStartDate } from "../../src/core2/game-start";
import { addDays, makeIsoDate } from "../../src/core2/kernel/dates";
import { advanceCore } from "../../src/core2/life";
import { worldRecords } from "../../src/core2/snapshot";
import { drawPlace } from "../core2-year/place";

const [seed = "dpA", yearsArg = "20"] = process.argv.slice(2);
setBookkeeping(false);
const place = drawPlace(seed, "drift-played");
const w = buildBenchWorld(place.seed, gameStartDate(), {
  twoLevel: true,
  placeKey: place.key,
});
console.log(`${place.name} (key ${place.key}, world seed ${place.seed})`);
const counts = (): Map<string, number> => {
  const records = worldRecords(w.core);
  const out = new Map<string, number>();
  for (const [field, value] of Object.entries(records.core))
    if (value instanceof Map) out.set(`core.${field}`, value.size);
  for (const [id, store] of records.modules)
    for (const name of Object.keys(w.core.modules.get(id)?.state?.tables ?? {}))
      out.set(`${id}.${name}`, store.table(name).rows().length);
  return out;
};
let first: Map<string, number> | undefined;
const started = performance.now();
for (let year = 1; year <= Number(yearsArg); year += 1) {
  if (year >= Number(process.env.MONTHLY_FROM ?? 99)) {
    // Month by month, the heap without a collection, so a peak inside the year shows.
    for (let step = 1; step <= 12; step += 1) {
      advanceCore(w.core, addDays(makeIsoDate(w.core.date), 30));
      const usage = process.memoryUsage();
      console.log(
        `  ${w.core.date}: heap ${Math.round(usage.heapUsed / 1048576)} MB, rss ${Math.round(usage.rss / 1048576)} MB, log ${w.core.durableLog.size}, relationships ${w.core.relationships.size}`,
      );
    }
    advanceCore(w.core, addDays(makeIsoDate(w.core.date), 5));
  } else advanceCore(w.core, addDays(makeIsoDate(w.core.date), 365));
  (globalThis as { gc?: () => void }).gc?.();
  const now = counts();
  first ??= now;
  const grown = [...now]
    .map(([k, n]) => [k, n - (first!.get(k) ?? 0), n] as const)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6);
  console.log(
    `year ${year} ${w.core.date}: ${Math.round((performance.now() - started) / 1000)} s, heap ${Math.round(process.memoryUsage().heapUsed / 1048576)} MB, people ${w.core.people.size}; ` +
      grown.map(([k, d, n]) => `${k} +${d} (${n})`).join("; "),
  );
}
