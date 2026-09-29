import { describe, expect, it } from "vitest";

import type { EntityId, FavorWeight, World } from "../simulation";
import { addDays, ageOnDate } from "../simulation/dates";
import { feltDebtConsiderations, recordFavor } from "../simulation/favors";
import { currentLifeCutoff } from "../simulation/life-queries";
import { recordWorldEvent } from "../simulation/world";
import { npcContactAnswer, proposeContact } from "../simulation/people-contact";
import { isPersonAliveAt } from "../simulation/vitality-integrity";
import { explicitNewGameSetup } from "./new-game-geography";
import { createOpeningLifeController } from "./opening-life";
import { openOrdinaryLife } from "./ordinary-life";

/**
 * Help that changed someone's life still changes their answer years later.
 *
 * A new life in Billings, Montana (a place drawn at random from all 56). The
 * player asks eight neighbors to meet, ten times each: once as things are, and
 * once after the player did each of them a favor three years earlier. A
 * life-changing favor still feels owed and tips answers toward yes; a slight
 * one has long faded and changes nothing.
 */

const ASKS = 10;
const PEOPLE = 8;
const YEARS_AGO = 3;

function openLife() {
  const game = createOpeningLifeController(
    explicitNewGameSetup({
      placeKey: "3006550",
      seed: "lasting-favor-billings",
      startAge: 30 as never,
      depth: "summarize-earlier-life",
    }),
  ).finishTransition().game!;
  const playerId = game.playerPersonId;
  return { world: openOrdinaryLife(game.world, playerId), playerId };
}

/** The player helped this person three years before today. */
function helpedYearsAgo(
  world: World,
  playerId: EntityId,
  personId: EntityId,
  weight: FavorWeight,
): World {
  const givenAt = addDays(world.currentDate, -365 * YEARS_AGO);
  const spoken = recordWorldEvent(world, {
    stableKey: `lasting-favor:${personId}:${weight}:help`,
    type: "life.conversation",
    occurredAt: givenAt,
    recordedAt: world.currentDate,
    jurisdictionId: null,
    involvedEntityIds: [playerId, personId],
    participants: [
      { personId: playerId, role: "focus:subject", detail: "Helped" },
      { personId, role: "presence:participant", detail: "Was helped" },
    ],
    personFactConstraints: [],
    visibility: "private",
    tags: ["lasting-favor-test"],
    summary: "They helped them through a hard year.",
    context: {
      location: null,
      socialContext: null,
      pressure: null,
      choice: null,
      motivation: null,
      immediateReaction: null,
    },
  });
  return recordFavor(spoken, {
    stableKey: `lasting-favor:${personId}:${weight}`,
    giverPersonId: playerId,
    receiverPersonId: personId,
    kind: "personal:help",
    description: "helped them through a hard year",
    givenAt,
    eventId: spoken.history.events.at(-1)!.id,
    subject: { kind: "none" },
    motive: "kindness",
    weight,
    audience: "private",
    witnessPersonIds: [],
    inReturnForFavorId: null,
    undertakingId: null,
  });
}

function yeses(world: World, playerId: EntityId, personId: EntityId): number {
  let yes = 0;
  for (let ask = 0; ask < ASKS; ask += 1) {
    const proposed = proposeContact(world, {
      stableKey: `lasting-favor:${personId}:${ask}`,
      fromPersonId: playerId,
      toPersonId: personId,
      on: addDays(world.currentDate, 2 + ask),
      purpose: `To catch up (${ask})`,
      answerInPerson: true,
    });
    if (
      npcContactAnswer(proposed.world, proposed.proposal.eventId).answer ===
      "accept"
    )
      yes += 1;
  }
  return yes;
}

describe("a favor years ago, in Billings, Montana", () => {
  const { world, playerId } = openLife();
  const neighbors = world.personOrder
    .filter(
      (id) =>
        id !== playerId &&
        isPersonAliveAt(world, id, currentLifeCutoff(world)) &&
        ageOnDate(world.people[id]!.birthDate, world.currentDate) >= 21,
    )
    .slice(0, PEOPLE);

  it("still feels owed when it changed their life, and has faded when it was slight", () => {
    expect(neighbors).toHaveLength(PEOPLE);
    for (const personId of neighbors) {
      const great = helpedYearsAgo(world, playerId, personId, "life-changing");
      const owed = feltDebtConsiderations(
        great,
        personId,
        playerId,
        "t",
        "accept",
      );
      expect(owed).toHaveLength(1);
      expect(owed[0]!.explanation).toBe(
        "The one asking once helped them through a hard year, and it still feels owed.",
      );
      const slight = helpedYearsAgo(world, playerId, personId, "slight");
      expect(
        feltDebtConsiderations(slight, personId, playerId, "t", "accept"),
      ).toEqual([]);
    }
  });

  it("tips their answers toward yes when the player asks, years later", () => {
    let before = 0;
    let afterGreat = 0;
    let afterSlight = 0;
    for (const personId of neighbors) {
      before += yeses(world, playerId, personId);
      afterGreat += yeses(
        helpedYearsAgo(world, playerId, personId, "life-changing"),
        playerId,
        personId,
      );
      afterSlight += yeses(
        helpedYearsAgo(world, playerId, personId, "slight"),
        playerId,
        personId,
      );
    }
    expect(afterGreat).toBeGreaterThan(before);
    expect(afterSlight).toBe(before);
  }, 30_000); // Measured at 4.3 to 5.6 s with main merged (9/29), past the 5 s default under load.
});
