import { describe, expect, it } from "vitest";
import { DEFAULT_NEW_GAME_SETUP } from "../../presentation/new-game";
import {
  generateOpeningLife,
  prepareOpeningLife,
} from "../../presentation/opening-life";
import type { EntityId } from "../index";
import { RESEARCHED_PLACE_KEYS } from "../statutory-tax-rules";
import { officialsBehind } from "./official-views";

describe("the officials a law's reader weighs are real people", () => {
  const world = generateOpeningLife(
    prepareOpeningLife({
      ...DEFAULT_NEW_GAME_SETUP,
      seed: "official-views-congress-subjects",
      startAge: 34,
    }),
  ).game!.world;

  it("names a seated member of Congress by their person id for a federal law", () => {
    const acts = officialsBehind(
      world,
      "starting-law:US:any-question" as EntityId,
    );
    expect(acts.length).toBeGreaterThan(0);
    for (const act of acts) expect(world.people[act.officialId]).toBeDefined();
  });

  it.each(RESEARCHED_PLACE_KEYS)(
    "names only people in the world for the %s starting law",
    (place) => {
      const acts = officialsBehind(
        world,
        `starting-law:US-${place}:any-question` as EntityId,
      );
      for (const act of acts)
        expect(world.people[act.officialId]).toBeDefined();
    },
  );
});
