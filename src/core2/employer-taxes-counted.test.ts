/**
 * The employer's payroll tax share on counted workers' wages (one model, two
 * tiers), in the played world: on the first of each month each business pays
 * the share on the counted wages it paid the month before, at the law's
 * rates, balanced on the journal, to the treasuries; what it can't pay waits
 * as arrears. The seed is in the test name.
 */
import { randomUUID } from "node:crypto";
import { describe, expect, it } from "vitest";
import { buildBenchWorld } from "../bench/world";
import { coreAPI } from "./state";
import { gameStartDate } from "./game-start";
import { advanceCore } from "./life";
import { lawInForce } from "./modules/laws";
import { governments } from "./modules/budgets";
import {
  EMPLOYER_TAXES_MODULE_ID,
  employerArrears,
  type CountedEmployerTaxRecord,
  type EmployerTaxRecord,
} from "./modules/employer-taxes";

const seed = process.env.GOLDEN_PATH_SEED ?? randomUUID();

describe(`employer share on counted wages (played world, seed ${seed})`, () => {
  it("each business pays the law's share on last month's counted wages, balanced", () => {
    const { core } = buildBenchWorld(seed, gameStartDate(), { twoLevel: true });
    const api = coreAPI(core);
    // Past two month starts: the opening's partial month and a whole one.
    const end = new Date(`${core.date}T00:00:00Z`);
    end.setUTCMonth(end.getUTCMonth() + 2, 2);
    advanceCore(core, end.toISOString().slice(0, "YYYY-MM-DD".length));
    const state = api.moduleState(EMPLOYER_TAXES_MODULE_ID);
    const counted = state
      .table("countedShares")
      .rows() as unknown as CountedEmployerTaxRecord[];
    const full = state.table("shares").rows() as unknown as EmployerTaxRecord[];
    const where = `${core.placeMetadata?.placeName ?? "town"} (seed ${seed})`;
    const paidWages = [...core.finance.businesses.values()].reduce(
      (n, b) => n + b.wagesPaidMinor,
      0,
    );
    console.log(
      `${where}: ${counted.length} counted records on $${(
        counted.reduce((n, r) => n + r.wagesMinor, 0) / 100
      ).toFixed(2)} of wages; $${(
        counted.reduce((n, r) => n + r.paidMinor, 0) / 100
      ).toFixed(2)} paid`,
    );
    // A town whose businesses paid counted wages records their share.
    if (paidWages > 0) expect(counted.length, where).toBeGreaterThan(0);
    const medicare = lawInForce(api, "medicare-tax").governing;
    const ss = lawInForce(api, "social-security-tax").governing;
    const treasuries = new Set(
      governments(api).map((g) => `cash:${g.organizationId}:residual`),
    );
    for (const r of counted) {
      expect(
        r.postings.reduce((n, p) => n + p.deltaMinor, 0),
        r.id,
      ).toBe(0);
      for (const p of r.postings)
        if (p.deltaMinor < 0)
          expect(p.accountId, r.id).toBe(`cash:${r.employerId}:residual`);
        else expect(treasuries.has(p.accountId), r.id).toBe(true);
      // Medicare has no wage base: the rate on the wages, give or take a cent a worker.
      if (medicare?.value)
        expect(
          Math.abs(r.medicareMinor - (r.wagesMinor * medicare.value) / 100),
          r.id,
        ).toBeLessThanOrEqual(r.workers);
      // Social Security never exceeds the rate on all the wages.
      if (ss?.value)
        expect(r.socialSecurityMinor, r.id).toBeLessThanOrEqual(
          Math.round((r.wagesMinor * ss.value) / 100) + r.workers,
        );
    }
    // Nothing dropped: what was owed on both tiers is paid or in arrears.
    const rows = [...full, ...counted];
    const owed = rows.reduce(
      (n, r) =>
        n +
        r.socialSecurityMinor +
        r.medicareMinor +
        (r.federalUnemploymentMinor ?? 0) +
        (r.stateUnemploymentMinor ?? 0),
      0,
    );
    let arrears = 0;
    for (const id of new Set(rows.map((r) => r.employerId)))
      arrears += employerArrears(api, id);
    expect(rows.reduce((n, r) => n + r.paidMinor, 0) + arrears, where).toBe(
      owed,
    );
  }, 900_000);
});
