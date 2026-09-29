import { describe, expect, it } from "vitest";
import { createNewGameWorld, DEFAULT_NEW_GAME_SETUP } from "./new-game";
import { projectPersonDossier } from "./person-dossier";
import { recordWorldEvent } from "../simulation/world";
import { serializeWorld } from "../simulation/serialization";

function recordedLife() {
  const game = createNewGameWorld({
    ...DEFAULT_NEW_GAME_SETUP,
    seed: "dossier-record-access",
    startAge: 8,
  });
  return game;
}

describe("a dossier's own recorded history", () => {
  it("shows public votes involving the person, even when they are not a tenure focus", () => {
    const game = recordedLife();
    const world = recordWorldEvent(game.world, {
      stableKey: "dossier:public-vote",
      type: "local.council-vote",
      occurredAt: game.world.currentDate,
      recordedAt: game.world.currentDate,
      jurisdictionId:
        game.world.people[game.playerPersonId]!.homeJurisdictionId,
      involvedEntityIds: [game.playerPersonId],
      participants: [],
      personFactConstraints: [],
      visibility: "public",
      tags: [],
      summary: "The council adopted ORD 12 by a vote of 4 to 2.",
      context: {
        location: null,
        socialContext: null,
        pressure: null,
        choice: null,
        motivation: null,
        immediateReaction: null,
      },
    });
    const before = serializeWorld(world);
    const dossier = projectPersonDossier(
      world,
      game.playerPersonId,
      game.playerPersonId,
    )!;
    const event = world.history.events.at(-1)!;
    expect(
      dossier.publicCareer.find((entry) => entry.eventId === event.id)?.summary,
    ).toBe(event.summary);
    expect(serializeWorld(world)).toBe(before);
  });

  it("withholds private events from the public record", () => {
    const game = recordedLife();
    const world = recordWorldEvent(game.world, {
      stableKey: "dossier:private-event",
      type: "life.private-conversation",
      occurredAt: game.world.currentDate,
      recordedAt: game.world.currentDate,
      jurisdictionId: null,
      involvedEntityIds: [game.playerPersonId],
      participants: [],
      personFactConstraints: [],
      visibility: "private",
      tags: [],
      summary: "A private conversation about household savings.",
      context: {
        location: null,
        socialContext: null,
        pressure: null,
        choice: null,
        motivation: null,
        immediateReaction: null,
      },
    });
    expect(
      projectPersonDossier(
        world,
        game.playerPersonId,
        game.playerPersonId,
      )!.publicCareer.some((entry) =>
        entry.summary.includes("household savings"),
      ),
    ).toBe(false);
  });
});
