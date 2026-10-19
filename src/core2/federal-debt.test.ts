/**
 * The federal gap is borrowed from named groups of lenders, and net interest
 * is paid to them by what each holds (pool item gov-outside-revenue-borrowing),
 * in a random place over a year of the played world.
 */
import { createHash } from "node:crypto";
import { describe, expect, it } from "vitest";
import { buildPopulation } from "./population";
import { advanceCore, createLifeCore } from "./life";
import { coreAPI } from "./state";
import { openLaws } from "./modules/laws";
import { governments, openBudgets } from "./modules/budgets";
import { federalDebtOf, treasuryMonthsOf } from "./budgets-treasury";
import debtData from "./data/budgets/federal-debt.json" with { type: "json" };
import ofs2 from "../../data/source/treasury-ofs2/ofs2-2026-03-31.json" with { type: "json" };
import { searchCorePlaces, corePlaceStateIdentities } from "./place-lookup";

const START = "2026-01-05";
const seed =
  process.env.GOLDEN_PATH_SEED ??
  createHash("sha256").update(`federal-debt:${Date.now()}`).digest("hex");
const states = [...corePlaceStateIdentities()]
  .map((s) => s.jurisdictionKey)
  .filter((s) => !["US-AS", "US-GU", "US-MP", "US-PR", "US-VI"].includes(s))
  .sort();
function pick<T>(list: readonly T[], salt: string): T {
  const hash = createHash("sha256").update(`${seed}:${salt}`).digest("hex");
  return list[parseInt(hash.slice(0, 8), 16) % list.length]!;
}

describe("the federal debt", { timeout: 600_000 }, () => {
  it("is borrowed from named groups of lenders, and net interest is paid to them by what each holds", () => {
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
    const opening = federalDebtOf(api).map((row) => ({ ...row }));
    advanceCore(core, "2027-01-05");
    const us = governments(api).find((g) => g.level === "federal")!;
    const months = treasuryMonthsOf(api, us.id);
    expect(months.length, where).toBeGreaterThan(0);

    const debt = federalDebtOf(api);
    const borrowedMonths = months.reduce((n, m) => n + m.borrowedMinor, 0);
    expect(borrowedMonths, where).toBeGreaterThan(0);
    // Each month's borrowing is the sum of what the lender groups lent.
    for (const month of months)
      expect(
        Object.values(month.borrowedByHolder).reduce((a, b) => a + b, 0),
        `${where} ${month.date}`,
      ).toBe(month.borrowedMinor);
    // Every group's balance is its opening balance plus what it lent, less
    // what was repaid (maturing debt rolls over, so none is repaid here).
    for (const row of debt) {
      const before = opening.find((o) => o.id === row.id)!;
      const lent = months.reduce(
        (n, m) => n + (m.borrowedByHolder[row.id] ?? 0),
        0,
      );
      expect(row.borrowedMinor, `${where} ${row.id}`).toBe(lent);
      expect(row.balanceMinor, `${where} ${row.id}`).toBe(
        before.balanceMinor + lent - row.repaidMinor,
      );
      expect(row.balanceMinor).toBeGreaterThan(0);
    }
    // Interest went to the groups that hold the debt, the larger holder more.
    const interest = months.reduce(
      (n, m) =>
        n + Object.values(m.interestByHolder).reduce((a, b) => a + b, 0),
      0,
    );
    expect(interest, where).toBeGreaterThan(0);
    expect(debt.reduce((n, r) => n + r.interestPaidMinor, 0)).toBe(interest);
    const biggest = [...debt].sort((a, b) => b.balanceMinor - a.balanceMinor);
    expect(biggest[0]!.interestPaidMinor).toBeGreaterThan(
      biggest.at(-1)!.interestPaidMinor,
    );
  });

  it("takes its lender groups and shares from the Treasury's ownership table, and they add up to the debt held by the public", () => {
    const snapshot = ofs2 as unknown as {
      ofs2: { securities_owner: string; securities_bil_amt: string }[];
      debtToThePenny: {
        debt_held_public_amt: string;
        intragov_hold_amt: string;
      };
    };
    const held = new Map(
      snapshot.ofs2.map((row) => [
        row.securities_owner,
        Number(row.securities_bil_amt),
      ]),
    );
    const intragov = Number(snapshot.debtToThePenny.intragov_hold_amt) / 1e9;
    const publicDebt =
      Number(snapshot.debtToThePenny.debt_held_public_amt) / 1e9;
    const rows: Record<string, number> = {
      foreign: held.get("Foreign And International")!,
      "federal-reserve":
        held.get("Federal Reserve And Government Accounts")! - intragov,
      "mutual-funds": held.get("Mutual Funds")!,
      "pension-funds-private": held.get("Pension Funds - Private")!,
      "pension-funds-state-local": held.get(
        "Pension Funds - State And Local Governments",
      )!,
      banks: held.get("Depository Institutions")!,
      "savings-bonds": held.get("U.S. Savings Bonds")!,
      "state-local": held.get("State And Local Governments")!,
      insurers: held.get("Insurance Companies")!,
      other: held.get("Other Investors")!,
    };
    const total = Object.values(rows).reduce((a, b) => a + b, 0);
    // The table's groups account for the whole debt held by the public (to its rounding).
    expect(Math.abs(total - publicDebt) / publicDebt).toBeLessThan(1e-4);
    expect(debtData.shareSource.tag).toBe("SOURCED");
    expect(debtData.holders.map((h) => h.id).sort()).toEqual(
      Object.keys(rows).sort(),
    );
    for (const holder of debtData.holders)
      expect(holder.share, holder.id).toBeCloseTo(rows[holder.id]! / total, 5);
    expect(debtData.holders.reduce((n, h) => n + h.share, 0)).toBeCloseTo(1, 9);
  });
});
