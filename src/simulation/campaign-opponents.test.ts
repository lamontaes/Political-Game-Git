import { describe, expect, it } from "vitest";

import {
  GAME_ADULT_CANDIDACY_AGE,
  addDays,
  advanceWorld,
  ageOnDate,
  campaignOpponentRecords,
  campaignOpponentStepRecords,
  campaignState,
  candidacyPackById,
  createCampaignElectionTransitionRegistry,
  createScenarioWorld,
  deserializeWorld,
  electionContestResult,
  ensureCampaignOpponents,
  fileCampaign,
  makeCurrencyCode,
  requireElectionContest,
  scheduleCampaignAction,
  scheduledActivityState,
  serializeWorld,
  simulationMomentAtLocalTime,
} from "./index";
import {
  CAMPAIGN_CONTACT_MET_KIND,
  CAMPAIGN_CONTACT_RECURRING_KIND,
  CAMPAIGN_OPPONENT_EVENTS,
  campaignWeeklyEvaluationHandler,
  ensureCampaignWeeklyEvaluation,
  projectKnownOpponentActivity,
} from "./campaign-opponents";
import { CAMPAIGN_WEEKLY_EVALUATION_KEY } from "./campaign-life-types";
import { campaignOperatingSpending } from "./campaign-operating-costs";
import { canonicalSupportBasisPoints } from "./campaigns";
import { canonicalJson } from "./canonical-json";
import { cancelFutureDueItem } from "./future-transitions";
import { KENTUCKY_CONTEXT } from "./legislation-scenarios";
import { createOrganization, createOrganizationParticipation } from "./life";
import {
  LIVING_WORLD_KEYS,
  PARTY_AFFILIATION_KIND,
  livingWorldOrganizationId,
} from "./living-world/opening";
import { ensureHomePartyChapters } from "./living-world/party-chapters";
import { resourcePositionAt } from "./resource-queries";
import { passOrdinaryDays } from "../presentation/ordinary-life";
import type { CampaignRecord, EntityId, World } from "./types";

const KENTUCKY_PACK = "us-ky-general-assembly-v1:candidacy";

interface Filed {
  readonly world: World;
  readonly campaign: CampaignRecord;
  readonly candidatePersonId: EntityId;
  readonly rivalPersonId: EntityId;
}

function firstAdult(world: World): EntityId {
  return world.personOrder.find(
    (personId) =>
      ageOnDate(world.people[personId]!.birthDate, world.currentDate) >=
      GAME_ADULT_CANDIDACY_AGE,
  )!;
}

/**
 * A Kentucky race with one opponent. With `chapters`, the World also holds
 * the two national parties and the home chapters with their organizers, and
 * the opponent is publicly affiliated with the first party.
 */
function fileRace(
  seed: string,
  options: { electionInDays?: number; chapters?: boolean } = {},
): Filed {
  const created = createScenarioWorld(seed, KENTUCKY_CONTEXT, {
    peopleCount: 6,
  });
  const candidatePersonId = firstAdult(created);
  let world: World = {
    ...created,
    control: { kind: "person", personId: candidatePersonId },
  };
  if (options.chapters) {
    for (const party of ["democratic", "republican"] as const) {
      world = createOrganization(world, {
        stableKey: LIVING_WORLD_KEYS.nationalParty(party),
        formedAt: world.currentDate,
        detailLevel: "lightweight",
        provenance: { kind: "authored", note: "Test national party." },
        initialProfile: {
          name: `${party} party`,
          classification: "membership:political-party",
          locationJurisdictionId: null,
        },
      });
    }
    world = ensureHomePartyChapters(world, candidatePersonId);
  }
  const opponents = ensureCampaignOpponents(world, {
    stableKey: "opponent-race",
    jurisdictionId: KENTUCKY_CONTEXT.jurisdiction.id,
    count: 1,
    excludePersonIds: [candidatePersonId],
  });
  world = opponents.world;
  const rivalPersonId = opponents.personIds[0]!;
  if (options.chapters) {
    world = createOrganizationParticipation(world, {
      stableKey: "opponent-race:rival-affiliation",
      personId: rivalPersonId,
      organizationId: livingWorldOrganizationId(
        world,
        LIVING_WORLD_KEYS.nationalParty("democratic"),
      ),
      startedAt: world.currentDate,
      kind: PARTY_AFFILIATION_KIND,
      roleKind: "member:public-affiliation",
      context: "Public party affiliation",
      provenance: { kind: "authored", note: "Test affiliation." },
    });
  }
  const filed = fileCampaign(world, {
    stableKey: "opponent-race",
    candidatePersonId,
    jurisdictionId: KENTUCKY_CONTEXT.jurisdiction.id,
    officeKey: candidacyPackById(KENTUCKY_PACK)!.offices[0]!.officeKey,
    electionDate: addDays(world.currentDate, options.electionInDays ?? 28),
    rivalPersonIds: [rivalPersonId],
    existingContestId: null,
    committeeName: "A committee for the opponent test",
    donorPoolName: "Supporters, in aggregate",
    advertisingVendorName: "Advertising, in aggregate",
    staffPersonIds: [],
    treasuryCurrency: makeCurrencyCode("USD"),
  });
  return {
    world: filed.world,
    campaign: filed.campaign,
    candidatePersonId,
    rivalPersonId,
  };
}

