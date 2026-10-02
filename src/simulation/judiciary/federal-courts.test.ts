import { readFileSync } from "node:fs";
import { readZipMember } from "../../source/core";
import { normalizeStateDistricts } from "../../source/domains/federal-courts/normalize";
import { describe, expect, it } from "vitest";
import { FEDERAL_COURTS_PROJECTION } from "./generated/federal-courts";

describe("locked federal court projection", () => {
  it("preserves district county sentences from the locked statute alongside divisions", () => {
    const xml = readZipMember(
      readFileSync("data/source/federal-courts/raw/xml_usc28.zip"),
      "usc28.xml",
    ).toString("utf8");
    for (const section of ["84", "89", "112"]) {
      const normalized = normalizeStateDistricts(
        xml,
        section,
        "locked-title-28",
      );
      for (const row of normalized) {
        const projected = FEDERAL_COURTS_PROJECTION.find(
          (court) => court.courtId === row.courtId,
        )!;
        expect(projected.comprisesCounties).toEqual(row.comprisesCounties);
        expect(
          (row.comprisesCounties?.length ?? 0) + (row.divisions?.length ?? 0),
        ).toBeGreaterThan(0);
      }
    }
    expect(
      FEDERAL_COURTS_PROJECTION.find(
        (row) => row.courtId === "d-california-northern",
      )?.comprisesCounties,
    ).toContain("San Francisco");
    const eastern = normalizeStateDistricts(xml, "113", "locked-title-28").find(
      (row) => row.courtId === "d-north-carolina-eastern",
    )!;
    expect(eastern.comprisesCounties).toContain("Wake");
    expect(eastern.comprisesCounties).not.toContain("Moore");
    expect(eastern.comprisesCounties).not.toContain("Scotland");
    expect(
      FEDERAL_COURTS_PROJECTION.find((row) => row.courtId === eastern.courtId)
        ?.comprisesCounties,
    ).toEqual(eastern.comprisesCounties);
  });
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
