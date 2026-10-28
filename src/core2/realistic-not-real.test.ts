/**
 * The zero-real-data guard (owner, Oct 27: "REALISTIC NOT REAL... IT GOES FOR
 * EVERY STATISTIC UNLESS IT IS IN LAW"). One place drawn from all 56, two
 * played worlds from two seeds. Every audited statistic that has been fixed
 * must differ between the two worlds and from its published row. The audit is
 * docs/reports/real-statistics-in-play-2026-10-27.md; a statistic still copied
 * is listed in NOT_YET with the pool item that fixes it, and the list only
 * shrinks: a fix moves its row into the checks below.
 */
import { randomBytes } from "node:crypto";
import { describe, expect, it } from "vitest";
import { drawPlace } from "../../scripts/core2-year/place";
import { buildBenchWorld } from "../bench/world";
import { setBookkeeping } from "./bookkeeping";
import { gameStartDate } from "./game-start";
import { addDays, makeIsoDate } from "./kernel/dates";
import { advanceCore } from "./life";
import { publishedMonths, type MacroMonth } from "./macro-model";
import { MACRO_MODULE_ID } from "./modules/macro";
import { CREDIT_MODULE_ID } from "./modules/credit";
import { worldGoods } from "./modules/place-prices";
import goodsData from "./data/prices/goods.json" with { type: "json" };
import {
  medianTransactionBalance,
  publishedTransactionBalance,
} from "./starting-cash";
import {
  publishedMonthlyHouseholdLivingCosts,
  worldMonthlyHouseholdLivingCosts,
} from "./reference/living-costs-data";
import { worldBenefitMonthlyMinor } from "./opening-income";
import {
  privateShareOf,
  publishedPrivateShareOf,
  worldPrivateTuitionAnnualUsd,
} from "./opening-private-tuition";
import { OFFICES_MODULE_ID } from "./modules/offices";
import { REGIONAL_MODULE_ID } from "./modules/regional";
import { publishedRegionMonths, type RegionMonth } from "./regional-model";
import { coreAPI } from "./state";
import { parameter } from "./parameters";
import {
  DEFAULT_BUSINESS_BOOKS_DATA,
  publishedBookRatio,
  worldBookRatio,
  type BookRatio,
} from "./business-books";
import unitPriceData from "../../data/research/campaign-reality/campaign-unit-prices.json" with { type: "json" };
import newsData from "../../data/research/press/local-news-2026.json" with { type: "json" };
import { publishedUnionRatePct, worldUnionRatePct } from "./union-rate";
import {
  outsideOwnedShare,
  publishedOutsideOwnedShare,
  publishedStateExitShare,
  stateExitShare,
} from "./modules/business";
import { publishedUnitPrice, unitPrice } from "./modules/campaigns";
import {
  publishedOutletLevels,
  worldOutletCounts,
  type PlaceNews,
} from "./modules/press";
import type { CoreState } from "./types";

/** Audit rows still copied, by the pool item that fixes each. */
export const NOT_YET: Readonly<Record<string, readonly number[]>> = {
  "realistic-regional-and-jobs-per-world": [4, 10, 11, 12, 13],
  "realistic-housing-per-world": [5, 7, 8, 9],
  "realistic-money-and-population-per-world": [28],
  "realistic-base-rates-per-world": [32, 33, 34, 35, 36],
  "realistic-elections-per-world": [42, 44, 45, 48],
  "realistic-budgets-per-world": [50, 51, 52],
  "realistic-school-names-generated": [37],
  "world-disasters-from-conditions": [41],
  // In open PRs: outcome measures and crime (39, 40), county rents and values (6).
  "realistic-outcome-bases-per-world": [39, 40],
  "realistic-county-rent-value-per-world": [6],
};

const seed = process.env.REALISTIC_SEED ?? randomBytes(8).toString("hex");
const place = drawPlace(seed, "realistic-not-real");
const where = `${place.name} (${place.key}), seed ${seed}`;

function world(worldSeed: string): CoreState {
  setBookkeeping(false);
  const { core } = buildBenchWorld(worldSeed, gameStartDate(), {
    twoLevel: true,
    placeKey: place.key,
  });
  // The macro and regional engines record their opening on the first day.
  advanceCore(core, addDays(makeIsoDate(core.date), 2));
  return core;
}

