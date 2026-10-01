import { describe, expect, it } from "vitest";

import {
  advanceWorld,
  createCampaignElectionTransitionRegistry,
  deserializeWorld,
  serializeWorld,
} from "../index";
import { recordLawExposure } from "../law-exposure";
import { enactThroughDesk } from "../../../tests/fixtures/enact-through-desk";
import {
  KENTUCKY_CONTEXT,
  createLegislativeScenario,
} from "../legislation-scenarios";
import { ensureStateExecutiveIncumbent } from "../nationwide-world/state-executives";
import { officialViewReflectionEventKey } from "../official-view-reads";
import type { EntityId, World } from "../types";
import { assertWorldIntegrity, recordWorldEvent } from "../world";
import {
  ensurePressDeskSchedule,
  ensurePressStateCoverage,
  storyLeads,
} from "./index";
import { LAW_EFFECT_MEASURE_TAG } from "./law-effect-news";
import { recordStoryHeardExposure } from "./story-exposure";

const KY = KENTUCKY_CONTEXT.jurisdiction.id;
const HANDLERS = createCampaignElectionTransitionRegistry();

/*
 * A small Kentucky world: one enacted law, one resident it reached, the state
 * paper. The paper reports what the law did, and everyone who reads the story
 * hears of the law from the news: one exposure each, no money, no opinion.
 */
function heardWorld() {
  const scenario = createLegislativeScenario("kentucky");
  let world = enactThroughDesk(
    ensureStateExecutiveIncumbent(
      scenario.world,
      scenario.playerPersonId,
      "KY",
    ),
    scenario.measureId,
    { context: scenario },
  );
  const measureId = scenario.measureId;
  world = ensurePressStateCoverage(world, KY);
  world = ensurePressDeskSchedule(world);
  const resident =
    world.people[
      world.personOrder.find((id) => id !== scenario.playerPersonId)!
    ]!;
  const town = resident.homeJurisdictionId;
  const date = world.currentDate;
  world = recordWorldEvent(world, {
    stableKey: "story-heard:service",
    type: "test.recorded-law-effect",
    occurredAt: date,
    recordedAt: date,
    jurisdictionId: town,
    involvedEntityIds: [resident.id],
    participants: [],
    personFactConstraints: [],
    visibility: "private",
    tags: [],
    summary: "An explicitly authored non-money effect fixture.",
    context: {
      location: null,
      socialContext: null,
      pressure: null,
      choice: null,
      motivation: null,
      immediateReaction: null,
    },
  });
  world = recordLawExposure(world, {
    stableKey: "story-heard:own",
    personId: resident.id,
    measureId,
    sectionKey: "hours",
    channel: "public-service",
    direction: "none",
    amount: null,
    cadence: null,
    sourceRecordId: world.history.events.at(-1)!.id,
    includeFamily: false,
  });
  const own = world.history.lawExposures!.at(-1)!;
  let later = world;
  for (let day = 0; day < 28; day += 1)
    later = advanceWorld(later, 1, HANDLERS);
  return { world: later, resident, measureId, own };
}

const news = (world: World) =>
  (world.history.lawExposures ?? []).filter((row) => row.relation === "news");

describe("a story about what a law did is heard from the news", () => {
  const { world, resident, measureId, own } = heardWorld();

  it("writes one exposure for each reader, tied to the records it came from", () => {
    const heard = news(world);
    expect(heard.length).toBeGreaterThan(0);
    expect(heard.map((row) => row.personId)).toContain(resident.id);
    expect(new Set(heard.map((row) => row.personId)).size).toBe(heard.length);
    for (const row of heard) {
      expect(row.measureId).toBe(measureId);
      expect(row.channel).toBe("public-service");
      expect(row.sectionKey).toBe("hours");
      expect(row.direction).toBe("none");
      expect(row.amount).toBeNull();
      expect(row.monthlyPay).toBeNull();
      expect(row.viaPersonId).toBeNull();
      const knowledge = world.history.knowledge.find(
        (k) => k.id === row.news!.knowledgeId,
      )!;
      expect(row.sourceRecordId).toBe(knowledge.id);
      expect(knowledge.personId).toBe(row.personId);
      expect(knowledge.source).toMatchObject({
        kind: "media",
        reference: row.news!.publicationId,
      });
      const lead = storyLeads(world).find(
        (l) => l.id === row.news!.storyLeadId,
      )!;
      expect(lead.basisEventIds).toContain(row.news!.basisEventId);
      const basis = world.history.events.find(
        (e) => e.id === row.news!.basisEventId,
      )!;
      expect(basis.tags).toContain(`${LAW_EFFECT_MEASURE_TAG}${measureId}`);
      expect(basis.tags).toContain(`law-effect:source:${own.id}`);
    }
  });

  it("carries no opinion weight", () => {
    for (const row of news(world)) {
      const key = officialViewReflectionEventKey(row);
      expect(world.history.events.some((e) => e.stableKey === key)).toBe(false);
      expect(
        world.history.futureDueItems.some((item) =>
          item.stableKey.includes(row.id),
        ),
      ).toBe(false);
    }
  });

  it("is idempotent, and survives a save", () => {
    const row = news(world)[0]!;
    const again = recordStoryHeardExposure(world, {
      knowledgeId: row.news!.knowledgeId,
      basisEventId: row.news!.basisEventId,
    });
    expect(again.history.lawExposures).toBe(world.history.lawExposures);
    const loaded = deserializeWorld(serializeWorld(world));
    expect(news(loaded)).toEqual(news(world));
    expect(() => assertWorldIntegrity(loaded)).not.toThrow();
  });
});
