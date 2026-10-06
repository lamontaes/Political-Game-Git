import { describe, expect, it } from "vitest";

import { explicitNewGameSetup } from "../presentation/new-game-geography";
import {
  generateOpeningLife,
  prepareOpeningLife,
} from "../presentation/opening-life";
import { openOrdinaryLife } from "../presentation/ordinary-life";
import { createCampaignElectionTransitionRegistry } from "./campaigns";
import { candidateSlateSummary } from "./candidate-slate-summary";
import { lifePlaces } from "./life-places";
import { SeededRng } from "./rng";
import { advanceWorld } from "./world";

describe("candidate slate summaries", () => {
  it("matches person and people to the candidate count", () => {
    expect(candidateSlateSummary(1, "Mayor")).toBe(
      "1 person entered the race for Mayor.",
    );
    expect(candidateSlateSummary(2, "Mayor")).toBe(
      "2 people entered the race for Mayor.",
    );
  });

  it("uses singular wording for a one-person slate in a fresh generated game", () => {
    const seed = "bg16-fresh-1791294376777";
    const place = new SeededRng(seed).pick(lifePlaces());
    const game = generateOpeningLife(
      prepareOpeningLife({
        ...explicitNewGameSetup({ placeKey: place.key, seed }),
        startAge: 40,
      }),
    ).game!;
    let world = openOrdinaryLife(game.world, game.playerPersonId);
    let slate = world.history.events.find(
      (event) =>
        event.type === "election.state-legislative-candidate-slate" &&
        event.participants.length === 1,
    );

    for (let elapsed = 0; elapsed < 900 && !slate; elapsed += 30) {
      world = advanceWorld(
        world,
        30,
        createCampaignElectionTransitionRegistry(),
      );
      slate = world.history.events.find(
        (event) =>
          event.type === "election.state-legislative-candidate-slate" &&
          event.participants.length === 1,
      );
    }

    expect(slate).toBeDefined();
    expect(slate!.summary).toMatch(/^1 person entered the race for /);
    expect(slate!.summary).not.toContain("1 people");
    console.log(
      `BG-16 generated-world proof: ${place.displayName}, seed ${seed}, world ${world.id}, date ${world.currentDate}, event ${slate!.id}`,
    );
  }, 120_000);
});