const MACRO_FIGURES = [
  "unemploymentPct",
  "inflationPct",
  "payrollJobsThousands",
  "hourlyEarnings",
  "realOutput",
  "policyRatePct",
  "treasury10Pct",
  "mortgage30Pct",
] as const;
const REGION_FIGURES = [
  "unemploymentPct",
  "jobsThousands",
  "hourlyEarnings",
  "priceLevelPct",
] as const;

describe(`no fixed statistic opens on its published value (${where})`, () => {
  const a = world(`${seed}:a`),
    b = world(`${seed}:b`);
  const p = (key: string) => coreAPI(a).parameter(key);
  const rows = <T>(core: CoreState, module: string, name: string) =>
    coreAPI(core).moduleState(module).table(name).rows() as unknown as T[];

  it("the national economy's opening month (audit rows 1 and 2)", () => {
    const real = publishedMonths(a.startedAt, p).at(-1)!;
    const at = (core: CoreState) =>
      rows<MacroMonth>(core, MACRO_MODULE_ID, "months").find(
        (row) => row.month === real.month,
      )!;
    const ma = at(a),
      mb = at(b);
    expect(ma, `${where}: macro-month:${real.month}`).toBeDefined();
    for (const key of MACRO_FIGURES) {
      expect(ma[key], `${where} ${ma.id} ${key}`).not.toBe(real[key]);
      expect(ma[key], `${where} ${ma.id} ${key}`).not.toBe(mb[key]);
    }
  });

  it("every state's and metro's opening month (audit row 3)", () => {
    const month = publishedMonths(a.startedAt, p).at(-1)!;
    const real = new Map(
      publishedRegionMonths(month, p).map((row) => [row.id, row]),
    );
    const of = (core: CoreState) =>
      new Map(
        rows<RegionMonth>(core, REGIONAL_MODULE_ID, "months")
          .filter((row) => row.month === month.month)
          .map((row) => [row.id, row]),
      );
    const ra = of(a),
      rb = of(b);
    expect(ra.size, where).toBe(real.size);
    for (const [id, row] of ra)
      for (const key of REGION_FIGURES) {
        expect(row[key], `${where} ${id} ${key}`).not.toBe(real.get(id)![key]);
        expect(row[key], `${where} ${id} ${key}`).not.toBe(rb.get(id)![key]);
      }
  });

  it("every sitting holder's winning share (audit row 46)", () => {
    const shares = (core: CoreState) =>
      new Map(
        rows<{ id: string; elected?: { share: number } }>(
          core,
          OFFICES_MODULE_ID,
          "terms",
        ).flatMap((t) => (t.elected ? [[t.id, t.elected.share] as const] : [])),
      );
    const sa = shares(a),
      sb = shares(b);
    expect(sa.size, where).toBeGreaterThan(1);
    // One figure per office kind was the copy; a drawn share is its own.
    expect(new Set(sa.values()).size, where).toBe(sa.size);
    for (const [id, share] of sa)
      if (sb.has(id)) expect(share, `${where} ${id}`).not.toBe(sb.get(id));
  });

  it("household money: opening cash, living costs and goods, Social Security, the town bank, private schools (audit rows 14 to 18)", () => {
    const pay = 60_000;
    const cash = (core: CoreState) => medianTransactionBalance(pay, core.seed);
    expect(cash(a), `${where} row 14`).not.toBe(
      publishedTransactionBalance(pay),
    );
    expect(cash(a), `${where} row 14`).not.toBe(cash(b));
    const region = "national" as const;
    const living = (core: CoreState) =>
      worldMonthlyHouseholdLivingCosts(core.seed, region, 3).monthlyMinor;
    expect(living(a), `${where} row 15`).not.toBe(
      publishedMonthlyHouseholdLivingCosts(region, 3).monthlyMinor,
    );
    expect(living(a), `${where} row 15`).not.toBe(living(b));
    const fuel = (core: CoreState) =>
      worldGoods(core.seed).goods.fuel.ceAnnualMinor;
    expect(fuel(a), `${where} row 15 goods`).not.toBe(
      goodsData.goods.fuel.ceAnnualMinor,
    );
    expect(fuel(a), `${where} row 15 goods`).not.toBe(fuel(b));
    const benefit = (core: CoreState) =>
      worldBenefitMonthlyMinor(190_000, core.seed);
    expect(benefit(a), `${where} row 16`).not.toBe(190_000);
    expect(benefit(a), `${where} row 16`).not.toBe(benefit(b));
    const bank = (core: CoreState) =>
      (
        coreAPI(core)
          .moduleState(CREDIT_MODULE_ID)
          .table("banks")
          .get("credit:bank") as { openingEquityMinor: number } | undefined
      )?.openingEquityMinor;
    if (bank(a) !== undefined)
      expect(bank(a), `${where} row 17 credit:bank`).not.toBe(bank(b));
    const key = a.placeMetadata.placeKey;
    const share = (core: CoreState) =>
      privateShareOf(undefined, key, core.seed);
    expect(share(a), `${where} row 18`).not.toBe(
      publishedPrivateShareOf(undefined, key),
    );
    expect(share(a), `${where} row 18`).not.toBe(share(b));
    expect(worldPrivateTuitionAnnualUsd(a.seed), `${where} row 18`).not.toBe(
      worldPrivateTuitionAnnualUsd(b.seed),
    );
    process.stdout.write(
      `MONEY ${where}: cash ${Math.round(cash(a))} against ${Math.round(cash(b))}, bank ${bank(a)} against ${bank(b)}\n`,
    );
  });

  it("business closures and outside ownership, union membership, IRS ratios, local news outlets and campaign prices (audit rows 21, 22, 24, 26, 27)", () => {
    const differs = (
      what: string,
      mine: number,
      real: number,
      other: number,
    ) => {
      expect(mine, `${where} ${what}: published`).not.toBe(real);
      expect(mine, `${where} ${what}: other world`).not.toBe(other);
    };
    const apiA = coreAPI(a),
      apiB = coreAPI(b);
    // Row 21: the share of businesses that close in a year, and of jobs in outside-owned firms.
    differs(
      "exit share",
      stateExitShare(apiA),
      publishedStateExitShare(apiA),
      stateExitShare(apiB),
    );
    differs(
      "outside-owned share",
      outsideOwnedShare(apiA),
      publishedOutsideOwnedShare(apiA),
      outsideOwnedShare(apiB),
    );
    // Row 22: the state's union membership rate.
    const state = a.placeMetadata?.housingState;
    differs(
      "union rate",
      worldUnionRatePct(a.seed, state),
      publishedUnionRatePct(state),
      worldUnionRatePct(b.seed, state),
    );
    // Row 24: margin, payroll share and sales-sensitive cost share of every kind of business.
    const p = (key: string) => parameter(key);
    for (const kind of DEFAULT_BUSINESS_BOOKS_DATA.kinds)
      for (const which of [
        "margin",
        "payrollShare",
        "salesCostShare",
      ] as BookRatio[])
        differs(
          `${kind.id} ${which}`,
          worldBookRatio(a.seed, kind, which, p),
          publishedBookRatio(kind, which, p),
          worldBookRatio(b.seed, kind, which, p),
        );
    // Row 26: outlets of each kind across the states' counts (a town that has the whole state's share).
    const places = Object.values(
      (newsData as unknown as { places: Record<string, PlaceNews> }).places,
    );
    expect(places.length, where).toBeGreaterThan(0);
    for (const kind of ["newspaper", "television", "radio"] as const) {
      const total = (read: (counts: PlaceNews) => number) =>
        places.reduce((sum, counts) => sum + read(counts), 0);
      differs(
        `${kind} outlets across states`,
        total((c) => worldOutletCounts(a.seed, c, 1)[kind]),
        total((c) => Math.round(publishedOutletLevels(c, 1)[kind])),
        total((c) => worldOutletCounts(b.seed, c, 1)[kind]),
      );
    }
    // Row 27: every price the market sets; what the Postal Service or a law sets stays as published.
    for (const [kind, row] of Object.entries(
      (
        unitPriceData as unknown as {
          prices: Record<string, { setByLaw?: boolean }>;
        }
      ).prices,
    ))
      if (row.setByLaw) {
        expect(unitPrice(apiA, kind), `${where} ${kind}`).toBe(
          publishedUnitPrice(kind),
        );
        expect(unitPrice(apiB, kind), `${where} ${kind}`).toBe(
          publishedUnitPrice(kind),
        );
      } else
        differs(
          `price of ${kind}`,
          unitPrice(apiA, kind),
          publishedUnitPrice(kind),
          unitPrice(apiB, kind),
        );
  });

  it("lists every audited statistic still copied, with the item that fixes it", () => {
    const rowsLeft = Object.values(NOT_YET).flat();
    expect(new Set(rowsLeft).size).toBe(rowsLeft.length);
    process.stdout.write(
      `REALISTIC ${where}: ${rowsLeft.length} audited rows still copied, in ${Object.keys(NOT_YET).length} items\n`,
    );
  });
});
