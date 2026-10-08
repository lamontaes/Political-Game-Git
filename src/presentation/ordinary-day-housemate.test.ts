import { describe, expect, it } from "vitest";

import { smallWorld } from "../../tests/fixtures/small-world";
import { drawRandomPlace } from "../../tests/support/random-place";
import { createHousehold, startHouseholdMembership } from "../simulation";
import { lifePlaceStateIdentities } from "../simulation/life-places";
import { explicitNewGameSetup } from "./new-game-geography";
import { createOpeningLifeController } from "./opening-life";
import { projectOrdinaryDay } from "./ordinary-life";

/**
 * The day's opening screen names someone the player lives with the way a
 * housemate is named at home: by first name, not by family name alone.
 */
describe("the housemate on the day's opening screen", () => {
  it("is named by first name in every one of the 56 places", () => {
    const states = lifePlaceStateIdentities();
    expect(states).toHaveLength(56);
    const provenance = {
      kind: "authored" as const,
      note: "A household of two, one of them with another family name.",
    };
    for (const state of states) {
      const small = smallWorld({ place: state.usps, seed: "housemate-name" });
      const player = small.world.people[small.personId]!;
      const mateId = small.world.personOrder.find(
        (id) => small.world.people[id]!.familyName !== player.familyName,
      )!;
      let world = createHousehold(small.world, {
        stableKey: "housemate-name:household",
        formedAt: small.world.currentDate,
        label: "A shared home",
        provenance,
      });
      const householdId = world.history.households.at(-1)!.id;
      for (const personId of [small.personId, mateId])
        world = startHouseholdMembership(world, {
          stableKey: `housemate-name:${personId}`,
          personId,
          householdId,
          startedAt: world.currentDate,
          residenceRole: "primary",
          kind: "resident:member",
          provenance,
        });
      const day = projectOrdinaryDay(world, small.personId);
      const mate = world.people[mateId]!;
      expect(day.companionPersonId, state.usps).toBe(mateId);
      expect(day.opening, state.usps).toContain(`${mate.givenName} is`);
      expect(day.opening, state.usps).not.toContain(`${mate.familyName} is`);
    }
  });

  it(
    "is named by first name, even with another family name",
    { timeout: 180_000 },
    () => {
      const seed = "housemate-name-oct8-2";
      const place = drawRandomPlace(seed);
      const game = createOpeningLifeController(
        explicitNewGameSetup({
          placeKey: place.key,
          seed,
          startAge: 34 as never,
          depth: "summarize-earlier-life",
        }),
      ).finishTransition().game!;
      const day = projectOrdinaryDay(game.world, game.playerPersonId);
      const player = game.world.people[game.playerPersonId]!;
      const mate = game.world.people[day.companionPersonId ?? ""];
      // The case under test: a housemate whose family name is not the player's.
      expect(mate, place.displayName).toBeDefined();
      expect(mate!.familyName).not.toBe(player.familyName);
      expect(day.opening).toContain(`${mate!.givenName} is`);
      expect(day.opening).not.toContain(`${mate!.familyName} is`);
    },
  );
});
