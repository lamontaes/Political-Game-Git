import { describe, expect, it } from "vitest";
import { applyLawConsequences } from "./enacted-law-effects";
import { addSimulationMinutes } from "./dates";
import { stableHash } from "./ids";
import { lifePlaceStateIdentities } from "./life-places";
import { activeOrganizationParticipationsAt } from "./life-queries";
import { deserializeWorld, serializeWorld } from "./serialization";
import { performScheduledActivity, scheduledActivityState } from "./time-work";
import { assertWorldIntegrity } from "./world";
import { SERVICE_RECIPIENT_KIND } from "./law-consequences/service-delivered-data";
import { requestPublicService } from "./public-service-requests";
import {
  fundedServiceFixture,
  questionKey,
} from "../../tests/fixtures/funded-service-fixture";
import type { EntityId, Person, World } from "./types";

/** A place from all 56, named by its seed. */
function drawPlace(seed: string): string {
  const places = lifePlaceStateIdentities();
  expect(places).toHaveLength(56);
  return places[parseInt(stableHash(seed).slice(0, 8), 16) % places.length]!
    .jurisdictionKey;
}

/** Authored fixture: the rider's recorded home is in the served place. */
function homeIn(world: World, personId: EntityId, jurisdictionId: EntityId) {
  const person = world.people[personId]!;
  const move = <T extends { kind: string; endedAt?: unknown }>(fact: T): T =>
    fact.kind === "residence" && fact.endedAt === null
      ? { ...fact, jurisdictionId }
      : fact;
  const moved = {
    ...person,
    homeJurisdictionId: jurisdictionId,
    establishedFacts: person.establishedFacts.map(move),
    ...(person.detailLevel === "materialized"
      ? {
          details: {
            ...person.details,
            generatedFacts: person.details.generatedFacts.map(move),
          },
        }
      : {}),
  } as Person;
  const next = { ...world, people: { ...world.people, [personId]: moved } };
  assertWorldIntegrity(next);
  return next;
}

/** The dispatcher call that open PR #1309 adds after every saved completion. */
const dispatchCompletion = (
  world: World,
  activityId: EntityId,
  personId: EntityId,
) =>
  applyLawConsequences(world, {
    activity: "service",
    activityId,
    subjectIds: [personId],
    onDate: world.currentDate,
  });

const deliveries = (world: World) =>
  world.history.events.filter((e) => e.type === "service.delivery-recorded");

function setup(seed: string, key = questionKey) {
  const place = drawPlace(seed);
  const funded = fundedServiceFixture(place, key);
  return {
    ...funded,
    place,
    unmoved: funded.world,
    world: homeIn(funded.world, funded.personId, funded.jurisdiction.id),
  };
}

