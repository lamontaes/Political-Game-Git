import { randomBytes } from "node:crypto";
import { describe, expect, it } from "vitest";
import { buildBenchWorld } from "../bench/world";
import { drawPlace } from "../../scripts/core2-year/place";
import { gameStartDate } from "./game-start";
import { advanceCore } from "./life";
import { addDays, makeIsoDate } from "./kernel/dates";
import { coreAPI } from "./state";
import { stepLogLevel, supportedLog } from "./housing-prices";
import { pastPriceRatio } from "./housing-price-path";
import {
  homeValueToday,
  placePriceLevel,
  priceTrace,
} from "./housing-price-level";
import { sellHome } from "./housing-sale";
import {
  housingMacroParameter as p,
  ownedHomes,
  townFigures,
} from "./modules/housing";

// The home price level (world-home-prices-from-housing): one step from
// causes, and one value rule that every price in the game reads.
const seed = process.env.HOME_PRICE_SEED ?? randomBytes(8).toString("hex");

describe("the price step", () => {
  const steady = { payIndex: 1, ratePct: 6, pressure: 0 };
  const at = supportedLog(1, 6, p);
  const flat = Array.from({ length: 13 }, () => at);

  it("holds where pay and rates support it, and moves with each cause", () => {
    expect(stepLogLevel(at, flat, steady, p)).toBeCloseTo(at, 12);
    // Each cause, alone, in the direction a buyer feels it.
    expect(
      stepLogLevel(at, flat, { ...steady, payIndex: 1.05 }, p),
    ).toBeGreaterThan(at);
    expect(
      stepLogLevel(at, flat, { ...steady, ratePct: 5 }, p),
    ).toBeGreaterThan(at);
    expect(stepLogLevel(at, flat, { ...steady, ratePct: 7 }, p)).toBeLessThan(
      at,
    );
    expect(
      stepLogLevel(at, flat, { ...steady, pressure: 0.004 }, p),
    ).toBeGreaterThan(at);
    expect(
      stepLogLevel(at, flat, { ...steady, pressure: -0.004 }, p),
    ).toBeLessThan(at);
    // Last year's rise carries on a little (momentum).
    const rising = flat.map((v, i) => v + (i - 12) * 0.004);
    expect(stepLogLevel(at, rising, steady, p) - at).toBeGreaterThan(0);
  });

  it("stays bounded over 30 years of a town that always has more buyers, then more sellers", () => {
    for (const pressure of [0.02, -0.02, 0]) {
      let log = at;
      const recent = [...flat];
      const yearly: number[] = [];
      for (let month = 1; month <= 360; month++) {
        log = stepLogLevel(log, recent, { ...steady, pressure }, p);
        recent.push(log);
        recent.shift();
        if (month % 12 === 0) yearly.push(recent.at(-1)! - recent[0]!);
      }
      // A sustained imbalance moves the level to a new resting place, never off without end.
      expect(Math.abs(log - at), `pressure ${pressure}`).toBeLessThan(1);
      expect(
        Math.max(...yearly.map(Math.abs)),
        `pressure ${pressure}`,
      ).toBeLessThan(0.3);
      expect(
        Math.abs(yearly.at(-1)!),
        `pressure ${pressure}: settled`,
      ).toBeLessThan(0.01);
    }
  });
});

it("a sale, an owned home's value, Metrics' typical value and a mortgage's price then all come from the one rule", () => {
  const tried: string[] = [];
  for (let attempt = 0; attempt < 6; attempt += 1) {
    const place = drawPlace(
      attempt ? `${seed}:${attempt}` : seed,
      "home-price",
    );
    const where = `seed ${seed}, ${place.name} (${place.key})`;
    const { core } = buildBenchWorld(place.seed, gameStartDate(), {
      twoLevel: true,
      placeKey: place.key,
    });
    const started = core.date;
    // Two monthly reviews step the level twice.
    advanceCore(core, addDays(makeIsoDate(core.date), 70));
    const api = coreAPI(core);
    const housing = api.moduleState("housing");
    const owner = [...core.households.keys()]
      .sort()
      .find(
        (id) =>
          (
            housing.table("dwellings").get(`dwelling:${id}`) as
              { tenure?: string } | undefined
          )?.tenure === "own",
      );
    const placeId = owner ? core.households.get(owner)!.placeId : undefined;
    const level = placeId ? placePriceLevel(api, placeId) : undefined;
    if (!owner || !level) {
      tried.push(`${where}: no full-tier owner in a place with a price level`);
      continue;
    }
    const stock = housing.table("stock").get(level.stockId) as unknown as {
      priceRead?: { month: string; buyers: number; offered: number };
    };
    // The level stepped from its month's causes, kept for Trace.
    expect(stock.priceRead?.month, where).toBeTruthy();
    const dwelling = housing
      .table("dwellings")
      .get(`dwelling:${owner}`) as unknown as {
      valueMinor: number;
      priceLevel?: number;
    };
    const today = homeValueToday(
      api,
      placeId!,
      dwelling.valueMinor,
      dwelling.priceLevel,
    );
    expect(
      ownedHomes(api, placeId).find((row) => row.householdId === owner)
        ?.valueMinor,
      where,
    ).toBe(today);
    // Metrics' typical home value is the middle of the same values.
    const values = ownedHomes(api, placeId)
      .map((row) => row.valueMinor)
      .filter((v) => v > 0)
      .sort((a, b) => a - b);
    expect(townFigures(api, placeId!).homeValueMinor, where).toBe(
      values[Math.floor(values.length / 2)],
    );
    // A mortgage's price then is today's value moved back along the same path.
    const loan = (
      housing.table("mortgages").rows() as unknown as {
        householdId: string;
        boughtYear: number;
        originalMinor: number;
      }[]
    ).find((row) => row.householdId === owner);
    if (loan && dwelling.priceLevel === undefined) {
      const then =
        dwelling.valueMinor *
        pastPriceRatio(
          { startedAt: started, seed: core.seed },
          started,
          `${loan.boughtYear}-07-01`,
          p,
        );
      const ratio = loan.originalMinor / then;
      // The original loan is the price then less a first or repeat buyer's down payment.
      expect(ratio, where).toBeGreaterThan(0.75);
      expect(ratio, where).toBeLessThan(0.98);
    }
    // The seller gets today's value, and the sale names the level it read.
    const sale = sellHome(api, owner, "test.departure");
    expect(sale?.priceMinor, where).toBe(today);
    const offered = (
      housing.table("stock").get(level.stockId) as unknown as {
        priceOffered: number;
      }
    ).priceOffered;
    expect(
      offered,
      `${where}: the sale is a home offered this month`,
    ).toBeGreaterThanOrEqual(1);
    // Trace's line for the sale names the stock row and the month's causes.
    const trace = priceTrace(api, placeId!);
    expect(trace, where).toContain(level.stockId);
    expect(trace, where).toMatch(/buyers against \d+ homes offered/);
    return;
  }
  throw new Error(`No drawn place had an owner to sell: ${tried.join("; ")}`);
}, 600_000);
