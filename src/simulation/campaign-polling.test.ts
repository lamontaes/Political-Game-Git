import { describe, expect, it } from "vitest";

import { campaignPollingQuality, surveyWorkDays } from "./campaign-polling";
import { candidacyPackForJurisdiction } from "./candidacy";
import { addDays } from "./dates";
import { createWorkRelationship } from "./life";
import { createExplicitGeographyLife } from "../presentation/new-game-geography";
import { fileForOffice } from "../presentation/campaign-projection";
import type { EntityId, IsoDate, World } from "./types";

function filedIn(placeKey: string, seed: string) {
  const created = createExplicitGeographyLife({
    placeKey,
    seed,
    startAge: 45,
    startKind: "normal",
    depth: "summarize-earlier-life",
  });
  const personId = created.game.playerPersonId;
  const office = candidacyPackForJurisdiction(
    created.game.world.people[personId]!.homeJurisdictionId,
  )!.offices.find((candidate) => candidate.officeKey.endsWith(":senate"))!;
  const world = fileForOffice(
    created.game.world,
    personId,
    null,
    office.officeKey,
  );
  return { world, personId };
}

function surveyCareer(
  world: World,
  personId: EntityId,
  startedAt: IsoDate,
): World {
  return createWorkRelationship(world, {
    stableKey: `test:survey-career:${personId}`,
    personId,
    organizationId: null,
    startedAt,
    kind: "independent:test-survey-research",
    compensation: "paid",
    authority: "self-directed",
    dependency: "independent",
    economicRisk: "person-borne",
    provenance: { kind: "authored", note: "A survey career, for this test." },
    initialRole: {
      title: "Survey researcher",
      occupationClassification: "custom:onet-19-3022-00",
      locationJurisdictionId: null,
      timeDemand: {
        expectedWeekly: { minimumHours: 35, maximumHours: 45 },
        attention: "moderate",
        concurrency: "partly-concurrent",
        scheduleRigidity: "flexible",
        interruptibility: "interruptible",
        locationJurisdictionId: null,
      },
    },
  });
}

describe("who reads the campaign's numbers", () => {
  it("leaves a campaign with no survey worker to a volunteer's count, and trusts a seasoned researcher more than a new one", () => {
    const { world, personId } = filedIn("2743000", "polling-reader"); // Minneapolis
    const campaign = world.history.campaigns!.at(-1)!;
    expect(surveyWorkDays(world, personId)).toBe(0);
    const volunteer = campaignPollingQuality(world, campaign);
    expect(volunteer.reader.kind).toBe("volunteer");

    const newcomer = surveyCareer(
      world,
      personId,
      addDays(world.currentDate, -200),
    );
    const early = campaignPollingQuality(newcomer, campaign);
    expect(early.reader).toMatchObject({ kind: "experienced", personId });
    expect(early.drawBasisPoints).toBeLessThan(volunteer.drawBasisPoints);

    const seasoned = surveyCareer(
      world,
      personId,
      addDays(world.currentDate, -6 * 365),
    );
    const late = campaignPollingQuality(seasoned, campaign);
    expect(late.drawBasisPoints).toBeLessThan(early.drawBasisPoints);
  }, 300_000);
});
