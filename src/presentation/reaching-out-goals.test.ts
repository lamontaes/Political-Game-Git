import { describe, expect, it } from "vitest";

import {
  contactBases,
  contactProposals,
  produceReachingOut,
} from "../simulation/people-contact";
import {
  activeGoalFor,
  activeOrdinaryGoals,
} from "../simulation/people-goal-pursuit";
import { createNewGameWorld, DEFAULT_NEW_GAME_SETUP } from "./new-game";
import { openOrdinaryLife } from "./ordinary-life";

/**
 * A private goal reaching a decision somebody makes for themselves.
 *
 * `produceReachingOut` is the one place in the game where an NPC acts rather
 * than answers, so it is where a goal first becomes visible as behavior. This
 * walks the real producer over a real life: nobody's goal is asserted from a
 * fixture's own arithmetic, and the step has to land on the proposal that the
 * producer actually wrote.
 */
function life(seed: string) {
  const game = createNewGameWorld({
    ...DEFAULT_NEW_GAME_SETUP,
    startKind: "custom",
    seed,
    startAge: 40,
    depth: "summarize-earlier-life",
    questionnaire: "skipped",
    placeKey: "kentucky",
    household: "shares-a-home",
  });
  return {
    world: openOrdinaryLife(game.world, game.playerPersonId),
    personId: game.playerPersonId,
  };
}

/**
 * Six seeds, walked, because one is not a measurement.
 *
 * Measured on this branch after the wiring: all six of these lives had somebody
 * ring, and in three of them the person who rang was pursuing connection, so
 * both branches below are reached. Before the wiring the first seed produced no
 * proposal at all — a test pinned to it would have passed by never reaching the
 * case, which is the failure mode this spread exists to prevent.
 */
const SEEDS = [
  "reach-goal-a",
  "reach-goal-b",
  "reach-a",
  "goal-seed-1",
  "goal-seed-2",
  "goal-seed-3",
] as const;

describe("somebody's own goal reaches the choice to get in touch", () => {
  it("records a step exactly when the person who rang was pursuing connection", () => {
    let proposalsSeen = 0;
    let stepsRecorded = 0;

    for (const seed of SEEDS) {
      const { world, personId } = life(seed);
      // The premise is real: these are people with a recorded long gap.
      expect(
        contactBases(world, personId).some((basis) => basis.gap === "long-gap"),
      ).toBe(true);

      const after = produceReachingOut(world, personId);
      const proposal = contactProposals(after, personId).at(-1);
      if (!proposal) continue;
      proposalsSeen += 1;

      const goal = activeGoalFor(
        after,
        proposal.fromPersonId,
        "opening-life:connection",
      );
      const step =
        goal?.provenance.sourceRefs.some(
          (ref) =>
            ref.kind === "historical-event" && ref.eventId === proposal.eventId,
        ) ?? false;

      if (goal === null) {
        // Somebody rang for their own reasons. Nothing is recorded against a
        // goal they are not pursuing.
        expect(step).toBe(false);
        continue;
      }
      stepsRecorded += 1;
      expect(step).toBe(true);
      // Still being pursued: ringing one person is not finishing it.
      expect(goal.status).toBe("active");
    }

    // The instrument has to have touched the thing it measures.
    expect(proposalsSeen).toBeGreaterThan(0);
    expect(stepsRecorded).toBeGreaterThan(0);
  });

  it("never advances a goal that was only held", () => {
    for (const seed of SEEDS) {
      const { world, personId } = life(seed);
      const after = produceReachingOut(world, personId);
      const rang = new Set(
        contactProposals(after, personId).map(
          (proposal) => proposal.fromPersonId,
        ),
      );
      for (const basis of contactBases(after, personId)) {
        if (rang.has(basis.personId)) continue;
        for (const goal of activeOrdinaryGoals(after, basis.personId)) {
          // Nobody's goal moved because they were holding it.
          expect(goal.outcome).toBe(null);
        }
      }
    }
  });
});
