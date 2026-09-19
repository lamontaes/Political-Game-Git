import { beforeAll, describe, expect, it } from "vitest";
import {
  CRUNCH46_WORLD_OPENING_VERSION,
  assertWorldIntegrity,
  deserializeWorld,
  ensureWorldStartingConditions,
  lifePlaceByKey,
  lifePlaceSearch,
  serializeWorld,
} from "../simulation";
import type { World } from "../simulation";
import { createNewGameWorld, type NewGame } from "./new-game";
import { projectWorldOrientation } from "./living-world-orientation";
import {
  currentPublicOfficeholders,
  establishOpeningOfficeholders,
} from "./opening-officeholders";
import {
  prepareOpeningFederalGeography,
  WASHINGTON_PLACE_KEY,
} from "./opening-federal-geography";

/** Integration tests for the real repository, not the isolated fixture harness. */
describe("opening federal geography", () => {
  let game: NewGame;
  let world: World;
  beforeAll(() => {
    const peebles = lifePlaceSearch("Peebles", 20, {
      stateJurisdictionKey: "US-OH",
      scope: "locality",
    }).find((place) => /\bPeebles\b/i.test(place.displayName));
    if (!peebles)
      throw new Error("Peebles is missing from accepted geography.");
    game = createNewGameWorld({
      startKind: "normal",
      placeKey: peebles.key,
      startAge: 26,
      depth: "summarize-earlier-life",
      startingLife: "ordinary-life",
      household: "lives-alone",
      seed: "director-federal-geography-regression-v1",
      givenName: "Casey",
      familyName: "Review",
      gender: "unstated",
      questionnaire: "skipped",
    });
    // The repair belongs to the current opening version (WORLD46 gate).
    world = establishOpeningOfficeholders(
      ensureWorldStartingConditions(game.world, {
        openingVersion: CRUNCH46_WORLD_OPENING_VERSION,
      }),
      game.playerPersonId,
    );
  });

  it("resolves Washington from the actual accepted locality corpus", () => {
    expect(lifePlaceByKey(WASHINGTON_PLACE_KEY)).toMatchObject({
      scope: "locality",
      stateJurisdictionKey: "US-DC",
    });
  });

  it("writes actual home and explicit birthplace facts for both incumbents", () => {
    const washington =
      lifePlaceByKey(WASHINGTON_PLACE_KEY)!.context.jurisdiction;
    const officials = currentPublicOfficeholders(world).filter((holder) =>
      ["us-president", "us-chief-justice"].includes(holder.officeKey),
    );
    expect(officials).toHaveLength(2);
    for (const holder of officials) {
      const person = world.people[holder.personId]!;
      expect(person.homeJurisdictionId).toBe(washington.id);
      expect(person.homeJurisdictionId).not.toBe(
        world.people[game.playerPersonId]!.homeJurisdictionId,
      );
      const birth = person.establishedFacts.find(
        (fact) => fact.kind === "birthplace",
      );
      const residence = person.establishedFacts.find(
        (fact) => fact.kind === "residence",
      );
      expect(birth?.jurisdictionId).toBeTruthy();
      expect(world.jurisdictions[birth!.jurisdictionId!]).toBeDefined();
      expect(residence?.jurisdictionId).toBe(washington.id);
    }
    expect(() => assertWorldIntegrity(world)).not.toThrow();
  });

  it("projects the saved Washington residence without changing the player's locality", () => {
    const view = projectWorldOrientation(world, game.playerPersonId);
    expect(view.executive).toHaveLength(2);
    for (const holder of view.executive) {
      expect(holder.residenceJurisdictionId).toBe(
        lifePlaceByKey(WASHINGTON_PLACE_KEY)!.context.jurisdiction.id,
      );
      expect(holder.residenceLabel).toContain("Washington");
    }
    expect(view.locality?.jurisdictionId).toBe(
      world.people[game.playerPersonId]!.homeJurisdictionId,
    );
    expect(view.homeState?.stateUsps).toBe("OH");
  });

  it("keeps the full saved world intact through the real serializer", () => {
    const payload = serializeWorld(world);
    const restored = deserializeWorld(payload);
    expect(serializeWorld(restored)).toBe(payload);
    expect(establishOpeningOfficeholders(restored, game.playerPersonId)).toBe(
      restored,
    );
  });

  it("does not mutate a world when the orientation is read repeatedly", () => {
    const before = serializeWorld(world);
    projectWorldOrientation(world, game.playerPersonId);
    projectWorldOrientation(world, game.playerPersonId);
    expect(serializeWorld(world)).toBe(before);
  });

  it("chooses birthplace independently of the player's home field at fixed World seed", () => {
    const player = world.people[game.playerPersonId]!;
    const washington =
      lifePlaceByKey(WASHINGTON_PLACE_KEY)!.context.jurisdiction;
    const changedHome: World = {
      ...world,
      people: {
        ...world.people,
        [player.id]: { ...player, homeJurisdictionId: washington.id },
      },
    };
    const a = prepareOpeningFederalGeography(world, "new-holder-test");
    const b = prepareOpeningFederalGeography(changedHome, "new-holder-test");
    expect(a.birthplaceJurisdictionId).toBe(b.birthplaceJurisdictionId);
    expect(a.homeJurisdictionId).toBe(b.homeJurisdictionId);
  });
});
