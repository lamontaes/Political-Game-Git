/**
 * The public figures' record is dated by the opening at the latest, in the
 * world the owner plays. On the seed that stopped the build ("Cannot learn a
 * future fact"), a resident who came of age to follow politics on the
 * opening day itself had the officeholders' names learned a day after the
 * opening: awareness age counted in mean years (365.25 days) fell a day past
 * their birthday. The seed is named so a regression is found here.
 */
import { describe, expect, it } from "vitest";
import { buildBenchWorld } from "../bench/world";
import { PAST_MODULE_ID } from "./past-module";
import { figureKey } from "./past-public";
import { coreAPI } from "./state";

const seed = "12195dbfc321172d";

describe(`the past's public figures (seed ${seed})`, () => {
  it("opens, and no one learned of an officeholder after the opening", () => {
    // The date the failure was found on (an opening date the tests use).
    const opening = "2026-10-12";
    const world = buildBenchWorld(seed, opening, { twoLevel: true });
    const api = coreAPI(world.core);
    const figures = api
      .moduleState(PAST_MODULE_ID)
      .table("figures")
      .rows() as unknown as { personId: string }[];
    expect(figures.length).toBeGreaterThan(0);
    let known = 0;
    for (const person of world.core.people.values()) {
      for (const figure of figures) {
        const fact = api.knows(person.id, figureKey(figure.personId));
        if (!fact) continue;
        known += 1;
        expect(
          fact.learnedAt <= opening,
          `${person.id} ${figure.personId}`,
        ).toBe(true);
      }
    }
    expect(known).toBeGreaterThan(0);
  }, 300_000);
});
