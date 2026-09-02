import { describe, expect, it } from "vitest";

import {
  conflicting,
  isKnown,
  isUnresolved,
  known,
  knownValue,
  notApplicable,
  unknown,
  type ProvenanceRecord,
  type SourcedValue,
} from "./sourced-value.js";

const PROVENANCE: ProvenanceRecord = {
  sourceId: "census-cog-2022",
  authoritativeUrl:
    "https://www.census.gov/data/tables/2022/econ/gus/public-use-files.html",
  publisher: "U.S. Census Bureau",
  effectiveDate: "2022-01-01",
  locator: "CG2200ORG01",
  sourceClassification: "CENSUS_FEDERAL_RECORD",
};

describe("SourcedValue", () => {
  it("reads a known value", () => {
    expect(knownValue(known(42, PROVENANCE))).toBe(42);
  });

  it("never substitutes a value for an unresolved state", () => {
    const cases: SourcedValue<number>[] = [
      unknown("part-time conversion inputs not published"),
      notApplicable("unicameral legislature has no upper chamber"),
      conflicting([
        { claim: 1, provenance: PROVENANCE },
        { claim: 2, provenance: PROVENANCE },
      ]),
      {
        state: "HISTORICAL",
        value: 7,
        effectiveStart: "1942-01-01",
        effectiveEnd: "1972-01-01",
        provenance: PROVENANCE,
      },
    ];
    for (const value of cases) {
      expect(knownValue(value)).toBeUndefined();
      expect(isKnown(value)).toBe(false);
    }
  });

  it("keeps UNKNOWN distinct from a known zero", () => {
    const absent = unknown("not published");
    const zero = known(0, PROVENANCE);

    expect(knownValue(absent)).toBeUndefined();
    expect(knownValue(zero)).toBe(0);
    // The distinction survives the falsy check that would collapse them.
    expect(knownValue(absent) ?? "absent").toBe("absent");
    expect(knownValue(zero) ?? "absent").toBe(0);
  });

  it("treats UNKNOWN and CONFLICTING as unsafe to compute with, but NOT_APPLICABLE as settled", () => {
    expect(isUnresolved(unknown())).toBe(true);
    expect(
      isUnresolved(conflicting([{ claim: 1, provenance: PROVENANCE }])),
    ).toBe(true);
    expect(isUnresolved(notApplicable("no such chamber"))).toBe(false);
    expect(isUnresolved(known(1, PROVENANCE))).toBe(false);
  });

  it("omits an absent reason rather than inventing one", () => {
    expect(unknown()).toEqual({ state: "UNKNOWN" });
    expect(unknown("no source")).toEqual({
      state: "UNKNOWN",
      reason: "no source",
    });
  });
});
