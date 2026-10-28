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
import { corePlaceByKey } from "./place-lookup";
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
  townPayPercentile,
} from "./town-pay";
import { worldRateFactor, type BaseRateTable } from "./world-base-rates";
import type { CoreState } from "./types";

/** Audit rows still copied, by the pool item that fixes each. */
export const NOT_YET: Readonly<Record<string, readonly number[]>> = {
  "realistic-housing-per-world": [5, 7, 8, 9],
  "realistic-money-and-population-per-world": [28],
  "realistic-business-per-world": [21, 22, 23, 24, 26, 27],
  "realistic-elections-per-world": [42, 44, 45, 48],
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
      if (local() !== undefined)
        differs(
          `local pay ${occupation}`,
          local(a.seed)!,
          local()!,
          local(b.seed)!,
        );
    }
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

  it("lists every audited statistic still copied, with the item that fixes it", () => {
    const rowsLeft = Object.values(NOT_YET).flat();
    expect(new Set(rowsLeft).size).toBe(rowsLeft.length);
    process.stdout.write(
      `REALISTIC ${where}: ${rowsLeft.length} audited rows still copied, in ${Object.keys(NOT_YET).length} items\n`,
    );
  });
});
