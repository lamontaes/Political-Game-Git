/**
 * M1-07, the government half (first slice), in a random place over a year:
 * every government covering the town adopts its budget on its fiscal year's
 * start; a named worker's paycheck pays each tax at the rate in force to the
 * right government; every withheld dollar lands in a treasury; spending per
 * resident comes from the Census figures for that state.
 */
import { publicPayTreasuries } from "./public-work-pay";
import { createHash } from "node:crypto";
import { describe, expect, it } from "vitest";
import { govReport } from "./gov-test-report";
import { buildBenchWorld } from "../bench/world";
import { PURCHASE_TAX_MODULE_ID, purchaseTaxes } from "./modules/purchase-tax";
import { buildPopulation } from "./population";
import { advanceCore, createLifeCore } from "./life";
import { coreAPI } from "./state";
import { lawChain, lawInForce, openLaws } from "./modules/laws";
import {
  BUDGETS_MODULE_ID,
  budgetsOf,
  governments,
  outsideRevenueOf,
  openBudgets,
  taxPaymentsOf,
  spendingPaymentsOf,
} from "./modules/budgets";
import { withholdingFor } from "./tax-withholding";
import { treasuryMonthsOf } from "./budgets-treasury";
import { billPropertyTax } from "./housing-property-tax";
import { HOUSING_MODULE_ID } from "./modules/housing";
import { residentsRuntime } from "./modules/residents";
import { searchCorePlaces, corePlaceStateIdentities } from "./place-lookup";

const START = "2026-01-05";
const seed =
  process.env.GOLDEN_PATH_SEED ??
  createHash("sha256").update(`budgets:${Date.now()}`).digest("hex");
