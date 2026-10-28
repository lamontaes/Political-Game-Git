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
  publishedHudRentRowFor,
  publishedHudStateRentRow,
  hudRentRowFor,
  hudStateRentRow,
} from "./hud-rents";
import { permitRates, publishedPermitRates } from "./housing-construction";
import { publishedShelterRateFor, shelterRateFor } from "./housing-homeless";
import { homePriceRatio, publishedHomePriceRatio } from "./housing-prices";
import { corePlaceByKey } from "./place-lookup";
import type { CoreState } from "./types";

/** Audit rows still copied, by the pool item that fixes each. */
export const NOT_YET: Readonly<Record<string, readonly number[]>> = {
  "realistic-regional-and-jobs-per-world": [4, 10, 11, 12, 13],
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
    area.mine.rents.forEach((rent, bedrooms) =>
      differs(
        `HUD rent, ${bedrooms} bedrooms (${area.mine.area})`,
        rent,
        area.real.rents[bedrooms]!,
        area.other.rents[bedrooms]!,
      ),
    );
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

  it("lists every audited statistic still copied, with the item that fixes it", () => {
    const rowsLeft = Object.values(NOT_YET).flat();
    expect(new Set(rowsLeft).size).toBe(rowsLeft.length);
    process.stdout.write(
      `REALISTIC ${where}: ${rowsLeft.length} audited rows still copied, in ${Object.keys(NOT_YET).length} items\n`,
    );
  });
});
