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
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { drawPlace } from "../../scripts/core2-year/place";
import { buildBenchWorld } from "../bench/world";
import { setBookkeeping } from "./bookkeeping";
import { gameStartDate } from "./game-start";
import { addDays, makeIsoDate } from "./kernel/dates";
import { advanceCore } from "./life";
import { publishedMonths, type MacroMonth } from "./macro-model";
import { MACRO_MODULE_ID } from "./modules/macro";
import {
  placeReferencePopulation,
  publishedPlaceReferencePopulation,
} from "./gov-rules/place-population";
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
import { federalDebtOf } from "./budgets-treasury";
import debtData from "./data/budgets/federal-debt.json" with { type: "json" };
import federalBudget from "../../data/research/money/federal-budget-fy2025.json" with { type: "json" };
import { publishedStateStake, stateStake } from "./budget-stakes";
import { serviceChargeShares } from "./budgets-service-charges";
import { lawChain } from "./modules/laws";
import { OFFICES_MODULE_ID } from "./modules/offices";
import { REGIONAL_MODULE_ID } from "./modules/regional";
import { publishedRegionMonths, type RegionMonth } from "./regional-model";
import { CONDITION_PACK, conditionPrevalence } from "./condition-pack";
import { coreAPI } from "./state";
import {
  seasonalStaffing,
  bandRatio,
  publishedBandRatio,
} from "./modules/jobs";
import { residentsRuntime } from "./modules/residents";
import ageUnemployment from "./data/jobs/age-unemployment.json" with { type: "json" };
import seasonal from "./data/jobs/seasonal.json" with { type: "json" };
import {
  DEFAULT_RESIDENT_EMPLOYMENT,
  publishedResidentEmploymentRate,
  type OpeningEmploymentAllocation,
} from "./opening-employment";
import { parameter } from "./parameters";
import { corePlaceByKey, searchCorePlaces } from "./place-lookup";
import PLACE_EARNINGS from "./data/place-earnings-2024.json" with { type: "json" };
import { placeEarningsOf, publishedPlaceEarnings } from "./residents";
import { TOWN_JOB_SOC } from "./reference/town-job-soc";
import {
  publishedTownWorkplaceWeights,
  townWorkplaceWeights,
} from "./town-employment-mix";
import {
  nationalMedianAnnualWage,
  townJobRate,
  townPayAreas,
  townPayPercentile,
} from "./town-pay";
import {
  publishedHudRentRowFor,
  publishedHudStateRentRow,
  hudRentRowFor,
  hudStateRentRow,
} from "./hud-rents";
import { permitRates, publishedPermitRates } from "./housing-construction";
import { publishedShelterRateFor, shelterRateFor } from "./housing-homeless";
import { homePriceRatio, publishedHomePriceRatio } from "./housing-prices";
import { worldRateFactor, type BaseRateTable } from "./world-base-rates";
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
import { PAST_MODULE_ID } from "./past-module";
import { publishedSupportShare, supportShare } from "./campaign-views";
import supportData from "../../data/research/campaigns/policy-support-2026.json" with { type: "json" };
import type { CoreState } from "./types";

