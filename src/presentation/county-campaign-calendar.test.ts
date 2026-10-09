import { describe, expect, it } from "vitest";
import { createDemoWorld } from "../simulation/demo";
import { lifePlaceByKey } from "../simulation/life-places";
import { localGoverningBodiesForJurisdiction } from "../simulation/candidacy";
import { activeCampaignForCandidate } from "../simulation";
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
    // A county board seat takes the qualified-elector age as its labeled
    // estimate, as a town council seat does, rather than refusing the filing.
    expect(row.eligible).toBe(true);
    expect(row.eligibility).toBe("Eligible · Minimum age: 18 (estimated)");
    expect(row.timing).toContain("2027");
    expect(serializeWorldPayload(world)).toEqual(before);
    const filed = fileForOffice(world, person.id, null, county.officeKey);
    const campaign = activeCampaignForCandidate(filed, person.id)!;
    expect(campaign.officeKey).toBe(county.officeKey);
    expect(
      filed.history.electionContests?.find(
        (contest) => contest.id === campaign.contestId,
      )?.electionDate,
    ).toBe("2027-11-20");
  });
  it("reads the state calendar for a county without its own profile and files on the qualified-elector estimate", () => {
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
    ).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    const row = projectCampaignOffices(world, person.id).find(
      (o) => o.officeKey === county.officeKey,
    )!;
    expect(row.electionDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(row.eligible).toBe(true);
    expect(row.timing).toMatch(/^Next election: .+ \(estimated\)$/);
    expect(
      activeCampaignForCandidate(
        fileForOffice(world, person.id, null, county.officeKey),
        person.id,
      )?.officeKey,
    ).toBe(county.officeKey);
    expect(
      availableCampaignElectionDate(
        world,
        person.homeJurisdictionId,
        city.officeKey,
      ),
    ).toBe(
      campaignElectionDate(world, person.homeJurisdictionId, city.officeKey),
    );
    expect(
      projectCampaignOffices(world, person.id).find(
        (o) => o.officeKey === city.officeKey,
      )?.timing,
    ).toMatch(/^Next election: .+ \(estimated\)$/);
    expect(serializeWorldPayload(world)).toEqual(before);
  });
});
