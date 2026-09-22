import { describe, expect, it } from "vitest";

import {
  describeTraitResistance,
  traitResistance,
  weighTraitChange,
  type TraitResistance,
} from "./trait-resistance";
import { loadedTraitRegistry } from "./trait-registry";
import { PEOPLE_MIND_VERSION, peopleTraitId } from "./people-trait-definitions";
import { attemptTraitChange, traitChangePressure } from "./people-trait-change";
import { ensurePeopleTraits, personTrait } from "./people-traits";
import {
  createNewGameWorld,
  DEFAULT_NEW_GAME_SETUP,
} from "../presentation/new-game";
import { openOrdinaryLife } from "../presentation/ordinary-life";
import { assertWorldIntegrity, deserializeWorld, serializeWorld } from ".";
import type { EntityId, World } from "./types";

/**
 * Resistance is read from a life. These tests are about that claim: two people
 * who have lived differently resist differently, and nothing anywhere stores
 * how stubborn anybody is.
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

/** Somebody other than the player, and an event that involves them. */
function somebody(world: World, playerId: EntityId) {
  const personId = (Object.keys(world.people) as EntityId[]).find(
    (id) => id !== playerId,
  )!;
  const eventId = [...world.history.events]
    .reverse()
    .find((event) => event.involvedEntityIds.includes(personId))!.id;
  return { personId, eventId };
}

const registry = loadedTraitRegistry();
const sociability = registry.traits.get(`${PEOPLE_MIND_VERSION}:sociability`)!;

describe("what a chain of records says about how movable somebody is", () => {
  it("says nothing at all about somebody the world never wrote down", () => {
    const { world, playerId } = life("resist-a");
    const { personId } = somebody(world, playerId);
    const reading = traitResistance(
      world,
      personId,
      sociability,
      peopleTraitId("sociability"),
    );
    // The state that matters. A person with no record is not maximally
    // movable; the question has no answer yet.
    expect(reading.state).toBe("unestablished");
    expect(
      describeTraitResistance("Dana", { state: "unestablished" }),
    ).toContain("Nobody has seen enough");
  });

  it("never moves an unestablished trait, whatever force is brought", () => {
    const verdict = weighTraitChange(
      { state: "unestablished" },
      { force: "formative", pressure: 99 },
    );
    expect(verdict.moves).toBe(false);
  });

  it("resists more the longer a value has stood, from the record's own date", () => {
    const { world, playerId } = life("resist-a");
    const { personId } = somebody(world, playerId);
    const seeded = ensurePeopleTraits(world, [personId]);
    const reading = traitResistance(
      seeded,
      personId,
      sociability,
      peopleTraitId("sociability"),
    );
    expect(reading.state).toBe("established");
    if (reading.state !== "established") return;
    // Seeded at birth for somebody of forty, so it has long since settled.
    expect(reading.settled).toBe(true);
    expect(reading.priorMoves).toBe(0);
    expect(reading.resistance).toBe(sociability.movability.settled);
    expect(describeTraitResistance("Dana", reading)).toMatch(
      /has been this way for \d+ years, and has never been otherwise\./,
    );
  });
});

