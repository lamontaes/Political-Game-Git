import { describe, expect, it } from "vitest";

import {
  createNewGameWorld,
  DEFAULT_NEW_GAME_SETUP,
} from "../../../presentation/new-game";
import { lifePlaces } from "../../life-places";
import { createMindProvenance, recordPersonalityTendency } from "../../mind";
import { traitDefinitionFromPack } from "../../trait-packs";
import { registeredTraitConsiderations } from "../../trait-readings";
import { loadedTraitRegistry } from "../../trait-registry";
import type { EntityId, World } from "../../types";

const TRAITS = [
  "facet-gentle",
  "facet-supportive",
  "facet-comforting",
  "facet-nurturing",
  "facet-tender-hearted",
] as const;

function confer(world: World, personId: EntityId, key: string): World {
  const trait = loadedTraitRegistry().traits.get(`personality-v1:${key}`)!;
  const definition = traitDefinitionFromPack(trait);
  const withDefinition = world.mindCatalog.tendencies[definition.id]
    ? world
    : {
        ...world,
        mindCatalog: {
          ...world.mindCatalog,
          tendencies: {
            ...world.mindCatalog.tendencies,
            [definition.id]: definition,
          },
          tendencyOrder: [...world.mindCatalog.tendencyOrder, definition.id],
        },
      };
  return recordPersonalityTendency(withDefinition, {
    stableKey: `session-82:${key}:${personId}`,
    personId,
    tendencyId: definition.id,
    recordedAt: world.currentDate,
    expressionKey: `${key}:high`,
    strength: "strong",
    confidence: "medium",
    scopeTags: ["life:ordinary"],
    provenance: createMindProvenance("authored", {
      note: "Controlled proof of a recorded care trait.",
    }),
    supersedesTendencyId: null,
  });
}

describe("care and kindness trait readers", () => {
  it("connect each trait to a named person's contact decision in a new game", () => {
    const seed = "session-82-care-readers";
    const places = lifePlaces();
    const place =
      places[
        [...seed].reduce((sum, character) => sum + character.charCodeAt(0), 0) %
          places.length
      ]!;
    const game = createNewGameWorld({
      ...DEFAULT_NEW_GAME_SETUP,
      startKind: "custom",
      startAge: 40,
      questionnaire: "skipped",
      placeKey: place.key,
      seed,
    });
    const people = game.world.personOrder
      .filter((id) => id !== game.playerPersonId)
      .slice(0, 2);
    expect(people).toHaveLength(2);

    TRAITS.forEach((key) => {
      const caringPersonId = people[0]!;
      const comparisonPersonId = people[1]!;
      const world = confer(game.world, caringPersonId, key);
      const caring = registeredTraitConsiderations(
        world,
        loadedTraitRegistry(),
        caringPersonId,
        `session-82:${key}`,
        "contact.answer",
      );
      const comparison = registeredTraitConsiderations(
        world,
        loadedTraitRegistry(),
        comparisonPersonId,
        `session-82:${key}`,
        "contact.answer",
      );
      const traitKey = `personality-v1:${key}`;
      expect(caring.some(({ stableKey }) => stableKey.includes(traitKey))).toBe(
        true,
      );
      expect(
        comparison.some(({ stableKey }) => stableKey.includes(traitKey)),
      ).toBe(false);
      process.stdout.write(
        `${JSON.stringify({ seed, worldId: world.id, date: world.currentDate, place: place.displayName, trait: traitKey, decision: "contact.answer", caringPerson: world.people[caringPersonId]!.givenName, comparisonPerson: world.people[comparisonPersonId]!.givenName })}\n`,
      );
    });
  });
});
