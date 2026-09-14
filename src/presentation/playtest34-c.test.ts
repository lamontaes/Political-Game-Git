import { describe, expect, it } from "vitest";

import { createExplicitGeographyLife } from "./new-game-geography";
import {
  commitLifeConversation,
  projectLifeConversation,
} from "./life-conversation";
import {
  currentOpeningLifeScene,
  openingLifeLocation,
  openNextLifeScene,
} from "./life-scene-flow";
import {
  simulateAuthorizedCalendarActivity,
  simulateCalendarDays,
} from "./calendar-time-control";
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

  it("keeps talk, contact, meet, and travel as separate capabilities", () => {
    const created = createExplicitGeographyLife({
      placeKey: "lexington-fayette",
      seed: "pt34-c-contact",
      startAge: 16,
      household: "shares-a-home",
    });
    let world = created.game.world;
    const playerId = created.game.playerPersonId;
    if (!currentOpeningLifeScene(world, playerId)) {
      world = openNextLifeScene(world, playerId);
    }
    const scene = currentOpeningLifeScene(world, playerId);
    const other =
      scene?.presentPersonIds.find((id) => id !== playerId) ??
      Object.keys(world.people).find((id) => id !== playerId)!;
    const contact = projectPersonContact(world, playerId, other);
    expect(contact.contact.available).toBe(false);
    expect(contact.travel.available).toBe(false);
    expect(contact.talk.kind).toBe("talk");
    expect(contact.contact.kind).toBe("contact");
    expect(contact.meet.kind).toBe("meet");
    expect(contact.travel.kind).toBe("travel");
    expect(contact.talk.reason).not.toEqual(contact.contact.reason);
    const theirPlace = openingLifeLocation(world, other);
    const playerPlace = openingLifeLocation(world, playerId);
    if (theirPlace) {
      expect(contact.travel.reason).toContain(theirPlace.label);
    } else {
      expect(contact.travel.reason).toMatch(/location|pin/i);
    }
    if (playerPlace && theirPlace) {
      expect(contact.travel.reason).toContain(playerPlace.label);
    }
  });

  it("refuses unauthorized calendar simulation without moving time", () => {
    const created = createExplicitGeographyLife({
      placeKey: "lexington-fayette",
      seed: "pt34-c-simulate-gate",
      startAge: 34,
    });
    const world = created.game.world;
    const before = world.currentMoment;
    const result = simulateAuthorizedCalendarActivity(
      world,
      created.game.playerPersonId,
      "not-a-scheduled-activity",
    );
    expect(result.world).toBe(world);
    expect(result.reached).toEqual(before);
    expect(result.outcome).toMatch(/not on the recorded calendar/i);
  });
});
