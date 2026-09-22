import { describe, expect, it } from "vitest";

import {
  ensurePeopleTraits,
  observedTraitLabels,
  shownTraitLabels,
} from "../simulation/people-traits";
import { PERSONALITY_PACK } from "../simulation/personality-catalogue";
import { readTrait } from "../simulation/trait-readings";
import { traitRegistryFor } from "../simulation/trait-registry";
import { createNewGameWorld, DEFAULT_NEW_GAME_SETUP } from "./new-game";
import { openOrdinaryLife } from "./ordinary-life";

describe("a person's card", () => {
  it.each([
    ["2236255", "Houma, Louisiana"],
    ["0200065", "a small place in Alaska"],
  ])(
    "in %s (%s) shows one or two qualities, the salient ones first, and removes none",
    (placeKey) => {
      const game = createNewGameWorld({
        ...DEFAULT_NEW_GAME_SETUP,
        startKind: "custom",
        seed: `shown-${placeKey}`,
        startAge: 40,
        depth: "summarize-earlier-life",
        questionnaire: "skipped",
        placeKey,
        household: "shares-a-home",
      });
      const opened = openOrdinaryLife(game.world, game.playerPersonId);
      const others = opened.personOrder.filter(
        (id) => id !== game.playerPersonId,
      );
      const world = ensurePeopleTraits(opened, others);
      let crowded = 0;
      for (const id of others) {
        const everything = observedTraitLabels(world, id);
        const shown = shownTraitLabels(world, id);
        expect(shown.length).toBeLessThanOrEqual(2);
        expect(shown.length).toBe(Math.min(2, everything.length));
        for (const label of shown) expect(everything).toContain(label);
        // The catalogue's own qualities are what the person is known for.
        const salient = [...traitRegistryFor(world).traits.values()]
          .filter((trait) => trait.pack === PERSONALITY_PACK)
          .flatMap((trait) => {
            const reading = readTrait(world, id, trait);
            return reading.state === "recorded" && reading.label !== null
              ? [reading.label]
              : [];
          });
        expect(shown.slice(0, salient.length)).toEqual(
          salient.slice(0, shown.length),
        );
        if (everything.length > 2) crowded += 1;
      }
      // The limit is doing something: somebody here holds more than two.
      expect(crowded).toBeGreaterThan(0);
    },
    120_000,
  );
});
