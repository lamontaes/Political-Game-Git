import { describe, expect, it } from "vitest";

import generation1 from "../../art/manifest/character_candidate_visual4_generation1.json";
import {
  CANDIDATE_REVIEW_GENERATION,
  resolveAppearanceCatalogGeneration,
  resolveCharacterRecipe,
} from "./character-components";
import { PEOPLE_VISUAL4_CHARACTER_LIBRARY as LIBRARY } from "./people-visual4-review";
import {
  COHERENT_APPEARANCE_RECIPE_VERSION,
  DEFAULT_APPEARANCE_RECIPE_VERSION,
  derivePersonAppearance,
} from "../simulation/person-appearance";

function resolveAt(personId: string, version: string, generation?: number) {
  return resolveCharacterRecipe(
    {
      appearance: derivePersonAppearance(personId, version),
      poseFamily: "standing-neutral",
      unresolvableRequiredSlots: "diagnose",
      ...(generation === undefined ? {} : { catalogGeneration: generation }),
    },
    LIBRARY,
  );
}

describe("WEEKEND19 B: frozen generation 1 and additive candidates", () => {
  it("keeps the donor review membership as generation 1", () => {
    expect(LIBRARY.catalogGeneration).toBeGreaterThanOrEqual(1);
    const frozen = new Set(generation1.component_ids);
    for (const id of generation1.component_ids) {
      const component = LIBRARY.components.get(id);
      if (!component) continue;
      expect(component.definition.catalog_generation).toBe(
        CANDIDATE_REVIEW_GENERATION,
      );
    }
    for (const [id, component] of LIBRARY.components) {
      if (!frozen.has(id))
        expect(component.definition.catalog_generation).toBeGreaterThan(
          CANDIDATE_REVIEW_GENERATION,
        );
    }
  });

  it("replays a v1 person against generation 1 even after the library grows", () => {
    expect(
      resolveAppearanceCatalogGeneration(
        derivePersonAppearance("weekend19-legacy"),
        LIBRARY.catalogGeneration,
      ),
    ).toBe(CANDIDATE_REVIEW_GENERATION);
    const first = resolveAt(
      "weekend19-legacy",
      DEFAULT_APPEARANCE_RECIPE_VERSION,
    );
    const again = resolveAt(
      "weekend19-legacy",
      DEFAULT_APPEARANCE_RECIPE_VERSION,
      CANDIDATE_REVIEW_GENERATION,
    );
    expect(again.identity).toEqual(first.identity);
    expect(again.context.components.map((entry) => entry.assetId)).toEqual(
      first.context.components.map((entry) => entry.assetId),
    );
    for (const component of first.context.components) {
      expect(generation1.component_ids).toContain(component.assetId);
    }
  });

  it("keeps historical unpinned v2 on generation2 with the same actual components", () => {
    const unpinned = resolveAt(
      "weekend19-new-life",
      COHERENT_APPEARANCE_RECIPE_VERSION,
    );
    const frozen = resolveAt(
      "weekend19-new-life",
      COHERENT_APPEARANCE_RECIPE_VERSION,
      2,
    );
    expect(unpinned.catalogGeneration).toBe(2);
    expect(unpinned.identity).toEqual(frozen.identity);
    expect(unpinned.context.components).toEqual(frozen.context.components);
    expect(
      unpinned.context.components.every(
        (c) =>
          LIBRARY.components.get(c.assetId)!.definition.catalog_generation <= 2,
      ),
    ).toBe(true);
  });

  it("registers the arm-masked polo as a labelled candidate, not a production overwrite", () => {
    const masked = [...LIBRARY.components.values()].find(
      (component) =>
        component.assetId.includes("burgundy_short_sleeve_polo") &&
        component.assetId.includes("armmasked"),
    );
    const original = [...LIBRARY.components.values()].find(
      (component) =>
        component.assetId.includes("burgundy_short_sleeve_polo") &&
        !component.assetId.includes("armmasked") &&
        !component.assetId.includes("crossbody"),
    );
    if (LIBRARY.catalogGeneration === CANDIDATE_REVIEW_GENERATION) {
      expect(original).toBeUndefined();
      return;
    }
    expect(masked).toBeDefined();
    expect(masked!.definition.kind).toBe("top");
    expect(masked!.released).toBe(true);
    expect(masked!.definition.catalog_generation).toBeGreaterThan(
      CANDIDATE_REVIEW_GENERATION,
    );
    if (original) {
      expect(original.definition.catalog_generation).toBe(
        CANDIDATE_REVIEW_GENERATION,
      );
    }
  });
});
