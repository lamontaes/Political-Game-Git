import { describe, expect, it } from "vitest";
import budgetBases from "../../data/research/money/public-budget-bases.json" with { type: "json" };
import charges from "../../data/research/money/service-charges-2022.json" with { type: "json" };

type Shares = Record<string, number>;
interface Level {
  chargesAndFees: { totalDollars: number; shares: Shares };
  miscellaneous: { totalDollars: number; shares: Shares };
  againstTable1?: {
    currentCharges: number;
    miscellaneousGeneralRevenue: number;
  };
}
interface Row {
  tag: "SOURCED" | "ESTIMATED";
  state: Level;
  local: Level;
  spread?: Record<string, Record<string, Record<string, [number, number]>>>;
}
const places = charges.places as unknown as Record<string, Row>;

describe("what current charges and miscellaneous revenue are for (Census 2022)", () => {
  it("covers all 56 places, each tagged and each level's shares summing to one", () => {
    const keys = Object.keys(budgetBases.places);
    expect(keys).toHaveLength(56);
    for (const key of keys) {
      const row = places[key];
      expect(row, key).toBeDefined();
      expect(["SOURCED", "ESTIMATED"]).toContain(row!.tag);
      if (row!.tag === "ESTIMATED") expect(row!.spread).toBeDefined();
      for (const level of [row!.state, row!.local])
        for (const family of [level.chargesAndFees, level.miscellaneous]) {
          const sum = Object.values(family.shares).reduce((a, b) => a + b, 0);
          // A place with no revenue of the kind carries no shares (zero); the rest sum to one.
          expect(sum === 0 || Math.abs(sum - 1) < 1e-4, `${key} ${sum}`).toBe(
            true,
          );
        }
    }
  });

  it("agrees with the Census table's own totals within ten percent, except the gaps listed here", () => {
    // The item codes' sum against Table 1's own line, state by state: two Census
    // products that differ by more than ten percent in these places (cause not
    // yet traced: pool item gov-service-charges-table1-gaps). A new gap fails
    // this test; a listed gap that closes must come off the list.
    const known = new Set([
      "US-HI local miscellaneousGeneralRevenue",
      "US-KY local currentCharges",
      "US-MO local currentCharges",
      "US-MO local miscellaneousGeneralRevenue",
      "US-OK state miscellaneousGeneralRevenue",
      "US-SC local currentCharges",
      "US-SC local miscellaneousGeneralRevenue",
      "US-TN state miscellaneousGeneralRevenue",
      "US-TN local miscellaneousGeneralRevenue",
      "US-TX state miscellaneousGeneralRevenue",
    ]);
    const off = new Set<string>();
    for (const [key, row] of Object.entries(places)) {
      if (row.tag !== "SOURCED") continue;
      for (const level of ["state", "local"] as const) {
        const check = row[level].againstTable1!;
        for (const field of [
          "currentCharges",
          "miscellaneousGeneralRevenue",
        ] as const) {
          const ratio = check[field];
          if (ratio !== null && Math.abs(ratio - 1) >= 0.1)
            off.add(`${key} ${level} ${field}`);
        }
      }
    }
    expect([...off].sort()).toEqual([...known].sort());
  });

  it("keeps the nation's shape: hospitals and education lead state charges, sewerage and hospitals lead local ones", () => {
    const us = places.US!;
    const lead = (shares: Shares) =>
      Object.entries(shares)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 2)
        .map(([name]) => name)
        .sort();
    expect(lead(us.state.chargesAndFees.shares)).toEqual([
      "education",
      "hospitals",
    ]);
    expect(lead(us.local.chargesAndFees.shares)).toEqual([
      "hospitals",
      "sewerage-and-solid-waste",
    ]);
  });
});
