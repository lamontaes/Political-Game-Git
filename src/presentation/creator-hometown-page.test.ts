import { describe, expect, it } from "vitest";

import { lifePlaceSearch } from "../simulation";
import {
  HOMETOWN_PAGE_SIZE,
  projectHometownPage,
} from "./creator-hometown-page";

const NEVADA = { stateJurisdictionKey: "US-NV", scope: "locality" } as const;

describe("honest hometown pages", () => {
  it("says how many Nevada places exist instead of stopping silently at 24", () => {
    const first = projectHometownPage("", 0, NEVADA);
    const all = lifePlaceSearch("", Number.MAX_SAFE_INTEGER, NEVADA);
    expect(first.total).toBe(all.length);
    expect(first.places.length).toBeLessThanOrEqual(HOMETOWN_PAGE_SIZE);
    expect(first.places.map((place) => place.key)).toEqual(
      all.slice(0, HOMETOWN_PAGE_SIZE).map((place) => place.key),
    );
    if (first.total > HOMETOWN_PAGE_SIZE) {
      expect(first.status).toBe(
        `Showing 1–${HOMETOWN_PAGE_SIZE} of ${first.total} places in this state.`,
      );
      expect(first.hasNext).toBe(true);
    } else {
      expect(first.status).toBe(
        `All ${first.total} places the game lists in this state.`,
      );
    }
    expect(first.status.toLowerCase()).not.toContain("country");
  });

  it("pages through every match exactly once and clamps out-of-range offsets", () => {
    const first = projectHometownPage("", 0, NEVADA);
    const seen: string[] = [];
    for (let page = 0; page < first.pageCount; page += 1) {
      const slice = projectHometownPage("", page * HOMETOWN_PAGE_SIZE, NEVADA);
      expect(slice.page).toBe(page + 1);
      seen.push(...slice.places.map((place) => place.key));
    }
    expect(new Set(seen).size).toBe(first.total);
    expect(seen).toHaveLength(first.total);

    const beyond = projectHometownPage("", 10_000_000, NEVADA);
    expect(beyond.page).toBe(first.pageCount);
    expect(beyond.hasNext).toBe(false);
    expect(projectHometownPage("", -5, NEVADA).offset).toBe(0);
  });

  it("reports a search with no match without inventing a place", () => {
    const none = projectHometownPage("zzzz-not-a-town", 0, NEVADA);
    expect(none.total).toBe(0);
    expect(none.places).toEqual([]);
    expect(none.status).toBe("Nothing here matches that yet.");
  });
});
