import { describe, expect, it } from "vitest";
import { drawRandomPlace } from "../../../tests/support/random-place";
import {
  createNewGameWorld,
  DEFAULT_NEW_GAME_SETUP,
} from "../../presentation/new-game";
import { recordEventKnowledge } from "../records";
import { createFormationContext, recordPrivateBelief } from "../politics";
import { viewOfOfficial } from "../official-view-reads";
import {
  PRESS_STORY_EVENT_TYPE,
  PRESS_STORY_LEAD_TAG,
} from "../public-information-integrity";
import { recordWorldEvent, withWorldIntegrityDeferred } from "../world";
import type { EntityId, World } from "../types";
import { formOfficialViewFromPublishedStory } from "./official-views";

function storyScenario(seed: string) {
  const place = drawRandomPlace(seed);
  const game = createNewGameWorld({
    ...DEFAULT_NEW_GAME_SETUP,
    placeKey: place.key,
    seed,
  });
  const readerId = game.world.personOrder.find(
    (id) => id !== game.playerPersonId,
  )!;
  const officialId = game.world.personOrder.find(
    (id) => id !== readerId && id !== game.playerPersonId,
  )!;
  const nonreaderId = game.world.personOrder.find(
    (id) => id !== readerId && id !== officialId,
  )!;
  const propositionId = Object.keys(
    game.world.policyCatalog.propositions,
  )[0] as EntityId;
  let world = recordPrivateBelief(game.world, {
    stableKey: `${seed}:reader-held-view`,
    personId: readerId,
    propositionId,
    formedAt: game.world.currentDate,
    position: "support",
    conviction: "strong",
    salience: "high",
    flexibility: "open",
    rationale: "A previously held view on the measure's question.",
    formation: createFormationContext("reflection:initial"),
    supersedesBeliefId: null,
  });
  const measureId = `measure:${seed}` as EntityId;
  const voteId = `vote:${seed}` as EntityId;
  const leadId = `lead:${seed}` as EntityId;
  const act = recordWorldEvent(world, {
    stableKey: `${seed}:vote-event`,
    type: "legislation.floor-stage-vote",
    occurredAt: world.currentDate,
    recordedAt: world.currentDate,
    jurisdictionId: null,
    involvedEntityIds: [officialId],
    participants: [
      { personId: officialId, role: "focus:subject", detail: null },
    ],
    personFactConstraints: [],
    visibility: "public",
    tags: ["legislation.floor-vote"],
    summary: "The official voted on a recorded measure.",
    context: {
      location: null,
      socialContext: null,
      pressure: null,
      choice: null,
      motivation: null,
      immediateReaction: null,
    },
  });
  world = {
    ...act,
    history: {
      ...act.history,
      legislativeMeasures: [
        ...(act.history.legislativeMeasures ?? []),
        {
          id: measureId,
          propositionIds: [propositionId],
          propositionAnswers: [{ propositionId, answer: "yes" }],
        },
      ],
      legislativeActions: [
        ...(act.history.legislativeActions ?? []),
        { eventId: act.history.events.at(-1)!.id, measureId, voteId },
      ],
      legislativeVotes: [
        ...(act.history.legislativeVotes ?? []),
        {
          id: voteId,
          measureId,
          dispositions: [{ personId: officialId, disposition: "yea" }],
        },
      ],
      pressRecords: [
        ...(act.history.pressRecords ?? []),
        {
          id: leadId,
          kind: "story-lead",
          basisEventIds: [act.history.events.at(-1)!.id],
        },
      ],
    },
  } as unknown as World;
  const story = recordWorldEvent(world, {
    stableKey: `${seed}:published-story-event`,
    type: PRESS_STORY_EVENT_TYPE,
    occurredAt: world.currentDate,
    recordedAt: world.currentDate,
    jurisdictionId: null,
    involvedEntityIds: [officialId],
    participants: [],
    personFactConstraints: [],
    visibility: "public",
    tags: [`${PRESS_STORY_LEAD_TAG}${leadId}`],
    summary: "The newspaper reported the official's vote.",
    context: {
      location: null,
      socialContext: null,
      pressure: null,
      choice: null,
      motivation: null,
      immediateReaction: null,
    },
  });
  const publicationId = `publication:${seed}` as EntityId;
  world = {
    ...story,
    history: {
      ...story.history,
      publications: [
        ...(story.history.publications ?? []),
        {
          id: publicationId,
          sourceEventId: story.history.events.at(-1)!.id,
          publishedAt: story.currentDate,
          recordedAt: story.currentDate,
        },
      ],
    },
  } as unknown as World;
  world = recordEventKnowledge(world, {
    stableKey: `${seed}:reader-knows-story`,
    personId: readerId,
    eventId: story.history.events.at(-1)!.id,
    learnedAt: world.currentDate,
    believedSummary: "The paper reported the official's vote.",
    accuracy: "accurate",
    confidence: "high",
    source: {
      kind: "media",
      outlet: "The Ledger",
      reference: publicationId,
    },
  });
  return {
    world,
    readerId,
    officialId,
    nonreaderId,
    knowledgeId: world.history.knowledge.at(-1)!.id,
    basisEventId: act.history.events.at(-1)!.id,
    place,
  };
}

describe("published-story official views", () => {
  it("forms a reader's view from the published vote, not for nonreaders", () => {
    const f = storyScenario("b07-p1-story-reader-random-place");
    expect(viewOfOfficial(f.world, f.readerId, f.officialId).belief).toBeNull();
    const after = withWorldIntegrityDeferred(() =>
      formOfficialViewFromPublishedStory(
        f.world,
        f.knowledgeId,
        f.basisEventId,
      ),
    );
    expect(
      viewOfOfficial(after, f.readerId, f.officialId).belief,
    ).toMatchObject({ subject: { kind: "official", personId: f.officialId } });
    expect(
      viewOfOfficial(after, f.nonreaderId, f.officialId).belief,
    ).toBeNull();
    expect(f.place.key).toBeTruthy();
  });
});
