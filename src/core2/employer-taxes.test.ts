/**
 * The employer's Social Security and Medicare share (laws audit 19), in a
 * random place: each payday the employer pays its share to the federal
 * treasury from its own cash, at the rate the law in force carries, balanced on
 * the journal, with Social Security stopping at the wage base per worker per
 * employer per year.
 */
import { createHash } from "node:crypto";
import { describe, expect, it } from "vitest";
import { buildPopulation } from "./population";
import { advanceCore, createLifeCore } from "./life";
import { businessBooksView } from "./business-books-view";
import { coreAPI } from "./state";
import { lawInForce, openLaws } from "./modules/laws";
import { governments, openBudgets } from "./modules/budgets";
import {
  EMPLOYER_TAXES_MODULE_ID,
  employerArrears,
  openEmployerTaxes,
  type EmployerTaxRecord,
} from "./modules/employer-taxes";
import { searchCorePlaces, corePlaceStateIdentities } from "./place-lookup";

const seed =
  process.env.GOLDEN_PATH_SEED ??
  createHash("sha256").update(`employer-taxes:${Date.now()}`).digest("hex");
const states = [...corePlaceStateIdentities()]
  .map((s) => s.jurisdictionKey)
  .sort();
function pick<T>(list: readonly T[], salt: string): T {
  const hash = createHash("sha256").update(`${seed}:${salt}`).digest("hex");
  return list[parseInt(hash.slice(0, 8), 16) % list.length]!;
}

