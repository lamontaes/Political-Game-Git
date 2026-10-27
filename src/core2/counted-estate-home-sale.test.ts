/**
 * A counted household whose last member dies sells the home it owned, by the
 * same rule as a full household's estate, times the households its record
 * stands for: in a played year in places drawn from all 56, each named with
 * its seed.
 */
import { randomBytes } from "node:crypto";
import { expect, it } from "vitest";
import { buildBenchWorld } from "../bench/world";
import { drawPlace } from "../../scripts/core2-year/place";
import { setBookkeeping } from "./bookkeeping";
import { gameStartDate } from "./game-start";
import type { HomeSale } from "./housing-sale";
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
      const sales = (
        housing.table("sales").rows() as unknown as HomeSale[]
      ).filter((row) => row.reasonKey === "estate.counted-last-owner");
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
        // The lender first, then the rest to the counted residents' fund.
        expect(sale.toLenderMinor, where).toBe(
          Math.min(sale.owedMinor, sale.priceMinor),
        );
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
