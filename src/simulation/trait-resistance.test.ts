import { describe, expect, it } from "vitest";

import {
  describeTraitResistance,
  STRONGEST_FORCE,
  traitResistance,
  weighTraitChange,
  type TraitResistance,
} from "./trait-resistance";
import { loadedTraitRegistry } from "./trait-registry";
import { MIND_STRENGTHS } from "./trait-packs";
import { advanceWorld } from "./world";
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
    // Settled, so it carries the whole of what a value held this strongly
    // resists — which is the pack's number for the strength on the record, and
    // nothing else about this person.
    expect(reading.resistance).toBe(
      sociability.movability.settledByStrength[reading.heldAs],
    );
    expect(describeTraitResistance("Dana", reading)).toMatch(
      /has been this way for \d+ years, and holds it .+, having never been otherwise\./,
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
      context: "test:one-afternoon",
    });
    expect(outcome.moved).toBe(false);
    expect(personTrait(outcome.world, personId, "sociability").value).toBe(
      before.value,
    );
  });

  it("counts one afternoon of the same argument once, however often it is made", () => {
    const { world, playerId } = life("resist-c");
    const { personId, eventId } = somebody(world, playerId);
    const before = personTrait(
      ensurePeopleTraits(world, [personId]),
      personId,
      "sociability",
    );
    const target = before.value > 0 ? -2 : 2;

    // Twelve attempts, one day, one corner of a life. This is the shape a
    // player produces by clicking, and it is the one that used to work: each
    // attempt added one to the force until the sum carried. Now the day does
    // not advance and the argument does not vary, so it stays one experience.
    let next = world;
    for (let index = 0; index < 12; index += 1) {
      const outcome = attemptTraitChange(next, {
        personId,
        trait: "sociability",
        value: target,
        eventId,
        reason: "The same thing, again.",
        force: "passing",
        stableKey: `resist-c:${index}`,
        context: "test:one-friend-one-afternoon",
      });
      next = outcome.world;
      expect(outcome.moved).toBe(false);
      expect(outcome.pressure).toBeLessThanOrEqual(1);
    }
    expect(personTrait(next, personId, "sociability").value).toBe(before.value);
    // The failures are still there afterwards: the game can say this kept
    // happening to them and they did not budge.
    expect(
      next.history.events.filter(
        (event) => event.type === "people-mind-v1.trait-unmoved",
      ).length,
    ).toBe(12);
    assertWorldIntegrity(next);
    expect(deserializeWorld(serializeWorld(next))).toEqual(next);
  });

  it("moves somebody when the same thing comes from several directions over a year", () => {
    const { world, playerId } = life("resist-c2");
    const { personId, eventId } = somebody(world, playerId);
    const before = personTrait(
      ensurePeopleTraits(world, [personId]),
      personId,
      "sociability",
    );
    const target = before.value > 0 ? -2 : 2;

    // The same twelve attempts, rearranged into a life: different people,
    // months apart. Nothing else changed.
    let next = ensurePeopleTraits(world, [personId]);
    let moved = false;
    for (let index = 0; index < 12 && !moved; index += 1) {
      const outcome = attemptTraitChange(next, {
        personId,
        trait: "sociability",
        value: target,
        eventId,
        reason: "It kept happening, and not only with one person.",
        force: "notable",
        stableKey: `resist-c2:${index}`,
        context: `test:turned-down-by-${index}`,
      });
      next = outcome.world;
      moved = outcome.moved;
      if (!moved) next = advanceWorld(next, 100);
    }
    expect(moved).toBe(true);
    expect(personTrait(next, personId, "sociability").value).toBe(target);
  });

  it("releases the pressure that carried a move, rather than counting it twice", () => {
    const { world, playerId } = life("resist-c2");
    const { personId, eventId } = somebody(world, playerId);
    const before = personTrait(
      ensurePeopleTraits(world, [personId]),
      personId,
      "sociability",
    );
    const target = before.value > 0 ? -2 : 2;
    let next = ensurePeopleTraits(world, [personId]);
    for (let index = 0; index < 12; index += 1) {
      const outcome = attemptTraitChange(next, {
        personId,
        trait: "sociability",
        value: target,
        eventId,
        reason: "It kept happening, and not only with one person.",
        force: "notable",
        stableKey: `resist-d:${index}`,
        context: `test:turned-down-by-${index}`,
      });
      next = outcome.world;
      if (outcome.moved) break;
      next = advanceWorld(next, 100);
    }
    // Everything that failed happened before the record the move wrote, so
    // none of it counts against the value that move produced.
    expect(
      traitChangePressure(next, personId, "sociability", target > 0 ? -2 : 2),
    ).toBe(0);
  });

  it("does not let a value that just moved swing straight back", () => {
    const { world, playerId } = life("resist-c2");
    const { personId, eventId } = somebody(world, playerId);
    const seeded = ensurePeopleTraits(world, [personId]);
    const tendencyId = peopleTraitId("sociability");
    const before = personTrait(seeded, personId, "sociability");
    const target = before.value > 0 ? -2 : 2;

    let next = seeded;
    for (let index = 0; index < 12; index += 1) {
      const outcome = attemptTraitChange(next, {
        personId,
        trait: "sociability",
        value: target,
        eventId,
        reason: "It kept happening, and not only with one person.",
        force: "notable",
        stableKey: `resist-h:${index}`,
        context: `test:turned-down-by-${index}`,
      });
      next = outcome.world;
      if (outcome.moved) break;
      next = advanceWorld(next, 100);
    }
    expect(personTrait(next, personId, "sociability").value).toBe(target);

    // The week after. A freshly written value carries the pack's unsettled
    // floor rather than nothing, which is what stops a character oscillating
    // now that no permanent cost is added for having changed.
    next = advanceWorld(next, 7);
    const fresh = traitResistance(next, personId, sociability, tendencyId);
    expect(fresh.state).toBe("established");
    if (fresh.state !== "established") return;
    expect(fresh.settled).toBe(false);
    expect(fresh.resistance).toBeGreaterThan(0);
    expect(fresh.priorMoves).toBe(1);
    const back = attemptTraitChange(next, {
      personId,
      trait: "sociability",
      value: before.value,
      eventId,
      reason: "One good evening.",
      force: "passing",
      stableKey: "resist-h:back",
      context: "test:one-good-evening",
    });
    expect(back.moved).toBe(false);
  });

  it("does not make somebody who has already changed permanently unreachable", () => {
    const { world, playerId } = life("resist-e");
    const { personId } = somebody(world, playerId);
    const seeded = ensurePeopleTraits(world, [personId]);
    const tendencyId = peopleTraitId("sociability");
    const reading = traitResistance(seeded, personId, sociability, tendencyId);
    expect(reading.state).toBe("established");
    if (reading.state !== "established") return;

    // The retired shape added a cost for every move ever made, so a person who
    // had been through things ended up beyond the reach of anything that could
    // happen to them. Nothing a life contains may push a settled value above
    // what the pack says a value held that strongly resists.
    expect(reading.resistance).toBeLessThanOrEqual(reading.settledResistance);
    expect(reading.settledResistance).toBe(
      sociability.movability.settledByStrength[reading.heldAs],
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
      context: "test:nothing-to-change",
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
    for (const strength of MIND_STRENGTHS) {
      expect(
        deliberation.movability.settledByStrength[strength],
      ).toBeGreaterThan(sociability.movability.settledByStrength[strength]);
    }
  });

  it("makes a strongly held value harder than a faint one, everywhere", () => {
    // The owner's answer to how change should be paced: it depends on how
    // strongly the trait is theirs. No pack may declare otherwise.
    for (const trait of registry.traits.values()) {
      const byStrength = trait.movability.settledByStrength;
      expect(byStrength.moderate).toBeGreaterThan(byStrength.subtle);
      expect(byStrength.strong).toBeGreaterThan(byStrength.moderate);
      expect(byStrength.defining).toBeGreaterThan(byStrength.strong);
      expect(trait.movability.settlesOver).toBeGreaterThan(0);
      expect(trait.movability.unsettledFloor).toBeGreaterThan(0);
      expect(trait.movability.experienceSpacingDays).toBeGreaterThan(0);
      expect(trait.movability.pressureCap).toBeGreaterThanOrEqual(0);
    }
  });

  it("puts a defining value beyond persistence, and still within reach", () => {
    // The two halves of the owner's requirement, as assertions rather than
    // comments. Somebody who holds a trait as much as anything about them
    // cannot be worn down by the weakest thing repeated for as long as a
    // player likes — and is still reachable by something that argues hard
    // enough, because every character has to be able to change.
    for (const trait of registry.traits.values()) {
      const settled = (resistance: number): TraitResistance => ({
        state: "established",
        resistance,
        heldAs: "defining",
        settledResistance: resistance,
        priorMoves: 0,
        heldForYears: 40,
        settled: true,
      });
      const defining = settled(trait.movability.settledByStrength.defining);
      const cap = trait.movability.pressureCap;
      expect(
        weighTraitChange(defining, { force: "passing", pressure: cap }).moves,
      ).toBe(false);
      expect(trait.movability.settledByStrength.defining).toBeLessThan(
        STRONGEST_FORCE + cap,
      );
      expect(
        weighTraitChange(defining, { force: "formative", pressure: cap }).moves,
      ).toBe(true);
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
