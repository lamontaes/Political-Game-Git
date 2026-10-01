import { describe, expect, it } from "vitest";
import { lifePlaceByKey } from "./life-places";
import { localGoverningBodiesForJurisdiction } from "./candidacy";
import { placeLocalGovernmentUnits } from "./nationwide-world/local-governments";
import {
  localGoverningBodyIdentityForOfficeKey,
  localGoverningBodyCandidacyPack,
} from "./nationwide-world/local-governing-body-candidacy-packs";

describe("actual county identity reaches the shared candidacy reader", () => {
  it("offers DeSoto Parish to Frierson without creating a city or mayor", () => {
    const place = lifePlaceByKey("2227540")!;
    expect(place).toBeDefined();
    const units = placeLocalGovernmentUnits(place);
    expect(units.municipal).toHaveLength(0);
    const offices = localGoverningBodiesForJurisdiction(
      place.context.jurisdiction.id,
    );
    expect(offices).toHaveLength(units.counties.length);
    const office = offices.find((row) => row.unit.countyGeoid === "22031")!;
    expect(office).toBeDefined();
    expect(office.unit.id).toBe("gus2025:127794");
    expect(office.unit.unitType).toBe("county");
    expect(office.bodyName).toBe("Police Jury");
    expect(office.officeTitle).toBe("Police juror");
    expect(office.seat).toBe("governing-body");
    expect(localGoverningBodyIdentityForOfficeKey(office.officeKey)).toEqual(
      office,
    );
    const pack = localGoverningBodyCandidacyPack(office);
    expect(pack.offices[0]!.qualification.filing.kind).toBe("unknown");
    expect(pack.unresolvedGaps.join(" ")).toMatch(/county/);
  });
  it("retains municipal office identities and appends actual counties in a city", () => {
    const place = lifePlaceByKey("2108902")!;
    const units = placeLocalGovernmentUnits(place);
    const offices = localGoverningBodiesForJurisdiction(
      place.context.jurisdiction.id,
    );
    expect(offices[0]!.unit.id).toBe(units.municipal[0]!.id);
    const county = offices.filter((row) => row.unit.unitType === "county");
    expect(county.map((row) => row.unit.id)).toEqual(
      units.counties.map((row) => row.id),
    );
    expect(county.length).toBeGreaterThan(0);
    expect(
      offices.filter((row) => row.unit.unitType === "municipality").length,
    ).toBeGreaterThan(0);
  });
});
