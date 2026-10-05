import { describe, expect, it } from "vitest";
import { createNewGameWorld, DEFAULT_NEW_GAME_SETUP } from "./new-game";
import { drawRandomPlace } from "../../tests/support/random-place";
import { tellAnswer } from "./life-talk-topics";
import {
  latestGoalStatesForPerson,
  relationshipHistory,
} from "../simulation/queries";

describe("an answer to a recorded story", () => {
  it("names only someone the listener already knows and creates no knowledge by rendering", () => {
    const seed = "session4-tell-answer";
    const place = drawRandomPlace(seed, (p) => p.scope === "locality");
    const { world, playerPersonId } = createNewGameWorld({
      ...DEFAULT_NEW_GAME_SETUP,
      seed,
      placeKey: place.key,
      startAge: 34,
    });
    const listenerId = world.personOrder.find((id) => id !== playerPersonId)!;
    const connected = world.personOrder.find(
      (id) =>
        id !== playerPersonId &&
        latestGoalStatesForPerson(world, id).some(
          (goal) =>
            goal.goalKey === "opening-life:connection" &&
            goal.status === "active",
        ),
    );
    expect(connected).toBeTruthy();
    const sharedPlan = tellAnswer(
      world,
      playerPersonId,
      connected!,
      {
        kind: "plan",
        key: "plan:connection",
        label: "Make time for people you know",
        goal: "connection",
      },
      { parentOfYoungPlayer: false },
    );
    expect(sharedPlan.reply).toContain("people I know");
    expect(sharedPlan.reply).not.toContain("people you know");

    const otherPersonId = world.personOrder.find(
      (id) =>
        id !== playerPersonId &&
        id !== listenerId &&
        relationshipHistory(world, listenerId, id).length === 0,
    )!;
    expect(otherPersonId).toBeTruthy();
    const event = world.history.events.find((entry) =>
      entry.participants.some((p) => p.personId === playerPersonId),
    )!;
    const knowledge = world.history.knowledge;
    const result = tellAnswer(
      world,
      playerPersonId,
      listenerId,
      {
        kind: "experience",
        key: event.id,
        label: event.summary,
        eventId: event.id,
        otherPersonId,
        where: event.context.location?.label ?? place.displayName,
      },
      { parentOfYoungPlayer: false },
    );
    expect(result.parts.some((part) => part.part === "opener")).toBe(false);
    expect(result.reply).not.toContain(world.people[otherPersonId]!.givenName);
    expect(
      result.parts.some((part) => part.partKey.startsWith("life-reply.tell-")),
    ).toBe(true);
    expect(world.history.knowledge).toBe(knowledge);
    expect(
      tellAnswer(
        world,
        playerPersonId,
        listenerId,
        {
          kind: "experience",
          key: event.id,
          label: event.summary,
          eventId: event.id,
          otherPersonId,
          where: place.displayName,
        },
        { parentOfYoungPlayer: false },
      ),
    ).toEqual(result);
  });
});
