import { describe, expect, it } from "vitest";

import { workItemOccasionHasPassed } from "../simulation";
import { createNewGameWorld } from "./new-game";
import {
  PUBLIC_MEETING_KEY,
  neighborhoodConversationRoom,
  openOrdinaryLife,
  passOrdinaryDays,
} from "./ordinary-life";

/** An ordinary adult life that has a posted public meeting. */
function lifeWithMeeting() {
  const game = createNewGameWorld({
    startKind: "custom",
    seed: "meeting-tense",
    placeKey: "2146027",
    startAge: 34,
    depth: "summarize-earlier-life",
    startingLife: "ordinary-life",
    household: "shares-a-home",
    givenName: null,
    familyName: null,
  } as never);
  const world = openOrdinaryLife(game.world, game.playerPersonId);
  return { world, personId: game.playerPersonId };
}

/** What the "Waiting on you" list asks of the meeting's question. */
const meetingIsWaiting = (
  world: ReturnType<typeof lifeWithMeeting>["world"],
) => {
  const item = world.history.workItems.find(
    (entry) => entry.stableKey === PUBLIC_MEETING_KEY,
  )!;
  return !workItemOccasionHasPassed(world, item);
};

describe("a posted meeting is never raised as still ahead once it is over", () => {
  it(
    "stops waiting on the player, and stops the doorstep talk, after its evening",
    { timeout: 300_000 },
    () => {
      const { world, personId } = lifeWithMeeting();
      expect(
        world.history.workItems.some(
          (item) => item.stableKey === PUBLIC_MEETING_KEY,
        ),
      ).toBe(true);
      expect(meetingIsWaiting(world)).toBe(true);

      const later = passOrdinaryDays(world, 10);
      // The meeting's evening went by without an answer.
      expect(meetingIsWaiting(later)).toBe(false);
      expect(neighborhoodConversationRoom(later, personId)).toBeNull();
    },
  );
});