describe("a rural transit rider's request becomes a trip, and only the trip is service", () => {
  for (const seed of ["team5-rider-1", "team5-rider-2", "team5-rider-3"]) {
    const place = drawPlace(seed);
    it(`request, membership, trip and delivered hours (${place}, seed ${seed})`, () => {
      const f = setup(seed);
      const start = addSimulationMinutes(f.world.currentMoment, 30);
      const asked = requestPublicService(f.world, {
        personId: f.personId,
        commitmentId: f.commitmentId,
        start,
        end: addSimulationMinutes(start, 45),
      });
      if (asked.kind !== "scheduled") throw new Error(asked.reason);
      expect(asked.questionKey).toBe(questionKey);
      let world = asked.world;

      // The saved request, then the membership it created.
      const request = world.history.events.find(
        (e) => e.id === asked.requestEventId,
      )!;
      expect(request.type).toBe("service.requested");
      expect(request.participants[0]!.personId).toBe(f.personId);
      const membership = activeOrganizationParticipationsAt(
        world,
        f.personId,
      ).find(
        ({ participation }) => participation.id === asked.participationId,
      )!;
      expect(membership.participation).toMatchObject({
        organizationId: f.providerId,
        kind: SERVICE_RECIPIENT_KIND,
        provenance: { kind: "simulated-event", eventId: request.id },
      });

      // Booked is not delivered.
      expect(
        deliveries(dispatchCompletion(world, asked.activityId, f.personId)),
      ).toEqual([]);

      // The rider takes the trip: the clock moves 75 minutes and the
      // scheduled interval completes as the person's own act.
      const before = world.currentMoment;
      world = performScheduledActivity(world, asked.activityId);
      expect(scheduledActivityState(world, asked.activityId).status).toBe(
        "completed",
      );
      expect(world.currentMoment).toEqual(addSimulationMinutes(before, 75));
      world = dispatchCompletion(world, asked.activityId, f.personId);
      const [receipt] = deliveries(world);
      expect(receipt!.participants[0]!.personId).toBe(f.personId);
      expect(receipt!.summary).toContain("0.75 hours");
      expect(receipt!.lawEffectStamps?.[0]).toMatchObject({
        questionKey,
        jurisdictionId: f.jurisdiction.id,
        effectKind: "service-delivered",
      });
      expect(receipt!.lawEffectStamps?.[0]!.sourceRecordIds).toEqual(
        expect.arrayContaining([
          asked.activityId,
          asked.participationId,
          f.commitmentId,
          f.personId,
        ]),
      );

      // Saved and reloaded, the delivery is not recorded twice.
      const restored = deserializeWorld(serializeWorld(world));
      expect(
        deliveries(dispatchCompletion(restored, asked.activityId, f.personId)),
      ).toHaveLength(1);

      // A second trip reuses the same membership.
      const again = requestPublicService(restored, {
        personId: f.personId,
        commitmentId: f.commitmentId,
        start: addSimulationMinutes(restored.currentMoment, 60),
        end: addSimulationMinutes(restored.currentMoment, 90),
      });
      if (again.kind !== "scheduled") throw new Error(again.reason);
      expect(again.participationId).toBe(asked.participationId);
      expect(
        again.world.history.organizationParticipations.filter(
          (p) => p.personId === f.personId && p.kind === SERVICE_RECIPIENT_KIND,
        ),
      ).toHaveLength(1);
    });
  }

  it(`a booked trip that is never taken records no service (${drawPlace("team5-rider-no-show")}, seed team5-rider-no-show)`, () => {
    const f = setup("team5-rider-no-show");
    const start = addSimulationMinutes(f.world.currentMoment, 30);
    const asked = requestPublicService(f.world, {
      personId: f.personId,
      commitmentId: f.commitmentId,
      start,
      end: addSimulationMinutes(start, 45),
    });
    if (asked.kind !== "scheduled") throw new Error(asked.reason);
    expect(scheduledActivityState(asked.world, asked.activityId).status).toBe(
      "scheduled",
    );
    expect(
      deliveries(dispatchCompletion(asked.world, asked.activityId, f.personId)),
    ).toEqual([]);
  });

  it(`refuses a rider who lives elsewhere, a past pickup, a repeat and an unknown commitment (${drawPlace("team5-rider-refusals")}, seed team5-rider-refusals)`, () => {
    const f = setup("team5-rider-refusals");
    // Unmoved, the fixture's person keeps the procedure world's own home.
    expect(f.unmoved.people[f.personId]!.homeJurisdictionId).not.toBe(
      f.jurisdiction.id,
    );
    const away = requestPublicService(f.unmoved, {
      personId: f.personId,
      commitmentId: f.commitmentId,
      start: addSimulationMinutes(f.unmoved.currentMoment, 30),
      end: addSimulationMinutes(f.unmoved.currentMoment, 60),
    });
    expect(away).toMatchObject({ kind: "unsupported" });
    expect(away.world).toBe(f.unmoved);
    const past = requestPublicService(f.world, {
      personId: f.personId,
      commitmentId: f.commitmentId,
      start: addSimulationMinutes(f.world.currentMoment, -30),
      end: addSimulationMinutes(f.world.currentMoment, 30),
    });
    expect(past).toMatchObject({ kind: "unsupported" });
    const input = {
      personId: f.personId,
      commitmentId: f.commitmentId,
      start: addSimulationMinutes(f.world.currentMoment, 30),
      end: addSimulationMinutes(f.world.currentMoment, 60),
    };
    const first = requestPublicService(f.world, input);
    expect(first.kind).toBe("scheduled");
    expect(requestPublicService(first.world, input).kind).toBe("unsupported");
    expect(
      requestPublicService(f.world, { ...input, commitmentId: f.personId })
        .kind,
    ).toBe("unsupported");
  });
});

const CRISIS =
  "us-policy-positions:health-human-services.fund-behavioral-health-crisis-response";

describe("the same producer serves a crisis-response call", () => {
  for (const seed of ["team5-crisis-1", "team5-crisis-2"]) {
    const place = drawPlace(seed);
    it(`call, opened case, response visit and delivered hours (${place}, seed ${seed})`, () => {
      const f = setup(seed, CRISIS);
      // A crisis call asks for help now, not at a booked time.
      const start = f.world.currentMoment;
      const asked = requestPublicService(f.world, {
        personId: f.personId,
        commitmentId: f.commitmentId,
        start,
        end: addSimulationMinutes(start, 90),
      });
      if (asked.kind !== "scheduled") throw new Error(asked.reason);
      expect(asked.questionKey).toBe(CRISIS);
      const request = asked.world.history.events.find(
        (e) => e.id === asked.requestEventId,
      )!;
      expect(request.summary).toContain("a crisis response");
      const activity = asked.world.history.scheduledActivities.find(
        (a) => a.id === asked.activityId,
      )!;
      expect(activity.kind).toBe("confirmed");
      expect(activity.title).toMatch(/^Crisis response visit from /);
      expect(
        asked.world.history.organizationParticipationStates.find(
          (state) => state.participationId === asked.participationId,
        )!.context,
      ).toMatch(/^Case opened with /);
      let world = performScheduledActivity(asked.world, asked.activityId);
      world = dispatchCompletion(world, asked.activityId, f.personId);
      const [receipt] = deliveries(world);
      expect(receipt!.summary).toContain("1.5 hours");
      expect(receipt!.lawEffectStamps?.[0]).toMatchObject({
        questionKey: CRISIS,
        effectKind: "service-delivered",
      });
    });
  }

  it(`a funded service law with no request producer stays unsupported (${drawPlace("team5-no-form")}, seed team5-no-form)`, () => {
    const preschool = "us-policy-positions:education.universal-preschool";
    const f = setup("team5-no-form", preschool);
    const result = requestPublicService(f.world, {
      personId: f.personId,
      commitmentId: f.commitmentId,
      start: addSimulationMinutes(f.world.currentMoment, 30),
      end: addSimulationMinutes(f.world.currentMoment, 60),
    });
    expect(result).toMatchObject({ kind: "unsupported" });
    expect(result.world).toBe(f.world);
  });
});
