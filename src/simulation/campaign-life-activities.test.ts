import { fixtureMeetsRecordedCandidacyAge } from "../../tests/fixtures/candidacy-age";
import { smallWorld } from "../../tests/fixtures/small-world";
import { describe, expect, it, vi } from "vitest";
import * as decisionEngine from "./decisions";

import {
  fileForOffice,
  namedSeatForFixture,
} from "../../tests/fixtures/campaign-fixture";
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
import { latestSupportState } from "./campaign-support";
import { searchLifePlaces, lifePlaceStateIdentities } from "./life-places";
import { SeededRng } from "./rng";
import { canonicalJson } from "./canonical-json";
import { favorRecords } from "./favors";
import { campaignCompliancePackFor } from "./campaign-compliance";
import { candidacyPackById } from "./candidacy-packs";
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
  addSimulationMinutes,
  ageOnDate,
  compareSimulationMoments,
  simulationMomentAtLocalTime,
} from "./dates";
import { publicPartyAffiliation } from "./living-world/congress";
import {
  CHAPTER_MEMBERSHIP_KIND,
  ensureHomePartyChapters,
  homePartyChapters,
} from "./living-world/party-chapters";
import { resourcePositionAt } from "./resource-queries";
import { deserializeWorld, serializeWorld } from "./serialization";
import {
  createScheduledActivity,
  cancelScheduledActivity,
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
  const fixture = smallWorld({
    place: placeKey,
    seed,
    people: 4,
    household: true,
    offices: ["congress"],
  });
  let world = fixture.world;
  const personId = world.personOrder.find(
    (id) => ageOnDate(world.people[id]!.birthDate, world.currentDate) >= 30,
  )!;
  if (!personId) throw new Error("Activity fixture needs a recorded adult.");
  world = { ...world, control: { kind: "person", personId } };
  world = ensureHomePartyChapters(world, personId);
  const chapter = homePartyChapters(world)[0]!;
  const life = {
    world,
    personId,
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
  const adults = scenario.personOrder.filter((id) =>
    fixtureMeetsRecordedCandidacyAge(scenario, id),
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
    districtBinding: namedSeatForFixture(
      base,
      candidatePersonId,
      candidacyPackById("us-ky-general-assembly-v1:candidacy")!.offices[0]!
        .officeKey,
    ),
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
    it("A122 uses only the completed roster and hours, independent of the seed", () => {
      const places = lifePlaceStateIdentities();
      expect(places).toHaveLength(56);
      const seed = "a122-recorded-fieldwork";
      const state = new SeededRng(seed).pick(places);
      const place = searchLifePlaces("", 1, {
        stateJurisdictionKey: `US-${state.usps}`,
        scope: "locality",
      })[0]!;
      console.info(`A122 place=${place.displayName} seed=${seed}`);
      const life = withCampaign(adultLife(seed, place.key));
      const campaign = activeCampaignForCandidate(life.world, life.personId)!;
      const extraPersonId = Object.keys(life.world.people).find(
        (id) => id !== life.personId && id !== life.organizerId,
      ) as EntityId;
      const complete = (minutes: number, extra: boolean) => {
        let world = offer(
          life,
          life.world,
          "phone-shift",
          evening(life.world, 1, 19 * 60),
          "test:a122:recorded",
          { campaignId: campaign.id, origin: "subject-request" },
        );
        const record = latestRecord(world);
        const hold = world.history.scheduledActivities.find(
          (row) => row.id === record.scheduledActivityId,
        )!;
        const timing = scheduledActivityState(world, hold.id);
        world = cancelScheduledActivity(world, hold.id);
        world = createScheduledActivity(world, {
          stableKey: "test:a122:recorded-crew",
          title: hold.title,
          summary: hold.summary,
          kind: "confirmed",
          start: timing.start,
          end: addSimulationMinutes(timing.start, minutes),
          participantPersonIds: [
            life.personId,
            life.organizerId,
            ...(extra ? [extraPersonId] : []),
          ],
          responsiblePersonId: life.personId,
          location: hold.location,
          sourceEntityIds: hold.sourceEntityIds,
          flexibility: hold.flexibility,
          access: hold.access,
        });
        const id = world.history.scheduledActivities.at(-1)!.id;
        return { world: liveThrough(world, life.personId, id), id };
      };
      const base = complete(30, false);
      const crew = complete(30, true);
      const longer = complete(60, false);
      const record = (input: typeof base, seedOverride?: string) => {
        const fork = SeededRng.prototype.fork;
        const spy = seedOverride
          ? vi
              .spyOn(SeededRng.prototype, "fork")
              .mockImplementation(function (key) {
                return fork.call(new SeededRng(seedOverride), key);
              })
          : null;
        try {
          return recordCampaignLifeAttendance(
            input.world,
            life.personId,
            input.id,
            "attended",
          );
        } finally {
          spy?.mockRestore();
        }
      };
      const done = record(base);
      const outcome = campaignLifeOutcomeRecords(done).at(-1)!;
      expect(Object.keys(done.people)).toEqual(Object.keys(base.world.people));
      expect(outcome.contactPersonIds).toEqual([life.organizerId]);
      expect(outcome.fieldReach?.volunteerEquivalentMinutes).toBe(60);
      const differentSeed = record(base, "a122-same-records-other-seed");
      expect(campaignLifeOutcomeRecords(differentSeed).at(-1)).toEqual(outcome);
      expect(differentSeed.history.futureDueItems.at(-1)?.dueAt).toBe(
        done.history.futureDueItems.at(-1)?.dueAt,
      );
      expect(
        recordCampaignLifeAttendance(done, life.personId, base.id, "attended"),
      ).toBe(done);
      const condensed = recordCampaignLifeAttendance(
        base.world,
        life.personId,
        base.id,
        "condensed",
      );
      expect(campaignLifeOutcomeRecords(condensed).at(-1)?.fieldReach).toEqual(
        outcome.fieldReach,
      );
      const crewDone = record(crew);
      expect(
        new Set(campaignLifeOutcomeRecords(crewDone).at(-1)!.contactPersonIds),
      ).toEqual(new Set([life.organizerId, extraPersonId]));
      expect(
        campaignLifeOutcomeRecords(crewDone).at(-1)!.fieldReach
          ?.volunteerEquivalentMinutes,
      ).toBe(90);
      const share = (world: World) => {
        const scope = campaign.candidateSupportScopes.find(
          (row) => row.candidatePersonId === life.personId,
        )!;
        const state = latestSupportState(world, campaign, scope)!;
        if (state.value.kind !== "quantity")
          throw new Error("Expected recorded share.");
        return (
          state.value.quantity.numerator / state.value.quantity.denominator
        );
      };
      expect(share(crewDone)).toBeGreaterThan(share(done));
      expect(share(record(longer))).toBeGreaterThan(share(done));
      const saved = deserializeWorld(serializeWorld(base.world));
      expect(
        campaignLifeOutcomeRecords(
          recordCampaignLifeAttendance(
            saved,
            life.personId,
            base.id,
            "attended",
          ),
        ).at(-1),
      ).toEqual(outcome);
    });

    it("A122 outreach follows recorded free hours, including a fully booked window", () => {
      const life = adultLife("life-a");
      const scheduled = ensureCampaignLifeOutreach(
        life.world,
        life.personId,
        life.chapterId,
      );
      const first = scheduled.history.futureDueItems.at(-1)!;
      expect(first.dueAt).toBe(addDays(life.world.currentDate, 1));
      let busy = createScheduledActivity(life.world, {
        stableKey: "test:a122:host-booked",
        title: "Recorded organizer commitment",
        summary: "Booked hours.",
        kind: "confirmed",
        start: evening(life.world, 1, 0),
        end: evening(life.world, 20, 21 * 60),
        participantPersonIds: [life.organizerId],
        responsiblePersonId: life.organizerId,
        location: {
          locationKey: "ordinary-life:meeting-room",
          label: "Community room",
          jurisdictionId:
            life.world.people[life.organizerId]!.homeJurisdictionId,
        },
        sourceEntityIds: [life.chapterId],
        flexibility: { kind: "fixed" },
        access: { kind: "private", personIds: [life.organizerId] },
      });
      busy = ensureCampaignLifeOutreach(busy, life.personId, life.chapterId);
      const next = busy.history.futureDueItems.at(-1)!;
      expect(next.dueAt).toBe(addDays(life.world.currentDate, 21));
      expect(
        ensureCampaignLifeOutreach(busy, life.personId, life.chapterId),
      ).toBe(busy);
      const result = campaignLifeOutreachTransitionHandler(busy, next);
      expect(result.world.history.futureDueItems.at(-1)!.dueAt).toBe(
        next.dueAt,
      );
      const fork = SeededRng.prototype.fork;
      const spy = vi
        .spyOn(SeededRng.prototype, "fork")
        .mockImplementation(function (key) {
          return fork.call(new SeededRng("a122-calendar-other-seed"), key);
        });
      let changedSeed: World;
      try {
        changedSeed = ensureCampaignLifeOutreach(
          life.world,
          life.personId,
          life.chapterId,
        );
      } finally {
        spy.mockRestore();
      }
      expect(changedSeed.history.futureDueItems.at(-1)!.dueAt).toBe(
        first.dueAt,
      );
    });

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
      expect(view.travelCostDisclosure).toBe("There is no fare.");
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
      expect(outcome.fieldReach).toBeNull();
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
      ]);
      const interactions = done.history.relationshipInteractions.filter((r) =>
        outcome.relationshipInteractionIds.includes(r.id),
      );
      expect(interactions.map((r) => [r.kind, r.change])).toEqual([
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
      ]);
      // A remote shift has no journey.
      expect(
        viewFor(first, life.personId, firstOutcome.activityId).journeyMinutes,
      ).toBeNull();
    });

    it("candidate guidance reports sourced qualifications and filing terms", () => {
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
      expect(knowledge.believedSummary).toMatch(/filing:/);
      const view = projectCampaignGuidance(guided, life.personId);
      expect(view.offices.length).toBeGreaterThan(0);
      expect(view).not.toHaveProperty("filingAuthority");
      expect(view).not.toHaveProperty("filingFees");
      expect(view).not.toHaveProperty("petitions");
      for (const office of view.offices) {
        expect(office.filing.state).toBe("unknown");
        expect(office.filingTerms.deadline).not.toBe("");
        expect(office.filingTerms.signatures).toBeTruthy();
        if (office.minimumAge.state === "known")
          expect(office.minimumAge.value).toBeGreaterThan(0);
      }
      expect(view.runningNow).toBe(false);
    });

    it("a fundraiser needs a running campaign and no gift without donor funds", () => {
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
      const flowCount = running.world.history.resourceFlows.length;
      const transferCount =
        running.world.history.resourceTransferOutcomes.length;
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
      expect(outcome.contactPersonIds).toEqual([running.organizerId]);
      expect(outcome.raisedAmount).toBeNull();
      expect(outcome.resourceFlowId).toBeNull();
      expect(
        resourcePositionAt(
          raised,
          { kind: "person", personId: outcome.contactPersonIds[0]! },
          campaign.treasuryCurrency,
        ),
      ).toBeUndefined();
      expect(raised.history.resourceFlows).toHaveLength(flowCount);
      expect(raised.history.resourceTransferOutcomes).toHaveLength(
        transferCount,
      );
      expect(
        campaignTreasuryPosition(raised, campaign)!.liquidBalance.minorUnits,
      ).toBe(treasuryBefore);
      const event = raised.history.events.find(
        (item) => item.id === outcome.outcomeEventId,
      )!;
      expect(event.tags).toContain("compliance:not-attempted");
      expect(event.summary).toMatch(
        /recorded monetary ask and applicable contribution-cap law term/,
      );
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

    it("an early fundraiser does not treat an itemization threshold as a gift cap", () => {
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
      expect(event.tags).toContain("compliance:not-attempted");
      expect(event.summary).toMatch(
        /recorded monetary ask and applicable contribution-cap law term/,
      );
    });

    it("a covered fundraiser preserves the recorded attendee and needs a saved payment basis", () => {
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
      const flowCount = covered.history.resourceFlows.length;
      const transferCount = covered.history.resourceTransferOutcomes.length;
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
      expect(outcome.contactPersonIds).toEqual([running.organizerId]);
      expect(outcome.raisedAmount).toBeNull();
      expect(outcome.resourceFlowId).toBeNull();
      // No money moved, so nobody gave anything.
      expect(
        favorRecords(first).some(
          (favor) => favor.kind === "political:campaign-donation",
        ),
      ).toBe(false);
      expect(first.history.resourceFlows).toHaveLength(flowCount);
      expect(first.history.resourceTransferOutcomes).toHaveLength(
        transferCount,
      );
      expect(
        campaignTreasuryPosition(first, campaign)!.liquidBalance.minorUnits,
      ).toBe(treasuryBefore);
      const event = first.history.events.find(
        (e) => e.id === outcome.outcomeEventId,
      )!;
      expect(event.tags).toContain("compliance:not-attempted");
      expect(event.summary).toMatch(
        /recorded monetary ask and applicable contribution-cap law term/,
      );

      // A second meeting keeps the same person and still cannot debit them.
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
      expect(refused.tags).toContain("compliance:not-attempted");
      expect(refused.summary).toMatch(
        /recorded monetary ask and applicable contribution-cap law term/,
      );
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

    it.each(["no-available-option", "selected", "undecided"] as const)(
      "leaves outreach unoffered when the organizer has no selected answer (%s)",
      (outcomeKind) => {
        const life = adultLife("life-a");
        const scheduled = ensureCampaignLifeOutreach(
          life.world,
          life.personId,
          life.chapterId,
        );
        const item = scheduled.history.futureDueItems.at(-1)!;
        const evaluate = decisionEngine.evaluateDecision;
        const spy = vi
          .spyOn(decisionEngine, "evaluateDecision")
          .mockImplementation((world, context) => {
            const result = evaluate(world, context);
            return context.decisionType === "campaign.organizer-outreach"
              ? {
                  ...result,
                  outcomeKind,
                  selectedOptionKey: null,
                }
              : result;
          });
        try {
          const result = campaignLifeOutreachTransitionHandler(scheduled, item);
          expect(result.reasonKey).toBe("campaign:organizer-undecided");
          expect(campaignLifeActivityRecords(result.world)).toEqual(
            campaignLifeActivityRecords(scheduled),
          );
          expect(result.world.history.events).toEqual(scheduled.history.events);
          const later = result.world.history.futureDueItems.slice(
            scheduled.history.futureDueItems.length,
          );
          expect(later).toHaveLength(1);
          expect(later[0]!.dueAt > scheduled.currentDate).toBe(true);
        } finally {
          spy.mockRestore();
        }
      },
    );

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
      expect(outcome.fieldReach).toMatchObject({
        profileVersion: "research1-wave2-v1",
        estimatedDoorKnocks: null,
        estimatedCompletedConversations: { min: 9, max: 24 },
      });
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
      // Everyone who worked the doors for this candidate did them a favor;
      // the candidate working for themselves did nobody one.
      const favors = favorRecords(done).filter(
        (favor) => favor.eventId === outcome.outcomeEventId,
      );
      expect(favors.length).toBeGreaterThan(0);
      expect(favors.map((favor) => favor.giverPersonId).sort()).toEqual(
        [...outcome.contactPersonIds].sort(),
      );
      for (const favor of favors) {
        expect(favor).toMatchObject({
          receiverPersonId: running.personId,
          kind: "political:campaign-volunteering",
          motive: "shared-belief",
          weight: "slight",
        });
      }
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
      // A chapter that did not back the campaign did it no favor.
      expect(
        favorRecords(done).some(
          (favor) => favor.kind === "political:chapter-backing",
        ),
      ).toBe(false);
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

