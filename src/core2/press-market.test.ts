/**
 * An outlet serves a market wider than the town, and the market's adults
 * beyond the town pay it from the outside account at the town's own rate per
 * reader: a number that follows the market's size and reading habits, never
 * the outlet's cost. A place drawn from all 56; set GOLDEN_PATH_SEED to
 * reproduce the draw.
 */
import { randomBytes } from "node:crypto";
import { expect, it } from "vitest";
import { drawPlace } from "../../scripts/core2-year/place";
import { buildBenchWorld } from "../bench/world";
import { addDays, makeIsoDate } from "./kernel/dates";
import { gameStartDate } from "./game-start";
import { advanceCore } from "./life";
import {
  marketPeople,
  marketReadersOf,
  newsroomJobsOf,
  outsideNewsroomYearMinor,
  reassessSharedMarkets,
  pressParameter,
  outletMonthlyCostMinor,
  outletsHere,
  PRESS_MODULE_ID,
} from "./modules/press";
import type { OutletRevenueMonthRow } from "./press-money";
import { coreAPI } from "./state";
import type { CoreState } from "./types";

import news from "../../data/research/press/local-news-2026.json" with { type: "json" };

const seed = process.env.GOLDEN_PATH_SEED ?? randomBytes(8).toString("hex");

it("every state and territory has a newspaper market population, or the draw fails loudly", () => {
  const states = Object.keys((news as { places: object }).places);
  expect(states).toHaveLength(56);
  for (const state of states)
    expect(marketPeople(state, undefined), state).toBeGreaterThan(0);
  expect(() => marketPeople("US-ZZ", undefined)).toThrow();
});

it("a paper whose market is staffed at the national rate earns about the national margin, and a floor paper needs a market of about 12,600 adults", () => {
  // Per newsroom job: the revenue its adults bring against the pay (with a
  // tenth for employer taxes) and the rest of the paper's cost it carries.
  const revenue =
    pressParameter("adultsPerNewspaperNewsroomWorker") *
    pressParameter("newspaperRevenuePerAdultYear");
  const cost =
    pressParameter("newspaperOtherCostPerNewsroomJobYearMinor") +
    pressParameter("reporterAnnualPayMinor") * 1.1;
  const margin = (revenue - cost) / revenue;
  // The Census survey's 2018 newspaper margin: (25,436 - 24,002) / 25,436.
  expect(margin).toBeGreaterThan(0.04);
  expect(margin).toBeLessThan(0.08);
  // The market at which one paper on the 2-job floor breaks even falls out of
  // the sourced figures; it was not chosen.
  const breakEvenAdults =
    (pressParameter("newspaperNewsroomFloor") * cost) /
    pressParameter("newspaperRevenuePerAdultYear");
  expect(breakEvenAdults).toBeGreaterThan(12_000);
  expect(breakEvenAdults).toBeLessThan(13_500);
});

it("newsroom jobs follow the market's adults and reading above a floor", () => {
  const small = newsroomJobsOf(5_000, 1);
  const large = newsroomJobsOf(600_000, 1);
  expect(small).toBeGreaterThanOrEqual(2);
  expect(large).toBeGreaterThan(small);
  expect(newsroomJobsOf(600_000, 3)).toBeLessThan(large);
  // A market that reads half as much keeps half the newsroom.
  expect(newsroomJobsOf(600_000, 1, 0.5)).toBeCloseTo(large / 2, 6);
});