/** Audit rows still copied, by the pool item that fixes each. */
export const NOT_YET: Readonly<Record<string, readonly number[]>> = {
  "realistic-elections-per-world": [42, 45],
  "realistic-school-names-generated": [37],
  "world-disasters-from-conditions": [41],
};
// Drawn, each with its own two-world test: row 6 in housing-world.test.ts,
// rows 39 and 40 in outcome-bases-world.test.ts, row 50 in
// budgets-world.test.ts; rows 51 and 52 below.

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

  it("house prices, the old core's county home value, HUD rents, shelter beds and permits (audit rows 5, 7, 8, 9)", () => {
    const differs = (
      what: string,
      mine: number,
      real: number,
      other: number,
    ) => {
      expect(mine, `${where} ${what}: published`).not.toBe(real);
      expect(mine, `${where} ${what}: other world`).not.toBe(other);
    };
    const usps = place.state.slice(3);
    const jurisdiction = corePlaceByKey(place.key)!.context.jurisdiction.id;
    // Row 5: how far a home's price moved from the ACS value date to the start.
    for (const from of ["2015-07-01", "2022-07-01"])
      differs(
        `home price ratio since ${from}`,
        homePriceRatio(usps, from, a.date, a.seed),
        publishedHomePriceRatio(usps, from, a.date),
        homePriceRatio(usps, from, a.date, b.seed),
      );
    // Row 7, the old core's county median home value, is checked beside its
    // reader (src/simulation/county-home-value-world.test.ts): nothing here
    // imports the old core.
    // Row 8: HUD fair market rents and the very low income limit, the place's
    // area (the state's average where HUD has none) at every bedroom count.
    const rows = (
      read: (s?: string) => ReturnType<typeof hudStateRentRow> | null,
    ) => ({
      mine: read(a.seed)!,
      real: read()!,
      other: read(b.seed)!,
    });
    const area = rows((s) =>
      s === undefined
        ? (publishedHudRentRowFor(jurisdiction) ??
          publishedHudStateRentRow(place.state))
        : (hudRentRowFor(jurisdiction, s) ?? hudStateRentRow(place.state, s)),
    );
    // One factor moves an area's whole row and each cell is rounded to the
    // dollar, so two worlds with close factors can share a cell (Cataula,
    // Georgia, seed 80e1c5b9f2b35bea: a $924 studio in both). Each cell is
    // off the published one (the floor share guarantees it); the worlds'
    // rows, income limits included, differ as a whole.
    area.mine.rents.forEach((rent, bedrooms) =>
      expect(
        rent,
        `${where} HUD rent, ${bedrooms} bedrooms (${area.mine.area}): published`,
      ).not.toBe(area.real.rents[bedrooms]!),
    );
    const whole = (row: typeof area.mine) =>
      JSON.stringify([row.rents, row.veryLow4, row.low4]);
    expect(
      whole(area.mine),
      `${where} HUD row (${area.mine.area}): other world`,
    ).not.toBe(whole(area.other));
    // Row 9: shelter beds and permits per the state's people.
    differs(
      `shelter beds per 10,000 in ${usps}`,
      shelterRateFor(usps, a.seed),
      publishedShelterRateFor(usps),
      shelterRateFor(usps, b.seed),
    );
    for (const kind of ["singlePerThousand", "multiPerThousand"] as const)
      differs(
        `permits ${kind} in ${usps}`,
        permitRates(usps, a.seed)[kind],
        publishedPermitRates(usps)[kind],
        permitRates(usps, b.seed)[kind],
      );
  });

  it("age unemployment, seasonal staffing, employment rates, pay, sector mix and place earnings (audit rows 4, 10, 11, 12, 13)", () => {
    const differs = (
      what: string,
      mine: number,
      real: number,
      other: number,
    ) => {
      expect(mine, `${where} ${what}: published`).not.toBe(real);
      expect(mine, `${where} ${what}: other world`).not.toBe(other);
    };
    // Row 4: each age band's unemployment ratio, and each industry's season.
    ageUnemployment.bands.forEach((_, i) =>
      differs(
        `age band ${i}`,
        bandRatio(i, a.seed),
        publishedBandRatio(i),
        bandRatio(i, b.seed),
      ),
    );
    for (const kind of Object.keys(seasonal.kinds)) {
      const at = (s?: string) =>
        seasonalStaffing(kind, "2027-07-15", "2027-01-15", s);
      differs(`season of ${kind}`, at(a.seed), at(), at(b.seed));
    }
    // Row 10: every age band's employed share, read from the opening's receipt.
    const bands = (core: CoreState) =>
      new Map(
        (
          JSON.parse(
            core.placeMetadata!.openingEmploymentReceipt!,
          ) as OpeningEmploymentAllocation["receipt"]
        ).ageTargets.map((row) => [row.key, row]),
      );
    const rowsA = bands(a),
      rowsB = bands(b);
    expect(rowsA.size, where).toBeGreaterThan(0);
    for (const [key, row] of rowsA) {
      const [county, ageId] = key.split(":") as [string, string];
      const def = [
        ...DEFAULT_RESIDENT_EMPLOYMENT.countyAgeRows,
        ...DEFAULT_RESIDENT_EMPLOYMENT.nationalAgeRows,
      ].find((r) => r.id === ageId)!;
      const real = publishedResidentEmploymentRate(
        parameter(def.minimumAgeParameter),
        county === "missing-county" ? undefined : county,
      )!;
      differs(
        `employed share ${key}`,
        row.rate,
        real.rate,
        rowsB.get(key)?.rate ?? NaN,
      );
    }
    // Row 11: pay for every occupation in the place, and the tenure rule.
    const jurisdiction = corePlaceByKey(place.key)!.context.jurisdiction.id;
    const localA: number[] = [],
      localB: number[] = [];
    for (const occupation of Object.keys(TOWN_JOB_SOC)) {
      const national = nationalMedianAnnualWage(occupation);
      if (national !== null)
        differs(
          `national pay ${occupation}`,
          nationalMedianAnnualWage(occupation, a.seed)!,
          national,
          nationalMedianAnnualWage(occupation, b.seed)!,
        );
      const local = (s?: string) =>
        townJobRate(occupation, jurisdiction, 50, 0, s)?.hourlyMinor;
      if (local() !== undefined) {
        expect(
          local(a.seed),
          `${where} local pay ${occupation}: published`,
        ).not.toBe(local());
        localA.push(local(a.seed)!);
        localB.push(local(b.seed)!);
      }
    }
    // An hourly rate rounds to the cent, so two worlds can share one
    // occupation's rate (Southgate, Michigan, seed 724f31c69c6190c5: a hotel
    // clerk at $17.18 in both); the worlds' local pay differs as a whole. A
    // territory outside the BLS wage areas has no local rate for any
    // occupation, so its row is empty in both worlds for a data reason and
    // its jobs read the national pay checked above (Leusoali'i, American
    // Samoa, seed 1564c1a4803378be).
    if (localA.length === 0)
      expect(
        townPayAreas(jurisdiction),
        `${where} local pay: empty with a wage area`,
      ).toEqual([]);
    else
      expect(localA.join(), `${where} local pay: other world`).not.toBe(
        localB.join(),
      );
    for (const years of [0, 5, 20])
      differs(
        `pay percentile at ${years} years`,
        townPayPercentile(years, a.seed),
        townPayPercentile(years),
        townPayPercentile(years, b.seed),
      );
    // Row 12: the weight of every workplace kind the town's mix puts jobs in.
    const real = publishedTownWorkplaceWeights(jurisdiction);
    const wa = townWorkplaceWeights(jurisdiction, a.seed),
      wb = townWorkplaceWeights(jurisdiction, b.seed);
    for (const [kind, weight] of real)
      if (weight > 0)
        differs(
          `workplace weight ${kind}`,
          wa.get(kind)!,
          weight,
          wb.get(kind)!,
        );
    // Row 13: median earnings of every place with a published figure.
    for (const key of Object.keys(PLACE_EARNINGS.byPlace))
      differs(
        `place earnings ${key}`,
        placeEarningsOf(key, a.seed)!,
        publishedPlaceEarnings(key)!,
        placeEarningsOf(key, b.seed)!,
      );
    // The played world reads it: the counted workers the opening left unplaced
    // are paid the place's median earnings as this world draws them. The
    // residents engine re-spreads a flow's workers over the jobless records it
    // finds (modules/residents.ts, unplacedPerWorker), so the pay a worker is
    // checked against the published figure, not to the cent against the draw.
    const earned = publishedPlaceEarnings(place.key);
    const flows = [...(residentsRuntime(a)?.flows.values() ?? [])].filter(
      (flow) =>
        flow.id.startsWith("residents:unplaced-wages:") &&
        (flow.unplacedWorkers ?? 0) > 0,
    );
    if (earned !== undefined)
      for (const flow of flows) {
        const annual =
          (flow.amountMinor * 365) / (14 * (flow.unplacedWorkers ?? 1)) / 100;
        expect(annual, `${where} ${flow.id}`).not.toBeCloseTo(earned, 0);
      }
  });

  it("each world's death, birth, moving, chronic-condition and time-use tables differ from the published ones and from the other world (audit rows 32 to 36)", () => {
    const tables: BaseRateTable[] = [
      "mortality",
      "natality",
      "movers",
      "conditions",
      "timeUse",
    ];
    for (const table of tables) {
      const fa = worldRateFactor(coreAPI(a).state.seed, table);
      const fb = worldRateFactor(coreAPI(b).state.seed, table);
      expect(fa, `${where} ${table}`).not.toBe(1);
      expect(fa, `${where} ${table}`).not.toBe(fb);
    }
    // The chronic-condition rate a person is held to, read through the
    // function play uses, differs per world and from the published share.
    const age = 55;
    for (const condition of CONDITION_PACK.filter(
      (c) => !c.infant && !c.childhood,
    )) {
      const published = conditionPrevalence(condition, age, "equal-mixture");
      if (published === 0 || published >= 1) continue;
      const ra = conditionPrevalence(
        condition,
        age,
        "equal-mixture",
        worldRateFactor(coreAPI(a).state.seed, "conditions"),
      );
      const rb = conditionPrevalence(
        condition,
        age,
        "equal-mixture",
        worldRateFactor(coreAPI(b).state.seed, "conditions"),
      );
      expect(ra, `${where} ${condition.key}`).not.toBe(published);
      expect(ra, `${where} ${condition.key}`).not.toBe(rb);
    }
  });

  it("every play reader of those tables reads the world's factor", () => {
    for (const file of [
      "births-counted.ts",
      "modules/counted-moves.ts",
      "modules/health.ts",
      "modules/moves.ts",
      "free-block.ts",
    ])
      expect(
        readFileSync(new URL(`./${file}`, import.meta.url), "utf8"),
        file,
      ).toContain("worldRateFactor(");
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

  it("the town's population (audit row 28)", () => {
    const town = corePlaceByKey(place.key);
    const geoid = town?.sourceGeoid;
    const real = geoid
      ? publishedPlaceReferencePopulation(geoid)?.value
      : undefined;
    const size = (core: CoreState) =>
      Number(core.placeMetadata.referencePopulation);
    if (real === undefined || !town) return;
    expect(size(a), `${where} referencePopulation: published`).not.toBe(real);
    expect(size(a), `${where} referencePopulation: the engine's draw`).toBe(
      placeReferencePopulation(geoid!, a.seed)?.value,
    );
    // A count is whole and a small town's spread is a few people, so two
    // worlds can draw one town's count alike (Branchville, Virginia, seed
    // 709839a49d0953f4: 116 in both against 119 published). The world's
    // populations differ as a row: the town with the other places of its
    // state, which the coarse-place engine draws by the same rule.
    const others = [
      ...searchCorePlaces("", Number.MAX_SAFE_INTEGER, {
        stateJurisdictionKey: town.stateJurisdictionKey,
        scope: "locality",
      }),
    ]
      .filter(
        (p) =>
          p.key !== town.key &&
          p.sourceGeoid &&
          publishedPlaceReferencePopulation(p.sourceGeoid),
      )
      .sort((p, q) => p.key.localeCompare(q.key))
      .slice(0, 12)
      .map((p) => p.sourceGeoid!);
    const row = (core: CoreState) =>
      [
        size(core),
        ...others.map((g) => placeReferencePopulation(g, core.seed)?.value),
      ].join();
    expect(row(a), `${where} populations: other world`).not.toBe(row(b));
    process.stdout.write(
      `POPULATION ${where}: ${size(a)} and ${size(b)} against ${real} published; ${others.length} other places in the row\n`,
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
    // A state's count is whole and most states hold a few stations, so two
    // worlds' totals can coincide (Aunu'u, American Samoa, seed
    // 0099ec5284330be1: 325 television stations in both); each kind's total
    // differs from the published one, and the states' counts differ between
    // worlds as a row.
    for (const kind of ["newspaper", "television", "radio"] as const) {
      const total = (read: (counts: PlaceNews) => number) =>
        places.reduce((sum, counts) => sum + read(counts), 0);
      expect(
        total((c) => worldOutletCounts(a.seed, c, 1)[kind]),
        `${where} ${kind} outlets across states: published`,
      ).not.toBe(total((c) => Math.round(publishedOutletLevels(c, 1)[kind])));
    }
    const outletRow = (seed: string) =>
      places
        .map((c) => {
          const n = worldOutletCounts(seed, c, 1);
          return `${n.newspaper}/${n.television}/${n.radio}`;
        })
        .join();
    expect(outletRow(a.seed), `${where} outlets: other world`).not.toBe(
      outletRow(b.seed),
    );
    // Row 27: every price the market sets; what the Postal Service or a law sets stays as published.
    const marketA: number[] = [],
      marketB: number[] = [];
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
      } else {
        expect(
          unitPrice(apiA, kind),
          `${where} price of ${kind}: published`,
        ).not.toBe(publishedUnitPrice(kind));
        marketA.push(unitPrice(apiA, kind));
        marketB.push(unitPrice(apiB, kind));
      }
    // A price rounds to the cent, so two worlds can share one small price
    // (Branchville, Virginia, seed 709839a49d0953f4: a 16-cent mailer in both
    // against 20 published); the market's prices differ as a whole.
    expect(marketA.length, `${where} market prices`).toBeGreaterThan(0);
    expect(marketA.join(), `${where} market prices: other world`).not.toBe(
      marketB.join(),
    );
  });
  it("the federal debt, its holders, the payees' and charges' mixes and the states' federal stakes (audit rows 51 and 52)", () => {
    // What each holder held at the opening: its balance less what it lent since.
    const debt = (core: CoreState) =>
      new Map(
        federalDebtOf(coreAPI(core)).map((r) => [
          r.id,
          r.balanceMinor - r.borrowedMinor,
        ]),
      );
    const da = debt(a),
      db = debt(b);
    const held = Math.round(
      federalBudget.debtHeldByPublic[
        debtData.balanceAsOf as keyof typeof federalBudget.debtHeldByPublic
      ]! * 100,
    );
    expect(da.size, where).toBeGreaterThan(1);
    for (const h of debtData.holders) {
      const opening = da.get(h.id)!;
      expect(opening, `${where} federal-debt ${h.id}`).not.toBe(db.get(h.id));
      expect(
        opening,
        `${where} federal-debt ${h.id} against the published share`,
      ).not.toBe(Math.round(held * h.share));
    }
    const total = (m: Map<string, number>) =>
      [...m.values()].reduce((x, y) => x + y, 0);
    expect(total(da), `${where} federal debt`).not.toBe(total(db));
    expect(total(da), `${where} federal debt against the published`).not.toBe(
      held,
    );
    // Each government's charges mix, by service.
    const charges = (core: CoreState) =>
      new Map(
        serviceChargeShares(coreAPI(core)).flatMap((row) =>
          row.services.map((s) => [`${row.id}:${s.service}`, s.share] as const),
        ),
      );
    const ca = charges(a),
      cb = charges(b);
    for (const [id, share] of ca)
      if (cb.has(id)) expect(share, `${where} ${id}`).not.toBe(cb.get(id));
    // The state's stake in each federal line it has one in.
    const stateKey = lawChain(coreAPI(a)).stateKey;
    let stakes = 0;
    for (const line of [
      "nationalDefense",
      "health",
      "socialSecurity",
      "medicare",
      "transportation",
    ]) {
      const q = `budget-line:${line}`;
      const real = publishedStateStake(stateKey, q);
      if (real === 1) continue;
      stakes += 1;
      const sa = stateStake(coreAPI(a), stateKey, q);
      expect(sa, `${where} ${stateKey} ${q}`).not.toBe(real);
      expect(sa, `${where} ${stateKey} ${q}`).not.toBe(
        stateStake(coreAPI(b), stateKey, q),
      );
    }
    process.stdout.write(
      `TREASURY ${where}: ${da.size} debt holders, ${ca.size} charge shares, ${stakes} stakes\n`,
    );
  });

  it("past races' votes cast and the national polls on policy questions (audit rows 44 and 48)", () => {
    // Row 44: every race before the start both worlds hold. A recorded
    // total (a House, Senate or presidential race) is the same in every world
    // unless drawn, so each race of a thousand votes or more must differ (a
    // race of a few hundred can land on the same count twice).
    const races = (core: CoreState) =>
      new Map(
        (
          coreAPI(core)
            .moduleState(PAST_MODULE_ID)
            .table("elections")
            .rows() as unknown as { id: string; totalVotes: number }[]
        ).map((row) => [row.id, row.totalVotes]),
      );
    const racesA = races(a),
      racesB = races(b);
    const shared = [...racesA.keys()].filter((id) => racesB.has(id));
    expect(shared.length, `${where} row 44: past races`).toBeGreaterThan(0);
    const large = shared.filter(
      (id) => racesA.get(id)! >= 1000 && racesB.get(id)! >= 1000,
    );
    for (const id of large)
      expect(racesA.get(id), `${where} row 44 ${id}`).not.toBe(racesB.get(id));
    const cast = (held: Map<string, number>) =>
      shared.reduce((n, id) => n + held.get(id)!, 0);
    // Row 48: every question's national polled share.
    const questions = Object.keys(
      (supportData as unknown as { questions: Record<string, unknown> })
        .questions,
    );
    expect(questions.length, where).toBeGreaterThan(0);
    for (const question of questions) {
      expect(
        supportShare(a.seed, question),
        `${where} row 48 ${question}`,
      ).not.toBe(publishedSupportShare(question));
      expect(
        supportShare(a.seed, question),
        `${where} row 48 ${question}`,
      ).not.toBe(supportShare(b.seed, question));
    }
    process.stdout.write(
      `VOTES-AND-POLLS ${where}: ${shared.length} past races (${large.length} of a thousand votes or more) cast ${cast(racesA)} and ${cast(racesB)} votes; ${questions[0]} polls ${supportShare(a.seed, questions[0]!).toFixed(3)} and ${supportShare(b.seed, questions[0]!).toFixed(3)} against ${publishedSupportShare(questions[0]!)}\n`,
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
