import { describe, expect, it } from "vitest";
import { candidacyAuthority } from "../simulation/candidacy";
import { createScenarioWorld } from "../simulation/demo";
import { requireLifePlace } from "../simulation/life-places";
import {
  municipalGovernmentForLifePlace,
  municipalRulePackFor,
  primaryReading,
} from "../simulation/municipal-government";
import { hometownCountyEquivalentGeoid } from "./place-hometown-population";
import { projectGovernmentBrowser } from "./politics-government";

describe("D.C. institution identity without invented authority", () => {
  it("joins the reviewed District government while retaining separate county identity", () => {
    const place = requireLifePlace("1150000");
    const government = municipalGovernmentForLifePlace(place)!;
    expect(government).not.toBeNull();
    expect(government.key).toBe("us-dc-washington");
    expect(government.identity).toMatchObject({
      placeRepresentation: "district-of-columbia",
      publisherId: "124214",
      countyAreaGeoid: "11001",
      countyEquivalentGeoid: null,
      governmentUnit: { functionalActive: true, unitType: "2 - MUNICIPAL" },
    });
    expect(hometownCountyEquivalentGeoid(place)).toBeNull();
    const reading = primaryReading(government);
    expect(reading.evidence).toBe("enacted-text");
    expect(reading.bodyName).toBe("Council of the District of Columbia");
    expect(reading.bodySize).toBe(13);
    expect(reading.composition).toMatchObject({
      atLargeSeats: 5,
      wardSeats: 8,
    });
    expect(reading.mayor).toMatchObject({
      title: "Mayor of the District of Columbia",
      structuralPosition: "SEPARATE_CHIEF_EXECUTIVE",
    });
    expect(reading.manager).toBeNull();
    expect(municipalRulePackFor(government).ok).toBe(false);
    expect(candidacyAuthority(place.context.jurisdiction.id).pack).toBeNull();
  });

  it("shows Council and Mayor without a governor or fabricated holders and spends no time", () => {
    const place = requireLifePlace("1150000");
    const world = createScenarioWorld(
      "w65-dc-institution-identity",
      place.context,
      { peopleCount: 4 },
    );
    const before = JSON.stringify(world);
    const view = projectGovernmentBrowser(world, world.personOrder[0]!, {
      jurisdictionId: place.context.jurisdiction.id,
    });
    expect(view.branches.map((row) => row.branch)).toEqual([
      "legislative",
      "executive",
    ]);
    const entries = view.branches.flatMap((row) => row.entries);
    expect(entries.map((row) => row.title)).toEqual([
      "Council of the District of Columbia",
      "Mayor of the District of Columbia",
    ]);
    expect(entries.every((row) => row.holderPersonId === null)).toBe(true);
    expect(JSON.stringify(world)).toBe(before);
  });
});
