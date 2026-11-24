/** Technical fixtures only. These have not been executed or calibrated. */
import { describe, expect, it } from "vitest";
import { projectSalesReceiptBudgetPool } from "./finance-sales-budgets";
import { P } from "./parameters";

const payerId = "fixture:buyer";
const fixture = () => ({
  payerId,
  date: "2021-01-31",
  previousReceivedMinor: 500,
  receivedThroughMinor: 1503,
  anchorAnnualDemandMinor: 12000,
  routes: [
    {
      id: "fixture:route-a",
      payerId,
      payeeId: "fixture:supplier-a",
      amountMinor: 250,
      periodMonths: P.one,
    },
    {
      id: "fixture:route-b",
      payerId,
      payeeId: "fixture:supplier-b",
      amountMinor: 150,
      periodMonths: P.one,
    },
  ],
});

describe("finite actual-sales procurement projection", () => {
  it("uses only the new received amount and conserves the shared rounded cost pool", () => {
    const pool = projectSalesReceiptBudgetPool(fixture());
    expect(pool.receiptsMinor).toBe(1003);
    expect(pool.allocatedMinor).toBe(401);
    expect(
      [...pool.allocatedByContract.values()].reduce(
        (sum, value) => sum + value,
        P.zero,
      ),
    ).toBe(pool.allocatedMinor);
    expect(pool.allocatedMinor).toBeLessThanOrEqual(pool.receiptsMinor);
    expect(pool.allocatedByContract.get("fixture:route-a")).toBe(251);
    expect(pool.allocatedByContract.get("fixture:route-b")).toBe(150);
  });

  it("keeps allocation and tie order independent of supplier input order", () => {
    const input = fixture();
    const first = projectSalesReceiptBudgetPool(input);
    const second = projectSalesReceiptBudgetPool({
      ...input,
      routes: [...input.routes].reverse(),
    });
    expect([...first.allocatedByContract].sort()).toEqual(
      [...second.allocatedByContract].sort(),
    );
  });

  it("requests no new inputs when only old receipts or large forecasts remain", () => {
    const input = fixture();
    const pool = projectSalesReceiptBudgetPool({
      ...input,
      previousReceivedMinor: input.receivedThroughMinor,
      anchorAnnualDemandMinor: input.anchorAnnualDemandMinor * 1000,
    });
    expect(pool.receiptsMinor).toBe(P.zero);
    expect(pool.allocatedMinor).toBe(P.zero);
    expect([...pool.allocatedByContract.values()]).toEqual([P.zero, P.zero]);
  });

  it("rejects a rewound/negative/noninteger cutoff without changing any input", () => {
    const input = fixture();
    const before = JSON.stringify(input);
    expect(() =>
      projectSalesReceiptBudgetPool({ ...input, previousReceivedMinor: 1504 }),
    ).toThrow(/cutoff/);
    expect(() =>
      projectSalesReceiptBudgetPool({ ...input, previousReceivedMinor: -1 }),
    ).toThrow(/cutoff/);
    expect(() =>
      projectSalesReceiptBudgetPool({ ...input, receivedThroughMinor: 1503.5 }),
    ).toThrow(/cutoff/);
    expect(JSON.stringify(input)).toBe(before);
  });

  it("rejects duplicate/self routes and aggregate ratios above one", () => {
    const input = fixture();
    expect(() =>
      projectSalesReceiptBudgetPool({
        ...input,
        routes: [input.routes[P.zero]!, input.routes[P.zero]!],
      }),
    ).toThrow(/distinct/);
    expect(() =>
      projectSalesReceiptBudgetPool({
        ...input,
        routes: [{ ...input.routes[P.zero]!, payeeId: payerId }],
      }),
    ).toThrow(/non-self/);
    expect(() =>
      projectSalesReceiptBudgetPool({
        ...input,
        routes: input.routes.map((row) => ({ ...row, amountMinor: 600 })),
      }),
    ).toThrow(/Aggregate/);
    expect(() =>
      projectSalesReceiptBudgetPool({
        ...input,
        anchorAnnualDemandMinor: P.zero,
      }),
    ).toThrow(/positive/);
  });

  it("normalizes monthly and quarterly reference terms without discarding either route", () => {
    const input = fixture();
    const routes = [
      { ...input.routes[P.zero]!, amountMinor: 200 },
      { ...input.routes[P.one]!, amountMinor: 600, periodMonths: 3 },
    ];
    const pool = projectSalesReceiptBudgetPool({
      ...input,
      previousReceivedMinor: P.zero,
      receivedThroughMinor: 1000,
      routes,
    });
    expect(pool.routeCostShare).toBe(0.4);
    expect(pool.allocatedMinor).toBe(400);
    expect([...pool.allocatedByContract.values()]).toEqual([200, 200]);
    const reordered = projectSalesReceiptBudgetPool({
      ...input,
      previousReceivedMinor: P.zero,
      receivedThroughMinor: 1000,
      routes: [...routes].reverse(),
    });
    expect([...reordered.allocatedByContract].sort()).toEqual(
      [...pool.allocatedByContract].sort(),
    );
  });
});
