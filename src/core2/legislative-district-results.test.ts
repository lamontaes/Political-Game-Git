import { describe, expect, it } from "vitest";
import { legislativePlace } from "./electorate-places";
import { districtIdentityCatalog } from "../districts/catalog";
import {
  legislativeDistrictResult,
  legislativeSeatParts,
} from "./legislative-district-results";

describe("legislative district results", () => {
  it("reads a seat id's state, chamber and district", () => {
    expect(legislativeSeatParts("seat:US-MN:lower:01A:0")).toEqual({
      usps: "MN",
      chamber: "lower",
      district: "01A",
    });
    expect(legislativeSeatParts("seat:US-NE:unicameral:001:0")?.chamber).toBe(
      "unicameral",
    );
    expect(legislativeSeatParts("seat:US-MN:governor")).toBeNull();
  });

  it("matches most contested Census districts in a state with coded labels", () => {
    const tx = districtIdentityCatalog().filter(
      (d) => d.stateUsps === "TX" && d.chamber === "state-lower",
    );
    const found = tx.filter((d) =>
      legislativeDistrictResult("TX", "lower", d.districtCode),
    );
    // Texas has 150 House seats; many were uncontested by one party in 2024.
    expect(found.length).toBeGreaterThan(70);
    for (const d of found) {
      const r = legislativeDistrictResult("TX", "lower", d.districtCode)!;
      expect(r.democratic).toBeGreaterThan(0);
      expect(r.republican).toBeGreaterThan(0);
    }
  });

  it("matches named and lettered districts by name", () => {
    const named = (usps: string, chamber: "state-lower" | "state-upper") =>
      districtIdentityCatalog()
        .filter((d) => d.stateUsps === usps && d.chamber === chamber)
        .filter((d) =>
          legislativeDistrictResult(
            usps,
            chamber === "state-lower" ? "lower" : "upper",
            d.districtCode,
          ),
        ).length;
    expect(named("MA", "state-lower")).toBeGreaterThan(20);
    expect(named("MN", "state-lower")).toBeGreaterThan(60);
    expect(named("VT", "state-upper")).toBeGreaterThan(4);
  });

  it("has no result for a state the source lacks", () => {
    expect(legislativeDistrictResult("MD", "lower", "003")).toBeNull();
    expect(legislativeDistrictResult("PR", "lower", "001")).toBeNull();
  });

  it("sets a district's place from its own vote, not the typical margin", () => {
    const d = districtIdentityCatalog().find(
      (x) =>
        x.stateUsps === "OH" &&
        x.chamber === "state-upper" &&
        legislativeDistrictResult("OH", "upper", x.districtCode),
    )!;
    const own = legislativeDistrictResult("OH", "upper", d.districtCode)!;
    const place = legislativePlace(
      "OH",
      `seat:US-OH:upper:${d.districtCode}:0`,
      33,
      0,
      null,
    )!;
    expect(place.rightShare).toBeCloseTo(
      own.republican / (own.republican + own.democratic),
      6,
    );
    expect(place.source).toContain("doi:10.7910/DVN/DODOBJ");
  });
});
