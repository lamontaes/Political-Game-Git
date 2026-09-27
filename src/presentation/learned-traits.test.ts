import { beforeAll, describe, expect, it } from "vitest";

import type { EntityId, World } from "../simulation";
import {
  observedTraitLabels,
  personTrait,
  recordTraitChange,
} from "../simulation/people-traits";
import { explicitNewGameSetup } from "./new-game-geography";
import { learnedTraits, strongestLearnedTraits } from "./learned-traits";
import { learnedTraitWhere } from "./person-card-english";
import { createOpeningLifeController } from "./opening-life";
import { openOrdinaryLife } from "./ordinary-life";
import { contactBases } from "../simulation/people-contact";
import { projectPlayerConversation } from "./player-conversation";
import { commitConversationTurn } from "./run-b-conversation";
import { DEFAULT_INTERRUPTIONS } from "./shell-navigation";
import { submitTimeCommand } from "./time-command";

/**
 * The person card names only the traits the player has learned.
 *
 * A life opens through the normal new-game setup and passes a Day. Everyone
 * the player can reach has traits on record from the opening; none of them is
 * learned. The neighbor at the door becomes known for a trait only by
 * answering the player, through the same conversation screen route the game
 * uses, and the card says when and why.
 */

const SUBJECT = "neighborhood-meeting-notice" as const;

interface Life {
  readonly world: World;
  readonly playerId: EntityId;
  readonly neighborId: EntityId;
}

function openLife(): Life {
  const game = createOpeningLifeController(
    explicitNewGameSetup({
      placeKey: "3918000",
      seed: "learned-traits",
      startAge: 34 as never,
      depth: "summarize-earlier-life",
    }),
  ).finishTransition().game!;
  const playerId = game.playerPersonId;
  const opened = openOrdinaryLife(game.world, playerId);
  const world = submitTimeCommand(opened, {
    requestId: "learned-traits:day",
    personId: playerId,
    sourceMoment: opened.currentMoment,
    command: { kind: "days", days: 1 },
    interruptions: DEFAULT_INTERRUPTIONS,
  }).world;
  const view = projectPlayerConversation(world, playerId, SUBJECT);
  if (!view) throw new Error("This life offers no doorstep conversation.");
  return {
    world,
    playerId,
    neighborId: view.room.roles["the-other-person"]!,
  };
}

function say(world: World, playerId: EntityId, intent: string): World {
  const view = projectPlayerConversation(world, playerId, SUBJECT)!;
  expect(view.intents.map((option) => option.key)).toContain(intent);
  return commitConversationTurn(world, {
    session: view.session,
    room: view.room,
    progress: view.progress,
    turnOrdinal: view.turnOrdinal,
    addressee: view.addressee,
    audibility: view.audibility,
    intent,
  }).world;
}

function neighborEvent(world: World, neighborId: EntityId): EntityId {
  const event = world.history.events.find((candidate) =>
    candidate.involvedEntityIds.includes(neighborId),
  );
  if (!event) throw new Error("The neighbor has no recorded event.");
  return event.id;
}

/** An outgoing neighbor, balanced on everything else this question reads. */
function outgoingNeighbor(life: Life): World {
  const eventId = neighborEvent(life.world, life.neighborId);
  let world = life.world;
  for (const [trait, value] of [
    ["sociability", 2],
    ["conflict", 0],
    ["deliberation", 0],
    ["reliability", 0],
    ["risk", 0],
  ] as const) {
    world = recordTraitChange(world, {
      personId: life.neighborId,
      trait,
      value,
      eventId,
      reason: "Test temperament for the neighbor.",
    });
  }
  return world;
}

describe("The traits a card names are the ones the player has learned", () => {
  let life: Life;
  beforeAll(() => {
    life = openLife();
  }, 120_000);

  it("names nothing for people whose traits are only on record", () => {
    const withTraits = contactBases(life.world, life.playerId)
      .map((basis) => basis.personId)
      .filter((id) => observedTraitLabels(life.world, id).length > 0);
    // The opening drew traits for the people the player can reach …
    expect(withTraits.length).toBeGreaterThan(0);
    // … and the player has seen none of them decide anything yet.
    for (const personId of withTraits) {
      expect(learnedTraits(life.world, life.playerId, personId)).toEqual([]);
    }
  });

  it("learns a trait from an answer the person gave, and says when and why", () => {
    const before = outgoingNeighbor(life);
    expect(learnedTraits(before, life.playerId, life.neighborId)).toEqual([]);
    const mentioned = say(before, life.playerId, "mention-meeting");
    const asked = say(mentioned, life.playerId, "ask-them-to-go");
    const answer = asked.history.decisionTraces.at(-1)!;
    expect(answer.selectedOptionKey).toBe("attend-the-meeting");

    const learned = learnedTraits(asked, life.playerId, life.neighborId);
    const sociable = personTrait(asked, life.neighborId, "sociability");
    expect(learned.length).toBeGreaterThan(0);
    // Every learned trait is one that argued for what they chose, cited by
    // the answer the player heard.
    for (const trait of learned) {
      expect(trait.decisionTraceId).toBe(answer.id);
      expect(trait.learnedOn).toBe(asked.currentDate);
      const reasons = answer.context.considerations.filter(
        (entry) =>
          entry.optionKey === answer.selectedOptionKey &&
          entry.explanation === trait.reason,
      );
      expect(reasons.length).toBeGreaterThan(0);
    }
    expect(
      learned.some(
        (trait) =>
          trait.tendencyId ===
          asked.history.personalityTendencies.find(
            (record) => record.id === sociable.recordId,
          )!.tendencyId,
      ),
    ).toBe(true);
    expect(learnedTraitWhere(learned[0]!)).toMatch(
      /^Seen [A-Z][a-z]+ \d{1,2}, \d{4}, in an answer to you\. /,
    );
    // The small card names at most three.
    expect(
      strongestLearnedTraits(asked, life.playerId, life.neighborId, 3).length,
    ).toBeLessThanOrEqual(3);
    // The player learned it; the neighbor learned nothing about the player.
    expect(learnedTraits(asked, life.neighborId, life.playerId)).toEqual([]);
  });

  it("names a trait as the player saw it, even after it changes", () => {
    const outgoing = outgoingNeighbor(life);
    const asked = say(
      say(outgoing, life.playerId, "mention-meeting"),
      life.playerId,
      "ask-them-to-go",
    );
    const seen = learnedTraits(asked, life.playerId, life.neighborId);
    const changed = recordTraitChange(asked, {
      personId: life.neighborId,
      trait: "sociability",
      value: -2,
      eventId: neighborEvent(asked, life.neighborId),
      reason: "Test: they withdrew later.",
    });
    expect(learnedTraits(changed, life.playerId, life.neighborId)).toEqual(
      seen,
    );
  });

  it("writes nothing when read", () => {
    const history = life.world.history;
    for (const personId of Object.keys(life.world.people) as EntityId[]) {
      learnedTraits(life.world, life.playerId, personId);
    }
    expect(life.world.history).toBe(history);
    expect(life.world.history.personalityTendencies.length).toBe(
      history.personalityTendencies.length,
    );
  });
});