it(`the market beyond the town pays an outlet by readers, not by its cost (seed ${seed})`, () => {
  const tried: string[] = [];
  for (let draw = 0; draw < 10; draw += 1) {
    const place = drawPlace(`${seed}:${draw}`, "press-market");
    const where = `${place.name} (${place.key}), seed ${place.seed}, base ${seed}:${draw}`;
    const { core: world } = buildBenchWorld(place.seed, gameStartDate(), {
      twoLevel: true,
      placeKey: place.key,
    });
    const core = world as CoreState;
    const api = coreAPI(core);
    const outlets = outletsHere(api).filter((o) => o.tier === "local");
    // Stations have no whole-cost model yet: no market readers, no outside cost.
    for (const o of outlets.filter((x) => x.kind !== "newspaper")) {
      expect(marketReadersOf(api, o), where).toBe(0);
      expect(outsideNewsroomYearMinor(api, o, 0), where).toBe(0);
    }
    const wider = outlets.filter((o) => marketReadersOf(api, o) > 0);
    if (!wider.length) {
      tried.push(`${where}: no outlet reaches beyond the town`);
      continue;
    }
    // Raising an outlet's cost (its staff's pay) leaves its market readers
    // where they were.
    const target = wider[0]!;
    const readersBefore = marketReadersOf(api, target);
    const costBefore = outletMonthlyCostMinor(api, target);
    for (const id of core.finance.jobsByOrganization.get(
      target.organizationId,
    ) ?? []) {
      const job = core.jobs.get(id);
      for (const commitmentId of core.work.commitmentsByPerson.get(
        job?.personId ?? "",
      ) ?? []) {
        const commitment = core.work.commitments.get(commitmentId);
        if (commitment?.jobId === job?.id) commitment!.hourlyMinor *= 3;
      }
    }
    expect(outletMonthlyCostMinor(api, target), where).toBeGreaterThan(
      costBefore,
    );
    expect(marketReadersOf(api, target), where).toBe(readersBefore);
    // Two months on, the market has paid each wider outlet from the outside
    // account, by readers times the town's per-reader revenue.
    advanceCore(core, addDays(makeIsoDate(core.date), 75));
    // Its newsroom beyond the town follows the market's adults and nothing
    // of its books: a flood of sales leaves it where it was.
    const outsideBefore = outsideNewsroomYearMinor(api, target, 2);
    const book = core.finance.businesses.get(target.organizationId);
    expect(book, `${where}: the outlet keeps books`).toBeDefined();
    book!.receivedMinor += 1_000_000_000_000;
    book!.salesReceivedMinor += 1_000_000_000_000;
    expect(outsideNewsroomYearMinor(api, target, 2), where).toBe(outsideBefore);
    const table = api.moduleState(PRESS_MODULE_ID).table("revenueMonths");
    let paid = 0;
    for (const outlet of wider) {
      const rows = (
        table.query("byOutlet", [
          outlet.id,
        ]) as unknown as OutletRevenueMonthRow[]
      ).filter((row) => row.marketMinor > 0);
      paid += rows.length;
      for (const row of rows)
        expect(row.marketMinor, `${where}: ${outlet.id}`).toBeGreaterThan(0);
    }
    expect(
      paid,
      `${where}: some outlet was paid by its market`,
    ).toBeGreaterThan(0);
    return;
  }
  throw new Error(
    `no drawn place had an outlet reaching beyond the town: ${tried.join("; ")}`,
  );
}, 1_200_000);

it(`when a paper closes the papers left take its market (seed ${seed})`, () => {
  const tried: string[] = [];
  for (let draw = 0; draw < 10; draw += 1) {
    const place = drawPlace(`${seed}:${draw}`, "press-market-closure");
    const where = `${place.name} (${place.key}), seed ${place.seed}, base ${seed}:${draw}`;
    const { core: world } = buildBenchWorld(place.seed, gameStartDate(), {
      twoLevel: true,
      placeKey: place.key,
    });
    const core = world as CoreState;
    const api = coreAPI(core);
    // The papers' books open in the first press week.
    advanceCore(core, addDays(makeIsoDate(core.date), 14));
    const papers = outletsHere(api).filter(
      (o) => o.tier === "local" && o.kind === "newspaper",
    );
    if (papers.length < 2) {
      tried.push(`${where}: fewer than two papers`);
      continue;
    }
    const [closing, kept] = papers as [
      (typeof papers)[number],
      (typeof papers)[number],
    ];
    const readersBefore = marketReadersOf(api, kept);
    if (!(readersBefore > 0)) {
      tried.push(`${where}: no readers beyond the town`);
      continue;
    }
    // The other paper closes: the one left has the whole market to itself.
    core.finance.businesses.get(closing.organizationId)!.closedAt = core.date;
    const open = papers.length - 1;
    expect(marketReadersOf(api, kept), where).toBeCloseTo(
      (readersBefore * papers.length) / open,
      6,
    );
    // At the next month's start, its books' demand follows the larger market.
    const demandBefore = core.finance.businesses.get(
      kept.organizationId,
    )!.annualDemandMinor;
    reassessSharedMarkets(api);
    expect(
      core.finance.businesses.get(kept.organizationId)!.annualDemandMinor,
      where,
    ).toBeGreaterThan(demandBefore);
    return;
  }
  throw new Error(
    `no drawn place had two papers with readers beyond the town: ${tried.join("; ")}`,
  );
}, 1_200_000);
