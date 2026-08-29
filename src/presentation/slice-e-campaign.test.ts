import { describe, expect, it } from "vitest";

import { SqliteWorldRepository } from "../persistence/sqlite-world-repository";
import {
  campaignActionResult,
  campaignForCandidate,
  campaignState,
  campaignTreasuryPosition,
  createCampaignElectionTransitionRegistry,
  evaluateCampaignAwareOutcome,
  fileCampaign,
  performCampaignAction,
} from "../simulation/campaigns";
import {
  addDays,
  simulationMinutesBetween,
  simulationMomentAtLocalTime,
} from "../simulation/dates";
import {
  electionContestResult,
  requireElectionContest,
} from "../simulation/election-contests";
import {
  organizationProfileAt,
  workStatusHistory,
} from "../simulation/life-queries";
import {
  PORTABILITY_JURISDICTION_ID,
  createPortabilityFixture,
} from "../simulation/portability-fixture";
import { makeCurrencyCode } from "../simulation/resources";
import { deserializeWorld, serializeWorld } from "../simulation/serialization";
import {
  createScheduledActivity,
  performScheduledActivity,
} from "../simulation/time-work";
import type { EntityId, World } from "../simulation/types";
import { advanceWorld, assertWorldIntegrity } from "../simulation/world";
import { createRunDLiteFixture } from "./run-d-lite";
import {
  fileRunECampaign,
  performRunECampaignAction,
  projectRunECampaign,
} from "./slice-e-campaign";

function createSyntheticCampaign(seed: string, candidateCount = 2) {
  let world = createPortabilityFixture(seed);
  const candidatePersonId = world.personOrder[0]!;
  const rivalPersonIds = world.personOrder.slice(1, candidateCount);
  const staffPersonIds = [world.personOrder[candidateCount + 1]!];
  world = {
    ...world,
    control: { kind: "person", personId: candidatePersonId },
  };
  const fundraisingDate = addDays(world.currentDate, 1);
  const outreachDate = addDays(world.currentDate, 2);
  const electionDate = addDays(world.currentDate, 3);
  const location = {
    locationKey: "synthetic-tidal-campaign-room",
    label: "Tidal Basin civic room",
    jurisdictionId: PORTABILITY_JURISDICTION_ID,
  } as const;
  const at = (date: string, minuteOfDay: number) =>
    simulationMomentAtLocalTime({
      date,
      minuteOfDay,
      timeZone: "Pacific/Honolulu",
      preferredUtcOffsetMinutes: -600,
    });
  const filed = fileCampaign(world, {
    stableKey: "slice-e:synthetic-harbor-campaign",
    candidatePersonId,
    rivalPersonIds,
    jurisdictionId: PORTABILITY_JURISDICTION_ID,
    office: {
      officeKey: "synthetic:harbor-steward",
      title: "Harbor Steward",
      seatKey: "tidal-seat-c",
      occupationClassification: "custom:harbor-steward",
    },
    electionDate,
    existingContestId: null,
    campaignOrganizationName: "Tidal Forward Committee",
    donorPoolOrganizationName: "Synthetic harbor supporters",
    staffPersonIds,
    endorserPersonId: staffPersonIds[0]!,
    treasuryCurrency: makeCurrencyCode("XTB"),
    fundraising: {
      start: at(fundraisingDate, 9 * 60),
      end: at(fundraisingDate, 10 * 60),
      location,
      title: "Harbor supporter calls",
      summary: "Synthetic aggregate fundraising.",
    },
    outreach: {
      start: at(outreachDate, 13 * 60),
      end: at(outreachDate, 14 * 60),
      location,
      title: "Tidal neighborhood outreach",
      summary: "Synthetic community outreach.",
    },
    election: {
      start: at(electionDate, 18 * 60),
      end: at(electionDate, 19 * 60),
      location,
      title: "Harbor election result",
      summary: "Reach the synthetic election frontier.",
    },
  });
  return {
    ...filed,
    candidatePersonId,
    rivalPersonIds,
    staffPersonIds,
  };
}

function completeSyntheticCampaign(seed: string, candidateCount = 2) {
  const scenario = createSyntheticCampaign(seed, candidateCount);
  let world = performCampaignAction(
    scenario.world,
    scenario.fundraisingAction.id,
  );
  world = performCampaignAction(world, scenario.outreachAction.id);
  const expected = evaluateCampaignAwareOutcome(
    world,
    scenario.campaign.contestId,
  );
  world = performScheduledActivity(
    world,
    scenario.campaign.electionActivityId,
    createCampaignElectionTransitionRegistry(),
  );
  return { ...scenario, world, expected };
}

function quantityShare(world: World, recordId: EntityId): number {
  const state = world.history.metricStates.find(
    (record) => record.id === recordId,
  );
  if (!state || state.value.kind !== "quantity") {
    throw new Error("Test support state is missing.");
  }
  return state.value.quantity.numerator / state.value.quantity.denominator;
}

