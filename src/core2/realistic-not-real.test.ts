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
import { federalDebtOf } from "./budgets-treasury";
import debtData from "./data/budgets/federal-debt.json" with { type: "json" };
import federalBudget from "../../data/research/money/federal-budget-fy2025.json" with { type: "json" };
import { publishedStateStake, stateStake } from "./budget-stakes";
import { serviceChargeShares } from "./budgets-service-charges";
import { lawChain } from "./modules/laws";
import { OFFICES_MODULE_ID } from "./modules/offices";
import { REGIONAL_MODULE_ID } from "./modules/regional";
import { publishedRegionMonths, type RegionMonth } from "./regional-model";
import { coreAPI } from "./state";
import type { CoreState } from "./types";

/** Audit rows still copied, by the pool item that fixes each. */
export const NOT_YET: Readonly<Record<string, readonly number[]>> = {
  "realistic-regional-and-jobs-per-world": [4, 10, 11, 12, 13],
  "realistic-housing-per-world": [5, 7, 8, 9],
  "realistic-money-and-population-per-world": [14, 15, 16, 17, 18, 28],
  "realistic-business-per-world": [21, 22, 23, 24, 26, 27],
  "realistic-base-rates-per-world": [32, 33, 34, 35, 36],
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
