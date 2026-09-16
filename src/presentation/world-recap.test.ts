import { describe, expect, it } from "vitest";

import {
  recordEventKnowledge,
  recordWorldEvent,
  serializeWorld,
  type EntityId,
  type EventParticipantRole,
  type EventVisibility,
  type World,
} from "../simulation";
import { publishPublicEvent } from "../simulation/public-information";
import { DEFAULT_NEW_GAME_SETUP } from "./new-game";
import { generateOpeningLife, prepareOpeningLife } from "./opening-life";
import { projectWorldRecap } from "./world-recap";

function opening(seed: string) {
  return generateOpeningLife(
    prepareOpeningLife({
      ...DEFAULT_NEW_GAME_SETUP,
      seed,
      startAge: 34,
      givenName: "Maya",
      familyName: "Reed",
    }),
  ).game!;
}

function otherPerson(world: World, playerPersonId: EntityId): EntityId {
  return Object.keys(world.people).find(
    (id) => id !== playerPersonId,
  )! as EntityId;
}

function happen(
  world: World,
  personId: EntityId,
  key: string,
  summary: string,
  visibility: EventVisibility,
  role: EventParticipantRole = "agency:actor",
): World {
  return recordWorldEvent(world, {
    stableKey: key,
    type: "community.meeting",
    occurredAt: world.currentDate,
    recordedAt: world.currentDate,
    jurisdictionId: world.people[personId]!.homeJurisdictionId,
    involvedEntityIds: [personId],
    participants: [{ personId, role, detail: null }],
    personFactConstraints: [],
    visibility,
    tags: ["choice.attend"],
    summary,
    context: {
      location: null,
      socialContext: null,
      pressure: null,
      choice: null,
      motivation: null,
      immediateReaction: null,
    },
  });
}

