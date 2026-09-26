import { describe, expect, it } from "vitest";

import {
  assertWorldIntegrity,
  deserializeWorld,
  recordEventKnowledge,
  recordWorldEvent,
  serializeWorld,
  type EntityId,
  type World,
} from "../simulation";
import { activeOrdinaryGoal } from "../simulation/life-personality";
import { publishPublicEvent } from "../simulation/public-information";
import { matterAwareness } from "./current-matters";
import { playerUtteranceOf } from "./conversation-utterance";
import { conversationExchangeTurns } from "./scene-conversation";
import {
  MATTER_CHOICE_PREFIX,
  commitLifeConversation,
  projectLifeConversation,
} from "./life-conversation";
import { createNewGameWorld } from "./new-game";
import { resolveOpeningPlaySceneContext } from "./play-scene-context";

const setup = {
  startKind: "custom",
  seed: "matter-talk",
  placeKey: "lexington-fayette",
  startAge: 6,
  depth: "play-formative-years",
  startingLife: "ordinary-life",
  household: "shares-a-home",
  givenName: "Audience",
  familyName: "Review",
  gender: "male",
  pronouns: "he-him",
  questionnaire: "skipped",
  appearanceCatalogGeneration: 10,
  appearanceRecipeVersion: "appearance-recipe-v2",
  appearanceOutfitVersion: "complete-outfit-v2",
} as const;

function household(seed: string = setup.seed) {
  const { world, playerPersonId } = createNewGameWorld({ ...setup, seed });
  const scene = resolveOpeningPlaySceneContext(world, playerPersonId);
  const parent =
    scene.presentPeople.find((person) =>
      ["your mom", "your dad", "your parent", "your guardian"].includes(
        person.relationship ?? "",
      ),
    ) ?? scene.presentPeople[0]!;
  const outsider = world.personOrder.find(
    (id) =>
      id !== playerPersonId &&
      !scene.presentPeople.some((person) => person.personId === id),
  )!;
  return { world, playerPersonId, parentId: parent.personId, outsider };
}

/** A published public meeting the player read about. */
function publishedMatter(
  world: World,
  playerPersonId: EntityId,
  outsider: EntityId,
): { world: World; eventId: EntityId } {
  let next = recordWorldEvent(world, {
    stableKey: "matter-meeting",
    type: "community.meeting",
    occurredAt: world.currentDate,
    recordedAt: world.currentDate,
    jurisdictionId: world.people[outsider]!.homeJurisdictionId,
    involvedEntityIds: [outsider],
    participants: [{ personId: outsider, role: "agency:actor", detail: null }],
    personFactConstraints: [],
    visibility: "public",
    tags: ["choice.attend"],
    summary: "The council met about the library hours.",
    context: {
      location: null,
      socialContext: null,
      pressure: null,
      choice: null,
      motivation: null,
      immediateReaction: null,
    },
  });
  const eventId = next.history.events.at(-1)!.id;
  next = publishPublicEvent(next, {
    stableKey: "matter-report",
    sourceEventId: eventId,
  });
  next = recordEventKnowledge(next, {
    stableKey: "player-read-matter",
    personId: playerPersonId,
    eventId,
    learnedAt: next.currentDate,
    believedSummary: "The council met about the library hours.",
    accuracy: "accurate",
    confidence: "high",
    source: { kind: "media", outlet: "Civic Record", reference: null },
  });
  return { world: next, eventId };
}

function say(
  world: World,
  playerPersonId: EntityId,
  personId: EntityId,
  intent: "matter" | "tellMatter" | "remember",
): World {
  const view = projectLifeConversation(world, playerPersonId, personId)!;
  return commitLifeConversation(world, {
    playerPersonId,
    personId,
    intent,
    revision: view.revision,
  });
}

