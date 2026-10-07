import { describe, expect, it } from "vitest";
import { createDemoWorld } from "../simulation/demo";
import { lifePlaceByKey } from "../simulation/life-places";
import { localGoverningBodiesForJurisdiction } from "../simulation/candidacy";
import { serializeWorldPayload } from "../simulation/serialization";
import {
  availableCampaignElectionDate,
  campaignElectionDate,
  fileForOffice,
} from "./campaign-projection";
import { projectCampaignOffices } from "./campaign-office-discovery";

function fixture(placeKey: string) {
  const place = lifePlaceByKey(placeKey)!;
  const world = createDemoWorld("county-date-caller", {
    context: place.context,
  });
  const person = Object.values(world.people).find(
    (p) => p.homeJurisdictionId === place.context.jurisdiction.id,
  )!;
  expect(person).toBeDefined();
  return {
    world,
    person,
    offices: localGoverningBodiesForJurisdiction(place.context.jurisdiction.id),
  };
}
// Authored fixture world at actual Census places; this does not prove natural filing or district eligibility.
describe("county calendar reaches existing campaign readers", () => {
  it("shows the published DeSoto date without changing saved facts", () => {
    const { world, person, offices } = fixture("2227540");
    const county = offices.find((o) => o.unit.countyGeoid === "22031")!;
    const before = serializeWorldPayload(world);
    expect(
      availableCampaignElectionDate(
        world,
        person.homeJurisdictionId,
        county.officeKey,
      ),
    ).toBe("2027-11-20");
    expect(
      campaignElectionDate(world, person.homeJurisdictionId, county.officeKey),
    ).toBe("2027-11-20");
    const row = projectCampaignOffices(world, person.id).find(
      (o) => o.officeKey === county.officeKey,
    )!;
    expect(row.electionDate).toBe("2027-11-20");
    expect(row.eligible).toBe(false);
    expect(row.eligibility).toBe(
      "The requirements for this county office have not been established.",
    );
    expect(() =>
      fileForOffice(world, person.id, null, county.officeKey),
    ).toThrow(
      "The requirements for this county office have not been established.",
    );
    expect(row.timing).toContain("2027");
    expect(serializeWorldPayload(world)).toEqual(before);
  });
  it("keeps an unread county disabled and refuses qualification before creating opponents", () => {
    const { world, person, offices } = fixture("2108902");
    const county = offices.find((o) => o.unit.unitType === "county")!;
    const city = offices.find((o) => o.unit.unitType === "municipality")!;
    const before = serializeWorldPayload(world);
    expect(
      availableCampaignElectionDate(
        world,
        person.homeJurisdictionId,
        county.officeKey,
      ),
    ).toBeNull();
    const row = projectCampaignOffices(world, person.id).find(
      (o) => o.officeKey === county.officeKey,
    )!;
    expect(row).toMatchObject({
      electionDate: null,
      eligible: false,
      timing: "This office record has no scheduled election date.",
    });
    expect(() =>
      fileForOffice(world, person.id, null, county.officeKey),
    ).toThrow(
      "The requirements for this county office have not been established.",
    );
    expect(
      availableCampaignElectionDate(
        world,
        person.homeJurisdictionId,
        city.officeKey,
      ),
    ).toBe(
      campaignElectionDate(world, person.homeJurisdictionId, city.officeKey),
    );
    expect(serializeWorldPayload(world)).toEqual(before);
  });
});
