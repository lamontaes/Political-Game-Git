import { describe, expect, it } from "vitest";
import {
  activeEducationEnrollmentsAt,
  advanceWorldMinutes,
  deserializeWorld,
  didPeopleShareEducationOrganization,
  lifePlaceStateIdentities,
  recordWorldEvent,
  serializeWorld,
  type EntityId,
  type World,
} from "../simulation";
import { schoolConversationRoom } from "./formative-play";
import { createNewGameWorld } from "./new-game";
import { sampledProofLocalityForState } from "./new-game-geography";
import { recordedRoomPresence } from "./recorded-room-presence";

function schoolPresence(world: World, ids: EntityId[], key = "n1-school") {
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
      location: { jurisdictionId, label: "School", setting: "school" },
      socialContext: null,
      pressure: null,
      choice: null,
      motivation: null,
      immediateReaction: null,
    },
  });
}

function pupil(placeKey: string, seed: string) {
  return createNewGameWorld({
    startKind: "custom",
    placeKey,
    startAge: 15,
    depth: "play-formative-years",
    startingLife: "ordinary-life",
    household: "shares-a-home",
    seed,
    givenName: null,
    familyName: null,
  });
}

describe("N1 school presence", () => {
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
      if (classmates.length > 0) {
        expect(room?.eligibleAddresseePersonIds).toEqual(
          classmates.slice(0, 1),
        );
        expect(room?.normalHearingPersonIds).toEqual(presence.personIds);
      } else expect(room).toBeNull();
      const continued = deserializeWorld(before);
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
