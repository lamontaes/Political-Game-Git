/**
 * Phase 3: a played world left alone for N years (nobody steering). One JSON
 * line per checkpoint (start, then every 5 years): vital statistics, the
 * party in the town's seats, and what the records say happened in between
 * (laws that took effect, bills by outcome, elections, deaths, recalls,
 * the most common record kinds). No hand-made events.
 *   tsx scripts/dev-tests/drift-played.ts <seed> [years]
 */
import { drawPlace } from "../core2-year/place";
import { buildBenchWorld } from "../../src/bench/world";
import { gameStartDate } from "../../src/core2/game-start";
import { setBookkeeping } from "../../src/core2/bookkeeping";
import { advanceCore } from "../../src/core2/life";
import { addDays, makeIsoDate } from "../../src/core2/kernel/dates";
import { vitals } from "./vitals";
setBookkeeping(false);
const [seed = "dp1", yearsArg = "20"] = process.argv.slice(2);
const place = drawPlace(seed, "drift-played");
const w = buildBenchWorld(place.seed, gameStartDate(), {
  twoLevel: true,
  placeKey: place.key,
});
const kinds = () =>
  Object.fromEntries([...w.core.logByKind].map(([k, s]) => [k, s.size]));
let last = kinds();
const checkpoint = (label: string) => {
  const now = kinds();
  const d: Record<string, number> = {};
  for (const k of Object.keys(now)) {
    const n = now[k]! - (last[k] ?? 0);
    if (n) d[k] = n;
  }
  last = now;
  const pick = (re: RegExp) =>
    Object.fromEntries(Object.entries(d).filter(([k]) => re.test(k)));
  console.log(
    JSON.stringify({
      place: place.name,
      key: place.key,
      seed: place.seed,
      label,
      date: w.core.date,
      vitals: vitals(w.core),
      since: {
        laws: pick(/^law-|law\./),
        bills: pick(/^bill-|legislative-vote|veto/),
        elections: pick(/elect|race|recall|resign|vacan|seat-/),
        people: pick(/death|birth|moved|marri|divorce/),
        top: Object.fromEntries(
          Object.entries(d)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 12),
        ),
      },
    }),
  );
};
checkpoint("start");
const years = Number(yearsArg);
for (let y = 1; y <= years; y++) {
  advanceCore(w.core, addDays(makeIsoDate(w.core.date), 365));
  if (y % 5 === 0) checkpoint(`year ${y}`);
}
