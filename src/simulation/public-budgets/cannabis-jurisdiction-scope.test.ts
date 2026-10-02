import { describe, expect, it } from "vitest";
import type { EntityId } from "../types";
import {
  fixture,
  dispatch,
} from "../../../tests/fixtures/cannabis-tax-fixture";
import { readPublicTaxReceipts } from "../../presentation/tax-work";
import { advanceWorld } from "../world";
import { createTaxTransitionHandlerRegistry } from "../tax-policy";
import { drawRandomPlace } from "../../../tests/support/random-place";
import { createExplicitGeographyLife } from "../../presentation/new-game-geography";

describe("cannabis reader uses the declared tax jurisdiction scope", () => {
  it("keeps an undeclared local budget outside the state tax row", () => {
    const f = fixture();
    // The fixture enacts an explicitly authored levy. Its actual collection,
    // not a population-based revenue forecast, belongs to its saved government.
    const world = advanceWorld(
      dispatch(f.world, f.context),
      2,
      createTaxTransitionHandlerRegistry(),
    );
    const jurisdictionId = world.history.taxProposals![0]!.jurisdictionId;
    expect(readPublicTaxReceipts(world, jurisdictionId)).toHaveLength(1);
    expect(
      readPublicTaxReceipts(world, "jurisdiction_missing" as EntityId),
    ).toEqual([]);
  });

  it("reads a declared local scope without inventing a governing law or revenue", () => {
    const f = fixture();
    const world = {
      ...f.world,
      policyCatalog: { ...f.world.policyCatalog, propositions: {} },
    };
    expect(dispatch(world, f.context)).toBe(world);
    expect(world.history.taxAssessments ?? []).toHaveLength(0);
    expect(
      readPublicTaxReceipts(
        world,
        world.history.taxProposals![0]!.jurisdictionId,
      ),
    ).toEqual([]);
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