describe("current matters in ordinary talk", () => {
  it("offers no matter when the player has nothing public or known to raise", () => {
    const { world, playerPersonId, parentId } = household();
    const view = projectLifeConversation(world, playerPersonId, parentId)!;
    expect(view.intents.map((intent) => intent.key)).not.toContain("matter");
  });

  it("does not turn an unread publication into the player's knowledge", () => {
    const base = household("matter-unread-publication");
    let world = recordWorldEvent(base.world, {
      stableKey: "unread-council-meeting",
      type: "community.meeting",
      occurredAt: base.world.currentDate,
      recordedAt: base.world.currentDate,
      jurisdictionId: base.world.people[base.outsider]!.homeJurisdictionId,
      involvedEntityIds: [base.outsider],
      participants: [
        { personId: base.outsider, role: "agency:actor", detail: null },
      ],
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
      stableKey: "unread-council-publication",
      sourceEventId: world.history.events.at(-1)!.id,
    });
    expect(
      projectLifeConversation(
        world,
        base.playerPersonId,
        base.parentId,
      )!.intents.map((option) => option.key),
    ).not.toContain("matter");
  });

  it("keeps a read matter available when a newer unread story appears", () => {
    const base = household("matter-read-before-unread");
    const known = publishedMatter(
      base.world,
      base.playerPersonId,
      base.outsider,
    );
    let world = recordWorldEvent(known.world, {
      stableKey: "later-unread-council-meeting",
      type: "community.meeting",
      occurredAt: known.world.currentDate,
      recordedAt: known.world.currentDate,
      jurisdictionId: known.world.people[base.outsider]!.homeJurisdictionId,
      involvedEntityIds: [base.outsider],
      participants: [
        { personId: base.outsider, role: "agency:actor", detail: null },
      ],
      personFactConstraints: [],
      visibility: "public",
      tags: [],
      summary: "The council met about park hours.",
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
      stableKey: "later-unread-council-publication",
      sourceEventId: world.history.events.at(-1)!.id,
    });
    const view = projectLifeConversation(
      world,
      base.playerPersonId,
      base.parentId,
    )!;
    expect(view.matter?.eventId).toBe(known.eventId);
  });

  it("asks about a known governor death using a saved title and preserves the selected words", () => {
    const base = household("matter-governor-death");
    const governor = base.world.people[base.outsider]!;
    let world = recordWorldEvent(base.world, {
      stableKey: "governor-public-tenure",
      type: "world.office-tenure",
      occurredAt: base.world.currentDate,
      recordedAt: base.world.currentDate,
      jurisdictionId: governor.homeJurisdictionId,
      involvedEntityIds: [governor.id],
      participants: [
        {
          personId: governor.id,
          role: "focus:subject",
          detail: "Governor of Kentucky",
        },
      ],
      personFactConstraints: [],
      visibility: "public",
      tags: ["office:governor"],
      summary: `${governor.givenName} ${governor.familyName} is governor of Kentucky.`,
      context: {
        location: null,
        socialContext: null,
        pressure: null,
        choice: null,
        motivation: null,
        immediateReaction: null,
      },
    });
    world = recordWorldEvent(world, {
      stableKey: "governor-death-report",
      type: "crisis.officeholder-died",
      occurredAt: world.currentDate,
      recordedAt: world.currentDate,
      jurisdictionId: governor.homeJurisdictionId,
      involvedEntityIds: [governor.id],
      participants: [
        {
          personId: governor.id,
          role: "focus:officeholder",
          detail: "us-ky-governor",
        },
      ],
      personFactConstraints: [],
      visibility: "public",
      tags: ["continuity:death", "office:us-ky-governor"],
      summary: `Governor ${governor.familyName} died.`,
      context: {
        location: null,
        socialContext: null,
        pressure: null,
        choice: null,
        motivation: null,
        immediateReaction: null,
      },
    });
    const deathEventId = world.history.events.at(-1)!.id;
    world = recordEventKnowledge(world, {
      stableKey: "child-read-governor-death",
      personId: base.playerPersonId,
      eventId: deathEventId,
      learnedAt: world.currentDate,
      believedSummary: `Governor ${governor.familyName} died.`,
      accuracy: "accurate",
      confidence: "high",
      source: { kind: "media", outlet: "Civic Record", reference: null },
    });
    const view = projectLifeConversation(
      world,
      base.playerPersonId,
      base.parentId,
    )!;
    expect(
      view.intents.find((option) => option.key === "matter")?.spokenWords,
    ).toBe(`Did you hear about Governor ${governor.familyName}?`);
    const after = say(world, base.playerPersonId, base.parentId, "matter");
    expect(playerUtteranceOf(after.history.events.at(-1)!)).toBe(
      `Did you hear about Governor ${governor.familyName}?`,
    );
    expect(after.history.events.at(-1)!.context.immediateReaction).toMatch(
      /^No\. (What happened|Is everything okay)\?$/,
    );
    expect(matterAwareness(after, base.parentId, deathEventId)).toBe(
      "uninformed",
    );

    const nextChoice = projectLifeConversation(
      after,
      base.playerPersonId,
      base.parentId,
    )!.intents.find((option) => option.key === "tellMatter");
    expect(nextChoice?.spokenWords).toBe(
      `Governor ${governor.familyName} died.`,
    );
    const told = say(after, base.playerPersonId, base.parentId, "tellMatter");
    assertWorldIntegrity(told);
    const claim = told.history.claims.at(-1)!;
    expect(claim.statement).toBe(nextChoice?.spokenWords);
    expect(claim.relationshipToTruth).toBe("unknown");
    const heard = told.history.knowledge.find(
      (record) =>
        record.personId === base.parentId && record.eventId === deathEventId,
    );
    expect(heard?.accuracy).toBe("unknown");
    expect(heard?.source).toEqual({
      kind: "told-by",
      sourcePersonId: base.playerPersonId,
      claimId: claim.id,
    });
    expect(
      conversationExchangeTurns(
        deserializeWorld(serializeWorld(told)),
        base.playerPersonId,
        "life-talk",
        base.parentId,
      ).at(-1)?.playerLine,
    ).toBe(nextChoice?.spokenWords);
  });

  it("an uninformed counterpart says so, takes no time and learns nothing about the matter", () => {
    const base = household();
    const { world, eventId } = publishedMatter(
      base.world,
      base.playerPersonId,
      base.outsider,
    );
    const view = projectLifeConversation(
      world,
      base.playerPersonId,
      base.parentId,
    )!;
    const option = view.intents.find((intent) => intent.key === "matter");
    expect(option?.label).toBe(
      `${MATTER_CHOICE_PREFIX}${world.history.publications![0]!.headline}`,
    );
    expect(matterAwareness(world, base.parentId, eventId)).toBe("uninformed");

    const next = say(world, base.playerPersonId, base.parentId, "matter");
    const turn = next.history.events.at(-1)!;
    expect(turn.context.immediateReaction).toBe("I hadn't heard about that.");
    expect(turn.tags).toContain(`life.matter:${eventId}`);
    expect(turn.tags).toContain("life.answer:matter-uninformed");
    expect(next.currentMoment).toEqual(world.currentMoment);
    // Talking about it is not a record of learning the matter itself.
    expect(matterAwareness(next, base.parentId, eventId)).toBe("uninformed");
  });

  function informedTalk(seed: string) {
    const base = household(seed);
    const published = publishedMatter(
      base.world,
      base.playerPersonId,
      base.outsider,
    );
    const informed = recordEventKnowledge(published.world, {
      stableKey: "parent-heard-matter",
      personId: base.parentId,
      eventId: published.eventId,
      learnedAt: published.world.currentDate,
      believedSummary: "The council met about the library hours.",
      accuracy: "accurate",
      confidence: "high",
      source: { kind: "media", outlet: "Civic Record", reference: null },
    });
    const next = say(informed, base.playerPersonId, base.parentId, "matter");
    return {
      privacy: Boolean(activeOrdinaryGoal(informed, base.parentId, "privacy")),
      reply: next.history.events.at(-1)!.context.immediateReaction!,
      answer: next.history.events.at(-1)!.tags,
    };
  }

  const SEEDS = Array.from(
    { length: 12 },
    (_, index) => `matter-talk-${index}`,
  );

  it("an informed counterpart acknowledges it without inventing a stance", () => {
    const open = SEEDS.map(informedTalk).find((talk) => !talk.privacy);
    expect(open, "a household with no active privacy goal").toBeDefined();
    expect(open!.reply).toBe("I heard about that.");
    expect(open!.answer).toContain("life.answer:matter-informed");
    expect(open!.reply).not.toMatch(/congratulat|great|terrible|agree/i);
  });

  it("an informed counterpart who wants privacy declines to discuss it", () => {
    const guarded = SEEDS.map(informedTalk).find((talk) => talk.privacy);
    expect(guarded, "a household with an active privacy goal").toBeDefined();
    expect(guarded!.reply).toBe("I'd rather not get into that right now.");
  });

  it("remembers the matter they discussed ahead of an older generic exchange", () => {
    const base = household();
    const { world } = publishedMatter(
      base.world,
      base.playerPersonId,
      base.outsider,
    );
    const talked = say(world, base.playerPersonId, base.parentId, "matter");
    const recalled = say(
      talked,
      base.playerPersonId,
      base.parentId,
      "remember",
    );
    expect(recalled.history.events.at(-1)!.context.immediateReaction).toBe(
      `I remember you bringing up “${world.history.publications![0]!.headline}”`,
    );
  });
});
