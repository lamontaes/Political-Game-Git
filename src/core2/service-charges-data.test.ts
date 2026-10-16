import { describe, expect, it } from "vitest";
import { randomBytes } from "node:crypto";
import { drawPlace } from "../../scripts/core2-year/place";
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

  it("agrees with the Census table's own totals within ten percent in a drawn place", () => {
    const seed =
      process.env.GOLDEN_PATH_SEED ?? randomBytes(16).toString("hex");
    const place = drawPlace(seed, "service-charges");
    const row = places[place.state]!;
    const context = `${place.name} (${place.state}), seed ${seed}`;
    if (row.tag !== "SOURCED") return;
    for (const level of [row.state, row.local]) {
      const check = level.againstTable1!;
      if (check.currentCharges !== null)
        expect(Math.abs(check.currentCharges - 1), context).toBeLessThan(0.1);
      if (check.miscellaneousGeneralRevenue !== null)
        expect(
          Math.abs(check.miscellaneousGeneralRevenue - 1),
          context,
        ).toBeLessThan(0.1);
    }
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
