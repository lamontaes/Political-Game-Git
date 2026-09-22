import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

import {
  deserializeWorld,
  serializeWorld,
  type EntityId,
  type World,
} from "../simulation";
import {
  createMindProvenance,
  recordPersonalityTendency,
} from "../simulation/mind";
import { PERSONALITY_PACK } from "../simulation/personality-catalogue";
import { CATALOGUE_SCALES } from "../simulation/personality-catalogue.generated";
import {
  encodeRegisteredTrait,
  ensurePeopleTraits,
  ensureTraitDefinition,
  observedTraitLabels,
} from "../simulation/people-traits";
import { assertProductionCatalogBoundary } from "../simulation/production-catalog";
import { traitDefinitionFromPack } from "../simulation/trait-packs";
import { readTrait } from "../simulation/trait-readings";
import { traitRegistryFor } from "../simulation/trait-registry";
import { createNewGameWorld, DEFAULT_NEW_GAME_SETUP } from "./new-game";
import { openOrdinaryLife } from "./ordinary-life";

const received = JSON.parse(
  readFileSync(
    "docs/research/chatgpt-answers/2026-09-22-depth2/personality-scale-dispositions.json",
    "utf8",
  ),
) as {
  scales: { key: string; kind: string }[];
};

/** The four scales the research bound to the existing five. */
const BOUND_TO_THE_FIVE = ["deliberation", "reliability", "conflict", "risk"];

function openAt(placeKey: string, seed: string) {
  const game = createNewGameWorld({
    ...DEFAULT_NEW_GAME_SETUP,
    startKind: "custom",
    seed,
    startAge: 40,
    depth: "summarize-earlier-life",
    questionnaire: "skipped",
    placeKey,
    household: "shares-a-home",
  });
  return {
    world: openOrdinaryLife(game.world, game.playerPersonId),
    playerId: game.playerPersonId,
  };
}

function catalogueReadings(world: World, personId: EntityId) {
  return [...traitRegistryFor(world).traits.values()]
    .filter((trait) => trait.pack === PERSONALITY_PACK)
    .map((trait) => ({ trait, reading: readTrait(world, personId, trait) }))
    .filter(({ reading }) => reading.state === "recorded");
}

const age = (world: World, id: EntityId) =>
  Number(world.currentDate.slice(0, 4)) -
  Number(world.people[id]!.birthDate.slice(0, 4));

describe("the personality catalogue", () => {
  it("loads every scale the research sent, less the four the five already mean", () => {
    const registry = traitRegistryFor(
      openAt("0200065", "catalogue-load").world,
    );
    const loaded = [...registry.traits.values()].filter(
      (trait) => trait.pack === PERSONALITY_PACK,
    );
    const expected = received.scales
      .map((scale) => scale.key)
      .filter((key) => !BOUND_TO_THE_FIVE.includes(key));
    expect(loaded.map((trait) => trait.key)).toEqual(expected);
    expect(
      registry.report.rejections.filter(
        (rejection) => rejection.pack === PERSONALITY_PACK,
      ),
    ).toEqual([]);
    // One-sided exactly where the research says so.
    for (const scale of received.scales) {
      const trait = registry.traits.get(`${PERSONALITY_PACK}:${scale.key}`);
      if (!trait) continue;
      expect(trait.sides === "one").toBe(scale.kind === "one-sided-facet");
    }
    // The generated file is the received one: nothing edited by hand.
    expect(CATALOGUE_SCALES).toHaveLength(expected.length);
  });

  it("refuses to give a one-sided quality its invented opposite", () => {
    const { world } = openAt("0200065", "catalogue-load");
    const cocky = traitRegistryFor(world).traits.get(
      `${PERSONALITY_PACK}:facet-cocky`,
    )!;
    expect(cocky.sides).toBe("one");
    expect(() => encodeRegisteredTrait(cocky, -1)).toThrow(/one-sided/);
    expect(encodeRegisteredTrait(cocky, 1).expressionKey).toBe(
      cocky.poles.high.key,
    );
  });

  it.each([
    ["5114968", "Charlottesville, Virginia"],
    ["3149950", "a small town in Nebraska"],
    ["0200065", "a small place in Alaska"],
  ])(
    "gives each adult in %s (%s) one or two qualities of their own, and nobody else any",
    (placeKey) => {
      const { world: opened, playerId } = openAt(
        placeKey,
        `catalogue-${placeKey}`,
      );
      const others = opened.personOrder.filter((id) => id !== playerId);
      const world = ensurePeopleTraits(opened, others);
      const adults = others.filter((id) => age(world, id) >= 19);
      expect(adults.length).toBeGreaterThan(0);
      for (const id of adults) {
        const known = catalogueReadings(world, id);
        expect(known.length).toBeGreaterThanOrEqual(1);
        expect(known.length).toBeLessThanOrEqual(2);
        // Two qualities never come from one family.
        const families = new Set(
          known.map(
            ({ trait }) =>
              CATALOGUE_SCALES.find((row) => row.key === trait.key)!.family,
          ),
        );
        expect(families.size).toBe(known.length);
        for (const { trait, reading } of known) {
          if (reading.state !== "recorded") continue;
          // A one-sided quality is written at its marked end, never its absence.
          if (trait.sides === "one") expect(reading.value).toBeGreaterThan(0);
          expect(reading.value).not.toBe(0);
          // And it is on the card.
          expect(observedTraitLabels(world, id)).toContain(reading.label);
        }
      }
      // Children are left until they are adults.
      for (const id of others.filter((id) => age(world, id) < 17)) {
        expect(catalogueReadings(world, id)).toEqual([]);
      }
      // The played character is never given one.
      expect(catalogueReadings(world, playerId)).toEqual([]);
      assertProductionCatalogBoundary(world);
      const reloaded = deserializeWorld(serializeWorld(world));
      expect(serializeWorld(reloaded)).toBe(serializeWorld(world));
      // Drawn once: asking again writes nothing.
      expect(ensurePeopleTraits(world, others)).toBe(world);
    },
    120_000,
  );

  it("keeps a quality a life already wrote rather than drawing new ones", () => {
    const { world: opened, playerId } = openAt("3149950", "catalogue-kept");
    const adult = opened.personOrder.find(
      (id) => id !== playerId && age(opened, id) >= 19,
    )!;
    const cocky = traitRegistryFor(opened).traits.get(
      `${PERSONALITY_PACK}:facet-cocky`,
    )!;
    const withDefinition = ensureTraitDefinition(opened, cocky);
    const written = recordPersonalityTendency(withDefinition, {
      stableKey: "catalogue-kept:written",
      personId: adult,
      tendencyId: traitDefinitionFromPack(cocky).id,
      recordedAt: withDefinition.currentDate,
      ...encodeRegisteredTrait(cocky, 1),
      confidence: "medium",
      scopeTags: [],
      provenance: createMindProvenance("authored", {
        note: "Written by a life.",
      }),
      supersedesTendencyId: null,
    });
    const next = ensurePeopleTraits(written, [adult]);
    expect(
      catalogueReadings(next, adult).map(({ trait }) => trait.key),
    ).toEqual(["facet-cocky"]);
  });
});
