import { drawRandomPlace } from "../../tests/support/random-place";
import { ensureJurisdiction } from "../simulation/national-election-geography";
import { expect, it } from "vitest";
import { createRunBFixture } from "./run-b-fixture";
import {
  activeWorkRelationshipsAt,
  createOrganization,
  createWorkRelationship,
  recordWorkStatus,
  recordWorldEvent,
  serializeWorld,
  deserializeWorld,
  type EntityId,
  type World,
} from "../simulation";
import { recordOpeningWorkLocation } from "./opening-work-location";
import { workplacePresence } from "./workplace-presence";
import { resolveOpeningPlaySceneContext } from "./play-scene-context";
import { lifeTalkConversationRoom } from "./life-talk-conversation";
import { commitLifeConversation } from "./life-conversation";

const provenance = {
  kind: "authored" as const,
  note: "Explicit Session 4 workplace presence fixture; not live-game proof.",
};
function fixture() {
  const created = createRunBFixture("session4-workplace-presence");
  let world = created.world;
  const player = created.playerPersonId;
  const coworker = created.scenePeople[0].personId;
  const unrelated = created.scenePeople[1].personId;
  for (const id of [player, coworker, unrelated])
    for (const job of activeWorkRelationshipsAt(world, id)) {
      world = recordWorkStatus(world, {
        stableKey: `fixture:end:${job.relationship.id}`,
        workRelationshipId: job.relationship.id,
        effectiveAt: world.currentDate,
        status: "ended",
        reason: "The explicit fixture starts a different recorded job.",
        provenance,
        supersedesStatusId: job.status.id,
      });
    }
  const place = drawRandomPlace(
    "session4-workplace-presence",
    (p) =>
      p.scope === "locality" &&
      p.context.jurisdiction.id !== world.people[player]!.homeJurisdictionId,
  );
  world = ensureJurisdiction(world, place.context.jurisdiction);
  const town = place.context.jurisdiction.id;
  process.stdout.write(
    JSON.stringify({
      seed: "session4-workplace-presence",
      place: place.displayName,
      fixture: true,
    }) + "\n",
  );
  const organization = (key: string) => {
    world = createOrganization(world, {
      stableKey: key,
      formedAt: world.currentDate,
      provenance,
      initialProfile: {
        name: key,
        classification: "business:professional-services",
        locationJurisdictionId: town,
      },
    });
    return world.history.organizations.at(-1)!.id;
  };
  const employer = organization("fixture:shared-employer");
  const elsewhere = organization("fixture:other-employer");
  for (const [personId, organizationId] of [
    [player, employer],
    [coworker, employer],
    [unrelated, elsewhere],
  ] as const) {
    world = createWorkRelationship(world, {
      stableKey: `fixture:job:${personId}`,
      personId,
      organizationId,
      startedAt: world.currentDate,
      kind: "employment:office",
      compensation: "paid",
      authority: "shared",
      dependency: "dependent",
      economicRisk: "organization-borne",
      provenance,
      initialRole: {
        title: "Policy assistant",
        locationJurisdictionId: town,
        timeDemand: {
          expectedWeekly: { minimumHours: 40, maximumHours: 40 },
          attention: "high",
          concurrency: "partly-concurrent",
          scheduleRigidity: "rigid",
          interruptibility: "limited",
          locationJurisdictionId: town,
        },
      },
    });
  }
  // A fixture clock at an ordinary weekday office shift, not a gameplay time action.
  world = {
    ...world,
    currentMoment: { ...world.currentMoment, minuteOfDay: 600 },
  };
  return { world, player, coworker, unrelated, town };
}
function homeArrival(world: World, personId: EntityId) {
  return recordWorldEvent(world, {
    stableKey: `fixture:home:${personId}`,
    type: "life.scene.arrived",
    occurredAt: world.currentDate,
    recordedAt: world.currentDate,
    jurisdictionId: world.people[personId]!.homeJurisdictionId,
    involvedEntityIds: [personId],
    participants: [
      {
        personId,
        role: "presence:participant",
        detail: "Recorded fixture arrival at home",
      },
    ],
    personFactConstraints: [],
    visibility: "private",
    tags: ["fixture:arrival"],
    summary: "Arrived home.",
    context: {
      location: {
        jurisdictionId: world.people[personId]!.homeJurisdictionId,
        label: "Home",
        setting: "home",
      },
      socialContext: null,
      pressure: null,
      choice: null,
      motivation: null,
      immediateReaction: null,
    },
  });
}
it("uses actual same-employer shift presence and saves the exchange at its actual workplace", () => {
  const f = fixture();
  const world = recordOpeningWorkLocation(f.world, f.player);
  const before = serializeWorld(world);
  const presence = workplacePresence(world, f.player)!;
  expect(presence.personIds).toEqual([f.player, f.coworker]);
  expect(presence.personIds).not.toContain(f.unrelated);
  const context = resolveOpeningPlaySceneContext(world, f.player);
  expect(context.locationKey).toBe(`work:${presence.workRelationshipId}`);
  expect(context.presentPeople.map((person) => person.personId)).toEqual([
    f.coworker,
  ]);
  expect(f.town).not.toBe(world.people[f.player]!.homeJurisdictionId);
  expect(lifeTalkConversationRoom(world, f.player)?.jurisdictionId).toBe(
    f.town,
  );
  expect(serializeWorld(world)).toBe(before);
  const spoken = commitLifeConversation(world, {
    playerPersonId: f.player,
    personId: f.coworker,
    intent: "greet",
    revision: world.history.nextSequence,
  });
  const event = spoken.history.events.find(
    (record) => record.type === "life.conversation",
  )!;
  expect(event.jurisdictionId).toBe(f.town);
  expect(event.context.location?.jurisdictionId).toBe(f.town);
  expect(
    spoken.history.knowledge
      .filter((record) => record.eventId === event.id)
      .map((record) => record.personId)
      .sort(),
  ).toEqual([f.player, f.coworker].sort());
  expect(
    workplacePresence(deserializeWorld(serializeWorld(spoken)), f.player),
  ).toEqual(workplacePresence(spoken, f.player));
});
it("honors a coworker's incompatible recorded location before or after the player's arrival", () => {
  const f = fixture();
  const earlier = recordOpeningWorkLocation(
    homeArrival(f.world, f.coworker),
    f.player,
  );
  expect(workplacePresence(earlier, f.player)?.personIds).toEqual([f.player]);
  const later = homeArrival(
    recordOpeningWorkLocation(f.world, f.player),
    f.coworker,
  );
  expect(workplacePresence(later, f.player)?.personIds).toEqual([f.player]);
});
