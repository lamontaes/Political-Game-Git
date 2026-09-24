import { describe, expect, it } from "vitest";

import {
  deserializeWorld,
  recordEventKnowledge,
  recordWorldEvent,
  serializeWorld,
  type EntityId,
  type World,
} from "../simulation";
import { activeOrdinaryGoal } from "../simulation/life-personality";
import { publishPublicEvent } from "../simulation/public-information";
import { recordSelectedPublicationRead } from "../simulation/publication-reading";
import { currentKnownMatter, matterAwareness } from "./current-matters";
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
  next = recordSelectedPublicationRead(next, {
    personId: playerPersonId,
    publicationId: next.history.publications!.at(-1)!.id,
  });
  return { world: next, eventId };
}

function say(
  world: World,
  playerPersonId: EntityId,
  personId: EntityId,
  intent: "matter" | "remember",
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
  it("saves the exact public death statement as a heard claim, not a known fact", () => {
    const base = household("public-death-talk");
    let world = recordWorldEvent(base.world, {
      stableKey: "public-death-talk:governor",
      type: "crisis.officeholder-died",
      occurredAt: base.world.currentDate,
      recordedAt: base.world.currentDate,
      jurisdictionId: base.world.people[base.outsider]!.homeJurisdictionId,
      involvedEntityIds: [base.outsider],
      participants: [
        {
          personId: base.outsider,
          role: "focus:officeholder",
          detail: "Governor",
        },
      ],
      personFactConstraints: [],
      visibility: "public",
      tags: ["crisis", "continuity:death"],
      summary: "The governor died in office.",
      context: {
        location: null,
        socialContext: null,
        pressure: null,
        choice: null,
        motivation: null,
        immediateReaction: null,
      },
    });
    const death = world.history.events.at(-1)!;
    world = recordEventKnowledge(world, {
      stableKey: "public-death-talk:player-read",
      personId: base.playerPersonId,
      eventId: death.id,
      learnedAt: world.currentDate,
      believedSummary: death.summary,
      accuracy: "accurate",
      confidence: "high",
      source: { kind: "media", outlet: "Civic Ledger", reference: null },
    });
    const view = projectLifeConversation(
      world,
      base.playerPersonId,
      base.parentId,
    )!;
    const option = view.intents.find(
      (intent) => intent.key === "matter:ask-death",
    );
    expect(option?.spokenWords).toBe(
      `Did you hear Governor ${world.people[base.outsider]!.familyName} died?`,
    );
    const next = commitLifeConversation(world, {
      playerPersonId: base.playerPersonId,
      personId: base.parentId,
      intent: "matter:ask-death",
      revision: view.revision,
    });
    const turn = next.history.events.at(-1)!;
    expect(turn.context.choice).toBe(option!.spokenWords);
    expect(turn.summary).toContain(`${option!.spokenWords} `);
    expect(turn.summary).not.toContain("?.");
    expect(next.history.claims.at(-1)).toMatchObject({
      eventId: death.id,
      statement: option!.spokenWords,
      relationshipToTruth: "unknown",
    });
    const heard = next.history.knowledge.find(
      (knowledge) =>
        knowledge.personId === base.parentId && knowledge.eventId === death.id,
    );
    expect(heard).toMatchObject({
      accuracy: "unknown",
      source: {
        kind: "told-by",
        sourcePersonId: base.playerPersonId,
        claimId: next.history.claims.at(-1)!.id,
      },
    });
    expect(matterAwareness(next, base.parentId, death.id)).toBe("informed");
    expect(currentKnownMatter(next, base.parentId)?.eventId).not.toBe(death.id);
    expect(deserializeWorld(serializeWorld(next)).history.claims).toEqual(
      next.history.claims,
    );
  });

  it("offers no matter when the player has nothing public or known to raise", () => {
    const { world, playerPersonId, parentId } = household();
    const view = projectLifeConversation(world, playerPersonId, parentId)!;
    expect(view.intents.map((intent) => intent.key)).not.toContain("matter");
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
