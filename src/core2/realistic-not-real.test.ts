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
import { OFFICES_MODULE_ID } from "./modules/offices";
import { REGIONAL_MODULE_ID } from "./modules/regional";
import { publishedRegionMonths, type RegionMonth } from "./regional-model";
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
import type { CoreState } from "./types";

/** Audit rows still copied, by the pool item that fixes each. */
export const NOT_YET: Readonly<Record<string, readonly number[]>> = {
  "realistic-housing-per-world": [5, 7, 8, 9],
  "realistic-money-and-population-per-world": [14, 15, 16, 17, 18, 28],
  "realistic-business-per-world": [21, 22, 23, 24, 26, 27],
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
    // are paid the place's median earnings as this world draws them.
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
        expect(annual, `${where} ${flow.id}`).toBeCloseTo(
          placeEarningsOf(place.key, a.seed)!,
          0,
        );
        expect(annual, `${where} ${flow.id}`).not.toBeCloseTo(earned, 0);
      }
  });

  it("lists every audited statistic still copied, with the item that fixes it", () => {
    const rowsLeft = Object.values(NOT_YET).flat();
    expect(new Set(rowsLeft).size).toBe(rowsLeft.length);
    process.stdout.write(
      `REALISTIC ${where}: ${rowsLeft.length} audited rows still copied, in ${Object.keys(NOT_YET).length} items\n`,
    );
  });
});
