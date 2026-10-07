import { describe, expect, it } from "vitest";
import "./player-conversation";
import { createRunBFixture } from "./run-b-fixture";
import { createRunBConversationProgress } from "./run-b-conversation-progress";
import {
  commitConversationTurn,
  createConversationSessionDescriptor,
} from "./run-b-conversation";
import { projectPersonDossier } from "./person-dossier";
import { relationshipHistory } from "../simulation/queries";
import { readRelationshipStanding } from "../simulation/relationship-standing";
import {
  assertWorldIntegrity,
  deserializeWorld,
  serializeWorld,
} from "../simulation";
import { recordSpokenExchange } from "./spoken-exchange";

describe("an exchanged line enters the relationship record", () => {
  it("moves a previously unspoken person's dossier and remembers repeat room exchanges without awarding affection", () => {
    const fixture = createRunBFixture();
    const playerId = fixture.playerPersonId;
    const counterpart = fixture.scenePeople.find(
      (person) =>
        relationshipHistory(fixture.world, playerId, person.personId).length ===
        0,
    )!;
    expect(counterpart).toBeTruthy();
    const personId = counterpart.personId;
    expect(
      projectPersonDossier(fixture.world, playerId, personId).lastInteraction,
    ).toBe("You haven't spoken.");
    const bystander = fixture.scenePeople.find(
      (person) => person.personId !== personId,
    )!.personId;
    const bystanderHistory = relationshipHistory(
      fixture.world,
      playerId,
      bystander,
    );
    const before = readRelationshipStanding(
      fixture.world,
      playerId,
      personId,
    ).readings;
    const session = createConversationSessionDescriptor(
      fixture.world,
      fixture.roomContext,
    );
    const progress = createRunBConversationProgress();
    const first = commitConversationTurn(fixture.world, {
      session,
      room: fixture.roomContext,
      progress,
      turnOrdinal: 1,
      addressee: personId,
      audibility: "normal",
      intent: "request-commitment",
    });
    expect(first.presentation.beat).not.toBeNull();
    expect(relationshipHistory(first.world, playerId, bystander)).toEqual(
      bystanderHistory,
    );

    expect(
      projectPersonDossier(first.world, playerId, personId).lastInteraction,
    ).not.toBe("You haven't spoken.");
    const second = commitConversationTurn(first.world, {
      session,
      room: fixture.roomContext,
      progress: first.progress,
      turnOrdinal: 2,
      addressee: personId,
      audibility: "normal",
      intent: "request-commitment",
    });
    const contacts = relationshipHistory(second.world, playerId, personId);
    expect(contacts).toHaveLength(1);
    expect(contacts[0]!.kind).toBe("contact:conversation");
    expect(contacts[0]!.change).toBe("maintained");
    expect(
      readRelationshipStanding(second.world, playerId, personId).readings,
    ).toEqual(before);
    const saved = deserializeWorld(serializeWorld(second.world));
    expect(
      projectPersonDossier(saved, playerId, personId).lastInteraction,
    ).toEqual(
      projectPersonDossier(second.world, playerId, personId).lastInteraction,
    );
    expect(relationshipHistory(saved, playerId, personId)).toEqual(contacts);
    assertWorldIntegrity(saved);
    // Conduct, not repeating the greeting, can change where the people stand.
    const helped = commitConversationTurn(second.world, {
      session,
      room: fixture.roomContext,
      progress: second.progress,
      turnOrdinal: 3,
      addressee: personId,
      audibility: "normal",
      intent: "reassure",
    });
    const conduct = relationshipHistory(helped.world, playerId, personId).at(
      -1,
    )!;
    expect(conduct.kind).toBe("work:reassurance");
    expect(conduct.change).toBe("strengthened");
    expect(
      readRelationshipStanding(helped.world, playerId, personId).readings.trust
        .basis,
    ).toContain(conduct.id);
    expect(
      relationshipHistory(helped.world, playerId, personId).filter(
        (entry) => entry.kind === "contact:conversation",
      ),
    ).toHaveLength(1);
  });

  it("records a directly heard invitation reply as contact through the existing claim and knowledge writer", () => {
    const fixture = createRunBFixture();
    const speaker = fixture.playerPersonId;
    const recipient = fixture.scenePeople[0].personId;
    const event = fixture.world.history.events.find(
      (entry) =>
        entry.involvedEntityIds.includes(speaker) &&
        entry.involvedEntityIds.includes(recipient),
    )!;
    const prior = relationshipHistory(fixture.world, speaker, recipient).length;
    const next = recordSpokenExchange(fixture.world, {
      stableKey: "test:invitation-answer",
      eventId: event.id,
      speakerPersonId: speaker,
      recipientPersonIds: [recipient],
      statement: "Yes, I'll come.",
      audience: "private",
      relationshipToTruth: "unknown",
    });
    expect(relationshipHistory(next, speaker, recipient)).toHaveLength(
      prior + 1,
    );
    expect(
      next.history.knowledge.some(
        (record) =>
          record.personId === recipient &&
          record.eventId === event.id &&
          record.source.kind === "told-by",
      ),
    ).toBe(true);
    expect(next.history.claims.at(-1)!.statement).toBe("Yes, I'll come.");
    assertWorldIntegrity(next);
    const replied = recordSpokenExchange(next, {
      stableKey: "test:host-reply",
      eventId: event.id,
      speakerPersonId: recipient,
      recipientPersonIds: [speaker],
      statement: "Thank you.",
      audience: "private",
      relationshipToTruth: "unknown",
    });
    expect(relationshipHistory(replied, speaker, recipient)).toHaveLength(
      prior + 1,
    );
  });
});
