import { describe, expect, it } from "vitest";
import { createNewGameWorld, DEFAULT_NEW_GAME_SETUP } from "./new-game";
import {
  ensureLivingWorldDevelopments,
  ensureOpeningPriorLocalRecords,
  developmentStepTransitionHandler,
  DEVELOPMENT_STEP_TRANSITION_KEY,
} from "../simulation/living-world/developments";
import { addDays } from "../simulation/dates";
import { scheduleFutureDueItem } from "../simulation/future-transitions";

describe("synthetic news retirement", () => {
  it("does not seed headlines, archived proposals, or future synthetic developments", () => {
    const game = createNewGameWorld({
      ...DEFAULT_NEW_GAME_SETUP,
      seed: "retired-developments",
      startAge: 8,
    });
    const world = game.world;
    expect(ensureLivingWorldDevelopments(world, game.playerPersonId)).toBe(
      world,
    );
    expect(ensureOpeningPriorLocalRecords(world, game.playerPersonId)).toBe(
      world,
    );
    const scheduled = scheduleFutureDueItem(world, {
      stableKey: "retired:step:1",
      dueAt: addDays(world.currentDate, 1),
      transitionKey: DEVELOPMENT_STEP_TRANSITION_KEY,
      entityIds: [world.id],
      jurisdictionId: null,
      provenance: { kind: "initialization", reference: "retirement-test" },
    });
    const due = scheduled.history.futureDueItems.at(-1)!;
    const result = developmentStepTransitionHandler(scheduled, due);
    expect(result.status).toBe("cancelled");
    expect(result.world).toBe(scheduled);
    expect(result.outcomeEventId).toBeNull();
    expect(result.world.history.futureDueItems).toHaveLength(
      scheduled.history.futureDueItems.length,
    );
  });
});
