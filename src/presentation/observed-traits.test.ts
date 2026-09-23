import { describe, expect, it } from "vitest";

import {
  ensurePeopleTraits,
  observedTraitLabels,
  personTraits,
} from "../simulation/people-traits";
import { PERSONALITY_PACK } from "../simulation/personality-catalogue";
import { readTrait } from "../simulation/trait-readings";
import { traitRegistryFor } from "../simulation/trait-registry";
import { createNewGameWorld, DEFAULT_NEW_GAME_SETUP } from "./new-game";
import { openOrdinaryLife } from "./ordinary-life";

/**
 * A temperament shown to the player has to be one the game wrote down.
 *
 * `personTrait` reports what the seed would make a trait even where no record
 * exists, because a writer about to establish it needs that number. A reader
 * must not. The person card read it anyway, so at the opening of an ordinary
 * life it named a temperament for people nobody had decided anything with.
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

describe("only an observed temperament is shown", () => {
  it("says nothing about people whose traits were never written", () => {
    const { world, personId } = life("three-state-probe");
    const others = world.personOrder.filter((id) => id !== personId);
    expect(others.length).toBeGreaterThan(0);

    // The premise: nothing is recorded, and the seed alone would speak.
    const unrecorded = others.flatMap((id) =>
      personTraits(world, id).filter((trait) => trait.recordId === null),
    );
    expect(unrecorded).toHaveLength(others.length * 5);
    expect(
      unrecorded.filter((trait) => trait.label !== null).length,
    ).toBeGreaterThan(0);

    for (const id of others) expect(observedTraitLabels(world, id)).toEqual([]);
  });

  it("says what was written, once it is written", () => {
    const { world, personId } = life("three-state-probe");
    const others = world.personOrder.filter((id) => id !== personId);
    const written = ensurePeopleTraits(world, others);

    // Every label now stands on a record, and a balanced trait still says
    // nothing — absence and "neither, much" stay different things.
    for (const id of others) {
      const labels = observedTraitLabels(written, id);
      const leaning = personTraits(written, id).filter(
        (trait) => trait.recordId !== null && trait.label !== null,
      );
      // The five, then any named quality from the personality catalog
      // this person is known for, each read from its own record.
      const qualities = [...traitRegistryFor(written).traits.values()]
        .filter((trait) => trait.pack === PERSONALITY_PACK)
        .flatMap((trait) => {
          const reading = readTrait(written, id, trait);
          return reading.state === "recorded" && reading.label !== null
            ? [reading.label]
            : [];
        });
      expect(labels).toEqual([
        ...leaning.map((trait) => trait.label),
        ...qualities,
      ]);
    }
    expect(
      others.flatMap((id) => observedTraitLabels(written, id)).length,
    ).toBeGreaterThan(0);
  });

  it("never speaks for the played character, whose traits are not authored", () => {
    const { world, personId } = life("three-state-probe");
    const written = ensurePeopleTraits(world, world.personOrder);
    expect(observedTraitLabels(written, personId)).toEqual([]);
  });
});
