import { describe, expect, it } from "vitest";
import { newsStoryWorld } from "./fixtures/news-story";
import { lifePlaceStateIdentities } from "../src/simulation/life-places";
import { SeededRng, pickDistinct } from "../src/simulation/rng";
import { projectNewsArticle } from "../src/presentation/news-front-page";
import {
  deserializeWorld,
  serializeWorld,
} from "../src/simulation/serialization";
import { assertWorldIntegrity, advanceWorld } from "../src/simulation/world";
import {
  createPressTransitionRegistry,
  storyLeads,
} from "../src/simulation/press";
import { officialViewReflectionEventKey } from "../src/simulation/official-view-reads";
import { recordStoryHeardExposure } from "../src/simulation/press/story-exposure";

const SEED = "news-play-20261001";
const places = lifePlaceStateIdentities();
const [place] = pickDistinct(new SeededRng(SEED), places, 1);
const PLACE = place!.jurisdictionKey;

// The legal signature and service occurrence are explicitly authored fixture
// inputs. All reporting, publication, knowledge and exposure writes are real.
describe(`NEWS seven-step play script in ${PLACE} (seed ${SEED})`, () => {
  const { world, own, resident, measureId } = newsStoryWorld(PLACE, SEED);
  const heard = world.history.lawExposures!.find(
    (row) => row.relation === "news" && row.personId === resident.id,
  )!;

  it("step 1: inspect the recorded law consequence and its source", () => {
    expect(places).toHaveLength(56);
    expect(own.measureId).toBe(measureId);
    expect(own.relation).toBe("own");
    expect(
      world.history.events.some((event) => event.id === own.sourceRecordId),
    ).toBe(true);
  });
  it("step 2: advance the desk and find its published story", () => {
    expect(heard).toBeDefined();
    const lead = storyLeads(world).find(
      (row) => row.id === heard.news!.storyLeadId,
    )!;
    expect(lead.basisEventIds).toContain(heard.news!.basisEventId);
    expect(
      world.history.publications!.some(
        (row) => row.id === heard.news!.publicationId,
      ),
    ).toBe(true);
  });
  it("step 3: open the saved publication without changing the world", () => {
    const before = serializeWorld(world);
    const article = projectNewsArticle(world, heard.news!.publicationId);
    expect(article).not.toBeNull();
    expect(serializeWorld(world)).toBe(before);
  });
  it("step 4: prove that the affected resident actually learned the published story", () => {
    const knowledge = world.history.knowledge.find(
      (row) => row.id === heard.news!.knowledgeId,
    )!;
    expect(knowledge.personId).toBe(resident.id);
    expect(knowledge.source).toMatchObject({
      kind: "media",
      reference: heard.news!.publicationId,
    });
  });
  it("step 5: inspect the heard exposure and full supporting provenance", () => {
    expect(heard.sourceRecordId).toBe(heard.news!.knowledgeId);
    const basis = world.history.events.find(
      (row) => row.id === heard.news!.basisEventId,
    )!;
    expect(basis.tags).toContain(`law-effect:source:${own.id}`);
    expect(heard.amount).toBeNull();
    expect(heard.monthlyPay).toBeNull();
    assertWorldIntegrity(world);
  });
  it.todo(
    "step 6: inspect a canonical view decision formed from news; Ruling 28 gives heard exposure no opinion weight and no care/view factor is admitted yet",
  );
  it("step 7: save, continue, and repeat the reading without another exposure", () => {
    const loaded = deserializeWorld(serializeWorld(world));
    const next = advanceWorld(loaded, 1, createPressTransitionRegistry());
    const count = next.history.lawExposures!.length;
    const repeated = recordStoryHeardExposure(next, {
      knowledgeId: heard.news!.knowledgeId,
      basisEventId: heard.news!.basisEventId,
    });
    expect(repeated.history.lawExposures).toHaveLength(count);
    expect(
      repeated.history.lawExposures!.filter(
        (row) => row.stableKey === heard.stableKey,
      ),
    ).toEqual([heard]);
    expect(
      repeated.history.events.some(
        (event) => event.stableKey === officialViewReflectionEventKey(heard),
      ),
    ).toBe(false);
    assertWorldIntegrity(repeated);
  });
  it.todo(
    "player-read extension: the explicit News-screen read action records the player's knowledge; Team 8's adapter and parent callback are not published on this base",
  );
});
