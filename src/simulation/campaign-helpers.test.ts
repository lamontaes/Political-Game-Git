import { describe, expect, it } from "vitest";
import { fixtureMeetsRecordedCandidacyAge } from "../../tests/fixtures/candidacy-age";
import { namedSeatForFixture } from "../../tests/fixtures/campaign-fixture";
import {
  addDays,
  campaignState,
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
import { createStableId } from "./ids";
import { recordWorldEvent } from "./world";
import { ensurePeopleTraits } from "./people-traits";
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

  it("reads the last result, a recorded concession reaction, and a thank-you interaction on a later ask", () => {
    const filed = filedCampaign();
    const personId = filed.people[0]!;
    const candidateId = filed.candidatePersonId;
    let world = ensurePeopleTraits(filed.world, [personId]);
    world = recordWorldEvent(world, {
      stableKey: "campaign-helper-test:concession",
      type: "campaign.concession",
      occurredAt: world.currentDate,
      recordedAt: world.currentDate,
      jurisdictionId: KENTUCKY_CONTEXT.jurisdiction.id,
      involvedEntityIds: [candidateId, personId],
      participants: [
        { personId: candidateId, role: "focus:subject", detail: "Conceded" },
        {
          personId,
          role: "observation:witness",
          detail: "Heard the concession",
        },
      ],
      personFactConstraints: [],
      visibility: "public",
      tags: ["campaign.election-night"],
      summary: "The candidate conceded the election.",
      context: {
        location: null,
        socialContext: "Election night",
        pressure: null,
        choice: "Concede",
        motivation: null,
        immediateReaction: null,
      },
    });
    const concession = world.history.events.at(-1)!;
    world = recordWorldEvent(world, {
      stableKey: "campaign-helper-test:concession:reception",
      type: "speech.reception",
      occurredAt: world.currentDate,
      recordedAt: world.currentDate,
      jurisdictionId: KENTUCKY_CONTEXT.jurisdiction.id,
      involvedEntityIds: [candidateId, personId],
      participants: [
        {
          personId: candidateId,
          role: "focus:subject",
          detail: "Gave the speech",
        },
        {
          personId,
          role: "observation:witness",
          detail: "Heard it and cheered",
        },
      ],
      personFactConstraints: [],
      visibility: "public",
      tags: [`speech.of:${concession.id}`],
      summary: "The witness cheered.",
      context: {
        location: null,
        socialContext: "Election night",
        pressure: null,
        choice: "React",
        motivation: null,
        immediateReaction: null,
      },
    });
    world = recordRelationshipInteraction(world, {
      stableKey: "campaign-helper-test:thanked-helper",
      personIds: [candidateId, personId],
      eventId: concession.id,
      occurredAt: concession.occurredAt,
      kind: "support:campaign-thanked",
      change: "strengthened",
      significance: "minor",
      summary: concession.summary,
      tags: ["campaign:thank-to-helper"],
    });
    const originalState = campaignState(world, filed.campaignId);
    world = {
      ...world,
      history: {
        ...world.history,
        campaignStates: [
          ...(world.history.campaignStates ?? []),
          {
            id: createStableId(
              "campaign-state",
              `${world.id}:campaign-helper-test:state:lost`,
            ),
            stableKey: "campaign-helper-test:state:lost",
            sequence: world.history.nextSequence,
            campaignId: filed.campaignId,
            effectiveAt: world.currentDate,
            status: "lost",
            electionResultId: null,
            reason: "The campaign ended.",
            supersedesStateId: originalState.id,
          },
        ],
      },
    };

    const considerations = helperAskConsiderations(
      world,
      personId,
      candidateId,
    );
    expect(considerations).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          sourceType: "context:campaign-result",
          optionKey: "decline",
        }),
        expect.objectContaining({
          sourceType: "context:concession-reaction",
          optionKey: "help",
        }),
        expect.objectContaining({
          sourceType: "social:relationship",
          explanation: "The candidate conceded the election.",
        }),
      ]),
    );
  });
});
