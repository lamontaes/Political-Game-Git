import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

import {
  ensurePeopleTraits,
  observedTraitLabels,
  personTraits,
} from "../simulation/people-traits";
import { deserializeWorld, serializeWorld } from "../simulation/serialization";
import { readTrait } from "../simulation/trait-readings";
import {
  loadedTraitRegistry,
  traitRegistryFor,
} from "../simulation/trait-registry";
import { importContentPack } from "./content-pack-import";
import { createNewGameWorld, DEFAULT_NEW_GAME_SETUP } from "./new-game";
import { openOrdinaryLife } from "./ordinary-life";

/**
 * A trait a mod adds reaches a person the way a built-in one does.
 *
 * The owner's requirement is content as data, discovered rather than compiled
 * in. These hold the three things the trait loader was asked for: an installed
 * pack's trait reaches the person card, a malformed row is skipped with its
 * reason while the rest loads, and a life's own five traits read exactly as
 * they did.
 */
const patienceText = readFileSync(
  new URL("../../examples/content-packs/patience-trait.json", import.meta.url),
  "utf8",
);
const PATIENCE = "mod.example.patience:patience";

function life(seed = "installed-traits") {
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
  const world = openOrdinaryLife(game.world, game.playerPersonId);
  return {
    world,
    others: world.personOrder.filter((id) => id !== game.playerPersonId),
  };
}

describe("traits from an installed content pack", () => {
  it("reach the person card once they are written, and survive a save", () => {
    const { world, others } = life();
    const installed = importContentPack(world, patienceText);
    const patience = traitRegistryFor(installed).traits.get(PATIENCE);
    expect(patience).toBeDefined();

    // Installed and not yet written: nobody is shown a word for it.
    for (const id of others) {
      expect(observedTraitLabels(installed, id)).not.toContain("Waits it out");
      expect(observedTraitLabels(installed, id)).not.toContain("Gets restless");
    }

    const written = ensurePeopleTraits(installed, others);
    const leaning = others.filter((id) => {
      const reading = readTrait(written, id, patience!);
      return reading.state === "recorded" && reading.value !== 0;
    });
    expect(leaning.length).toBeGreaterThan(0);
    for (const id of others) {
      const reading = readTrait(written, id, patience!);
      expect(reading.state).toBe("recorded");
      if (reading.state !== "recorded" || reading.label === null) continue;
      expect(observedTraitLabels(written, id)).toContain(reading.label);
    }

    // The mind catalog admits the mod's definition, and the save round-trips
    // through the same integrity checks a loaded life passes.
    const restored = deserializeWorld(serializeWorld(written));
    for (const id of leaning) {
      expect(observedTraitLabels(restored, id)).toEqual(
        observedTraitLabels(written, id),
      );
    }
  });

  it("lean on the decisions the build declares, and only in the life that installed them", () => {
    const { world } = life();
    const installed = importContentPack(world, patienceText);
    const counter = (registry: ReturnType<typeof loadedTraitRegistry>) =>
      (registry.leans.get("contact.answer") ?? []).filter(
        (row) => row.trait === PATIENCE,
      );
    expect(counter(traitRegistryFor(installed))).toHaveLength(1);
    expect(counter(traitRegistryFor(world))).toHaveLength(0);
    expect(counter(loadedTraitRegistry())).toHaveLength(0);
    expect(traitRegistryFor(world)).toBe(loadedTraitRegistry());
  });

  it("skip a malformed row with its reason, and load the rest of the pack", () => {
    const pack = JSON.parse(patienceText);
    pack.id = "mod.example.half-broken";
    pack.traits.traits = [
      pack.traits.traits[0],
      { key: "broken", poles: {} },
      7,
    ];
    pack.traits.effects = [
      { decision: "contact.answer", leans: "not a list" },
      {
        decision: "a.decision-from-a-later-build",
        leans: [],
      },
    ];
    const { world } = life();
    const installed = importContentPack(world, JSON.stringify(pack));
    const registry = traitRegistryFor(installed);

    expect(registry.traits.has("mod.example.half-broken:patience")).toBe(true);
    expect(registry.traits.has("mod.example.half-broken:broken")).toBe(false);
    const said = registry.report.rejections.filter(
      (rejection) => rejection.pack === "mod.example.half-broken",
    );
    expect(said.map(({ where, reason }) => [where, reason])).toEqual([
      ['trait "broken"', "it needs a label"],
      ["trait 3", "it is not a trait"],
      ['effect "contact.answer"', "its leans must be a list"],
      [
        'effect on "a.decision-from-a-later-build"',
        'no decision "a.decision-from-a-later-build" is declared in this build',
      ],
    ]);
  });

  it("leave a life's own five traits reading exactly as they did", () => {
    const { world, others } = life();
    const before = ensurePeopleTraits(world, others);
    const after = ensurePeopleTraits(
      importContentPack(world, patienceText),
      others,
    );
    for (const id of others) {
      expect(personTraits(after, id)).toEqual(personTraits(before, id));
      const five = observedTraitLabels(before, id);
      expect(observedTraitLabels(after, id).slice(0, five.length)).toEqual(
        five,
      );
    }
  });
});
