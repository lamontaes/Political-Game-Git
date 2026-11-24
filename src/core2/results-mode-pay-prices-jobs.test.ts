/**
 * The fast clock, part 3: prices, pay and hiring in skipped time. The same
 * drawn world runs one year day by day and, built again, the same year in
 * results mode (advanceCore with `results: true`), a month at a time. The
 * printed line names the place and seed and gives, for each year, the town's
 * price change (its businesses' prices against their opening prices) and its
 * share out of work (residents looking for work over residents in the labor
 * force), and whether the two years are within a fifth of each other.
 *
 * Held here: in every skipped month the number out of work stays between zero
 * and the town's adults; the skipped year's prices move (the economy engine
 * opened and published its months, which the businesses' reviews read); the
 * labor market opened and hired; and every counted wage, bill and purchase
 * that fell due before the last first of the month was settled. Within a
 * fifth is printed, not held: the pull request explains a difference by its
 * cause, as the item's done-when allows.
 */
import { randomBytes } from "node:crypto";
import { expect, it } from "vitest";
import { buildBenchWorld } from "../bench/world";
import { drawPlace } from "../../scripts/core2-year/place";
import { setBookkeeping } from "./bookkeeping";
import { gameStartDate } from "./game-start";
import { addDays, ageOnDate, makeIsoDate } from "./kernel/dates";
import { advanceCore } from "./life";
import { parameter } from "./parameters";
import { coreAPI } from "./state";
import { residentCounts, residentsRuntime } from "./modules/residents";
import { townMetrics } from "./modules/world-metrics";
import type { CoreState } from "./types";

const seed = process.env.GOLDEN_PATH_SEED ?? randomBytes(20).toString("hex");
const place = drawPlace(seed, "results-mode-pay-prices-jobs");
const where = `${place.name} (${place.key}), seed ${seed}, world seed ${place.seed}`;
const YEAR_DAYS = 365;
const FIFTH = 0.2;

const build = () => {
  setBookkeeping(false);
  return buildBenchWorld(place.seed, gameStartDate(), {
    twoLevel: true,
    placeKey: place.key,
  });
};

/** The town's price level and its residents out of work and in the labor force. */
function town(core: CoreState, placeId: string) {
  const row = townMetrics(coreAPI(core)).find((m) => m.placeId === placeId);
  return {
    price: row?.priceLevel ?? 1,
    unemployed: row?.unemployed ?? 0,
    share: row?.unemploymentRate ?? 0,
  };
}

/** The town's adults, full and counted. */
function adults(core: CoreState, placeId: string): number {
  const age = parameter("votingAge", core.data.parameters);
  let n = 0;
  for (const person of core.people.values())
    if (
      person.alive &&
      person.placeId === placeId &&
      ageOnDate(makeIsoDate(person.birthDate), makeIsoDate(core.date)) >= age
    )
      n += 1;
  return (
    n +
    (residentCounts(core).find((row) => row.placeId === placeId)?.adults ?? 0)
  );
}

const firstOfNextMonth = (date: string) =>
  `${addDays(makeIsoDate(`${date.slice(0, "YYYY-MM".length)}-01`), 32).slice(0, "YYYY-MM".length)}-01`;
const percent = (value: number) => `${(value * 100).toFixed(2)}%`;
const within = (a: number, b: number) =>
  Math.abs(a - b) <= FIFTH * Math.max(Math.abs(a), Math.abs(b));

it(`prices, pay and hiring move in a skipped year as day by day, in ${where}`, () => {
  const daily = build();
  const start = makeIsoDate(daily.core.date);
  const yearEnd = addDays(start, YEAR_DAYS);
  const opening = town(daily.core, daily.placeId);
  advanceCore(daily.core, yearEnd);
  const played = town(daily.core, daily.placeId);

  const skipped = build();
  expect(
    makeIsoDate(skipped.core.date),
    `both worlds open on one day, in ${where}`,
  ).toBe(start);
  const outOfRange: string[] = [];
  let months = 0,
    lastFirst = start;
  while (skipped.core.date < yearEnd) {
    const next = firstOfNextMonth(skipped.core.date);
    const stop = next < yearEnd ? next : yearEnd;
    advanceCore(skipped.core, stop, { results: true });
    if (stop === next) lastFirst = stop;
    months += 1;
    const row = town(skipped.core, skipped.placeId);
    const most = adults(skipped.core, skipped.placeId);
    if (!(row.unemployed >= 0 && row.unemployed <= most && row.share <= 1))
      outOfRange.push(
        `${skipped.core.date}: ${row.unemployed} out of work of ${most} adults`,
      );
  }
  const result = town(skipped.core, skipped.placeId);
  const playedPrice = played.price / opening.price - 1,
    skippedPrice = result.price / opening.price - 1;
  const fifth =
    within(playedPrice, skippedPrice) && within(played.share, result.share);
  process.stdout.write(
    `results mode, prices, pay and jobs in ${where}: day by day prices ${percent(playedPrice)} and ${percent(played.share)} out of work; skipped prices ${percent(skippedPrice)} and ${percent(result.share)} out of work over ${months} skipped months; ${fifth ? "within" : "not within"} a fifth\n`,
  );

  expect(
    outOfRange,
    `the number out of work left the range from zero to all adults, in ${where}`,
  ).toEqual([]);
  expect(
    skippedPrice,
    `the skipped year's prices moved (the economy engine opened), in ${where}`,
  ).not.toBe(0);
  const jobs = coreAPI(skipped.core).moduleState("jobs");
  expect(
    jobs.table("state").get("jobs:state"),
    `the labor market opened in the skipped year, in ${where}`,
  ).toBeDefined();
  const hires = jobs
    .table("changes")
    .rows()
    .filter((row) => (row as { kind?: string }).kind === "hire").length;
  expect(
    hires,
    `openings were filled in the skipped year, in ${where}`,
  ).toBeGreaterThan(0);
  const due = [...(residentsRuntime(skipped.core)?.due.keys() ?? [])].filter(
    (date) => date < lastFirst,
  );
  expect(
    due,
    `counted wages, bills and purchases due before ${lastFirst} were all settled, in ${where}`,
  ).toEqual([]);
}, 3_000_000);
