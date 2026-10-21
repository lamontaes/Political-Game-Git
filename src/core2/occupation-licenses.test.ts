import { describe, expect, it } from "vitest";
import table from "./data/jobs/occupation-licenses.json" with { type: "json" };
import {
  licensedShare,
  OCCUPATION_LICENSE_GROUPS,
  weightedLicensedShare,
} from "./occupation-licenses";

describe("occupation license shares (BLS CPS 2023, Table 53)", () => {
  it("the groups' worker-weighted share matches the all-employed figure within a point", () => {
    expect(
      Math.abs(weightedLicensedShare() - table.nationalEmployedLicensedShare),
    ).toBeLessThan(0.01);
  });

  it("every group reads a share inside its band, licensed work ranking above unlicensed", () => {
    for (const g of OCCUPATION_LICENSE_GROUPS) {
      const s = licensedShare(g.id);
      expect(s.low).toBeLessThanOrEqual(s.value);
      expect(s.value).toBeLessThanOrEqual(s.high);
    }
    expect(licensedShare("healthcare-practitioner").value).toBeGreaterThan(
      licensedShare("food-service").value,
    );
    expect(() => licensedShare("no-such-group")).toThrow();
  });
});
