import { describe, expect, it } from "vitest";
import { fixtureMeetsRecordedCandidacyAge } from "../../tests/fixtures/candidacy-age";
import { namedSeatForFixture } from "../../tests/fixtures/campaign-fixture";
import {
  addDays,
  campaignHelperCandidates,
  campaignManagerCandidates,
  campaignManagerOffer,
  offerCampaignManager,
  createWorkRelationship,
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
import {
  addCampaignHelper,
  askToHelp,
  campaignHasHelper,
  helperAskConsiderations,
} from "./campaign-helpers";
import { recordRelationshipInteraction } from "./records";
import type { EntityId, World } from "./types";

function filedCampaign(): {
  world: World;
  campaignId: EntityId;
  candidatePersonId: EntityId;
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
  return {
    world: filed.world,
    campaignId: filed.campaign.id,
    candidatePersonId,
    people,
  };
}

describe("campaign helpers", () => {
  it("uses the previous race, concession reaction, and recorded thanks when volunteers are asked again", () => {
    const filed = filedCampaign();
    const personId = filed.people[0]!;
    const withVolunteer = addCampaignHelper(filed.world, {
      campaignId: filed.campaignId,
      personId,
      role: "volunteer",
      pay: null,
    });
    const currentCampaign = withVolunteer.history.campaigns!.find(
      (row) => row.id === filed.campaignId,
    )!;
    const priorCampaign = {
      ...currentCampaign,
      id: "prior-campaign" as EntityId,
      stableKey: "prior-campaign",
      sequence: currentCampaign.sequence - 1,
      contestId: "prior-contest" as EntityId,
    };
    const currentState = withVolunteer.history.campaignStates!.find(
      (row) => row.campaignId === currentCampaign.id,
    )!;
    const priorState = {
      ...currentState,
      id: "prior-campaign-lost" as EntityId,
      stableKey: "prior-campaign:state:lost",
      sequence: currentState.sequence - 1,
      campaignId: priorCampaign.id,
      status: "lost" as const,
      reason: "The campaign ended with the election.",
    };
    const speech = {
      id: "prior-concession" as EntityId,
      stableKey: "prior-contest:concession",
      sequence: currentState.sequence - 1,
      type: "campaign.concession",
      occurredAt: filed.world.currentDate,
      recordedAt: filed.world.currentDate,
      jurisdictionId: currentCampaign.jurisdictionId,
      involvedEntityIds: [filed.candidatePersonId],
      participants: [],
      personFactConstraints: [],
      visibility: "public",
      tags: ["election.contest:prior-contest"],
      summary: "The candidate conceded the prior race.",
      context: {
        location: null,
        socialContext: null,
        pressure: null,
        choice: null,
        motivation: null,
        immediateReaction: null,
      },
    } as const;
    const reception = {
      ...speech,
      id: "prior-concession-reception" as EntityId,
      stableKey: "prior-contest:concession:reception",
      type: "speech.reception",
      tags: [`speech.of:${speech.id}`],
      participants: [
        {
          personId,
          role: "observation:witness",
          detail: "Heard it and applauded",
        },
      ],
    } as const;
    const worldWithPriorRace = {
      ...withVolunteer,
      history: {
        ...withVolunteer.history,
        campaigns: [priorCampaign, currentCampaign],
        campaignStates: [priorState, currentState],
        events: [...withVolunteer.history.events, speech, reception],
      },
    };
    const thanked = recordRelationshipInteraction(worldWithPriorRace, {
      stableKey: "prior-campaign:thanks",
      personIds: [filed.candidatePersonId, personId],
      eventId: null,
      occurredAt: filed.world.currentDate,
      kind: "support:campaign-thanks",
      change: "strengthened",
      significance: "meaningful",
      summary: "The candidate thanked the volunteer after the loss.",
      tags: [],
    });

    const rows = helperAskConsiderations(
      thanked,
      personId,
      filed.candidatePersonId,
    );
    expect(rows).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          sourceType: "social:previous-race-result",
          optionKey: "help",
          importance: "slight",
        }),
        expect.objectContaining({
          sourceType: "social:concession-reaction",
          optionKey: "help",
          sourceRefs: [{ kind: "historical-event", eventId: reception.id }],
        }),
        expect.objectContaining({
          sourceType: "social:campaign-thanks",
          optionKey: "help",
          sourceRefs: [
            expect.objectContaining({ kind: "relationship-interaction" }),
          ],
        }),
      ]),
    );
  });

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

  it("does not offer a manager salary the campaign cannot cover through election day", () => {
    const filed = filedCampaign();
    const personId = filed.people[0]!;
    const knownWorld = recordRelationshipInteraction(filed.world, {
      stableKey: "campaign-helper-test:known-manager",
      personIds: [filed.candidatePersonId, personId],
      eventId: null,
      occurredAt: filed.world.currentDate,
      kind: "contact:met-in-community",
      change: "formed",
      significance: "meaningful",
      summary: "They met in their community.",
      tags: [],
    });
    const experiencedWorld = createWorkRelationship(knownWorld, {
      stableKey: "prior-campaign-work",
      personId,
      organizationId: null,
      startedAt: addDays(knownWorld.currentDate, -60),
      kind: "volunteer:campaign-staff",
      compensation: "unpaid",
      authority: "shared",
      dependency: "independent",
      economicRisk: "person-borne",
      provenance: { kind: "authored", note: "Fixture campaign history." },
      initialRole: {
        title: "Campaign volunteer",
        occupationClassification: "service:campaign-volunteer",
        locationJurisdictionId: KENTUCKY_CONTEXT.jurisdiction.id,
        timeDemand: {
          expectedWeekly: { minimumHours: 2, maximumHours: 12 },
          attention: "moderate",
          concurrency: "partly-concurrent",
          scheduleRigidity: "flexible",
          interruptibility: "interruptible",
          locationJurisdictionId: KENTUCKY_CONTEXT.jurisdiction.id,
        },
      },
    });
    expect(
      campaignManagerCandidates(experiencedWorld, filed.campaignId),
    ).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ personId, campaignWorkDays: 60 }),
      ]),
    );
    expect(
      campaignManagerOffer(experiencedWorld, filed.campaignId, personId)
        ?.affordable,
    ).toBe(false);
    expect(() =>
      offerCampaignManager(experiencedWorld, filed.campaignId, personId),
    ).toThrow(
      "The campaign cannot cover a manager's salary through election day.",
    );
  });

  it("asks a known person through a deterministic decision and records the answer", () => {
    const filed = filedCampaign();
    const personId = filed.people[0]!;
    const knownWorld = recordRelationshipInteraction(filed.world, {
      stableKey: "campaign-helper-test:known-person",
      personIds: [filed.candidatePersonId, personId],
      eventId: null,
      occurredAt: filed.world.currentDate,
      kind: "contact:met-in-community",
      change: "formed",
      significance: "meaningful",
      summary: "They met in their community.",
      tags: [],
    });
    expect(campaignHelperCandidates(knownWorld, filed.campaignId)).toEqual(
      expect.arrayContaining([{ personId, name: expect.any(String) }]),
    );
    expect(
      campaignHelperCandidates(knownWorld, filed.campaignId).some(
        (candidate) => candidate.personId === filed.candidatePersonId,
      ),
    ).toBe(false);
    expect(() =>
      askToHelp(knownWorld, {
        campaignId: filed.campaignId,
        personId: filed.candidatePersonId,
      }),
    ).toThrow("A candidate cannot be recruited as their own helper.");
    const input = { campaignId: filed.campaignId, personId };
    const first = askToHelp(knownWorld, input);
    const replay = askToHelp(knownWorld, input);
    expect(first).toEqual(replay);
    expect(first.reasons.length).toBeGreaterThan(0);
    expect(
      first.world.history.events.some((event) => event.id === first.eventId),
    ).toBe(true);
    expect(campaignHelperCandidates(first.world, filed.campaignId)).not.toEqual(
      expect.arrayContaining([{ personId, name: expect.any(String) }]),
    );
    expect(first.accepted).toBe(
      campaignHasHelper(first.world, filed.campaignId, personId),
    );
  });
});
