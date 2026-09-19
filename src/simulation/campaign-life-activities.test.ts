import { describe, expect, it } from "vitest";

import { fileForOffice } from "../../tests/fixtures/campaign-fixture";
import { DEFAULT_NEW_GAME_SETUP } from "../presentation/new-game";
import {
  generateOpeningLife,
  prepareOpeningLife,
} from "../presentation/opening-life";
import { passOrdinaryDays } from "../presentation/ordinary-life";
import { declineVenueActivity } from "../presentation/scheduled-activity-choice";
import {
  CAMPAIGN_LIFE_CATALOG,
  CAMPAIGN_LIFE_CATALOG_VERSION,
} from "./campaign-life-catalog";
import {
  CAMPAIGN_LIFE_ATTENDED_EVENT,
  CAMPAIGN_LIFE_CONTACT_KIND,
  CAMPAIGN_LIFE_OFFERED_EVENT,
  CAMPAIGN_LIFE_RECURRING_CONTACT_KIND,
  CAMPAIGN_SUPPORT_REQUEST_DECIDED_EVENT,
  acceptCampaignLifeActivity,
  campaignLifeActivityForScheduledActivity,
  campaignLifeOutreachTransitionHandler,
  ensureCampaignLifeOutreach,
  offerCampaignLifeActivity,
  projectCampaignGuidance,
  projectCampaignLifeActivities,
  recordCampaignLifeAttendance,
  requestCampaignLifeActivity,
  type OfferCampaignLifeActivityInput,
} from "./campaign-life-activities";
import { CAMPAIGN_LIFE_OUTREACH_KEY } from "./campaign-life-types";
import type { CampaignLifeForm } from "./campaign-life-types";
import {
  activeCampaignForCandidate,
  campaignLifeActivityRecords,
  campaignLifeOutcomeRecords,
  campaignTreasuryPosition,
} from "./campaign-queries";
import { createCampaignElectionTransitionRegistry } from "./campaigns";
import { canonicalJson } from "./canonical-json";
import { campaignCompliancePackFor } from "./campaign-compliance";
import { GAME_ADULT_CANDIDACY_AGE, candidacyPackById } from "./candidacy-packs";
import { KENTUCKY_CONTEXT } from "./legislation-scenarios";
import {
  advanceWorld,
  createScenarioWorld,
  ensureCampaignOpponents,
  fileCampaign,
  makeCurrencyCode,
} from "./index";
import {
  addDays,
  ageOnDate,
  compareSimulationMoments,
  simulationMomentAtLocalTime,
} from "./dates";
import { publicPartyAffiliation } from "./living-world/congress";
import {
  CHAPTER_MEMBERSHIP_KIND,
  homePartyChapters,
} from "./living-world/party-chapters";
import { resourcePositionAt } from "./resource-queries";
import { deserializeWorld, serializeWorld } from "./serialization";
import {
  createScheduledActivity,
  performScheduledActivity,
  scheduledActivityState,
} from "./time-work";
import type { EntityId, IsoDate, SimulationMoment, World } from "./types";

const REGISTRY = createCampaignElectionTransitionRegistry();

interface Life {
  readonly world: World;
  readonly personId: EntityId;
  readonly chapterId: EntityId;
  readonly organizerId: EntityId;
}

const lifeCache = new Map<string, Life>();

function adultLife(seed: string, placeKey = "kentucky"): Life {
  const cacheKey = `${seed}|${placeKey}`;
  const cached = lifeCache.get(cacheKey);
  if (cached) return cached;
  const game = generateOpeningLife(
    prepareOpeningLife({
      ...DEFAULT_NEW_GAME_SETUP,
      seed,
      startAge: 34,
      placeKey,
    }),
  ).game!;
  const chapter = homePartyChapters(game.world)[0]!;
  const life = {
    world: game.world,
    personId: game.playerPersonId,
    chapterId: chapter.organizationId,
    organizerId: chapter.organizerPersonId!,
  };
  lifeCache.set(cacheKey, life);
  return life;
}

function evening(world: World, daysLater: number, minute = 18 * 60 + 30) {
  return simulationMomentAtLocalTime({
    date: addDays(world.currentDate, daysLater) as IsoDate,
    minuteOfDay: minute,
    timeZone: world.currentMoment.timeZone,
    preferredUtcOffsetMinutes: world.currentMoment.utcOffsetMinutes,
  });
}

function offer(
  life: Life,
  world: World,
  form: CampaignLifeForm,
  start: SimulationMoment,
  stableKey: string,
  extra: Partial<OfferCampaignLifeActivityInput> = {},
): World {
  return offerCampaignLifeActivity(world, {
    form,
    hostOrganizationId: life.chapterId,
    hostPersonId: life.organizerId,
    subjectPersonId: life.personId,
    campaignId: null,
    origin: "host-outreach",
    start,
    stableKey,
    ...extra,
  });
}

function latestRecord(world: World) {
  return campaignLifeActivityRecords(world).at(-1)!;
}

