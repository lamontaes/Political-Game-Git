import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

import {
  advanceObservedWorld,
  observerPlace,
  observerSetup,
  openObserverWorld,
} from "../../src/presentation/observer-world";
import { addDays } from "../../src/simulation/dates";
import { MIGRATION_REVIEW_INTERVAL_DAYS } from "../../src/simulation/migration/review";
import { acuteWeight } from "../../src/simulation/outcome-web";
import { townBusinesses } from "../../src/simulation/living-world/town-businesses";
import {
  TOWN_FINANCE_POLICY,
  stepTownFinances,
  townCreditLineDays,
} from "../../src/simulation/living-world/town-finances";
import type { TownMarketBooks } from "../../src/simulation/living-world/town-finance-types";
import type { World } from "../../src/simulation/types";

/**
 * A71, CTO ruling 10/1: a town business's credit line is its kind's sourced
 * median days of revenue times its own revenue, and the town's local sales
 * follow its pay with the long-run elasticity, building over quarters on the
 * outcome web's half-life shape. What is still set by hand names a filed
 * research question, and this test proves the world's books run on the
 * ruled values in a place drawn by seed from all 56. A71_SEEDS (comma
 * separated) watches more places; each logs its line-holding share.
 */

const SEEDS = (
  process.env.A71_SEEDS ??
  process.env.A71_SEED ??
  "a71-town-credit-9"
)
  .split(",")
  .map((seed) => seed.trim())
  .filter((seed) => seed.length > 0);
const SOURCE = readFileSync(
  "src/simulation/living-world/town-finances.ts",
  "utf8",
);

function filedRequest(questionId: string): { questionId: string } {
  return JSON.parse(
    readFileSync(`docs/research/requests/${questionId}.json`, "utf8"),
  ) as { questionId: string };
}

function commentAbove(key: string): string {
  const at = SOURCE.indexOf(`    ${key}:`);
  expect(at, key).toBeGreaterThan(0);
  return SOURCE.slice(SOURCE.lastIndexOf("/**", at), at);
}

describe("the town finance values name their research (A71)", () => {
  it.each([
    ["creditLineDaysByKind", "town-bank-line-underwriting"],
    ["localDemandHalfLifeDays", "local-sales-response-timing"],
  ])("%s names the filed question %s", (key, questionId) => {
    expect(commentAbove(key)).toContain(`\`${questionId}\``);
    expect(filedRequest(questionId).questionId).toBe(questionId);
  });

  it("the ruled values are marked measured and read from the research file", () => {
    for (const key of ["creditLineDaysByKind", "localDemandElasticity"]) {
      expect(commentAbove(key)).toContain("MEASURED (A71");
      expect(commentAbove(key)).toContain("research");
    }
    expect(commentAbove("localDemandHalfLifeDays")).toContain("PLACEHOLDER");
  });
});

function markets(world: World): Readonly<Record<string, TownMarketBooks>> {
  return world.townFinances?.markets ?? {};
}

describe.each(SEEDS)("watched world, seed %s", (seed) => {
  const place = observerPlace(seed);

  it(
    `opens in ${place.displayName} (${place.key}); lines follow each kind's sourced days, and town sales build toward the town's pay`,
    { timeout: 600_000 },
    () => {
      console.log(
        `A71 watched place: ${place.displayName} (${place.key}), seed ${seed}`,
      );
      const opened = openObserverWorld(observerSetup(seed, place.key));
      const town =
        opened.world.people[opened.anchorPersonId]!.homeJurisdictionId!;
      const businessesOf = (from: World) =>
        townBusinesses(from, town).map((business) => ({
          organizationId: business.organizationId,
          kind: business.workplace.key,
          newcomer: business.outlet >= business.workplace.outlets,
        }));
      // The quarterly review's own books step (`stepTownFinances`), run
      // on the pay the world recorded in its first 45 days. The test holds
      // the clock at the first review's date, 91 days in, to open the books,
      // the banks' lines and the markets, and four weeks after that for the
      // one market step it watches: by then the 91-day window holds fewer
      // of the recorded paychecks, so the town's pay reads lower and its
      // sales must start to follow. Simulating only 45 days keeps the test
      // under five minutes.
      const recorded = advanceObservedWorld(opened.world, 45);
      const at = (from: World, days: number): World => ({
        ...from,
        currentDate: addDays(recorded.currentDate, days),
      });
      const step = (from: World, round: string): World =>
        stepTownFinances(from, town, businessesOf(from), new Set(), round)
          .world;
      let world = step(
        at(recorded, MIGRATION_REVIEW_INTERVAL_DAYS - 45),
        "a71-open",
      );
      const before = markets(world);
      world = step(
        at(world, MIGRATION_REVIEW_INTERVAL_DAYS - 45 + 28),
        "a71-watch",
      );
      const after = markets(world);

      // Credit lines: every business with a line has its kind's sourced
      // days of its revenue.
      const businesses = Object.values(world.townFinances?.businesses ?? {});
      const banked = businesses.filter((books) => books.lineLimit > 0);
      // A business borrows from a bank in its town: where the town has no
      // bank keeping books, nobody holds a line.
      const banks = Object.values(world.townFinances?.banks ?? {}).filter(
        (bank) => !bank.failed,
      );
      const withBank = businesses.filter(
        (books) => books.bankId !== null && banks.length > 0,
      );
      console.log(
        `A71 ${place.displayName} (${place.key}), seed ${seed}: ${businesses.length} business books, ${banks.length} open bank books, ${banked.length} with a credit line (share ${
          businesses.length > 0
            ? (banked.length / businesses.length).toFixed(3)
            : "n/a"
        })`,
      );
      if (withBank.length > 0)
        expect(
          banked.length,
          `${place.displayName}, seed ${seed}`,
        ).toBeGreaterThan(0);
      else expect(banked, `${place.displayName}, seed ${seed}`).toEqual([]);
      for (const books of banked) {
        const days = townCreditLineDays(books.kind);
        const sized = (amount: number) =>
          Math.round(((amount * days) / 365) * 100) / 100;
        // The line is sized from the unrounded revenue, so allow the cent
        // the stored revenue was rounded to.
        expect(
          Math.min(
            ...[
              books.annualRevenue,
              books.capacity,
              books.openingMarketSales,
            ].map((amount) => Math.abs(sized(amount) - books.lineLimit)),
          ),
          `${books.organizationId} (${books.kind}, ${days} days)`,
        ).toBeLessThanOrEqual(0.011);
      }

      // Town sales: each market read again closes part of the gap between
      // the pay its sales had reached and the town's pay now, by the
      // half-life shape, and its sales move with it.
      const quarterStep =
        1 -
        acuteWeight(
          TOWN_FINANCE_POLICY.business.localDemandHalfLifeDays,
          addDays(world.currentDate, -91),
          world.currentDate,
        );
      let moved = 0;
      for (const [key, now] of Object.entries(after)) {
        const then = before[key];
        if (!then || then.lastRound === now.lastRound) continue;
        if (
          then.townPayReached === undefined ||
          now.townPayReached === undefined ||
          now.townPay === undefined
        )
          continue;
        const gap = Math.log(now.townPay / then.townPayReached);
        const built = Math.log(now.townPayReached / then.townPayReached);
        expect(built, key).toBeCloseTo(gap * quarterStep, 3);
        if (now.annualSales !== then.annualSales) moved += 1;
      }
      console.log(
        `A71 ${place.displayName}: ${moved} town markets moved their sales in the watched quarter`,
      );
      expect(moved, `${place.displayName}, seed ${seed}`).toBeGreaterThan(0);
    },
  );
});
