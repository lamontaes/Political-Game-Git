import { describe, expect, it } from "vitest";

import { householdMembershipsAt } from "../simulation";
import {
  conversationCommitContract,
  conversationSubjectKeys,
  selectAuthoredVariant,
  shortPersonName,
} from "./conversation-subjects";
import { createNewGameWorld } from "./new-game";
import { openNextLifeScene } from "./life-scene-flow";
import { householdConversationRoom, openOrdinaryLife } from "./ordinary-life";
import { RUN_B_CONVERSATION_INTENTS } from "./run-b-conversation";
import {
  createNeighborhoodMeetingProgress,
  createSchoolProjectProgress,
  createRunBConversationProgress,
} from "./run-b-conversation-progress";

/**
 * What a conversation writes down, and whether it remembers it.
 *
 * Each live subject writes its own canonical vocabulary and records its
 * progress so a save can resume the same conversation.
 */

function household(seed: string) {
  const game = createNewGameWorld({
    // A custom start honors the explicit household. On a normal start (Task E)
    // who is at home is generated from the seed. This fixture needs a peer
    // for the room and name assertions below.
    startKind: "custom",
    placeKey: "kentucky",
    startAge: 34,
    depth: "summarize-earlier-life",
    startingLife: "ordinary-life",
    household: "shares-a-home",
    seed,
    givenName: null,
    familyName: null,
  });
  const world = openNextLifeScene(
    openOrdinaryLife(game.world, game.playerPersonId),
    game.playerPersonId,
  );
  const room = householdConversationRoom(world, game.playerPersonId)!;
  return { world, personId: game.playerPersonId, room };
}

describe("A conversation writes down what it was actually about", () => {
  it("gives every subject its own canonical vocabulary", () => {
    const contracts = [
      createRunBConversationProgress(),
      createSchoolProjectProgress({
        work: "The authored fixture worksheet",
        deadline: "The recorded fixture due date",
      }),
      createNeighborhoodMeetingProgress(),
    ].map(conversationCommitContract);

    const subjectTags = new Set(contracts.map((c) => c.subjectTag));
    expect(subjectTags.size).toBe(contracts.length);
    for (const contract of contracts) {
      expect(contract.setting).not.toMatch(/synthetic|fixture|stage-6/i);
    }
  });

  it("refuses to describe an intent its subject does not offer", () => {
    const contract = conversationCommitContract(
      createSchoolProjectProgress({
        work: "The authored fixture worksheet",
        deadline: "The recorded fixture due date",
      }),
    );
    // Better a loud refusal than a sentence about somebody listening.
    expect(() =>
      contract.choice("discuss-provision", {
        addresseeName: "Someone",
        named: () => "Someone",
      }),
    ).toThrow(/no record of what/i);
  });

  it("gives every subject its own account of every intent it offers", () => {
    const context = { addresseeName: "Ada", named: () => "Ada" };
    const written = new Set<string>();
    for (const progress of [
      createRunBConversationProgress(),
      createSchoolProjectProgress({
        work: "The authored fixture worksheet",
        deadline: "The recorded fixture due date",
      }),
      createNeighborhoodMeetingProgress(),
    ]) {
      const contract = conversationCommitContract(progress);
      for (const intent of RUN_B_CONVERSATION_INTENTS) {
        let sentence: string;
        try {
          sentence = contract.choice(intent, context);
        } catch {
          continue; // Not this subject's intent, which is the correct answer.
        }
        expect(sentence.trim().length).toBeGreaterThan(0);
        // Two subjects describing different actions with one sentence is how
        // the universal writer went unnoticed for so long.
        if (intent !== "listen") {
          expect(written.has(sentence)).toBe(false);
          written.add(sentence);
        }
      }
    }
    expect(written.size).toBeGreaterThanOrEqual(7);
  });

  it("carries distinct subject families through one engine", () => {
    const keys = conversationSubjectKeys();
    expect(keys).toContain("shared-intake-checklist");
    expect(keys).toContain("school-project-share");
    expect(keys).toContain("neighborhood-meeting-notice");
    expect(keys.length).toBeGreaterThanOrEqual(3);
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

describe("Who is actually in the next room", () => {
  it("talks to somebody the character lives with, not the nearest person", () => {
    const { world, personId, room } = household("co-resident");
    const other = room.eligibleAddresseePersonIds[0]!;

    const cutoff = {
      asOfDate: world.currentDate,
      historySequenceExclusive: world.history.nextSequence,
    };
    const mine = new Set(
      householdMembershipsAt(world, personId, cutoff).map(
        (entry) => entry.membership.householdId,
      ),
    );
    const theirs = householdMembershipsAt(world, other, cutoff).map(
      (entry) => entry.membership.householdId,
    );
    // A forty-one-year-old was holding a conversation "at home" with the
    // parent from their own summarized childhood, a household they had
    // already moved out of.
    expect(theirs.some((id) => mine.has(id))).toBe(true);
  });

  it("does not offer a household conversation to somebody who lives alone", () => {
    const game = createNewGameWorld({
      placeKey: "kentucky",
      startAge: 34,
      depth: "summarize-earlier-life",
      startingLife: "ordinary-life",
      household: "lives-alone",
      seed: "alone",
      givenName: null,
      familyName: null,
    });
    const world = openOrdinaryLife(game.world, game.playerPersonId);
    // Nobody to talk to is the honest answer, and better than putting somebody
    // who moved out decades ago in the next room.
    expect(householdConversationRoom(world, game.playerPersonId)).toBeNull();
  });

  it("does not make the player address somebody by their own surname", () => {
    const { world, room } = household("naming");
    const other = room.eligibleAddresseePersonIds[0]!;
    const player =
      world.people[
        world.control.kind === "person" ? world.control.personId : ""
      ]!;
    const shortName = shortPersonName(world, other);

    if (world.people[other]!.familyName === player.familyName) {
      // Sharing a surname is normal in a household; being called by it is how
      // the player ended up appearing to talk to themselves.
      expect(shortName).toBe(world.people[other]!.givenName);
      expect(shortName).not.toBe(player.familyName);
    }
  });
});
