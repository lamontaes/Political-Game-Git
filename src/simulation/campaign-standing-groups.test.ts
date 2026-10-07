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
import { campaignForCandidate, campaignState } from "./campaign-queries";
import { KENTUCKY_CONTEXT } from "./legislation-scenarios";
import { generatePoliticalStartingConditions } from "./world-setup/political-start";
import { ensureWorldStartingConditions } from "./world-setup/conditions";
import { CRUNCH46_WORLD_OPENING_VERSION } from "./world-setup/types";
import {
  formCampaignStandingGroup,
  STANDING_GROUP_CLASSIFICATION,
  STANDING_GROUP_LEADER_ROLE,
  STANDING_GROUP_MEMBER_KIND,
  STANDING_GROUP_MEMBER_ROLE,
} from "./campaign-standing-groups";
import { addCampaignHelper } from "./campaign-helpers";
import {
  organizationProfileAt,
  organizationParticipationStateAt,
} from "./life-queries";
import { standingGroupMembersInJurisdiction } from "./official-view-reads";
import { peopleKnownTo } from "./living-world/official-views";
import { peopleTiedTo } from "./neighbor-news";
import type { EntityId, World } from "./types";

function filedCampaign(seed: string): {
  world: World;
  campaignId: EntityId;
  candidatePersonId: EntityId;
  volunteerId: EntityId;
  managerId: EntityId;
} {
  const created = createScenarioWorld(seed, KENTUCKY_CONTEXT, {
    peopleCount: 8,
  });
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
  const volunteerId = world.personOrder.find((id) => id !== candidatePersonId)!;
  const managerId = world.personOrder.find(
    (id) => id !== candidatePersonId && id !== volunteerId,
  )!;
  const pack = candidacyPackById("us-ky-general-assembly-v1:candidacy");
  const officeKey = pack?.offices[0]?.officeKey;
  if (!officeKey) throw new Error("Fixture has no candidacy office.");
  const opponents = ensureCampaignOpponents(world, {
    stableKey: `${seed}:opponents`,
    jurisdictionId: KENTUCKY_CONTEXT.jurisdiction.id,
    count: 1,
    excludePersonIds: [candidatePersonId, volunteerId],
  });
  const filed = fileCampaign(opponents.world, {
    stableKey: `${seed}:campaign`,
    candidatePersonId,
    jurisdictionId: KENTUCKY_CONTEXT.jurisdiction.id,
    officeKey,
    districtBinding: namedSeatForFixture(world, candidatePersonId, officeKey),
    electionDate: addDays(world.currentDate, 30),
    rivalPersonIds: opponents.personIds,
    existingContestId: null,
    committeeName: "Campaign committee fixture",
    donorPoolName: "Supporters",
    advertisingVendorName: "Vendor",
    staffPersonIds: [],
    treasuryCurrency: makeCurrencyCode("USD"),
  });
  return {
    world: filed.world,
    campaignId: filed.campaign.id,
    candidatePersonId,
    volunteerId,
    managerId,
  };
}

describe("campaign standing groups", () => {
  it("keeps the committee identity and records the organizer and joining volunteer", () => {
    const filed = filedCampaign("campaign-standing-group-members");
    const withVolunteer = addCampaignHelper(filed.world, {
      campaignId: filed.campaignId,
      personId: filed.volunteerId,
      role: "volunteer",
      pay: null,
    });
    const withStaff = addCampaignHelper(withVolunteer, {
      campaignId: filed.campaignId,
      personId: filed.managerId,
      role: "manager",
      pay: { minorUnits: 1_000, currency: makeCurrencyCode("USD") },
    });
    const campaign = campaignForCandidate(withStaff, filed.candidatePersonId)!;
    const formed = formCampaignStandingGroup(withStaff, {
      campaignId: filed.campaignId,
      name: "Neighbors for safer crosswalks",
    });

    expect(formed.organizationId).toBe(campaign.organizationId);
    expect(campaignState(formed.world, filed.campaignId).status).toBe("active");
    expect(
      organizationProfileAt(formed.world, campaign.organizationId),
    ).toMatchObject({
      name: "Neighbors for safer crosswalks",
      classification: STANDING_GROUP_CLASSIFICATION,
    });
    const founder = formed.world.history.organizationParticipations.find(
      (row) =>
        row.organizationId === campaign.organizationId &&
        row.personId === filed.candidatePersonId &&
        row.kind === STANDING_GROUP_MEMBER_KIND,
    );
    const member = formed.world.history.organizationParticipations.find(
      (row) =>
        row.organizationId === campaign.organizationId &&
        row.personId === filed.volunteerId &&
        row.kind === STANDING_GROUP_MEMBER_KIND,
    );
    const founderState =
      formed.world.history.organizationParticipationStates.find(
        (row) => row.participationId === founder?.id,
      );
    const memberState =
      formed.world.history.organizationParticipationStates.find(
        (row) => row.participationId === member?.id,
      );
    expect(founder).toBeDefined();
    expect(member).toBeDefined();
    expect(founderState?.roleKind).toBe(STANDING_GROUP_LEADER_ROLE);
    expect(memberState?.roleKind).toBe(STANDING_GROUP_MEMBER_ROLE);
    expect(
      organizationParticipationStateAt(formed.world, member!.id)?.status,
    ).toBe("active");
    expect(
      new Set(formed.decisions.map((decision) => decision.personId)),
    ).toEqual(new Set([filed.volunteerId, filed.managerId]));
    expect(
      standingGroupMembersInJurisdiction(formed.world, campaign.jurisdictionId),
    ).toEqual(
      new Set([
        filed.candidatePersonId,
        ...formed.decisions
          .filter((decision) => decision.outcome === "joined")
          .map((decision) => decision.personId),
      ]),
    );
    expect(peopleKnownTo(formed.world, filed.candidatePersonId)).toContain(
      filed.volunteerId,
    );
    expect(
      peopleTiedTo(formed.world, [filed.candidatePersonId], "known"),
    ).toContain(filed.volunteerId);
  });

  it("does not change the committee when no one is available to join", () => {
    const filed = filedCampaign("campaign-standing-group-empty");
    const campaign = campaignForCandidate(
      filed.world,
      filed.candidatePersonId,
    )!;
    const result = formCampaignStandingGroup(filed.world, {
      campaignId: filed.campaignId,
      name: "An empty group",
    });

    expect(result.organizationId).toBeNull();
    expect(result.decisions).toEqual([]);
    expect(
      organizationProfileAt(result.world, campaign.organizationId),
    ).toEqual(organizationProfileAt(filed.world, campaign.organizationId));
  });
});