describe("Slice E campaign vertical", () => {
  it("creates the primary candidacy and refuses to jump earlier D-Lite commitments", () => {
    const fixture = createRunDLiteFixture("slice-e-filing");
    const world = fileRunECampaign(fixture.world, fixture);
    const projection = projectRunECampaign(world, fixture);
    const campaign = campaignForCandidate(world, fixture.playerPersonId)!;
    const contest = requireElectionContest(world, campaign.contestId);
    const profile = organizationProfileAt(world, campaign.organizationId);
    const treasury = world.history.resourcePositions.find(
      (position) => position.id === campaign.treasuryPositionId,
    );

    expect(contest.candidatePersonIds).toEqual([
      fixture.playerPersonId,
      fixture.dLite.reedPersonId,
    ]);
    expect(profile).toMatchObject({
      classification: "custom:political-campaign",
      locationJurisdictionId: fixture.roomContext.jurisdictionId,
    });
    expect(treasury?.owner).toEqual({
      kind: "organization",
      organizationId: campaign.organizationId,
    });
    expect(campaign.staffWorkRelationshipIds).toHaveLength(1);
    expect(campaign.endorsementEventId).not.toBeNull();
    expect(
      world.history.events.find((event) => event.id === campaign.filingEventId)
        ?.visibility,
    ).toBe("public");
    expect(campaignState(world, campaign.id).status).toBe("active");
    expect(projection.fundraising?.blockingActivityTitles).toHaveLength(5);
    expect(performRunECampaignAction(world, projection.fundraising!.id)).toBe(
      world,
    );
    expect(() => fileRunECampaign(world, fixture)).toThrow(/already has/i);
    assertWorldIntegrity(world);
  });

  it("spends canonical time, moves only campaign resources, and records fallible knowledge", () => {
    const scenario = createSyntheticCampaign("slice-e-actions");
    const afterFundraising = performCampaignAction(
      scenario.world,
      scenario.fundraisingAction.id,
    );
    const fundraisingResult = campaignActionResult(
      afterFundraising,
      scenario.fundraisingAction.id,
    )!;
    const flow = afterFundraising.history.resourceFlows.find(
      (record) => record.id === fundraisingResult.resourceFlowId,
    );
    const treasury = campaignTreasuryPosition(
      afterFundraising,
      scenario.campaign,
    )!;

    expect(
      simulationMinutesBetween(
        scenario.world.currentMoment,
        afterFundraising.currentMoment,
      ),
    ).toBeGreaterThan(0);
    expect(fundraisingResult.raisedAmount?.minorUnits).toBeGreaterThanOrEqual(
      85_000,
    );
    expect(fundraisingResult.raisedAmount?.minorUnits).toBeLessThan(175_001);
    expect(flow?.source).toEqual({
      kind: "organization",
      organizationId: scenario.campaign.donorPoolOrganizationId,
    });
    expect(flow?.recipient).toEqual({
      kind: "organization",
      organizationId: scenario.campaign.organizationId,
    });
    expect(treasury.liquidBalance).toEqual(fundraisingResult.raisedAmount);
    expect(
      afterFundraising.history.resourcePositions.some(
        (position) =>
          position.owner.kind === "person" &&
          position.owner.personId === scenario.candidatePersonId &&
          position.openingBalance.currency ===
            scenario.campaign.treasuryCurrency,
      ),
    ).toBe(false);

    const afterOutreach = performCampaignAction(
      afterFundraising,
      scenario.outreachAction.id,
    );
    const outreachResult = campaignActionResult(
      afterOutreach,
      scenario.outreachAction.id,
    )!;
    const observation = afterOutreach.history.metricObservations.find(
      (record) => record.id === outreachResult.observationId,
    )!;
    const observedSupport =
      observation.value.kind === "quantity"
        ? observation.value.quantity.numerator /
          observation.value.quantity.denominator
        : null;
    expect(observedSupport).not.toBe(
      quantityShare(afterOutreach, observation.underlyingStateId!),
    );
    expect(observation.uncertainty).toMatchObject({
      kind: "margin-of-error",
    });
    expect(outreachResult.resourceFlowId).toBeNull();
    expect(
      afterOutreach.history.knowledge.find(
        (record) => record.id === outreachResult.feedbackKnowledgeId,
      ),
    ).toMatchObject({
      personId: scenario.candidatePersonId,
      accuracy: "partial",
      confidence: "medium",
      source: { kind: "direct" },
    });
    expect(() =>
      performCampaignAction(afterOutreach, scenario.outreachAction.id),
    ).toThrow(/already complete/i);
    assertWorldIntegrity(afterOutreach);
  });

  it("resolves deterministic win and loss profiles and preserves post-loss play", () => {
    const winning = completeSyntheticCampaign("slice-e-synthetic-win");
    const losing = completeSyntheticCampaign("slice-e-synthetic-loss");
    const winningState = campaignState(winning.world, winning.campaign.id);
    const losingState = campaignState(losing.world, losing.campaign.id);

    expect(winningState.status).toBe("won");
    expect(losingState.status).toBe("lost");
    for (const scenario of [winning, losing]) {
      const result = electionContestResult(
        scenario.world,
        scenario.campaign.contestId,
      )!;
      expect(result.winnerPersonId).toBe(scenario.expected.winnerPersonId);
      expect(result.tallies).toEqual(scenario.expected.tallies);
      expect(result.tallies.reduce((sum, tally) => sum + tally.votes, 0)).toBe(
        10_000,
      );
      expect(
        campaignState(scenario.world, scenario.campaign.id).electionResultId,
      ).toBe(result.id);
      for (const relationshipId of [
        scenario.campaign.candidateWorkRelationshipId,
        ...scenario.campaign.staffWorkRelationshipIds,
      ]) {
        expect(
          workStatusHistory(scenario.world, relationshipId).at(-1)?.status,
        ).toBe("ended");
      }
      assertWorldIntegrity(scenario.world);
    }

    const lossResult = electionContestResult(
      losing.world,
      losing.campaign.contestId,
    )!;
    const continuationDate = addDays(losing.world.currentDate, 1);
    const continued = createScheduledActivity(losing.world, {
      stableKey: "slice-e:loss-continuation:office-follow-up",
      title: "Post-election office follow-up",
      summary: "Normal play remains available after the persisted loss.",
      kind: "confirmed",
      start: simulationMomentAtLocalTime({
        date: continuationDate,
        minuteOfDay: 10 * 60,
        timeZone: losing.world.currentMoment.timeZone,
        preferredUtcOffsetMinutes: losing.world.currentMoment.utcOffsetMinutes,
      }),
      end: simulationMomentAtLocalTime({
        date: continuationDate,
        minuteOfDay: 10 * 60 + 30,
        timeZone: losing.world.currentMoment.timeZone,
        preferredUtcOffsetMinutes: losing.world.currentMoment.utcOffsetMinutes,
      }),
      participantPersonIds: [losing.candidatePersonId],
      responsiblePersonId: losing.candidatePersonId,
      location: {
        locationKey: "post-election-office",
        label: "Tidal Basin civic room",
        jurisdictionId: PORTABILITY_JURISDICTION_ID,
      },
      sourceEntityIds: [lossResult.outcomeEventId],
      flexibility: { kind: "fixed" },
      access: { kind: "office" },
    });
    expect(continued.history.scheduledActivities.at(-1)?.title).toBe(
      "Post-election office follow-up",
    );
    expect(continued.people[losing.candidatePersonId]).toBeDefined();
    assertWorldIntegrity(continued);
  });

  it("is byte-deterministic, persists in JSON/SQLite, and makes action history outcome-relevant", () => {
    const first = completeSyntheticCampaign("slice-e-persistence").world;
    const replay = completeSyntheticCampaign("slice-e-persistence").world;
    expect(serializeWorld(first)).toBe(serializeWorld(replay));
    expect(deserializeWorld(serializeWorld(first))).toStrictEqual(first);

    const repository = new SqliteWorldRepository(":memory:");
    try {
      repository.save(first);
      expect(repository.load(first.id)).toStrictEqual(first);
    } finally {
      repository.close();
    }

    const filed = createSyntheticCampaign("slice-e-action-relevance");
    const withoutActions = advanceWorld(
      filed.world,
      3,
      createCampaignElectionTransitionRegistry(),
    );
    const withActions = completeSyntheticCampaign(
      "slice-e-action-relevance",
    ).world;
    expect(campaignState(withoutActions, filed.campaign.id).status).toBe(
      "lost",
    );
    expect(campaignState(withActions, filed.campaign.id).status).toBe("won");
    expect(serializeWorld(withoutActions)).not.toBe(
      serializeWorld(withActions),
    );
  });

  it("runs three candidates in Pacific/Honolulu without primary leakage or input aliasing", () => {
    const scenario = createSyntheticCampaign("slice-e-portability", 3);
    scenario.rivalPersonIds.push(scenario.world.personOrder[4]!);
    scenario.staffPersonIds.push(scenario.world.personOrder[5]!);
    let world = performCampaignAction(
      scenario.world,
      scenario.fundraisingAction.id,
    );
    world = performCampaignAction(world, scenario.outreachAction.id);
    world = performScheduledActivity(
      world,
      scenario.campaign.electionActivityId,
      createCampaignElectionTransitionRegistry(),
    );
    const result = electionContestResult(world, scenario.campaign.contestId)!;
    const payload = serializeWorld(world);

    expect(
      requireElectionContest(world, scenario.campaign.contestId)
        .candidatePersonIds,
    ).toHaveLength(3);
    expect(scenario.campaign.staffWorkRelationshipIds).toHaveLength(1);
    expect(result.tallies).toHaveLength(3);
    expect(world.currentMoment.timeZone).toBe("Pacific/Honolulu");
    expect(
      requireElectionContest(world, scenario.campaign.contestId).office.title,
    ).toBe("Harbor Steward");
    expect(payload).toContain("Synthetic Tidal Basin");
    expect(payload).not.toContain("Lexington");
    expect(payload).not.toContain("Kentucky");
    expect(payload).not.toContain("America/New_York");
    expect(deserializeWorld(payload)).toStrictEqual(world);
    assertWorldIntegrity(world);
  });
});
