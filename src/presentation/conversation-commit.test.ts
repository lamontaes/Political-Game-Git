import { describe, expect, it } from "vitest";

import { deserializeWorld, serializeWorld } from "../simulation";
import type { World } from "../simulation";
import {
  conversationProgressFromHistory,
  conversationSettled,
  recordedConversationIntents,
} from "./conversation-continuity";
import {
  conversationCommitContract,
  conversationSubjectKeys,
  selectAuthoredVariant,
} from "./conversation-subjects";
import { createNewGameWorld } from "./new-game";
import { householdConversationRoom, openOrdinaryLife } from "./ordinary-life";
import {
  availableConversationIntents,
  commitConversationTurn,
  createConversationSessionDescriptor,
} from "./run-b-conversation";
import {
  createHouseholdObligationProgress,
  createNeighborhoodMeetingProgress,
  createSchoolProjectProgress,
  createRunBConversationProgress,
} from "./run-b-conversation-progress";

/**
 * What a conversation writes down, and whether it remembers it.
 *
 * The audit found a household deciding who does the shopping committing
 * `conversation.office` history, tagged as constituent services, in a scene
 * recorded as a "Synthetic Stage 6.5 office conversation fixture" — and then
 * reopening the settled obligation at turn one after a reload, because the
 * progress lived in React and the record lived in the world.
 */

function household(seed: string) {
  const game = createNewGameWorld({
    placeKey: "kentucky",
    startAge: 34,
    depth: "summarize-earlier-life",
    startingLife: "ordinary-life",
    seed,
    givenName: null,
    familyName: null,
  });
  const world = openOrdinaryLife(game.world, game.playerPersonId);
  const room = householdConversationRoom(world, game.playerPersonId)!;
  return { world, personId: game.playerPersonId, room };
}

function say(world: World, personId: string, intent: string): World {
  const room = householdConversationRoom(world, personId)!;
  const progress =
    conversationProgressFromHistory(world, personId, "household-obligation") ??
    createHouseholdObligationProgress();
  const turn =
    recordedConversationIntents(world, personId, "household-obligation")
      .length + 1;
  return commitConversationTurn(world, {
    session: createConversationSessionDescriptor(world, room),
    room,
    progress,
    turnOrdinal: turn,
    addressee: room.eligibleAddresseePersonIds[0]!,
    audibility: "normal",
    intent,
  }).world;
}

describe("A conversation writes down what it was actually about", () => {
  it("leaves household history at home, and no casework anywhere", () => {
    const { world, personId } = household("commit");
    const after = say(world, personId, "raise-obligation");

    const turns = after.history.events.filter((event) =>
      event.type.startsWith("conversation."),
    );
    expect(turns.length).toBeGreaterThan(0);

    for (const event of turns) {
      expect(event.type).toBe("conversation.household-turn");
      expect(event.tags).toContain("conversation.household");
      expect(event.tags).toContain("conversation.subject.household-obligation");
      // The exact leak the audit reproduced.
      expect(event.tags).not.toContain("conversation.office");
      expect(event.tags).not.toContain(
        "conversation.subject.constituent-services",
      );
      expect(event.context.location?.setting).toBe("Home");
      expect(event.context.location?.setting).not.toMatch(/synthetic|fixture/i);
      expect(event.context.socialContext).not.toMatch(/briefing/i);
    }

    // And nothing anywhere in the world claims casework happened.
    const written = JSON.stringify(after.history);
    expect(written).not.toContain("constituent-services");
    expect(written).not.toContain("Synthetic Stage 6.5");
  });

  it("describes the relationship in household terms, not office ones", () => {
    const { world, personId } = household("relationship");
    // The subject opens by naming the thing; the offer comes after.
    let after = say(world, personId, "raise-obligation");
    after = say(after, personId, "offer-to-cover");
    const interactions = after.history.relationshipInteractions;
    if (interactions.length === 0) return;
    for (const interaction of interactions) {
      expect(interaction.tags).not.toContain("conversation.office");
      expect(interaction.kind).not.toBe("work:reassurance");
    }
  });

  it("gives every subject its own canonical vocabulary", () => {
    const contracts = [
      createRunBConversationProgress(),
      createHouseholdObligationProgress(),
      createSchoolProjectProgress(),
      createNeighborhoodMeetingProgress(),
    ].map(conversationCommitContract);

    const subjectTags = new Set(contracts.map((c) => c.subjectTag));
    expect(subjectTags.size).toBe(contracts.length);
    for (const contract of contracts) {
      expect(contract.setting).not.toMatch(/synthetic|fixture|stage-6/i);
    }
  });

  it("carries five subject families, not one engine idea of talking", () => {
    const keys = conversationSubjectKeys();
    expect(keys).toContain("shared-intake-checklist");
    expect(keys).toContain("household-obligation");
    expect(keys).toContain("school-project-share");
    expect(keys).toContain("neighborhood-meeting-notice");
    expect(keys.length).toBeGreaterThanOrEqual(5);
  });
});

describe("A conversation remembers where it got to", () => {
  it("does not reopen a settled obligation after a reload", () => {
    const { world, personId } = household("reload");
    let after = say(world, personId, "raise-obligation");
    after = say(after, personId, "ask-to-share");

    expect(conversationSettled(after, personId, "household-obligation")).toBe(
      true,
    );

    // The whole point: the world is the record, so a round trip through the
    // save changes nothing about where the conversation stands.
    const reloaded = deserializeWorld(serializeWorld(after));
    const progress = conversationProgressFromHistory(
      reloaded,
      personId,
      "household-obligation",
    )!;
    expect(progress.phase).toBe("settled");
    expect(
      conversationSettled(reloaded, personId, "household-obligation"),
    ).toBe(true);

    const room = householdConversationRoom(reloaded, personId)!;
    // And nothing is offered again, so the player is not asked to settle it
    // twice.
    expect(
      availableConversationIntents(
        reloaded,
        room,
        room.eligibleAddresseePersonIds[0]!,
        progress,
      ),
    ).toEqual([]);
  });

  it("counts the turn from the record rather than a counter", () => {
    const { world, personId } = household("turns");
    expect(
      recordedConversationIntents(world, personId, "household-obligation"),
    ).toEqual([]);

    const after = say(world, personId, "raise-obligation");
    expect(
      recordedConversationIntents(after, personId, "household-obligation"),
    ).toEqual(["raise-obligation"]);

    const reloaded = deserializeWorld(serializeWorld(after));
    expect(
      recordedConversationIntents(reloaded, personId, "household-obligation"),
    ).toEqual(["raise-obligation"]);
  });
});

describe("Saying the same thing more than one way", () => {
  it("is deterministic for one world and context", () => {
    const { world } = household("variation");
    const bank = ["one", "two", "three"] as const;
    const first = selectAuthoredVariant(world, "context-a", bank);
    expect(selectAuthoredVariant(world, "context-a", bank)).toBe(first);
  });

  it("does not give every person in the world the same line", () => {
    const { world } = household("variation");
    const bank = ["one", "two", "three", "four", "five", "six"] as const;
    const drawn = new Set(
      Array.from({ length: 12 }, (_, index) =>
        selectAuthoredVariant(world, `person-${index}`, bank),
      ),
    );
    // Not a claim that twelve contexts must use all six lines — only that one
    // literal line is not handed to everybody.
    expect(drawn.size).toBeGreaterThan(1);
  });

  it("refuses an empty bank rather than picking nothing", () => {
    const { world } = household("variation");
    expect(() => selectAuthoredVariant(world, "empty", [])).toThrow(
      /cannot be empty/i,
    );
  });
});
