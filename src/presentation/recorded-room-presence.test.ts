import { describe, expect, it } from "vitest";
import {
  activeEducationEnrollmentsAt,
  advanceWorldMinutes,
  deserializeWorld,
  didPeopleShareEducationOrganization,
  lifePlaceStateIdentities,
  householdMembershipsAt,
  peopleInHouseholdAt,
  recordWorldEvent,
  serializeWorld,
  type EntityId,
  type World,
} from "../simulation";
import { schoolConversationRoom } from "./formative-play";
import { createNewGameWorld } from "./new-game";
import { sampledProofLocalityForState } from "./new-game-geography";
import { recordedRoomPresence } from "./recorded-room-presence";
import { projectPlayerConversation } from "./player-conversation";
import { resolveOpeningPlaySceneContext } from "./play-scene-context";
import {
  householdConversationRoom,
  neighborhoodConversationRoom,
  openOrdinaryLife,
} from "./ordinary-life";

function schoolPresence(
  world: World,
  ids: EntityId[],
  key = "n1-school",
  setting: "school" | "home" | "neighborhood" = "school",
) {
  const jurisdictionId = world.people[ids[0]!]!.homeJurisdictionId;
  return recordWorldEvent(world, {
    stableKey: key,
    type: "life.scene.opened",
    occurredAt: world.currentDate,
    recordedAt: world.currentDate,
    jurisdictionId,
    involvedEntityIds: ids,
    participants: ids.map((personId) => ({
      personId,
      role: "presence:participant",
      detail: "Recorded school presence in the authored test scenario.",
    })),
    personFactConstraints: [],
    visibility: "private",
    tags: [`moment:${JSON.stringify(world.currentMoment)}`],
    summary: "The recorded participants are at school.",
    context: {
      location: { jurisdictionId, label: setting, setting },
      socialContext: null,
      pressure: null,
      choice: null,
      motivation: null,
      immediateReaction: null,
    },
  });
}

function pupil(placeKey: string, seed: string, startAge = 15) {
  return createNewGameWorld({
    startKind: "custom",
    placeKey,
    startAge,
    depth: "play-formative-years",
    startingLife: "ordinary-life",
    household: "shares-a-home",
    seed,
    givenName: null,
    familyName: null,
  });
}

describe("N1 school presence", () => {
  it("does not place a neighbor at the doorstep merely because a meeting is posted", () => {
    const game = pupil("kentucky", "n1-neighbor-presence", 34);
    const id = game.playerPersonId;
    const world = openOrdinaryLife(game.world, id);
    expect(neighborhoodConversationRoom(world, id)).toBeNull();
    const alone = schoolPresence(world, [id], "doorstep-alone", "neighborhood");
    const before = serializeWorld(alone);
    expect(neighborhoodConversationRoom(alone, id)).toBeNull();
    expect(serializeWorld(alone)).toBe(before);
  });
  it("does not infer home presence from shared household membership", () => {
    const game = pupil("kentucky", "n1-home-presence", 34);
    const id = game.playerPersonId;
    const membership = householdMembershipsAt(game.world, id).find(
      (entry) => entry.state.residenceRole === "primary",
    )!;
    const companions = peopleInHouseholdAt(
      game.world,
      membership.household.id,
    ).filter((candidate) => candidate !== id);
    expect(companions.length).toBeGreaterThan(0);
    expect(householdConversationRoom(game.world, id)).toBeNull();
    const alone = schoolPresence(game.world, [id], "home-alone", "home");
    expect(householdConversationRoom(alone, id)).toBeNull();
    const together = schoolPresence(
      alone,
      [id, companions[0]!],
      "home-together",
      "home",
    );
    const before = serializeWorld(together);
    const room = householdConversationRoom(together, id)!;
    expect(room.eligibleAddresseePersonIds).toEqual([companions[0]]);
    expect([...room.normalHearingPersonIds].sort()).toEqual(
      [id, companions[0]!].sort(),
    );
    expect(householdConversationRoom(deserializeWorld(before), id)).toEqual(
      room,
    );
    expect(serializeWorld(together)).toBe(before);
  });
  it("requires saved presence across all 56 places and survives Save/Continue", () => {
    const places = lifePlaceStateIdentities();
    expect(places).toHaveLength(56);
    for (const place of places) {
      const seed = `n1-school-presence:${place.usps}`;
      const game = pupil(
        sampledProofLocalityForState(place.jurisdictionKey).key,
        seed,
      );
      const id = game.playerPersonId;
      expect(
        resolveOpeningPlaySceneContext(game.world, id).presentPeople,
      ).toEqual([]);
      expect(
        schoolConversationRoom(game.world, id),
        `${place.name}/${seed}`,
      ).toBeNull();
      const classmates = game.world.personOrder.filter(
        (candidate) =>
          candidate !== id &&
          activeEducationEnrollmentsAt(game.world, candidate).length > 0 &&
          didPeopleShareEducationOrganization(game.world, id, candidate),
      );
      const world = schoolPresence(game.world, [id, ...classmates.slice(0, 1)]);
      const before = serializeWorld(world);
      const presence = recordedRoomPresence(world, id)!;
      expect([...presence.personIds].sort()).toEqual(
        [id, ...classmates.slice(0, 1)].sort(),
      );
      const room = schoolConversationRoom(world, id);
      expect(
        resolveOpeningPlaySceneContext(world, id).presentPeople.map(
          (person) => person.personId,
        ),
      ).toEqual(classmates.slice(0, 1));
      expect(
        projectPlayerConversation(world, id, "school-project-share"),
      ).toBeNull();
      if (classmates.length > 0) {
        expect(room?.eligibleAddresseePersonIds).toEqual(
          classmates.slice(0, 1),
        );
        expect(room?.normalHearingPersonIds).toEqual(presence.personIds);
      } else expect(room).toBeNull();
      const continued = deserializeWorld(before);
      expect(
        projectPlayerConversation(continued, id, "school-project-share"),
      ).toBeNull();
      expect(schoolConversationRoom(continued, id)).toEqual(room);
      expect(serializeWorld(world)).toBe(before);
      expect(schoolConversationRoom(world, id)).toEqual(room);
      expect(
        recordedRoomPresence(advanceWorldMinutes(world, 1), id),
      ).toBeNull();
    }
  }, 120_000);

  it("does not keep a participant who has a later place record", () => {
    const game = pupil("kentucky", "n1-school-leaving");
    const ids = game.world.personOrder.slice(0, 3);
    const world = schoolPresence(game.world, ids);
    const moved = schoolPresence(world, [ids[1]!], "n1-left-room");
    expect(recordedRoomPresence(moved, ids[0]!)?.personIds.sort()).toEqual(
      ids.filter((id) => id !== ids[1]).sort(),
    );
  });
});
