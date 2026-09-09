import { describe, expect, it } from "vitest";

import {
  currentTaxPermission,
  queryFiscalAuthority,
  type PortableTaxAuthority,
} from "../fiscal-authority/query";

const RECORD: PortableTaxAuthority = {
  kind: "TAX_INSTRUMENT",
  recordId: "AK:MUNICIPALITY:instrument:GENERAL_SALES_TAX",
  stateUsps: "AK",
  level: "MUNICIPALITY",
  instrument: "GENERAL_SALES_TAX",
  authorization: "AUTHORIZED_WITH_VOTER_APPROVAL",
  effectiveFrom: "1986-01-01",
  effectiveThrough: null,
  sourceAsOf: "2026-09-09",
  source: {
    artifactId: "ak-municipal-sales-use-tax-statutes",
    citation: "Alaska Stat. §§ 29.45.670, 29.45.700",
    url: "https://www.akleg.gov/basis/statutes.asp",
    evidenceLocator: "Alaska Stat. §§ 29.45.670, 29.45.700",
    effectiveDateDerivation: null,
  },
  constraints: ["Voter ratification is required for a new tax."],
  uncertainty: null,
};

function at(asOfDate: string) {
  return queryFiscalAuthority([RECORD], {
    stateUsps: "AK",
    level: "MUNICIPALITY",
    instrument: "GENERAL_SALES_TAX",
    asOfDate,
  });
}

describe("dated fiscal-authority query", () => {
  it("distinguishes before, on, and after the effective date", () => {
    expect(at("1985-12-31").state).toBe("NOT_YET_EFFECTIVE");
    expect(at("1986-01-01").state).toBe("IN_FORCE");
    expect(at("2026-09-09").state).toBe("IN_FORCE");
  });

  it("returns constraints and exact source identity without mutating input", () => {
    const before = JSON.stringify([RECORD]);
    const result = at("2026-09-09");
    expect(result.state).toBe("IN_FORCE");
    if (result.state !== "IN_FORCE") return;
    expect(result.record.constraints).toEqual([
      "Voter ratification is required for a new tax.",
    ]);
    expect(result.record.source).toMatchObject({
      artifactId: "ak-municipal-sales-use-tax-statutes",
      evidenceLocator: "Alaska Stat. §§ 29.45.670, 29.45.700",
      effectiveDateDerivation: null,
    });
    expect(currentTaxPermission(result)).toBe("PERMITTED");
    expect(JSON.stringify([RECORD])).toBe(before);
  });

  it("does not turn a missing or wrong-level record into a prohibition", () => {
    const missing = queryFiscalAuthority([RECORD], {
      stateUsps: "AK",
      level: "SPECIAL_DISTRICT",
      instrument: "GENERAL_SALES_TAX",
      asOfDate: "2026-09-09",
    });
    expect(missing.state).toBe("UNESTABLISHED");
    expect(currentTaxPermission(missing)).toBe("UNESTABLISHED");
  });

  it("refuses invalid dates and ambiguous duplicate authority", () => {
    expect(() => at("09/09/2026")).toThrow(/YYYY-MM-DD/);
    expect(() => at("2026-02-31")).toThrow(/YYYY-MM-DD/);
    const conflict = queryFiscalAuthority(
      [RECORD, { ...RECORD, recordId: `${RECORD.recordId}:second` }],
      {
        stateUsps: "AK",
        level: "MUNICIPALITY",
        instrument: "GENERAL_SALES_TAX",
        asOfDate: "2026-09-09",
      },
    );
    expect(conflict.state).toBe("CONFLICTING");
  });

  it("refuses an inverted source interval before applying it", () => {
    expect(() =>
      queryFiscalAuthority(
        [
          {
            ...RECORD,
            effectiveFrom: "2026-01-02",
            effectiveThrough: "2026-01-01",
          },
        ],
        {
          stateUsps: "AK",
          level: "MUNICIPALITY",
          instrument: "GENERAL_SALES_TAX",
          asOfDate: "2026-01-01",
        },
      ),
    ).toThrow(/ends before it begins/);
  });
});
