import { randomBytes } from "node:crypto";
import { describe, expect, it } from "vitest";
import { buildBenchWorld } from "../src/bench/world";
import { setBookkeeping } from "../src/core2/bookkeeping";
import { countedResidents } from "../src/core2/electorate";
import { gameStartDate } from "../src/core2/game-start";
import {
  addDays,
  daysBetweenText,
  makeIsoDate,
} from "../src/core2/kernel/dates";
import { advanceCore } from "../src/core2/life";
import { townLaborByPlace } from "../src/core2/modules/world-panels";
import { coreAPI } from "../src/core2/state";
import { drawPlace } from "./golden-path/place";

/**
 * The out-of-work stock over a played year (owner, Nov 27: a town at 0.0 percent on day 2 read 26.7 percent a year
 * later on the Metrics tab). The player's own number, `townLaborByPlace` (the one pass the Metrics tab, the paper and
 * the economy panel read), is read at places drawn from all 56, and the year's flows are counted in heads from the
 * seeker rows once a week. Two relationships are read against the cited flows, not a target rate:
 *
 * - entries over exits for the year, against the CPS gross flows' ratio. The flows the parameters cite
 *   (`pastWorkLayoffsPerQuarter`: 0.96 percent of employment a month into unemployment; `jobsContinueBaseline`: of the
 *   unemployed, 26 percent employed and 25 percent out of the labor force the next month) leave the unemployed stock
 *   level over the cited window (UNEMPLOY mean 6,657 thousand, Jan 2023 to Oct 2026), so the ratio is 1.
 * - the median completed search in weeks, against the cited median of 10.1 weeks (FRED UEMPMED, 2025;
 *   `data/research/labor/unemployment-duration-and-reservation-wage.json`).
 *
 * A place whose labor force is under 500 heads moves by points from one counted household, so it is passed over and
 * named; the test reports how many of its draws held 500 or more.
 */
const seed = process.env.GOLDEN_PATH_SEED ?? randomBytes(8).toString("hex");
const MIN_LABOR_FORCE = 500;
const WANTED = 3;
const DRAWS = 8;
/** The cited flows' entries over exits. */
const CPS_ENTRIES_OVER_EXITS = 1;
/**
 * TUNABLE: how far a place's year may sit above that ratio. Checked against three places at seed oo1 and the one
 * before this fix: entries over exits 1.04 to 1.07 before, 0.93 to 1.00 after; the lumpiness of one counted household
 * in a labor force of 500 is about 0.5 points of the stock's flow, so 0.02 leaves room for it and not for a climb.
 */
const RATIO_SPREAD = 0.02;
const CPS_MEDIAN_WEEKS = 10.1;
/**
 * TUNABLE: the factor the completed median may sit from the cited median. Checked against the same places: 1.9 times
 * before the fix (19 weeks), 1.1 to 1.3 after (11 to 13 weeks); the cited median itself moved 18 percent in a year
 * (10.1 weeks in 2025, 11.9 in October 2026), so 1.5 leaves room for that and not for a search that ends the same
 * month for everyone.
 */
const MEDIAN_FACTOR = 1.5;

