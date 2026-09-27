import { describe, expect, it } from "vitest";

import type { EntityId, World } from "../simulation";
import { addDays, ageOnDate } from "../simulation/dates";
import { npcContactAnswer, proposeContact } from "../simulation/people-contact";
import { PRIVACY_GOAL_KEY } from "../simulation/people-goal-pursuit-content";
import { activeGoalFor, settleGoal } from "../simulation/people-goal-pursuit";
import { explicitNewGameSetup } from "./new-game-geography";
import { createOpeningLifeController } from "./opening-life";
import { openOrdinaryLife } from "./ordinary-life";

/**
 * Keeping time for oneself is one reason among many.
 *
 * The same person is asked the same forty times, once while they hold a goal
 * of keeping time for themselves and once after that goal is set aside through
 * the ordinary goal writer. The goal tips answers toward no, so they say no
 * more often while they hold it; it never decides alone, so they still say yes
 * to some of the same asks.
 */

const ASKS = 40;

function openLife() {
  const game = createOpeningLifeController(
    explicitNewGameSetup({
      placeKey: "3260600",
      seed: "privacy-goal-answers",
      startAge: 30 as never,
      depth: "summarize-earlier-life",
    }),
  ).finishTransition().game!;
  const playerId = game.playerPersonId;
  return { world: openOrdinaryLife(game.world, playerId), playerId };
}

function declines(world: World, playerId: EntityId, personId: EntityId) {
  let no = 0;
  for (let ask = 0; ask < ASKS; ask += 1) {
    const proposed = proposeContact(world, {
      stableKey: `privacy-goal-answers:${ask}`,
      fromPersonId: playerId,
      toPersonId: personId,
      on: addDays(world.currentDate, 2 + (ask % 40)),
      purpose: `To catch up (${ask})`,
      answerInPerson: true,
    });
    const answered = npcContactAnswer(
      proposed.world,
      proposed.proposal.eventId,
    );
    if (answered.answer === "decline") no += 1;
  }
  return no;
}

describe("A goal of keeping time for oneself", () => {
  it("makes the same person say no more often, and never every time", () => {
    const { world, playerId } = openLife();
    const person = (Object.keys(world.people) as EntityId[])
      .filter(
        (id) =>
          id !== playerId &&
          ageOnDate(world.people[id]!.birthDate, world.currentDate) >= 18,
      )
      .sort()
      .find((id) => activeGoalFor(world, id, PRIVACY_GOAL_KEY));
    expect(person).toBeDefined();
    const goal = activeGoalFor(world, person!, PRIVACY_GOAL_KEY)!;
    const without = settleGoal(world, {
      goal,
      status: "abandoned",
      reasonKey: "test:compare",
      reason: "Set aside so the same asks can be compared without it.",
    });
    expect(activeGoalFor(without, person!, PRIVACY_GOAL_KEY)).toBeNull();

    const withGoal = declines(world, playerId, person!);
    const withoutGoal = declines(without, playerId, person!);
    expect(withGoal).toBeGreaterThan(withoutGoal);
    expect(withGoal).toBeLessThan(ASKS);
  }, 180_000);
});
