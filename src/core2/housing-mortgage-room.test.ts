/**
 * The town bank's room for day-one mortgages comes from its own capital and
 * the lines it already carries (owner, Nov 16, 2026: "Everything comes from
 * the simulation. Stop pegging things to real numbers."), the rule credit
 * lends by, not from a published share of community banks' loans. A bank with
 * more capital has more room; one with business lines out has less; nothing
 * reads a fixed share of loans.
 */
import { describe, expect, it } from "vitest";
import housingParameters from "./data/housing/parameters.json" with { type: "json" };
import { openingMortgageRoom } from "./modules/housing";

const bank = (liquidMinor: number) => ({
  id: "organization:bank:a",
  liquidMinor,
});
const line = (
  limitMinor: number,
  lenderId = "organization:bank:a",
  active = true,
) => ({
  lenderId,
  active,
  limitMinor,
});

describe("the town bank's room for day-one mortgages", () => {
  it("grows with the bank's capital", () => {
    const small = openingMortgageRoom(bank(1_000_000), []);
    const large = openingMortgageRoom(bank(2_000_000), []);
    expect(small).toBeGreaterThan(0);
    expect(large / small).toBeCloseTo(2, 6);
  });

  it("shrinks by the lines the bank already extended, never below none", () => {
    const open = openingMortgageRoom(bank(1_000_000), []);
    expect(openingMortgageRoom(bank(1_000_000), [line(1_500_000)])).toBe(
      open - 1_500_000,
    );
    // Another lender's line, and a closed one, take none of this bank's room.
    expect(
      openingMortgageRoom(bank(1_000_000), [
        line(1_500_000, "organization:bank:b"),
        line(1_500_000, "organization:bank:a", false),
      ]),
    ).toBe(open);
    expect(openingMortgageRoom(bank(1_000_000), [line(open * 3)])).toBe(0);
  });

  it("no published share of loans sets it", () => {
    expect(
      Object.keys(housingParameters).filter((key) =>
        /BankMortgageShare/.test(key),
      ),
    ).toEqual([]);
  });
});