function viewFor(world: World, personId: EntityId, lifeActivityId: EntityId) {
  return projectCampaignLifeActivities(world, personId).find(
    (row) => row.lifeActivityId === lifeActivityId,
  )!;
}

/**
 * Lives the calendar up to and through a hold the way a player does: optional
 * holds in the way are declined, earlier commitments are kept, the journey is
 * taken and then the activity itself.
 */
function liveThrough(world: World, personId: EntityId, holdId: EntityId) {
  let next = world;
  for (let guard = 0; guard < 80; guard += 1) {
    const holdState = scheduledActivityState(next, holdId);
    if (holdState.status !== "scheduled") return next;
    const journey = next.history.scheduledActivities.find(
      (activity) =>
        activity.kind === "travel" &&
        activity.sourceEntityIds.includes(holdId) &&
        scheduledActivityState(next, activity.id).status === "scheduled",
    );
    const targetId = journey?.id ?? holdId;
    const performed = performScheduledActivity(next, targetId, REGISTRY);
    if (performed !== next) {
      next = performed;
      continue;
    }
    // Something earlier is in the way: answer it as a player would.
    const blocker = next.history.scheduledActivities
      .filter(
        (activity) =>
          activity.id !== holdId &&
          activity.id !== journey?.id &&
          activity.responsiblePersonId === personId &&
          scheduledActivityState(next, activity.id).status === "scheduled" &&
          compareSimulationMoments(
            scheduledActivityState(next, activity.id).start,
            scheduledActivityState(next, targetId).start,
          ) < 0,
      )
      .sort((a, b) =>
        compareSimulationMoments(
          scheduledActivityState(next, a.id).start,
          scheduledActivityState(next, b.id).start,
        ),
      )[0];
    if (!blocker) throw new Error("Nothing performable before the hold.");
    if (blocker.kind === "tentative") {
      next = declineVenueActivity(next, personId, blocker.id);
    } else if (blocker.kind === "travel") {
      const destination = next.history.scheduledActivities.find((a) =>
        blocker.sourceEntityIds.includes(a.id),
      );
      next =
        destination?.kind === "tentative"
          ? declineVenueActivity(next, personId, destination.id)
          : performScheduledActivity(next, blocker.id, REGISTRY);
    } else {
      next = performScheduledActivity(next, blocker.id, REGISTRY);
    }
  }
  throw new Error("The hold was never reached.");
}

function attend(
  world: World,
  personId: EntityId,
  attendance: "attended" | "condensed" = "attended",
): World {
  const record = latestRecord(world);
  const hold = viewFor(world, personId, record.id).scheduledActivityId;
  const lived = liveThrough(world, personId, hold);
  expect(scheduledActivityState(lived, hold).status).toBe("completed");
  return recordCampaignLifeAttendance(lived, personId, hold, attendance);
}

/** Passes one ordinary day as a player pressing Next Day would. */
function passDay(world: World, personId: EntityId): World {
  const target = addDays(world.currentDate, 1);
  let next = world;
  for (let guard = 0; guard < 20; guard += 1) {
    const stepped = passOrdinaryDays(next, 1, { stopForTentativeHolds: true });
    if (stepped.currentDate >= target) return stepped;
    const blocker = stepped.history.scheduledActivities
      .filter((activity) => {
        const state = scheduledActivityState(stepped, activity.id);
        return (
          activity.responsiblePersonId === personId &&
          state.status === "scheduled" &&
          compareSimulationMoments(state.start, stepped.currentMoment) <= 0
        );
      })
      .sort((a, b) =>
        compareSimulationMoments(
          scheduledActivityState(stepped, a.id).start,
          scheduledActivityState(stepped, b.id).start,
        ),
      )[0];
    if (!blocker) throw new Error("The day stopped for nothing.");
    const destination =
      blocker.kind === "travel"
        ? stepped.history.scheduledActivities.find((a) =>
            blocker.sourceEntityIds.includes(a.id),
          )
        : blocker;
    next =
      destination?.kind === "tentative"
        ? declineVenueActivity(stepped, personId, destination.id)
        : liveThrough(stepped, personId, (destination ?? blocker).id);
  }
  throw new Error("The day never ended.");
}

/**
 * A Kentucky scenario world with a filed campaign and one staff member, the
 * shape `campaigns.test.ts` uses. The staff member is a real committee host.
 */
