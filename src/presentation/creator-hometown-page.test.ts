import { describe, expect, it } from "vitest";

import { drawRandomPlace } from "../../tests/support/random-place";
import { placeReferencePopulation } from "../simulation/nationwide-world/place-population";
import { placeStartFacts } from "./place-start-summary";
import { lifePlaceSearch } from "../simulation";
import {
  hometownChoiceSubtitle,
  HOMETOWN_PAGE_SIZE,
  projectHometownPage,
} from "./creator-hometown-page";

const seed = "session6-creator-town-subtitle";
const place = drawRandomPlace(
  seed,
  (place) =>
    place.scope === "locality" &&
    Boolean(place.sourceGeoid && placeReferencePopulation(place.sourceGeoid)),
);
const HOME = {
  stateJurisdictionKey: place.stateJurisdictionKey!,
  scope: "locality",
} as const;

describe(`hometown choices (${place.displayName}, ${seed})`, () => {
  it("preserves every place in the searchable pages", () => {
    const first = projectHometownPage("", 0, HOME);
    const all = lifePlaceSearch("", Number.MAX_SAFE_INTEGER, HOME);
    expect(first.total).toBe(all.length);
    expect(first.places.length).toBeLessThanOrEqual(HOMETOWN_PAGE_SIZE);
    expect(first.places.map((place) => place.key)).toEqual(
      all.slice(0, HOMETOWN_PAGE_SIZE).map((place) => place.key),
    );
  });

  it("pages through every match exactly once and clamps out-of-range offsets", () => {
    const first = projectHometownPage("", 0, HOME);
    const seen: string[] = [];
    for (let page = 0; page < first.pageCount; page += 1) {
      const slice = projectHometownPage("", page * HOMETOWN_PAGE_SIZE, HOME);
      expect(slice.page).toBe(page + 1);
      seen.push(...slice.places.map((place) => place.key));
    }
    expect(new Set(seen).size).toBe(first.total);
    expect(seen).toHaveLength(first.total);

    const beyond = projectHometownPage("", 10_000_000, HOME);
    expect(beyond.page).toBe(first.pageCount);
    expect(beyond.hasNext).toBe(false);
    expect(projectHometownPage("", -5, HOME).offset).toBe(0);
  });

  it("shows the actual county and sourced place population without substituting the state", () => {
    const text = hometownChoiceSubtitle(place);
    const population = placeReferencePopulation(place.sourceGeoid!)!;
    expect(text).toContain(
      new Intl.NumberFormat("en-US").format(population.value),
    );
    expect(text).not.toContain("estimate");
    expect(population.source).toMatch(/census-estimate-2025|acs/);
    const county = placeStartFacts(place).find(
      (fact) => fact.kind === "county",
    );
    if (county) expect(text).toContain(county.text);
    expect(text).not.toBe(place.withinName);
  });

  it("reports a search with no match without inventing a place", () => {
    const none = projectHometownPage("zzzz-not-a-town", 0, HOME);
    expect(none.total).toBe(0);
    expect(none.places).toEqual([]);
  });
});
