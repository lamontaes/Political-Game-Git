import { describe, expect, it } from "vitest";
import { newsStoryWorld } from "../../../tests/fixtures/news-story";
import { deserializeWorld, serializeWorld } from "../serialization";
import { officialViewReflectionEventKey } from "../official-view-reads";
import type { World } from "../types";
import { assertWorldIntegrity } from "../world";
import { storyLeads } from "./index";
import { mediaOutlets } from "./outlets";
import { LAW_EFFECT_MEASURE_TAG } from "./law-effect-news";
import { recordStoryHeardExposure } from "./story-exposure";
import { newsHabitOf } from "../living-world/news-habits";
import { mediaOutletKey } from "./records";

const news = (world: World) =>
  (world.history.lawExposures ?? []).filter((row) => row.relation === "news");

describe("a story about what a law did is heard from the news", () => {
  const { world, resident, measureId, own } = newsStoryWorld(
    "KY",
    "story-heard-small-world",
  );

  it("writes one exposure for each reader, tied to the records it came from", () => {
    const heard = news(world);
    expect(heard.length).toBeGreaterThan(0);
    expect(heard.map((row) => row.personId)).toContain(resident.id);
    expect(
      new Set(
        heard.map((row) => `${row.news!.knowledgeId}:${row.basisEventId}`),
      ).size,
    ).toBe(heard.length);
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

  it("records a local publication for represented residents who follow it", () => {
    const localOutlet = mediaOutlets(world).find(
      (outlet) => outlet.scope === "local",
    )!;
    const publication = world.history.publications!.find(
      (row) => row.outletKey === mediaOutletKey(localOutlet.id),
    )!;
    const reader = world.personOrder
      .map((id) => world.people[id]!)
      .find(
        (person) =>
          localOutlet.primaryJurisdictionIds.includes(
            person.homeJurisdictionId,
          ) &&
          newsHabitOf(world, person.id).outletKeys.includes(
            publication.outletKey,
          ),
      )!;
    const story = world.history.events.find(
      (event) => event.id === publication.sourceEventId,
    )!;
    expect(
      world.history.knowledge.some(
        (row) =>
          row.personId === reader.id &&
          row.eventId === story.id &&
          row.source.kind === "media" &&
          row.source.reference === publication.id,
      ),
    ).toBe(true);
  });

  it("rejects a saved exposure whose story provenance was broken", () => {
    const row = news(world)[0]!;
    const broken: World = {
      ...world,
      history: {
        ...world.history,
        lawExposures: world.history.lawExposures!.map((exposure) =>
          exposure.id === row.id
            ? {
                ...exposure,
                news: { ...row.news!, publicationId: row.news!.knowledgeId },
              }
            : exposure,
        ),
      },
    };
    expect(() => assertWorldIntegrity(broken)).toThrow(
      "provenance does not reconcile",
    );
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