function staffedKentuckyCampaign(seed: string, advanceDays: number) {
  const created = createScenarioWorld(seed, KENTUCKY_CONTEXT, {
    peopleCount: 6,
  });
  const scenario = advanceWorld(created, advanceDays);
  const adults = scenario.personOrder.filter(
    (id) =>
      ageOnDate(scenario.people[id]!.birthDate, scenario.currentDate) >=
      GAME_ADULT_CANDIDACY_AGE,
  );
  const candidatePersonId = adults[0]!;
  const staffPersonId = adults[1]!;
  const base: World = {
    ...scenario,
    control: { kind: "person", personId: candidatePersonId },
  };
  const opponents = ensureCampaignOpponents(base, {
    stableKey: "life-test-campaign",
    jurisdictionId: KENTUCKY_CONTEXT.jurisdiction.id,
    count: 1,
    excludePersonIds: [candidatePersonId, staffPersonId],
  });
  const filed = fileCampaign(opponents.world, {
    stableKey: "life-test-campaign",
    candidatePersonId,
    jurisdictionId: KENTUCKY_CONTEXT.jurisdiction.id,
    officeKey: candidacyPackById("us-ky-general-assembly-v1:candidacy")!
      .offices[0]!.officeKey,
    electionDate: addDays(base.currentDate, 21),
    rivalPersonIds: opponents.personIds,
    existingContestId: null,
    committeeName: "A committee for the test fixture",
    donorPoolName: "Supporters, in aggregate",
    advertisingVendorName: "Advertising, in aggregate",
    staffPersonIds: [staffPersonId],
    treasuryCurrency: makeCurrencyCode("USD"),
  });
  const life: Life = {
    world: filed.world,
    personId: candidatePersonId,
    chapterId: filed.campaign.organizationId,
    organizerId: staffPersonId,
  };
  return { life, campaign: filed.campaign };
}

function withCampaign(life: Life): Life {
  const world = fileForOffice(life.world, life.personId);
  expect(activeCampaignForCandidate(world, life.personId)).not.toBeNull();
  return { ...life, world };
}