describe("meaningful-change recap", () => {
  it("is quiet when nothing changed after the frontier", () => {
    const { world, playerPersonId } = opening("recap-quiet");
    expect(
      projectWorldRecap(world, playerPersonId, world.history.nextSequence),
    ).toBeNull();
  });

  it("lists a published matter once, even when the player also learned of it", () => {
    const { world, playerPersonId } = opening("recap-news");
    const frontier = world.history.nextSequence;
    const neighbor = otherPerson(world, playerPersonId);
    const acted = happen(
      world,
      neighbor,
      "council-meeting",
      "The council met about the library hours.",
      "public",
    );
    const source = acted.history.events.at(-1)!;
    const published = publishPublicEvent(acted, {
      stableKey: "council-report",
      sourceEventId: source.id,
    });
    const learned = recordEventKnowledge(published, {
      stableKey: "read-council-report",
      personId: playerPersonId,
      eventId: source.id,
      learnedAt: published.currentDate,
      believedSummary: "The council met about the library.",
      accuracy: "accurate",
      confidence: "high",
      source: { kind: "media", outlet: "Civic Record", reference: null },
    });
    const recap = projectWorldRecap(learned, playerPersonId, frontier)!;
    expect(recap.entries).toHaveLength(1);
    expect(recap.entries[0]).toMatchObject({
      eventId: source.id,
      inNews: true,
      headline: published.history.publications!.find(
        (publication) => publication.sourceEventId === source.id,
      )!.headline,
    });
    expect(recap.throughSequence).toBe(learned.history.nextSequence);
  });

  it("does not present public availability as something the player learned", () => {
    const { world, playerPersonId } = opening("recap-unlearned");
    const frontier = world.history.nextSequence;
    const acted = happen(
      world,
      otherPerson(world, playerPersonId),
      "unpublished-public",
      "A neighborhood group met at the park.",
      "public",
    );
    expect(projectWorldRecap(acted, playerPersonId, frontier)).toBeNull();
  });

  it("keeps a secondhand account attributed and never states the private truth", () => {
    const { world, playerPersonId } = opening("recap-rumor");
    const frontier = world.history.nextSequence;
    const teller = otherPerson(world, playerPersonId);
    const hidden = happen(
      world,
      teller,
      "private-discussion",
      "The committee privately discussed closing the branch office.",
      "private",
    );
    const source = hidden.history.events.at(-1)!;
    const told = recordEventKnowledge(hidden, {
      stableKey: "heard-branch",
      personId: playerPersonId,
      eventId: source.id,
      learnedAt: hidden.currentDate,
      believedSummary: "The branch office might close.",
      accuracy: "partial",
      confidence: "low",
      source: { kind: "rumor", sourcePersonId: teller, chainDescription: null },
    });
    const recap = projectWorldRecap(told, playerPersonId, frontier)!;
    expect(recap.entries).toHaveLength(1);
    expect(recap.entries[0]!.headline).toBe("The branch office might close.");
    expect(recap.entries[0]!.attribution).toMatch(/^Secondhand, from /);
    expect(JSON.stringify(recap)).not.toContain(source.summary);
  });

  it("leaves out what somebody else learned and the player's own doings", () => {
    const { world, playerPersonId } = opening("recap-privacy");
    const frontier = world.history.nextSequence;
    const neighbor = otherPerson(world, playerPersonId);
    const theirs = happen(
      world,
      neighbor,
      "their-matter",
      "A zoning notice was posted.",
      "limited",
    );
    const theirEvent = theirs.history.events.at(-1)!;
    const onlyNeighborKnows = recordEventKnowledge(theirs, {
      stableKey: "neighbor-knows",
      personId: neighbor,
      eventId: theirEvent.id,
      learnedAt: theirs.currentDate,
      believedSummary: "A zoning notice was posted.",
      accuracy: "accurate",
      confidence: "high",
      source: { kind: "direct" },
    });
    const own = happen(
      onlyNeighborKnows,
      playerPersonId,
      "own-attendance",
      "Maya Reed attended the meeting.",
      "public",
    );
    const ownEvent = own.history.events.at(-1)!;
    const knowsOwn = recordEventKnowledge(own, {
      stableKey: "own-knows",
      personId: playerPersonId,
      eventId: ownEvent.id,
      learnedAt: own.currentDate,
      believedSummary: "You attended the meeting.",
      accuracy: "accurate",
      confidence: "high",
      source: { kind: "direct" },
    });
    expect(projectWorldRecap(knowsOwn, playerPersonId, frontier)).toBeNull();
  });

  it("respects the frontier and is a pure read", () => {
    const { world, playerPersonId } = opening("recap-frontier");
    // The opening already has public matters; start after them.
    const frontier = world.history.nextSequence;
    const acted = happen(
      world,
      otherPerson(world, playerPersonId),
      "old-report-source",
      "The school board met.",
      "public",
    );
    const published = publishPublicEvent(acted, {
      stableKey: "old-report",
      sourceEventId: acted.history.events.at(-1)!.id,
    });
    const before = serializeWorld(published);
    const early = projectWorldRecap(published, playerPersonId, frontier);
    expect(early?.entries).toHaveLength(1);
    expect(
      projectWorldRecap(
        published,
        playerPersonId,
        published.history.nextSequence,
      ),
    ).toBeNull();
    expect(projectWorldRecap(published, playerPersonId, frontier)).toEqual(
      early,
    );
    expect(serializeWorld(published)).toBe(before);
  });

  it("bounds what it shows and counts the rest", () => {
    let { world } = opening("recap-bound");
    const { playerPersonId } = opening("recap-bound");
    const frontier = world.history.nextSequence;
    const neighbor = otherPerson(world, playerPersonId);
    for (let index = 0; index < 5; index += 1) {
      world = happen(
        world,
        neighbor,
        `bound-${index}`,
        `Public meeting ${index}.`,
        "public",
      );
      world = publishPublicEvent(world, {
        stableKey: `bound-report-${index}`,
        sourceEventId: world.history.events.at(-1)!.id,
      });
    }
    const recap = projectWorldRecap(world, playerPersonId, frontier)!;
    expect(recap.entries).toHaveLength(3);
    expect(recap.more).toBe(2);
  });
});
