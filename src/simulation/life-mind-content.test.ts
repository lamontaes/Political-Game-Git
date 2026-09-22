import { describe, expect, it } from "vitest";

import {
  assertLifeMindContent,
  createLifeMindCatalog,
} from "./life-mind-content";
import { peopleTraitPack } from "./people-trait-pack";
import { loadTraitPacks, traitDefinitionFromPack } from "./trait-packs";
import type { MindCatalog, PersonalityTendencyDefinition } from "./types";

/**
 * The content check used to be an allow-list of built-in definitions, so a
 * newly registered trait threw the moment a world recorded it. It now asks
 * whether a definition matches the pack that owns its stable key. These hold
 * both halves: what it still refuses, and what it now admits.
 */
function withTendency(
  catalog: MindCatalog,
  definition: PersonalityTendencyDefinition,
): MindCatalog {
  return {
    ...catalog,
    tendencies: { ...catalog.tendencies, [definition.id]: definition },
    tendencyOrder: [...catalog.tendencyOrder, definition.id],
  };
}

function peopleDefinition(trait: string): PersonalityTendencyDefinition {
  const registry = loadTraitPacks([peopleTraitPack()], []);
  return traitDefinitionFromPack(
    registry.traits.get(`people-mind-v1:${trait}`)!,
  );
}

describe("a world's definitions must match the pack that owns them", () => {
  it("admits the opening-life content on its own", () => {
    expect(() => assertLifeMindContent(createLifeMindCatalog())).not.toThrow();
  });

  it("admits a trait because a loaded pack declares it", () => {
    const catalog = withTendency(
      createLifeMindCatalog(),
      peopleDefinition("deliberation"),
    );
    expect(() => assertLifeMindContent(catalog)).not.toThrow();
  });

  it("refuses a definition that disagrees with its pack", () => {
    const real = peopleDefinition("reliability");
    // A save that redefines what a stored expression key means is exactly what
    // the old allow-list existed to stop, and it still stops it.
    const tampered: PersonalityTendencyDefinition = {
      ...real,
      expressions: real.expressions.map((expression) =>
        expression.key === "dependable"
          ? { ...expression, label: "Lets things slip" }
          : expression,
      ),
    };
    expect(() =>
      assertLifeMindContent(withTendency(createLifeMindCatalog(), tampered)),
    ).toThrow(/does not match what its pack "people-mind-v1" declares/);
  });

  it("says which pack is missing rather than calling the record unsupported", () => {
    const real = peopleDefinition("risk");
    const fromElsewhere: PersonalityTendencyDefinition = {
      ...real,
      id: `${real.id}-other` as PersonalityTendencyDefinition["id"],
      stableKey: "some-other-pack:boldness",
    };
    expect(
      () =>
        assertLifeMindContent(
          withTendency(createLifeMindCatalog(), fromElsewhere),
        ),
      // Removing a pack must not destroy a save's history, so the message
      // names the pack and says the records are kept.
    ).toThrow(/pack "some-other-pack", which this build does not load/);
  });

  it("still refuses a definition whose stable key names no pack at all", () => {
    const real = peopleDefinition("conflict");
    const unnamespaced: PersonalityTendencyDefinition = {
      ...real,
      id: `${real.id}-bare` as PersonalityTendencyDefinition["id"],
      stableKey: "boldness",
    };
    expect(() =>
      assertLifeMindContent(
        withTendency(createLifeMindCatalog(), unnamespaced),
      ),
    ).toThrow(/Unsupported production personality definition/);
  });
});
