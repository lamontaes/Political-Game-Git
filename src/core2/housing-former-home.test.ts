import { describe, expect, it } from "vitest";
import { formerHome } from "./housing-former-home";

describe("a household's former home", () => {
  it("keeps the rent an evicted renter paid", () => {
    const row = formerHome(
      { tenure: "rent", kind: "apartment", rentMinor: 92_500 },
      {
        householdId: "household_a",
        tenure: "removed",
        basis: "eviction",
        date: "2025-06-10",
      },
    );
    expect(row).toEqual({
      id: "dwelling:household_a",
      householdId: "household_a",
      tenure: "removed",
      formerTenure: "rent",
      kind: "apartment",
      rentMinor: 92_500,
      since: "2025-06-10",
      basis: "eviction",
    });
  });

  it("keeps a foreclosed home's value and a sold home's price", () => {
    const owned = { tenure: "own", kind: "house", valueMinor: 21_000_000 };
    const foreclosed = formerHome(owned, {
      householdId: "household_b",
      tenure: "removed",
      basis: "foreclosure",
      date: "2025-10-11",
    });
    expect(foreclosed.formerTenure).toBe("own");
    expect(foreclosed.valueMinor).toBe(21_000_000);
    expect(foreclosed.rentMinor).toBeUndefined();
    const sold = formerHome(owned, {
      householdId: "household_c",
      tenure: "sold",
      basis: "sale",
      date: "2025-02-17",
      soldForMinor: 19_500_000,
    });
    expect(sold.valueMinor).toBe(19_500_000);
    expect(sold.tenure).toBe("sold");
    expect(sold.basis).toBe("sale");
  });
});
