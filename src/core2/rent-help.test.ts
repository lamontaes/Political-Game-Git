/**
 * Housing spending pays rent help (SG-GOV-REACH-A-rent-assistance), in a
 * played world: the city's housing line is raised, the lowest-cash renting
 * households are paid a monthly voucher from the city treasury, no more than
 * their rent; cutting the line ends the payments. Drawn place and seed named.
 */
import { govReport } from "./gov-test-report";
import { randomBytes } from "node:crypto";
import { describe, expect, it } from "vitest";
import { buildBenchWorld } from "../bench/world";
import { drawPlace } from "../../scripts/core2-year/place";
import { advanceCore } from "./life";
import { coreAPI } from "./state";
import { amendBudget, governments } from "./modules/budgets";
import { openReach } from "./law-reach/group-a-records";
import { reachParameter } from "./law-reach/group-a-records";
import { addDays, makeIsoDate } from "./kernel/dates";
import { residentsRuntime } from "./modules/residents";
import { lawChain } from "./modules/laws";
import type { CoreState } from "./types";

const seed = process.env.RENT_HELP_SEED ?? randomBytes(8).toString("hex");

describe("housing spending pays rent help", () => {
  it("pays renting heads monthly from the treasury, at most their rent, until the line is cut", () => {
    const tried: string[] = [];
    for (let attempt = 0; attempt < 4; attempt += 1) {
      const place = drawPlace(`${seed}:${attempt}`, "rent-help");
      const where = `seed ${place.seed}, place ${place.key}`;
      tried.push(where);
      const world = buildBenchWorld(place.seed, "2026-10-12", {
        twoLevel: true,
        placeKey: place.key,
      });
      const core = world.core as CoreState;
      const api = coreAPI(core);
      const gov =
        governments(api).find((g) => g.level === "city") ??
        governments(api).find((g) => g.level === "county");
      if (!gov) continue;
      const delta = reachParameter("housingAssistanceAnnualMinor") * 3;
      amendBudget(api, {
        governmentId: gov.id,
        line: "housing",
        deltaMinor: delta,
        measureId: "test:housing:up",
      });
      const assisted = openReach(api, "budget-line:housing").filter(
        (r) => r.spec === "assisted",
      );
      const payments = api
        .moduleState("core2-law-reach-a-v1")
        .table("payments")
        .rows() as unknown as {
        recipientId: string;
        obligationId: string;
        amountMinor: number;
        endedOn: string | null;
      }[];
      if (!payments.length) continue;
      const accounts = api.accounts();
      const residentsOrg = residentsRuntime(core)?.input.accounts.find(
        (acct) => acct.placeId === lawChain(api).townPlaceId,
      )?.accountId;
      let named = 0;
      for (const pay of payments) {
        const person = core.people.get(pay.recipientId);
        if (!person) {
          // The counted renters' help goes to their place's pooled account.
          expect(pay.recipientId, where).toBe(residentsOrg);
          continue;
        }
        named += 1;
        const lease = core.finance.contracts.get(`lease:${person.householdId}`);
        // A renter, helped by no more than the rent.
        expect(lease, `${where}: ${pay.recipientId} rents`).toBeDefined();
        expect(pay.amountMinor, where).toBeLessThanOrEqual(lease!.amountMinor);
        expect(assisted.some((r) => r.targetId === pay.recipientId)).toBe(true);
      }
      // A month later the treasury has paid.
      let day = core.date;
      for (let i = 0; i < 40; i += 1) {
        day = addDays(makeIsoDate(day), 1);
        advanceCore(core, day);
      }
      const paid = payments.filter(
        (pay) => (accounts.obligation(pay.obligationId)?.paidMinor ?? 0) > 0,
      );
      expect(paid.length, `${where}: nothing paid`).toBeGreaterThan(0);
      // Cutting the line ends the payments.
      amendBudget(api, {
        governmentId: gov.id,
        line: "housing",
        deltaMinor: -delta,
        measureId: "test:housing:down",
      });
      for (const pay of payments)
        expect(
          accounts.obligation(pay.obligationId)?.endedAt,
          `${where}: ${pay.obligationId} still owed`,
        ).toBeDefined();
      govReport(
        "rent-help",
        JSON.stringify({
          where,
          paid: paid.map((p) => p.obligationId),
          named,
          heads: payments.map((p) => p.recipientId),
        }),
      );
      return;
    }
    throw new Error(`no town with renters to help: ${tried.join("; ")}`);
  }, 900_000);
});
