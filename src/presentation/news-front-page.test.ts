import { describe, expect, it } from "vitest";

import { DEFAULT_NEW_GAME_SETUP } from "./new-game";
import { generateOpeningLife, prepareOpeningLife } from "./opening-life";
import { projectNewsFrontPage } from "./news-front-page";
import { passOrdinaryDays } from "./ordinary-life";
import { projectPublicInformationPanel } from "./public-information-adapters";
import { lifePlaces, SeededRng } from "../simulation";

function newLife(seed: string) {
  return generateOpeningLife(
    prepareOpeningLife({
      ...DEFAULT_NEW_GAME_SETUP,
      placeKey: "lexington-fayette",
      startAge: 34,
      seed,
    }),
  ).game!.world;
}

describe("News front pages", () => {
  it("publishes the filing day from a fresh game in a seeded random place", () => {
    const seed = "bg17-fresh-random-place";
    const place = new SeededRng(seed).pick(
      lifePlaces().filter((candidate) => candidate.scope === "locality"),
    );
    const opening = generateOpeningLife(
      prepareOpeningLife({
        ...DEFAULT_NEW_GAME_SETUP,
        placeKey: place.key,
        startAge: 34,
        seed,
      }),
    ).game!.world;
    const world = passOrdinaryDays(opening, 1);
    const filings = world.history.events.filter(
      (event) =>
        event.occurredAt === world.currentDate &&
        (event.type === "election.congress-candidate-slate" ||
          event.type === "election.state-legislative-candidate-slate"),
    );

    expect(
      filings.length,
      `${place.displayName}, seed ${seed}`,
    ).toBeGreaterThan(50);
    const page = projectNewsFrontPage(world, "front", null);
    const stories = [page.lead, ...page.stories].filter(
      (story): story is NonNullable<typeof story> => story !== null,
    );
    const reportedEventIds = new Set(
      stories.map((story) => story.sourceEventId),
    );
    expect(page.empty).toBeNull();
    expect(
      filings.filter((filing) => reportedEventIds.has(filing.id)),
      `${place.displayName}, seed ${seed}`,
    ).toHaveLength(2);
  }, 1_800_000);

  it("prints saved publications by recency, regardless of scope, and nothing twice", () => {
    const world = passOrdinaryDays(newLife("ui-follow-news"), 30);
    const before = JSON.stringify(world);
    const saved = projectPublicInformationPanel(world).items;
    expect(saved.length).toBeGreaterThan(1);
    const page = projectNewsFrontPage(world, "front", null);
    expect(JSON.stringify(world)).toBe(before);
    const shown = [page.lead, ...page.stories].filter(
      (story): story is NonNullable<typeof story> => story !== null,
    );
    expect(
      shown.some(
        (local) =>
          !local.national &&
          shown.some(
            (national) =>
              national.national && local.publishedAt > national.publishedAt,
          ),
      ),
    ).toBe(true);
    expect(shown.map((story) => story.id).sort()).toEqual(
      saved.map((item) => item.publicationId).sort(),
    );
    expect(shown.map((story) => story.publishedAt)).toEqual(
      shown
        .map((story) => story.publishedAt)
        .sort()
        .reverse(),
    );
    for (const story of shown) {
      const record = saved.find((item) => item.publicationId === story.id)!;
      expect(story.headline).toBe(record.headline);
      expect(story.body).toBe(record.body);
    }
    expect(page.empty === null).toBe(shown.length > 0);
  });

  it("shows one paper's own front page and falls back from an unknown outlet", () => {
    const world = newLife("ui-follow-news-outlet");
    const page = projectNewsFrontPage(world, "publication", "no-such-outlet");
    if (page.mastheads.length === 0) {
      expect(page.outlet).toBeNull();
      expect(page.empty).toBe("Nothing has been published yet.");
      return;
    }
    expect(page.outlet?.outletKey).toBe(page.mastheads[0]!.outletKey);
    for (const story of [page.lead, ...page.stories]) {
      if (story) expect(story.outletKey).toBe(page.outlet!.outletKey);
    }
  });
});