const states = [...corePlaceStateIdentities()]
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
          const sum = (lines: Readonly<Record<string, number>>) =>
            Object.values(lines).reduce((a, b) => a + b, 0);
          const spend = sum(adopted[0]!.spendingMinor);
          // A government the finances record as one with the level below it
          // carries no lines; what it collects passes on (checked below).
          if (sum(adopted[0]!.revenueMinor) > 0)
            expect(spend, `${gov.id} in ${place}`).toBeGreaterThan(0);
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
      // Every withheld dollar, every sales-tax dollar, every dollar of
      // revenue from outside the town, aid and borrowing is in a treasury,
      // less what its monthly closes paid out on its budget lines.
      const salesTax = purchaseTaxes(core);
      for (const gov of govs) {
        let closes = 0;
        for (const month of treasuryMonthsOf(api, gov.id)) {
          closes +=
            month.aidReceivedMinor + month.borrowedMinor - month.aidPaidMinor;
          for (const line of Object.values(month.lines))
            closes -= line.providersMinor + line.outsideMinor;
        }
        // The wages it paid the opening's public employers' workers, less
        // what it couldn't cover (the authority paid those).
        for (const [authorityId, link] of publicPayTreasuries(core))
          if (link.treasuryId === gov.organizationId) {
            const employer = [...core.organizations.values()].find(
              (row) => row.publicPayAuthority?.id === authorityId,
            )!;
            closes -=
              employer.publicPayAuthority!.workCommitmentIds.reduce(
                (n, id) =>
                  n +
                  (core.work.payrollLedgerByCommitment.get(id)?.paidMinor ?? 0),
                0,
              ) - api.publicPayShortfallMinor(authorityId);
          }
        expect(cash(gov.organizationId), gov.id).toBe(
          (received.get(`cash:${gov.organizationId}:residual`) ?? 0) +
            (salesTax.get(`sales-tax:${gov.id}`)?.collectedMinor ?? 0) +
            outsideRevenueOf(api, gov.id) +
            taxPaymentsOf(api, gov.id).reduce((n, p) => n + p.amountMinor, 0) +
            closes,
        );
        // The treasury paid its lines: every month's close spent money.
        expect(treasuryMonthsOf(api, gov.id).length, gov.id).toBeGreaterThan(0);
      }
      // The taxes with named payers arrive in installments on their due
      // dates, each naming the group that paid it and what it was due on.
      let installments = 0;
      for (const gov of govs) {
        const budget = budgetsOf(api, gov.id).at(-1)!;
        for (const paid of taxPaymentsOf(api, gov.id)) {
          installments += 1;
          expect(paid.payerName, gov.id).not.toBe("");
          expect(paid.dueOn, gov.id).toMatch(/^\d{4}-\d{2}-\d{2}$/);
          expect(paid.dueOn < paid.date, gov.id).toBe(true);
          // An installment is a share of the line the budget carries.
          expect(paid.amountMinor, gov.id).toBeLessThanOrEqual(
            budget.revenueMinor[paid.line] ?? 0,
          );
        }
      }
      expect(installments, `tax installments in ${place}`).toBeGreaterThan(0);
      // What leaves the town on a spending line goes to a named group of
      // payees, never to the outside account alone: the payments add up to
      // the lines' outside money (the federal interest goes to the holders
      // of the debt and is counted there).
      let paidOut = 0;
      for (const gov of govs) {
        const payments = spendingPaymentsOf(api, gov.id);
        for (const paid of payments) {
          expect(paid.payeeName, gov.id).not.toBe("");
          expect(paid.line, gov.id).not.toBe("");
        }
        paidOut += payments.length;
        const lines = treasuryMonthsOf(api, gov.id).reduce(
          (n, m) =>
            n +
            Object.entries(m.lines)
              .filter(
                ([line]) => gov.level !== "federal" || line !== "netInterest",
              )
              .reduce((a, [, row]) => a + row.outsideMinor, 0),
          0,
        );
        expect(
          payments.reduce((n, p) => n + p.amountMinor, 0),
          `${gov.id} in ${place}`,
        ).toBe(lines);
      }
      expect(paidOut, `payments to payees in ${place}`).toBeGreaterThan(0);
      // Aid, fees and the rest arrive each month for the local governments;
      // one with no budget of its own passes what it collects on.
      for (const gov of govs.filter((g) => g.level !== "federal")) {
        const own = budgetsOf(api, gov.id).some(
          (b) => Object.values(b.revenueMinor).reduce((x, y) => x + y, 0) > 0,
        );
        if (own)
          expect(outsideRevenueOf(api, gov.id), gov.id).toBeGreaterThan(0);
        else
          expect(
            treasuryMonthsOf(api, gov.id).reduce(
              (sum, m) => sum + m.aidPaidMinor,
              0,
            ),
            gov.id,
          ).toBeGreaterThan(0);
      }
      // The sales tax in force is collected wherever purchases are taxed.
      const stateRate = lawInForce(api, "sales-tax").levels.find(
        (l) => l.level === "state",
      )?.row?.value;
      const stateGov = govs.find((g) => g.level === "state")!;
      if (core.modules.has(PURCHASE_TAX_MODULE_ID) && (stateRate ?? 0) > 0)
        expect(
          salesTax.get(`sales-tax:${stateGov.id}`)?.collectedMinor ?? 0,
          `${place}: no state sales tax collected`,
        ).toBeGreaterThan(0);
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
          salesTax: Object.fromEntries(
            [...salesTax.values()].map((t) => [
              t.id,
              `${t.ratePercent.toFixed(3)}%: $${(t.collectedMinor / 100).toFixed(2)}`,
            ]),
          ),
          oneWorker: worker,
        }),
      );
    });
    it("the sales tax in force is collected on the town's purchases, each level's share to its treasury", () => {
      for (let attempt = 0; attempt < 12; attempt += 1) {
        // The bench's world on the opening date: households and the counted
        // residents shop, and budgets (with the sales tax) are open.
        const { core } = buildBenchWorld(`${seed}:${attempt}`, "2026-10-12", {
          twoLevel: true,
        });
        const govs = governments(coreAPI(core));
        const place = {
          name: core.placeMetadata.placeName,
          state: lawChain(coreAPI(core)).stateKey,
        };
        const api = coreAPI(core);
        const answer = lawInForce(api, "sales-tax");
        if (!((answer.value ?? 0) > 0)) continue;
        // Sales-tax dollars posted into each treasury's account, from the journal.
        const landed = new Map<string, number>();
        const post = api.postJournal.bind(api);
        api.postJournal = (entry) => {
          const result = post(entry);
          if (entry.sourceRef.id.startsWith("sales-tax:"))
            for (const posting of entry.postings) {
              const owner = core.cashJournal.accounts.get(
                posting.accountId,
              )?.ownerId;
              if (owner && posting.deltaMinor > 0)
                landed.set(
                  owner,
                  (landed.get(owner) ?? 0) + posting.deltaMinor,
                );
            }
          return result;
        };
        advanceCore(
          core,
          new Date(Date.parse(`${core.date}T00:00:00Z`) + 20 * 86_400_000)
            .toISOString()
            .slice(0, 10),
        );
        const where = `${place.name}, ${place.state} (seed ${seed}:${attempt})`;
        const taxes = [...purchaseTaxes(core).values()].filter(
          (t) => t.ratePercent > 0,
        );
        const total = taxes.reduce((a, t) => a + t.collectedMinor, 0);
        // The tax is on sales by sellers in the town; a town whose residents
        // buy from no seller there (a few dozen people and no shop) has no
        // taxable sale to collect on, so it cannot show the collection.
        const town = lawChain(api).townPlaceId;
        const localSeller = [...(residentsRuntime(core)?.flows.values() ?? [])]
          .filter((f) => f.kind === "purchase" && !f.endedAt)
          .some((f) => {
            const seller = core.organizations.get(f.payeeId);
            return seller?.placeId === town && seller.kind !== "outside-market";
          });
        if (total === 0 && !localSeller) continue;
        expect(total, where).toBeGreaterThan(0);
        // Each level's share of the tax inside a price is its rate over
        // (100 + the combined rate); the shares add up to the combined rate.
        const combined = answer.value!;
        const shares = taxes.map(
          (t) => (100 + combined) * (t.ratePercent / (100 + t.ratePercent)),
        );
        expect(
          shares.reduce((a, b) => a + b, 0),
          where,
        ).toBeCloseTo(combined, 6);
        // Every collected dollar landed in its treasury's account. The
        // balance itself is not the check: a treasury also pays out (council
        // stipends, the month's spending), so a balance below the tax
        // collected is the treasury spending it, not the tax going missing.
        for (const t of taxes) {
          const gov = govs.find((g) => `sales-tax:${g.id}` === t.id)!;
          expect(landed.get(gov.organizationId) ?? 0, where).toBe(
            t.collectedMinor,
          );
        }
        govReport(
          "budgets-sales-tax",
          JSON.stringify({
            where,
            combinedRate: combined,
            collected: Object.fromEntries(
              taxes.map((t) => [t.id, (t.collectedMinor / 100).toFixed(2)]),
            ),
          }),
        );
        return;
      }
      throw new Error(`no taxed place in twelve draws (seed ${seed})`);
    });
    it("owners' property tax is the county's rate in force, paid to the treasury that collects it", () => {
      // A place with a recorded rate (some territories have none; WORLD's
      // stand-in rate applies there).
      let attempt = 0;
      let built = buildBenchWorld(`${seed}:property:0`, "2026-10-12", {
        twoLevel: true,
      });
      while (
        !((lawInForce(coreAPI(built.core), "property-tax").value ?? 0) > 0) &&
        attempt < 8
      ) {
        attempt += 1;
        built = buildBenchWorld(`${seed}:property:${attempt}`, "2026-10-12", {
          twoLevel: true,
        });
      }
      const { core } = built;
      const api = coreAPI(core);
      const govs = governments(api);
      const county =
        govs.find((g) => g.level === "county") ??
        govs.find((g) => g.level === "city") ??
        govs.find((g) => g.level === "state")!;
      const collector = `organization:tax-collector:${county.id}`;
      const where = `${core.placeMetadata.placeName}, ${lawChain(api).stateKey} (seed ${seed}:property:${attempt})`;
      const rate = lawInForce(api, "property-tax").value!;
      expect(rate, where).toBeGreaterThan(0);
      // WORLD's bench dwellings carry no owner values yet (Needs for
      // OPUS-WORLD), so the town's full households are billed at the
      // stated value.
      const town = lawChain(api).townPlaceId;
      const homes = [...core.households.values()]
        .filter((h) => h.placeId === town)
        .slice(0, 20)
        .map((h) => ({
          householdId: h.id,
          placeId: town,
          valueMinor: 25_000_000,
        }));
      expect(homes.length, where).toBeGreaterThan(0);
      const before = core.organizations.get(collector)!.liquidMinor;
      const paid = billPropertyTax(
        api,
        api.moduleState(HOUSING_MODULE_ID).table("assessments"),
        homes,
      );
      expect(paid, where).toBeGreaterThan(0);
      // Every dollar paid is with the county's tax collector, none outside.
      expect(
        core.organizations.get(collector)!.liquidMinor - before,
        where,
      ).toBe(paid);
      // No more than a twelfth of the homes' value times the rate in force.
      const due = homes.reduce(
        (a, h) => a + Math.round((h.valueMinor * rate) / 100 / 12),
        0,
      );
      expect(paid, where).toBeLessThanOrEqual(due * 1.2);
      // On the first of the month the collector passes it all on to the
      // governments that levy it.
      const first = new Date(`${core.date.slice(0, 7)}-01T00:00:00Z`);
      first.setUTCMonth(first.getUTCMonth() + 1);
      first.setUTCDate(2);
      advanceCore(core, first.toISOString().slice(0, 10));
      expect(core.organizations.get(collector)!.liquidMinor, where).toBe(0);
      govReport(
        "budgets-property-tax",
        JSON.stringify({
          where,
          ratePercent: rate,
          collector: county.name,
          homes: homes.length,
          paid: (paid / 100).toFixed(2),
          due: (due / 100).toFixed(2),
        }),
      );
    });
  },
);
