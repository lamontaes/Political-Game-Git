import { describe, expect, it } from "vitest";
import { fixtureMeetsRecordedCandidacyAge } from "../../tests/fixtures/candidacy-age";
import { namedSeatForFixture } from "../../tests/fixtures/campaign-fixture";
import {
  addDays,
  candidacyPackById,
  createScenarioWorld,
  ensureCampaignOpponents,
  fileCampaign,
  makeCurrencyCode,
} from "./index";
import { KENTUCKY_CONTEXT } from "./legislation-scenarios";
import { generatePoliticalStartingConditions } from "./world-setup/political-start";
import { ensureWorldStartingConditions } from "./world-setup/conditions";
import { CRUNCH46_WORLD_OPENING_VERSION } from "./world-setup/types";
import { addCampaignHelper } from "./campaign-helpers";
import type { EntityId, World } from "./types";

function filedCampaign(): {
  world: World;
  campaignId: EntityId;
  people: EntityId[];
} {
  const created = createScenarioWorld(
    "campaign-helper-test",
    KENTUCKY_CONTEXT,
    {
      peopleCount: 8,
    },
  );
  const candidatePersonId = created.personOrder.find((id) =>
    fixtureMeetsRecordedCandidacyAge(created, id),
  );
  if (!candidatePersonId) throw new Error("Fixture has no eligible candidate.");
  const world = ensureWorldStartingConditions(
    { ...created, control: { kind: "person", personId: candidatePersonId } },
    {
      openingVersion: CRUNCH46_WORLD_OPENING_VERSION,
      political: generatePoliticalStartingConditions,
    },
  );
  const people = world.personOrder.filter((id) => id !== candidatePersonId);
  const pack = candidacyPackById("us-ky-general-assembly-v1:candidacy");
  const officeKey = pack?.offices[0]?.officeKey;
  if (!officeKey) throw new Error("Fixture candidacy pack has no office.");
  const opponents = ensureCampaignOpponents(world, {
    stableKey: "campaign-helper-test",
    jurisdictionId: KENTUCKY_CONTEXT.jurisdiction.id,
    count: 1,
    excludePersonIds: [candidatePersonId, people[0]!],
  });
  const filed = fileCampaign(opponents.world, {
    stableKey: "campaign-helper-test",
    candidatePersonId,
    jurisdictionId: KENTUCKY_CONTEXT.jurisdiction.id,
    officeKey,
    districtBinding: namedSeatForFixture(world, candidatePersonId, officeKey),
    electionDate: addDays(world.currentDate, 30),
    rivalPersonIds: opponents.personIds,
    existingContestId: null,
    committeeName: "Campaign helper test committee",
    donorPoolName: "Supporters",
    advertisingVendorName: "Vendor",
    staffPersonIds: [],
    treasuryCurrency: makeCurrencyCode("USD"),
  });
  return { world: filed.world, campaignId: filed.campaign.id, people };
}

describe("campaign helpers", () => {
  it("adds a volunteer as canonical unpaid campaign work", () => {
    const filed = filedCampaign();
    const joined = addCampaignHelper(filed.world, {
      campaignId: filed.campaignId,
      personId: filed.people[0]!,
      role: "volunteer",
      pay: null,
    });
    const campaign = (joined.history.campaigns ?? []).find(
      (row) => row.id === filed.campaignId,
    )!;
    const work = joined.history.workRelationships.find((row) =>
      campaign.staffWorkRelationshipIds.includes(row.id),
    )!;
    expect(work.personId).toBe(filed.people[0]);
    expect(work.kind).toBe("volunteer:campaign-staff");
    expect(work.compensation).toBe("unpaid");
    expect(
      addCampaignHelper(filed.world, {
        campaignId: filed.campaignId,
        personId: filed.people[0]!,
        role: "volunteer",
        pay: null,
      }),
    ).toEqual(joined);
  });

  it("refuses an unfunded manager salary", () => {
    const filed = filedCampaign();
    expect(() =>
      addCampaignHelper(filed.world, {
        campaignId: filed.campaignId,
        personId: filed.people[0]!,
        role: "manager",
        pay: null,
      }),
    ).toThrow("A campaign manager requires a funded salary.");
  });
});