describe("the out-of-work stock over a played year", () => {
  it(`keeps entries and exits in the cited flows' ratio at ${WANTED} drawn places (seed ${seed})`, () => {
    setBookkeeping(false);
    const passedOver: string[] = [];
    const read: string[] = [];
    let used = 0;
    let big = 0;
    for (let i = 0; i < DRAWS; i += 1) {
      const place = drawPlace(seed, `out-of-work-${i}`);
      const world = buildBenchWorld(place.seed, gameStartDate(), {
        twoLevel: true,
        placeKey: place.key,
      });
      const api = coreAPI(world.core, "jobs");
      const start = makeIsoDate(world.core.date);
      const rate = () => {
        const row = townLaborByPlace(api).get(world.placeId);
        const force = (row?.seekers ?? 0) + (row?.employed ?? 0);
        return { force, rate: force > 0 ? row!.seekers / force : 0 };
      };
      advanceCore(world.core, addDays(start, 1));
      const first = rate();
      const label = `${place.name} (${place.key}, seed ${place.seed.slice(0, 8)})`;
      if (first.force >= MIN_LABOR_FORCE) big += 1;
      if (first.force < MIN_LABOR_FORCE || used >= WANTED) {
        if (first.force < MIN_LABOR_FORCE)
          passedOver.push(`${label}: ${first.force} in the labor force`);
        continue;
      }
      used += 1;
      // The year's entries and exits in heads, from the seeker rows once a week: a counted seeker stands for its household's weight.
      const looking = () => {
        const weight = new Map(
          countedResidents(world.core).map((r) => [r.id, r]),
        );
        const out = new Map<string, { heads: number; since: string }>();
        for (const table of ["seekers", "countedSeekers"])
          for (const row of api
            .moduleState("jobs")
            .table(table)
            .rows() as unknown as {
            personId: string;
            since: string;
            employed: boolean;
          }[]) {
            if (row.employed) continue;
            const counted = weight.get(row.personId);
            const here = counted
              ? counted.placeId
              : world.core.people.get(row.personId)?.placeId;
            if (here === world.placeId)
              out.set(row.personId, {
                heads: counted ? counted.weight : 1,
                since: row.since,
              });
          }
        return out;
      };
      let held = looking();
      let entered = 0,
        left = 0;
      const completed: { weeks: number; heads: number }[] = [];
      for (let day = 8; day <= 365; day += 7) {
        advanceCore(world.core, addDays(start, day - 1));
        const now = looking();
        for (const [id, row] of now) if (!held.has(id)) entered += row.heads;
        for (const [id, row] of held)
          if (!now.has(id)) {
            left += row.heads;
            completed.push({
              weeks: daysBetweenText(row.since, world.core.date) / 7,
              heads: row.heads,
            });
          }
        held = now;
      }
      const last = rate();
      const total = completed.reduce((n, row) => n + row.heads, 0);
      let running = 0;
      let median = 0;
      for (const row of [...completed].sort((a, b) => a.weeks - b.weeks)) {
        running += row.heads;
        if (running >= total / 2) {
          median = row.weeks;
          break;
        }
      }
      const ratio = entered / Math.max(1, left);
      read.push(
        `${label}: ${(first.rate * 100).toFixed(1)}% on day 2, ${(last.rate * 100).toFixed(1)}% on day 365 (${first.force} to ${last.force} in the labor force); ${entered.toFixed(0)} heads entered and ${left.toFixed(0)} left (ratio ${ratio.toFixed(2)}); median completed search ${median.toFixed(1)} weeks`,
      );
      expect(
        ratio,
        `${label}: ${entered.toFixed(0)} heads entered the stock and ${left.toFixed(0)} left in the year`,
      ).toBeLessThanOrEqual(CPS_ENTRIES_OVER_EXITS + RATIO_SPREAD);
      expect(
        median,
        `${label}: the median completed search was ${median.toFixed(1)} weeks against the cited ${CPS_MEDIAN_WEEKS}`,
      ).toBeGreaterThanOrEqual(CPS_MEDIAN_WEEKS / MEDIAN_FACTOR);
      expect(
        median,
        `${label}: the median completed search was ${median.toFixed(1)} weeks against the cited ${CPS_MEDIAN_WEEKS}`,
      ).toBeLessThanOrEqual(CPS_MEDIAN_WEEKS * MEDIAN_FACTOR);
    }
    process.stdout.write(
      `out-of-work year, seed ${seed}: ${big} of ${DRAWS} draws held ${MIN_LABOR_FORCE} or more in the labor force\n  ${read.join("\n  ")}\n  passed over: ${passedOver.join("; ") || "none"}\n`,
    );
    expect(
      used,
      `fewer than ${WANTED} places held ${MIN_LABOR_FORCE} in the labor force; passed over: ${passedOver.join("; ")}`,
    ).toBe(WANTED);
  }, 3_600_000);
});
