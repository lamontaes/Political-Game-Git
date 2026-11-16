// @vitest-environment node
/**
 * Dev mode's Industries page reads one tally: every business by its kind, its staff and its
 * books, and one business month by month from the business engine's trading records and the
 * jobs engine's change records. Pinned: Center, North Dakota (3813180), seed ilt-3813180, a
 * small town whose utility holds most of its jobs. Its body runs 11.2 s alone and 13.9 s beside three
 * other files; the limit is 30 s.
 */
import { describe, expect, it } from "vitest";
import { buildBenchWorld } from "./world";
import { gameStartDate } from "../core2/game-start";
import { BenchPlayer } from "./player";
import { DevMode } from "./dev-mode";
import { addDays, makeIsoDate } from "../core2/kernel/dates";
import { coreAPI } from "../core2/state";
import { setBookkeeping } from "../core2/bookkeeping";
import { businessesIn } from "../core2/modules/business";
import { industryTally, industryBusiness } from "./dev-industries";

setBookkeeping(false);
const placeKey = "3813180";
const seed = "ilt-3813180";
const world = buildBenchWorld(seed, gameStartDate(), {
  twoLevel: true,
  placeKey,
});
const dev = new DevMode(
  world.core,
  world.director,
  new BenchPlayer(world.core, world.director),
  world.placeId,
);
const where = `${world.place.displayName} (${placeKey}), seed ${seed}`;

describe(`dev industries: ${where}`, () => {
  it(
    "tallies the town's businesses by kind and shows one month by month",
    { timeout: 30_000 },
    () => {
      dev.advance(addDays(makeIsoDate(world.core.date), 95));
      const api = coreAPI(world.core);
      const tally = industryTally(api, world.placeId);
      const open = businessesIn(api, world.placeId);
      expect(tally.industries.length, where).toBeGreaterThan(3);
      // The tally's staff and open businesses are the business engine's own, by kind.
      for (const row of tally.industries) {
        const engine = open.filter((b) => b.kindId === row.kindId);
        expect(row.open, `${where}: ${row.kindId} open`).toBe(engine.length);
        expect(row.staff, `${where}: ${row.kindId} staff`).toBe(
          engine.reduce((n, b) => n + b.staff, 0),
        );
        expect(row.salesMinor, `${where}: ${row.kindId} sales`).toBe(
          row.businesses.reduce((n, b) => n + b.salesMinor, 0),
        );
      }
      const biggest = [...open].sort((a, b) => b.staff - a.staff)[0]!;
      const view = industryBusiness(api, biggest.id)!;
      process.stderr.write(
        `${where}: ${tally.industries.length} kinds, ${open.length} open; ${biggest.id} (${biggest.kindId}, ${biggest.staff} staff), ${view.months.length} months, ${view.recordIds.length} records\n`,
      );
      expect(view.kindId, where).toBe(biggest.kindId);
      expect(view.staff, where).toBe(biggest.staff);
      expect(view.months.length, where).toBeGreaterThanOrEqual(2);
      // A month's sales are its trading record's, and the months add up to no more than the books.
      const months = view.months.reduce((n, m) => n + m.salesMinor, 0);
      const books = tally.industries
        .flatMap((row) => row.businesses)
        .find((b) => b.organizationId === biggest.id)!;
      expect(months, where).toBeGreaterThan(0);
      expect(months, where).toBeLessThanOrEqual(books.salesMinor);
      // Buyers beyond the town, as the residents engine's outside-sales flows pay them now.
      const outside = tally.industries.reduce(
        (n, row) => n + row.outsideSalesPerYearMinor,
        0,
      );
      expect(outside, where).toBeGreaterThan(0);
      // What each month paid under laws and taxes is its trading record's, with the law rows behind it.
      const trading = api
        .moduleState("business")
        .table("trading")
        .rows() as unknown as {
        id: string;
        charges?: { kind: string; minor: number; lawIds: string[] }[];
        staff?: number;
      }[];
      const paid = view.months.flatMap((m) => m.charges);
      for (const m of view.months) {
        const row = trading.find((r) => r.id === m.id)!;
        const law = (row.charges ?? []).filter(
          (c) =>
            !["wages", "supplies", "outside-costs"].includes(c.kind) &&
            c.minor !== 0,
        );
        expect(m.charges, `${where}: ${m.id}`).toEqual(law);
        expect(m.staff, `${where}: ${m.id}`).toBe(row.staff);
      }
      process.stderr.write(
        `${where}: charges ${JSON.stringify(paid.slice(0, 4))}\n`,
      );
      expect(
        paid.some((c) => c.minor > 0 && c.lawIds.length > 0),
        `${where}: no month paid a charge under a named law`,
      ).toBe(true);
    },
  );
});
