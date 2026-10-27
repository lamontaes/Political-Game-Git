/**
 * The federal treasury keeps a month of the standing payments laws set up
 * from its account (a Medicaid share, a benefit) funded across a close, so a
 * payment falling due between closes is not paid short in a small town.
 * Played in a random place drawn from all 56, from a seed nobody chose.
 */
import { createHash } from "node:crypto";
import { describe, expect, it } from "vitest";
import { buildPopulation } from "./population";
import { advanceCore, createLifeCore } from "./life";
import { coreAPI } from "./state";
import { openLaws } from "./modules/laws";
import { governments, openBudgets } from "./modules/budgets";
import {
  budgetInForce,
  outsideAccountOf,
  standingReserve,
  treasuryMonthsOf,
} from "./budgets-treasury";
import { searchCorePlaces, corePlaceStateIdentities } from "./place-lookup";
import type { IsoDate } from "./kernel/dates";

const START = "2026-01-05";
const seed =
  process.env.GOLDEN_PATH_SEED ??
  createHash("sha256").update(`treasury-reserve:${Date.now()}`).digest("hex");
const states = [...corePlaceStateIdentities()]
  .map((s) => s.jurisdictionKey)
  .sort();
function pick<T>(list: readonly T[], salt: string): T {
  const hash = createHash("sha256").update(`${seed}:${salt}`).digest("hex");
  return list[parseInt(hash.slice(0, 8), 16) % list.length]!;
}

describe(
  "the federal treasury's standing payments",
  { timeout: 600_000 },
  () => {
    it("are reserved across a close, in proportion to their cadence", () => {
      const state = pick(states, "state");
      const places = [
        ...searchCorePlaces("", Number.MAX_SAFE_INTEGER, {
          stateJurisdictionKey: state,
          scope: "locality",
        }),
      ].sort((a, b) => a.key.localeCompare(b.key));
      const place =
        process.env.GOLDEN_PATH_PLACE_KEY ?? pick(places, "place").key;
      const where = `seed ${seed}, ${state} place ${place}`;
      const core = createLifeCore(
        buildPopulation({
          seed,
          placeKey: place,
          startedAt: START,
          minimumPeople: 30,
        }),
      );
      openLaws(core);
      openBudgets(core);
      const api = coreAPI(core);
      const accounts = api.accounts();
      const us = governments(api).find((g) => g.level === "federal")!;
      const main = accounts.main(us.organizationId);
      const outside = accounts.main(outsideAccountOf(api)!);
      const source = {
        tag: "SOURCED" as const,
        citation: "test",
        asOf: START as IsoDate,
      };
      expect(standingReserve(api, main), where).toBe(0);
      accounts.addObligation({
        id: "reserve-test:monthly",
        from: main,
        to: outside,
        amountMinor: 30_000,
        firstDueAt: "2026-01-20" as IsoDate,
        cadence: { kind: "months", every: 1 },
        accruesArrears: false,
        reasonKey: "test",
        source,
      });
      accounts.addObligation({
        id: "reserve-test:weekly",
        from: main,
        to: outside,
        amountMinor: 7_000,
        firstDueAt: "2026-01-12" as IsoDate,
        cadence: { kind: "days", every: 7 },
        accruesArrears: false,
        reasonKey: "test",
        source,
      });
      const monthDays = 365 / 12;
      expect(standingReserve(api, main), where).toBe(
        Math.round(30_000 + (7_000 * monthDays) / 7),
      );
      // A close leaves that reserve in the account for the month ahead.
      advanceCore(core, "2026-02-01");
      expect(accounts.balance(main), where).toBeGreaterThanOrEqual(
        standingReserve(api, main),
      );
    });

    it("a reserve larger than the cash on hand is borrowed on top of the month's due spending, and the lines are paid in full", () => {
      const state = pick(states, "state-big");
      const places = [
        ...searchCorePlaces("", Number.MAX_SAFE_INTEGER, {
          stateJurisdictionKey: state,
          scope: "locality",
        }),
      ].sort((a, b) => a.key.localeCompare(b.key));
      const place = pick(places, "place-big").key;
      const where = `seed ${seed}, ${state} place ${place}`;
      const core = createLifeCore(
        buildPopulation({
          seed,
          placeKey: place,
          startedAt: START,
          minimumPeople: 30,
        }),
      );
      openLaws(core);
      openBudgets(core);
      const api = coreAPI(core);
      const accounts = api.accounts();
      const us = governments(api).find((g) => g.level === "federal")!;
      const main = accounts.main(us.organizationId);
      const outside = accounts.main(outsideAccountOf(api)!);
      // A standing payment worth a tenth of a year of the federal budget:
      // large against the cash on hand and against the month's due spending,
      // so a close that borrowed only the due spending would pay the lines short.
      const budget = budgetInForce(api, us.id)!;
      const reserve = Math.round(
        Object.values(budget.spendingMinor).reduce((n, m) => n + m, 0) / 10,
      );
      accounts.addObligation({
        id: "reserve-test:big",
        from: main,
        to: outside,
        amountMinor: reserve,
        firstDueAt: "2026-02-20" as IsoDate,
        cadence: { kind: "months", every: 1 },
        accruesArrears: false,
        reasonKey: "test",
        source: {
          tag: "SOURCED" as const,
          citation: "test",
          asOf: START as IsoDate,
        },
      });
      expect(standingReserve(api, main), where).toBe(reserve);
      expect(
        accounts.balance(main),
        `${where}: reserve exceeds cash`,
      ).toBeLessThan(reserve);
      advanceCore(core, "2026-02-01");
      const closes = treasuryMonthsOf(api, us.id);
      expect(
        closes.length,
        `${where}: the federal treasury closed`,
      ).toBeGreaterThan(0);
      const close = closes[closes.length - 1]!;
      const due = Object.values(close.lines).reduce(
        (n, l) => n + l.dueMinor,
        0,
      );
      expect(due, `${where}: the close had spending due`).toBeGreaterThan(0);
      // The reserve is kept AND the due spending is paid in full, the
      // difference borrowed.
      expect(
        accounts.balance(main),
        `${where}: reserve kept`,
      ).toBeGreaterThanOrEqual(reserve);
      for (const [line, row] of Object.entries(close.lines))
        expect(row.shortMinor, `${where}: ${line} paid in full`).toBe(0);
      expect(close.borrowedMinor, `${where}: borrowed`).toBeGreaterThan(0);
    });
  },
);
