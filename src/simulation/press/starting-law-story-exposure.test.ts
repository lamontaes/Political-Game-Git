import { describe, expect, it } from "vitest";
import { drawRandomPlace } from "../../../tests/support/random-place";
import {
  createNewGameWorld,
  DEFAULT_NEW_GAME_SETUP,
} from "../../presentation/new-game";
import { lawInForce } from "../governing/law-in-force";
import { stateJurisdictionForKey } from "../life-places";
import { assertLawExposureIntegrity } from "../law-exposure";
import {
  PRESS_STORY_EVENT_TYPE,
  PRESS_STORY_LEAD_TAG,
} from "../public-information-integrity";
import { LAW_EFFECT_MEASURE_TAG } from "./law-effect-news";
import { LAW_EFFECT_EVENT_TYPE } from "./shared";
import { recordStoryHeardExposure } from "./story-exposure";
import type { EntityId, World } from "../types";

// Authored published-story/knowledge lineage tests the existing consumer and
// writer on a real random-place new game; it is not natural press delivery.
function fixture() {
  const seed = "a35-starting-law-news";
  const place = drawRandomPlace(seed);
  const game = createNewGameWorld({
    ...DEFAULT_NEW_GAME_SETUP,
    placeKey: place.key,
    seed,
  });
  const world = game.world;
  const state = stateJurisdictionForKey(place.stateJurisdictionKey!)!;
  const law = Object.values(world.policyCatalog.propositions)
    .map((question) => lawInForce(world, state.id, question.id))
    .find((row) => row?.origin === "in-force-at-start");
  if (!law) throw new Error("A sourced operative starting law is required.");
  const basisId = "event_a35_fixture_basis" as EntityId;
  const storyId = "event_a35_fixture_story" as EntityId;
  const leadId = "press_a35_fixture_lead" as EntityId;
  const publicationId = "publication_a35_fixture" as EntityId;
  const knowledgeId = "knowledge_a35_fixture" as EntityId;
  const sequence = world.history.nextSequence;
  const saved = {
    ...world,
    history: {
      ...world.history,
      nextSequence: sequence + 5,
      events: [
        ...world.history.events,
        {
          id: basisId,
          type: LAW_EFFECT_EVENT_TYPE,
          tags: [
            `${LAW_EFFECT_MEASURE_TAG}${law.measureId}`,
            "law-effect:reach:public-service",
          ],
        },
        {
          id: storyId,
          type: PRESS_STORY_EVENT_TYPE,
          tags: [`${PRESS_STORY_LEAD_TAG}${leadId}`],
        },
      ],
      pressRecords: [
        ...(world.history.pressRecords ?? []),
        { id: leadId, kind: "story-lead", basisEventIds: [basisId] },
      ],
      publications: [
        ...(world.history.publications ?? []),
        { id: publicationId, sourceEventId: storyId },
      ],
      knowledge: [
        ...world.history.knowledge,
        {
          id: knowledgeId,
          sequence: sequence + 4,
          personId: game.playerPersonId,
          eventId: storyId,
          learnedAt: world.currentDate,
          source: { kind: "media", reference: publicationId },
        },
      ],
    },
  } as unknown as World;
  return {
    world: saved,
    law,
    personId: game.playerPersonId,
    basisId,
    knowledgeId,
    publicationId,
    leadId,
  };
}
let cached: ReturnType<typeof fixture> | undefined;
const get = () => (cached ??= fixture());
describe("A35 starting-law stories reach the existing news exposure writer", () => {
  it("uses the exact starting identity, records no money or opinion, and survives replay/Continue", () => {
    const f = get();
    const input = { knowledgeId: f.knowledgeId, basisEventId: f.basisId };
    const before = JSON.stringify(f.world);
    const next = recordStoryHeardExposure(f.world, input);
    const rows = (next.history.lawExposures ?? []).filter(
      (row) => row.news?.knowledgeId === f.knowledgeId,
    );
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      personId: f.personId,
      measureId: f.law.measureId,
      channel: "public-service",
      relation: "news",
      direction: "none",
      amount: null,
      cadence: null,
      monthlyPay: null,
      sourceRecordId: f.knowledgeId,
      news: {
        knowledgeId: f.knowledgeId,
        publicationId: f.publicationId,
        storyLeadId: f.leadId,
        basisEventId: f.basisId,
      },
    });
    expect(next.history.legislativeEnactments).toBe(
      f.world.history.legislativeEnactments,
    );
    expect(next.history.resourceTransferOutcomes).toBe(
      f.world.history.resourceTransferOutcomes,
    );
    expect(next.history.futureDueItems).toBe(f.world.history.futureDueItems);
    expect(() =>
      assertLawExposureIntegrity(next, new Set([f.knowledgeId])),
    ).not.toThrow();
    expect(recordStoryHeardExposure(next, input)).toBe(next);
    const continued = JSON.parse(JSON.stringify(next)) as World;
    expect(recordStoryHeardExposure(continued, input)).toBe(continued);
    expect(() =>
      assertLawExposureIntegrity(continued, new Set([f.knowledgeId])),
    ).not.toThrow();
    expect(JSON.stringify(f.world)).toBe(before);
  });
  it("refuses an invented starting key and missing reported effect lineage", () => {
    const f = get();
    const invented = {
      ...f.world,
      history: {
        ...f.world.history,
        events: f.world.history.events.map((row) =>
          row.id === f.basisId
            ? {
                ...row,
                tags: [
                  `${LAW_EFFECT_MEASURE_TAG}starting-law:US-ZZ:invented-question`,
                  "law-effect:reach:public-service",
                ],
              }
            : row,
        ),
      },
    };
    expect(
      recordStoryHeardExposure(invented, {
        knowledgeId: f.knowledgeId,
        basisEventId: f.basisId,
      }),
    ).toBe(invented);
    const missing = {
      ...f.world,
      history: { ...f.world.history, pressRecords: [] },
    };
    expect(
      recordStoryHeardExposure(missing, {
        knowledgeId: f.knowledgeId,
        basisEventId: f.basisId,
      }),
    ).toBe(missing);
  });
});
