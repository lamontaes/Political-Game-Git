import { describe, expect, it } from "vitest";

import { produceRebuffedAskEffects } from "./people-trait-occasions";
import {
  answerContact,
  contactProposals,
  produceReachingOut,
  proposeContact,
} from "./people-contact";
import { personTrait, ensurePeopleTraits } from "./people-traits";
import { PEOPLE_MIND_VERSION } from "./people-trait-definitions";
import {
  createNewGameWorld,
  DEFAULT_NEW_GAME_SETUP,
} from "../presentation/new-game";
import {
  openOrdinaryLife,
  passOrdinaryDays,
} from "../presentation/ordinary-life";
import { assertWorldIntegrity, deserializeWorld, serializeWorld } from ".";
import { addDays } from "./dates";
import type { World } from "./types";

/**
 * The first occasion in play that changes somebody.
 *
 * Every other piece of the trait system existed and nothing called the
 * producer, so no temperament had ever moved. Somebody who reaches out and
 * hears nothing back becomes a person who reaches out less — and one such
 * evening does nothing, which is the whole point.
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
    playerId: game.playerPersonId,
  };
}

/** Somebody who has reached out to the player, and whose day has gone by. */
function anAskNobodyAnswered(seed: string) {
  const { world, playerId } = life(seed);
  const reached = produceReachingOut(world, playerId);
  const proposal = contactProposals(reached, playerId).find(
    (entry) => !entry.answered && entry.toPersonId === playerId,
  );
  if (!proposal) return null;
  // Past the evening it was for, without anybody answering it.
  const later = passOrdinaryDays(reached, 10);
  return { world: later, playerId, proposal };
}

describe("somebody reached out and it came to nothing", () => {
  it("does not move anybody on one evening that came to nothing", () => {
    const set = anAskNobodyAnswered("occasion-a");
    expect(set).not.toBeNull();
    if (!set) return;
    const asker = set.proposal.fromPersonId;
    const before = personTrait(
      ensurePeopleTraits(set.world, [asker]),
      asker,
      "sociability",
    );
    const after = produceRebuffedAskEffects(set.world, set.playerId);
    // One evening is not a life. It is recorded, and it changes nothing yet.
    expect(personTrait(after, asker, "sociability").value).toBe(before.value);
    expect(
      after.history.events.some(
        (event) => event.type === "people-mind-v1.trait-unmoved",
      ),
    ).toBe(true);
    assertWorldIntegrity(after);
    expect(deserializeWorld(serializeWorld(after))).toEqual(after);
  });

  it("counts each ask once, however often the day is refreshed", () => {
    const set = anAskNobodyAnswered("occasion-b");
    expect(set).not.toBeNull();
    if (!set) return;
    const once = produceRebuffedAskEffects(set.world, set.playerId);
    const twice = produceRebuffedAskEffects(once, set.playerId);
    // Re-weighing the same evening on every refresh would grind somebody down
    // by repetition, which is the opposite of what recording pressure is for.
    expect(twice).toEqual(once);
  });

  it("leaves an ask still ahead of its day alone", () => {
    const { world, playerId } = life("occasion-c");
    const reached = produceReachingOut(world, playerId);
    const open = contactProposals(reached, playerId).find(
      (entry) => !entry.answered,
    );
    expect(open).toBeDefined();
    expect(open!.on >= reached.currentDate).toBe(true);
    // Waiting is not the same as having gone unanswered, and treating the two
    // alike is the same error as counting a lapsed hold as a refusal.
    expect(produceRebuffedAskEffects(reached, playerId)).toEqual(reached);
  });

  it("names the asks, not merely that something moved", () => {
    const set = anAskNobodyAnswered("occasion-d");
    expect(set).not.toBeNull();
    if (!set) return;
    const after = produceRebuffedAskEffects(set.world, set.playerId);
    const unmoved = after.history.events.find(
      (event) => event.type === "people-mind-v1.trait-unmoved",
    )!;
    // A player must be able to point at the thing that happened. The record
    // carries the day that was asked for and why it did not land.
    expect(unmoved.summary).toMatch(/never heard back/);
    expect(unmoved.involvedEntityIds).toContain(set.proposal.fromPersonId);
    expect(unmoved.context.pressure).not.toBeNull();
  });

  it("never authors the played character", () => {
    // The player can be the asker. Their temperament moves only through their
    // own choices, so nothing is written against them here — not a change, and
    // not the pressure of a failed one.
    const { world, playerId } = life("occasion-e");
    const before = world.history.events.length;
    const after = produceRebuffedAskEffects(world, playerId);
    const written = after.history.events.slice(before);
    for (const event of written) {
      expect(event.involvedEntityIds).not.toContain(playerId);
    }
    expect(
      after.history.personalityTendencies.some(
        (record) =>
          record.personId === playerId &&
          record.scopeTags.some((tag) => tag.startsWith(PEOPLE_MIND_VERSION)),
      ),
    ).toBe(false);
  });
});

describe("the same thing happening again is what moves somebody", () => {
  it("stops somebody asking, once they have been turned down enough", () => {
    const set = anAskNobodyAnswered("occasion-f");
    expect(set).not.toBeNull();
    if (!set) return;
    const asker = set.proposal.fromPersonId;
    let next: World = ensurePeopleTraits(set.world, [asker]);
    const before = personTrait(next, asker, "sociability").value;

    // The same person asking and the player saying no every time, written
    // through the real answer path. Each ask is its own event with its own
    // day, which is what the records have to be able to say afterwards.
    let moved = false;
    let asks = 0;
    for (let index = 0; index < 14 && !moved; index += 1) {
      const proposed = proposeContact(next, {
        stableKey: `occasion-f:ask:${index}`,
        fromPersonId: asker,
        toPersonId: set.playerId,
        on: addDays(next.currentDate, 3),
        purpose: "Asked to meet, again.",
      });
      asks += 1;
      next = answerContact(proposed.world, {
        proposalEventId: proposed.proposal.eventId,
        answer: "decline",
      }).world;
      next = passOrdinaryDays(next, 5);
      next = produceRebuffedAskEffects(next, set.playerId);
      moved = personTrait(next, asker, "sociability").value !== before;
    }

    expect(moved).toBe(true);
    expect(asks).toBeGreaterThan(0);
    expect(personTrait(next, asker, "sociability").value).toBeLessThan(before);
    // What carried it was accumulated pressure, not this one refusal: this
    // person had already been rebuffed before the loop began, and the earlier
    // test holds the other half — a first no on its own moves nobody.
    // And the times it did not move them are all still there to point at.
    expect(
      next.history.events.filter(
        (event) => event.type === "people-mind-v1.trait-unmoved",
      ).length,
    ).toBeGreaterThan(1);
    assertWorldIntegrity(next);
  });
});
