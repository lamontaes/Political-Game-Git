import { describe, expect, it } from "vitest";
import {
  campaignForCandidate,
  candidacyEligibility,
  createCharacterHistoryContextPerson,
  deserializeWorld,
  requireLifePlace,
  serializeWorld,
} from "../simulation";
import { makeIsoDate } from "../simulation/dates";
import { advanceWorld } from "../simulation/world";
import { buildProductionWorld } from "./production-world";
import { openOrdinaryLife } from "./ordinary-life";
import { fileForOffice } from "./campaign-projection";
import { projectCampaignOffices } from "./campaign-office-discovery";

const ASSEMBLY = "us-nv-legislature-v1:assembly";

function alamoLife(seed: string) {
  const built = buildProductionWorld({
    seed,
    place: requireLifePlace("3200500"),
    age: 34,
    givenName: null,
    familyName: null,
    startingLife: "ordinary-life",
    household: "lives-alone",
    depth: "summarize-earlier-life",
  });
  return {
    world: openOrdinaryLife(built.world, built.playerPersonId),
    personId: built.playerPersonId,
  };
}

function eligibilityOn(
  world: ReturnType<typeof alamoLife>["world"],
  personId: string,
) {
  return candidacyEligibility(world, {
    personId,
    jurisdictionId: world.people[personId]!.homeJurisdictionId,
    officeKey: ASSEMBLY,
    alreadyACandidate: false,
  });
}

describe("Nevada legislator qualifications through ordinary discovery and filing", () => {
  it("applies NRS 218A.200 on the opening date, then files the Assembly seat after a real year in Nevada", () => {
    const opened = alamoLife("rules-to-play-nv-alamo");
    const priorIds = new Set(opened.world.personOrder);
    const worldAtArrival = createCharacterHistoryContextPerson(opened.world, {
      stableKey: "rules-to-play-nv:new-resident",
      givenName: "Test",
      familyName: "Newcomer",
      birthDate: "1990-01-01",
      homeJurisdictionId:
        opened.world.people[opened.personId]!.homeJurisdictionId,
    });
    const personId = worldAtArrival.personOrder.find(
      (id) => !priorIds.has(id),
    )!;
    expect(worldAtArrival.currentDate >= "2025-10-01").toBe(true);

    // On the opening date the law applies; the only thing standing in the way
    // is a fact about this explicit newcomer: their records begin today.
    const before = serializeWorld(worldAtArrival);
    const openingAssembly = projectCampaignOffices(
      worldAtArrival,
      personId,
    ).find((office) => office.officeKey === ASSEMBLY);
    expect(openingAssembly).toBeDefined();
    expect(openingAssembly!.eligibility).not.toMatch(/observ/);
    expect(serializeWorld(worldAtArrival)).toBe(before);
    const opening = eligibilityOn(worldAtArrival, personId);
    expect(opening.blocks.map((block) => block.reason)).toEqual([
      "Not resident long enough: NRS 218A.200 requires 1 year, and this character has lived here 0.",
    ]);

    // A year of this same life later, the recorded residence satisfies it.
    const world = advanceWorld(worldAtArrival, 366);
    const assembly = projectCampaignOffices(world, personId).find(
      (office) => office.officeKey === ASSEMBLY,
    );
    expect(assembly?.eligible).toBe(true);

    const eligibility = eligibilityOn(world, personId);
    const byField = Object.fromEntries(
      eligibility.qualificationAssessments.map((entry) => [entry.field, entry]),
    );
    expect(byField.MINIMUM_AGE).toMatchObject({
      verdict: "meets",
      source: { citation: "NRS 218A.200" },
    });
    expect(byField.STATE_RESIDENCE).toMatchObject({
      verdict: "meets",
      source: { citation: "NRS 218A.200" },
    });
    expect(eligibility.blocks).toEqual([]);

    const filed = fileForOffice(world, personId, null, ASSEMBLY);
    expect(campaignForCandidate(filed, personId)?.officeKey).toBe(ASSEMBLY);
    const reloaded = deserializeWorld(serializeWorld(filed));
    expect(campaignForCandidate(reloaded, personId)?.officeKey).toBe(ASSEMBLY);
    expect(serializeWorld(reloaded)).toBe(serializeWorld(filed));
  });

  it("keeps refusing on a date before chapter 323 took effect, naming the date", () => {
    const { world, personId } = alamoLife("rules-to-play-nv-alamo");
    const earlier = eligibilityOn(
      { ...world, currentDate: makeIsoDate("2025-09-30") },
      personId,
    );
    expect(earlier.eligible).toBe(false);
    const reasons = earlier.blocks.map((block) => block.reason).join(" ");
    expect(reasons).toContain(
      "NRS 218A.200 is supported from 2025-10-01; its applicability on 2025-09-30 is not established by the acquired evidence.",
    );
    expect(reasons).not.toMatch(/observed/);
  });
});
