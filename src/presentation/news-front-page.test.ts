import { describe, expect, it } from "vitest";

import { createNewGameWorld } from "./new-game";
import { projectNewsFrontPage } from "./news-front-page";
import { projectPublicInformationPanel } from "./public-information-adapters";

function newLife(seed: string) {
  return createNewGameWorld({
    placeKey: "kentucky",
    startAge: 34,
    depth: "summarize-earlier-life",
    startingLife: "ordinary-life",
    household: "shares-a-home",
    seed,
    givenName: null,
    familyName: null,
  }).world;
}

describe("News front pages", () => {
  it("prints only saved publications, national stories first, and nothing twice", () => {
    const world = newLife("ui-follow-news");
    const before = JSON.stringify(world);
    const saved = projectPublicInformationPanel(world).items;
    const page = projectNewsFrontPage(world, "front", null);
    expect(JSON.stringify(world)).toBe(before);
    const shown = [page.lead, ...page.stories].filter(
      (story): story is NonNullable<typeof story> => story !== null,
    );
    expect(shown.map((story) => story.id).sort()).toEqual(
      saved.map((item) => item.publicationId).sort(),
    );
    const firstLocal = shown.findIndex((story) => !story.national);
    if (firstLocal >= 0) {
      expect(shown.slice(firstLocal).every((story) => !story.national)).toBe(
        true,
      );
    }
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
