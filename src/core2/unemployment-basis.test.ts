/** Each state's unemployment benefit basis is a structured field, set by the compiler, not read from prose at the claim. */
import { describe, expect, it } from "vitest";
import startingLaw from "./data/laws/starting-law.json";

interface Terms {
  readonly weeklyBenefitAppliesTo?: string;
  readonly weeklyBenefitBasisQuarters?: number | null;
}
const rows = Object.entries(
  (
    startingLaw as unknown as {
      jurisdictions: Record<string, { series: string; terms?: Terms }[]>;
    }
  ).jurisdictions,
)
  .flatMap(([jurisdiction, list]) =>
    list.map((row) => ({ ...row, id: `${jurisdiction} ${row.series}` })),
  )
  .filter(
    (row) =>
      row.series === "unemployment-insurance" &&
      row.terms?.weeklyBenefitAppliesTo !== undefined,
  );

describe("unemployment benefit basis", () => {
  it("every program row with a basis in words carries its quarters", () => {
    expect(rows.length).toBeGreaterThan(40);
    for (const row of rows)
      expect([0, 1, 2, 4, null], row.id).toContain(
        row.terms!.weeklyBenefitBasisQuarters,
      );
  });
  it("the quarters follow the words: a weekly wage, the high quarter, two highest quarters, the base year", () => {
    const quarters = (words: string) =>
      new Set(
        rows
          .filter((row) => row.terms!.weeklyBenefitAppliesTo === words)
          .map((row) => row.terms!.weeklyBenefitBasisQuarters),
      );
    expect(quarters("high-quarter wages")).toEqual(new Set([1]));
    expect(quarters("sum of 2 highest quarters")).toEqual(new Set([2]));
    expect(quarters("claimant AWW in base period")).toEqual(new Set([0]));
    expect(quarters("base-period wages")).toEqual(new Set([4]));
  });
});
