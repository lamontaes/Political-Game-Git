import { randomBytes } from "node:crypto";
import { describe, expect, it } from "vitest";
import { buildBenchWorld } from "../src/bench/world";
import { setBookkeeping } from "../src/core2/bookkeeping";
import { gameStartDate } from "../src/core2/game-start";
import { addDays, makeIsoDate } from "../src/core2/kernel/dates";
import { advanceCore } from "../src/core2/life";
import { countedResidents } from "../src/core2/electorate";
import { townLaborByPlace } from "../src/core2/modules/world-panels";
import { coreAPI } from "../src/core2/state";
import { drawPlace } from "./golden-path/place";

/**
 * The out-of-work stock does not climb in a played year (owner, Nov 27: a town at 0.0 percent on day 2 read 26.7
 * percent a year later on the Metrics tab). The player's own number, `townLaborByPlace` (the one pass the Metrics
 * tab, the paper and the economy panel read), is read on day 2 and a year on at three places drawn from all 56; a
 * place whose labor force is under 500 heads moves by points from one counted household, so it is passed over and
 * named. The year's entries and exits are counted in heads from the seeker rows, weekly.
 */
const seed = process.env.GOLDEN_PATH_SEED ?? randomBytes(8).toString("hex");
const MIN_LABOR_FORCE = 500;
const WANTED = 3;
const DRAWS = 8;
/** Points the rate may rise over the year, as a share (a place sits within a few points of where it began). */
const A_FEW_POINTS = 0.03;
/** The year's entries may exceed its exits by at most this share of the labor force: a stock that is not piling up (half a point leaves room for one lumpy counted household). */
const NET_INFLOW = 0.005;

describe("the out-of-work stock over a played year", () => {
  it(`holds within a few points at ${WANTED} drawn places (seed ${seed})`, () => {
    setBookkeeping(false);
    const passedOver: string[] = [];
    const read: string[] = [];
    let used = 0;
    for (let i = 0; i < DRAWS && used < WANTED; i += 1) {
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
      if (first.force < MIN_LABOR_FORCE) {
        passedOver.push(`${label}: ${first.force} in the labor force`);
        continue;
      }
      used += 1;
      // The year's entries and exits in heads, from the seeker rows once a week: a counted seeker stands for its household's weight.
      const looking = () => {
        const weight = new Map(
          countedResidents(world.core).map((r) => [r.id, r]),
        );
        const out = new Map<string, number>();
        for (const table of ["seekers", "countedSeekers"])
          for (const row of api
            .moduleState("jobs")
            .table(table)
            .rows() as unknown as {
            personId: string;
            employed: boolean;
          }[]) {
            if (row.employed) continue;
            const counted = weight.get(row.personId);
            const here = counted
              ? counted.placeId
              : world.core.people.get(row.personId)?.placeId;
            if (here === world.placeId)
              out.set(row.personId, counted ? counted.weight : 1);
          }
        return out;
      };
      let held = looking();
      let entered = 0,
        left = 0;
      for (let day = 8; day <= 365; day += 7) {
        advanceCore(world.core, addDays(start, day - 1));
        const now = looking();
        for (const [id, heads] of now) if (!held.has(id)) entered += heads;
        for (const [id, heads] of held) if (!now.has(id)) left += heads;
        held = now;
      }
      const last = rate();
      read.push(
        `${label}: ${(first.rate * 100).toFixed(1)}% on day 2, ${(last.rate * 100).toFixed(1)}% on day 365 (${first.force} to ${last.force} in the labor force); ${entered.toFixed(0)} heads entered the stock and ${left.toFixed(0)} left`,
      );
      expect(
        last.rate - first.rate,
        `${label}: the out-of-work rate went from ${(first.rate * 100).toFixed(1)}% to ${(last.rate * 100).toFixed(1)}%`,
      ).toBeLessThanOrEqual(A_FEW_POINTS);
      expect(
        (entered - left) / first.force,
        `${label}: ${entered.toFixed(0)} heads entered the stock and ${left.toFixed(0)} left in the year`,
      ).toBeLessThanOrEqual(NET_INFLOW);
    }
    process.stdout.write(
      `out-of-work year, seed ${seed}:\n  ${read.join("\n  ")}\n  passed over: ${passedOver.join("; ") || "none"}\n`,
    );
    expect(
      used,
      `fewer than ${WANTED} places held ${MIN_LABOR_FORCE} in the labor force; passed over: ${passedOver.join("; ")}`,
    ).toBe(WANTED);
  }, 3_000_000);
});
