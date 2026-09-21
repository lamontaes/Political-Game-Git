import { describe, expect, it } from "vitest";

import {
  TEST_JURISDICTIONS,
  chamberKeyFor,
  jurisdictionFor,
  legislativeOfficeKey,
} from "./e2e/support/jurisdictions";
import { resolvePlayGeography } from "../src/presentation/new-game-geography";
import { searchLifePlaces } from "../src/simulation";

/**
 * The browser suite's set of start places, checked against the live world.
 *
 * The table exists so the browser suite stops proving the game works in one
 * town. That only holds while every row still describes a real place with the
 * legislature it claims, so this reads each row back out of the geography
 * rather than trusting the literal it was written with.
 */
describe("the browser suite's start places", () => {
  it("names places the creator can actually resolve", () => {
    for (const jurisdiction of TEST_JURISDICTIONS) {
      const geography = resolvePlayGeography(jurisdiction.placeKey);
      expect(
        geography.selectedLocalityDisplayName,
        `${jurisdiction.name} resolved elsewhere`,
      ).toBe(`${jurisdiction.place}, ${jurisdiction.state}`);
      expect(geography.placeScope).toBe("locality");
    }
  });

  it("is reachable through the creator's own state-then-town search", () => {
    for (const jurisdiction of TEST_JURISDICTIONS) {
      const geography = resolvePlayGeography(jurisdiction.placeKey);
      const matches = searchLifePlaces(jurisdiction.place, 20, {
        stateJurisdictionKey: geography.selectedStateJurisdictionKey!,
        scope: "locality",
      });
      expect(
        matches.map((place) => place.key),
        `${jurisdiction.name} is not findable by its own town search`,
      ).toContain(jurisdiction.placeKey);
    }
  });

  it("records each state legislature as the pack actually shipped", () => {
    for (const jurisdiction of TEST_JURISDICTIONS) {
      const geography = resolvePlayGeography(jurisdiction.placeKey);
      expect(geography.legislativeRulePackId).toBe(jurisdiction.packId);
      expect(geography.discoveredOfficeKeys).toEqual(
        jurisdiction.chamberKeys.map(
          (chamber) => `${jurisdiction.packId}:${chamber}`,
        ),
      );
      expect(geography.municipalGovernmentKey !== null).toBe(
        jurisdiction.municipal,
      );
    }
  });

  it("offers a legislative seat the browser will actually list", () => {
    for (const jurisdiction of TEST_JURISDICTIONS) {
      const geography = resolvePlayGeography(jurisdiction.placeKey);
      for (const choice of ["lower", "upper"] as const) {
        expect(geography.discoveredOfficeKeys).toContain(
          legislativeOfficeKey(jurisdiction, choice),
        );
      }
    }
  });

  it("covers more than one shape of legislature and of local government", () => {
    const packs = new Set(TEST_JURISDICTIONS.map((entry) => entry.packId));
    expect(packs.size).toBe(TEST_JURISDICTIONS.length);

    const unicameral = TEST_JURISDICTIONS.filter(
      (entry) => entry.chamberKeys.length === 1,
    );
    expect(
      unicameral.length,
      "no unicameral legislature in the set",
    ).toBeGreaterThan(0);

    const lowerChambers = new Set(
      TEST_JURISDICTIONS.map((entry) => chamberKeyFor(entry, "lower")),
    );
    expect(
      lowerChambers.size,
      "every lower chamber in the set is called the same thing",
    ).toBeGreaterThan(1);

    expect(
      TEST_JURISDICTIONS.some((entry) => entry.municipal),
      "no place with a municipal government",
    ).toBe(true);
    expect(
      TEST_JURISDICTIONS.some((entry) => !entry.municipal),
      "no place without a municipal government",
    ).toBe(true);
  });

  it("spreads unnamed callers across the set, and does so repeatably", () => {
    const keys = [
      "ui-core",
      "people-web",
      "narrative-life",
      "scene-first-shell",
      "production-play",
      "morning23-b",
      "places11",
      "career-path7",
      "next24-personal-routine",
      "conversation-controls",
      "world39-news-journal",
      "recovery25-budget",
    ];
    const chosen = keys.map((key) => jurisdictionFor(key).name);
    expect(
      new Set(chosen).size,
      `twelve callers landed in ${new Set(chosen).size} place(s): ${chosen.join(", ")}`,
    ).toBeGreaterThanOrEqual(5);
    for (const key of keys) {
      expect(jurisdictionFor(key)).toBe(jurisdictionFor(key));
    }
  });
});
