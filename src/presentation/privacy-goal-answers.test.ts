import { describe, expect, it } from "vitest";

import type { EntityId, World } from "../simulation";
import { addDays, ageOnDate } from "../simulation/dates";
import { npcContactAnswer, proposeContact } from "../simulation/people-contact";
import { PRIVACY_GOAL_KEY } from "../simulation/people-goal-pursuit-content";
import {
  activeGoalFor,
  goalConsiderations,
} from "../simulation/people-goal-pursuit";
import { createMindProvenance, recordGoalState } from "../simulation/mind";
import { explicitNewGameSetup } from "./new-game-geography";
import { createOpeningLifeController } from "./opening-life";
import { openOrdinaryLife } from "./ordinary-life";

/**
 * Keeping time for oneself is one reason among many.
 *
 * Eight people are each asked the same ten times, once as they are and once
 * holding a goal of keeping time for themselves, written through the same goal
 * writer the game uses. The goal tips answers toward no, so they say no more
 * often while they hold it; it never decides alone, so some of them still say
 * yes while they hold it.
 */

const ASKS = 10;
const PEOPLE = 8;

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
      on: addDays(world.currentDate, 2 + ask),
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

/** The same goal record `establishLifePersonality` writes, for this person. */
function withPrivacyGoal(world: World, personId: EntityId): World {
  return recordGoalState(world, {
    stableKey: `privacy-goal-answers:${personId}`,
    personId,
    goalKey: PRIVACY_GOAL_KEY,
    recordedAt: world.currentDate,
    objective: "Keep some time for themselves.",
    domain: "life:ordinary",
    scope: "personal",
    priority: "moderate",
    status: "active",
    targetEntityId: null,
    deadline: null,
    outcome: null,
    provenance: createMindProvenance("authored", {
      note: "Test: the same person compared with and without this goal.",
    }),
    replacesGoalId: null,
    supersedesGoalStateId: null,
  });
}

describe("A goal of keeping time for oneself", () => {
  it("makes people say no more often, and does not decide alone", () => {
    const { world, playerId } = openLife();
    const people = (Object.keys(world.people) as EntityId[])
      .filter(
        (id) =>
          id !== playerId &&
          ageOnDate(world.people[id]!.birthDate, world.currentDate) >= 18 &&
          activeGoalFor(world, id, PRIVACY_GOAL_KEY) === null,
      )
      .sort()
      .slice(0, PEOPLE);
    expect(people).toHaveLength(PEOPLE);

    let withGoal = 0;
    let withoutGoal = 0;
    for (const person of people) {
      const holding = withPrivacyGoal(world, person);
      expect(activeGoalFor(holding, person, PRIVACY_GOAL_KEY)).not.toBeNull();
      withGoal += declines(holding, playerId, person);
      withoutGoal += declines(world, playerId, person);
    }
    // More no answers with the goal than without it, over the same asks.
    expect(withGoal).toBeGreaterThan(withoutGoal);
    // And not every answer is no: the goal tips answers, it does not decide.
    expect(withGoal).toBeLessThan(PEOPLE * ASKS);
    // It counts as one slight reason, whatever priority the goal was given
    // (Lamontae, September 27, 2026).
    const lean = goalConsiderations(
      withPrivacyGoal(world, people[0]!),
      people[0]!,
      "privacy-goal-answers:weight",
      [
        {
          optionKey: "decline",
          goalKey: PRIVACY_GOAL_KEY,
          direction: "supports",
          explanation: "They have been keeping time for themselves.",
        },
      ],
    );
    expect(lean.map((entry) => entry.importance)).toEqual(["slight"]);
  }, 180_000);
});
