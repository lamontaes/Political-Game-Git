import { describe, expect, it } from "vitest";

import { createNewGameWorld } from "./new-game";
import type { NewGameSetup } from "./new-game";
import { openConversationWith } from "./person-conversation-entry";
import {
  availablePlayerConversations,
  projectPlayerConversation,
} from "./player-conversation";
import { commitConversationTurn } from "./run-b-conversation";
import { openNextLifeScene, currentOpeningLifeScene } from "./life-scene-flow";
import { projectLifeConversation } from "./life-conversation";
import {
  activeChildAuthoritiesAt,
  assertWorldIntegrity,
  deserializeWorld,
  personName,
  serializeWorld,
} from "../simulation";
import type { EntityId } from "../simulation";

function childInScene(seed = "guardian12-child") {
  const game = createNewGameWorld({
    startKind: "custom",
    placeKey: "kentucky",
    startAge: 10,
    depth: "play-formative-years",
    startingLife: "ordinary-life",
    household: "shares-a-home",
    seed,
    givenName: null,
    familyName: null,
    questionnaire: "skipped",
    priors: [],
  } as NewGameSetup);
  const world = openNextLifeScene(game.world, game.playerPersonId);
  return { world, playerPersonId: game.playerPersonId };
}

function guardianId(world: ReturnType<typeof childInScene>["world"], playerPersonId: EntityId) {
  const authority = activeChildAuthoritiesAt(world, playerPersonId).find(
    (entry) => entry.authority.holder.kind === "person",
  );
  return authority?.authority.holder.kind === "person"
    ? authority.authority.holder.personId
    : null;
}

describe("GUARDIAN12 — guardian and known-person conversation entry", () => {
  it("wires the selected guardian through person-conversation-entry", () => {
    const { world, playerPersonId } = childInScene();
    const id = guardianId(world, playerPersonId)!;
    expect(id).toBeTruthy();
    expect(currentOpeningLifeScene(world, playerPersonId)!.presentPersonIds).toContain(
      id,
    );

    const entry = openConversationWith(world, playerPersonId, id!);
    expect(entry.kind).toBe("available");
    if (entry.kind !== "available") return;
    expect(entry.subject).toBe("life-talk");
    expect(entry.addressee).toBe(id);
  });

  it("offers meaningful choices and records follow-through for the chosen addressee", () => {
    const { world, playerPersonId } = childInScene("guardian12-talk");
    const id = guardianId(world, playerPersonId)!;
    const view = projectPlayerConversation(world, playerPersonId, "life-talk", {
      addressee: id!,
    })!;
    expect(view.addressee).toBe(id);
    expect(view.intents.some((option) => option.key === "greet")).toBe(true);

    const result = commitConversationTurn(world, {
      session: view.session,
      room: view.room,
      progress: view.progress,
      turnOrdinal: view.turnOrdinal,
      addressee: id!,
      audibility: "normal",
      intent: "greet",
    });
    assertWorldIntegrity(result.world);
    const event = result.world.history.events.at(-1)!;
    expect(event.type).toBe("life.conversation");
    expect(
      event.participants.find(
        (participant) => participant.role === "coordination:counterpart",
      )?.personId,
    ).toBe(id);
    expect(event.context.immediateReaction).toBeTruthy();
  });

  it("does not double-commit on read-only projection", () => {
    const { world, playerPersonId } = childInScene("guardian12-read");
    const id = guardianId(world, playerPersonId)!;
    const before = serializeWorld(world);
    projectPlayerConversation(world, playerPersonId, "life-talk", {
      addressee: id!,
    });
    projectLifeConversation(world, playerPersonId, id!);
    expect(serializeWorld(world)).toBe(before);
  });

  it("preserves cast and outcomes across save and reload", () => {
    const { world, playerPersonId } = childInScene("guardian12-save");
    const id = guardianId(world, playerPersonId)!;
    const view = projectPlayerConversation(world, playerPersonId, "life-talk", {
      addressee: id!,
    })!;
    const after = commitConversationTurn(world, {
      session: view.session,
      room: view.room,
      progress: view.progress,
      turnOrdinal: view.turnOrdinal,
      addressee: id!,
      audibility: "normal",
      intent: "share",
    }).world;
    const saved = serializeWorld(after);
    const restored = deserializeWorld(saved);
    const resumed = projectLifeConversation(restored, playerPersonId, id!)!;
    expect(resumed.transcript.length).toBeGreaterThan(0);
    expect(openConversationWith(restored, playerPersonId, id!).kind).toBe(
      "available",
    );
  });

  it("names truthful refusals when the guardian is not in the current scene", () => {
    const game = createNewGameWorld({
      startKind: "custom",
      placeKey: "kentucky",
      startAge: 10,
      depth: "play-formative-years",
      startingLife: "ordinary-life",
      household: "shares-a-home",
      seed: "guardian12-absent",
      givenName: null,
      familyName: null,
      questionnaire: "skipped",
      priors: [],
    } as NewGameSetup);
    const id = guardianId(game.world, game.playerPersonId)!;
    const entry = openConversationWith(game.world, game.playerPersonId, id!);
    expect(entry.kind).toBe("unavailable");
    if (entry.kind !== "unavailable") return;
    expect(entry.reason).toMatch(/not in this scene/i);
  });

  it("supports an adult known person in the same opening-life scene", () => {
    const game = createNewGameWorld({
      startKind: "custom",
      placeKey: "kentucky",
      startAge: 24,
      depth: "play-formative-years",
      startingLife: "ordinary-life",
      household: "shares-a-home",
      seed: "guardian12-adult",
      givenName: null,
      familyName: null,
      questionnaire: "skipped",
      priors: [],
    } as NewGameSetup);
    const world = openNextLifeScene(game.world, game.playerPersonId);
    const scene = currentOpeningLifeScene(world, game.playerPersonId)!;
    const other = scene.presentPersonIds.find((id) => id !== game.playerPersonId)!;
    const entry = openConversationWith(world, game.playerPersonId, other);
    expect(entry.kind).toBe("available");
    if (entry.kind !== "available") return;
    expect(entry.subject).toBe("life-talk");
    expect(entry.addressee).toBe(other);
    expect(
      projectPlayerConversation(world, game.playerPersonId, "life-talk", {
        addressee: other,
      })!.intents.some((option) => option.key === "date"),
    ).toBe(true);
  });

  it("regresses the original household-member gate failure at age 10", () => {
    const { world, playerPersonId } = childInScene("person-journey-10");
    const guardian = guardianId(world, playerPersonId)!;
    const name = personName(world.people[guardian!]!);
    const entry = openConversationWith(world, playerPersonId, guardian!);
    expect(entry.kind).toBe("available");
    expect(
      availablePlayerConversations(world, playerPersonId).some(
        (conversation) => conversation.subject === "life-talk",
      ),
    ).toBe(true);
    const refused = openConversationWith(world, playerPersonId, guardian!);
    if (refused.kind === "unavailable") {
      expect(refused.reason).not.toContain(
        `There is no conversation established with ${name} here yet.`,
      );
    }
  });
});
