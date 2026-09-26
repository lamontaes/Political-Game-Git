import { describe, expect, it } from "vitest";

import {
  activeChildAuthoritiesAt,
  recordWorldEvent,
  type EntityId,
} from "../simulation";
import { publishPublicEvent } from "../simulation/public-information";
import { projectLifeConversation } from "./life-conversation";
import { createNewGameWorld, type NewGameSetup } from "./new-game";
import { projectNewsFrontPage } from "./news-front-page";
import { readNewsStory } from "./news-reading";

function publishedMeeting() {
  const game = createNewGameWorld({
    startKind: "custom",
    placeKey: "kentucky",
    startAge: 10,
    depth: "play-formative-years",
    startingLife: "ordinary-life",
    household: "shares-a-home",
    seed: "news-reading-conversation",
    givenName: null,
    familyName: null,
    questionnaire: "skipped",
    priors: [],
  } as NewGameSetup);
  const playerPersonId = game.playerPersonId;
  const guardian = activeChildAuthoritiesAt(game.world, playerPersonId).find(
    (entry) => entry.authority.holder.kind === "person",
  )!.authority.holder as { kind: "person"; personId: EntityId };
  const outsider = game.world.personOrder.find(
    (id) => id !== playerPersonId && id !== guardian.personId,
  )!;
  let world = recordWorldEvent(game.world, {
    stableKey: "news-read-meeting",
    type: "community.meeting",
    occurredAt: game.world.currentDate,
    recordedAt: game.world.currentDate,
    jurisdictionId: game.world.people[outsider]!.homeJurisdictionId,
    involvedEntityIds: [outsider],
    participants: [{ personId: outsider, role: "agency:actor", detail: null }],
    personFactConstraints: [],
    visibility: "public",
    tags: [],
    summary: "The council met about library hours.",
    context: {
      location: null,
      socialContext: null,
      pressure: null,
      choice: null,
      motivation: null,
      immediateReaction: null,
    },
  });
  world = publishPublicEvent(world, {
    stableKey: "news-read-publication",
    sourceEventId: world.history.events.at(-1)!.id,
  });
  return { world, playerPersonId, guardianPersonId: guardian.personId };
}

describe("opening a news story", () => {
  it("records a read without passing time or treating the report as verified", () => {
    const fixture = publishedMeeting();
    const story = projectNewsFrontPage(fixture.world, "front", null).lead!;
    expect(
      projectLifeConversation(
        fixture.world,
        fixture.playerPersonId,
        fixture.guardianPersonId,
      )!.matter,
    ).toBeNull();
    const read = readNewsStory(fixture.world, fixture.playerPersonId, story.id);
    expect(read.currentMoment).toEqual(fixture.world.currentMoment);
    expect(read.history.knowledge.at(-1)).toMatchObject({
      personId: fixture.playerPersonId,
      eventId: story.sourceEventId,
      accuracy: "unknown",
      source: {
        kind: "media",
        outlet: story.outletName,
        reference: story.id,
      },
    });
    expect(
      projectLifeConversation(
        read,
        fixture.playerPersonId,
        fixture.guardianPersonId,
      )!.matter?.eventId,
    ).toBe(story.sourceEventId);
    expect(readNewsStory(read, fixture.playerPersonId, story.id)).toBe(read);
  });
});