describe("a change is a force meeting a resistance", () => {
  it("does not move a settled person on one passing argument", () => {
    const { world, playerId } = life("resist-b");
    const { personId, eventId } = somebody(world, playerId);
    const before = personTrait(
      ensurePeopleTraits(world, [personId]),
      personId,
      "sociability",
    );
    const target = before.value > 0 ? -2 : 2;
    const outcome = attemptTraitChange(world, {
      personId,
      trait: "sociability",
      value: target,
      eventId,
      reason: "A quiet afternoon went badly.",
      force: "passing",
      stableKey: "resist-b:1",
    });
    expect(outcome.moved).toBe(false);
    expect(personTrait(outcome.world, personId, "sociability").value).toBe(
      before.value,
    );
  });

  it("writes the failure down, so the same argument again is not a fresh coin flip", () => {
    const { world, playerId } = life("resist-c");
    const { personId, eventId } = somebody(world, playerId);
    const before = personTrait(
      ensurePeopleTraits(world, [personId]),
      personId,
      "sociability",
    );
    const target = before.value > 0 ? -2 : 2;

    let next = world;
    let attempts = 0;
    let moved = false;
    // Pressure accumulates until it carries. The point is that it takes more
    // than one and that each attempt is a record, not that it takes exactly n.
    for (let index = 0; index < 8 && !moved; index += 1) {
      const outcome = attemptTraitChange(next, {
        personId,
        trait: "sociability",
        value: target,
        eventId,
        reason: "It kept happening.",
        force: "passing",
        stableKey: `resist-c:${index}`,
      });
      next = outcome.world;
      moved = outcome.moved;
      attempts += 1;
      if (!moved) {
        expect(outcome.pressure).toBe(index);
      }
    }
    expect(moved).toBe(true);
    expect(attempts).toBeGreaterThan(1);
    expect(personTrait(next, personId, "sociability").value).toBe(target);
    // The failures are still there afterwards: the game can say this kept
    // happening to them and for a long time they did not budge.
    expect(
      next.history.events.filter(
        (event) => event.type === "people-mind-v1.trait-unmoved",
      ).length,
    ).toBe(attempts - 1);
    assertWorldIntegrity(next);
    expect(deserializeWorld(serializeWorld(next))).toEqual(next);
  });

  it("releases the pressure that carried a move, rather than counting it twice", () => {
    const { world, playerId } = life("resist-c");
    const { personId, eventId } = somebody(world, playerId);
    const before = personTrait(
      ensurePeopleTraits(world, [personId]),
      personId,
      "sociability",
    );
    const target = before.value > 0 ? -2 : 2;
    let next = world;
    for (let index = 0; index < 8; index += 1) {
      const outcome = attemptTraitChange(next, {
        personId,
        trait: "sociability",
        value: target,
        eventId,
        reason: "It kept happening.",
        force: "passing",
        stableKey: `resist-d:${index}`,
      });
      next = outcome.world;
      if (outcome.moved) break;
    }
    // Everything that failed happened before the record the move wrote, so
    // none of it counts against the value that move produced.
    expect(
      traitChangePressure(next, personId, "sociability", target > 0 ? -2 : 2),
    ).toBe(0);
  });

  it("leaves somebody harder to move than they were before they moved", () => {
    const { world, playerId } = life("resist-e");
    const { personId, eventId } = somebody(world, playerId);
    const seeded = ensurePeopleTraits(world, [personId]);
    const tendencyId = peopleTraitId("sociability");
    const settled = traitResistance(seeded, personId, sociability, tendencyId);
    const before = personTrait(seeded, personId, "sociability");

    let next = seeded;
    for (let index = 0; index < 10; index += 1) {
      const outcome = attemptTraitChange(next, {
        personId,
        trait: "sociability",
        value: before.value > 0 ? -2 : 2,
        eventId,
        reason: "It kept happening.",
        force: "notable",
        stableKey: `resist-e:${index}`,
      });
      next = outcome.world;
      if (outcome.moved) break;
    }
    const after = traitResistance(next, personId, sociability, tendencyId);
    expect(after.state).toBe("established");
    if (after.state !== "established" || settled.state !== "established")
      return;
    // The escalating cost is what stops a character oscillating: a move made
    // is added for good, so once this value settles it is harder than the last.
    expect(after.priorMoves).toBe(1);
    const whenSettled =
      sociability.movability.settled + sociability.movability.perMove;
    expect(whenSettled).toBeGreaterThan(settled.resistance);
    expect(describeTraitResistance("Dana", after)).toContain(
      "already changed once",
    );
  });

  it("records nothing when the person already holds the value asked for", () => {
    const { world, playerId } = life("resist-f");
    const { personId, eventId } = somebody(world, playerId);
    const seeded = ensurePeopleTraits(world, [personId]);
    const before = personTrait(seeded, personId, "sociability");
    const outcome = attemptTraitChange(seeded, {
      personId,
      trait: "sociability",
      value: before.value,
      eventId,
      reason: "Nothing to change.",
      force: "formative",
      stableKey: "resist-f:1",
    });
    expect(outcome.moved).toBe(false);
    expect(outcome.world.history.events.length).toBe(
      seeded.history.events.length,
    );
  });
});

describe("the pack decides how movable a kind of trait is, not the engine", () => {
  it("gives deliberation a harder floor than sociability, as the pack says", () => {
    const deliberation = registry.traits.get(
      `${PEOPLE_MIND_VERSION}:deliberation`,
    )!;
    expect(deliberation.movability.settled).toBeGreaterThan(
      sociability.movability.settled,
    );
    // Every trait must cost more each time, so no pack can declare one that
    // swings back and forth for free.
    for (const trait of registry.traits.values()) {
      expect(trait.movability.perMove).toBeGreaterThan(0);
      expect(trait.movability.settlesOver).toBeGreaterThan(0);
    }
  });

  it("does not store how stubborn anybody is anywhere", () => {
    const { world, playerId } = life("resist-g");
    const { personId } = somebody(world, playerId);
    const seeded = ensurePeopleTraits(world, [personId]);
    const reading: TraitResistance = traitResistance(
      seeded,
      personId,
      sociability,
      peopleTraitId("sociability"),
    );
    // Removing the records removes the reading. Nothing survives them, which
    // is what "read from a life" has to mean to be true.
    const forgotten: World = {
      ...seeded,
      history: { ...seeded.history, personalityTendencies: [] },
    };
    expect(reading.state).toBe("established");
    expect(
      traitResistance(
        forgotten,
        personId,
        sociability,
        peopleTraitId("sociability"),
      ).state,
    ).toBe("unestablished");
  });
});
