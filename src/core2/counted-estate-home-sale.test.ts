/**
 * A counted household whose last member dies puts the home it owned on the
 * market, by the same rule as a full household's estate, times the
 * households its record stands for; when buyers take it, the lender is paid
 * first from what they paid and the rest goes to the counted residents. In a
 * played year in places drawn from all 56, each named with its seed; a home
 * still for sale at the year's end is bought by a buyer from outside the town.
 */
import { randomBytes } from "node:crypto";
import { expect, it } from "vitest";
import { buildBenchWorld } from "../bench/world";
import { drawPlace } from "../../scripts/core2-year/place";
import { setBookkeeping } from "./bookkeeping";
import { gameStartDate } from "./game-start";
import type { HomeSale } from "./housing-sale";
import { buyListedHome } from "./housing-sale-buyer-fixture";
import { townOutsideOf } from "./opening-outside-market";
import { addDays, makeIsoDate } from "./kernel/dates";
import { advanceCore } from "./life";
import { coreAPI } from "./state";

const PLACES = 4;

it(
  "sells a counted household's home when its last member dies, the lender first and the rest to the counted residents",
  () => {
    const tried: string[] = [];
    for (let n = 0; n < PLACES; n++) {
      const draw = drawPlace(
        randomBytes(32).toString("hex"),
        `counted-estate-home:${n}`,
      );
      setBookkeeping(false);
      const { core } = buildBenchWorld(draw.seed, gameStartDate(), {
        twoLevel: true,
        placeKey: draw.key,
      });
      const api = coreAPI(core);
      advanceCore(core, addDays(makeIsoDate(core.date), 365));
      const label = `${draw.name} (${draw.key}) seed ${draw.seed}`;
      const housing = api.moduleState("housing");
      let sales = (
        housing.table("sales").rows() as unknown as HomeSale[]
      ).filter((row) => row.reasonKey === "estate.counted-last-owner");
      // Still for sale: on the market and still the estate's. A counted sale
      // stands for several homes, and buyers can take some of them before the
      // rest (closeSale); what they paid is the price so far. The old premise,
      // "nothing paid while listed", was false for a partly bought sale.
      for (const sale of sales.filter((row) => row.status === "listed")) {
        const bought = (sale.boughtBy ?? []).length > 0;
        expect(sale.priceMinor > 0, sale.id).toBe(bought);
        expect(sale.homesLeft < sale.homes, sale.id).toBe(bought);
        expect(sale.settledEventId, sale.id).toBeUndefined();
        expect(
          (
            housing.table("dwellings").get(`dwelling:${sale.householdId}`) as
              { tenure?: string } | undefined
          )?.tenure,
          sale.id,
        ).toBe("listed");
      }
      // If none sold in the year, a buyer from outside the town takes the first one.
      if (sales.length && !sales.some((row) => row.status === "sold"))
        buyListedHome(
          api,
          sales[0]!.id,
          townOutsideOf(core.organizations.values(), sales[0]!.placeId)!.id,
        );
      sales = (housing.table("sales").rows() as unknown as HomeSale[]).filter(
        (row) =>
          row.reasonKey === "estate.counted-last-owner" &&
          row.status === "sold",
      );
      tried.push(`${label}: ${sales.length} counted estate sales`);
      if (!sales.length) continue;
      for (const sale of sales) {
        const where = `${label} ${sale.id}`;
        expect(sale.id, where).toBe(
          `home-sale:${sale.householdId}:${sale.date}`,
        );
        // The estate: the counted dead, and the month's counts that record it.
        expect(sale.decedentId, where).toBeTruthy();
        expect(sale.deathEventId, where).toMatch(/:\d{4}-\d{2}$/);
        expect(sale.settledEventId, where).toBe(sale.deathEventId);
        expect(sale.priceMinor, where).toBeGreaterThan(0);
        // The lender first (what was owed when listed, and its interest while for sale), then the rest to the counted residents' fund.
        expect(sale.toLenderMinor, where).toBeGreaterThanOrEqual(
          Math.min(sale.owedMinor, sale.priceMinor),
        );
        expect(sale.toLenderMinor, where).toBeLessThanOrEqual(sale.priceMinor);
        expect(sale.boughtBy?.length, where).toBeGreaterThan(0);
        expect(sale.surplusMinor, where).toBe(
          sale.priceMinor - sale.toLenderMinor,
        );
        expect(sale.paid, where).toEqual([
          { toId: sale.paid![0]!.toId, amountMinor: sale.surplusMinor },
        ]);
        expect(
          (
            housing.table("dwellings").get(`dwelling:${sale.householdId}`) as
              { tenure?: string } | undefined
          )?.tenure,
          where,
        ).toBe("sold");
        for (const id of sale.mortgageIds)
          expect(
            (housing.table("mortgages").get(id) as { balanceMinor?: number })
              .balanceMinor,
            `${where} ${id}`,
          ).toBe(0);
      }
      expect(core.cashJournal.totals.grossDebitMinor, label).toBe(
        core.cashJournal.totals.grossCreditMinor,
      );
      const first = sales[0]!;
      process.stdout.write(
        `counted estate home sale: ${label}; ${sales.length} sold; ${first.id} for ${first.decedentId} (${first.deathEventId}), price ${first.priceMinor}, lender ${first.toLenderMinor}, surplus ${first.surplusMinor} to ${first.paid?.[0]?.toId}\n`,
      );
      return;
    }
    throw new Error(`no counted home sold in a year: ${tried.join("; ")}`);
    // A drawn town's played year took 36 to 184 seconds on a 4-core
    // container; up to PLACES of them.
  },
  PLACES * 300_000,
);
