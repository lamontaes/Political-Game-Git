/**
 * A renter household's monthly choice to buy a home comes out in favor of
 * buying when its own reasons pull that way (pool item
 * world-renters-can-choose-to-buy): children at home, the head's age, years in
 * the lease and savings beyond the down payment, against the cost and the
 * down payment. The played world at Shorewood, Wisconsin; a year, and the
 * share of full renter households that bought against the NAR first-time
 * buyer share.
 *
 * Pinned (tests-housing-sale-tests-draw-from-the-clock): the old test drew up
 * to twelve places from randomBytes until 60 full renter households and one
 * purchase added up, on the premise that a few draws always get there.
 * Shorewood at this seed has 309 full renter households, 10 of whom bought.
 */
import { expect, it } from "vitest";
import { buildBenchWorld } from "../bench/world";
import { setBookkeeping } from "./bookkeeping";
import { gameStartDate } from "./game-start";
import { addDays, makeIsoDate } from "./kernel/dates";
import { advanceCore } from "./life";
import { coreAPI } from "./state";

const SHOREWOOD = {
  name: "Shorewood, Wisconsin",
  key: "5573725",
  seed: "63e6d07daab9ec4fa70605b68e661dd6230c07ea9bcf3594e93c194b88076804",
};

it("full renter households buy a home in a played year, each purchase naming the reasons that decided it", () => {
  setBookkeeping(false);
  let renters = 0;
  const bought: {
    where: string;
    id: string;
    reasons?: Record<string, number>;
  }[] = [];
  const seen: string[] = [];
  {
    const place = SHOREWOOD;
    const where = `${place.name} (${place.key}), seed ${place.seed}`;
    const { core } = buildBenchWorld(place.seed, gameStartDate(), {
      twoLevel: true,
      placeKey: place.key,
    });
    const api = coreAPI(core);
    const here = new Set(
      [...core.finance.contracts]
        .filter(([id, row]) => id.startsWith("lease:") && !row.endedAt)
        .map(([, row]) => row.householdId),
    ).size;
    advanceCore(core, addDays(makeIsoDate(core.date), 366));
    // Full renter households' purchases (counted renters buy too: housing-counted-buy.test.ts).
    const rows = (
      api.moduleState("housing").table("purchases").rows() as unknown as {
        id: string;
        counted?: boolean;
        reasons?: Record<string, number>;
      }[]
    ).filter((row) => !row.counted);
    renters += here;
    for (const row of rows) bought.push({ where, ...row });
    seen.push(`${where}: ${rows.length} of ${here}`);
  }
  const share = renters ? bought.length / renters : 0;
  const detail = `${seen.join("; ")} (${(share * 100).toFixed(1)}% of ${renters} full renter households)`;
  expect(renters, detail).toBeGreaterThanOrEqual(60);
  expect(bought.length, detail).toBeGreaterThan(0);
  // The NAR first-time buyer count is about 2 to 3 percent of renter
  // households a year; a handful of towns sits within a few times that.
  expect(share, detail).toBeLessThanOrEqual(0.1);
  for (const row of bought) {
    expect(row.reasons, `${row.where} ${row.id}`).toBeDefined();
    expect(Object.keys(row.reasons!), `${row.where} ${row.id}`).toEqual(
      expect.arrayContaining([
        "baseline",
        "cost",
        "down",
        "children",
        "age",
        "tenure",
        "savings",
      ]),
    );
  }
  // About 276 s measured: building Shorewood and its played year (renters weigh buying only on played days).
}, 560_000);
