import { describe, expect, it } from "vitest";

import { placeStartFacts } from "./place-start-summary";
import { lifePlaceByKey, searchLifePlaces } from "../simulation";

describe("A chosen place is introduced as useful context", () => {
  it("names Lexington without research or capability prose", () => {
    const place = lifePlaceByKey("lexington-fayette")!;
    const facts = placeStartFacts(place);
    const text = facts.map((fact) => fact.text).join("\n");
    expect(facts[0]).toEqual({ kind: "name", text: "Lexington, Kentucky" });
    expect(text).not.toMatch(/exact place this life will be lived in/i);
    expect(text).not.toMatch(/legislature/i);
    expect(text).not.toMatch(/politics/i);
    expect(text).not.toMatch(/voter/i);
    expect(facts.some((fact) => fact.kind === "population")).toBe(false);
  });

  it("does not turn a missing city series into invented numbers", () => {
    const auburn = searchLifePlaces("Auburn", 8, {
      stateJurisdictionKey: "US-AL",
      scope: "locality",
    }).find((place) => /^Auburn,/i.test(place.displayName))!;
    const facts = placeStartFacts(auburn);
    expect(facts[0]?.kind).toBe("name");
    expect(
      facts.every((fact) => fact.kind === "name" || fact.kind === "county"),
    ).toBe(true);
    expect(facts.some((fact) => /population/i.test(fact.text))).toBe(false);
  });
});
