import { describe, expect, it } from "vitest";

import { DEFAULT_NEW_GAME_SETUP } from "./new-game";
import { generateOpeningLife, prepareOpeningLife } from "./opening-life";
import { projectNewsFrontPage, sortNewsCoverageRows } from "./news-front-page";
import { passOrdinaryDays } from "./ordinary-life";
import { projectPublicInformationPanel } from "./public-information-adapters";
import {
  homeStateKey,
  stateKeyForJurisdiction,
} from "../simulation/state-jurisdiction-id";
import { STATES } from "../simulation/state-reference";
import {
  followsNewsClosely,
  newsHabitOf,
  newsHabitReadsOutlet,
} from "../simulation/living-world/official-views";

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

function playerId(world: ReturnType<typeof newLife>) {
  if (world.preStartLife) return world.preStartLife.personId;
  if (world.control.kind === "person") return world.control.personId;
  throw new Error("The fixture must have a player person.");
}

describe("News front pages", () => {
  it("shows the public feed when there is no controlled reader", () => {
    const world = passOrdinaryDays(newLife("ui-news-public-feed"), 30);
    const publicItems = projectPublicInformationPanel(world).items;
    const page = projectNewsFrontPage(world, null, "front", null);
    const shown = [page.lead, ...page.stories].filter(
      (story): story is NonNullable<typeof story> => story !== null,
    );
    expect(shown.map((story) => story.id).sort()).toEqual(
      publicItems.map((item) => item.publicationId).sort(),
    );
  });

  it("derives a continuous news habit and keeps outlet membership stubbed", () => {
    const world = newLife("ui-news-habit");
    const personId = playerId(world);
    const habit = newsHabitOf(world, personId);
    expect(habit.closeness).toBeGreaterThanOrEqual(0);
    expect(habit.closeness).toBeLessThanOrEqual(1);
    expect(followsNewsClosely(world, personId)).toBe(habit.closeness >= 0.5);
    expect(newsHabitReadsOutlet(world, personId, "any-outlet")).toBe(false);
  });

  it("sorts synthetic coverage rows by national, state, town, then recency", () => {
    const rows = [
      {
        value: "town-recent",
        jurisdictionId: "home-town",
        jurisdictionKind: "city",
        jurisdictionStateKey: "US-KY",
        publishedAt: "2026-06-10",
      },
      {
        value: "state-old",
        jurisdictionId: "home-state",
        jurisdictionKind: "state",
        jurisdictionStateKey: "US-KY",
        publishedAt: "2026-06-01",
      },
      {
        value: "national-old",
        jurisdictionId: null,
        jurisdictionKind: null,
        jurisdictionStateKey: null,
        publishedAt: "2026-05-01",
      },
      {
        value: "town-old",
        jurisdictionId: "home-town",
        jurisdictionKind: "city",
        jurisdictionStateKey: "US-KY",
        publishedAt: "2026-06-01",
      },
      {
        value: "federal-recent",
        jurisdictionId: "federal-office",
        jurisdictionKind: "federal",
        jurisdictionStateKey: null,
        publishedAt: "2026-06-15",
      },
    ] as const;
    const sorted = sortNewsCoverageRows(rows, {
      homeJurisdictionId: "home-town",
      homeStateKey: "US-KY",
      homeJurisdictionStateKey: null,
    });
    expect(sorted.map((row) => row.value)).toEqual([
      "federal-recent",
      "national-old",
      "state-old",
      "town-recent",
      "town-old",
    ]);
  });

  it("projects actual saved publications for the controlled person", () => {
    const world = passOrdinaryDays(newLife("ui-follow-news"), 30);
    const before = JSON.stringify(world);
    const saved = projectPublicInformationPanel(world).items.filter((item) => {
      const jurisdictionId = item.jurisdictionId;
      if (
        jurisdictionId === null ||
        world.jurisdictions[jurisdictionId]?.kind === "federal"
      )
        return true;
      if (jurisdictionId === world.people[playerId(world)]?.homeJurisdictionId)
        return true;
      const jurisdiction = world.jurisdictions[jurisdictionId];
      const stateParent = Object.entries(STATES).find(
        ([, state]) => state.name === jurisdiction?.parentName,
      );
      return (
        !!jurisdiction &&
        (stateKeyForJurisdiction(jurisdiction) ??
          (stateParent ? `US-${stateParent[0]}` : null)) ===
          homeStateKey(world, playerId(world))
      );
    });
    expect(saved.length).toBeGreaterThan(0);
    const page = projectNewsFrontPage(world, playerId(world), "front", null);
    expect(JSON.stringify(world)).toBe(before);
    const shown = [page.lead, ...page.stories].filter(
      (story): story is NonNullable<typeof story> => story !== null,
    );
    expect(shown.map((story) => story.id).sort()).toEqual(
      saved.map((item) => item.publicationId).sort(),
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
    const page = projectNewsFrontPage(
      world,
      playerId(world),
      "publication",
      "no-such-outlet",
    );
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
