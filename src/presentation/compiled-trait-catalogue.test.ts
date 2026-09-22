import { describe, expect, it, vi } from "vitest";

import type * as Compiled from "../simulation/compiled-trait-packs";
import type { TraitPack } from "../simulation/trait-packs";

/**
 * A trait added to the build as a pack is seeded, shown and saved with no
 * other code naming it. This is the route the researched catalogue will take:
 * a pack beside the five, not a sixth entry in a hard-coded list.
 */
const CATALOGUE: TraitPack = {
  pack: "catalogue-test",
  traits: [
    {
      key: "industry",
      label: "Industry",
      description:
        "Whether someone works at a thing without being made to. A fictional behavior tendency, not a measurement.",
      poles: {
        low: {
          key: "idle",
          label: "Lets it wait",
          description: "Leans toward leaving work for later.",
        },
        high: {
          key: "industrious",
          label: "Industrious",
          description: "Leans toward getting on with it.",
        },
      },
      scopes: ["life:ordinary"],
      conferredBy: "seeded",
      scale: {
        balancedKey: "balanced",
        balancedLabel: "Neither, much",
        balancedDescription: "No marked lean either way.",
        steps: [{ magnitude: 1, strength: "moderate" }],
      },
      seed: { spread: [-1, 1] },
      movability: {
        settledByStrength: {
          subtle: 1.5,
          moderate: 2.5,
          strong: 4,
          defining: 5,
        },
        settlesOver: 10,
        unsettledFloor: 0.5,
        experienceSpacingDays: 90,
        pressureCap: 3,
      },
    },
  ],
  effects: [],
};

vi.mock("../simulation/compiled-trait-packs", async (importOriginal) => {
  const original = await importOriginal<typeof Compiled>();
  return {
    ...original,
    compiledTraitPacks: () => [...original.compiledTraitPacks(), CATALOGUE],
  };
});

describe("a trait pack compiled into the build", () => {
  it("is seeded for everybody, shown once written, and passes the save check", async () => {
    const { ensurePeopleTraits, observedTraitLabels } =
      await import("../simulation/people-traits");
    const { assertProductionCatalogBoundary } =
      await import("../simulation/production-catalog");
    const { readTrait } = await import("../simulation/trait-readings");
    const { traitRegistryFor } = await import("../simulation/trait-registry");
    const { createNewGameWorld, DEFAULT_NEW_GAME_SETUP } =
      await import("./new-game");
    const { openOrdinaryLife } = await import("./ordinary-life");

    const game = createNewGameWorld({
      ...DEFAULT_NEW_GAME_SETUP,
      startKind: "custom",
      seed: "compiled-trait-catalogue",
      startAge: 40,
      depth: "summarize-earlier-life",
      questionnaire: "skipped",
      placeKey: "alaska",
      household: "shares-a-home",
    });
    const opened = openOrdinaryLife(game.world, game.playerPersonId);
    const others = opened.personOrder.filter(
      (id) => id !== game.playerPersonId,
    );
    const world = ensurePeopleTraits(opened, others);
    const industry = traitRegistryFor(world).traits.get(
      "catalogue-test:industry",
    )!;
    expect(industry).toBeDefined();
    const values = others.map((id) => readTrait(world, id, industry));
    expect(values.every((reading) => reading.state === "recorded")).toBe(true);
    // Every one of them carries their lean on it on their card.
    for (const [index, id] of others.entries()) {
      const reading = values[index]!;
      if (reading.state !== "recorded" || reading.label === null) continue;
      expect(observedTraitLabels(world, id)).toContain(reading.label);
    }
    expect(
      values.filter((reading) => reading.state === "recorded" && reading.label),
    ).not.toHaveLength(0);
    // The played character is never seeded.
    expect(readTrait(world, game.playerPersonId, industry).state).toBe(
      "unrecorded",
    );
    assertProductionCatalogBoundary(world);
  }, 120_000);
});
