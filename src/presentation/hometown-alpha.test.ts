import { describe, expect, it } from "vitest";

import { searchLifePlaces } from "../simulation";

describe("hometown results are alphabetical before the limit", () => {
  it("orders an empty Kentucky list by displayName, not authored-first Lexington", () => {
    const firstPage = searchLifePlaces("", 12, {
      stateJurisdictionKey: "US-KY",
      scope: "locality",
    });
    expect(firstPage.length).toBe(12);
    const names = firstPage.map((place) => place.displayName);
    expect([...names].sort((a, b) => a.localeCompare(b, "en", { sensitivity: "base" }))).toEqual(
      names,
    );
    expect(firstPage[0]?.key).not.toBe("lexington-fayette");
    expect(firstPage.some((place) => place.key === "lexington-fayette")).toBe(
      false,
    );
  });

  it("still finds Lexington by player-facing name after the same-state limit", () => {
    const hits = searchLifePlaces("Lexington", 20, {
      stateJurisdictionKey: "US-KY",
      scope: "locality",
    });
    expect(hits.some((place) => place.key === "lexington-fayette")).toBe(true);
    expect(hits.every((place) => place.displayName.length > 0)).toBe(true);
  });

  it("keeps same-state pagination deterministic across pages", () => {
    const page1 = searchLifePlaces("", 8, {
      stateJurisdictionKey: "US-KY",
      scope: "locality",
    });
    const page2 = searchLifePlaces("", 16, {
      stateJurisdictionKey: "US-KY",
      scope: "locality",
    });
    expect(page2.slice(0, 8).map((place) => place.key)).toEqual(
      page1.map((place) => place.key),
    );
  });
});
