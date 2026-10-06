import { describe, expect, it } from "vitest";

import { DEFAULT_NEW_GAME_SETUP } from "./new-game";
import { generateOpeningLife, prepareOpeningLife } from "./opening-life";
import {
  filterNewsItemsToHabit,
  projectNewsFrontPage,
} from "./news-front-page";
import { passOrdinaryDays } from "./ordinary-life";
import { newsHabitOf } from "../simulation/living-world/news-habits";

describe("news front-page reach", () => {
  it("shows only the outlets the reader's habit includes", () => {
    const game = generateOpeningLife(
      prepareOpeningLife({
        ...DEFAULT_NEW_GAME_SETUP,
        placeKey: "lexington-fayette",
        startAge: 34,
        seed: "news-front-page-reach",
      }),
    ).game!;
    const world = passOrdinaryDays(game.world, 7);
    const habit = newsHabitOf(world, game.playerPersonId);
    const page = projectNewsFrontPage(
      world,
      "front",
      null,
      game.playerPersonId,
    );
    expect(habit.outletKeys.length).toBeGreaterThan(0);
    expect(
      page.mastheads.every((outlet) =>
        habit.outletKeys.includes(outlet.outletKey),
      ),
    ).toBe(true);
    expect(
      [page.lead, ...page.stories].every(
        (story) => !story || habit.outletKeys.includes(story.outletKey),
      ),
    ).toBe(true);
    if ([page.lead, ...page.stories].some((story) => story?.national))
      expect(page.lead?.national).toBe(true);
  });

  it("filters recorded stories to the followed outlets without choosing a story", () => {
    const saved = [
      { publicationId: "national-story", outletKey: "media:national" },
      { publicationId: "home-state-story", outletKey: "media:home-state" },
      { publicationId: "other-town-story", outletKey: "media:other-town" },
    ];
    expect(
      filterNewsItemsToHabit(
        saved,
        new Set(["media:national", "media:home-state"]),
      ),
    ).toEqual(saved.slice(0, 2));
    expect(filterNewsItemsToHabit(saved, null)).toEqual(saved);
  });
});
