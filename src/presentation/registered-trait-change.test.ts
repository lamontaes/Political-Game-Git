import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

import { attemptTraitChange } from "../simulation/people-trait-change";
import {
  ensurePeopleTraits,
  observedTraitLabels,
} from "../simulation/people-traits";
import { assertProductionCatalogBoundary } from "../simulation/production-catalog";
import { deserializeWorld, serializeWorld } from "../simulation/serialization";
import { readTrait } from "../simulation/trait-readings";
import { traitRegistryFor } from "../simulation/trait-registry";
import type { World } from "../simulation/types";
import { recordWorldEvent } from "../simulation/world";
import { importContentPack } from "./content-pack-import";
import { createNewGameWorld, DEFAULT_NEW_GAME_SETUP } from "./new-game";
import { openOrdinaryLife } from "./ordinary-life";

/**
 * A trait that is not one of the build's five is moved by what happens to
 * somebody through the same weighing the five are: a force against how hard
 * this person is to change, with the failure written down. Before, the play
 * path named the five by type, so a trait from any other pack could be seeded
 * and shown but never changed by anything in a life.
 */
const patienceText = readFileSync(
  new URL("../../examples/content-packs/patience-trait.json", import.meta.url),
  "utf8",
);
const PATIENCE = "mod.example.patience:patience";

function balancedOnPatience() {
  const game = createNewGameWorld({
    ...DEFAULT_NEW_GAME_SETUP,
    startKind: "custom",
    seed: "registered-trait-change",
    startAge: 40,
    depth: "summarize-earlier-life",
    questionnaire: "skipped",
    placeKey: "2743000", // Minneapolis, Minnesota
    household: "shares-a-home",
  });
  let world: World = importContentPack(
    openOrdinaryLife(game.world, game.playerPersonId),
    patienceText,
  );
  const others = world.personOrder.filter((id) => id !== game.playerPersonId);
  world = ensurePeopleTraits(world, others);
  const patience = traitRegistryFor(world).traits.get(PATIENCE)!;
  const personId = others.find((id) => {
    const reading = readTrait(world, id, patience);
    return reading.state === "recorded" && reading.value === 0;
  })!;
  expect(personId).toBeDefined();
  // What argues for the change has to be something that happened to them.
  world = recordWorldEvent(world, {
    stableKey: "registered-trait-change:what-happened",
    type: "life.test-experience",
    occurredAt: world.currentDate,
    recordedAt: world.currentDate,
    jurisdictionId: world.people[personId]!.homeJurisdictionId,
    involvedEntityIds: [personId],
    participants: [{ personId, role: "focus:subject", detail: null }],
    personFactConstraints: [],
    visibility: "private",
    tags: [],
    summary: "Something that took a long time came right.",
    context: {
      location: null,
      socialContext: null,
      pressure: null,
      choice: null,
      motivation: null,
      immediateReaction: null,
    },
  });
  const eventId = world.history.events.at(-1)!.id;
  return { world, personId, patience, eventId };
}

describe("a trait from any pack, changed by a life", () => {
  it("resists a passing force and writes that it did", () => {
    const { world, personId, eventId } = balancedOnPatience();
    const outcome = attemptTraitChange(world, {
      personId,
      trait: PATIENCE,
      value: 1,
      eventId,
      reason: "Waited a season for a permit that came.",
      force: "passing",
      stableKey: "registered-trait-change:passing",
      context: "permit-office",
    });
    expect(outcome.moved).toBe(false);
    const unmoved = outcome.world.history.events.at(-1)!;
    expect(unmoved.tags).toContain(`trait-change.trait:${PATIENCE}`);
    expect(unmoved.involvedEntityIds).toContain(personId);
  });

  it("moves on a formative force, shows on the card and survives a save", () => {
    const { world, personId, patience, eventId } = balancedOnPatience();
    expect(observedTraitLabels(world, personId)).not.toContain("Waits it out");
    const outcome = attemptTraitChange(world, {
      personId,
      trait: PATIENCE,
      value: 1,
      eventId,
      reason: "Nursed a parent through a long illness.",
      force: "formative",
      stableKey: "registered-trait-change:formative",
      context: "family-care",
    });
    expect(outcome.moved).toBe(true);
    const reading = readTrait(outcome.world, personId, patience);
    expect(reading).toMatchObject({ state: "recorded", value: 1 });
    expect(observedTraitLabels(outcome.world, personId)).toContain(
      "Waits it out",
    );
    assertProductionCatalogBoundary(outcome.world);
    const reloaded = deserializeWorld(serializeWorld(outcome.world));
    expect(readTrait(reloaded, personId, patience)).toEqual(reading);
  });

  it("refuses a value the trait's scale does not declare", () => {
    const { world, personId, eventId } = balancedOnPatience();
    expect(() =>
      attemptTraitChange(world, {
        personId,
        trait: PATIENCE,
        value: 2,
        eventId,
        reason: "A value this scale has no step for.",
        force: "formative",
        stableKey: "registered-trait-change:undeclared",
        context: "nowhere",
      }),
    ).toThrow(/declares no step of magnitude 2/);
  });
});