describe("employer payroll tax share", { timeout: 600_000 }, () => {
  it("is paid to the federal treasury from the employer's cash, balanced, at the law's rate, capped at the wage base", () => {
    const state = pick(states, "state");
    const places = [
      ...searchCorePlaces("", Number.MAX_SAFE_INTEGER, {
        stateJurisdictionKey: state,
        scope: "locality",
      }),
    ].sort((a, b) => a.key.localeCompare(b.key));
    const place =
      process.env.GOLDEN_PATH_PLACE_KEY ?? pick(places, "place").key;
    const core = createLifeCore(
      buildPopulation({
        seed,
        placeKey: place,
        startedAt: "2026-01-05",
        minimumPeople: 30,
      }),
    );
    openLaws(core);
    openBudgets(core);
    openEmployerTaxes(core);
    const api = coreAPI(core);
    const where = `${place} (seed ${seed})`;
    const treasury = governments(api).find((g) => g.id === "US")!;
    const treasuryAccount = `cash:${treasury.organizationId}:residual`;
    const stateGov = governments(api).find((g) => g.level === "state");
    const stateTreasuryAccount = stateGov
      ? `cash:${stateGov.organizationId}:residual`
      : treasuryAccount;
    // One worker is already $10 under the Social Security wage base, so their
    // first paychecks cross it.
    const ssRow = lawInForce(api, "social-security-tax").governing!;
    const wageBase = Math.round(Number(ssRow.terms?.wageBase ?? 0) * 100);
    const capped = [...core.people.values()]
      .filter((p) => p.alive && p.jobId && core.jobs.get(p.jobId))
      .sort((a, b) => a.id.localeCompare(b.id))[0];
    if (capped && wageBase > 0)
      api
        .moduleState(EMPLOYER_TAXES_MODULE_ID)
        .table("yearToDate")
        .put({
          id: `${core.jobs.get(capped.jobId!)!.organizationId}:${capped.id}:2026`,
          minor: wageBase - 1000,
        } as never);
    advanceCore(core, "2026-04-05");
    // The counted workers' shares are checked in employer-taxes-counted.test.ts.
    const rows = (
      api
        .moduleState(EMPLOYER_TAXES_MODULE_ID)
        .table("shares")
        .rows() as unknown as EmployerTaxRecord[]
    ).filter((r) => !r.counted);
    expect(rows.length, where).toBeGreaterThan(0);
    const ss = lawInForce(api, "social-security-tax").governing!;
    const medicare = lawInForce(api, "medicare-tax").governing!;
    const base = Math.round(Number(ss.terms?.wageBase ?? Infinity) * 100);
    // Replay each worker's year against the law: the share is the rate on
    // wages, Social Security only up to the wage base.
    const ytd = new Map<string, number>();
    if (capped && wageBase > 0)
      ytd.set(
        `${core.jobs.get(capped.jobId!)!.organizationId}:${capped.id}`,
        wageBase - 1000,
      );
    let arrears = 0;
    for (const r of [...rows].sort(
      (a, b) => a.date.localeCompare(b.date) || a.id.localeCompare(b.id),
    )) {
      const key = `${r.employerId}:${r.personId}`;
      const before = ytd.get(key) ?? 0;
      ytd.set(key, before + r.wagesMinor);
      const taxable = Math.max(0, Math.min(r.wagesMinor, base - before));
      expect(r.socialSecurityMinor, r.id).toBe(
        Math.round((taxable * ss.value!) / 100),
      );
      expect(r.medicareMinor, r.id).toBe(
        Math.round((r.wagesMinor * medicare.value!) / 100),
      );
      expect(
        r.postings.reduce((n, p) => n + p.deltaMinor, 0),
        r.id,
      ).toBe(0);
      for (const p of r.postings.filter((p) => p.deltaMinor > 0))
        expect([treasuryAccount, stateTreasuryAccount]).toContain(p.accountId);
      // Unemployment taxes stop at their own wage base for the year.
      const futa = lawInForce(api, "federal-unemployment-tax").governing;
      if (
        futa?.value &&
        !((futa.terms?.notCovered as string[]) ?? []).includes(state)
      ) {
        const futaBase = Math.round(Number(futa.terms?.wageBase) * 100);
        expect(r.federalUnemploymentMinor, r.id).toBe(
          Math.round(
            (Math.max(0, Math.min(r.wagesMinor, futaBase - before)) *
              futa.value) /
              100,
          ),
        );
      }
      for (const p of r.postings.filter((p) => p.deltaMinor < 0))
        expect(p.accountId).toBe(`cash:${r.employerId}:residual`);
    }
    // Checked where the worker was paid at all in these months (a job held
    // at an employer whose payroll had not run yet carries no share).
    const mine = capped ? rows.filter((r) => r.personId === capped.id) : [];
    if (capped && wageBase > 0 && mine.length) {
      expect(
        mine.reduce((n, r) => n + r.socialSecurityMinor, 0),
        where,
      ).toBe(Math.round((1000 * ssRow.value!) / 100));
    }
    // Nothing dropped: what was owed is paid or in arrears.
    const employers = new Set(rows.map((r) => r.employerId));
    for (const id of employers) arrears += employerArrears(api, id);
    const owed = rows.reduce(
      (n, r) =>
        n +
        r.socialSecurityMinor +
        r.medicareMinor +
        (r.federalUnemploymentMinor ?? 0) +
        (r.stateUnemploymentMinor ?? 0),
      0,
    );
    const paid = rows.reduce((n, r) => n + r.paidMinor, 0);
    expect(paid + arrears, where).toBe(owed);
    // The record a screen would read for a business's books carries the
    // taxes its employer records hold (owner decision: not shown yet).
    const employer = [...employers].find((id) =>
      core.finance.businesses.has(id),
    );
    if (employer) {
      const view = businessBooksView(api, employer)!;
      expect(view.taxesPaidMinor, where).toBe(
        rows
          .filter((r) => r.employerId === employer)
          .reduce((n, r) => n + r.paidMinor, 0) +
          (
            api
              .moduleState(EMPLOYER_TAXES_MODULE_ID)
              .table("profits")
              .rows() as unknown as { businessId: string; paidMinor: number }[]
          )
            .filter((r) => r.businessId === employer)
            .reduce((n, r) => n + r.paidMinor, 0),
      );
      expect(view.recordIds[0]).toBe(employer);
    }
  });
});
