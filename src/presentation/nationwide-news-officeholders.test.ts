import { describe, expect, it, vi } from "vitest";
import {
  deserializeWorld,
  searchLifePlaces,
  serializeWorld,
  stateExecutiveOffice,
} from "../simulation";
import { DEFAULT_NEW_GAME_SETUP } from "./new-game";
import { generateOpeningLife, prepareOpeningLife } from "./opening-life";
import { projectWorld39News } from "./world39-news";

// Each case opens a new life, which now seats all fifty state legislatures.
vi.setConfig({ testTimeout: 60_000, hookTimeout: 60_000 });

describe("NATIONWIDE News names the home-state governor the World produced", () => {
  it("says who serves without inventing a since, and keeps it through reopen", () => {
    const place = searchLifePlaces("", 1, {
      stateJurisdictionKey: "US-NV",
      scope: "locality",
    })[0]!;
    const { world, playerPersonId } = generateOpeningLife(
      prepareOpeningLife({
        ...DEFAULT_NEW_GAME_SETUP,
        seed: "nationwide-news-nevada",
        placeKey: place.key,
        startAge: 40,
        questionnaire: "skipped",
      }),
    ).game!;
    const nevada = stateExecutiveOffice("NV")!;
    const news = projectWorld39News(world, playerPersonId);

    const governor = news.officeholders.find(
      (holder) => holder.officeKey === nevada.officeKey,
    );
    expect(governor).toBeDefined();
    expect(governor!.title).toBe("Governor of Nevada");
    // Dated by the game's disclosed office calendar.
    expect(governor!.startedAt).toBe("2023-01-02");
    expect(governor!.termFactsUnknown).toEqual([]);
    expect(governor!.sentence).toMatch(/served as Governor of Nevada since/);
    expect(
      news.unfilledOffices.map((office) => office.displayName),
    ).not.toContain("Governor of Nevada");

    // News reaches as far as the reader does: Nevada's governor and the
    // nation's officers, not every other state's governor.
    expect(
      news.officeholders
        .filter((holder) => /^Governor of /.test(holder.title))
        .map((holder) => holder.title),
    ).toEqual(["Governor of Nevada"]);

    // A dated federal office still reads with its start.
    const president = news.officeholders.find(
      (holder) => holder.officeKey === "us-president",
    )!;
    expect(president.sentence).toMatch(/since/);

    const reopened = deserializeWorld(serializeWorld(world));
    expect(projectWorld39News(reopened, playerPersonId).officeholders).toEqual(
      news.officeholders,
    );
  });
});
