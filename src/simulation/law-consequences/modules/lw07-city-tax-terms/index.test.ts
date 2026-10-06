import { describe, expect, it } from "vitest";
import { TAX_TERM_QUESTION_ROWS } from "../../../policy-pack-tax-terms";
import { LW07_CITY_TAX_TERM_ROWS, registrations } from "./index";

describe("LW-07 city tax-term data", () => {
  it("defines one dynamic typed-tax assessment row for each assigned city question", () => {
    expect(LW07_CITY_TAX_TERM_ROWS.map((row) => row.id)).toEqual([
      "tax:city:property:recorded-base",
      "tax:city:payroll:recorded-base",
      "tax:city:corporate:recorded-base",
    ]);

    for (const row of LW07_CITY_TAX_TERM_ROWS) {
      expect(row.kind).toBe("tax");
      expect(row.when).toBe("assessment");
      expect(row.who.selector).toBe("recorded-tax-base-payer");
      expect(row.what).toBe("assess-enacted-tax-base");
      expect(row.amount).toEqual({
        op: "record",
        key: "enacted-tax-assessment",
        unit: "minor",
      });
      expect(row.evidence.uncertainty).toMatch(/Current main has no city/i);
      expect(JSON.stringify(row)).not.toMatch(/rateNumerator|rateDenominator/);
    }
  });

  it("does not install a second owner for the shared tax consequence kind", () => {
    expect(registrations).toEqual([]);
  });

  it("attaches each city-specific row to its matching tax-term question", () => {
    const attachedRows = ["property", "payroll", "corporate"].map((family) => {
      const question = TAX_TERM_QUESTION_ROWS.find(
        (row) => row.key === `city.${family}-tax-terms`,
      );
      expect(question).toBeDefined();
      return question!.consequences;
    });

    expect(attachedRows).toEqual(LW07_CITY_TAX_TERM_ROWS.map((row) => [row]));
  });
});
