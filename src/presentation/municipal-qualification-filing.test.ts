import { describe, expect, it } from "vitest";
import { createScenarioWorld } from "../simulation/demo";
import { smallWorld } from "../../tests/fixtures/small-world";
import { searchLifePlaces } from "../simulation/life-places";
import { candidacyEligibility } from "../simulation/candidacy";
import { isoDateFromParts, yearOf } from "../simulation/dates";
import { serializeWorld, deserializeWorld } from "../simulation/serialization";
import { fileForOffice } from "./campaign-projection";
import { projectCampaignOffices } from "./campaign-office-discovery";
void createScenarioWorld;
const place = searchLifePlaces("East Providence", 100).find((p) =>
  p.displayName.includes("East Providence"),
)!;
const officeKey = "local-government-194033-chief-executive";
describe("municipal estimate reaches the existing filing writer", () => {
  it("explains an underage refusal and preserves the estimate in a canonical saved filing", () => {
    const built = smallWorld({
      place: place.key,
      seed: "session13-estimate-filing",
    });
    const atAge = (age: number) => ({
      ...built.world,
      people: {
        ...built.world.people,
        [built.personId]: {
          ...built.world.people[built.personId]!,
          birthDate: isoDateFromParts(
            yearOf(built.world.currentDate) - age,
            1,
            1,
          ),
        },
      },
    });
    const younger = atAge(20);
    const eligibility = candidacyEligibility(younger, {
      personId: built.personId,
      jurisdictionId: younger.people[built.personId]!.homeJurisdictionId,
      officeKey,
      alreadyACandidate: false,
    });
    expect(
      eligibility.blocks.find((b) => b.kind === "profile-minimum-age")!.reason,
    ).toContain("estimated from similar elected offices in Rhode Island");
    expect(
      projectCampaignOffices(younger, built.personId).find(
        (o) => o.officeKey === officeKey,
      )!.eligible,
    ).toBe(false);
    const adult = built.world;
    const offered = projectCampaignOffices(adult, built.personId).find(
      (o) => o.officeKey === officeKey,
    )!;
    expect(offered.eligible).toBe(true);
    expect(offered.eligibility).toContain(
      "municipality's own age rule is unconfirmed",
    );
    expect(offered.eligibility).not.toMatch(/pack|data/i);
    const filed = fileForOffice(adult, built.personId, null, officeKey);
    const event = filed.history.events.find(
      (e) => e.type === "campaign.candidacy-filed",
    )!;
    const tag = event.tags.find((t) =>
      t.startsWith("qualification.minimum-age-estimate:"),
    )!;
    expect(
      JSON.parse(tag.slice("qualification.minimum-age-estimate:".length)),
    ).toEqual(eligibility.minimumAgeEstimate);
    const loaded = deserializeWorld(serializeWorld(filed));
    expect(loaded.history.events.find((e) => e.id === event.id)!.tags).toEqual(
      event.tags,
    );
  });
});
