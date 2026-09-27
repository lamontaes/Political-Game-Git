import { describe, expect, it } from "vitest";
import { FEDERAL_COURTS_PROJECTION } from "./generated/federal-courts";

describe("locked federal court projection", () => {
  it("preserves 13 appellate and 94 district identities without bankruptcy detail", () => {
    const circuits = FEDERAL_COURTS_PROJECTION.filter(
      (court) => court.courtKind === "court-of-appeals",
    );
    const districts = FEDERAL_COURTS_PROJECTION.filter(
      (court) => court.courtKind === "district-court",
    );
    expect(circuits).toHaveLength(13);
    expect(districts).toHaveLength(94);
    expect(
      new Set(FEDERAL_COURTS_PROJECTION.map((court) => court.courtId)).size,
    ).toBe(107);
    expect(
      FEDERAL_COURTS_PROJECTION.every(
        (court) => court.establishedByCitation.length > 0,
      ),
    ).toBe(true);
  });

  it("keeps territory district geography and the absence of an American Samoa federal district", () => {
    const districts = FEDERAL_COURTS_PROJECTION.filter(
      (court) => court.courtKind === "district-court",
    );
    expect(districts.some((court) => court.jurisdictionName === "Guam")).toBe(
      true,
    );
    expect(
      districts.some((court) => court.jurisdictionName === "Virgin Islands"),
    ).toBe(true);
    expect(
      districts.some(
        (court) => court.jurisdictionName === "Northern Mariana Islands",
      ),
    ).toBe(true);
    expect(
      districts.some((court) => court.jurisdictionName === "American Samoa"),
    ).toBe(false);
  });
});
