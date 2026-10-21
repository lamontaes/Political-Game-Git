/**
 * A government's charges and fees are paid by the town's households out of
 * their living costs, by what the charges are for. Played world in a place
 * drawn from all 56; the place and seed are named in every failure message.
 * Set GOLDEN_PATH_SEED to reproduce a run.
 */
import { randomBytes } from "node:crypto";
import { expect, it } from "vitest";
import { buildBenchWorld } from "../bench/world";
import { drawPlace } from "../../scripts/core2-year/place";
import { setBookkeeping } from "./bookkeeping";
import {
  serviceChargeShares,
  serviceChargesPaidBy,
} from "./budgets-service-charges";
import { gameStartDate } from "./game-start";
import { addDays, makeIsoDate } from "./kernel/dates";
import { advanceCore } from "./life";
import {
  aidedLines,
  budgetInForce,
  outsideRevenueMonthly,
} from "./budgets-treasury";
import { BUDGETS_MODULE_ID, governments } from "./modules/budgets";
import { coreAPI } from "./state";
import charges from "../../data/research/money/service-charges-2022.json" with { type: "json" };

const seed = process.env.GOLDEN_PATH_SEED ?? randomBytes(16).toString("hex");

it("moves the town's part of each government's charges from households' living costs to its treasury, by service", () => {
  setBookkeeping(false);
  try {
    for (let attempt = 0; attempt < 12; attempt++) {
      const draw = drawPlace(seed, `service-charges-${attempt}`);
      const { core } = buildBenchWorld(draw.seed, gameStartDate(), {
        twoLevel: true,
        placeKey: draw.key,
      });
      const api = coreAPI(core);
      const where = `${draw.key} [${draw.state}], seed ${draw.seed}`;
      const payers = serviceChargeShares(api).filter((row) => row.share > 0);
      // Some places' budgets carry no charges (a territory's): draw again.
      if (!payers.length) continue;
      advanceCore(core, addDays(makeIsoDate(core.date), 75));
      // Households with no cash on the 1st pay none of that month's living
      // cost (world-households-unpaid-living-costs-payday), so a government
      // receives only a share of what was paid: draw again for a town whose
      // households paid at least 85 percent of what they were asked.
      const living = core.finance.totalsByKind.get(
        "household.outside-living-costs",
      );
      if (!living || living.paidMinor < living.requestedMinor * 0.85) continue;
      const services = new Set(
        Object.keys(
          (
            charges.places as unknown as Record<
              string,
              { local: { chargesAndFees: { shares: object } } }
            >
          )[draw.state]!.local.chargesAndFees.shares,
        ),
      );
      for (const row of serviceChargeShares(api).filter((r) => r.share > 0)) {
        const months = serviceChargesPaidBy(api, row.governmentId);
        expect(months.length, `${where} ${row.governmentId}`).toBeGreaterThan(
          0,
        );
        // A full month: households pay what the budget's charges come to for
        // the people the town models, out of living costs they already paid.
        const full = months[months.length - 1]!;
        expect(full.paidMinor, where).toBeGreaterThan(0);
        expect(
          Math.abs(full.paidMinor - row.targetMonthlyMinor),
          `${where} ${row.governmentId}`,
        ).toBeLessThanOrEqual(row.targetMonthlyMinor * 0.15 + 100);
        expect(full.paidMinor, where).toBeLessThanOrEqual(
          row.livingMonthlyMinor,
        );
        // Every dollar is for a service, and the services are the place's.
        const byService = Object.entries(full.byService);
        expect(
          byService.reduce((n, [, v]) => n + v, 0),
          where,
        ).toBe(full.paidMinor);
        for (const [service] of byService)
          if (row.governmentId.startsWith("US-")) continue;
          else expect(services.has(service), `${where} ${service}`).toBe(true);
      }
      // The treasury's outside lump no longer carries what the town pays: the
      // last month's lump is the lump without the households' fees less their
      // part, so a fee dollar replaced a lump dollar.
      const govs = new Map(governments(api).map((g) => [g.id, g]));
      const aided = aidedLines(api);
      const lumps = (
        api
          .moduleState(BUDGETS_MODULE_ID)
          .table("outsideRevenue")
          .rows() as unknown as {
          governmentId: string;
          amountMinor: number;
        }[]
      ).filter((row) => row.governmentId === payers[0]!.governmentId);
      expect(lumps.length, where).toBeGreaterThan(0);
      const gov = govs.get(payers[0]!.governmentId)!;
      const budget = budgetInForce(api, gov.id)!;
      const without = outsideRevenueMonthly(api, gov, budget, aided, false);
      const lump = lumps[lumps.length - 1]!.amountMinor;
      const target = serviceChargeShares(api).find(
        (r) => r.governmentId === gov.id,
      )!.targetMonthlyMinor;
      expect(without - lump, where).toBeGreaterThan(0);
      expect(Math.abs(without - lump - target), where).toBeLessThanOrEqual(
        target * 0.05 + 100,
      );
      expect(core.cashJournal.totals.grossDebitMinor, where).toBe(
        core.cashJournal.totals.grossCreditMinor,
      );
      return;
    }
    throw new Error(`no place with charges paid in 12 draws (seed ${seed})`);
  } finally {
    setBookkeeping(true);
  }
}, 900_000);
