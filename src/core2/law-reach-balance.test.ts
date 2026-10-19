/**
 * A balanced-budget law closes a gap the way the law says a cut falls: at
 * the federal level, sequestration's rule (Social Security, veterans,
 * low-income programs and interest exempt; Medicare cut at most 4 percent;
 * the gap closed over five years);
 * at a state or town, across every line but debt service.
 */
import { describe, expect, it } from "vitest";
import { balancePlan } from "./law-reach/group-b-money";
import data from "./data/laws/reach-group-b.json" with { type: "json" };
import type { BudgetRow } from "./modules/budgets";

const rules = (
  data as unknown as {
    policies: Record<
      string,
      {
        sequestration: Record<
          string,
          { exempt: string[]; caps: Record<string, number> }
        >;
      }
    >;
  }
).policies["us-policy-positions:fiscal.balanced-operating-budget"]!
  .sequestration;

// A budget shaped like the federal one, in round billions: benefits, interest
// and discretionary lines, with revenue well short of spending.
const federal = {
  spendingMinor: {
    socialSecurity: 1600,
    medicare: 1000,
    incomeSecurity: 700,
    veterans: 400,
    netInterest: 1000,
    nationalDefense: 900,
    health: 900,
    education: 300,
    transportation: 150,
  },
  revenueMinor: { individualIncomeTax: 2700, payroll: 1750, other: 750 },
} as unknown as BudgetRow;

describe("a balanced-budget law's cut", () => {
  it("federal: benefits and interest untouched, Medicare at most 4 percent, the rest share the gap", () => {
    // The last of the five phase-in years closes what remains.
    const plan = balancePlan(federal, rules.federal!, 4);
    for (const line of [
      "socialSecurity",
      "veterans",
      "incomeSecurity",
      "netInterest",
    ])
      expect(plan[line], line).toBeUndefined();
    expect(-plan.medicare!).toBeLessThanOrEqual(Math.ceil(1000 * 0.04));
    const cut = -Object.values(plan).reduce((a, b) => a + b, 0);
    expect(cut).toBeGreaterThanOrEqual(1750);
    // One share across the uncapped lines.
    const share = -plan.nationalDefense! / 900;
    expect(-plan.education! / 300).toBeCloseTo(share, 2);
  });

  it("federal: the first year closes a fifth of the gap", () => {
    const first = -Object.values(balancePlan(federal, rules.federal!)).reduce(
      (a, b) => a + b,
      0,
    );
    expect(first).toBeGreaterThanOrEqual(1750 / 5);
    expect(first).toBeLessThan(1750 / 5 + 10);
  });

  it("a state cuts every line but debt service by one share", () => {
    const state = {
      spendingMinor: { schools: 600, highways: 200, interest: 100 },
      revenueMinor: { sales: 800 },
    } as unknown as BudgetRow;
    const plan = balancePlan(state, rules.default!);
    expect(plan.interest).toBeUndefined();
    expect(-plan.schools! / 600).toBeCloseTo(-plan.highways! / 200, 2);
    expect(-(plan.schools! + plan.highways!)).toBeGreaterThanOrEqual(100);
  });

  it("a budget already in balance is not cut", () => {
    expect(
      balancePlan(
        {
          spendingMinor: { schools: 100 },
          revenueMinor: { sales: 120 },
        } as unknown as BudgetRow,
        rules.default!,
      ),
    ).toEqual({});
  });
});
