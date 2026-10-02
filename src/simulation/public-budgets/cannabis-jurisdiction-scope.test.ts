import { describe, expect, it, vi } from "vitest";
import { makeIsoDate } from "../dates";
import type { EntityId, World } from "../types";
import { cannabisSalesRevenueChange } from "./cannabis-sales-revenue";
import { CANNABIS_TAX_EFFECT, TAX_QUESTION_EFFECTS } from "./rules";
import { drawRandomPlace } from "../../../tests/support/random-place";
import { createExplicitGeographyLife } from "../../presentation/new-game-geography";

describe("cannabis reader uses the declared tax jurisdiction scope", () => {
  const date = makeIsoDate("2026-10-02");
  const world = { policyCatalog: { propositions: {} } } as unknown as World;
  const government = {
    level: "county" as const,
    lawJurisdictionId: "jurisdiction_missing" as EntityId,
    population: 0,
  };

  it("keeps an undeclared local budget outside the state tax row", () => {
    expect(cannabisSalesRevenueChange(world, government, date).reason).toBe(
      "not-state-budget",
    );
  });

  it("reads a declared local scope without inventing a governing law or revenue", () => {
    const row = TAX_QUESTION_EFFECTS.find(
      (effect) => effect.questionKey === CANNABIS_TAX_EFFECT.questionKey,
    )!;
    const lookup = vi.spyOn(TAX_QUESTION_EFFECTS, "find").mockReturnValue({
      ...row,
      levels: [government.level],
    });
    try {
      expect(cannabisSalesRevenueChange(world, government, date)).toEqual({
        reason: "question-not-present",
        annualRevenueDelta: 0,
        sourceMeasureId: null,
      });
    } finally {
      lookup.mockRestore();
    }
  });

  it("opens a new game in a recorded random place", () => {
    const seed = "a51-cannabis-jurisdiction-scope-2026-10-02";
    const place = drawRandomPlace(seed);
    console.info("A51 opening", {
      seed,
      placeKey: place.key,
      placeName: place.displayName,
    });
    const opened = createExplicitGeographyLife({ placeKey: place.key, seed });
    expect(opened.game.place.key).toBe(place.key);
    expect(opened.game.world.people[opened.game.playerPersonId]).toBeDefined();
    expect(opened.serialized.length).toBeGreaterThan(0);
  });
});
