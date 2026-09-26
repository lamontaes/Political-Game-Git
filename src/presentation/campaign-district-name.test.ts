import { describe, expect, it } from "vitest";
import { requireLifePlace } from "../simulation";
import { buildProductionWorld } from "./production-world";
import { openOrdinaryLife } from "./ordinary-life";
import { campaignDistrictName, projectCampaign } from "./campaign-projection";
import {
  bindingForDistrict,
  offeredDistricts,
  recordedDistrictForOffice,
} from "./district-selection";
import { candidacyPackForJurisdiction } from "../simulation/candidacy";
import { fileForOffice } from "../../tests/fixtures/campaign-fixture";
import type { DistrictSeatBinding } from "../simulation/types";

/**
 * The district a campaign runs in was saved on the contest and never shown.
 * The campaign screen now says it in words.
 */

function binding(
  geoid: string,
  chamber: DistrictSeatBinding["chamber"] = "state-lower",
): DistrictSeatBinding {
  return {
    vintage: "census-gazetteer-2025",
    compilerVersion: "test",
    chamber,
    geoid,
    recordId: `${chamber}:${geoid}`,
    stateUsps: "KY",
  };
}

describe("the campaign district, in words", () => {
  it("names the district by its number and the chamber by its name", () => {
    expect(
      campaignDistrictName(
        binding("21098"),
        "Kentucky House of Representatives",
      ),
    ).toBe("District 98 of the Kentucky House of Representatives");
    expect(campaignDistrictName(binding("21007", "state-upper"), null)).toBe(
      "District 7",
    );
    expect(campaignDistrictName(null, "Kentucky Senate")).toBeNull();
  });

  it("shows a Kentucky House campaign its own district", () => {
    const built = buildProductionWorld({
      seed: "campaign-district-lexington",
      place: requireLifePlace("lexington-fayette"),
      age: 40,
      givenName: null,
      familyName: null,
      startingLife: "ordinary-life",
      household: "lives-alone",
      depth: "summarize-earlier-life",
    });
    const personId = built.playerPersonId;
    const world = openOrdinaryLife(built.world, personId);
    const house = candidacyPackForJurisdiction(
      world.people[personId]!.homeJurisdictionId,
    )!.offices.find((office) => office.officeKey.endsWith(":house"))!;
    // The district the world placed this home in, or else the first one the
    // screen offers for the chamber.
    const bound =
      recordedDistrictForOffice(world, personId, house.officeKey)?.binding ??
      bindingForDistrict(
        offeredDistricts(
          world,
          world.people[personId]!.homeJurisdictionId,
          house.officeKey,
        )[0]!,
      );

    const before = projectCampaign(world, personId);
    expect(before.districtName).toBeNull();

    const filed = fileForOffice(world, personId, bound);
    const view = projectCampaign(filed, personId);
    const number = String(Number(bound.geoid.slice(2)));
    expect(view.districtName).toBe(
      `District ${number} of the Kentucky House of Representatives`,
    );
  });
});
