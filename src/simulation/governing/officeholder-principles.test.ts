import { describe, expect, it } from "vitest";

import { DEFAULT_NEW_GAME_SETUP } from "../../presentation/new-game";
import {
  generateOpeningLife,
  prepareOpeningLife,
} from "../../presentation/opening-life";
import { searchLifePlaces } from "../index";
import type {
  EntityId,
  LegislativeMeasureRecord,
  PrincipleRecord,
  World,
} from "../types";
import {
  ensureOfficeholderPrinciples,
  principledLeaning,
  principleVoteConsideration,
} from "./officeholder-principles";

/**
 * A sitting officeholder's own principles: drawn once, never for the player,
 * and read into a leaning on a question and a reason to vote on a bill.
 */

function openingWorld(): { world: World; playerPersonId: EntityId } {
  const place = searchLifePlaces("", 1, {
    stateJurisdictionKey: "US-OR",
    scope: "locality",
  })[0]!;
  const game = generateOpeningLife(
    prepareOpeningLife({
      ...DEFAULT_NEW_GAME_SETUP,
      seed: "officeholder-principles-US-OR",
      placeKey: place.key,
      startAge: 40,
      questionnaire: "skipped",
    }),
  ).game!;
  return { world: game.world, playerPersonId: game.playerPersonId };
}

const { world, playerPersonId } = openingWorld();
const alreadyHeld = new Set(world.history.principles.map((r) => r.personId));
const people = world.personOrder
  .filter((id) => id !== playerPersonId && !alreadyHeld.has(id))
  .slice(0, 12);
const drawn = ensureOfficeholderPrinciples(world, people);

function billAnswering(
  propositionId: EntityId,
  answer: "yes" | "no",
): LegislativeMeasureRecord {
  return {
    propositionAnswers: [{ propositionId, answer }],
  } as Partial<LegislativeMeasureRecord> as LegislativeMeasureRecord;
}

/** A question some drawn principle bears on, and a person it moves. */
function engaged(next: World): {
  personId: EntityId;
  propositionId: EntityId;
  score: number;
} {
  for (const personId of people)
    for (const propositionId of next.policyCatalog.propositionOrder) {
      const { score } = principledLeaning(next, personId, propositionId);
      if (score !== 0) return { personId, propositionId, score };
    }
  throw new Error("No drawn principle bears on any question.");
}

describe("officeholder principles", () => {
  it("draws principles for officeholders from the catalog", () => {
    expect(world.policyCatalog.principleOrder.length).toBeGreaterThan(0);
    const holders = new Set(
      drawn.history.principles.map((record) => record.personId),
    );
    expect(holders.size).toBeGreaterThan(people.length / 2);
    for (const record of drawn.history.principles.slice(
      world.history.principles.length,
    ))
      expect(record.formation.reason).toBe("reflection:initial");
  });

  it("is seeded and draws only once", () => {
    const again = ensureOfficeholderPrinciples(drawn, people);
    expect(again.history.principles).toHaveLength(
      drawn.history.principles.length,
    );
    const twin = ensureOfficeholderPrinciples(openingWorld().world, people);
    const shape = (records: readonly PrincipleRecord[]) =>
      records.map((r) => [r.personId, r.principleId, r.stance, r.conviction]);
    expect(shape(twin.history.principles)).toEqual(
      shape(drawn.history.principles),
    );
  });

  it("never draws the player's mind", () => {
    expect(world.control).toMatchObject({ personId: playerPersonId });
    const player = playerPersonId;
    const after = ensureOfficeholderPrinciples(world, [player, ...people]);
    expect(
      after.history.principles.filter((record) => record.personId === player),
    ).toHaveLength(
      world.history.principles.filter((record) => record.personId === player)
        .length,
    );
  });

  it("reads a leaning into a vote for a bill that answers it their way, and against one that does not", () => {
    const { personId, propositionId, score } = engaged(drawn);
    const theirWay = score > 0 ? "yes" : "no";
    const otherWay = score > 0 ? "no" : "yes";
    const forIt = principleVoteConsideration(
      drawn,
      personId,
      billAnswering(propositionId, theirWay),
    );
    const against = principleVoteConsideration(
      drawn,
      personId,
      billAnswering(propositionId, otherWay),
    );
    expect(forIt?.optionKey).toBe("vote-yea");
    expect(against?.optionKey).toBe("vote-nay");
    expect(forIt?.sourceRefs.length).toBeGreaterThan(0);
    expect(forIt?.sourceRefs[0]?.kind).toBe("political-principle");
  });

  it("gives no principled reason on a bill that answers nothing", () => {
    const { personId } = engaged(drawn);
    expect(
      principleVoteConsideration(drawn, personId, {
        propositionAnswers: [],
      } as Partial<LegislativeMeasureRecord> as LegislativeMeasureRecord),
    ).toBeNull();
  });
});
