/**
 * Counted deaths in a town's first four months against what the tables
 * expect, over drawn places: the figures behind
 * src/core2/counted-deaths-opening.test.ts. Appends one line per place to
 * /tmp/claude-0/deaths-ratio.txt (place, expected deaths, deaths, their ratio,
 * and the illnesses booked at the opening). Development tooling.
 *
 *   node --max-old-space-size=8000 --import tsx scripts/core2-year/deaths-ratio.ts
 */
import { appendFileSync } from "node:fs";
import { drawPlace } from "./place";
import { buildBenchWorld } from "../../src/bench/world";
import { setBookkeeping } from "../../src/core2/bookkeeping";
import { gameStartDate } from "../../src/core2/game-start";
import { addDays, makeIsoDate } from "../../src/core2/kernel/dates";
import { advanceCore } from "../../src/core2/life";
import { coreAPI } from "../../src/core2/state";
const out = "/tmp/claude-0/deaths-ratio.txt";
for (let i = 0; i < 14; i += 1) {
  const place = drawPlace(`ratio-${i}`, "counted-deaths-opening");
  setBookkeeping(false);
  const { core } = buildBenchWorld(place.seed, gameStartDate(), {
    twoLevel: true,
    placeKey: place.key,
  });
  advanceCore(core, addDays(makeIsoDate(core.date), 125));
  const rows = coreAPI(core)
    .moduleState("core2-renewal-v1")
    .table("counts")
    .rows() as unknown as {
    deaths: string[];
    openingIll: string[];
    expected: { deaths: number };
  }[];
  const expected = rows.reduce((n, r) => n + r.expected.deaths, 0);
  const deaths = rows.reduce((n, r) => n + r.deaths.length, 0);
  const opening = rows.reduce((n, r) => n + r.openingIll.length, 0);
  appendFileSync(
    out,
    `${place.name}, ${place.state}: expected ${expected.toFixed(1)} died ${deaths} ratio ${(deaths / Math.max(expected, 0.001)).toFixed(2)} openingIll ${opening}\n`,
  );
}
appendFileSync(out, "FINISHED\n");
