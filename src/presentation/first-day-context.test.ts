import { describe, expect, it } from "vitest";
import { smallWorld } from "../../tests/fixtures/small-world";
import { stableHash } from "../simulation/ids";
import {
  lifePlaceStateIdentities,
  searchLifePlaces,
} from "../simulation/life-places";
import type { EntityId, World } from "../simulation/types";
import { projectStoryMoment } from "./life-story";
import { DEFAULT_NEW_GAME_SETUP } from "./new-game";
import { generateOpeningLife, prepareOpeningLife } from "./opening-life";
import { passOrdinaryDays } from "./ordinary-life";

/**
 * Owner playtest A9 (October 8, 2026): a new life opens with what put the
 * player where they are, in the words of the record that did, and the story
 * director adds no sentence of its own.
 */

/** A new life in a place drawn from all 56 by the seed's hash. */
function newLife(seed: string) {
  const states = lifePlaceStateIdentities();
  const state =
    states[parseInt(stableHash(seed).slice(0, 8), 16) % states.length]!;
  const place = searchLifePlaces("", 1, {
    stateJurisdictionKey: state.jurisdictionKey,
    scope: "locality",
  })[0]!;
  const game = generateOpeningLife(
    prepareOpeningLife({
      ...DEFAULT_NEW_GAME_SETUP,
      seed,
      startAge: 34,
      placeKey: place.key,
    }),
  ).game!;
  return {
    world: game.world,
    personId: game.playerPersonId,
    place: `${place.displayName}, US-${state.usps}`,
  };
}

function arrivalOf(world: World, personId: EntityId) {
  return world.history.events
    .filter(
      (event) =>
        event.type === "life.scene.arrived" &&
        event.occurredAt === world.currentDate &&
        event.participants.some((entry) => entry.personId === personId),
    )
    .at(-1);
}

describe("the first moment of a new life", () => {
  // Seed p6-story-c draws Aberdeen Gardens, Washington.
  const { world, personId, place } = newLife("p6-story-c");

  it("says what put the player where they are, in the record's own words", () => {
    expect(place).toBe("Aberdeen Gardens, Washington, US-WA");
    const arrival = arrivalOf(world, personId);
    expect(arrival, "a new life records where play begins").toBeDefined();
    const moment = projectStoryMoment(world, personId);
    expect(moment.connective.opening).toBe(true);
    expect(moment.connective.sentences[0]).toMatch(/^You're 34, and you live/);
    expect(moment.scene.kind).toBe("ordinary-stretch");
    expect(moment.scene.prose).toBe(arrival!.summary);
    expect(moment.scene.prose).not.toBe("");
  });

  it("stays silent on a later day with no record of what put the player there", () => {
    const later = passOrdinaryDays(world, 1);
    expect(later.currentDate > world.currentDate).toBe(true);
    const moment = projectStoryMoment(later, personId);
    expect(moment.scene.prose).toBe(arrivalOf(later, personId)?.summary ?? "");
  });
});

describe("one rule in all 56 places", () => {
  it("opens every new life with its own narration, and says nothing it has no record for", () => {
    const states = lifePlaceStateIdentities();
    expect(states).toHaveLength(56);
    for (const state of states) {
      const small = smallWorld({ place: state.usps, seed: "p6-a9" });
      const moment = projectStoryMoment(small.world, small.personId);
      expect(moment.connective.opening, state.usps).toBe(true);
      expect(moment.scene.prose, state.usps).toBe(
        arrivalOf(small.world, small.personId)?.summary ?? "",
      );
    }
  });
});
