import { describe, expect, it } from "vitest";

import { createExplicitGeographyLife } from "./new-game-geography";
import {
  commitLifeConversation,
  projectLifeConversation,
} from "./life-conversation";
import { currentOpeningLifeScene } from "./life-scene-flow";
import { openNextLifeScene } from "./life-scene-flow";
import { simulateCalendarDays } from "./calendar-time-control";
import { projectPersonContact } from "./person-contact";

describe("PLAYTEST34 C contracts", () => {
  it("does not charge ordinary talk lines", () => {
    const created = createExplicitGeographyLife({
      placeKey: "lexington-fayette",
      seed: "pt34-c-talk-time",
      startAge: 16,
      household: "shares-a-home",
    });
    let world = created.game.world;
    const playerId = created.game.playerPersonId;
    if (!currentOpeningLifeScene(world, playerId)) {
      world = openNextLifeScene(world, playerId);
    }
    const scene = currentOpeningLifeScene(world, playerId);
    const other = scene?.presentPersonIds.find((id) => id !== playerId);
    expect(other).toBeTruthy();
    const view = projectLifeConversation(world, playerId, other!);
    expect(view).toBeTruthy();
    const greet = view!.intents.find((intent) => intent.key === "greet");
    expect(greet).toBeTruthy();
    const before = world.currentMoment;
    const next = commitLifeConversation(world, {
      playerPersonId: playerId,
      personId: other!,
      intent: "greet",
      revision: view!.revision,
    });
    expect(next.currentMoment).toEqual(before);
    expect(
      next.history.events.some((event) => event.type === "life.conversation"),
    ).toBe(true);
  });

  it("advances a simulated day through the existing time contract", () => {
    const created = createExplicitGeographyLife({
      placeKey: "lexington-fayette",
      seed: "pt34-c-calendar-day",
      startAge: 34,
    });
    const before = created.game.world.currentDate;
    const result = simulateCalendarDays(
      created.game.world,
      created.game.playerPersonId,
      1,
    );
    expect(result.reached.date >= before).toBe(true);
    expect(result.outcome.length).toBeGreaterThan(0);
  });

  it("explains travel without inventing a location", () => {
    const created = createExplicitGeographyLife({
      placeKey: "lexington-fayette",
      seed: "pt34-c-contact",
      startAge: 16,
      household: "shares-a-home",
    });
    const world = created.game.world;
    const playerId = created.game.playerPersonId;
    const other = Object.keys(world.people).find((id) => id !== playerId)!;
    const contact = projectPersonContact(world, playerId, other);
    expect(contact.travel.available).toBe(false);
    expect(contact.travel.reason).toMatch(/journey|location|pin/i);
  });
});
