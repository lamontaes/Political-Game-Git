/**
 * Do households pay the outside living costs they are asked for? For each
 * drawn place, the played world for 90 days: what the households were asked
 * for and what they paid (finance totals for `household.outside-living-costs`),
 * and how many full people hold no cash on the 1st.
 *
 * Run: node --import tsx scripts/core2-year/living-costs-paid.ts [seed ...]
 */
import { randomBytes } from "node:crypto";
import { buildBenchWorld } from "../../src/bench/world";
import { setBookkeeping } from "../../src/core2/bookkeeping";
import { gameStartDate } from "../../src/core2/game-start";
import { addDays, makeIsoDate } from "../../src/core2/kernel/dates";
import { advanceCore } from "../../src/core2/life";
import { drawPlace } from "./place";

const KIND = "household.outside-living-costs";
const seeds = process.argv.slice(2).length
  ? process.argv.slice(2)
  : [randomBytes(6).toString("hex")];
for (const seed of seeds) {
  const place = drawPlace(seed, "living-costs-paid");
  setBookkeeping(false);
  const { core } = buildBenchWorld(place.seed, gameStartDate(), {
    twoLevel: true,
    placeKey: place.key,
  });
  advanceCore(core, addDays(makeIsoDate(core.date), 90));
  const row = core.finance.totalsByKind.get(KIND);
  const share = row ? (100 * row.paidMinor) / row.requestedMinor : NaN;
  console.log(
    `${place.name} (${place.key}), seed ${seed}: asked ${Math.round((row?.requestedMinor ?? 0) / 100)}, paid ${Math.round((row?.paidMinor ?? 0) / 100)} (${share.toFixed(0)}%)`,
  );
}
