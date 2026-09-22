import { describe, expect, it } from "vitest";

import {
  assertWorldIntegrity,
  deserializeWorld,
  serializeWorld,
} from "../simulation";
import type { EntityId, World } from "../simulation";
import {
  contactBases,
  contactProposals,
  produceReachingOut,
} from "../simulation/people-contact";
import { recordTraitChange } from "../simulation/people-traits";
import { createNewGameWorld, DEFAULT_NEW_GAME_SETUP } from "./new-game";
import { openOrdinaryLife } from "./ordinary-life";

/**
 * The one place a personality makes somebody act rather than answer.
 *
 * Every other trait lean in the game decides how a person responds to
 * something put to them. `produceReachingOut` is the exception: an old
 * acquaintance decides on their own to get back in touch, while ordinary time
 * passes, and the module says as much — the player never has to open their
 * page for it to happen. It had no test of any kind, which is how a trait
 * whose poles are the wrong way round goes unnoticed.
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

/** Set one trait on everybody the player has any basis with. */
function everybody(
  world: World,
  personId: EntityId,
  trait: "sociability" | "reliability",
  value: -2 | 2,
): World {
  let next = world;
  for (const basis of contactBases(world, personId)) {
    const event = [...next.history.events]
      .reverse()
      .find((entry) => entry.involvedEntityIds.includes(basis.personId));
    if (!event) continue;
    next = recordTraitChange(next, {
      personId: basis.personId,
      trait,
      value,
      eventId: event.id,
      reason: `Test: ${trait} at ${value}.`,
    });
  }
  return next;
}

describe("somebody gets back in touch on their own, or does not", () => {
  it("writes a proposal from the other person, not from the player", () => {
    const { world, personId } = life("reach-a");
    // The premise is real: these are people with a recorded long gap.
    expect(
      contactBases(world, personId).some((basis) => basis.gap === "long-gap"),
    ).toBe(true);
    expect(contactProposals(world, personId)).toEqual([]);

    const after = produceReachingOut(world, personId);
    const proposals = contactProposals(after, personId);
    expect(proposals).toHaveLength(1);
    // Theirs, not the player's. This is the whole point of the module.
    expect(proposals[0]!.fromPersonId).not.toBe(personId);
    expect(proposals[0]!.toPersonId).toBe(personId);
    expect(proposals[0]!.answered).toBe(false);
    assertWorldIntegrity(after);
    expect(deserializeWorld(serializeWorld(after))).toEqual(after);
  });

  it("does not happen when nobody is the sort of person who does it", () => {
    // Reserved and letting things slip: the leans that argue for getting in
    // touch find nobody to apply to, and the one that argues for leaving it
    // applies to everybody.
    const { world, personId } = life("reach-a");
    const reserved = everybody(
      everybody(world, personId, "sociability", -2),
      personId,
      "reliability",
      -2,
    );
    expect(contactProposals(produceReachingOut(reserved, personId))).toEqual(
      [],
    );
  });

  it("happens when they are the sort of person who does", () => {
    const { world, personId } = life("reach-b");
    const outgoing = everybody(
      everybody(world, personId, "sociability", 2),
      personId,
      "reliability",
      2,
    );
    const after = produceReachingOut(outgoing, personId);
    expect(contactProposals(after, personId).length).toBeGreaterThan(0);
  });

  it("does not ask again while the first ask is still standing", () => {
    const { world, personId } = life("reach-a");
    const once = produceReachingOut(world, personId);
    const twice = produceReachingOut(once, personId);
    expect(contactProposals(twice, personId)).toEqual(
      contactProposals(once, personId),
    );
    // Idempotent on a reload too, not merely on the same object.
    const reloaded = produceReachingOut(
      deserializeWorld(serializeWorld(once)),
      personId,
    );
    expect(contactProposals(reloaded, personId).length).toBe(
      contactProposals(once, personId).length,
    );
  });
});
