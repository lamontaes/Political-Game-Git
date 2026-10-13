/**
 * M1-07, the government half (first slice), in a random place over a year:
 * every government covering the town adopts its budget on its fiscal year's
 * start; a named worker's paycheck pays each tax at the rate in force to the
 * right government; every withheld dollar lands in a treasury; spending per
 * resident comes from the Census figures for that state.
 */
import { createHash } from "node:crypto";
import { describe, expect, it } from "vitest";
import { govReport } from "./gov-test-report";
import { buildPopulation } from "./population";
import { advanceCore, createLifeCore } from "./life";
import { coreAPI } from "./state";
import { lawInForce, openLaws } from "./modules/laws";
import {
  BUDGETS_MODULE_ID,
  budgetsOf,
  governments,
  openBudgets,
} from "./modules/budgets";
import { withholdingFor } from "./tax-withholding";
import {
  lifePlaceCoverage,
  lifePlaceSearch,
  lifePlaceStateIdentities,
} from "../simulation/life-places";

const START = "2026-01-05";
const seed =
  process.env.GOLDEN_PATH_SEED ??
  createHash("sha256").update(`budgets:${Date.now()}`).digest("hex");
const states = [...lifePlaceStateIdentities()]
  .map((s) => s.jurisdictionKey)
  .filter((s) => !["US-AS", "US-GU", "US-MP", "US-PR", "US-VI"].includes(s))
  .sort();
function pick<T>(list: readonly T[], salt: string): T {
  const hash = createHash("sha256").update(`${seed}:${salt}`).digest("hex");
  return list[parseInt(hash.slice(0, 8), 16) % list.length]!;
}

describe(
  "M1-07 budgets and taxes (government half, first slice)",
  { timeout: 300_000 },
  () => {
    it("budgets adopt on their fiscal calendars; paychecks pay the law's taxes to each government; every dollar lands", () => {
      const state = pick(states, "state");
      const places = [
        ...lifePlaceSearch("", lifePlaceCoverage().placeCount, {
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
          startedAt: START,
          // A small town: the year of daily work costs time per person.
          minimumPeople: 30,
        }),
      );
      openLaws(core);
      const govs = openBudgets(core);
      const api = coreAPI(core);
      const cash = (orgId: string) =>
        core.cashJournal.accounts.has(`cash:${orgId}:residual`)
          ? core.organizations.get(orgId)!.liquidMinor
          : 0;
      advanceCore(core, "2027-01-05");
      // Each government adopted its next budget on its fiscal year's first day.
      for (const gov of governments(api)) {
        const adopted = budgetsOf(api, gov.id).filter((b) =>
          b.adoptedBy.startsWith("carried forward"),
        );
        expect(adopted.length, gov.id).toBeGreaterThanOrEqual(1);
        for (const budget of adopted)
          expect(budget.adoptedOn).toBe(budget.startsOn);
        if (gov.level !== "federal") {
          const spend = Object.values(adopted[0]!.spendingMinor).reduce(
            (a, b) => a + b,
            0,
          );
          expect(spend).toBeGreaterThan(0);
        }
      }
      // Withholding: one named worker's paycheck, line by line, against the law.
      const records = api
        .moduleState(BUDGETS_MODULE_ID)
        .table("withholding")
        .rows() as unknown as {
        id: string;
        personId: string;
        date: string;
        paidMinor: number;
        periodDays: number;
        yearToDateMinor: number;
        lines: { jurisdiction: string; tax: string; minor: number }[];
        postings: { accountId: string; deltaMinor: number }[];
      }[];
      expect(records.length).toBeGreaterThan(0);
      for (const r of records)
        expect(r.postings.reduce((a, p) => a + p.deltaMinor, 0)).toBe(0);
      const worker = pick(records, "worker");
      const received = new Map<string, number>();
      for (const r of records)
        for (const p of r.postings.filter((p) => p.deltaMinor > 0))
          received.set(
            p.accountId,
            (received.get(p.accountId) ?? 0) + p.deltaMinor,
          );
      // Every withheld dollar is in a treasury (nothing else pays into them yet).
      for (const gov of govs)
        expect(cash(gov.organizationId)).toBe(
          received.get(`cash:${gov.organizationId}:residual`) ?? 0,
        );
      // Recompute the worker's paycheck from the law in force on its date.
      const lines = withholdingFor({
        paidMinor: worker.paidMinor,
        periodDays: worker.periodDays,
        yearToDateMinor: worker.yearToDateMinor,
        incomeTax: lawInForce(api, "income-tax", worker.date),
        socialSecurity: lawInForce(api, "social-security-tax", worker.date),
        medicare: lawInForce(api, "medicare-tax", worker.date),
      });
      expect(lines).toEqual(worker.lines);
      govReport(
        "budgets",
        JSON.stringify({
          place,
          seed,
          governments: governments(api).map((g) => {
            const b = budgetsOf(api, g.id).at(-1)!;
            return `${g.name} (${g.level}): FY${b.fiscalYear} adopted ${b.adoptedOn}, spending $${Math.round(Object.values(b.spendingMinor).reduce((a, c) => a + c, 0) / 100)}, received $${(cash(g.organizationId) / 100).toFixed(2)} in withholding`;
          }),
          paychecks: records.length,
          oneWorker: worker,
        }),
      );
    });
  },
);