describe(
  "CRUNCH46 CAMPAIGN party and campaign activities",
  { timeout: 600_000 },
  () => {
    it("offers, accepts and attends a canvass with persistent people", () => {
      const life = adultLife("life-a");
      const offered = offer(
        life,
        life.world,
        "door-canvass",
        evening(life.world, 1),
        "test:canvass:1",
      );
      const record = latestRecord(offered);
      expect(record.catalogVersion).toBe(CAMPAIGN_LIFE_CATALOG_VERSION);
      const invitation = offered.history.events.find(
        (e) => e.id === record.invitationEventId,
      )!;
      expect(invitation.type).toBe(CAMPAIGN_LIFE_OFFERED_EVENT);
      expect(invitation.visibility).toBe("private");
      expect(
        invitation.participants.find((p) => p.role === "agency:asked")
          ?.personId,
      ).toBe(life.organizerId);
      const hold = offered.history.scheduledActivities.find(
        (a) => a.id === record.scheduledActivityId,
      )!;
      expect(hold.kind).toBe("tentative");
      expect(hold.participantPersonIds).toContain(life.organizerId);
      expect(hold.location.locationKey).toBe("ordinary-life:meeting-room");
      const view = viewFor(offered, life.personId, record.id);
      expect(view).toMatchObject({
        state: "offered",
        journeyMinutes: 20,
        family: "volunteer-shift",
      });
      expect(view.travelCostDisclosure).toMatch(/not represented/);
      // Projection is pure.
      const before = serializeWorld(offered);
      projectCampaignLifeActivities(offered, life.personId);
      projectCampaignGuidance(offered, life.personId);
      expect(serializeWorld(offered)).toBe(before);

      const accepted = acceptCampaignLifeActivity(
        offered,
        life.personId,
        record.id,
      );
      expect(viewFor(accepted, life.personId, record.id).state).toBe(
        "accepted",
      );
      expect(scheduledActivityState(accepted, hold.id).status).toBe(
        "cancelled",
      );
      // Accepting twice changes nothing.
      expect(
        acceptCampaignLifeActivity(accepted, life.personId, record.id),
      ).toBe(accepted);

      const done = attend(accepted, life.personId);
      const outcome = campaignLifeOutcomeRecords(done).at(-1)!;
      expect(outcome.attendance).toBe("attended");
      expect(outcome.contactPersonIds).toHaveLength(1);
      expect(outcome.supportStateIds).toEqual([]);
      expect(outcome.resourceFlowId).toBeNull();
      const event = done.history.events.find(
        (e) => e.id === outcome.outcomeEventId,
      )!;
      expect(event.type).toBe(CAMPAIGN_LIFE_ATTENDED_EVENT);
      expect(event.visibility).toBe("limited");
      expect(event.participants.map((p) => p.role)).toEqual([
        "presence:participant",
        "presence:participant",
        "presence:participant",
      ]);
      const interactions = done.history.relationshipInteractions.filter((r) =>
        outcome.relationshipInteractionIds.includes(r.id),
      );
      expect(interactions.map((r) => [r.kind, r.change])).toEqual([
        [CAMPAIGN_LIFE_CONTACT_KIND, "formed"],
        [CAMPAIGN_LIFE_CONTACT_KIND, "formed"],
      ]);
      expect(
        interactions.every((r) => r.tags.includes("campaign.contact")),
      ).toBe(true);
      expect(viewFor(done, life.personId, record.id).state).toBe("completed");
      // Attendance is not membership or affiliation.
      expect(publicPartyAffiliation(done, life.personId)).toBeNull();
      expect(
        done.history.organizationParticipations.some(
          (p) =>
            p.personId === life.personId && p.kind === CHAPTER_MEMBERSHIP_KIND,
        ),
      ).toBe(false);
      // The organizer will think about it again, and recording is idempotent.
      expect(
        done.history.futureDueItems.some(
          (item) => item.transitionKey === CAMPAIGN_LIFE_OUTREACH_KEY,
        ),
      ).toBe(true);
      const completedHold = outcome.scheduledActivityId;
      expect(
        recordCampaignLifeAttendance(
          done,
          life.personId,
          completedHold,
          "attended",
        ),
      ).toBe(done);
      expect(
        campaignLifeActivityForScheduledActivity(done, completedHold)?.id,
      ).toBe(record.id);
    });

    it("condensed attendance produces the same outcome except the attendance field", () => {
      const life = adultLife("life-a");
      const offered = offer(
        life,
        life.world,
        "town-hall",
        evening(life.world, 1),
        "test:town-hall:1",
      );
      const record = latestRecord(offered);
      const accepted = acceptCampaignLifeActivity(
        offered,
        life.personId,
        record.id,
      );
      const attended = attend(accepted, life.personId, "attended");
      const condensed = attend(accepted, life.personId, "condensed");
      const strip = (world: World) =>
        canonicalJson({
          ...world.history,
          campaignLifeOutcomes: campaignLifeOutcomeRecords(world).map((o) => ({
            ...o,
            attendance: null,
          })),
        });
      expect(strip(attended)).toBe(strip(condensed));
      expect(campaignLifeOutcomeRecords(condensed).at(-1)!.attendance).toBe(
        "condensed",
      );
      const event = attended.history.events.find(
        (e) =>
          e.id === campaignLifeOutcomeRecords(attended).at(-1)!.outcomeEventId,
      )!;
      expect(event.visibility).toBe("public");
    });

    it("a decline releases the hold and records no relationship", () => {
      const life = adultLife("life-a");
      const offered = offer(
        life,
        life.world,
        "organization-meeting",
        evening(life.world, 1),
        "test:meeting:decline",
      );
      const record = latestRecord(offered);
      const declined = declineVenueActivity(
        offered,
        life.personId,
        record.scheduledActivityId,
      );
      expect(declined).not.toBe(offered);
      expect(viewFor(declined, life.personId, record.id).state).toBe(
        "declined",
      );
      expect(
        declined.history.scheduledActivities
          .filter(
            (a) =>
              a.id === record.scheduledActivityId ||
              a.sourceEntityIds.includes(record.scheduledActivityId),
          )
          .map((a) => scheduledActivityState(declined, a.id).status),
      ).toEqual(["cancelled", "cancelled"]);
      expect(declined.history.relationshipInteractions).toEqual(
        life.world.history.relationshipInteractions,
      );
      // The organizer's evening is free again.
      expect(() =>
        offer(
          life,
          declined,
          "town-hall",
          evening(life.world, 1),
          "test:town-hall:after-decline",
        ),
      ).not.toThrow();
    });

    it("a second shift with the same partner strengthens a recurring contact", () => {
      const life = adultLife("life-a");
      const offeredPhone = offer(
        life,
        life.world,
        "phone-shift",
        evening(life.world, 1, 19 * 60),
        "test:phone:1",
      );
      const first = attend(
        acceptCampaignLifeActivity(
          offeredPhone,
          life.personId,
          latestRecord(offeredPhone).id,
        ),
        life.personId,
      );
      const firstOutcome = campaignLifeOutcomeRecords(first).at(-1)!;
      const second = attend(
        offer(
          life,
          first,
          "door-canvass",
          evening(first, 2),
          "test:canvass:again",
          { origin: "subject-request" },
        ),
        life.personId,
      );
      const secondOutcome = campaignLifeOutcomeRecords(second).at(-1)!;
      expect(secondOutcome.contactPersonIds).toEqual(
        firstOutcome.contactPersonIds,
      );
      const interactions = second.history.relationshipInteractions.filter((r) =>
        secondOutcome.relationshipInteractionIds.includes(r.id),
      );
      expect(interactions.map((r) => [r.kind, r.change])).toEqual([
        [CAMPAIGN_LIFE_CONTACT_KIND, "maintained"],
        [CAMPAIGN_LIFE_RECURRING_CONTACT_KIND, "strengthened"],
        [CAMPAIGN_LIFE_CONTACT_KIND, "maintained"],
        [CAMPAIGN_LIFE_RECURRING_CONTACT_KIND, "strengthened"],
      ]);
      // A remote shift has no journey.
      expect(
        viewFor(first, life.personId, firstOutcome.activityId).journeyMinutes,
      ).toBeNull();
    });

    it("candidate guidance reports what is known and leaves filing unknown", () => {
      const life = adultLife("life-a");
      const guided = attend(
        offer(
          life,
          life.world,
          "candidate-guidance",
          evening(life.world, 1),
          "test:guidance",
          { origin: "subject-request" },
        ),
        life.personId,
      );
      const outcome = campaignLifeOutcomeRecords(guided).at(-1)!;
      const knowledge = guided.history.knowledge.find(
        (k) => k.id === outcome.guidanceKnowledgeId,
      )!;
      expect(knowledge.source).toMatchObject({
        kind: "told-by",
        sourcePersonId: life.organizerId,
      });
      expect(knowledge.believedSummary).toMatch(
        /not established by this game's sourced rules/,
      );
      const view = projectCampaignGuidance(guided, life.personId);
      expect(view.offices.length).toBeGreaterThan(0);
      expect(view.filingAuthority.state).toBe("not-established");
      expect(view.filingDeadline.state).toBe("not-established");
      for (const office of view.offices) {
        expect(office.filing.state).toBe("unknown");
        if (office.minimumAge.state === "known")
          expect(office.minimumAge.value).toBeGreaterThan(0);
      }
      expect(view.runningNow).toBe(false);
    });

    it("a fundraiser needs a running campaign and moves only real money", () => {
      const life = adultLife("life-mo", "state:US-MO");
      expect(() =>
        offer(
          life,
          life.world,
          "fundraiser",
          evening(life.world, 1),
          "test:fundraiser:none",
        ),
      ).toThrow(/needs a campaign/);
      const running = withCampaign(life);
      const campaign = activeCampaignForCandidate(
        running.world,
        life.personId,
      )!;
      const treasuryBefore = campaignTreasuryPosition(running.world, campaign)!
        .liquidBalance.minorUnits;
      const raised = attend(
        offer(
          running,
          running.world,
          "fundraiser",
          evening(running.world, 1),
          "test:fundraiser:mo",
          { campaignId: campaign.id },
        ),
        life.personId,
      );
      const outcome = campaignLifeOutcomeRecords(raised).at(-1)!;
      expect(outcome.raisedAmount!.minorUnits).toBeGreaterThanOrEqual(25_000);
      expect(outcome.raisedAmount!.minorUnits).toBeLessThanOrEqual(150_000);
      const flow = raised.history.resourceFlows.find(
        (f) => f.id === outcome.resourceFlowId,
      )!;
      expect(flow).toMatchObject({
        source: { kind: "person", personId: outcome.contactPersonIds[0] },
        recipient: {
          kind: "organization",
          organizationId: campaign.organizationId,
        },
        basisKind: "custom:campaign-contribution",
        restrictionKind: "purpose:campaign",
      });
      expect(
        campaignTreasuryPosition(raised, campaign)!.liquidBalance.minorUnits,
      ).toBe(treasuryBefore + outcome.raisedAmount!.minorUnits);
      // Nobody's tracked money went negative.
      for (const position of raised.history.resourcePositions) {
        const snapshot = resourcePositionAt(
          raised,
          position.owner,
          position.openingBalance.currency,
        );
        if (snapshot)
          expect(snapshot.liquidBalance.minorUnits).toBeGreaterThanOrEqual(0);
      }
    });

    it("a Kentucky fundraiser follows the reviewed pack: unknown before its coverage", () => {
      const running = withCampaign(adultLife("life-a"));
      const campaign = activeCampaignForCandidate(
        running.world,
        running.personId,
      )!;
      const flowsBefore = running.world.history.resourceFlows.length;
      // The opening date precedes the pack's reviewed coverage (2026-07-15),
      // so the itemization threshold is unknown and nothing is recorded.
      expect(running.world.currentDate < "2026-07-15").toBe(true);
      const done = attend(
        offer(
          running,
          running.world,
          "fundraiser",
          evening(running.world, 1),
          "test:fundraiser:ky",
          { campaignId: campaign.id },
        ),
        running.personId,
      );
      const outcome = campaignLifeOutcomeRecords(done).at(-1)!;
      expect(outcome.resourceFlowId).toBeNull();
      expect(outcome.raisedAmount).toBeNull();
      expect(done.history.resourceFlows.length).toBe(flowsBefore);
      const event = done.history.events.find(
        (e) => e.id === outcome.outcomeEventId,
      )!;
      expect(event.tags).toContain("compliance:refused");
      expect(event.summary).toMatch(/itemization threshold is UNKNOWN/);
    });

    it("a covered Kentucky fundraiser, hosted by campaign staff, stays within the itemization threshold", () => {
      const staffed = staffedKentuckyCampaign("life-ky-covered", 247);
      const { campaign } = staffed;
      const running = staffed.life;
      // Inside the pack's reviewed coverage.
      expect(running.world.currentDate >= "2026-07-15").toBe(true);
      expect(
        campaignCompliancePackFor(running.world, campaign.id),
      ).not.toBeNull();
      const covered = running.world;
      // A request to the committee is hosted by its active staff member.
      const requested = requestCampaignLifeActivity(covered, running.personId, {
        form: "phone-shift",
        hostOrganizationId: campaign.organizationId,
      });
      expect(latestRecord(requested)).toMatchObject({
        hostPersonId: running.organizerId,
        campaignId: campaign.id,
        origin: "subject-request",
      });
      const treasuryBefore = campaignTreasuryPosition(covered, campaign)!
        .liquidBalance.minorUnits;
      const first = attend(
        offer(
          running,
          covered,
          "fundraiser",
          evening(covered, 1),
          "test:fundraiser:ky-covered",
          { campaignId: campaign.id },
        ),
        running.personId,
      );
      const outcome = campaignLifeOutcomeRecords(first).at(-1)!;
      // KRS 121.180(3)(a)2.: over $200 needs address, employer and
      // occupation, which this World does not record for the donor.
      expect(outcome.raisedAmount).toEqual({
        minorUnits: 20_000,
        currency: campaign.treasuryCurrency,
      });
      expect(
        campaignTreasuryPosition(first, campaign)!.liquidBalance.minorUnits,
      ).toBe(treasuryBefore + 20_000);
      const event = first.history.events.find(
        (e) => e.id === outcome.outcomeEventId,
      )!;
      expect(event.tags).toContain("compliance:allowed");
      expect(event.summary).toMatch(/kept to \$200\.00/);
      expect(event.summary).toMatch(/address, employer or occupation/);
      expect(event.summary).toMatch(/KRS 121\.180/);

      // The same persistent donor has nothing more that can be recorded.
      const second = attend(
        offer(
          running,
          first,
          "fundraiser",
          evening(first, 2),
          "test:fundraiser:ky-covered:2",
          { campaignId: campaign.id },
        ),
        running.personId,
      );
      const again = campaignLifeOutcomeRecords(second).at(-1)!;
      expect(again.contactPersonIds).toEqual(outcome.contactPersonIds);
      expect(again.resourceFlowId).toBeNull();
      expect(again.raisedAmount).toBeNull();
      expect(second.history.resourceFlows.length).toBe(
        first.history.resourceFlows.length,
      );
      const refused = second.history.events.find(
        (e) => e.id === again.outcomeEventId,
      )!;
      expect(refused.tags).toContain("compliance:refused");
      expect(refused.summary).toMatch(/already given \$200\.00/);
      expect(refused.summary).toMatch(/address, employer or occupation/);
    });

    it("refuses early or foreign attendance, and a declined offer cannot be accepted", () => {
      const life = adultLife("life-a");
      const offered = offer(
        life,
        life.world,
        "organization-meeting",
        evening(life.world, 1),
        "test:early",
      );
      const record = latestRecord(offered);
      const before = serializeWorld(offered);
      expect(() =>
        recordCampaignLifeAttendance(
          offered,
          life.personId,
          record.scheduledActivityId,
          "attended",
        ),
      ).toThrow(/has not happened yet/);
      expect(() =>
        recordCampaignLifeAttendance(
          offered,
          life.organizerId,
          record.scheduledActivityId,
          "attended",
        ),
      ).toThrow(/Only the person you are playing/);
      expect(serializeWorld(offered)).toBe(before);
      const declined = declineVenueActivity(
        offered,
        life.personId,
        record.scheduledActivityId,
      );
      expect(
        acceptCampaignLifeActivity(declined, life.personId, record.id),
      ).toBe(declined);
      // The host is on the hold, so nobody can book the organizer over it.
      expect(() =>
        createScheduledActivity(offered, {
          stableKey: "test:early:organizer-busy",
          title: "Something else",
          summary: "A confirmed commitment.",
          kind: "confirmed",
          start: evening(life.world, 1, 18 * 60 + 45),
          end: evening(life.world, 1, 19 * 60 + 15),
          participantPersonIds: [life.organizerId],
          responsiblePersonId: life.organizerId,
          location: {
            locationKey: "ordinary-life:meeting-room",
            label: "Community room",
            jurisdictionId: null,
          },
          sourceEntityIds: [record.invitationEventId],
          flexibility: { kind: "fixed" },
          access: { kind: "private", personIds: [life.organizerId] },
        }),
      ).toThrow(/conflicts/);
    });

    it("a late recording is dated to the day the activity happened", () => {
      const life = adultLife("life-a");
      const offered = offer(
        life,
        life.world,
        "organization-meeting",
        evening(life.world, 1),
        "test:late-record",
        { origin: "subject-request" },
      );
      const record = latestRecord(offered);
      const lived = liveThrough(
        offered,
        life.personId,
        record.scheduledActivityId,
      );
      const happenedOn = lived.currentDate;
      const later = passDay(lived, life.personId);
      expect(later.currentDate > happenedOn).toBe(true);
      expect(viewFor(later, life.personId, record.id)).toMatchObject({
        state: "completed",
        outcome: null,
      });
      const done = recordCampaignLifeAttendance(
        later,
        life.personId,
        record.scheduledActivityId,
        "attended",
      );
      const outcome = campaignLifeOutcomeRecords(done).at(-1)!;
      expect(outcome.completedAt).toBe(happenedOn);
      const event = done.history.events.find(
        (e) => e.id === outcome.outcomeEventId,
      )!;
      expect(event.occurredAt).toBe(happenedOn);
      expect(event.recordedAt).toBe(later.currentDate);
    });

    it("the outreach handler is pure, reschedules forward and blocks without a host", () => {
      const life = adultLife("life-a");
      const scheduled = ensureCampaignLifeOutreach(
        life.world,
        life.personId,
        life.chapterId,
      );
      expect(
        ensureCampaignLifeOutreach(scheduled, life.personId, life.chapterId),
      ).toBe(scheduled);
      const item = scheduled.history.futureDueItems.at(-1)!;
      expect(item.transitionKey).toBe(CAMPAIGN_LIFE_OUTREACH_KEY);
      expect([...item.entityIds]).toEqual([...item.entityIds].sort());
      expect(item.dueAt > scheduled.currentDate).toBe(true);
      const before = serializeWorld(scheduled);
      const result = campaignLifeOutreachTransitionHandler(scheduled, item);
      expect(serializeWorld(scheduled)).toBe(before);
      expect(result.status).toBe("resolved");
      expect(result.world.currentDate).toBe(scheduled.currentDate);
      expect(result.world.id).toBe(scheduled.id);
      const added = result.world.history.futureDueItems.slice(
        scheduled.history.futureDueItems.length,
      );
      expect(added).toHaveLength(1);
      expect(added[0]!.stableKey.endsWith(":2")).toBe(true);
      expect(added[0]!.dueAt > scheduled.currentDate).toBe(true);
      // Same due item, same answer.
      expect(
        canonicalJson(
          campaignLifeOutreachTransitionHandler(scheduled, item).world,
        ),
      ).toBe(canonicalJson(result.world));
      const orphan = campaignLifeOutreachTransitionHandler(scheduled, {
        ...item,
        entityIds: [life.personId],
      });
      expect(orphan.status).toBe("blocked");
      expect(orphan.world).toBe(scheduled);
    });

    it("field work for a running campaign moves canonical support zero-sum", () => {
      const running = withCampaign(adultLife("life-a"));
      const campaign = activeCampaignForCandidate(
        running.world,
        running.personId,
      )!;
      const done = attend(
        offer(
          running,
          running.world,
          "door-canvass",
          evening(running.world, 1),
          "test:canvass:campaign",
          { campaignId: campaign.id },
        ),
        running.personId,
      );
      const outcome = campaignLifeOutcomeRecords(done).at(-1)!;
      expect(outcome.supportStateIds).toHaveLength(
        campaign.candidateSupportScopes.length,
      );
      const total = outcome.supportStateIds
        .map((id) => done.history.metricStates.find((s) => s.id === id)!)
        .reduce((sum, state) => {
          if (state.value.kind !== "quantity") throw new Error("not a share");
          return (
            sum +
            (state.value.quantity.numerator * 10_000) /
              state.value.quantity.denominator
          );
        }, 0);
      expect(total).toBe(10_000);
    });

    it("a declined support request leaves the contest, ballot and campaign untouched", () => {
      const running = withCampaign(adultLife("life-a"));
      const campaign = activeCampaignForCandidate(
        running.world,
        running.personId,
      )!;
      const done = attend(
        offer(
          running,
          running.world,
          "support-request",
          evening(running.world, 1),
          "test:support",
          { campaignId: campaign.id, origin: "subject-request" },
        ),
        running.personId,
      );
      const outcome = campaignLifeOutcomeRecords(done).at(-1)!;
      // Not a member and no shared affiliation: the organizer does not grant.
      expect(outcome.supportDecision).toMatchObject({
        decidedByPersonId: running.organizerId,
        organizationId: running.chapterId,
      });
      expect(outcome.supportDecision!.decision).not.toBe("granted");
      expect(
        done.history.events.some(
          (e) => e.type === CAMPAIGN_SUPPORT_REQUEST_DECIDED_EVENT,
        ),
      ).toBe(true);
      expect(outcome.supportStateIds).toEqual([]);
      const untouched = (world: World) =>
        canonicalJson({
          campaigns: world.history.campaigns,
          campaignStates: world.history.campaignStates,
          contests: world.history.electionContests,
          results: world.history.electionContestResults,
        });
      expect(untouched(done)).toBe(untouched(running.world));
    });

    it("refuses a busy host without writing anything", () => {
      const life = adultLife("life-a");
      const first = offer(
        life,
        life.world,
        "organization-meeting",
        evening(life.world, 1),
        "test:busy:1",
      );
      expect(() =>
        offer(
          life,
          first,
          "town-hall",
          evening(life.world, 1, 18 * 60 + 45),
          "test:busy:2",
        ),
      ).toThrow(/already/);
      expect(() =>
        offer(
          life,
          first,
          "organization-meeting",
          evening(life.world, 3),
          "test:busy:3",
        ),
      ).toThrow(/already on your calendar/);
      expect(() =>
        offer(
          life,
          life.world,
          "town-hall",
          evening(life.world, 1, 20 * 60),
          "test:late",
        ),
      ).toThrow(/past nine/);
      expect(campaignLifeActivityRecords(first)).toHaveLength(1);
    });

    it("a request finds a shared free evening, and refuses without a host", () => {
      const life = adultLife("life-a");
      const blocked = offer(
        life,
        life.world,
        "organization-meeting",
        evening(life.world, 1),
        "test:request:block",
      );
      const requested = requestCampaignLifeActivity(blocked, life.personId, {
        form: "town-hall",
        hostOrganizationId: life.chapterId,
      });
      const record = latestRecord(requested);
      expect(record.origin).toBe("subject-request");
      const view = viewFor(requested, life.personId, record.id);
      expect(view.state).toBe("accepted");
      expect(view.start.date).toBe(addDays(life.world.currentDate, 2));
      const running = withCampaign(life);
      const committee = activeCampaignForCandidate(
        running.world,
        life.personId,
      )!.organizationId;
      expect(() =>
        requestCampaignLifeActivity(running.world, life.personId, {
          form: "phone-shift",
          hostOrganizationId: committee,
        }),
      ).toThrow(/nobody to host/);
    });

    it("organizers keep offering over ordinary days with no lockout", () => {
      const life = adultLife("life-outreach");
      // A first attended meeting starts the organizer's outreach.
      let world = attend(
        offer(
          life,
          life.world,
          "organization-meeting",
          evening(life.world, 1),
          "test:outreach:seed",
          { origin: "subject-request" },
        ),
        life.personId,
      );
      const until = addDays(world.currentDate, 56);
      const offeredIds = new Set<EntityId>();
      while (world.currentDate < until) {
        world = passDay(world, life.personId);
        for (const row of projectCampaignLifeActivities(world, life.personId)) {
          if (row.state !== "offered" || offeredIds.has(row.lifeActivityId))
            continue;
          offeredIds.add(row.lifeActivityId);
          world = acceptCampaignLifeActivity(
            world,
            life.personId,
            row.lifeActivityId,
          );
          const hold = viewFor(
            world,
            life.personId,
            row.lifeActivityId,
          ).scheduledActivityId;
          world = recordCampaignLifeAttendance(
            liveThrough(world, life.personId, hold),
            life.personId,
            hold,
            "attended",
          );
        }
      }
      expect(offeredIds.size).toBeGreaterThanOrEqual(3);
      const outcomes = campaignLifeOutcomeRecords(world);
      expect(outcomes.length).toBe(offeredIds.size + 1);
      const late = outcomes.at(-1)!;
      expect(late.completedAt > addDays(until, -28)).toBe(true);
    });

    it("is deterministic across seeds and jurisdictions, and survives a save mid-offer", () => {
      const run = (seed: string, placeKey: string, save: boolean) => {
        const life = adultLife(seed, placeKey);
        let world = offer(
          life,
          life.world,
          "door-canvass",
          evening(life.world, 1),
          "test:determinism",
        );
        if (save) world = deserializeWorld(serializeWorld(world));
        const record = latestRecord(world);
        world = attend(
          acceptCampaignLifeActivity(world, life.personId, record.id),
          life.personId,
        );
        return world;
      };
      for (const [seed, placeKey] of [
        ["det-a", "kentucky"],
        ["det-b", "state:US-MO"],
      ] as const) {
        const plain = run(seed, placeKey, false);
        expect(canonicalJson(run(seed, placeKey, true))).toBe(
          canonicalJson(plain),
        );
      }
      const a = campaignLifeOutcomeRecords(run("det-a", "kentucky", false)).at(
        -1,
      )!;
      const b = campaignLifeOutcomeRecords(
        run("det-b", "state:US-MO", false),
      ).at(-1)!;
      expect(a.id).not.toBe(b.id);
    });

    it("reads an older save without these records as having none", () => {
      const life = adultLife("life-a");
      const history = Object.fromEntries(
        Object.entries(life.world.history).filter(
          ([key]) =>
            key !== "campaignLifeActivities" && key !== "campaignLifeOutcomes",
        ),
      ) as unknown as World["history"];
      const old = deserializeWorld(serializeWorld({ ...life.world, history }));
      expect(old.history.campaignLifeActivities).toBeUndefined();
      expect(projectCampaignLifeActivities(old, life.personId)).toEqual([]);
    });

    it("keeps the catalog authored and in-person forms on the known journey", () => {
      for (const entry of Object.values(CAMPAIGN_LIFE_CATALOG)) {
        expect(entry.basis).toBe("authored");
        if (entry.presence === "in-person")
          expect(entry.journeyKey).toBe("ordinary-life:to-meeting-room");
        else expect(entry.journeyKey).toBeNull();
      }
      expect(CAMPAIGN_LIFE_CATALOG["door-canvass"].defaultMinutes).toBe(90);
      expect(CAMPAIGN_LIFE_CATALOG["phone-shift"].defaultMinutes).toBe(60);
    });
  },
);