const registry = createCampaignElectionTransitionRegistry();

function advance(world: World, days: number): World {
  return advanceWorld(world, days, registry);
}

function scheduledEvaluations(world: World) {
  return world.history.futureDueItems.filter(
    (item) =>
      item.transitionKey === CAMPAIGN_WEEKLY_EVALUATION_KEY &&
      world.history.futureDueItemStates
        .filter((state) => state.dueItemId === item.id)
        .at(-1)?.status === "scheduled",
  );
}

function supportOf(world: World, filed: Filed) {
  return [filed.candidatePersonId, filed.rivalPersonId].map((personId) =>
    canonicalSupportBasisPoints(world, filed.campaign, personId),
  );
}

describe("CRUNCH46 opponent campaigns", () => {
  it("schedules one weekly evaluation at filing and lets rivals act once a week on ordinary days", () => {
    const filed = fileRace("opponents-weekly");
    const evaluations = scheduledEvaluations(filed.world);
    expect(evaluations).toHaveLength(1);
    expect(evaluations[0]!.dueAt).toBe(addDays(filed.world.currentDate, 7));
    expect(evaluations[0]!.entityIds).toEqual(
      [filed.candidatePersonId, filed.campaign.contestId].sort(),
    );
    const supportBefore = supportOf(filed.world, filed);
    const metricStatesBefore = filed.world.history.metricStates.length;

    // Nobody presses anything; ordinary days pass.
    let world = filed.world;
    for (let day = 0; day < 22; day += 1) world = passOrdinaryDays(world, 1);
    expect(world.currentDate >= addDays(filed.world.currentDate, 22)).toBe(
      true,
    );

    const steps = campaignOpponentStepRecords(world);
    expect(steps.map((step) => step.weekStart)).toEqual([
      addDays(filed.world.currentDate, 7),
      addDays(filed.world.currentDate, 14),
      addDays(filed.world.currentDate, 21),
    ]);
    const [opponent] = campaignOpponentRecords(world);
    expect(opponent!.candidatePersonId).toBe(filed.rivalPersonId);
    expect(opponent!.rivalCampaignId).toBe(filed.campaign.id);
    expect(world.people[opponent!.fieldLeadPersonId]).toBeDefined();
    // The player did no campaign work.
    expect(world.history.campaignActions ?? []).toHaveLength(0);
    // Week one from an empty account is always spent raising money.
    expect(steps[0]!.kind).toBe("fundraising");

    // Support moved only through the opponent's own steps, and stays a share.
    const newSupportStates = world.history.metricStates
      .slice(metricStatesBefore)
      .filter((state) => state.metricId === filed.campaign.supportMetricId)
      .map((state) => state.id)
      .sort();
    expect(newSupportStates).toEqual(
      steps.flatMap((step) => step.supportStateIds).sort(),
    );
    const supportAfter = supportOf(world, filed);
    expect(supportAfter[0]! + supportAfter[1]!).toBe(
      supportBefore[0]! + supportBefore[1]!,
    );
    if (steps.some((step) => step.supportStateIds.length > 0)) {
      expect(supportAfter[1]!).toBeGreaterThanOrEqual(supportBefore[1]!);
    }

    // Money moved only as ordinary campaign resource flows.
    for (const step of steps) {
      const flow = world.history.resourceFlows.find(
        (record) => record.id === step.resourceFlowId,
      );
      if (step.kind === "fundraising" || step.kind === "messaging") {
        expect(flow?.basisKind).toBe(
          step.kind === "fundraising"
            ? "custom:campaign-contribution"
            : "custom:campaign-expenditure",
        );
        expect(flow?.restrictionKind).toBe("purpose:campaign");
      } else {
        expect(flow).toBeUndefined();
      }
      const event = world.history.events.find(
        (record) => record.id === step.outcomeEventId,
      )!;
      expect(event.type).toBe(CAMPAIGN_OPPONENT_EVENTS[step.kind]);
    }
    // The next boundary is on the calendar: election eve.
    expect(scheduledEvaluations(world).map((item) => item.dueAt)).toEqual([
      addDays(filed.world.currentDate, 27),
    ]);
  }, 300_000);

  it("never lets a rival's messaging overdraw its committee", () => {
    for (const seed of ["opponents-money-a", "opponents-money-b"]) {
      const filed = fileRace(seed, { electionInDays: 60 });
      const world = advance(filed.world, 59);
      const steps = campaignOpponentStepRecords(world);
      expect(steps.length).toBe(9);
      let balance = 0;
      for (const step of steps) {
        if (step.kind === "fundraising") balance += step.amount!.minorUnits;
        if (step.kind === "messaging") {
          expect(step.amount!.minorUnits).toBeGreaterThanOrEqual(20_000);
          expect(step.amount!.minorUnits).toBeLessThanOrEqual(balance);
          balance -= step.amount!.minorUnits;
        }
      }
      const opponent = campaignOpponentRecords(world)[0]!;
      // The committee's ordinary bills come out of the same account.
      balance -= campaignOperatingSpending(
        world,
        opponent.committeeOrganizationId,
      );
      expect(
        resourcePositionAt(
          world,
          {
            kind: "organization",
            organizationId: opponent.committeeOrganizationId,
          },
          filed.campaign.treasuryCurrency,
        )!.liquidBalance.minorUnits,
      ).toBe(balance);
    }
  }, 300_000);

  it.each([
    // Pinned seeds: the organizer's own seeded decision differs between them.
    ["opponents-support-47", "deferred"],
    ["opponents-support-8", "granted"],
  ] as const)(
    "records a chapter's %s decision on a support request without touching the race",
    (seed, expectedDecision) => {
      const filed = fileRace(seed, { electionInDays: 42, chapters: true });
      const played = advance(filed.world, 34);
      const step = campaignOpponentStepRecords(played).find(
        (record) => record.kind === "support-request",
      )!;
      expect(step.supportDecision!.decision).toBe(expectedDecision);
      const offset = Math.round(
        (Date.parse(`${step.weekStart}T00:00:00Z`) -
          Date.parse(`${filed.world.currentDate}T00:00:00Z`)) /
          86_400_000,
      );
      const before = advance(filed.world, offset - 1);
      const world = advance(before, 1);
      expect(campaignOpponentStepRecords(world).at(-1)!.id).toBe(step.id);

      expect(requireElectionContest(world, filed.campaign.contestId)).toEqual(
        requireElectionContest(before, filed.campaign.contestId),
      );
      expect(campaignState(world, filed.campaign.id).status).toBe("active");
      expect(step.supportStateIds).toEqual([]);
      expect(step.resourceFlowId).toBeNull();
      // Nobody joined anything, and nobody's support moved that week.
      expect(world.history.organizationParticipations).toEqual(
        before.history.organizationParticipations,
      );
      expect(supportOf(world, filed)).toEqual(supportOf(before, filed));
      expect(
        world.history.metricStates.filter(
          (state) =>
            state.metricId === filed.campaign.supportMetricId &&
            state.sequence >= before.history.nextSequence,
        ),
      ).toEqual([]);

      const event = world.history.events.find(
        (record) => record.id === step.outcomeEventId,
      )!;
      expect(event.visibility).toBe(
        expectedDecision === "granted" ? "public" : "limited",
      );
      const contact = world.history.relationshipInteractions.find(
        (interaction) => interaction.eventId === event.id,
      )!;
      expect(contact.kind).toBe(CAMPAIGN_CONTACT_MET_KIND);
      expect([...contact.personIds].sort()).toEqual(
        [filed.rivalPersonId, step.supportDecision!.decidedByPersonId].sort(),
      );
      expect(contact.change).toBe("formed");
      // Only a public decision is something the player's campaign learned.
      expect(
        world.history.knowledge.some(
          (record) =>
            record.eventId === event.id &&
            record.personId === filed.candidatePersonId,
        ),
      ).toBe(expectedDecision === "granted");
      // A second request in the same race is not an option.
      expect(
        campaignOpponentStepRecords(played).filter(
          (record) => record.kind === "support-request",
        ),
      ).toHaveLength(1);
    },
    300_000,
  );

  it("scores a field event like a player's canvass and strengthens only a repeat contact", () => {
    // Pinned seed: this rival favors field work and holds several events.
    const filed = fileRace("opponents-money-b", { electionInDays: 60 });
    const world = advance(filed.world, 59);
    const opponent = campaignOpponentRecords(world)[0]!;
    const fieldSteps = campaignOpponentStepRecords(world).filter(
      (step) => step.kind === "field-event",
    );
    expect(fieldSteps.length).toBeGreaterThanOrEqual(2);
    const rivalShare = (stateId: EntityId) => {
      const state = world.history.metricStates.find((s) => s.id === stateId)!;
      if (state.value.kind !== "quantity") throw new Error("not a share");
      return (
        (state.value.quantity.numerator * 10_000) /
        state.value.quantity.denominator
      );
    };
    fieldSteps.forEach((step, index) => {
      const event = world.history.events.find(
        (record) => record.id === step.outcomeEventId,
      )!;
      expect(event.visibility).toBe("public");
      expect(event.participants.map((participant) => participant.role)).toEqual(
        ["presence:participant", "presence:participant"],
      );
      // Ninety minutes, two people, swing 60-140: the player's own formula.
      const rivalState = world.history.metricStates.find(
        (state) =>
          step.supportStateIds.includes(state.id) &&
          state.scope.segmentKey ===
            filed.campaign.candidateSupportScopes.find(
              (scope) => scope.candidatePersonId === filed.rivalPersonId,
            )!.segmentKey,
      )!;
      const previous = world.history.metricStates
        .filter(
          (state) =>
            state.metricId === rivalState.metricId &&
            state.scope.segmentKey === rivalState.scope.segmentKey &&
            state.sequence < rivalState.sequence,
        )
        .at(-1)!;
      const gain = rivalShare(rivalState.id) - rivalShare(previous.id);
      expect(gain).toBeGreaterThanOrEqual(0);
      expect(gain).toBeLessThanOrEqual(Math.floor((90 * 2 * 3 * 140) / 200));

      const contacts = world.history.relationshipInteractions.filter(
        (interaction) => interaction.eventId === event.id,
      );
      for (const contact of contacts) {
        expect([...contact.personIds].sort()).toEqual(
          [filed.rivalPersonId, opponent.fieldLeadPersonId].sort(),
        );
        expect(contact.tags).toEqual(["campaign.contact"]);
      }
      if (index === 0) {
        expect(
          contacts.map((contact) => [contact.kind, contact.change]),
        ).toEqual([[CAMPAIGN_CONTACT_MET_KIND, "formed"]]);
      } else {
        expect(
          contacts.map((contact) => [contact.kind, contact.change]),
        ).toEqual([
          [CAMPAIGN_CONTACT_MET_KIND, "maintained"],
          [CAMPAIGN_CONTACT_RECURRING_KIND, "strengthened"],
        ]);
      }
    });
    // A step that met nobody writes no contact.
    for (const step of campaignOpponentStepRecords(world)) {
      if (step.kind === "field-event") continue;
      expect(
        world.history.relationshipInteractions.some(
          (interaction) => interaction.eventId === step.outcomeEventId,
        ),
      ).toBe(false);
    }
  }, 300_000);

  it("does not keep choosing a chapter request a rival has no chapter for", () => {
    // Pinned seed: this rival values relationships, and the World has no
    // party chapters, so asking one is not a real option.
    const filed = fileRace("opponents-money-a", { electionInDays: 60 });
    const world = advance(filed.world, 59);
    expect(campaignOpponentRecords(world)[0]!.emphasis).toBe("relationships");
    const fallbacks = campaignOpponentStepRecords(world).filter((step) => {
      const event = world.history.events.find(
        (record) => record.id === step.outcomeEventId,
      )!;
      return event.context.motivation?.includes("no party chapter") ?? false;
    });
    expect(fallbacks).toEqual([]);
    expect(
      campaignOpponentStepRecords(world).some(
        (step) => step.kind === "support-request",
      ),
    ).toBe(false);
  }, 300_000);

  it("tells the player's campaign only what the rival did in public", () => {
    const filed = fileRace("opponents-knowledge", { electionInDays: 60 });
    const world = advance(filed.world, 59);
    const steps = campaignOpponentStepRecords(world);
    const publicSteps = steps.filter(
      (step) =>
        world.history.events.find((event) => event.id === step.outcomeEventId)!
          .visibility === "public",
    );
    const rows = projectKnownOpponentActivity(world, filed.candidatePersonId);
    expect(rows.map((row) => row.eventId)).toEqual(
      publicSteps.map((step) => step.outcomeEventId),
    );
    expect(
      rows.every((row) => row.opponentPersonId === filed.rivalPersonId),
    ).toBe(true);
    for (const step of steps.filter((item) => !publicSteps.includes(item))) {
      expect(
        world.history.knowledge.some(
          (record) =>
            record.eventId === step.outcomeEventId &&
            record.personId === filed.candidatePersonId,
        ),
      ).toBe(false);
    }
    for (const row of rows) {
      const knowledge = world.history.knowledge.find(
        (record) =>
          record.eventId === row.eventId &&
          record.personId === filed.candidatePersonId,
      )!;
      expect(knowledge.source.kind).toBe("public-record");
    }
    // Nothing private leaks into the rows.
    expect(JSON.stringify(rows)).not.toMatch(/emphasis|treasury|minorUnits/);
    // The projection is pure.
    const serialized = serializeWorld(world);
    projectKnownOpponentActivity(world, filed.candidatePersonId);
    expect(serializeWorld(world)).toBe(serialized);
    // Another person learned nothing.
    expect(projectKnownOpponentActivity(world, filed.rivalPersonId)).toEqual(
      [],
    );
  }, 300_000);

  it("replays identically for each seed and differs between seeds", () => {
    const runs = ["opponents-replay-a", "opponents-replay-b"].map((seed) => {
      const first = advance(fileRace(seed).world, 25);
      const second = advance(fileRace(seed).world, 25);
      expect(canonicalJson(first)).toBe(canonicalJson(second));
      return first;
    });
    expect(canonicalJson(runs[0]!)).not.toBe(canonicalJson(runs[1]!));
  }, 300_000);

  it("continues identically after a save and reopen before a weekly boundary", () => {
    const filed = fileRace("opponents-save");
    const early = advance(filed.world, 5);
    const straight = advance(early, 10);
    const reopened = advance(deserializeWorld(serializeWorld(early)), 10);
    expect(campaignOpponentStepRecords(straight).length).toBe(2);
    expect(canonicalJson(reopened)).toBe(canonicalJson(straight));
    expect(serializeWorld(reopened)).toBe(serializeWorld(straight));
  }, 300_000);

  it("stops evaluating and releases campaign work once the election is decided", () => {
    const filed = fileRace("opponents-close", { electionInDays: 10 });
    const electionDate = addDays(filed.world.currentDate, 10);
    const moment = simulationMomentAtLocalTime({
      date: electionDate,
      minuteOfDay: 10 * 60,
      timeZone: filed.world.currentMoment.timeZone,
      preferredUtcOffsetMinutes: filed.world.currentMoment.utcOffsetMinutes,
    });
    const scheduled = scheduleCampaignAction(filed.world, {
      campaignId: filed.campaign.id,
      kind: "outreach",
      plan: {
        start: moment,
        end: { ...moment, minuteOfDay: moment.minuteOfDay + 90 },
        location: {
          locationKey: "campaign-outreach",
          label: "Campaign work",
          jurisdictionId: filed.campaign.jurisdictionId,
        },
        title: "Election-day doors",
        summary: "A session booked for election day.",
      },
      spend: null,
    });
    const world = advance(scheduled.world, 15);
    expect(
      electionContestResult(world, filed.campaign.contestId),
    ).not.toBeUndefined();
    expect(campaignState(world, filed.campaign.id).status).not.toBe("active");
    // Weeks: day 7 and election eve (day 9); nothing after the result.
    expect(
      campaignOpponentStepRecords(world).map((step) => step.weekStart),
    ).toEqual([
      addDays(filed.world.currentDate, 7),
      addDays(filed.world.currentDate, 9),
    ]);
    expect(scheduledEvaluations(world)).toEqual([]);
    expect(
      scheduledActivityState(world, scheduled.action.scheduledActivityId)
        .status,
    ).toBe("cancelled");
    // The life goes on with no handler at all, because nothing is left due.
    expect(advanceWorld(world, 30).currentDate > world.currentDate).toBe(true);
    // And asking again after the race does nothing.
    expect(ensureCampaignWeeklyEvaluation(world, filed.campaign.id)).toBe(
      world,
    );
  }, 300_000);

  it("schedules on demand for a save whose active campaign has no evaluation", () => {
    const filed = fileRace("opponents-old-save");
    const [item] = scheduledEvaluations(filed.world);
    // Stands in for a pre-CRUNCH46 save: the race is active and nothing is due.
    const oldSave = cancelFutureDueItem(filed.world, {
      stableKey: "test:old-save",
      dueItemId: item!.id,
      effectiveAt: filed.world.currentDate,
      reasonKey: "test:old-save",
      context: null,
    });
    expect(scheduledEvaluations(oldSave)).toEqual([]);
    const idle = advance(oldSave, 10);
    expect(campaignOpponentStepRecords(idle)).toEqual([]);

    const ensured = ensureCampaignWeeklyEvaluation(idle, filed.campaign.id);
    expect(ensureCampaignWeeklyEvaluation(ensured, filed.campaign.id)).toBe(
      ensured,
    );
    const [fresh] = scheduledEvaluations(ensured);
    expect(fresh!.stableKey).toBe(
      `${filed.campaign.stableKey}:weekly-evaluation:2`,
    );
    expect(fresh!.dueAt).toBe(addDays(idle.currentDate, 7));
    const later = advance(ensured, 8);
    expect(campaignOpponentStepRecords(later)).toHaveLength(1);
  }, 300_000);

  it("does not act twice when the same week is evaluated again", () => {
    const filed = fileRace("opponents-idempotent");
    const [item] = scheduledEvaluations(filed.world);
    const atDue: World = {
      ...filed.world,
      currentDate: item!.dueAt,
      currentMoment: simulationMomentAtLocalTime({
        date: item!.dueAt,
        minuteOfDay: 0,
        timeZone: filed.world.currentMoment.timeZone,
        preferredUtcOffsetMinutes: filed.world.currentMoment.utcOffsetMinutes,
      }),
    };
    const once = campaignWeeklyEvaluationHandler(atDue, item!);
    const twice = campaignWeeklyEvaluationHandler(once.world, item!);
    expect(once.status).toBe("resolved");
    expect(campaignOpponentStepRecords(once.world)).toHaveLength(1);
    expect(twice.world).toBe(once.world);
    expect(
      campaignWeeklyEvaluationHandler(atDue, {
        ...item!,
        entityIds: [filed.candidatePersonId],
      }).status,
    ).toBe("blocked");
  }, 300_000);
});
