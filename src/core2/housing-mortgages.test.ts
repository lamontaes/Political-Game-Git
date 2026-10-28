/** Opening mortgages follow the national records: who owes by age, when they bought, the rate then. */
import { describe, expect, it } from "vitest";
import { DEFAULT_DATA } from "./data";
import { openingMortgages } from "./housing-mortgages";
import { HOUSING_PARAMETERS } from "./modules/housing";
import { MACRO_PARAMETERS } from "./modules/macro";
import { makeIsoDate } from "./kernel/dates";

const p = (key: string) =>
  (HOUSING_PARAMETERS[key] ??
    MACRO_PARAMETERS[key] ??
    DEFAULT_DATA.parameters[key])!.value;
const source = {
  tag: "ESTIMATED" as const,
  asOf: "2026-01-01",
  citation: "Fixture.",
  estimatedFrom: "Fixture.",
};

describe("opening mortgages", () => {
  it("younger owners owe more often than the oldest; balances are below the price and payments fit a 30-year loan", () => {
    const owners = Array.from({ length: 200 }, (_, i) => ({
      id: `household:${String(i).padStart(3, "0")}`,
      counted: i % 2 === 0,
      memberIds: [`person:${i}`],
      payerIds: i % 2 === 0 ? [] : [`person:${i}`],
      oldest: 1940 + Math.floor(i / 4),
      liquidMinor: i * 1_000,
      valueMinor: 30_000_000,
    }));
    const out = openingMortgages({
      owners,
      startedAt: makeIsoDate("2026-01-01"),
      dueAt: makeIsoDate("2026-02-01"),
      bankId: "organization:bank:fixture",
      bankRoomMinor: Number.POSITIVE_INFINITY,
      usps: "NJ",
      seed: "fixture-seed",
      account: { accountId: "residents:fixture", placeId: "place:fixture" },
      placeId: "place:fixture",
      p,
      source,
    });
    const owes = new Set(out.terms.map((row) => row.householdId));
    const share = (from: number, to: number) => {
      const band = owners.filter(
        (row) => row.oldest >= from && row.oldest < to,
      );
      return band.filter((row) => owes.has(row.id)).length / band.length;
    };
    // Born 1980-1989 (36-45) owe far more often than born 1940-1950 (75+).
    expect(share(1980, 1990)).toBeGreaterThan(share(1940, 1951) + 0.3);
    for (const row of out.terms) {
      expect(row.balanceMinor).toBeLessThanOrEqual(row.originalMinor);
      expect(row.monthsLeft).toBeGreaterThan(0);
      expect(row.monthsLeft).toBeLessThanOrEqual(360);
      expect(row.rate).toBeGreaterThan(0.02);
      expect(row.rate).toBeLessThan(0.2);
    }
    // Full households get a standing bill; counted ones share one flow per place.
    expect(out.contracts.length).toBeGreaterThan(0);
    expect(out.flows).toHaveLength(1);
    expect(out.flows[0]!.amountMinor).toBe(
      out.terms
        .filter((row) => Number(row.householdId.slice(-3)) % 2 === 0)
        .reduce((n, row) => n + row.paymentMinor, 0),
    );
  });
});
